(function () {
  const DEFAULT_TARGET_SCALE_FIELDS = [
    "ariza",
    "planli_durus",
    "setup_ve_ayar",
    "takim_degisimi",
    "kalip_demontaj",
    "kalip_montaj",
    "onceki_istasyon_bekleme",
    "musteri_kaynakli_durus",
    "kalite_kaynakli_durus",
  ];
  const DEFAULT_TAKIM_DEGISIMI_STANDART_DK = {
    "ROB109 H\u00fccresi": 10,
    "ROB104 H\u00fccresi": 15,
    "ROB108 H\u00fccresi": 15,
  };
  const DEFAULT_PRES_IHU_REJIM_BEKLEME = "IHU Rejim Bekleme";
  const DEFAULT_KASA_ALMA_BIRAKMA_CELLS = [
    "ROB108 H\u00fccresi",
    "ROB104 H\u00fccresi",
    "Flowform H\u00fccresi",
    "N602 H\u00fccresi",
    "N603 H\u00fccresi",
  ];
  const DEFAULT_NON_BREAKDOWN_ARIZA_TYPES = ["Tala\u015f Arabas\u0131 Dolu", "Bor Ya\u011f\u0131 Bitti"];
  const DEFAULT_NON_BREAKDOWN_ARIZA_RULES = DEFAULT_NON_BREAKDOWN_ARIZA_TYPES.map((type) => ({ field: "ariza", typeField: "ariza_turu", type }));
  const DEFAULT_CELL_OEE_RULES = {
    plannedTimeOut: [],
    availabilityExclude: [{ field: "mola" }, { field: "onceki_istasyon_bekleme" }, ...DEFAULT_NON_BREAKDOWN_ARIZA_RULES],
    targetScale: DEFAULT_TARGET_SCALE_FIELDS.map((field) => ({ field })),
    targetScaleExclude: DEFAULT_NON_BREAKDOWN_ARIZA_RULES,
    cells: Object.fromEntries(
      Array.from(new Set([...DEFAULT_KASA_ALMA_BIRAKMA_CELLS, ...Object.keys(DEFAULT_TAKIM_DEGISIMI_STANDART_DK), "Pres H\u00fccresi"])).map((cell) => {
        const rules = {};
        if (cell === "Pres H\u00fccresi") {
          const ihuRule = { field: "setup_ve_ayar", typeField: "setup_turu", type: DEFAULT_PRES_IHU_REJIM_BEKLEME };
          rules.availabilityExclude = [ihuRule];
          rules.targetScaleExclude = [ihuRule];
        }
        if (DEFAULT_KASA_ALMA_BIRAKMA_CELLS.includes(cell)) {
          rules.availabilityExclude = [
            { field: "planli_durus", typeField: "planli_durus_turu", type: "Kasa Alma - B\u0131rakma" },
          ];
        }
        if (DEFAULT_TAKIM_DEGISIMI_STANDART_DK[cell]) {
          const minutes = DEFAULT_TAKIM_DEGISIMI_STANDART_DK[cell];
          rules.availabilityCaps = [{ field: "takim_degisimi", minutes }];
          rules.targetScaleCaps = [{ field: "takim_degisimi", minutes }];
        }
        return [cell, rules];
      })
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
      targetOverrides: {}, // { [slotKey]: hedef_adet } — sadece sunum araci lokal override
      dateRange: null, // { start, end } — bu aralık dışındaki günler ne listede görünür ne hesaba dahil olur
      saveTimer: null,
      rangeSaveTimer: null,
      targetSaveTimer: null,
    },
    ariza: {
      cell: null,
      detailByDate: {}, // { [tarih]: [row, ...] } — seçili hücre için, sıralı (loadOeeCellDetail ile aynı kaynak)
      links: new Set(), // Set<slotKey> — "bu saat bir önceki arızalı saatin devamı" işareti
      falsePositives: new Set(), // Set<slotKey> — "bu aslında gerçek arıza değil" (elle), MTBF/MTTR'den tamamen çıkar
      autoNonBreakdownTypes: new Set(), // Set<ariza_turu> — dataService.js:NON_BREAKDOWN_ARIZA_TYPES, otomatik hariç
      saveTimer: null,
      fpSaveTimer: null,
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
    arizaView: document.getElementById("arizaView"),
    arizaGrid: document.getElementById("arizaGrid"),
    arizaCellSelect: document.getElementById("arizaCellSelect"),
    arizaRangeStart: document.getElementById("arizaRangeStart"),
    arizaRangeEnd: document.getElementById("arizaRangeEnd"),
    arizaLiveSummary: document.getElementById("arizaLiveSummary"),
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
    state.ariza.autoNonBreakdownTypes = new Set(metaRes.nonBreakdownArizaTypes || []);
    const exclRes = await fetch("/api/oee-slot-exclusions").then((r) => r.json());
    state.oee.exclusions = new Set(exclRes.exclusions || []);
    const targetRes = await fetch("/api/oee-target-overrides").then((r) => r.json());
    state.oee.targetOverrides = targetRes.overrides || {};
    const rangeRes = await fetch("/api/oee-date-range").then((r) => r.json());
    state.oee.dateRange = rangeRes;
    el.oeeRangeStart.value = rangeRes.start;
    el.oeeRangeEnd.value = rangeRes.end;
    populateOeeCellSelect();

    const arizaLinksRes = await fetch("/api/ariza-event-links").then((r) => r.json());
    state.ariza.links = new Set(arizaLinksRes.links || []);
    const arizaFpRes = await fetch("/api/ariza-false-positives").then((r) => r.json());
    state.ariza.falsePositives = new Set(arizaFpRes.keys || []);
    el.arizaRangeStart.value = rangeRes.start;
    el.arizaRangeEnd.value = rangeRes.end;
    populateArizaCellSelect();
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
    el.arizaRangeStart.value = start;
    el.arizaRangeEnd.value = end;
    scheduleOeeRangeSave();
    if (state.oee.cell) await loadOeeCellDetail(state.oee.cell);
    else renderOeeDetail();
    if (state.ariza.cell) await loadArizaCellDetail(state.ariza.cell);
    else renderArizaDetail();
  }

  el.oeeRangeStart.addEventListener("change", handleOeeRangeChange);
  el.oeeRangeEnd.addEventListener("change", handleOeeRangeChange);

  // Arıza sekmesi tarih aralığı OEE — Planlı Süre sekmesiyle aynı kaynağı
  // (state.oee.dateRange / oee-date-range.json) paylaşır — iki sekme her zaman tutarlı kalır.
  async function handleArizaRangeChange() {
    const start = el.arizaRangeStart.value;
    const end = el.arizaRangeEnd.value;
    if (!start || !end || start > end) return;
    state.oee.dateRange = { start, end };
    el.oeeRangeStart.value = start;
    el.oeeRangeEnd.value = end;
    scheduleOeeRangeSave();
    if (state.ariza.cell) await loadArizaCellDetail(state.ariza.cell);
    else renderArizaDetail();
    if (state.oee.cell) await loadOeeCellDetail(state.oee.cell);
    else renderOeeDetail();
  }

  el.arizaRangeStart.addEventListener("change", handleArizaRangeChange);
  el.arizaRangeEnd.addEventListener("change", handleArizaRangeChange);

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

  function populateArizaCellSelect() {
    el.arizaCellSelect.innerHTML = state.cells
      .map((c) => `<option value="${c}">${c.replace(" Hücresi", "")}</option>`)
      .join("");
    el.arizaCellSelect.value = state.cells[0];
    loadArizaCellDetail(state.cells[0]);
  }

  // Aynı /api/cell-detail endpoint'ini kullanır (fetchCellDetailSlots zaten
  // ariza_turu/ariza_aciklama/ariza_giderildi'yi sira_no sıralı döndürüyor).
  async function loadArizaCellDetail(cell) {
    state.ariza.cell = cell;
    el.arizaGrid.innerHTML = `<p class="hint-text">Yükleniyor…</p>`;
    const params = new URLSearchParams({ cell });
    if (state.oee.dateRange) {
      params.set("start", state.oee.dateRange.start);
      params.set("end", state.oee.dateRange.end);
    }
    const httpRes = await fetch(`/api/cell-detail?${params.toString()}`);
    const res = await httpRes.json();
    if (!httpRes.ok) throw new Error(res.error || `Sunucu hatasi (${httpRes.status})`);
    state.ariza.detailByDate = res.byDate;
    renderArizaDetail();
  }

  el.arizaCellSelect.addEventListener("change", () => {
    loadArizaCellDetail(el.arizaCellSelect.value);
  });

  function scheduleArizaLinksSave() {
    clearTimeout(state.ariza.saveTimer);
    state.ariza.saveTimer = setTimeout(async () => {
      await fetch("/api/ariza-event-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: Array.from(state.ariza.links) }),
      });
    }, 500);
  }

  function toggleArizaLink(key) {
    if (state.ariza.links.has(key)) state.ariza.links.delete(key);
    else state.ariza.links.add(key);
    scheduleArizaLinksSave();
  }

  function scheduleArizaFalsePositivesSave() {
    clearTimeout(state.ariza.fpSaveTimer);
    state.ariza.fpSaveTimer = setTimeout(async () => {
      await fetch("/api/ariza-false-positives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: Array.from(state.ariza.falsePositives) }),
      });
    }, 500);
  }

  function toggleArizaFalsePositive(key) {
    if (state.ariza.falsePositives.has(key)) state.ariza.falsePositives.delete(key);
    else state.ariza.falsePositives.add(key);
    scheduleArizaFalsePositivesSave();
  }

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

  function targetForOeeRow(cell, date, row) {
    const key = slotKey(cell, date, row.zaman_dilimi);
    const override = Object.prototype.hasOwnProperty.call(state.oee.targetOverrides, key)
      ? Number(state.oee.targetOverrides[key])
      : null;
    return Number.isFinite(override) && override >= 0 ? override : (row.hedef_uretim_adeti || 0);
  }

  function scheduleOeeTargetSave() {
    clearTimeout(state.oee.targetSaveTimer);
    state.oee.targetSaveTimer = setTimeout(async () => {
      await fetch("/api/oee-target-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: state.oee.targetOverrides }),
      });
    }, 500);
  }

  function setOeeTargetOverride(key, value) {
    const numeric = Number(value);
    if (value === "" || !Number.isFinite(numeric) || numeric < 0) {
      delete state.oee.targetOverrides[key];
    } else {
      state.oee.targetOverrides[key] = numeric;
    }
    scheduleOeeTargetSave();
    updateOeeExclCount();
  }

  function cappedMinutes(cell, row, key, field) {
    const rule = rulesForCell(cell, key).find((item) => item.field === field && rowMatchesRule(row, item));
    if (!rule) return null;
    return Math.min(row[field] || 0, rule.minutes);
  }

  function fieldMatchesAnyRule(cell, row, field, keys) {
    return keys.some((key) => rulesForCell(cell, key).some((rule) => rule.field === field && rowMatchesRule(row, rule)));
  }

  function availabilityLossMinutes(cell, row, field) {
    const minutes = row[field] || 0;
    if (!minutes) return 0;
    if (fieldMatchesAnyRule(cell, row, field, ["plannedTimeOut", "availabilityExclude"])) return 0;
    const capped = cappedMinutes(cell, row, "availabilityCaps", field);
    return capped === null ? minutes : capped;
  }

  function availabilityExcludedMinutes(cell, row, field) {
    const minutes = row[field] || 0;
    if (!minutes) return 0;
    if (fieldMatchesAnyRule(cell, row, field, ["plannedTimeOut", "availabilityExclude"])) return minutes;
    const capped = cappedMinutes(cell, row, "availabilityCaps", field);
    return capped === null ? 0 : Math.max(0, minutes - capped);
  }

  function targetScaleDetailsForRow(cell, row) {
    return rulesForCell(cell, "targetScale")
      .filter((rule) => rowMatchesRule(row, rule) && (row[rule.field] || 0) > 0)
      .filter((rule) => !rulesForCell(cell, "targetScaleExclude").some((item) => item.field === rule.field && rowMatchesRule(row, item)))
      .map((rule) => {
        const capped = cappedMinutes(cell, row, "targetScaleCaps", rule.field);
        return { rule, minutes: capped === null ? (row[rule.field] || 0) : capped };
      })
      .filter((item) => item.minutes > 0);
  }
  function addAvailabilityBucket(map, key, label, minutes) {
    if (!minutes) return;
    if (!map[key]) map[key] = { key, label, minutes: 0, slots: 0 };
    map[key].minutes += minutes;
    map[key].slots += 1;
  }

  function addPerformanceBucket(map, key, label, units) {
    if (!units) return;
    if (!map[key]) map[key] = { key, label, units: 0, slots: 0 };
    map[key].units += units;
    map[key].slots += 1;
  }

  function ruleLabel(rule) {
    const base = downtimeFieldLabel(rule.field);
    return rule.type ? `${base} / ${rule.type}` : base;
  }

  function downtimeFieldLabel(key) {
    const field = state.oee.downtimeFields.find((item) => item.key === key);
    return field ? field.label : key;
  }

  function availabilityBucketRows(map, denominator) {
    return Object.values(map)
      .sort((a, b) => b.minutes - a.minutes)
      .map((item) => ({
        ...item,
        share: denominator > 0 ? item.minutes / denominator : 0,
      }));
  }

  function performanceBucketRows(map, denominator) {
    return Object.values(map)
      .sort((a, b) => b.units - a.units)
      .map((item) => ({
        ...item,
        share: denominator > 0 ? item.units / denominator : 0,
      }));
  }

  function getSlotMinutes(cell, date) {
    if (cell === "Quench Hücresi") {
      if (date) {
        const day = new Date(`${date}T00:00:00`).getDay();
        return (day === 5 || day === 6) ? 480 : 540;
      }
      return 540;
    }
    return 60;
  }

  function computeOeeBreakdown() {
    const cell = state.oee.cell;
    const byDate = state.oee.detailByDate || {};
    const range = state.oee.dateRange;
    if (!cell) return null;

    const breakdown = {
      cell,
      start: range ? range.start : null,
      end: range ? range.end : null,
      status: "empty",
      slotCount: 0,
      excludedSlotCount: 0,
      plannedMinutesGross: 0,
      plannedOutMinutes: 0,
      plannedMinutes: 0,
      downtimeMinutes: 0,
      workingMinutes: 0,
      targetProd: 0,
      targetGrossProd: 0,
      targetReductionProd: 0,
      actualProd: 0,
      targetedSlotCount: 0,
      targetedPlannedMinutes: 0,
      plannedOut: {},
      availabilityExcluded: {},
      downtimeLoss: {},
      targetScale: {},
      lossRows: [],
      performanceRows: [],
    };

    Object.entries(byDate).forEach(([date, rows]) => {
      if (range && (date < range.start || date > range.end)) return;
      rows.forEach((row) => {
        const key = slotKey(cell, date, row.zaman_dilimi);
        if (state.oee.exclusions.has(key)) {
          breakdown.excludedSlotCount += 1;
          return;
        }

        const slotMinutes = getSlotMinutes(cell, date);
        breakdown.slotCount += 1;
        breakdown.plannedMinutesGross += slotMinutes;

        const plannedOutMinutes = Math.min(slotMinutes, sumRuleMinutes(cell, row, "plannedTimeOut"));
        const effectivePlannedMinutes = slotMinutes - plannedOutMinutes;
        breakdown.plannedOutMinutes += plannedOutMinutes;
        breakdown.plannedMinutes += effectivePlannedMinutes;

        state.oee.downtimeFields.forEach((field) => {
          const minutes = row[field.key] || 0;
          if (!minutes) return;
          if (fieldMatchesAnyRule(cell, row, field.key, ["plannedTimeOut"])) {
            addAvailabilityBucket(breakdown.plannedOut, field.key, field.label, minutes);
            return;
          }
          const lossMinutes = availabilityLossMinutes(cell, row, field.key);
          const excludedMinutes = availabilityExcludedMinutes(cell, row, field.key);
          if (lossMinutes > 0) {
            breakdown.downtimeMinutes += lossMinutes;
            addAvailabilityBucket(breakdown.downtimeLoss, field.key, field.label, lossMinutes);
            breakdown.lossRows.push({
              date,
              time: row.zaman_dilimi,
              field: field.label,
              minutes: lossMinutes,
              summary: buildDurusSummary(row),
            });
          }
          if (excludedMinutes > 0) {
            addAvailabilityBucket(breakdown.availabilityExcluded, field.key, field.label, excludedMinutes);
          }
        });
        const grossTarget = targetForOeeRow(cell, date, row);
        if (grossTarget > 0) {
          const scaleDetails = targetScaleDetailsForRow(cell, row);
          const rawScaleMinutes = scaleDetails.reduce((sum, item) => sum + item.minutes, 0);
          const targetScaleMinutes = Math.min(slotMinutes, rawScaleMinutes);
          const targetScale = (slotMinutes - targetScaleMinutes) / slotMinutes;
          const adjustedTarget = grossTarget * targetScale;
          const reduction = grossTarget - adjustedTarget;
          const reasons = scaleDetails.map((item) => ruleLabel(item.rule));

          breakdown.targetedSlotCount += 1;
          breakdown.targetedPlannedMinutes += effectivePlannedMinutes;
          breakdown.actualProd += row.uretim_adeti || 0;
          breakdown.targetGrossProd += grossTarget;
          breakdown.targetProd += adjustedTarget;
          breakdown.targetReductionProd += reduction;

          if (reduction > 0 && rawScaleMinutes > 0) {
            scaleDetails.forEach((item) => {
              addPerformanceBucket(
                breakdown.targetScale,
                `${item.rule.field}:${item.rule.type || ""}`,
                ruleLabel(item.rule),
                reduction * (item.minutes / rawScaleMinutes)
              );
            });
          }

          breakdown.performanceRows.push({
            date,
            time: row.zaman_dilimi,
            actual: row.uretim_adeti || 0,
            targetGross: grossTarget,
            targetAdjusted: adjustedTarget,
            targetReduction: reduction,
            reasons: reasons.length ? reasons.join(", ") : "-",
          });
        }

      });
    });

    if (breakdown.plannedMinutes === 0) return breakdown;
    breakdown.workingMinutes = breakdown.plannedMinutes - breakdown.downtimeMinutes;
    breakdown.availability = breakdown.workingMinutes / breakdown.plannedMinutes;
    breakdown.targetCoverage = breakdown.targetedPlannedMinutes / breakdown.plannedMinutes;
    breakdown.status = (breakdown.targetProd <= 0 || breakdown.targetCoverage < 0.3) ? "insufficient" : "ok";
    if (breakdown.targetProd > 0) {
      breakdown.performance = breakdown.actualProd / breakdown.targetProd;
    }
    if (breakdown.status === "ok") {
      breakdown.oee = breakdown.availability * breakdown.performance;
    }
    breakdown.plannedOutRows = availabilityBucketRows(breakdown.plannedOut, breakdown.plannedMinutesGross);
    breakdown.availabilityExcludedRows = availabilityBucketRows(breakdown.availabilityExcluded, breakdown.plannedMinutesGross);
    breakdown.downtimeLossRows = availabilityBucketRows(breakdown.downtimeLoss, breakdown.plannedMinutes);
    breakdown.targetScaleRows = performanceBucketRows(breakdown.targetScale, breakdown.targetGrossProd || breakdown.targetProd);
    breakdown.lossRows.sort((a, b) => b.minutes - a.minutes);
    breakdown.performanceRows.sort((a, b) => b.targetReduction - a.targetReduction);
    return breakdown;
  }

  function computeLiveOee() {
    return computeOeeBreakdown();
  }

  function pctText(value) {
    return value == null ? "-" : `${(value * 100).toFixed(1)}%`;
  }

  function minutesText(value) {
    return `${Math.round(value)} dk`;
  }

  function unitsText(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
  }

  function renderMetricButton(kind, label, value, enabled) {
    const text = `${label} ${pctText(value)}`;
    if (!enabled) return `<span class="oee-metric-part">${text}</span>`;
    return `<button type="button" class="oee-metric-part oee-metric-button" data-oee-metric="${kind}">${text}</button>`;
  }

  function updateOeeLiveMetric() {
    const result = computeLiveOee();
    const cell = state.oee.cell;
    const isQuench = cell === "Quench Hücresi";
    if (!result || result.status === "empty") {
      el.oeeLiveMetric.innerHTML = `${renderMetricButton("availability", "Availability", null, false)}<span class="oee-metric-sep">|</span>${renderMetricButton("performance", "Performance", null, false)}<span class="oee-metric-sep">|</span><span class="oee-metric-part">OEE -</span>`;
      el.oeeLiveMetric.title = `Secili aralikta planli ${isQuench ? "gün" : "saat"} yok.`;
      return;
    }
    if (result.status === "insufficient") {
      el.oeeLiveMetric.innerHTML = `${renderMetricButton("availability", "Availability", result.availability, true)}<span class="oee-metric-sep">|</span>${renderMetricButton("performance", "Performance", result.performance || null, result.targetProd > 0)}<span class="oee-metric-sep">|</span><span class="oee-metric-part">OEE -</span>`;
      el.oeeLiveMetric.title = `Availability ${pctText(result.availability)}, hedef kapsami ${pctText(result.targetCoverage)}`;
      return;
    }
    el.oeeLiveMetric.innerHTML = `${renderMetricButton("availability", "Availability", result.availability, true)}<span class="oee-metric-sep">|</span>${renderMetricButton("performance", "Performance", result.performance, true)}<span class="oee-metric-sep">|</span><span class="oee-metric-part">OEE ${pctText(result.oee)}</span>`;
    el.oeeLiveMetric.title = `Availability ${pctText(result.availability)}, Performance ${pctText(result.performance)}, ${result.slotCount} ${isQuench ? "gün" : "saat"}`;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function availabilityRowsHtml(rows, emptyText, denominatorLabel) {
    const isQuench = state.oee.cell === "Quench Hücresi";
    if (!rows.length) return `<p class="availability-empty">${emptyText}</p>`;
    return `<table class="availability-breakdown-table"><thead><tr><th>Kaynak</th><th>Dakika</th><th>${isQuench ? "Gün" : "Saat"} adedi</th><th>${denominatorLabel}</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${minutesText(row.minutes)}</td><td>${row.slots}</td><td>${pctText(row.share)}</td></tr>`).join("")}</tbody></table>`;
  }

  function performanceRowsHtml(rows) {
    const isQuench = state.oee.cell === "Quench Hücresi";
    if (!rows.length) return `<p class="availability-empty">Hedef dusuren kural yok.</p>`;
    return `<table class="availability-breakdown-table"><thead><tr><th>Kaynak</th><th>Hedef dususu</th><th>${isQuench ? "Gün" : "Saat"} adedi</th><th>Ham hedef payi</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${unitsText(row.units)}</td><td>${row.slots}</td><td>${pctText(row.share)}</td></tr>`).join("")}</tbody></table>`;
  }

  function performanceDetailRowsHtml(rows) {
    const isQuench = state.oee.cell === "Quench Hücresi";
    if (!rows.length) return `<p class="availability-empty">Hedef girilmis ${isQuench ? "gün" : "saat"} yok.</p>`;
    return `<table class="availability-breakdown-table"><thead><tr><th>Tarih</th><th>${isQuench ? "Zaman Dilimi" : "Saat"}</th><th>Gercek</th><th>Ham hedef</th><th>Duzeltilmis hedef</th><th>Dusulen hedef</th><th>Sebep</th></tr></thead><tbody>${rows.slice(0, 120).map((row) => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.time)}</td><td>${unitsText(row.actual)}</td><td>${unitsText(row.targetGross)}</td><td>${unitsText(row.targetAdjusted)}</td><td>${unitsText(row.targetReduction)}</td><td>${escapeHtml(row.reasons)}</td></tr>`).join("")}</tbody></table>`;
  }

  function availabilityLossRowsHtml(rows) {
    const isQuench = state.oee.cell === "Quench Hücresi";
    if (!rows.length) return `<p class="availability-empty">Availability kayb\u0131 yazan ${isQuench ? "gün" : "saat"} yok.</p>`;
    return `<table class="availability-breakdown-table"><thead><tr><th>Tarih</th><th>${isQuench ? "Zaman Dilimi" : "Saat"}</th><th>Kaynak</th><th>Dakika</th><th>\u00d6zet</th></tr></thead><tbody>${rows.slice(0, 80).map((row) => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.time)}</td><td>${escapeHtml(row.field)}</td><td>${minutesText(row.minutes)}</td><td>${escapeHtml(row.summary)}</td></tr>`).join("")}</tbody></table>`;
  }

  function closeMetricDialog() {
    const existing = document.getElementById("metricDialogOverlay");
    if (existing) existing.remove();
  }

  function showAvailabilityDialog() {
    const data = computeOeeBreakdown();
    if (!data || data.status === "empty") return;
    closeMetricDialog();
    const overlay = document.createElement("div");
    overlay.id = "metricDialogOverlay";
    overlay.className = "dialog-overlay";
    overlay.innerHTML = `
      <div class="availability-dialog" role="dialog" aria-modal="true" aria-labelledby="availabilityDialogTitle">
        <div class="dialog-header">
          <div>
            <h2 id="availabilityDialogTitle">Availability Hesap Detay\u0131</h2>
            <p>${escapeHtml(data.cell)} | ${escapeHtml(data.start || "-")} - ${escapeHtml(data.end || "-")}</p>
          </div>
          <button type="button" class="dialog-close" aria-label="Kapat">x</button>
        </div>
        <div class="availability-formula">
          <strong>Availability = \u00c7al\u0131\u015fma S\u00fcresi / Planl\u0131 S\u00fcre</strong>
          <span>${minutesText(data.workingMinutes)} / ${minutesText(data.plannedMinutes)} = ${pctText(data.availability)}</span>
        </div>
        <div class="availability-cards">
          <div><span>Ham s\u00fcre</span><strong>${minutesText(data.plannedMinutesGross)}</strong><small>${data.slotCount} dahil ${data.cell === "Quench Hücresi" ? "gün" : "saat x 60 dk"}</small></div>
          <div><span>Planl\u0131 s\u00fcre d\u0131\u015f\u0131</span><strong>${minutesText(data.plannedOutMinutes)}</strong><small>Mola gibi paydadan \u00e7\u0131kan s\u00fcre</small></div>
          <div><span>Planl\u0131 s\u00fcre</span><strong>${minutesText(data.plannedMinutes)}</strong><small>Availability paydas\u0131</small></div>
          <div><span>Availability kayb\u0131</span><strong>${minutesText(data.downtimeMinutes)}</strong><small>H\u00fccrenin kayb\u0131 say\u0131lan duru\u015flar</small></div>
          <div><span>\u00c7al\u0131\u015fma s\u00fcresi</span><strong>${minutesText(data.workingMinutes)}</strong><small>Planl\u0131 s\u00fcre - kay\u0131p</small></div>
          <div><span>Tamamen hari\u00e7</span><strong>${data.excludedSlotCount} ${data.cell === "Quench Hücresi" ? "gün" : "saat"}</strong><small>Checkbox kald\u0131r\u0131lan ${data.cell === "Quench Hücresi" ? "günler" : "saatler"}</small></div>
        </div>
        <div class="availability-sections">
          <section>
            <h3>Availability kayb\u0131na girenler</h3>
            ${availabilityRowsHtml(data.downtimeLossRows, "Availability kayb\u0131na giren duru\u015f yok.", "Pay")}
          </section>
          <section>
            <h3>Availability'den hari\u00e7 tutulanlar</h3>
            ${availabilityRowsHtml(data.availabilityExcludedRows, "Hari\u00e7 tutulan bekleme / do\u011fal ak\u0131\u015f s\u00fcresi yok.", "Ham s\u00fcre pay\u0131")}
          </section>
          <section>
            <h3>Planl\u0131 s\u00fcre d\u0131\u015f\u0131na \u00e7\u0131kanlar</h3>
            ${availabilityRowsHtml(data.plannedOutRows, "Planl\u0131 s\u00fcre d\u0131\u015f\u0131na \u00e7\u0131kan s\u00fcre yok.", "Ham s\u00fcre pay\u0131")}
          </section>
          <section>
            <h3>Kay\u0131p yazan ${data.cell === "Quench Hücresi" ? "gün" : "saat"} detaylar\u0131</h3>
            ${availabilityLossRowsHtml(data.lossRows)}
          </section>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".dialog-close").addEventListener("click", closeMetricDialog);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeMetricDialog();
    });
  }

  function showPerformanceDialog() {
    const data = computeOeeBreakdown();
    if (!data || data.status === "empty" || data.targetGrossProd <= 0) return;
    closeMetricDialog();
    const overlay = document.createElement("div");
    overlay.id = "metricDialogOverlay";
    overlay.className = "dialog-overlay";
    overlay.innerHTML = `
      <div class="availability-dialog" role="dialog" aria-modal="true" aria-labelledby="performanceDialogTitle">
        <div class="dialog-header">
          <div>
            <h2 id="performanceDialogTitle">Performance Hesap Detay\u0131</h2>
            <p>${escapeHtml(data.cell)} | ${escapeHtml(data.start || "-")} - ${escapeHtml(data.end || "-")}</p>
          </div>
          <button type="button" class="dialog-close" aria-label="Kapat">x</button>
        </div>
        <div class="availability-formula">
          <strong>Performance = Ger\u00e7ekle\u015fen \u00dcretim / D\u00fczeltilmi\u015f Hedef</strong>
          <span>${unitsText(data.actualProd)} / ${unitsText(data.targetProd)} = ${pctText(data.performance)}</span>
        </div>
        <div class="availability-cards">
          <div><span>Ger\u00e7ekle\u015fen</span><strong>${unitsText(data.actualProd)}</strong><small>Hedefli ${data.cell === "Quench Hücresi" ? "günlerdeki" : "saatlerdeki"} \u00fcretim</small></div>
          <div><span>Ham hedef</span><strong>${unitsText(data.targetGrossProd)}</strong><small>Sat\u0131rlardaki hedef toplam\u0131</small></div>
          <div><span>D\u00fc\u015f\u00fclen hedef</span><strong>${unitsText(data.targetReductionProd)}</strong><small>Bekleme / planl\u0131 d\u0131\u015f\u0131 kurallar</small></div>
          <div><span>D\u00fczeltilmi\u015f hedef</span><strong>${unitsText(data.targetProd)}</strong><small>Performance paydas\u0131</small></div>
          <div><span>Hedefli ${data.cell === "Quench Hücresi" ? "gün" : "saat"}</span><strong>${data.targetedSlotCount} ${data.cell === "Quench Hücresi" ? "gün" : "saat"}</strong><small>Hedef girilmi\u015f sat\u0131rlar</small></div>
          <div><span>Hedef kapsami</span><strong>${pctText(data.targetCoverage)}</strong><small>Planl\u0131 s\u00fcre i\u00e7indeki oran</small></div>
        </div>
        <div class="availability-sections">
          <section>
            <h3>Hedefi d\u00fc\u015f\u00fcren kaynaklar</h3>
            ${performanceRowsHtml(data.targetScaleRows)}
          </section>
          <section>
            <h3>Performance durumu</h3>
            <p class="availability-empty">${data.status === "ok" ? "Bu aral\u0131kta hedef kapsami yeterli; Performance OEE hesab\u0131na dahil." : "Hedef kapsam\u0131 d\u00fc\u015f\u00fck oldu\u011fu i\u00e7in OEE taraf\u0131nda Performance yetersiz veri olarak i\u015faretlenir."}</p>
          </section>
          <section>
            <h3>${data.cell === "Quench Hücresi" ? "Gün" : "Saat"} bazl\u0131 hedef detay\u0131</h3>
            ${performanceDetailRowsHtml(data.performanceRows)}
          </section>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".dialog-close").addEventListener("click", closeMetricDialog);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeMetricDialog();
    });
  }

  el.oeeLiveMetric.addEventListener("click", (event) => {
    if (event.target.closest('[data-oee-metric="availability"]')) showAvailabilityDialog();
    if (event.target.closest('[data-oee-metric="performance"]')) showPerformanceDialog();
  });
  function updateOeeExclCount() {
    const cell = state.oee.cell;
    if (!cell) { el.oeeExclCount.textContent = ""; return; }
    const prefix = cell + "||";
    let count = 0;
    state.oee.exclusions.forEach((key) => { if (key.startsWith(prefix)) count += 1; });
    const unit = cell === "Quench Hücresi" ? "gün" : "saat";
    el.oeeExclCount.textContent = count
      ? `${count} ${unit} bu hücrede Planlı Süre dışı`
      : `Bu hücrede tüm ${unit === "gün" ? "günler" : "saatler"} Planlı Süre'ye dahil`;
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
    const unit = cell === "Quench Hücresi" ? "gün" : "saat";
    header.querySelector(".oee-day-badge").textContent =
      `${total} dk duruş` + (excludedCount ? ` · ${excludedCount} ${unit} dahil değil` : "");
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
      const isQuench = cell === "Quench Hücresi";
      table.innerHTML = `<thead><tr><th>${isQuench ? "Zaman Dilimi" : "Saat"}</th><th>Üretim / Hedef</th><th>Duruş Özeti</th><th>Planlı Süre</th></tr></thead>`;
      const tbody = document.createElement("tbody");

      rows.forEach((row) => {
        const key = slotKey(cell, date, row.zaman_dilimi);
        const tr = document.createElement("tr");

        const saatTd = document.createElement("td");
        saatTd.textContent = row.zaman_dilimi;
        tr.appendChild(saatTd);

        const uretimTd = document.createElement("td");
        uretimTd.className = "oee-production-cell";
        const hasTargetOverride = Object.prototype.hasOwnProperty.call(state.oee.targetOverrides, key);
        const baseTarget = row.hedef_uretim_adeti || 0;
        const targetInput = document.createElement("input");
        targetInput.type = "number";
        targetInput.min = "0";
        targetInput.step = "1";
        targetInput.className = "oee-target-input" + (hasTargetOverride ? " overridden" : "");
        targetInput.value = hasTargetOverride ? state.oee.targetOverrides[key] : (baseTarget || "");
        targetInput.title = hasTargetOverride ? `Manuel hedef. Supabase: ${baseTarget}` : `Supabase hedefi: ${baseTarget}`;
        targetInput.addEventListener("click", (event) => event.stopPropagation());
        targetInput.addEventListener("change", () => {
          setOeeTargetOverride(key, targetInput.value);
          const overridden = Object.prototype.hasOwnProperty.call(state.oee.targetOverrides, key);
          targetInput.classList.toggle("overridden", overridden);
          targetInput.title = overridden ? `Manuel hedef. Supabase: ${baseTarget}` : `Supabase hedefi: ${baseTarget}`;
        });
        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "oee-target-reset";
        resetBtn.textContent = "x";
        resetBtn.title = "Supabase hedefine don";
        resetBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          delete state.oee.targetOverrides[key];
          targetInput.value = baseTarget || "";
          targetInput.classList.remove("overridden");
          targetInput.title = `Supabase hedefi: ${baseTarget}`;
          scheduleOeeTargetSave();
          updateOeeExclCount();
        });
        uretimTd.append(`${row.uretim_adeti || 0} / `);
        uretimTd.appendChild(targetInput);
        uretimTd.appendChild(resetBtn);
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

  function isArizaExcludedRow(cell, date, row) {
    if (state.ariza.autoNonBreakdownTypes.has(row.ariza_turu)) return true;
    return state.ariza.falsePositives.has(slotKey(cell, date, row.zaman_dilimi));
  }

  // arizaIndexes içinden "gerçek arıza değil" sayılanları çıkarır (elle işaretli +
  // dataService.js:NON_BREAKDOWN_ARIZA_TYPES'a giren türler otomatik) — MTBF/MTTR
  // hesabında bu saatler hiç sayılmadığı için event/adjacency mantığı da onları görmezden gelir.
  function effectiveArizaIndexes(cell, date, arizaIndexes) {
    return arizaIndexes.filter((item) => !isArizaExcludedRow(cell, date, item.row));
  }

  // Bir günün gerçek arızalı saatleri için, ardışık linklenen satırları düşerek
  // gerçek olay sayısını hesaplar (dataService.js:addRowToAccumulator ile aynı mantık).
  function dayArizaEventCount(cell, date, effectiveIndexes) {
    return effectiveIndexes.reduce((count, item, i) => {
      const key = slotKey(cell, date, item.row.zaman_dilimi);
      const prevItem = effectiveIndexes[i - 1];
      const isAdjacent = prevItem && prevItem.idx === item.idx - 1;
      const linked = isAdjacent && state.ariza.links.has(key);
      return count + (linked ? 0 : 1);
    }, 0);
  }

  // Bu tabda görünen (tarih aralığı + OEE sekmesindeki Planlı Süre işaretleri)
  // satırlar üzerinden canlı MTBF/MTTR tahmini — dataService.js:finalizeReliability
  // ile aynı formül. Not: Üretim Verisi Seçimi sekmesindeki dönem-bazlı (nm/ht)
  // saat hariç tutmaları burada uygulanmaz — bu bir canlı önizlemedir, kesin
  // değerler "Sunumu Oluştur" ile yeniden üretilen oee-mtbf-mttr-data.json'dadır.
  function updateArizaLiveSummary() {
    const cell = state.ariza.cell;
    if (!cell) { el.arizaLiveSummary.textContent = ""; return; }
    const byDate = state.ariza.detailByDate || {};
    const range = state.oee.dateRange;
    let hourCount = 0;
    let realCount = 0;
    let eventCount = 0;
    let plannedMinutes = 0;
    let arizaMinutes = 0;
    Object.entries(byDate).forEach(([date, rows]) => {
      if (range && (date < range.start || date > range.end)) return;
      const arizaIndexes = rows
        .map((row, idx) => ({ row, idx }))
        .filter((item) => (item.row.ariza || 0) > 0);
      const effectiveIndexes = effectiveArizaIndexes(cell, date, arizaIndexes);
      hourCount += arizaIndexes.length;
      realCount += effectiveIndexes.length;
      eventCount += dayArizaEventCount(cell, date, effectiveIndexes);
      arizaMinutes += effectiveIndexes.reduce((sum, item) => sum + (item.row.ariza || 0), 0);
      rows.forEach((row) => {
        const key = slotKey(cell, date, row.zaman_dilimi);
        if (state.oee.exclusions.has(key)) return;
        plannedMinutes += getSlotMinutes(cell, date);
      });
    });
    const fpNote = hourCount > realCount ? ` (${hourCount - realCount} gerçek değil sayıldı)` : "";
    const mtbf = (plannedMinutes > 0 && eventCount > 0) ? (plannedMinutes - arizaMinutes) / eventCount : null;
    const mttr = eventCount > 0 ? arizaMinutes / eventCount : null;
    const mtbfText = mtbf === null ? "—" : `${mtbf.toFixed(1)} dk`;
    const mttrText = mttr === null ? "—" : `${mttr.toFixed(1)} dk`;
    el.arizaLiveSummary.textContent = `${hourCount} arızalı saat → ${eventCount} olay${fpNote} · MTBF ${mtbfText} · MTTR ${mttrText}`;
  }

  function renderArizaDetail() {
    const cell = state.ariza.cell;
    const byDate = state.ariza.detailByDate;
    const range = state.oee.dateRange;
    const dates = Object.keys(byDate)
      .filter((d) => !range || (d >= range.start && d <= range.end))
      .sort();

    const container = document.createElement("div");
    container.className = "oee-detail";
    let anyAriza = false;

    dates.forEach((date) => {
      const rows = byDate[date];
      const arizaIndexes = rows
        .map((row, idx) => ({ row, idx }))
        .filter((item) => (item.row.ariza || 0) > 0);
      if (arizaIndexes.length === 0) return;
      anyAriza = true;

      const dayDiv = document.createElement("div");
      dayDiv.className = "oee-day";

      const header = document.createElement("div");
      header.className = "oee-day-header";
      const updateBadge = () => {
        const effectiveIndexes = effectiveArizaIndexes(cell, date, arizaIndexes);
        const count = dayArizaEventCount(cell, date, effectiveIndexes);
        const fpNote = arizaIndexes.length > effectiveIndexes.length ? ` · ${arizaIndexes.length - effectiveIndexes.length} gerçek değil` : "";
        header.querySelector(".oee-day-badge").textContent = `${arizaIndexes.length} saat arızalı · ${count} olay${fpNote}`;
      };
      header.innerHTML = `<span class="oee-day-chevron">▶</span> <strong>${date}</strong> <span class="oee-day-badge"></span>`;
      updateBadge();
      dayDiv.appendChild(header);

      const table = document.createElement("table");
      table.className = "oee-detail-table hidden";
      table.innerHTML = `<thead><tr><th>Saat</th><th>Arıza (dk)</th><th>Tür</th><th>Açıklama</th><th>Giderildi</th><th>Gerçek Arıza mı?</th><th>Aynı arızanın devamı</th></tr></thead>`;
      const tbody = document.createElement("tbody");

      arizaIndexes.forEach((item) => {
        const { row, idx } = item;
        const key = slotKey(cell, date, row.zaman_dilimi);
        const tr = document.createElement("tr");

        const saatTd = document.createElement("td");
        saatTd.textContent = row.zaman_dilimi;
        tr.appendChild(saatTd);

        const dkTd = document.createElement("td");
        dkTd.textContent = `${row.ariza} dk`;
        tr.appendChild(dkTd);

        const turTd = document.createElement("td");
        turTd.textContent = row.ariza_turu || "—";
        tr.appendChild(turTd);

        const aciklamaTd = document.createElement("td");
        aciklamaTd.className = "oee-summary-cell";
        aciklamaTd.textContent = row.ariza_aciklama || "—";
        tr.appendChild(aciklamaTd);

        const giderildiTd = document.createElement("td");
        giderildiTd.textContent = row.ariza_giderildi ? "Evet" : "Hayır";
        tr.appendChild(giderildiTd);

        const isAutoNonBreakdown = state.ariza.autoNonBreakdownTypes.has(row.ariza_turu);
        const isExcluded = isArizaExcludedRow(cell, date, row);
        tr.classList.toggle("excluded", isExcluded);

        const fpTd = document.createElement("td");
        fpTd.className = "ariza-link-cell";
        if (isAutoNonBreakdown) {
          fpTd.textContent = "Hayır (otomatik)";
          fpTd.title = "Bu tür dataService.js:NON_BREAKDOWN_ARIZA_TYPES listesinde — elle değiştirilemez.";
        } else {
          const isFalsePositive = state.ariza.falsePositives.has(key);
          fpTd.innerHTML = `<label class="ariza-link-toggle"><input type="checkbox" ${isFalsePositive ? "" : "checked"} /> Gerçek</label>`;
          fpTd.addEventListener("click", () => {
            toggleArizaFalsePositive(key);
            const nowFalsePositive = state.ariza.falsePositives.has(key);
            tr.classList.toggle("excluded", nowFalsePositive);
            fpTd.querySelector("input").checked = !nowFalsePositive;
            rerenderLinkCell();
            updateBadge();
            updateArizaLiveSummary();
          });
        }
        tr.appendChild(fpTd);

        const linkTd = document.createElement("td");
        linkTd.className = "ariza-link-cell";
        const rerenderLinkCell = () => {
          linkTd.innerHTML = "";
          if (isArizaExcludedRow(cell, date, row)) {
            linkTd.textContent = "—";
            linkTd.onclick = null;
            return;
          }
          const effectiveIndexes = effectiveArizaIndexes(cell, date, arizaIndexes);
          const effIdx = effectiveIndexes.findIndex((e) => e.idx === idx);
          const prevEff = effIdx > 0 ? effectiveIndexes[effIdx - 1] : null;
          const isAdjacent = prevEff && prevEff.idx === idx - 1;
          if (!isAdjacent) {
            linkTd.textContent = "—";
            linkTd.onclick = null;
            return;
          }
          const isLinked = state.ariza.links.has(key);
          linkTd.innerHTML = `<label class="ariza-link-toggle"><input type="checkbox" ${isLinked ? "checked" : ""} /> Devamı</label>`;
          tr.classList.toggle("ariza-linked", isLinked);
          linkTd.onclick = () => {
            toggleArizaLink(key);
            const nowLinked = state.ariza.links.has(key);
            tr.classList.toggle("ariza-linked", nowLinked);
            linkTd.querySelector("input").checked = nowLinked;
            updateBadge();
            updateArizaLiveSummary();
          };
        };
        rerenderLinkCell();
        tr.appendChild(linkTd);

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

    if (!anyAriza) {
      el.arizaGrid.innerHTML = `<p class="hint-text">Seçili tarih aralığında bu hücrede arıza kaydı yok.</p>`;
    } else {
      el.arizaGrid.innerHTML = "";
      el.arizaGrid.appendChild(container);
    }
    updateArizaLiveSummary();
  }

  el.modeTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      el.modeTabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.mode = btn.dataset.mode;
      el.dataView.classList.toggle("hidden", state.mode !== "data");
      el.oeeView.classList.toggle("hidden", state.mode !== "oee");
      el.arizaView.classList.toggle("hidden", state.mode !== "ariza");
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
