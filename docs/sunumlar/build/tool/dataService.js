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
      "bolum, tarih, manuf_production_rows(zaman_dilimi, sira_no, uretim_adeti, onceki_istasyon_bekleme)"
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
        onceki_istasyon_bekleme: row.onceki_istasyon_bekleme || 0,
      });
    }
  }
  return byCell;
}

// slotKey formatı: "bolum||tarih||zaman_dilimi" — hat-forecast/CalibrationTable ile aynı desen.
function slotKey(bolum, tarih, zamanDilimi) {
  return `${bolum}||${tarih}||${zamanDilimi}`;
}

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

module.exports = { CELLS, DEFAULT_PERIODS, fetchRawSlots, slotKey, computeOverviewData };
