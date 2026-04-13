import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ArizaDetail, ProductionRow } from "@/lib/types";
import { ArizaRecordsTable } from "./ArizaRecordsTable";

type DbRecord = {
  id: string;
  bolum: string;
  sorumlu: string | null;
  tarih: string;
  updated_at: string | null;
  manuf_production_rows: ProductionRow[] | null;
};

type SummaryItem = {
  label: string;
  count: number;
  minutes: number;
};

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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

function buildArizaDetails(records: DbRecord[]) {
  return records
    .flatMap((record) =>
      (record.manuf_production_rows ?? [])
        .filter((row) => numberValue(row.ariza) > 0)
        .map((row) => ({
          id: row.id ?? `${record.id}-${row.sira_no}`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          dakika: numberValue(row.ariza),
          tur: row.ariza_turu ?? "Tür seçilmemiş",
          aciklama: row.ariza_aciklama?.trim() || "Açıklama girilmemiş",
          giderildi: row.ariza_giderildi ?? false,
          giderilmeAciklama: row.ariza_giderilme_aciklama ?? null,
          giderildiAt: row.ariza_giderildi_at ?? null,
        }))
    )
    .sort((a, b) => {
      if (a.tarih !== b.tarih) return b.tarih.localeCompare(a.tarih);
      return b.dakika - a.dakika;
    });
}

function summarize(
  details: ArizaDetail[],
  getLabel: (detail: ArizaDetail) => string
) {
  const map = new Map<string, SummaryItem>();

  for (const detail of details) {
    const label = getLabel(detail);
    const current = map.get(label) ?? { label, count: 0, minutes: 0 };
    current.count += 1;
    current.minutes += detail.dakika;
    map.set(label, current);
  }

  return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
}

export const metadata = {
  title: "Arıza Detay | Üretim Takip Sistemi",
};

export default async function ArizaPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("id, bolum, sorumlu, tarih, updated_at, manuf_production_rows(*)")
    .order("tarih", { ascending: false })
    .order("bolum", { ascending: true });

  const records = (data ?? []) as DbRecord[];
  const details = buildArizaDetails(records);
  const totalMinutes = details.reduce((total, detail) => total + detail.dakika, 0);
  const averageMinutes =
    details.length > 0 ? Math.round(totalMinutes / details.length) : 0;
  const maxDetailMinutes = Math.max(...details.map((detail) => detail.dakika), 0);
  const byType = summarize(details, (detail) => detail.tur);
  const byDepartment = summarize(details, (detail) => detail.bolum);
  const maxTypeMinutes = Math.max(...byType.map((item) => item.minutes), 1);
  const maxDepartmentMinutes = Math.max(
    ...byDepartment.map((item) => item.minutes),
    1
  );
  const latestDate = details[0]?.tarih ?? null;
  const latestDetails = latestDate
    ? details.filter((detail) => detail.tarih === latestDate)
    : [];

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-rose-700">
              {latestDate ? `Son arıza kaydı: ${formatDate(latestDate)}` : "Arıza kaydı yok"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              Arıza detay
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Arıza sürelerini tür, bölüm, tarih ve açıklama seviyesinde inceleyin.
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

        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Veri okunamadı: {error.message}
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Toplam arıza" value={`${formatNumber(totalMinutes)} dk`} note={`${details.length} kayıt`} />
          <MetricCard label="Ortalama süre" value={`${formatNumber(averageMinutes)} dk`} note="Kayıt başına" />
          <MetricCard label="En uzun arıza" value={`${formatNumber(maxDetailMinutes)} dk`} note={details[0]?.bolum ?? "-"} />
          <MetricCard label="Son gün arızası" value={`${formatNumber(latestDetails.reduce((total, detail) => total + detail.dakika, 0))} dk`} note={latestDate ? formatDate(latestDate) : "-"} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <SummaryPanel
            title="Arıza türleri"
            note="Dakika toplamına göre"
            items={byType}
            maxMinutes={maxTypeMinutes}
            tone="rose"
          />
          <SummaryPanel
            title="Bölüm kırılımı"
            note="Arıza süresine göre"
            items={byDepartment}
            maxMinutes={maxDepartmentMinutes}
            tone="amber"
          />
        </section>

        <ArizaRecordsTable details={details} />
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

function SummaryPanel({
  title,
  note,
  items,
  maxMinutes,
  tone,
}: {
  title: string;
  note: string;
  items: SummaryItem[];
  maxMinutes: number;
  tone: "rose" | "amber";
}) {
  const barColor = tone === "rose" ? "bg-rose-600" : "bg-amber-500";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-zinc-500">{note}</p>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-zinc-800">{item.label}</span>
              <span className="text-zinc-500">
                {formatNumber(item.minutes)} dk · {item.count} kayıt
              </span>
            </div>
            <div className="h-2 rounded-md bg-zinc-100">
              <div
                className={`h-2 rounded-md ${barColor}`}
                style={{
                  width: `${Math.max(percent(item.minutes, maxMinutes), 4)}%`,
                }}
              />
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
            Özetlenecek arıza kaydı yok.
          </p>
        ) : null}
      </div>
    </div>
  );
}
