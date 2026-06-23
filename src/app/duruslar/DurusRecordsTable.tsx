"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BOLUMLER } from "@/lib/types";
import { type DurusDetail, type ActiveDay } from "./page";

type Props = {
  details: DurusDetail[];
  activeDays: ActiveDay[];
};

const DURUS_TIPLERI = [
  { key: "all", label: "Tüm Duruşlar" },
  { key: "ariza", label: "Arıza" },
  { key: "planli_durus", label: "Planlı Duruş" },
  { key: "setup_ve_ayar", label: "Setup ve Ayar / Hazırlık" },
  { key: "musteri_kaynakli_durus", label: "Müşteri Kaynaklı Duruş" },
  { key: "takim_degisimi", label: "Takım Değişimi / Rejim" },
  { key: "kalip_demontaj", label: "Kalıp Demontaj" },
  { key: "kalip_montaj", label: "Kalıp Montaj" },
  { key: "onceki_istasyon_bekleme", label: "Bir Önceki İstasyon Bekleme" },
  { key: "kalite_kaynakli_durus", label: "Kalite Kaynaklı Duruş" },
  { key: "mola", label: "Mola" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function DurusRecordsTable({ details, activeDays }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  // State for filters
  const [startDate, setStartDate] = useState("2026-06-13");
  const [endDate, setEndDate] = useState("");
  const [bolumFilter, setBolumFilter] = useState("all");
  const [durusFilter, setDurusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Sorting state
  const [sortBy, setSortBy] = useState<"tarih" | "dakika">("tarih");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Reset page when filters change
  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  // Filtered details
  const filteredDetails = useMemo(() => {
    return details.filter((item) => {
      // Date filter
      if (startDate && item.tarih < startDate) return false;
      if (endDate && item.tarih > endDate) return false;

      // Cell filter
      if (bolumFilter !== "all" && item.bolum !== bolumFilter) return false;

      // Downtime type filter
      if (durusFilter !== "all" && item.durusTipiKey !== durusFilter) return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const inAciklama = item.aciklama.toLowerCase().includes(query);
        const inAltTur = item.altTur.toLowerCase().includes(query);
        const inSorumlu = item.sorumlu.toLowerCase().includes(query);
        if (!inAciklama && !inAltTur && !inSorumlu) return false;
      }

      return true;
    });
  }, [details, startDate, endDate, bolumFilter, durusFilter, searchQuery]);

  // Sorted details
  const sortedDetails = useMemo(() => {
    const sorted = [...filteredDetails];
    sorted.sort((a, b) => {
      if (sortBy === "tarih") {
        const comp = a.tarih.localeCompare(b.tarih);
        return sortOrder === "asc" ? comp : -comp;
      } else {
        const comp = a.dakika - b.dakika;
        return sortOrder === "asc" ? comp : -comp;
      }
    });
    return sorted;
  }, [filteredDetails, sortBy, sortOrder]);

  // Paginated details
  const paginatedDetails = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedDetails.slice(startIndex, startIndex + pageSize);
  }, [sortedDetails, currentPage]);

  const totalPages = Math.ceil(sortedDetails.length / pageSize);

  // Metrics
  const totalMinutes = useMemo(() => {
    return filteredDetails.reduce((sum, item) => sum + item.dakika, 0);
  }, [filteredDetails]);

  const maxMinutes = useMemo(() => {
    return filteredDetails.length > 0 ? Math.max(...filteredDetails.map((item) => item.dakika)) : 0;
  }, [filteredDetails]);

  const totalDaysInRange = useMemo(() => {
    let startStr = startDate;
    if (!startStr && filteredDetails.length > 0) {
      const dates = filteredDetails.map((d) => d.tarih);
      startStr = dates.reduce((min, d) => (d < min ? d : min), dates[0]);
    }

    let endStr = endDate;
    if (!endStr && filteredDetails.length > 0) {
      const dates = filteredDetails.map((d) => d.tarih);
      endStr = dates.reduce((max, d) => (d > max ? d : max), dates[0]);
    }

    if (!startStr || !endStr) return 0;

    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);

    if (start > end) return 0;

    let workingDaysCount = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        workingDaysCount++;
      } else {
        // Cuma veya Cumartesi ise:
        // Eğer o gün o hücre için (veya tüm hücreler için) bir kayıt/giriş varsa hesaba kat
        const hasWeekendWork = bolumFilter === "all"
          ? activeDays.some((ad) => ad.tarih === dateKey)
          : activeDays.some((ad) => ad.tarih === dateKey && ad.bolum === bolumFilter);
        
        if (hasWeekendWork) {
          workingDaysCount++;
        }
      }
      current.setDate(current.getDate() + 1);
    }
    return workingDaysCount;
  }, [filteredDetails, startDate, endDate, bolumFilter, activeDays]);

  const dailyAverageMinutes = useMemo(() => {
    if (totalDaysInRange === 0) return 0;
    return Math.round(totalMinutes / totalDaysInRange);
  }, [totalMinutes, totalDaysInRange]);

  // Summarize helpers
  const byType = useMemo(() => {
    const map = new Map<string, { label: string; count: number; minutes: number }>();
    for (const item of filteredDetails) {
      const label = item.durusTipiLabel;
      const current = map.get(label) ?? { label, count: 0, minutes: 0 };
      current.count += 1;
      current.minutes += item.dakika;
      map.set(label, current);
    }
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  }, [filteredDetails]);

  const bySubtype = useMemo(() => {
    const map = new Map<string, { label: string; count: number; minutes: number }>();
    for (const item of filteredDetails) {
      if (item.altTur === "-") continue;
      const label = item.altTur;
      const current = map.get(label) ?? { label, count: 0, minutes: 0 };
      current.count += 1;
      current.minutes += item.dakika;
      map.set(label, current);
    }
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  }, [filteredDetails]);

  const byDepartment = useMemo(() => {
    const map = new Map<string, { label: string; count: number; minutes: number }>();
    for (const item of filteredDetails) {
      const label = item.bolum.replace(" Hücresi", "");
      const current = map.get(label) ?? { label, count: 0, minutes: 0 };
      current.count += 1;
      current.minutes += item.dakika;
      map.set(label, current);
    }
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  }, [filteredDetails]);

  const maxTypeMinutes = useMemo(() => Math.max(...byType.map((i) => i.minutes), 1), [byType]);
  const maxSubtypeMinutes = useMemo(() => Math.max(...bySubtype.map((i) => i.minutes), 1), [bySubtype]);
  const maxDepartmentMinutes = useMemo(() => Math.max(...byDepartment.map((i) => i.minutes), 1), [byDepartment]);

  const handleExportExcel = async () => {
    if (sortedDetails.length === 0) return;
    setIsExporting(true);
    try {
      const ExcelJS = await import("exceljs");
      const Workbook = ExcelJS.Workbook || ExcelJS.default?.Workbook;
      if (!Workbook) throw new Error("ExcelJS has no Workbook constructor");
      
      const wb = new Workbook();
      wb.creator = "ManufUI";
      wb.created = new Date();

      const ws = wb.addWorksheet("Duruş Kayıtları");

      const columns = [
        { header: "Tarih", key: "tarih", width: 14 },
        { header: "Bölüm", key: "bolum", width: 22 },
        { header: "Sorumlu", key: "sorumlu", width: 20 },
        { header: "Zaman Dilimi", key: "zamanDilimi", width: 16 },
        { header: "Duruş Tipi", key: "durusTipi", width: 22 },
        { header: "Alt Tür", key: "altTur", width: 22 },
        { header: "Süre (dk)", key: "dakika", width: 12 },
        { header: "Açıklama / Operatör Notu", key: "aciklama", width: 45 },
        { header: "Arıza Durumu", key: "arizaDurumu", width: 16 },
        { header: "Çözüm Açıklaması", key: "arizaGiderilmeAciklama", width: 40 },
      ];

      ws.columns = columns;

      // Header row styling
      const headerRow = ws.getRow(1);
      headerRow.height = 32;
      columns.forEach((_, colIdx) => {
        const cell = headerRow.getCell(colIdx + 1);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF065F46" }, // Emerald 800
        };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Data rows
      let rowIndex = 2;
      for (const item of sortedDetails) {
        const dataRow = ws.addRow({
          tarih: formatDate(item.tarih),
          bolum: item.bolum.replace(" Hücresi", ""),
          sorumlu: item.sorumlu,
          zamanDilimi: item.zamanDilimi,
          durusTipi: item.durusTipiLabel,
          altTur: item.altTur,
          dakika: item.dakika,
          aciklama: item.aciklama,
          arizaDurumu: item.durusTipiKey === "ariza" ? (item.arizaGiderildi ? "Giderildi" : "Açık") : "",
          arizaGiderilmeAciklama: item.durusTipiKey === "ariza" && item.arizaGiderildi ? item.arizaGiderilmeAciklama ?? "" : "",
        });

        // Alternating row colors: light emerald/white
        const bgColor = rowIndex % 2 === 0 ? "FFF0FDF4" : "FFFFFFFF";
        columns.forEach((_, colIdx) => {
          const cell = dataRow.getCell(colIdx + 1);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          cell.alignment = {
            vertical: "middle",
            horizontal: colIdx === 6 ? "right" : "left",
            wrapText: colIdx === 7 || colIdx === 9,
          };
          cell.border = {
            top: { style: "hair" },
            bottom: { style: "hair" },
            left: { style: "hair" },
            right: { style: "hair" },
          };
          if (colIdx === 6) {
            cell.numFmt = '#,##0" dk"';
          }
        });
        rowIndex++;
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `durus_kayitlari_${now}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel dışa aktarma hatası:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSort = (field: "tarih" | "dakika") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">
            Duruş Takip ve Analiz
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={isExporting || sortedDetails.length === 0}
            className="rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 hover:border-emerald-400 disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {isExporting ? "Dışa Aktarılıyor..." : "Excel Çıktısı"}
          </button>
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
      {/* Filters Form */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-4">
          Filtreleme Seçenekleri
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600" htmlFor="start-date">
              Başlangıç Tarihi
            </label>
            <input
              id="start-date"
              type="date"
              className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              value={startDate}
              onChange={(e) => handleFilterChange(setStartDate, e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600" htmlFor="end-date">
              Bitiş Tarihi
            </label>
            <input
              id="end-date"
              type="date"
              className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              value={endDate}
              onChange={(e) => handleFilterChange(setEndDate, e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600" htmlFor="durus-tipi">
              Duruş Kategorisi
            </label>
            <select
              id="durus-tipi"
              className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              value={durusFilter}
              onChange={(e) => handleFilterChange(setDurusFilter, e.target.value)}
            >
              {DURUS_TIP_OPTIONS(durusFilter)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600" htmlFor="bolum">
              Hücre / Bölüm
            </label>
            <select
              id="bolum"
              className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              value={bolumFilter}
              onChange={(e) => handleFilterChange(setBolumFilter, e.target.value)}
            >
              <option value="all">Tüm Hücreler</option>
              {BOLUMLER.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2 md:col-span-1">
            <label className="text-xs font-semibold text-zinc-600" htmlFor="search">
              Kelime Arama (Açıklama, Alt Tür, Sorumlu)
            </label>
            <div className="relative">
              <input
                id="search"
                type="text"
                placeholder="Ara..."
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => handleFilterChange(setSearchQuery, "")}
                  className="absolute right-2.5 top-1.5 text-zinc-400 hover:text-zinc-600 text-sm font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clear Filters button */}
        {(startDate !== "2026-06-13" || endDate || bolumFilter !== "all" || durusFilter !== "all" || searchQuery) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setStartDate("2026-06-13");
                setEndDate("");
                setBolumFilter("all");
                setDurusFilter("all");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-800 transition"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </section>

      {/* Metrics Grid */}
      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Filtrelenmiş Süre" value={`${formatNumber(totalMinutes)} dk`} note={`${formatNumber(filteredDetails.length)} kayıt bulundu`} />
        <MetricCard label="Günlük Ortalama" value={`${formatNumber(dailyAverageMinutes)} dk`} note="Cuma-Cmt hariç (giriş yapılanlar dahil)" />
      </section>

      {/* Breakdowns Grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        <SummaryPanel title="Duruş Tipleri Dağılımı" items={byType} maxMinutes={maxTypeMinutes} barColor="bg-zinc-800" />
        <SummaryPanel title="Alt Tür / Neden Dağılımı" items={bySubtype} maxMinutes={maxSubtypeMinutes} barColor="bg-amber-500" />
        <SummaryPanel title="Hücre Kırılımı" items={byDepartment} maxMinutes={maxDepartmentMinutes} barColor="bg-teal-600" />
      </section>

      {/* Details Table */}
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800">
            Duruş Kayıtları Detayı
          </h2>
          <span className="text-xs font-semibold text-zinc-500">
            Toplam {formatNumber(sortedDetails.length)} kayıttan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedDetails.length)} arası gösteriliyor
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold cursor-pointer select-none hover:text-zinc-800 transition" onClick={() => handleSort("tarih")}>
                  Tarih {sortBy === "tarih" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="px-4 py-3 font-semibold">Bölüm</th>
                <th className="px-4 py-3 font-semibold">Zaman</th>
                <th className="px-4 py-3 font-semibold">Duruş Tipi</th>
                <th className="px-4 py-3 font-semibold">Alt Tür</th>
                <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-zinc-800 transition text-right" onClick={() => handleSort("dakika")}>
                  Süre (dk) {sortBy === "dakika" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="px-5 py-3 font-semibold">Açıklama / Operatör Notu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedDetails.map((detail) => (
                <tr key={detail.id} className="hover:bg-zinc-50/50 transition">
                  <td className="px-5 py-3 font-medium text-zinc-900 whitespace-nowrap">
                    {formatDate(detail.tarih)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-700 whitespace-nowrap">
                    {detail.bolum.replace(" Hücresi", "")}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                    {detail.zamanDilimi}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 border border-zinc-200">
                        {detail.durusTipiLabel}
                      </span>
                      {detail.durusTipiKey === "ariza" && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          detail.arizaGiderildi
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}>
                          {detail.arizaGiderildi ? "Giderildi" : "Açık"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 whitespace-nowrap font-medium">
                    {detail.altTur}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-zinc-900 whitespace-nowrap">
                    {detail.dakika} dk
                  </td>
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
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-500 font-medium bg-zinc-50/20">
                    Filtrelere uygun duruş kaydı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition"
            >
              Önceki
            </button>
            <span className="text-xs font-semibold text-zinc-600">
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition"
            >
              Sonraki
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function DURUS_TIP_OPTIONS(selected: string) {
  return DURUS_TIPLERI.map((t) => (
    <option key={t.key} value={t.key}>
      {t.label}
    </option>
  ));
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
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-extrabold text-zinc-950 tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-zinc-500 font-medium">{note}</p>
    </div>
  );
}

function SummaryPanel({
  title,
  items,
  maxMinutes,
  barColor,
}: {
  title: string;
  items: { label: string; count: number; minutes: number }[];
  maxMinutes: number;
  barColor: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-4">{title}</h3>
      <div className="space-y-4 flex-1">
        {items.map((item) => {
          const ratio = Math.max(Math.round((item.minutes / maxMinutes) * 100), 3);
          return (
            <div key={item.label} className="group">
              <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-zinc-700">
                <span className="truncate max-w-[160px]">{item.label}</span>
                <span className="text-zinc-500 whitespace-nowrap">
                  {formatNumber(item.minutes)} dk · {item.count} kez
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[120px] rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-xs font-medium text-zinc-500">
            Kayıt bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
