import Link from "next/link";
import { ArrowLeft, RotateCcw, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BOLUMLER, DURUS_KOLONLARI, type ProductionRow } from "@/lib/types";

type DurusAnalizSearchParams = {
  bolum?: string | string[];
  baslangic?: string | string[];
  bitis?: string | string[];
  neden?: string | string[];
};

type DbRecord = {
  id: string;
  bolum: string;
  sorumlu: string | null;
  tarih: string;
  manuf_production_rows: ProductionRow[] | null;
};

type DurusDetail = {
  id: string;
  tarih: string;
  zamanDilimi: string;
  durusKey: keyof ProductionRow;
  durusTipi: string;
  altTur: string;
  dakika: number;
  aciklama: string;
  hasAciklama: boolean;
  reasonKey: string;
};

type ParetoItem = {
  reasonKey: string;
  durusTipi: string;
  altTur: string;
  dakika: number;
  adet: number;
  pay: number;
  kumulatifPay: number;
};

const ACIKLAMA_KEYS: Partial<Record<keyof ProductionRow, keyof ProductionRow>> = {
  ariza: "ariza_aciklama",
  planli_durus: "planli_durus_aciklama",
  setup_ve_ayar: "setup_aciklama",
  musteri_kaynakli_durus: "musteri_durus_aciklama",
  calisan_makine_sayisi: "calisan_makine_aciklama",
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getDateParam(value: string | string[] | undefined) {
  const rawValue = getStringParam(value);
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

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function buildReasonKey(durusKey: keyof ProductionRow, altTur: string) {
  return `${String(durusKey)}|||${altTur}`;
}

function buildSearchHref({
  bolum,
  startDate,
  endDate,
  reasonKey,
}: {
  bolum: string;
  startDate: string;
  endDate: string;
  reasonKey?: string;
}) {
  const params = new URLSearchParams({
    bolum,
    baslangic: startDate,
    bitis: endDate,
  });

  if (reasonKey) {
    params.set("neden", reasonKey);
  }

  return `/durus-analiz?${params.toString()}`;
}

function buildDurusDetails(records: DbRecord[]) {
  const details: DurusDetail[] = [];

  for (const record of records) {
    for (const row of record.manuf_production_rows ?? []) {
      for (const column of DURUS_KOLONLARI) {
        const dakika = numberValue(row[column.key]);
        if (dakika <= 0) continue;

        const altTur = column.altTurKey
          ? textValue(row[column.altTurKey]) || "Alt tür seçilmemiş"
          : "Alt tür yok";
        const aciklamaKey = ACIKLAMA_KEYS[column.key];
        const aciklama = aciklamaKey ? textValue(row[aciklamaKey]) : "";

        details.push({
          id: `${record.id}-${row.id ?? row.sira_no}-${String(column.key)}`,
          tarih: record.tarih,
          zamanDilimi: row.zaman_dilimi,
          durusKey: column.key,
          durusTipi: column.label,
          altTur,
          dakika,
          aciklama,
          hasAciklama: aciklama.length > 0,
          reasonKey: buildReasonKey(column.key, altTur),
        });
      }
    }
  }

  return details.sort((a, b) => {
    if (a.tarih !== b.tarih) return b.tarih.localeCompare(a.tarih);
    return b.dakika - a.dakika;
  });
}

function buildPareto(details: DurusDetail[]) {
  const totalMinutes = details.reduce((total, detail) => total + detail.dakika, 0);
  const grouped = new Map<string, Omit<ParetoItem, "pay" | "kumulatifPay">>();

  for (const detail of details) {
    const current = grouped.get(detail.reasonKey) ?? {
      reasonKey: detail.reasonKey,
      durusTipi: detail.durusTipi,
      altTur: detail.altTur,
      dakika: 0,
      adet: 0,
    };
    current.dakika += detail.dakika;
    current.adet += 1;
    grouped.set(detail.reasonKey, current);
  }

  let cumulative = 0;
  return Array.from(grouped.values())
    .sort((a, b) => b.dakika - a.dakika)
    .map((item) => {
      cumulative += item.dakika;
      return {
        ...item,
        pay: percent(item.dakika, totalMinutes),
        kumulatifPay: percent(cumulative, totalMinutes),
      };
    });
}

export const metadata = {
  title: "Duruş Analiz | Üretim Takip Sistemi",
};

export default async function DurusAnalizPage({
  searchParams,
}: {
  searchParams?: Promise<DurusAnalizSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const activeBolumler = BOLUMLER.filter(
    (bolum) => !bolum.toLocaleLowerCase("tr-TR").includes("preform")
  );
  const defaultRange = getDefaultRange();
  const requestedBolum = getStringParam(params.bolum);
  const selectedBolum = activeBolumler.includes(requestedBolum as (typeof activeBolumler)[number])
    ? requestedBolum
    : activeBolumler[0];
  const startDate = getDateParam(params.baslangic) || defaultRange.startDate;
  const endDate = getDateParam(params.bitis) || defaultRange.endDate;
  const invalidRange = startDate > endDate;

  const supabase = await createClient();
  let query = supabase
    .from("manuf_production_records")
    .select("id, bolum, sorumlu, tarih, manuf_production_rows(*)")
    .eq("bolum", selectedBolum);

  if (!invalidRange) {
    query = query.gte("tarih", startDate).lte("tarih", endDate);
  }

  const { data, error } = invalidRange
    ? { data: [], error: null }
    : await query.order("tarih", { ascending: false });

  const records = (data ?? []) as DbRecord[];
  const details = buildDurusDetails(records);
  const pareto = buildPareto(details);
  const selectedReasonKey = getStringParam(params.neden) || pareto[0]?.reasonKey || "";
  const selectedPareto = pareto.find((item) => item.reasonKey === selectedReasonKey) ?? pareto[0];
  const selectedDetails = selectedPareto
    ? details.filter((detail) => detail.reasonKey === selectedPareto.reasonKey)
    : [];
  const totalMinutes = details.reduce((total, detail) => total + detail.dakika, 0);
  const totalCount = details.length;
  const missingExplanationCount = details.filter((detail) => !detail.hasAciklama).length;
  const maxParetoMinutes = Math.max(...pareto.map((item) => item.dakika), 1);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-rose-700">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Duruş analiz
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
              href="/dashboard"
            >
              <ArrowLeft className="size-4" />
              Dashboard
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
              href="/"
            >
              <ArrowLeft className="size-4" />
              Forma dön
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <form
            action="/durus-analiz"
            className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto_auto]"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="bolum">
                Hücre
              </label>
              <select
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-rose-600 focus:ring-3 focus:ring-rose-600/20"
                defaultValue={selectedBolum}
                id="bolum"
                name="bolum"
              >
                {activeBolumler.map((bolum) => (
                  <option key={bolum} value={bolum}>
                    {bolum}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="baslangic">
                Başlangıç tarihi
              </label>
              <input
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-rose-600 focus:ring-3 focus:ring-rose-600/20"
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
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-rose-600 focus:ring-3 focus:ring-rose-600/20"
                defaultValue={endDate}
                id="bitis"
                name="bitis"
                type="date"
              />
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 self-end rounded-md border border-rose-700 bg-rose-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-800"
              type="submit"
            >
              <Search className="size-4" />
              Analiz et
            </button>
            <Link
              className="inline-flex items-center justify-center gap-2 self-end rounded-md border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
              href="/durus-analiz"
            >
              <RotateCcw className="size-4" />
              Sıfırla
            </Link>
          </form>
        </section>

        {invalidRange ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Başlangıç tarihi bitiş tarihinden sonra olamaz.
          </section>
        ) : null}

        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Veri okunamadı: {error.message}
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Seçili hücre"
            value={selectedBolum.replace(" Hücresi", "")}
            note={`${records.length} gün kaydı`}
          />
          <MetricCard
            label="Toplam duruş"
            value={`${formatNumber(totalMinutes)} dk`}
            note={`${formatNumber(totalCount)} duruş satırı`}
          />
          <MetricCard
            label="En büyük neden"
            value={selectedPareto ? `${selectedPareto.durusTipi} / ${selectedPareto.altTur}` : "-"}
            note={selectedPareto ? `${formatNumber(selectedPareto.dakika)} dk` : "Kayıt yok"}
          />
          <MetricCard
            label="Açıklamasız"
            value={formatNumber(missingExplanationCount)}
            note="Açıklama alanı olmayan duruşlar"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Duruş Pareto</h2>
              </div>
              <span className="rounded-md bg-rose-100 px-3 py-1 text-xs font-medium text-rose-900">
                {pareto.length} neden
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
                    <th className="py-2 pr-3 font-medium">Neden</th>
                    <th className="px-3 py-2 text-right font-medium">Süre</th>
                    <th className="px-3 py-2 text-right font-medium">Adet</th>
                    <th className="px-3 py-2 text-right font-medium">Pay</th>
                    <th className="py-2 pl-3 font-medium">Pareto</th>
                  </tr>
                </thead>
                <tbody>
                  {pareto.map((item) => {
                    const isSelected = item.reasonKey === selectedPareto?.reasonKey;
                    return (
                      <tr
                        className={`border-b border-zinc-100 last:border-0 ${
                          isSelected ? "bg-rose-50" : ""
                        }`}
                        key={item.reasonKey}
                      >
                        <td className="py-3 pr-3">
                          <Link
                            className="block rounded-md px-2 py-1 font-medium text-zinc-900 hover:bg-rose-100"
                            href={buildSearchHref({
                              bolum: selectedBolum,
                              startDate,
                              endDate,
                              reasonKey: item.reasonKey,
                            })}
                          >
                            {item.durusTipi} / {item.altTur}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {formatNumber(item.dakika)} dk
                        </td>
                        <td className="px-3 py-3 text-right text-zinc-600">
                          {formatNumber(item.adet)}
                        </td>
                        <td className="px-3 py-3 text-right text-zinc-600">%{item.pay}</td>
                        <td className="py-3 pl-3">
                          <div className="h-2 min-w-32 rounded-md bg-zinc-100">
                            <div
                              className="h-2 rounded-md bg-rose-600"
                              style={{
                                width: `${Math.max(percent(item.dakika, maxParetoMinutes), 4)}%`,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pareto.length === 0 ? (
              <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
                Seçili hücre ve tarih aralığı için duruş kaydı bulunmuyor.
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Seçili neden kayıtları</h2>
              <p className="text-sm text-zinc-500">
                {selectedPareto
                  ? `${selectedPareto.durusTipi} / ${selectedPareto.altTur}`
                  : "Pareto satırı seçilmedi"}
              </p>
            </div>

            <div className="max-h-[620px] overflow-y-auto pr-1">
              <div className="space-y-3">
                {selectedDetails.map((detail) => (
                  <article
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                    key={detail.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">{formatDate(detail.tarih)}</p>
                        <p className="text-sm text-zinc-500">{detail.zamanDilimi}</p>
                      </div>
                      <span className="rounded-md bg-white px-2 py-1 text-sm font-semibold text-rose-700 ring-1 ring-zinc-200">
                        {formatNumber(detail.dakika)} dk
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-700">
                      {detail.hasAciklama ? detail.aciklama : "Açıklama yok"}
                    </p>
                    {!detail.hasAciklama ? (
                      <span className="mt-2 inline-flex rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
                        Açıklama eksik
                      </span>
                    ) : null}
                  </article>
                ))}
              </div>

              {selectedDetails.length === 0 ? (
                <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
                  Gösterilecek kayıt yok.
                </p>
              ) : null}
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
      <p className="mt-2 line-clamp-2 text-2xl font-semibold text-zinc-950">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{note}</p>
    </div>
  );
}
