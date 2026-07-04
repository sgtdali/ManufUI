(function () {
  const DEFAULT_CELL_OEE_RULES = {
    plannedTimeOut: [{ field: "mola" }],
    availabilityExclude: [{ field: "onceki_istasyon_bekleme" }],
    targetScale: [{ field: "mola" }, { field: "onceki_istasyon_bekleme" }],
    cells: Object.fromEntries(
      [
        "ROB108 H\u00fccresi",
        "ROB104 H\u00fccresi",
        "Flowform H\u00fccresi",
        "N602 H\u00fccresi",
        "N603 H\u00fccresi",
      ].map((cell) => [
        cell,
        {
          availabilityExclude: [
            { field: "planli_durus", typeField: "planli_durus_turu", type: "Kasa Alma - B\u0131rakma" },
          ],
          targetScale: [
            { field: "planli_durus", typeField: "planli_durus_turu", type: "Kasa Alma - B\u0131rakma" },
          ],
        },
      ])
    ),
  };
  const state = {
    mode: "data",
    period: "nm",
    cells: [],
    periods: {},
    selection: { periods: {}, exclusionsNm: [], exclusionsHt: [] },
    exclSets: { nm: new Set(), ht: new Set() },
    rawCache: {}, // { nm: {raw, range}, ht: {...} }
    metricView: "prod",
    saveTimer: null,
    oee: {
      cell: null,
      downtimeFields: [], // [{key, label, turKey?, aciklamaKey?}]
      detailByDate: {}, // { [tarih]: [row, ...] } — seçili hücre için
      rules: DEFAULT_CELL_OEE_RULES,
      exclusions: new Set(), // Set<slotKey> — Planlı Süre'den hariç tutulan saatler (global, dönem ayrımı yok)
      dateRange: null, // { start, end } — bu aralık dışındaki günler ne listede görünür ne hesaba dahil olur
      saveTimer: null,
      rangeSaveTimer: null,
    },
  };

  const el = {
    modeTabs: document.querySelectorAll(".mode-btn"),
    dataView: document.getElementById("dataView"),
    oeeView: document.getElementById("oeeView"),
    tabs: document.querySelectorAll(".tab-btn"),
    rangeStart: document.getElementById("rangeStart"),
    rangeEnd: document.getElementById("rangeEnd"),
    applyRange: document.getElementById("applyRange"),
    metricView: document.getElementById("metricView"),
    selectAll: document.getElementById("selectAll"),
    selectNone: document.getElementById("selectNone"),
    grid: document.getElementById("grid"),
    oeeGrid: document.getElementById("oeeGrid"),
    oeeCellSelect: document.getElementById("oeeCellSelect"),
    oeeRangeStart: document.getElementById("oeeRangeStart"),
    oeeRangeEnd: document.getElementById("oeeRangeEnd"),
    oeeExclCount: document.getElementById("oeeExclCount"),
    oeeLiveMetric: document.getElementById("oeeLiveMetric"),
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

    const metaRes = await fetch("/api/oee-cell-meta").then((r) => r.json());
    state.oee.downtimeFields = metaRes.downtimeFields;
    state.oee.rules = metaRes.cellOeeRules || DEFAULT_CELL_OEE_RULES;
    const exclRes = await fetch("/api/oee-slot-exclusions").then((r) => r.json());
    state.oee.exclusions = new Set(exclRes.exclusions || []);
    const rangeRes = await fetch("/api/oee-date-range").then((r) => r.json());
    state.oee.dateRange = rangeRes;
    el.oeeRangeStart.value = rangeRes.start;
    el.oeeRangeEnd.value = rangeRes.end;
    populateOeeCellSelect();
  }

  function scheduleOeeRangeSave() {
    clearTimeout(state.oee.rangeSaveTimer);
    state.oee.rangeSaveTimer = setTimeout(async () => {
      await fetch("/api/oee-date-range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.oee.dateRange),
      });
    }, 500);
  }

  async function handleOeeRangeChange() {
    const start = el.oeeRangeStart.value;
    const end = el.oeeRangeEnd.value;
    if (!start || !end || start > end) return;
    state.oee.dateRange = { start, end };
    scheduleOeeRangeSave();
    if (state.oee.cell) await loadOeeCellDetail(state.oee.cell);
    else renderOeeDetail();
  }

  el.oeeRangeStart.addEventListener("change", handleOeeRangeChange);
  el.oeeRangeEnd.addEventListener("change", handleOeeRangeChange);

  function populateOeeCellSelect() {
    el.oeeCellSelect.innerHTML = state.cells
      .map((c) => `<option value="${c}">${c.replace(" Hücresi", "")}</option>`)
      .join("");
    el.oeeCellSelect.value = state.cells[0];
    loadOeeCellDetail(state.cells[0]);
  }

  async function loadOeeCellDetail(cell) {
    state.oee.cell = cell;
    el.oeeGrid.innerHTML = `<p class="hint-text">Yükleniyor…</p>`;
    const params = new URLSearchParams({ cell });
    if (state.oee.dateRange) {
      params.set("start", state.oee.dateRange.start);
      params.set("end", state.oee.dateRange.end);
    }
    const httpRes = await fetch(`/api/cell-detail?${params.toString()}`);
    const res = await httpRes.json();
    if (!httpRes.ok) throw new Error(res.error || `Sunucu hatasi (${httpRes.status})`);
    state.oee.detailByDate = res.byDate;
    renderOeeDetail();
  }

  el.oeeCellSelect.addEventListener("change", () => {
    loadOeeCellDetail(el.oeeCellSelect.value);
  });

  function scheduleOeeExclSave() {
    clearTimeout(state.oee.saveTimer);
    state.oee.saveTimer = setTimeout(async () => {
      await fetch("/api/oee-slot-exclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exclusions: Array.from(state.oee.exclusions) }),
      });
    }, 500);
  }

  function toggleOeeSlotExclusion(key) {
    if (state.oee.exclusions.has(key)) state.oee.exclusions.delete(key);
    else state.oee.exclusions.add(key);
    scheduleOeeExclSave();
  }

  function rowMatchesRule(row, rule) {
    return !rule.typeField || row[rule.typeField] === rule.type;
  }

  function rulesForCell(cell, key) {
    const rules = state.oee.rules || {};
    return [...(rules[key] || []), ...(((rules.cells || {})[cell] || {})[key] || [])];
  }

  function sumRuleMinutes(cell, row, key) {
    return rulesForCell(cell, key).reduce((sum, rule) => {
      return sum + (rowMatchesRule(row, rule) ? (row[rule.field] || 0) : 0);
    }, 0);
  }

  function fieldMatchesAnyRule(cell, row, field, keys) {
    return keys.some((key) => rulesForCell(cell, key).some((rule) => rule.field === field && rowMatchesRule(row, rule)));
  }

  function computeLiveOee() {
    const cell = state.oee.cell;
    const byDate = state.oee.detailByDate || {};
    const range = state.oee.dateRange;
    if (!cell) return null;
    let slotCount = 0;
    let plannedMinutes = 0;
    let downtimeMinutes = 0;
    let targetProd = 0;
    let actualProd = 0;
    let targetedPlannedMinutes = 0;

    Object.entries(byDate).forEach(([date, rows]) => {
      if (range && (date < range.start || date > range.end)) return;
      rows.forEach((row) => {
        const key = slotKey(cell, date, row.zaman_dilimi);
        if (state.oee.exclusions.has(key)) return;

        slotCount += 1;
        const plannedOutMinutes = Math.min(60, sumRuleMinutes(cell, row, "plannedTimeOut"));
        const effectivePlannedMinutes = 60 - plannedOutMinutes;
        plannedMinutes += effectivePlannedMinutes;

        downtimeMinutes += state.oee.downtimeFields.reduce((sum, field) => {
          return sum + (fieldMatchesAnyRule(cell, row, field.key, ["plannedTimeOut", "availabilityExclude"])
            ? 0
            : (row[field.key] || 0));
        }, 0);

        if ((row.hedef_uretim_adeti || 0) > 0) {
          targetedPlannedMinutes += effectivePlannedMinutes;
          actualProd += row.uretim_adeti || 0;
          const targetScaleMinutes = Math.min(60, sumRuleMinutes(cell, row, "targetScale"));
          const targetScale = (60 - targetScaleMinutes) / 60;
          targetProd += (row.hedef_uretim_adeti || 0) * targetScale;
        }
      });
    });

    if (plannedMinutes === 0) return { status: "empty" };
    const availability = (plannedMinutes - downtimeMinutes) / plannedMinutes;
    const targetCoverage = targetedPlannedMinutes / plannedMinutes;
    if (targetProd <= 0 || targetCoverage < 0.3) {
      return { status: "insufficient", availability, targetCoverage, slotCount };
    }
    const performance = actualProd / targetProd;
    return { status: "ok", availability, performance, oee: availability * performance, slotCount };
  }
  function updateOeeLiveMetric() {
    const result = computeLiveOee();
    if (!result || result.status === "empty") {
      el.oeeLiveMetric.textContent = "Availability - | Performance - | OEE -";
      el.oeeLiveMetric.title = "Secili aralikta planli saat yok.";
      return;
    }
    if (result.status === "insufficient") {
      el.oeeLiveMetric.textContent = `Availability ${(result.availability * 100).toFixed(1)}% | Performance - | OEE -`;
      el.oeeLiveMetric.title = `Availability ${(result.availability * 100).toFixed(1)}%, hedef kapsami ${(result.targetCoverage * 100).toFixed(1)}%`;
      return;
    }
    el.oeeLiveMetric.textContent = `Availability ${(result.availability * 100).toFixed(1)}% | Performance ${(result.performance * 100).toFixed(1)}% | OEE ${(result.oee * 100).toFixed(1)}%`;
    el.oeeLiveMetric.title = `Availability ${(result.availability * 100).toFixed(1)}%, Performance ${(result.performance * 100).toFixed(1)}%, ${result.slotCount} saat`;
  }
  function updateOeeExclCount() {
    const cell = state.oee.cell;
    if (!cell) { el.oeeExclCount.textContent = ""; return; }
    const prefix = cell + "||";
    let count = 0;
    state.oee.exclusions.forEach((key) => { if (key.startsWith(prefix)) count += 1; });
    el.oeeExclCount.textContent = count
      ? `${count} saat bu hücrede Planlı Süre dışı`
      : "Bu hücrede tüm saatler Planlı Süre'ye dahil";
    updateOeeLiveMetric();
  }

  // Bir saatlik satırda oluşan duruşları okunabilir tek satırlık özet haline getirir:
  // "Arıza 30dk (M — Calor konveyör kaynaklı duruş); Mola 10dk" gibi.
  function buildDurusSummary(row) {
    const parts = [];
    state.oee.downtimeFields.forEach(({ key, label, turKey, aciklamaKey }) => {
      const minutes = row[key];
      if (!minutes) return;
      const extra = [];
      if (turKey && row[turKey]) extra.push(row[turKey]);
      if (aciklamaKey && row[aciklamaKey]) extra.push(row[aciklamaKey]);
      parts.push(`${label} ${minutes}dk` + (extra.length ? ` (${extra.join(" — ")})` : ""));
    });
    return parts.length ? parts.join("; ") : "—";
  }

  function dayDowntimeTotal(rows) {
    return rows.reduce(
      (sum, r) => sum + state.oee.downtimeFields.reduce((s, f) => s + (r[f.key] || 0), 0),
      0
    );
  }

  function updateOeeDayHeader(header, rows, date, cell) {
    const total = dayDowntimeTotal(rows);
    const excludedCount = rows.filter((r) => state.oee.exclusions.has(slotKey(cell, date, r.zaman_dilimi))).length;
    header.querySelector(".oee-day-badge").textContent =
      `${total} dk duruş` + (excludedCount ? ` · ${excludedCount} saat dahil değil` : "");
  }

  function renderOeeDetail() {
    const cell = state.oee.cell;
    const byDate = state.oee.detailByDate;
    const range = state.oee.dateRange;
    const dates = Object.keys(byDate)
      .filter((d) => !range || (d >= range.start && d <= range.end))
      .sort();

    if (dates.length === 0) {
      el.oeeGrid.innerHTML = `<p class="hint-text">Seçili tarih aralığında bu hücre için kayıt bulunamadı.</p>`;
      updateOeeExclCount();
      return;
    }

    const container = document.createElement("div");
    container.className = "oee-detail";

    dates.forEach((date) => {
      const rows = byDate[date];

      const dayDiv = document.createElement("div");
      dayDiv.className = "oee-day";

      const header = document.createElement("div");
      header.className = "oee-day-header";
      header.innerHTML =
        `<span class="oee-day-chevron">▶</span> <strong>${date}</strong> ` +
        `<span class="oee-day-badge"></span>`;
      updateOeeDayHeader(header, rows, date, cell);
      dayDiv.appendChild(header);

      const table = document.createElement("table");
      table.className = "oee-detail-table hidden";
      table.innerHTML = `<thead><tr><th>Saat</th><th>Üretim / Hedef</th><th>Duruş Özeti</th><th>Planlı Süre</th></tr></thead>`;
      const tbody = document.createElement("tbody");

      rows.forEach((row) => {
        const key = slotKey(cell, date, row.zaman_dilimi);
        const tr = document.createElement("tr");

        const saatTd = document.createElement("td");
        saatTd.textContent = row.zaman_dilimi;
        tr.appendChild(saatTd);

        const uretimTd = document.createElement("td");
        uretimTd.textContent = `${row.uretim_adeti || 0} / ${row.hedef_uretim_adeti || "—"}`;
        tr.appendChild(uretimTd);

        const summaryTd = document.createElement("td");
        summaryTd.className = "oee-summary-cell";
        summaryTd.textContent = buildDurusSummary(row);
        tr.appendChild(summaryTd);

        const checkTd = document.createElement("td");
        checkTd.className = "oee-check-cell";
        const isExcluded = state.oee.exclusions.has(key);
        checkTd.innerHTML = `<input type="checkbox" ${isExcluded ? "" : "checked"} />`;
        tr.classList.toggle("excluded", isExcluded);
        checkTd.addEventListener("click", () => {
          toggleOeeSlotExclusion(key);
          const nowExcluded = state.oee.exclusions.has(key);
          tr.classList.toggle("excluded", nowExcluded);
          checkTd.querySelector("input").checked = !nowExcluded;
          updateOeeDayHeader(header, rows, date, cell);
          updateOeeExclCount();
        });
        tr.appendChild(checkTd);

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      dayDiv.appendChild(table);

      header.addEventListener("click", () => {
        table.classList.toggle("hidden");
        header.querySelector(".oee-day-chevron").textContent = table.classList.contains("hidden") ? "▶" : "▼";
      });

      container.appendChild(dayDiv);
    });

    el.oeeGrid.innerHTML = "";
    el.oeeGrid.appendChild(container);
    updateOeeExclCount();
  }

  el.modeTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      el.modeTabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.mode = btn.dataset.mode;
      el.dataView.classList.toggle("hidden", state.mode !== "data");
      el.oeeView.classList.toggle("hidden", state.mode !== "oee");
    });
  });

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
