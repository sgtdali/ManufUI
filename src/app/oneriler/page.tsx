import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, CheckCircle2, Circle, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BOLUMLER } from "@/lib/types";
import { CompleteSuggestionForm } from "./CompleteSuggestionForm";

type OnerilerSearchParams = {
  bolum?: string | string[];
  durum?: string | string[];
};

type SuggestionRecord = {
  id: string;
  bolum: string;
  onerisi: string;
  created_at: string;
  completed_at: string | null;
  completion_note: string | null;
  updated_at: string | null;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildFilterHref(bolum: string, durum: string) {
  const params = new URLSearchParams();
  if (bolum) params.set("bolum", bolum);
  if (durum) params.set("durum", durum);
  const query = params.toString();
  return query ? `/oneriler?${query}` : "/oneriler";
}

export const metadata = {
  title: "Öneriler | Üretim Takip Sistemi",
};

export default async function OnerilerPage({
  searchParams,
}: {
  searchParams?: Promise<OnerilerSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedBolum = getStringParam(params.bolum);
  const selectedDurum = getStringParam(params.durum);

  const cookieStore = await cookies();
  const isReadOnly = cookieStore.get("password_auth")?.value === "password_ncms";

  const supabase = await createClient();
  let query = supabase
    .from("manuf_suggestions")
    .select("id, bolum, onerisi, created_at, completed_at, completion_note, updated_at");

  if (selectedBolum) {
    query = query.eq("bolum", selectedBolum);
  }

  if (selectedDurum === "acik") {
    query = query.is("completed_at", null);
  }

  if (selectedDurum === "tamamlandi") {
    query = query.not("completed_at", "is", null);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  const suggestions = (data ?? []) as SuggestionRecord[];
  const openCount = suggestions.filter((item) => !item.completed_at).length;
  const completedCount = suggestions.length - openCount;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              {suggestions.length} öneri
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Öneriler
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
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
          <form action="/oneriler" className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="bolum">
                Hücre
              </label>
              <select
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                defaultValue={selectedBolum}
                id="bolum"
                name="bolum"
              >
                <option value="">Tüm hücreler</option>
                {BOLUMLER.map((bolum) => (
                  <option key={bolum} value={bolum}>
                    {bolum}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="durum">
                Durum
              </label>
              <select
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                defaultValue={selectedDurum}
                id="durum"
                name="durum"
              >
                <option value="">Tümü</option>
                <option value="acik">Açık</option>
                <option value="tamamlandi">Tamamlandı</option>
              </select>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 self-end rounded-md border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
              type="submit"
            >
              <Filter className="size-4" />
              Filtrele
            </button>
            <Link
              className="self-end rounded-md border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
              href="/oneriler"
            >
              Tüm öneriler
            </Link>
          </form>
        </section>

        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Veri okunamadı: {error.message}
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Toplam" value={suggestions.length.toString()} />
          <MetricCard label="Açık" value={openCount.toString()} />
          <MetricCard label="Tamamlandı" value={completedCount.toString()} />
        </section>

        <section className="space-y-3">
          {suggestions.map((suggestion) => {
            const isCompleted = Boolean(suggestion.completed_at);
            return (
              <article
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
                key={suggestion.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        {suggestion.bolum}
                      </span>
                      <StatusBadge isCompleted={isCompleted} />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                      {suggestion.onerisi}
                    </p>
                    <p className="mt-3 text-xs text-zinc-500">
                      Oluşturulma: {formatDateTime(suggestion.created_at)}
                    </p>
                  </div>

                  {!isCompleted && !isReadOnly ? (
                    <CompleteSuggestionForm suggestionId={suggestion.id} />
                  ) : null}
                </div>

                {isCompleted ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-medium text-emerald-900">
                      Tamamlanma açıklaması
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                      {suggestion.completion_note || "-"}
                    </p>
                    {suggestion.completed_at ? (
                      <p className="mt-2 text-xs text-emerald-800">
                        Tamamlandı: {formatDateTime(suggestion.completed_at)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}

          {suggestions.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
              Gösterilecek öneri yok.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function StatusBadge({ isCompleted }: { isCompleted: boolean }) {
  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="size-3.5" />
        Tamamlandı
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
      <Circle className="size-3.5" />
      Açık
    </span>
  );
}
