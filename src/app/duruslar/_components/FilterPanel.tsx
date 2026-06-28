"use client";

import { BOLUMLER } from "@/lib/types";
import { DURUS_TIP_OPTIONS } from "./helpers";

type Props = {
  startDate: string;
  endDate: string;
  bolumFilter: string;
  durusFilter: string;
  searchQuery: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onBolumFilterChange: (val: string) => void;
  onDurusFilterChange: (val: string) => void;
  onSearchQueryChange: (val: string) => void;
  onClearFilters: () => void;
};

export function FilterPanel({
  startDate, endDate, bolumFilter, durusFilter, searchQuery,
  onStartDateChange, onEndDateChange, onBolumFilterChange, onDurusFilterChange, onSearchQueryChange,
  onClearFilters,
}: Props) {
  const hasActiveFilters = startDate !== "2026-06-13" || endDate || bolumFilter !== "all" || durusFilter !== "all" || searchQuery;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-4">Filtreleme Seçenekleri</h2>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600" htmlFor="start-date">Başlangıç Tarihi</label>
          <input id="start-date" type="date" className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600" htmlFor="end-date">Bitiş Tarihi</label>
          <input id="end-date" type="date" className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600" htmlFor="durus-tipi">Duruş Kategorisi</label>
          <select id="durus-tipi" className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" value={durusFilter} onChange={(e) => onDurusFilterChange(e.target.value)}>
            {DURUS_TIP_OPTIONS(durusFilter)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600" htmlFor="bolum">Hücre / Bölüm</label>
          <select id="bolum" className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" value={bolumFilter} onChange={(e) => onBolumFilterChange(e.target.value)}>
            <option value="all">Tüm Hücreler</option>
            {BOLUMLER.map((b) => (<option key={b} value={b}>{b}</option>))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2 md:col-span-1">
          <label className="text-xs font-semibold text-zinc-600" htmlFor="search">Kelime Arama (Açıklama, Alt Tür, Sorumlu)</label>
          <div className="relative">
            <input id="search" type="text" placeholder="Ara..." className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" value={searchQuery} onChange={(e) => onSearchQueryChange(e.target.value)} />
            {searchQuery && (
              <button onClick={() => onSearchQueryChange("")} className="absolute right-2.5 top-1.5 text-zinc-400 hover:text-zinc-600 text-sm font-bold">×</button>
            )}
          </div>
        </div>
      </div>
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button onClick={onClearFilters} className="text-xs font-bold text-zinc-500 hover:text-zinc-800 transition">Filtreleri Temizle</button>
        </div>
      )}
    </section>
  );
}
