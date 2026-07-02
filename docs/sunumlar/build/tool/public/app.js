(function () {
  const state = {
    period: "nm",
    cells: [],
    periods: {},
    selection: { periods: {}, exclusionsNm: [], exclusionsHt: [] },
    exclSets: { nm: new Set(), ht: new Set() },
    rawCache: {}, // { nm: {raw, range}, ht: {...} }
    metricView: "prod",
    saveTimer: null,
  };

  const el = {
    tabs: document.querySelectorAll(".tab-btn"),
    rangeStart: document.getElementById("rangeStart"),
    rangeEnd: document.getElementById("rangeEnd"),
    applyRange: document.getElementById("applyRange"),
    metricView: document.getElementById("metricView"),
    selectAll: document.getElementById("selectAll"),
    selectNone: document.getElementById("selectNone"),
    grid: document.getElementById("grid"),
    summaryBar: document.getElementById("summaryBar"),
    status: document.getElementById("status"),
    generateBtn: document.getElementById("generateBtn"),
    resultPanel: document.getElementById("resultPanel"),
    resultTable: document.getElementById("resultTable"),
    buildLog: document.getElementById("buildLog"),
  };

  function slotKey(cell, tarih, zamanDilimi) {
    return `${cell}||${tarih}||${zamanDilimi}`;
  }

  function setStatus(text, kind) {
    el.status.textContent = text;
    el.status.className = "status" + (kind ? " " + kind : "");
  }

  async function init() {
    const cellsRes = await fetch("/api/cells").then((r) => r.json());
    state.cells = cellsRes.cells;
    state.periods = cellsRes.periods;

    const sel = await fetch("/api/selection").then((r) => r.json());
    state.selection = sel;
    if (!state.selection.periods || !state.selection.periods.nm) {
      state.selection.periods = state.periods;
    }
    state.exclSets.nm = new Set(state.selection.exclusionsNm || []);
    state.exclSets.ht = new Set(state.selection.exclusionsHt || []);

    await loadPeriod("nm");
    render();
  }

  async function loadPeriod(period) {
    setStatus("Veri yükleniyor…");
    const httpRes = await fetch(`/api/raw?period=${period}`);
    const res = await httpRes.json();
    if (!httpRes.ok) throw new Error(res.error || `Sunucu hatası (${httpRes.status})`);
    state.rawCache[period] = res;
    const range = res.range;
    el.rangeStart.value = range.start;
    el.rangeEnd.value = range.end;
    setStatus("");
  }

  function currentRaw() {
    return state.rawCache[state.period];
  }

  function dateList(raw) {
    const set = new Set();
    for (const cell of state.cells) {
      const byDate = raw[cell] || {};
      Object.keys(byDate).forEach((d) => set.add(d));
    }
    return Array.from(set).sort();
  }

  function slotsForDate(raw, date) {
    const map = new Map(); // zaman_dilimi -> sira_no
    for (const cell of state.cells) {
      const rows = (raw[cell] || {})[date] || [];
      rows.forEach((r) => map.set(r.zaman_dilimi, r.sira_no));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([label]) => label);
  }

  // hat-forecast'teki "Saatlik Ort." mantığının aynısı: sadece dahil edilen
  // (checkbox'ı işaretli) slot'lar üzerinden günlük ortalama hesabı.
  function computeLiveAverage(raw, cell, exclSet) {
    let sumProd = 0;
    let sumWait = 0;
    const daysWithData = new Set();
    const byDate = raw[cell] || {};
    for (const [date, rows] of Object.entries(byDate)) {
      let dayHasIncluded = false;
      for (const row of rows) {
        const key = slotKey(cell, date, row.zaman_dilimi);
        if (exclSet.has(key)) continue;
        sumProd += row.uretim_adeti;
        sumWait += row.onceki_istasyon_bekleme;
        dayHasIncluded = true;
      }
      if (dayHasIncluded) daysWithData.add(date);
    }
    const dayCount = daysWithData.size;
    if (dayCount === 0) return { production: null, wait: null, days: 0 };
    return { production: sumProd / dayCount, wait: sumWait / dayCount, days: dayCount };
  }

  function renderSummary() {
    const data = currentRaw();
    if (!data) { el.summaryBar.innerHTML = ""; return; }
    const raw = data.raw;
    const excl = state.exclSets[state.period];
    const unit = state.metricView === "prod" ? "adet/gün" : "dk/gün";

    const cards = state.cells.map((cell) => {
      const avg = computeLiveAverage(raw, cell, excl);
      const short = cell.replace(" Hücresi", "");
      if (avg.production === null) {
        return `<div class="summary-cell nodata"><div class="name">${short}</div><div class="value">—</div><div class="days">veri yok</div></div>`;
      }
      const val = state.metricView === "prod" ? avg.production : avg.wait;
      return `<div class="summary-cell"><div class="name">${short}</div><div class="value">${val.toFixed(1)}</div><div class="days">${unit} · ${avg.days} gün</div></div>`;
    });

    el.summaryBar.innerHTML =
      `<div class="summary-cell"><div class="name">Saatlik Ort.</div><div class="value">·</div><div class="days">seçili döneme göre</div></div>` +
      cards.join("");
  }

  // Bir gün+hücre hücresinin (day-cell) görünümünü günceller: toplam değer +
  // checkbox durumu (hepsi dahil / hepsi hariç / kısmi — bazı saatler elle hariç tutulmuş).
  function updateDayCellUI(td, rows, cell, date, exclSet) {
    if (rows.length === 0) {
      td.className = "day-cell empty";
      td.innerHTML = "—";
      return;
    }
    let total = 0;
    let excludedCount = 0;
    rows.forEach((r) => {
      const val = state.metricView === "prod" ? r.uretim_adeti : r.onceki_istasyon_bekleme;
      total += val || 0;
      if (exclSet.has(slotKey(cell, date, r.zaman_dilimi))) excludedCount++;
    });
    const allExcluded = excludedCount === rows.length;
    const partial = excludedCount > 0 && !allExcluded;
    td.className = "day-cell" + (allExcluded ? " excluded" : partial ? " partial" : "");
    td.innerHTML = `<input type="checkbox" ${allExcluded ? "" : "checked"} />${total}`;
    const cb = td.querySelector("input");
    if (cb) cb.indeterminate = partial;
  }

  function updateSlotCellUI(td, rowData, cell, date, exclSet) {
    const key = slotKey(cell, date, rowData.zaman_dilimi);
    const isExcluded = exclSet.has(key);
    td.className = "slot-cell" + (isExcluded ? " excluded" : "");
    const value = state.metricView === "prod" ? rowData.uretim_adeti : rowData.onceki_istasyon_bekleme;
    td.innerHTML = `<input type="checkbox" ${isExcluded ? "" : "checked"} />${value}`;
  }

  function render() {
    const data = currentRaw();
    if (!data) return;
    const raw = data.raw;
    const dates = dateList(raw);
    const excl = state.exclSets[state.period];

    // gün-hücre ve saat-hücre DOM referansları — birini değiştirince diğerini
    // yeniden çizmeden güncelleyebilmek için.
    const dayRefs = {}; // dayRefs[date][cell] = td
    const slotRefs = {}; // slotRefs[date][cell][zamanDilimi] = td

    const table = document.createElement("table");
    table.className = "matrix";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    headRow.innerHTML = `<th>Tarih / Saat</th>` + state.cells.map((c) => `<th>${c.replace(" Hücresi", "")}</th>`).join("");
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    dates.forEach((date) => {
      dayRefs[date] = {};
      slotRefs[date] = {};

      const dayRow = document.createElement("tr");
      dayRow.className = "day-row";
      dayRow.dataset.date = date;
      const dayCell = document.createElement("td");
      dayCell.className = "date-cell";
      dayCell.textContent = date;
      dayRow.appendChild(dayCell);

      state.cells.forEach((cell) => {
        const rows = (raw[cell] || {})[date] || [];
        const td = document.createElement("td");
        dayRefs[date][cell] = td;
        updateDayCellUI(td, rows, cell, date, excl);
        if (rows.length > 0) {
          td.addEventListener("click", (e) => {
            e.stopPropagation();
            const allIncluded = rows.every((r) => !excl.has(slotKey(cell, date, r.zaman_dilimi)));
            rows.forEach((r) => {
              const key = slotKey(cell, date, r.zaman_dilimi);
              if (allIncluded) excl.add(key);
              else excl.delete(key);
            });
            updateDayCellUI(td, rows, cell, date, excl);
            const slotsForCell = (slotRefs[date] || {})[cell] || {};
            rows.forEach((r) => {
              const slotTd = slotsForCell[r.zaman_dilimi];
              if (slotTd) updateSlotCellUI(slotTd, r, cell, date, excl);
            });
            renderSummary();
            scheduleSave();
          });
        }
        dayRow.appendChild(td);
      });

      dayRow.addEventListener("click", () => {
        dayRow.classList.toggle("expanded");
        const expanded = dayRow.classList.contains("expanded");
        tbody.querySelectorAll(`tr.slot-row[data-date="${CSS.escape(date)}"]`).forEach((r) => {
          r.classList.toggle("visible", expanded);
        });
      });
      tbody.appendChild(dayRow);

      const slots = slotsForDate(raw, date);
      slots.forEach((zamanDilimi) => {
        const slotRow = document.createElement("tr");
        slotRow.className = "slot-row";
        slotRow.dataset.date = date;
        const label = document.createElement("td");
        label.className = "date-cell";
        label.textContent = zamanDilimi;
        slotRow.appendChild(label);

        state.cells.forEach((cell) => {
          const td = document.createElement("td");
          const rows = (raw[cell] || {})[date] || [];
          const rowData = rows.find((r) => r.zaman_dilimi === zamanDilimi);
          if (!rowData) {
            td.className = "slot-cell empty";
            td.textContent = "—";
          } else {
            slotRefs[date][cell] = slotRefs[date][cell] || {};
            slotRefs[date][cell][zamanDilimi] = td;
            updateSlotCellUI(td, rowData, cell, date, excl);
            const key = slotKey(cell, date, zamanDilimi);
            td.addEventListener("click", () => {
              const nowExcluded = !excl.has(key);
              if (nowExcluded) excl.add(key);
              else excl.delete(key);
              updateSlotCellUI(td, rowData, cell, date, excl);
              const dayTd = (dayRefs[date] || {})[cell];
              if (dayTd) updateDayCellUI(dayTd, rows, cell, date, excl);
              renderSummary();
              scheduleSave();
            });
          }
          slotRow.appendChild(td);
        });
        tbody.appendChild(slotRow);
      });
    });

    table.appendChild(tbody);
    el.grid.innerHTML = "";
    el.grid.appendChild(table);
    renderSummary();
  }

  function scheduleSave() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveSelection, 500);
  }

  async function saveSelection() {
    state.selection.exclusionsNm = Array.from(state.exclSets.nm);
    state.selection.exclusionsHt = Array.from(state.exclSets.ht);
    await fetch("/api/selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.selection),
    });
  }

  el.tabs.forEach((btn) => {
    btn.addEventListener("click", async () => {
      el.tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.period = btn.dataset.period;
      if (!state.rawCache[state.period]) await loadPeriod(state.period);
      else {
        const range = state.rawCache[state.period].range;
        el.rangeStart.value = range.start;
        el.rangeEnd.value = range.end;
      }
      render();
    });
  });

  el.applyRange.addEventListener("click", async () => {
    const start = el.rangeStart.value;
    const end = el.rangeEnd.value;
    if (!start || !end) {
      setStatus("Başlangıç ve bitiş tarihi girilmeli.", "error");
      return;
    }
    if (start > end) {
      setStatus(`Geçersiz aralık: başlangıç (${start}) bitişten (${end}) sonra olamaz.`, "error");
      return;
    }
    el.applyRange.disabled = true;
    setStatus("Aralık uygulanıyor…");
    try {
      state.selection.periods[state.period] = { label: state.periods[state.period].label, start, end };
      await saveSelection();
      delete state.rawCache[state.period];
      await loadPeriod(state.period);
      render();
      setStatus(`Aralık güncellendi: ${start} → ${end} (${dateList(state.rawCache[state.period].raw).length} gün, ${el.grid.querySelectorAll("tr.day-row").length} satır yüklendi).`, "ok");
    } catch (e) {
      setStatus("Aralık uygulanamadı: " + e.message, "error");
    } finally {
      el.applyRange.disabled = false;
    }
  });

  el.metricView.addEventListener("change", () => {
    state.metricView = el.metricView.value;
    render();
  });

  el.selectAll.addEventListener("click", () => {
    state.exclSets[state.period].clear();
    scheduleSave();
    render();
  });

  el.selectNone.addEventListener("click", () => {
    const raw = currentRaw().raw;
    const excl = state.exclSets[state.period];
    for (const cell of state.cells) {
      for (const [date, rows] of Object.entries(raw[cell] || {})) {
        rows.forEach((r) => excl.add(slotKey(cell, date, r.zaman_dilimi)));
      }
    }
    scheduleSave();
    render();
  });

  el.generateBtn.addEventListener("click", async () => {
    el.generateBtn.disabled = true;
    setStatus("Sunum oluşturuluyor, bu birkaç saniye sürebilir…");
    await saveSelection();
    try {
      const res = await fetch("/api/generate", { method: "POST" }).then((r) => r.json());
      if (res.ok) {
        setStatus("Sunum güncellendi.", "ok");
        showResult(res.overviewData, res.log);
      } else {
        setStatus("Hata: " + (res.error || "bilinmeyen hata"), "error");
        showResult(null, res.log + "\n" + (res.error || ""));
      }
    } catch (e) {
      setStatus("Hata: " + e.message, "error");
    } finally {
      el.generateBtn.disabled = false;
    }
  });

  function showResult(overviewData, log) {
    el.resultPanel.classList.remove("hidden");
    if (overviewData) {
      const header = ["Hücre", "Nisan-Mayıs üretim", "Haziran-Temmuz üretim", "Nisan-Mayıs bekleme", "Haziran-Temmuz bekleme"];
      const rows = overviewData.map((d) => [d.cell, d.nm, d.ht ?? "veri yok", d.nmB, d.htB ?? "veri yok"]);
      el.resultTable.innerHTML =
        "<thead><tr>" + header.map((h) => `<th>${h}</th>`).join("") + "</tr></thead>" +
        "<tbody>" + rows.map((r) => "<tr>" + r.map((c) => `<td>${c}</td>`).join("") + "</tr>").join("") + "</tbody>";
    }
    el.buildLog.textContent = log || "";
  }

  init();
})();
