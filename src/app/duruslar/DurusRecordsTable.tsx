"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { type DurusDetail, type ActiveDay } from "./page";
import { formatNumber, formatDate } from "./_components/helpers";
import { MetricCard } from "./_components/MetricCard";
import { SummaryPanel } from "./_components/SummaryPanel";
import { FilterPanel } from "./_components/FilterPanel";
import { exportDurusExcel } from "./_components/exportExcel";

type Props = {
  details: DurusDetail[];
  activeDays: ActiveDay[];
};

export function DurusRecordsTable({ details, activeDays }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [startDate, setStartDate] = useState("2026-06-13");
  const [endDate, setEndDate] = useState("");
  const [bolumFilter, setBolumFilter] = useState("all");
  const [durusFilter, setDurusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [sortBy, setSortBy] = useState<"tarih" | "dakika">("tarih");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleFilterChange = (setter: (val: string) => void, val: string) => { setter(val); setCurrentPage(1); };

  const filteredDetails = useMemo(() => {
    return details.filter((item) => {
      if (startDate && item.tarih < startDate) return false;
      if (endDate && item.tarih > endDate) return false;
      if (bolumFilter !== "all" && item.bolum !== bolumFilter) return false;
      if (durusFilter !== "all" && item.durusTipiKey !== durusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!item.aciklama.toLowerCase().includes(query) && !item.altTur.toLowerCase().includes(query) && !item.sorumlu.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [details, startDate, endDate, bolumFilter, durusFilter, searchQuery]);

  const sortedDetails = useMemo(() => {
    const sorted = [...filteredDetails];
    sorted.sort((a, b) => {
      const comp = sortBy === "tarih" ? a.tarih.localeCompare(b.tarih) : a.dakika - b.dakika;
      return sortOrder === "asc" ? comp : -comp;
    });
    return sorted;
  }, [filteredDetails, sortBy, sortOrder]);

  const paginatedDetails = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedDetails.slice(startIndex, startIndex + pageSize);
  }, [sortedDetails, currentPage]);

  const totalPages = Math.ceil(sortedDetails.length / pageSize);
  const totalMinutes = useMemo(() => filteredDetails.reduce((sum, item) => sum + item.dakika, 0), [filteredDetails]);

  const totalDaysInRange = useMemo(() => {
    let startStr = startDate;
    if (!startStr && filteredDetails.length > 0) { const dates = filteredDetails.map((d) => d.tarih); startStr = dates.reduce((min, d) => (d < min ? d : min), dates[0]); }
    let endStr = endDate;
    if (!endStr && filteredDetails.length > 0) { const dates = filteredDetails.map((d) => d.tarih); endStr = dates.reduce((max, d) => (d > max ? d : max), dates[0]); }
    if (!startStr || !endStr) return 0;
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    if (start > end) return 0;
    let workingDaysCount = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      if (dayOfWeek !== 5 && dayOfWeek !== 6) { workingDaysCount++; }
      else if (bolumFilter === "all" ? activeDays.some((ad) => ad.tarih === dateKey) : activeDays.some((ad) => ad.tarih === dateKey && ad.bolum === bolumFilter)) { workingDaysCount++; }
      current.setDate(current.getDate() + 1);
    }
    return workingDaysCount;
  }, [filteredDetails, startDate, endDate, bolumFilter, activeDays]);

  const dailyAverageMinutes = useMemo(() => totalDaysInRange === 0 ? 0 : Math.round(totalMinutes / totalDaysInRange), [totalMinutes, totalDaysInRange]);

  const byType = useMemo(() => {
    const map = new Map<string, { label: string; count: number; minutes: number }>();
    for (const item of filteredDetails) { const c = map.get(item.durusTipiLabel) ?? { label: item.durusTipiLabel, count: 0, minutes: 0 }; c.count++; c.minutes += item.dakika; map.set(item.durusTipiLabel, c); }
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  }, [filteredDetails]);

  const bySubtype = useMemo(() => {
    const map = new Map<string, { label: string; count: number; minutes: number }>();
    for (const item of filteredDetails) { if (item.altTur === "-") continue; const c = map.get(item.altTur) ?? { label: item.altTur, count: 0, minutes: 0 }; c.count++; c.minutes += item.dakika; map.set(item.altTur, c); }
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  }, [filteredDetails]);

  const byDepartment = useMemo(() => {
    const map = new Map<string, { label: string; count: number; minutes: number }>();
    for (const item of filteredDetails) { const label = item.bolum.replace(" Hücresi", ""); const c = map.get(label) ?? { label, count: 0, minutes: 0 }; c.count++; c.minutes += item.dakika; map.set(label, c); }
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  }, [filteredDetails]);

  const maxTypeMinutes = useMemo(() => Math.max(...byType.map((i) => i.minutes), 1), [byType]);
  const maxSubtypeMinutes = useMemo(() => Math.max(...bySubtype.map((i) => i.minutes), 1), [bySubtype]);
  const maxDepartmentMinutes = useMemo(() => Math.max(...byDepartment.map((i) => i.minutes), 1), [byDepartment]);

  const handleExportExcel = async () => {
    if (sortedDetails.length === 0) return;
    setIsExporting(true);
    try { await exportDurusExcel(sortedDetails); } catch (err) { console.error("Excel dışa aktarma hatası:", err); } finally { setIsExporting(false); }
  };

  const handleSort = (field: "tarih" | "dakika") => {
    if (sortBy === field) { setSortOrder(sortOrder === "asc" ? "desc" : "asc"); } else { setSortBy(field); setSortOrder("desc"); }
    setCurrentPage(1);
  };

  const clearFilters = () => { setStartDate("2026-06-13"); setEndDate(""); setBolumFilter("all"); setDurusFilter("all"); setSearchQuery(""); setCurrentPage(1); };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-3xl font-semibold tracking-normal text-zinc-950">Duruş Takip ve Analiz</h1></div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportExcel} disabled={isExporting || sortedDetails.length === 0} className="rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 hover:border-emerald-400 disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {isExporting ? "Dışa Aktarılıyor..." : "Excel Çıktısı"}
          </button>
          <Link className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100" href="/dashboard">Dashboard</Link>
          <Link className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100" href="/">Forma dön</Link>
        </div>
      </header>

      <FilterPanel startDate={startDate} endDate={endDate} bolumFilter={bolumFilter} durusFilter={durusFilter} searchQuery={searchQuery}
        onStartDateChange={(v) => handleFilterChange(setStartDate, v)} onEndDateChange={(v) => handleFilterChange(setEndDate, v)}
        onBolumFilterChange={(v) => handleFilterChange(setBolumFilter, v)} onDurusFilterChange={(v) => handleFilterChange(setDurusFilter, v)}
        onSearchQueryChange={(v) => handleFilterChange(setSearchQuery, v)} onClearFilters={clearFilters} />

      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Filtrelenmiş Süre" value={`${formatNumber(totalMinutes)} dk`} note={`${formatNumber(filteredDetails.length)} kayıt bulundu`} />
        <MetricCard label="Günlük Ortalama" value={`${formatNumber(dailyAverageMinutes)} dk`} note="Cuma-Cmt hariç (giriş yapılanlar dahil)" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <SummaryPanel title="Duruş Tipleri Dağılımı" items={byType} maxMinutes={maxTypeMinutes} barColor="bg-zinc-800" />
        <SummaryPanel title="Alt Tür / Neden Dağılımı" items={bySubtype} maxMinutes={maxSubtypeMinutes} barColor="bg-amber-500" />
        <SummaryPanel title="Hücre Kırılımı" items={byDepartment} maxMinutes={maxDepartmentMinutes} barColor="bg-teal-600" />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800">Duruş Kayıtları Detayı</h2>
          <span className="text-xs font-semibold text-zinc-500">Toplam {formatNumber(sortedDetails.length)} kayıttan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedDetails.length)} arası gösteriliyor</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold cursor-pointer select-none hover:text-zinc-800 transition" onClick={() => handleSort("tarih")}>Tarih {sortBy === "tarih" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                <th className="px-4 py-3 font-semibold">Bölüm</th>
                <th className="px-4 py-3 font-semibold">Zaman</th>
                <th className="px-4 py-3 font-semibold">Duruş Tipi</th>
                <th className="px-4 py-3 font-semibold">Alt Tür</th>
                <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-zinc-800 transition text-right" onClick={() => handleSort("dakika")}>Süre (dk) {sortBy === "dakika" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                <th className="px-5 py-3 font-semibold">Açıklama / Operatör Notu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedDetails.map((detail) => (
                <tr key={detail.id} className="hover:bg-zinc-50/50 transition">
                  <td className="px-5 py-3 font-medium text-zinc-900 whitespace-nowrap">{formatDate(detail.tarih)}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-700 whitespace-nowrap">{detail.bolum.replace(" Hücresi", "")}</td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{detail.zamanDilimi}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 border border-zinc-200">{detail.durusTipiLabel}</span>
                      {detail.durusTipiKey === "ariza" && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${detail.arizaGiderildi ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
                          {detail.arizaGiderildi ? "Giderildi" : "Açık"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 whitespace-nowrap font-medium">{detail.altTur}</td>
                  <td className="px-4 py-3 text-right font-bold text-zinc-900 whitespace-nowrap">{detail.dakika} dk</td>
                  <td className="px-5 py-3 text-zinc-600 max-w-xs md:max-w-md lg:max-w-xl break-words">
                    <div className="flex flex-col gap-1">
                      <div>{detail.aciklama}</div>
                      {detail.durusTipiKey === "ariza" && detail.arizaGiderildi && detail.arizaGiderilmeAciklama && (
                        <div className="text-xs font-semibold text-emerald-700 flex items-start gap-1">
                          <span className="bg-emerald-50 px-1 py-0.5 rounded text-[10px] border border-emerald-100 whitespace-nowrap uppercase tracking-wider font-bold">Çözüm:</span>
                          <span>{detail.arizaGiderilmeAciklama}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedDetails.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-zinc-500 font-medium bg-zinc-50/20">Filtrelere uygun duruş kaydı bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 flex items-center justify-between">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition">Önceki</button>
            <span className="text-xs font-semibold text-zinc-600">Sayfa {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition">Sonraki</button>
          </div>
        )}
      </section>
    </div>
  );
}
