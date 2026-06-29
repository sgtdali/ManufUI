import { BOLUMLER, DURUS_KOLONLARI, type ProductionRow } from "@/lib/types";

export type DbRecord = {
  id: string;
  bolum: string;
  sorumlu: string | null;
  tarih: string;
  updated_at: string | null;
  manuf_production_rows: ProductionRow[] | null;
};

export type DepartmentSummary = {
  bolum: string;
  kayit: number;
  uretim: number;
  durus: number;
  netSure: number;
};

export type DashboardSearchParams = {
  baslangic?: string | string[];
  bitis?: string | string[];
};

export const DAILY_PLANNED_MINUTES = 555;

export const DOWNTIME_KEYS = DURUS_KOLONLARI.map((column) => column.key).filter(
  (key) =>
    key !== "uretim_adeti" &&
    key !== "sira_no" &&
    key !== "zaman_dilimi" &&
    key !== "mola_turu" &&
    key !== "ariza_turu" &&
    key !== "ariza_aciklama" &&
    key !== "planli_durus_turu" &&
    key !== "planli_durus_aciklama" &&
    key !== "setup_turu" &&
    key !== "setup_aciklama" &&
    key !== "musteri_durus_turu"
) as (keyof ProductionRow)[];

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sumRows(rows: ProductionRow[] | null | undefined, key: keyof ProductionRow) {
  return (rows ?? []).reduce((total, row) => total + numberValue(row[key]), 0);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function getDateParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue || !/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return "";
  return rawValue;
}

export function getDateRangeLabel(startDate: string, endDate: string) {
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  if (startDate) return `${formatDate(startDate)} ve sonrası`;
  if (endDate) return `${formatDate(endDate)} ve öncesi`;
  return "Tüm kayıtlar";
}

export function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function getRecordProduction(record: DbRecord) {
  return sumRows(record.manuf_production_rows, "uretim_adeti");
}

export function getRecordDowntime(record: DbRecord) {
  return DOWNTIME_KEYS.reduce(
    (total, key) => total + sumRows(record.manuf_production_rows, key),
    0
  );
}

export function getLatestDate(records: DbRecord[]) {
  return records.reduce<string | null>((latest, record) => {
    if (!latest || record.tarih > latest) return record.tarih;
    return latest;
  }, null);
}

export function buildDepartmentSummaries(records: DbRecord[]) {
  const summaries = new Map<string, DepartmentSummary>();

  for (const bolum of BOLUMLER) {
    if (bolum === "FF Preform Ölçüm" || bolum === "Final Ölçüm") continue;
    summaries.set(bolum, { bolum, kayit: 0, uretim: 0, durus: 0, netSure: 0 });
  }

  for (const record of records) {
    const current =
      summaries.get(record.bolum) ??
      { bolum: record.bolum, kayit: 0, uretim: 0, durus: 0, netSure: 0 };
    const durus = getRecordDowntime(record);
    current.kayit += 1;
    current.uretim += getRecordProduction(record);
    current.durus += durus;
    current.netSure += Math.max(DAILY_PLANNED_MINUTES - durus, 0);
    summaries.set(record.bolum, current);
  }

  return Array.from(summaries.values())
    .filter((summary) => summary.kayit > 0)
    .sort((a, b) => b.uretim - a.uretim);
}
