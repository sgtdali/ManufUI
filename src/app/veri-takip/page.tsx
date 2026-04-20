import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BOLUMLER, type ProductionRow } from "@/lib/types";

type VeriTakipSearchParams = {
  baslangic?: string | string[];
  bitis?: string | string[];
};

type DbRecord = {
  id: string;
  bolum: string;
  tarih: string;
  manuf_production_rows: Pick<ProductionRow, "uretim_adeti">[] | null;
};

type CellValue = {
  hasRecord: boolean;
  value: number;
};

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getDateParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue || !/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return "";
  return rawValue;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultRange() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    startDate: toDateKey(firstDay),
    endDate: toDateKey(today),
  };
}

function buildDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatDay(value: string) {
  return value.slice(8, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function getDepartmentLabel(bolum: string) {
  return bolum.replace(" Hücresi", "");
}

function getCellTone(value: number) {
  if (value <= 0) return "bg-rose-100 text-zinc-900";
  if (value < 20) return "bg-amber-100 text-zinc-900";
  if (value < 50) return "bg-emerald-100 text-zinc-900";
  return "bg-emerald-200 text-zinc-950";
}

function getRecordProduction(record: DbRecord) {
  return (record.manuf_production_rows ?? []).reduce(
    (total, row) => total + numberValue(row.uretim_adeti),
    0
  );
}

export const metadata = {
  title: "Veri Takip | Uretim Takip Sistemi",
};

export default async function VeriTakipPage({
  searchParams,
}: {
  searchParams?: Promise<VeriTakipSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const defaultRange = getDefaultRange();
  const startDate = getDateParam(params.baslangic) || defaultRange.startDate;
  const endDate = getDateParam(params.bitis) || defaultRange.endDate;
  const dates = buildDateRange(startDate, endDate);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("id, bolum, tarih, manuf_production_rows(uretim_adeti)")
    .gte("tarih", startDate)
    .lte("tarih", endDate)
    .order("tarih", { ascending: true })
    .order("bolum", { ascending: true });

  const records = (data ?? []) as DbRecord[];
  const values = new Map<string, CellValue>();

  for (const record of records) {
    const key = `${record.bolum}|||${record.tarih}`;
    const current = values.get(key) ?? { hasRecord: false, value: 0 };
    current.hasRecord = true;
    current.value += getRecordProduction(record);
    values.set(key, current);
  }

  const totals = new Map<string, number>();
  for (const bolum of BOLUMLER) {
    totals.set(
      bolum,
      dates.reduce((total, tarih) => {
        const cell = values.get(`${bolum}|||${tarih}`);
        return total + (cell?.hasRecord ? cell.value : 0);
      }, 0)
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Veri takip
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Günlük üretim adetleri bölüm ve tarih bazında izlenir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
              href="/"
            >
              Forma dön
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <form
            action="/veri-takip"
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="baslangic">
                Başlangıç tarihi
              </label>
              <input
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-600/20"
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
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-600/20"
                defaultValue={endDate}
                id="bitis"
                name="bitis"
                type="date"
              />
            </div>
            <button
              className="self-end rounded-md border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
              type="submit"
            >
              Uygula
            </button>
            <Link
              className="self-end rounded-md border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
              href="/veri-takip"
            >
              Bu ay
            </Link>
          </form>
        </section>

        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Veri okunamadı: {error.message}
          </section>
        ) : null}

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Günlük üretim adetleri</h2>
              <p className="text-sm text-zinc-500">
                VY, ilgili bölüm ve gün için kayıt olmadığını belirtir.
              </p>
            </div>
            <p className="text-sm font-medium text-zinc-500">
              {dates.length} gün
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-zinc-200 bg-white px-3 py-2 text-left font-semibold">
                    Bölüm
                  </th>
                  {dates.map((date) => (
                    <th
                      className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-medium text-zinc-500"
                      key={date}
                      title={formatDate(date)}
                    >
                      {formatDay(date)}
                    </th>
                  ))}
                  <th className="border-b border-zinc-200 px-3 py-2 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {BOLUMLER.map((bolum) => (
                  <tr key={bolum}>
                    <th className="sticky left-0 z-10 border-b border-zinc-100 bg-white px-3 py-2 text-right font-semibold">
                      {getDepartmentLabel(bolum)}
                    </th>
                    {dates.map((date) => {
                      const cell = values.get(`${bolum}|||${date}`);
                      return (
                        <td
                          className="border border-white px-1 py-1 text-center"
                          key={date}
                        >
                          {cell?.hasRecord ? (
                            <span
                              className={`block rounded-sm px-2 py-2 ${getCellTone(cell.value)}`}
                            >
                              {formatNumber(cell.value)}
                            </span>
                          ) : (
                            <span className="block rounded-sm border border-dashed border-zinc-200 px-2 py-2 text-xs font-medium text-zinc-400">
                              VY
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-zinc-100 px-3 py-2 text-right text-base font-bold">
                      {formatNumber(totals.get(bolum) ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
