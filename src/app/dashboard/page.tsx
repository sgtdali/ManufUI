import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BOLUMLER, DURUS_KOLONLARI, type ProductionRow } from "@/lib/types";

type DbRecord = {
  id: string;
  bolum: string;
  sorumlu: string | null;
  tarih: string;
  updated_at: string | null;
  manuf_production_rows: ProductionRow[] | null;
};

type DepartmentSummary = {
  bolum: string;
  kayit: number;
  uretim: number;
  durus: number;
  netSure: number;
};

type DashboardSearchParams = {
  baslangic?: string | string[];
  bitis?: string | string[];
};

const DAILY_PLANNED_MINUTES = 555;

const DOWNTIME_KEYS = DURUS_KOLONLARI.map((column) => column.key).filter(
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getDateParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue || !/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return "";
  return rawValue;
}

function getDateRangeLabel(startDate: string, endDate: string) {
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  if (startDate) return `${formatDate(startDate)} ve sonrası`;
  if (endDate) return `${formatDate(endDate)} ve öncesi`;
  return "Tüm kayıtlar";
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function getRecordProduction(record: DbRecord) {
  return sumRows(record.manuf_production_rows, "uretim_adeti");
}

function getRecordDowntime(record: DbRecord) {
  return DOWNTIME_KEYS.reduce(
    (total, key) => total + sumRows(record.manuf_production_rows, key),
    0
  );
}

function getLatestDate(records: DbRecord[]) {
  return records.reduce<string | null>((latest, record) => {
    if (!latest || record.tarih > latest) return record.tarih;
    return latest;
  }, null);
}

function buildDepartmentSummaries(records: DbRecord[]) {
  const summaries = new Map<string, DepartmentSummary>();

  for (const bolum of BOLUMLER) {
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

export const metadata = {
  title: "Dashboard | Uretim Takip Sistemi",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const startDate = getDateParam(params.baslangic);
  const endDate = getDateParam(params.bitis);
  const dateRangeLabel = getDateRangeLabel(startDate, endDate);

  const supabase = await createClient();
  let query = supabase
    .from("manuf_production_records")
    .select("id, bolum, sorumlu, tarih, updated_at, manuf_production_rows(*)");

  if (startDate) {
    query = query.gte("tarih", startDate);
  }
  if (endDate) {
    query = query.lte("tarih", endDate);
  }

  const { data, error } = await query
    .order("tarih", { ascending: false })
    .order("bolum", { ascending: true });

  const records = (data ?? []) as DbRecord[];
  const latestDate = getLatestDate(records);
  const latestRecords = latestDate
    ? records.filter((record) => record.tarih === latestDate)
    : [];
  const previousRecords = latestDate
    ? records.filter((record) => record.tarih !== latestDate)
    : [];

  const totalProduction = records.reduce(
    (total, record) => total + getRecordProduction(record),
    0
  );
  const totalDowntime = records.reduce(
    (total, record) => total + getRecordDowntime(record),
    0
  );
  const latestProduction = latestRecords.reduce(
    (total, record) => total + getRecordProduction(record),
    0
  );
  const latestDowntime = latestRecords.reduce(
    (total, record) => total + getRecordDowntime(record),
    0
  );
  const plannedMinutes = records.length * DAILY_PLANNED_MINUTES;
  const departmentSummaries = buildDepartmentSummaries(records);
  const maxDepartmentProduction = Math.max(
    ...departmentSummaries.map((summary) => summary.uretim),
    1
  );
  const downtimeBreakdown = DOWNTIME_KEYS.map((key) => {
    const column = DURUS_KOLONLARI.find((item) => item.key === key);
    return {
      key,
      label: column?.label ?? key,
      value: records.reduce(
        (total, record) => total + sumRows(record.manuf_production_rows, key),
        0
      ),
    };
  })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxDowntime = Math.max(...downtimeBreakdown.map((item) => item.value), 1);
  const recentRecords = records.slice(0, 8);
  const previousProduction = previousRecords.reduce(
    (total, record) => total + getRecordProduction(record),
    0
  );
  const dailyAverage =
    records.length > 0
      ? Math.round(totalProduction / new Set(records.map((record) => record.tarih)).size)
      : 0;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              {latestDate ? `Son kayıt: ${formatDate(latestDate)}` : "Henüz kayıt yok"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              Üretim dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              {dateRangeLabel} için bölüm bazında üretim, duruş süreleri ve son kayıtlar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-md border border-rose-700 bg-rose-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-800"
              href="/arıza"
            >
              Arıza detay
            </Link>
            <Link
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
              href="/"
            >
              Forma dön
            </Link>
            <Link
              className="rounded-md border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
              href="/api/export"
            >
              Excel indir
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <form
            action="/dashboard"
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="baslangic">
                Başlangıç tarihi
              </label>
              <input
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                defaultValue={startDate}
                id="baslangic"
                name="baslangic"
                type="date"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="bitis">
                Bitiş tarihi
              </label>
              <input
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                defaultValue={endDate}
                id="bitis"
                name="bitis"
                type="date"
              />
            </div>
            <button
              className="self-end rounded-md border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
              type="submit"
            >
              Uygula
            </button>
            <Link
              className="self-end rounded-md border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
              href="/dashboard"
            >
              Tüm veriler
            </Link>
          </form>
        </section>

        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Veri okunamadı: {error.message}
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Toplam üretim" value={formatNumber(totalProduction)} note={`${records.length} kayıt`} />
          <MetricCard label="Son gün üretim" value={formatNumber(latestProduction)} note={latestDate ? formatDate(latestDate) : "-"} />
          <MetricCard label="Toplam duruş" value={`${formatNumber(totalDowntime)} dk`} note={`Kullanım ${percent(plannedMinutes - totalDowntime, plannedMinutes)}%`} />
          <MetricCard label="Günlük ortalama" value={formatNumber(dailyAverage)} note={previousProduction > 0 ? "Geçmiş kayıtlarla hesaplandı" : "İlk veri seti"} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Bölüm özeti</h2>
                <p className="text-sm text-zinc-500">Toplam üretime göre sıralı</p>
              </div>
              <span className="rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                {departmentSummaries.length} bölüm
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
                    <th className="py-2 pr-3 font-medium">Bölüm</th>
                    <th className="px-3 py-2 text-right font-medium">Kayıt</th>
                    <th className="px-3 py-2 text-right font-medium">Üretim</th>
                    <th className="px-3 py-2 text-right font-medium">Duruş</th>
                    <th className="py-2 pl-3 font-medium">Doluluk</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentSummaries.map((summary) => (
                    <tr key={summary.bolum} className="border-b border-zinc-100 last:border-0">
                      <td className="py-3 pr-3 font-medium text-zinc-900">{summary.bolum}</td>
                      <td className="px-3 py-3 text-right text-zinc-600">{summary.kayit}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatNumber(summary.uretim)}</td>
                      <td className="px-3 py-3 text-right text-zinc-600">{formatNumber(summary.durus)} dk</td>
                      <td className="py-3 pl-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-full min-w-32 rounded-md bg-zinc-100">
                            <div
                              className="h-2 rounded-md bg-emerald-600"
                              style={{
                                width: `${Math.max(percent(summary.uretim, maxDepartmentProduction), 4)}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs text-zinc-500">
                            {percent(summary.netSure, summary.kayit * DAILY_PLANNED_MINUTES)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Duruş kırılımı</h2>
            <p className="mb-4 text-sm text-zinc-500">Dakika toplamına göre</p>
            <div className="space-y-4">
              {downtimeBreakdown.map((item) => (
                <div key={String(item.key)}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-zinc-800">{item.label}</span>
                    <span className="text-zinc-500">{formatNumber(item.value)} dk</span>
                  </div>
                  <div className="h-2 rounded-md bg-zinc-100">
                    <div
                      className="h-2 rounded-md bg-rose-600"
                      style={{ width: `${Math.max(percent(item.value, maxDowntime), 4)}%` }}
                    />
                  </div>
                </div>
              ))}
              {downtimeBreakdown.length === 0 ? (
                <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
                  Duruş kaydı bulunmuyor.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Son gün</h2>
            <p className="mb-4 text-sm text-zinc-500">
              {latestDate ? formatDate(latestDate) : "Kayıt yok"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <SmallStat label="Üretim" value={formatNumber(latestProduction)} />
              <SmallStat label="Duruş" value={`${formatNumber(latestDowntime)} dk`} />
              <SmallStat label="Kayıt" value={formatNumber(latestRecords.length)} />
              <SmallStat
                label="Kullanım"
                value={`${percent(
                  latestRecords.length * DAILY_PLANNED_MINUTES - latestDowntime,
                  latestRecords.length * DAILY_PLANNED_MINUTES
                )}%`}
              />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Son kayıtlar</h2>
                <p className="text-sm text-zinc-500">Tarih ve bölüme göre</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
                    <th className="py-2 pr-3 font-medium">Tarih</th>
                    <th className="px-3 py-2 font-medium">Bölüm</th>
                    <th className="px-3 py-2 font-medium">Sorumlu</th>
                    <th className="px-3 py-2 text-right font-medium">Üretim</th>
                    <th className="py-2 pl-3 text-right font-medium">Duruş</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map((record) => (
                    <tr key={record.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-3 pr-3 text-zinc-600">{formatDate(record.tarih)}</td>
                      <td className="px-3 py-3 font-medium">{record.bolum}</td>
                      <td className="px-3 py-3 text-zinc-600">{record.sorumlu ?? "-"}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatNumber(getRecordProduction(record))}</td>
                      <td className="py-3 pl-3 text-right text-zinc-600">{formatNumber(getRecordDowntime(record))} dk</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{note}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
