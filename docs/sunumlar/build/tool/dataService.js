const { createClient } = require("@supabase/supabase-js");
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require("./env");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sunumdaki 12 üretim hücresi (ölçüm-only "FF Preform Ölçüm" / "Final Ölçüm" hariç).
const CELLS = [
  "Pres Hücresi", "ETM Hücresi", "ROB108 Hücresi", "Flowform Hücresi",
  "ROB104 Hücresi", "N602 Hücresi", "N603 Hücresi", "ROB109 Hücresi",
  "Quench Hücresi", "ROB110-111 Hücresi", "Fosfat Hücresi", "Boya Hücresi",
];

const DEFAULT_PERIODS = {
  nm: { label: "Nisan–Mayıs", start: "2026-04-01", end: "2026-05-31" },
  ht: { label: "Haziran–Temmuz", start: "2026-06-01", end: "2026-07-31" },
};

// Bir dönem için tüm hücrelerin ham gün/saat-dilimi satırlarını çeker.
// Dönüş: { [bolum]: { [tarih]: [{ zaman_dilimi, uretim_adeti, onceki_istasyon_bekleme }] } }
async function fetchRawSlots(start, end) {
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select(
      "bolum, tarih, manuf_production_rows(zaman_dilimi, sira_no, uretim_adeti, hedef_uretim_adeti, onceki_istasyon_bekleme, mola, ariza, planli_durus, planli_durus_turu, setup_ve_ayar, takim_degisimi, kalip_demontaj, kalip_montaj, musteri_kaynakli_durus, kalite_kaynakli_durus)"
    )
    .in("bolum", CELLS)
    .gte("tarih", start)
    .lte("tarih", end)
    .order("tarih", { ascending: true });

  if (error) throw new Error(`Supabase sorgu hatası: ${error.message}`);

  const byCell = {};
  for (const cell of CELLS) byCell[cell] = {};

  for (const record of data || []) {
    const cell = record.bolum;
    if (!byCell[cell]) continue;
    if (!byCell[cell][record.tarih]) byCell[cell][record.tarih] = [];
    for (const row of record.manuf_production_rows || []) {
      byCell[cell][record.tarih].push({
        zaman_dilimi: row.zaman_dilimi,
        sira_no: row.sira_no,
        uretim_adeti: row.uretim_adeti || 0,
        hedef_uretim_adeti: row.hedef_uretim_adeti || 0,
        onceki_istasyon_bekleme: row.onceki_istasyon_bekleme || 0,
        mola: row.mola || 0,
        ariza: row.ariza || 0,
        planli_durus: row.planli_durus || 0,
        setup_ve_ayar: row.setup_ve_ayar || 0,
        planli_durus_turu: row.planli_durus_turu || null,
        takim_degisimi: row.takim_degisimi || 0,
        kalip_demontaj: row.kalip_demontaj || 0,
        kalip_montaj: row.kalip_montaj || 0,
        musteri_kaynakli_durus: row.musteri_kaynakli_durus || 0,
        kalite_kaynakli_durus: row.kalite_kaynakli_durus || 0,
      });
    }
  }
  return byCell;
}

// slotKey formatı: "bolum||tarih||zaman_dilimi" — hat-forecast/CalibrationTable ile aynı desen.
function slotKey(bolum, tarih, zamanDilimi) {
  return `${bolum}||${tarih}||${zamanDilimi}`;
}

// Tek bir hücrenin TÜM duruş kolonlarını (alt tür + açıklama dahil) çeker — "OEE —
// Planlı Süre" arayüzünde kullanıcının saat bazında neyin olduğunu görüp Planlı
// Süre'ye dahil edip etmeyeceğine karar verebilmesi için. fetchRawSlots'tan farklı
// olarak tek hücre + açıklama/alt tür kolonlarını da içerir (o yüzden ayrı fonksiyon —
// diğer hesaplamalarda kullanılmayan büyük metin alanlarını gereksiz çekmemek için).
async function fetchCellDetailSlots(cell, start, end) {
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select(
      "tarih, manuf_production_rows(" +
        "zaman_dilimi, sira_no, uretim_adeti, hedef_uretim_adeti, " +
        "mola, mola_turu, " +
        "ariza, ariza_turu, ariza_aciklama, ariza_giderildi, " +
        "planli_durus, planli_durus_turu, planli_durus_aciklama, " +
        "setup_ve_ayar, setup_turu, setup_aciklama, " +
        "takim_degisimi, takim_degisim_turu, " +
        "kalip_demontaj, kalip_demontaj_turu, kalip_montaj, kalip_montaj_turu, " +
        "onceki_istasyon_bekleme, " +
        "musteri_kaynakli_durus, musteri_durus_turu, musteri_durus_aciklama, " +
        "kalite_kaynakli_durus" +
      ")"
    )
    .eq("bolum", cell)
    .gte("tarih", start)
    .lte("tarih", end)
    .order("tarih", { ascending: true });

  if (error) throw new Error(`Supabase sorgu hatası: ${error.message}`);

  const byDate = {};
  for (const record of data || []) {
    const rows = (record.manuf_production_rows || []).slice().sort((a, b) => a.sira_no - b.sira_no);
    byDate[record.tarih] = rows;
  }
  return byDate;
}

// Her duruş türünün eşlik eden alt tür / açıklama kolonlarını belirtir (varsa) —
// detay arayüzünde her satırı okunabilir tek satırlık özet haline getirmek için.
const DOWNTIME_FIELD_DETAIL_KEYS = {
  mola: { turKey: "mola_turu" },
  ariza: { turKey: "ariza_turu", aciklamaKey: "ariza_aciklama" },
  planli_durus: { turKey: "planli_durus_turu", aciklamaKey: "planli_durus_aciklama" },
  setup_ve_ayar: { turKey: "setup_turu", aciklamaKey: "setup_aciklama" },
  takim_degisimi: { turKey: "takim_degisim_turu" },
  kalip_demontaj: { turKey: "kalip_demontaj_turu" },
  kalip_montaj: { turKey: "kalip_montaj_turu" },
  onceki_istasyon_bekleme: {},
  musteri_kaynakli_durus: { turKey: "musteri_durus_turu", aciklamaKey: "musteri_durus_aciklama" },
  kalite_kaynakli_durus: {},
};

// exclusions: Set<slotKey> — hariç tutulan (checkbox'ı kaldırılmış) satırlar.
// Varsayılan: hepsi dahil (exclusions boş).
function computeCellAverage(rawByDate, cell, exclusions) {
  let sumProd = 0;
  let sumWait = 0;
  const daysWithData = new Set();

  for (const [tarih, rows] of Object.entries(rawByDate)) {
    let dayHasIncluded = false;
    for (const row of rows) {
      const key = slotKey(cell, tarih, row.zaman_dilimi);
      if (exclusions.has(key)) continue;
      sumProd += row.uretim_adeti;
      sumWait += row.onceki_istasyon_bekleme;
      dayHasIncluded = true;
    }
    if (dayHasIncluded) daysWithData.add(tarih);
  }

  const dayCount = daysWithData.size;
  if (dayCount === 0) return { production: null, wait: null };
  return {
    production: sumProd / dayCount,
    wait: sumWait / dayCount,
  };
}

// N602 ve N603 paralel çalışır (ikisi de ROB104'ten beslenir, ikisi de ROB109'a
// gönderir) — sunum tarafında Genel Bakış tablosunda tek satırda gösterilir.
// Üretim: iki hattın toplamı. Bekleme: iki hattın slot verisi tek havuzda
// toplanıp aynı "toplam bekleme / gün sayısı" formülü uygulanır (diğer
// hücrelerle tutarlı). Seçim aracında (grid) N602/N603 yine ayrı satır kalır.
const MERGE_CELL_A = "N602 Hücresi";
const MERGE_CELL_B = "N603 Hücresi";
const MERGED_CELL_LABEL = "N602-N603 Hücresi";

function computeMergedCellAverage(rawByDateA, cellA, rawByDateB, cellB, exclusions) {
  let sumProd = 0;
  let sumWait = 0;
  const daysWithData = new Set();

  const dates = new Set([...Object.keys(rawByDateA), ...Object.keys(rawByDateB)]);
  for (const tarih of dates) {
    let dayHasIncluded = false;
    for (const [cell, rows] of [[cellA, rawByDateA[tarih] || []], [cellB, rawByDateB[tarih] || []]]) {
      for (const row of rows) {
        const key = slotKey(cell, tarih, row.zaman_dilimi);
        if (exclusions.has(key)) continue;
        sumProd += row.uretim_adeti;
        sumWait += row.onceki_istasyon_bekleme;
        dayHasIncluded = true;
      }
    }
    if (dayHasIncluded) daysWithData.add(tarih);
  }

  const dayCount = daysWithData.size;
  if (dayCount === 0) return { production: null, wait: null };
  return {
    production: sumProd / dayCount,
    wait: sumWait / dayCount,
  };
}

// ---------------------------------------------------------------------------
// OEE / MTBF / MTTR
// ---------------------------------------------------------------------------
// Her satır (zaman_dilimi) 60 dakikalık planlı süreyi temsil eder.
// Availability = Çalışma Süresi / Planlı Süre, Çalışma Süresi = Planlı Süre - tüm duruş türleri toplamı.
// Performance = Gerçekleşen Üretim / Hedef Üretim, sadece hedef_uretim_adeti girilmiş
// (>0) satırlar üzerinden hesaplanır. Bu alan hücrelere göre farklı tarihlerde
// (Nisan ortası - Haziran sonu arası kademeli) devreye girdiği için, hedefi olmayan
// satırların gerçek üretimini paydasız payda dahil etmek oranı yapay şekilde şişirir/çarpıtır.
// OEE = Availability × Performance (Kalite bileşeni hariç — 12 hücrenin hiçbirinde
// satır bazlı ret/fire verisi yok, sadece FF Preform/Final Ölçüm istasyonlarında var
// ve onlar bu 12 hücreden bağımsız ölçüm noktaları; bu yüzden basitleştirilmiş OEE kullanılıyor).
// MTBF/MTTR sadece "arıza" (breakdown) kolonuna dayanır:
//   MTTR (dk/olay) = Toplam arıza dakikası / arıza kaydı sayısı
//   MTBF (dk/olay) = (Planlı Süre - Toplam arıza dakikası) / arıza kaydı sayısı
// Cell OEE excludes onceki_istasyon_bekleme from Availability loss; flow/wait
// analysis still keeps that field separately.
const SLOT_MINUTES = 60;
const DOWNTIME_FIELDS = [
  "mola", "ariza", "planli_durus", "setup_ve_ayar", "takim_degisimi",
  "kalip_demontaj", "kalip_montaj", "onceki_istasyon_bekleme",
  "musteri_kaynakli_durus", "kalite_kaynakli_durus",
];

const KASA_ALMA_BIRAKMA = "Kasa Alma - B\u0131rakma";
const KASA_ALMA_BIRAKMA_CELLS = [
  "ROB108 H\u00fccresi",
  "ROB104 H\u00fccresi",
  "Flowform H\u00fccresi",
  "N602 H\u00fccresi",
  "N603 H\u00fccresi",
];
const TAKIM_DEGISIMI_STANDART_DK = {
  "ROB109 H\u00fccresi": 10,
  "ROB104 H\u00fccresi": 15,
  "ROB108 H\u00fccresi": 15,
};
const PRES_IHU_REJIM_BEKLEME = "IHU Rejim Bekleme";
const CELL_OEE_RULES = {
  plannedTimeOut: [],
  availabilityExclude: [{ field: "mola" }, { field: "onceki_istasyon_bekleme" }],
  // Performance hedefi, uretilebilir sureye gore olceklenir. Mola hedefi
  // dusurmez; donusumlu mola yapilabilecek organizasyon kaybi Performance
  // tarafinda gorunur.
  targetScale: DOWNTIME_FIELDS.filter((field) => field !== "mola").map((field) => ({ field })),
  cells: Object.fromEntries(
    Array.from(new Set([...KASA_ALMA_BIRAKMA_CELLS, ...Object.keys(TAKIM_DEGISIMI_STANDART_DK), "Pres H\u00fccresi"])).map((cell) => {
      const rules = {};
      if (cell === "Pres H\u00fccresi") {
        const ihuRule = { field: "setup_ve_ayar", typeField: "setup_turu", type: PRES_IHU_REJIM_BEKLEME };
        rules.availabilityExclude = [ihuRule];
        rules.targetScaleExclude = [ihuRule];
      }
      if (KASA_ALMA_BIRAKMA_CELLS.includes(cell)) {
        rules.availabilityExclude = [
          { field: "planli_durus", typeField: "planli_durus_turu", type: KASA_ALMA_BIRAKMA },
        ];
      }
      if (TAKIM_DEGISIMI_STANDART_DK[cell]) {
        const minutes = TAKIM_DEGISIMI_STANDART_DK[cell];
        rules.availabilityCaps = [{ field: "takim_degisimi", minutes }];
        rules.targetScaleCaps = [{ field: "takim_degisimi", minutes }];
      }
      return [cell, rules];
    })
  ),
};
function rowMatchesRule(row, rule) {
  return !rule.typeField || row[rule.typeField] === rule.type;
}

function rulesForCell(cell, key) {
  return [...(CELL_OEE_RULES[key] || []), ...((CELL_OEE_RULES.cells[cell] || {})[key] || [])];
}

function sumRuleMinutes(cell, row, key) {
  return rulesForCell(cell, key).reduce((sum, rule) => {
    return sum + (rowMatchesRule(row, rule) ? (row[rule.field] || 0) : 0);
  }, 0);
}

function targetForRow(cell, tarih, row, targetOverrides) {
  const key = slotKey(cell, tarih, row.zaman_dilimi);
  const override = targetOverrides && Object.prototype.hasOwnProperty.call(targetOverrides, key)
    ? Number(targetOverrides[key])
    : null;
  return Number.isFinite(override) && override >= 0 ? override : (row.hedef_uretim_adeti || 0);
}

function cappedMinutes(cell, row, key, field) {
  const rule = rulesForCell(cell, key).find((item) => item.field === field && rowMatchesRule(row, item));
  if (!rule) return null;
  return Math.min(row[field] || 0, rule.minutes);
}

function availabilityLossMinutes(cell, row, field) {
  const minutes = row[field] || 0;
  if (!minutes) return 0;
  const excluded = ["plannedTimeOut", "availabilityExclude"].some((key) =>
    rulesForCell(cell, key).some((rule) => rule.field === field && rowMatchesRule(row, rule))
  );
  if (excluded) return 0;
  const capped = cappedMinutes(cell, row, "availabilityCaps", field);
  return capped === null ? minutes : capped;
}

function targetScaleMinutesForRow(cell, row) {
  return rulesForCell(cell, "targetScale").reduce((sum, rule) => {
    if (!rowMatchesRule(row, rule)) return sum;
    const isExcluded = rulesForCell(cell, "targetScaleExclude").some((item) => item.field === rule.field && rowMatchesRule(row, item));
    if (isExcluded) return sum;
    const capped = cappedMinutes(cell, row, "targetScaleCaps", rule.field);
    return sum + (capped === null ? (row[rule.field] || 0) : capped);
  }, 0);
}
const DOWNTIME_FIELD_LABELS = {
  mola: "Mola",
  ariza: "Arıza",
  planli_durus: "Planlı Duruş",
  setup_ve_ayar: "Setup ve Ayar / Hazırlık",
  takim_degisimi: "Takım Değişimi",
  kalip_demontaj: "Kalıp Demontaj",
  kalip_montaj: "Kalıp Montaj",
  onceki_istasyon_bekleme: "Önceki İstasyon Bekleme",
  musteri_kaynakli_durus: "Müşteri Kaynaklı Duruş",
  kalite_kaynakli_durus: "Kalite Kaynaklı Duruş",
};

// plannedTimeExclusions: Set<slotKey> — kullanıcının "OEE — Planlı Süre" arayüzünde
// hücre+tarih+saat bazında tek tek incelendikten sonra "bu saat hiç planlanmamış
// zamandı" diye işaretlediği satırlar. Böyle işaretli bir satır tamamen atlanır: ne
// Planlı Süre'ye (paydaya) ne de kayıp (downtime) hesabına dahil olur — tıpkı o saat
// hiç raporlanmamış gibi. Varsayılan (boş set) = hiçbir satır atlanmaz, önceki davranışla aynı.
function newReliabilityAccumulator() {
  return {
    slotCount: 0, plannedMinutes: 0, downtimeMinutes: 0,
    targetedActualProd: 0, targetProd: 0, targetedPlannedMinutes: 0,
    arizaMinutes: 0, arizaEvents: 0,
  };
}

function addRowToAccumulator(acc, row, cell, tarih, targetOverrides) {
  acc.slotCount += 1;
  const plannedOutMinutes = Math.min(SLOT_MINUTES, sumRuleMinutes(cell, row, "plannedTimeOut"));
  const effectivePlannedMinutes = SLOT_MINUTES - plannedOutMinutes;
  acc.plannedMinutes += effectivePlannedMinutes;
  for (const field of DOWNTIME_FIELDS) {
    acc.downtimeMinutes += availabilityLossMinutes(cell, row, field);
  }
  const hedefUretimAdeti = targetForRow(cell, tarih, row, targetOverrides);
  if (hedefUretimAdeti > 0) {
    acc.targetedPlannedMinutes += effectivePlannedMinutes;
    acc.targetedActualProd += row.uretim_adeti || 0;
    const targetScaleMinutes = Math.min(SLOT_MINUTES, targetScaleMinutesForRow(cell, row));
    const targetScale = (SLOT_MINUTES - targetScaleMinutes) / SLOT_MINUTES;
    acc.targetProd += hedefUretimAdeti * targetScale;
  }
  acc.arizaMinutes += row.ariza || 0;
  if ((row.ariza || 0) > 0) acc.arizaEvents += 1;
}

// targetCoverageMinPct: Performance/OEE'nin anlamlı sayılması için hedefli satırların
// dönemin en az bu oranına ulaşması gerekir (aksi halde çok az örnekle yanıltıcı bir
// yüzde üretilebilir — bkz. dataService yorumu).
function finalizeReliability(acc, targetCoverageMinPct = 0.3) {
  if (acc.plannedMinutes === 0) {
    return { availability: null, performance: null, oee: null, mtbf: null, mttr: null, arizaEvents: 0 };
  }
  const plannedMinutes = acc.plannedMinutes;
  const availability = (plannedMinutes - acc.downtimeMinutes) / plannedMinutes;
  const targetCoverage = acc.targetedPlannedMinutes / plannedMinutes;
  const performance = (acc.targetProd > 0 && targetCoverage >= targetCoverageMinPct)
    ? acc.targetedActualProd / acc.targetProd
    : null;
  const oee = performance === null ? null : availability * performance;
  const mttr = acc.arizaEvents > 0 ? acc.arizaMinutes / acc.arizaEvents : null;
  const mtbf = acc.arizaEvents > 0 ? (plannedMinutes - acc.arizaMinutes) / acc.arizaEvents : null;
  return { availability, performance, oee, mtbf, mttr, arizaEvents: acc.arizaEvents };
}

function computeCellReliability(rawByDate, cell, exclusions, plannedTimeExclusions, targetOverrides) {
  const acc = newReliabilityAccumulator();
  for (const [tarih, rows] of Object.entries(rawByDate)) {
    for (const row of rows) {
      const key = slotKey(cell, tarih, row.zaman_dilimi);
      if (exclusions.has(key) || plannedTimeExclusions.has(key)) continue;
      addRowToAccumulator(acc, row, cell, tarih, targetOverrides);
    }
  }
  return finalizeReliability(acc);
}

function computeMergedCellReliability(rawByDateA, cellA, rawByDateB, cellB, exclusions, plannedTimeExclusions, targetOverrides) {
  const acc = newReliabilityAccumulator();
  const dates = new Set([...Object.keys(rawByDateA), ...Object.keys(rawByDateB)]);
  for (const tarih of dates) {
    for (const [cell, rows] of [[cellA, rawByDateA[tarih] || []], [cellB, rawByDateB[tarih] || []]]) {
      for (const row of rows) {
        const key = slotKey(cell, tarih, row.zaman_dilimi);
        if (exclusions.has(key) || plannedTimeExclusions.has(key)) continue;
        addRowToAccumulator(acc, row, cell, tarih, targetOverrides);
      }
    }
  }
  return finalizeReliability(acc);
}

function pct1(n) {
  return n === null ? null : Number((n * 100).toFixed(1));
}
function dk1(n) {
  return n === null ? null : Number(n.toFixed(1));
}

// dateRange: { start, end } (YYYY-MM-DD, dahil) — verilmişse bu aralığın dışındaki
// tarihler rawByDate'ten tamamen çıkarılır (o günler hiç raporlanmamış gibi davranılır).
// "OEE — Planlı Süre" arayüzündeki tarih filtresi bunu besler.
function clipToDateRange(rawByDate, dateRange) {
  if (!dateRange) return rawByDate;
  const out = {};
  for (const [tarih, rows] of Object.entries(rawByDate)) {
    if (tarih >= dateRange.start && tarih <= dateRange.end) out[tarih] = rows;
  }
  return out;
}

// Yeni OEE/MTBF/MTTR bölümü slaytlarının veri formatını üretir.
async function computeOeeMtbfMttrData({
  periods = DEFAULT_PERIODS, exclusionsNm = [], exclusionsHt = [],
  plannedTimeExclusions = [], dateRange = null, targetOverrides = {},
} = {}) {
  const [rawNm, rawHt] = await Promise.all([
    fetchRawSlots(periods.nm.start, periods.nm.end),
    fetchRawSlots(periods.ht.start, periods.ht.end),
  ]);

  const excNm = new Set(exclusionsNm);
  const excHt = new Set(exclusionsHt);
  // plannedTimeExclusions dönem ayrımı yapmaz — slotKey zaten tam tarihi içerir,
  // dolayısıyla tek bir set her iki dönem hesabında da doğru satırları eşleştirir.
  const ptExcl = new Set(plannedTimeExclusions);

  const displayCells = CELLS.filter((c) => c !== MERGE_CELL_B).map((c) =>
    c === MERGE_CELL_A ? MERGED_CELL_LABEL : c
  );

  return displayCells.map((cell) => {
    let nmStats, htStats;
    if (cell === MERGED_CELL_LABEL) {
      const rawNmA = clipToDateRange(rawNm[MERGE_CELL_A] || {}, dateRange);
      const rawNmB = clipToDateRange(rawNm[MERGE_CELL_B] || {}, dateRange);
      const rawHtA = clipToDateRange(rawHt[MERGE_CELL_A] || {}, dateRange);
      const rawHtB = clipToDateRange(rawHt[MERGE_CELL_B] || {}, dateRange);
      nmStats = computeMergedCellReliability(rawNmA, MERGE_CELL_A, rawNmB, MERGE_CELL_B, excNm, ptExcl, targetOverrides);
      htStats = computeMergedCellReliability(rawHtA, MERGE_CELL_A, rawHtB, MERGE_CELL_B, excHt, ptExcl, targetOverrides);
    } else {
      nmStats = computeCellReliability(clipToDateRange(rawNm[cell] || {}, dateRange), cell, excNm, ptExcl, targetOverrides);
      htStats = computeCellReliability(clipToDateRange(rawHt[cell] || {}, dateRange), cell, excHt, ptExcl, targetOverrides);
    }

    return {
      cell,
      availabilityNm: pct1(nmStats.availability), availabilityHt: pct1(htStats.availability),
      performanceNm: pct1(nmStats.performance), performanceHt: pct1(htStats.performance),
      oeeNm: pct1(nmStats.oee), oeeHt: pct1(htStats.oee),
      mtbfNm: dk1(nmStats.mtbf), mtbfHt: dk1(htStats.mtbf),
      mttrNm: dk1(nmStats.mttr), mttrHt: dk1(htStats.mttr),
      arizaEventsNm: nmStats.arizaEvents, arizaEventsHt: htStats.arizaEvents,
    };
  });
}

// Slayt 3/4 overviewData formatını üretir: nm/ht = üretim (Nisan-Mayıs / Haziran-Temmuz),
// nmB/htB = bekleme (Nisan-Mayıs / Haziran-Temmuz).
async function computeOverviewData({ periods = DEFAULT_PERIODS, exclusionsNm = [], exclusionsHt = [] } = {}) {
  const [rawNm, rawHt] = await Promise.all([
    fetchRawSlots(periods.nm.start, periods.nm.end),
    fetchRawSlots(periods.ht.start, periods.ht.end),
  ]);

  const excNm = new Set(exclusionsNm);
  const excHt = new Set(exclusionsHt);

  // N603'ü ayrı satır olarak çıkar, N602'nin yerine birleşik etiketi koy.
  const displayCells = CELLS.filter((c) => c !== MERGE_CELL_B).map((c) =>
    c === MERGE_CELL_A ? MERGED_CELL_LABEL : c
  );

  return displayCells.map((cell) => {
    const isFirstStation = cell === "Pres Hücresi";
    let nmStats, htStats;
    if (cell === MERGED_CELL_LABEL) {
      nmStats = computeMergedCellAverage(rawNm[MERGE_CELL_A] || {}, MERGE_CELL_A, rawNm[MERGE_CELL_B] || {}, MERGE_CELL_B, excNm);
      htStats = computeMergedCellAverage(rawHt[MERGE_CELL_A] || {}, MERGE_CELL_A, rawHt[MERGE_CELL_B] || {}, MERGE_CELL_B, excHt);
    } else {
      nmStats = computeCellAverage(rawNm[cell] || {}, cell, excNm);
      htStats = computeCellAverage(rawHt[cell] || {}, cell, excHt);
    }

    return {
      cell,
      nm: nmStats.production === null ? 0 : Number(nmStats.production.toFixed(1)),
      ht: htStats.production === null ? null : Number(htStats.production.toFixed(1)),
      nmB: isFirstStation ? 0.0 : (nmStats.wait === null ? 0.0 : Number(nmStats.wait.toFixed(1))),
      htB: isFirstStation ? 0.0 : (htStats.wait === null ? null : Number(htStats.wait.toFixed(1))),
      note: "",
    };
  });
}

module.exports = {
  CELLS, DEFAULT_PERIODS, fetchRawSlots, slotKey, computeOverviewData, computeOeeMtbfMttrData,
  DOWNTIME_FIELDS, DOWNTIME_FIELD_LABELS, DOWNTIME_FIELD_DETAIL_KEYS, CELL_OEE_RULES, fetchCellDetailSlots,
};
