"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Search, Download, Plus, Trash2, Filter, Calendar, Table, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  loadPersonnelTracking,
  createPersonnelRecord,
  updatePersonnelRecord,
  deletePersonnelRecord,
  loadAssignees,
  type PersonnelRecord,
  type Assignee,
} from "./actions";

export default function PersonnelTrackingPage() {
  const [records, setRecords] = useState<PersonnelRecord[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  // View mode & Calendar state
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 6)); // July 2026
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Sort state
  const [sortConfig, setSortConfig] = useState<{
    key: "arrival_date" | "return_date" | null;
    direction: "asc" | "desc" | null;
  }>({ key: null, direction: null });

  // New Record state
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newArrivalDate, setNewArrivalDate] = useState("");
  const [newReturnDate, setNewReturnDate] = useState("");

  // Load records
  const fetchRecords = async () => {
    setLoading(true);
    const [recordsRes, assigneesRes] = await Promise.all([
      loadPersonnelTracking(),
      loadAssignees(),
    ]);

    if (recordsRes.success) {
      setRecords(recordsRes.data);
    } else {
      toast.error("Veriler yüklenemedi: " + recordsRes.error);
    }

    if (assigneesRes.success) {
      setAssignees(assigneesRes.data);
    } else {
      toast.error("Personel listesi yüklenemedi: " + assigneesRes.error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Compute locations list & counts from the current records
  const locationStats = useMemo(() => {
    const stats: Record<string, number> = {};
    records.forEach((r) => {
      if (r.location) {
        stats[r.location] = (stats[r.location] || 0) + 1;
      }
    });
    return stats;
  }, [records]);

  const uniqueLocations = useMemo(() => {
    return Object.keys(locationStats).sort((a, b) => a.localeCompare(b, "tr-TR"));
  }, [locationStats]);

  // Sort toggle handler
  const handleSort = (key: "arrival_date" | "return_date") => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { key, direction: "desc" };
      }
      return { key: null, direction: null };
    });
  };

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    const data = records.filter((r) => {
      const matchesSearch =
        r.name.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR")) ||
        r.location.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR"));
      const matchesLocation = !selectedLocation || r.location === selectedLocation;
      return matchesSearch && matchesLocation;
    });

    if (sortConfig.key && sortConfig.direction) {
      const { key, direction } = sortConfig;
      data.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];

        // NULL values go to the bottom of the table
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;

        if (valA < valB) return direction === "asc" ? -1 : 1;
        if (valA > valB) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [records, searchQuery, selectedLocation, sortConfig]);

  // Calendar logic
  const monthNames = useMemo(() => [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ], []);

  const daysOfWeek = useMemo(() => ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"], []);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const emptyDaysBefore = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  }, [year, month]);

  const getPersonnelForDay = (dayNum: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    
    return filteredRecords.filter((r) => {
      const arr = r.arrival_date;
      const ret = r.return_date;
      
      if (arr && ret) {
        return arr <= dateStr && dateStr <= ret;
      }
      if (arr) {
        return arr === dateStr;
      }
      if (ret) {
        return ret === dateStr;
      }
      return false;
    });
  };

  // Create record handler
  const handleCreate = () => {
    const name = newName.trim();
    const location = newLocation.trim();
    const arrival = newArrivalDate;
    const returnDate = newReturnDate;

    if (!name || !location) {
      toast.warning("Lütfen isim ve konaklama alanlarını doldurun.");
      return;
    }

    if (arrival && returnDate && new Date(returnDate) < new Date(arrival)) {
      toast.warning("Dönüş tarihi geliş tarihinden önce olamaz.");
      return;
    }

    startTransition(async () => {
      const res = await createPersonnelRecord({
        name,
        location,
        arrival_date: arrival || null,
        return_date: returnDate || null,
      });

      if (res.success) {
        toast.success("Kayıt başarıyla eklendi.");
        setRecords((prev) => [res.data, ...prev]);
        setNewName("");
        setNewLocation("");
        setNewArrivalDate("");
        setNewReturnDate("");
      } else {
        toast.error("Ekleme hatası: " + res.error);
      }
    });
  };

  // Update record handler (on blur or input changes)
  const handleUpdateField = (id: string, field: keyof Omit<PersonnelRecord, "id" | "created_at" | "updated_at">, val: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    if (record[field] === val) return; // No change

    // Basic date validation
    if (field === "arrival_date" && val && record.return_date && new Date(record.return_date) < new Date(val)) {
      toast.warning("Geliş tarihi dönüş tarihinden sonra olamaz.");
      fetchRecords(); // reset view
      return;
    }
    if (field === "return_date" && val && record.arrival_date && new Date(val) < new Date(record.arrival_date)) {
      toast.warning("Dönüş tarihi geliş tarihinden önce olamaz.");
      fetchRecords(); // reset view
      return;
    }

    startTransition(async () => {
      const res = await updatePersonnelRecord(id, { [field]: val });
      if (res.success) {
        setRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...res.data } : r))
        );
        toast.success("Kayıt güncellendi.");
      } else {
        toast.error("Güncelleme hatası: " + res.error);
        fetchRecords(); // reset view on error
      }
    });
  };

  // Delete record handler
  const handleDelete = (id: string) => {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;

    startTransition(async () => {
      const res = await deletePersonnelRecord(id);
      if (res.success) {
        toast.success("Kayıt silindi.");
        setRecords((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error("Silme hatası: " + res.error);
      }
    });
  };

  // Export to Excel handler
  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) {
      toast.error("Dışa aktarılacak kayıt yok.");
      return;
    }

    startTransition(async () => {
      try {
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        wb.creator = "ManufUI";
        wb.created = new Date();

        const ws = wb.addWorksheet("Personel Takip");
        ws.columns = [
          { header: "İsim", key: "name", width: 25 },
          { header: "Konaklama", key: "location", width: 25 },
          { header: "Geliş Tarihi", key: "arrival_date", width: 15 },
          { header: "Dönüş Tarihi", key: "return_date", width: 15 },
        ];

        // Header styles (terracotta theme)
        const headerRow = ws.getRow(1);
        headerRow.height = 32;
        headerRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97753" } };
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" },
          };
        });

        // Add records
        filteredRecords.forEach((r) => {
          ws.addRow({
            name: r.name,
            location: r.location,
            arrival_date: r.arrival_date,
            return_date: r.return_date,
          });
        });

        // Zebra lines & styling
        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const bgColor = rowNumber % 2 === 0 ? "FFF8F8F6" : "FFFFFFFF";
          row.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
            cell.alignment = { vertical: "middle" };
            cell.border = {
              top: { style: "hair" }, bottom: { style: "hair" },
              left: { style: "hair" }, right: { style: "hair" },
            };
          });
        });

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `personel-takip-${new Date().toISOString().split("T")[0]}.xlsx`;
        link.click();
        toast.success("Excel başarıyla indirildi.");
      } catch (err) {
        toast.error("Excel dışa aktarma sırasında bir hata oluştu.");
      }
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedLocation("");
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Lora:ital,wght@0,400..700;1,400..700&display=swap');
        
        .claude-theme {
          background-color: #F8F8F6 !important;
          color: #191919 !important;
          font-family: "Anthropic Serif", "Newsreader", "Lora", Georgia, serif !important;
        }
        
        /* Font size overrides (+2px) */
        .claude-theme .text-3xl { font-size: 32px !important; }
        .claude-theme .text-2xl { font-size: 26px !important; }
        .claude-theme .text-xl { font-size: 22px !important; }
        .claude-theme .text-lg { font-size: 20px !important; }
        .claude-theme .text-base { font-size: 18px !important; }
        .claude-theme .text-sm { font-size: 16px !important; }
        .claude-theme .text-xs { font-size: 14px !important; }
        
        .claude-theme,
        .claude-theme main,
        .claude-theme .bg-zinc-900 {
          background-color: #F8F8F6 !important;
        }
        
        .claude-theme aside > div,
        .claude-theme section.bg-zinc-800\\/60,
        .claude-theme select,
        .claude-theme .bg-zinc-700 {
          background-color: #EFEEEB !important;
        }
        
        .claude-theme table,
        .claude-theme tbody,
        .claude-theme tr,
        .claude-theme td,
        .claude-theme .bg-zinc-800,
        .claude-theme input {
          background-color: #FFFFFF !important;
        }
        
        .claude-theme thead,
        .claude-theme thead tr,
        .claude-theme thead th {
          background-color: #EFEEEB !important;
          color: #191919 !important;
        }
        
        .claude-theme * {
          border-color: #E2E1DC !important;
        }
        
        .claude-theme .text-zinc-100,
        .claude-theme .text-zinc-200,
        .claude-theme .text-zinc-300,
        .claude-theme .text-white,
        .claude-theme h1,
        .claude-theme h2 {
          color: #191919 !important;
        }
        
        .claude-theme .text-zinc-400,
        .claude-theme .text-zinc-500,
        .claude-theme .text-zinc-650,
        .claude-theme p.text-zinc-400,
        .claude-theme span.text-zinc-500 {
          color: #6B6964 !important;
        }
        
        .claude-theme input,
        .claude-theme select {
          background-color: #FFFFFF !important;
          color: #191919 !important;
          border: 1px solid #D1D0C9 !important;
        }
        
        .claude-theme input::placeholder {
          color: #9C9A94 !important;
        }
        
        .claude-theme input:focus,
        .claude-theme select:focus {
          border-color: #D97753 !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(217, 119, 83, 0.2) !important;
        }
        
        .claude-theme .bg-emerald-600 {
          background-color: #D97753 !important;
          color: #FFFFFF !important;
        }
        .claude-theme .bg-emerald-600:hover {
          background-color: #C06543 !important;
        }
        
        .claude-theme .text-emerald-400,
        .claude-theme .text-emerald-300 {
          color: #C25E3B !important;
        }
        .claude-theme .bg-emerald-500\\/10 {
          background-color: rgba(217, 119, 83, 0.12) !important;
        }
        
        .claude-theme tr:hover {
          background-color: rgba(239, 238, 235, 0.7) !important;
        }

        .claude-theme .hover\\:bg-zinc-700:hover {
          background-color: #EFEEEB !important;
        }

        .claude-theme .claude-calendar-cell {
          background-color: #FFFFFF !important;
          border-color: #E2E1DC !important;
          color: #191919 !important;
        }
        .claude-theme .claude-calendar-cell:hover {
          background-color: #F1F0EA !important;
        }
        .claude-theme .claude-calendar-cell-selected {
          background-color: rgba(217, 119, 83, 0.12) !important;
          border-color: #D97753 !important;
          color: #C25E3B !important;
        }

        /* Matrix Scheduler Cell Highlights (Dark Mode & Base) */
        .cell-arrival-ncms {
          background-color: #f97316 !important; /* orange-500 */
          color: #ffffff !important;
          font-weight: bold;
        }
        .cell-arrival-dis {
          background-color: #2563eb !important; /* blue-600 */
          color: #ffffff !important;
          font-weight: bold;
        }
        .cell-return-ncms {
          background-color: #ea580c !important; /* orange-600 */
          color: #ffffff !important;
          font-weight: bold;
        }
        .cell-return-dis {
          background-color: #1d4ed8 !important; /* blue-700 */
          color: #ffffff !important;
          font-weight: bold;
        }
        .cell-staying-ncms {
          background-color: rgba(249, 115, 22, 0.15) !important;
        }
        .cell-staying-dis {
          background-color: rgba(37, 99, 235, 0.15) !important;
        }

        /* Matrix Scheduler Cell Highlights (Claude Light Theme) */
        .claude-theme .cell-arrival-ncms {
          background-color: #D97753 !important; /* terracotta */
          color: #ffffff !important;
        }
        .claude-theme .cell-arrival-dis {
          background-color: #3B82F6 !important; /* blue */
          color: #ffffff !important;
        }
        .claude-theme .cell-return-ncms {
          background-color: #C06543 !important; /* darker terracotta */
          color: #ffffff !important;
        }
        .claude-theme .cell-return-dis {
          background-color: #2563EB !important; /* darker blue */
          color: #ffffff !important;
        }
        .claude-theme .cell-staying-ncms {
          background-color: rgba(217, 119, 83, 0.12) !important;
        }
        .claude-theme .cell-staying-dis {
          background-color: rgba(59, 130, 246, 0.12) !important;
        }

        .sticky-col-name {
          position: sticky !important;
          left: 0 !important;
          background-color: #18181b !important;
          z-index: 10 !important;
          box-shadow: 2px 0 5px -2px rgba(0, 0, 0, 0.4);
        }
        .sticky-col-loc {
          position: sticky !important;
          left: 160px !important;
          background-color: #18181b !important;
          z-index: 10 !important;
          box-shadow: 2px 0 5px -2px rgba(0, 0, 0, 0.4);
        }
        
        .claude-theme .sticky-col-name {
          background-color: #FFFFFF !important;
          box-shadow: 2px 0 5px -2px rgba(0, 0, 0, 0.1) !important;
        }
        .claude-theme .sticky-col-loc {
          background-color: #FFFFFF !important;
          box-shadow: 2px 0 5px -2px rgba(0, 0, 0, 0.1) !important;
        }
        
        .claude-table-input {
          background-color: transparent !important;
          border: 1px solid transparent !important;
          outline: none !important;
          width: 100%;
          padding: 6px 10px;
          border-radius: 4px;
          transition: all 0.2s;
          color: #191919 !important;
        }
        .claude-table-input:hover {
          background-color: #F1F0EA !important;
          border-color: #D1D0C9 !important;
        }
        .claude-table-input:focus {
          background-color: #FFFFFF !important;
          border-color: #D97753 !important;
          box-shadow: 0 0 0 2px rgba(217, 119, 83, 0.2) !important;
        }
        
        .claude-theme *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .claude-theme *::-webkit-scrollbar-track {
          background: #F8F8F6;
        }
        .claude-theme *::-webkit-scrollbar-thumb {
          background-color: #D0CFC9;
          border-radius: 4px;
        }
        .claude-theme *::-webkit-scrollbar-thumb:hover {
          background-color: #B2B1AA;
        }
      ` }} />
      <main className="min-h-screen bg-zinc-900 px-4 py-4 text-zinc-100 md:px-8 flex flex-col gap-4 claude-theme">
        <header className="flex flex-col gap-2 border-b border-zinc-700 pb-4 md:flex-row md:items-end md:justify-between w-full">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Repkon Personnel</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Personel Geliş Gidiş Takip</h1>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="inline-flex rounded-md shadow-sm border border-zinc-700 bg-zinc-800/80 p-0.5 mr-2">
              <button
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${
                  viewMode === "table"
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-200 hover:text-white"
                }`}
                onClick={() => setViewMode("table")}
              >
                <Table className="size-3.5" /> Tablo
              </button>
              <button
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${
                  viewMode === "calendar"
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-200 hover:text-white"
                }`}
                onClick={() => setViewMode("calendar")}
              >
                <Calendar className="size-3.5" /> Takvim
              </button>
            </div>
            <Link className="inline-flex items-center gap-2 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition" href="/">
              <ArrowLeft className="size-4" /> Forma dön
            </Link>
          </div>
        </header>

        <div className="grid w-full gap-4 xl:grid-cols-[280px_minmax(0,1fr)] flex-1">
          {/* Sidebar */}
          <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Konaklama Yerleri
                  </p>
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Konaklama Filtresi
                  </h2>
                </div>
                <Filter className="size-4 text-zinc-500" />
              </div>

              <button
                className={`mb-2 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                  selectedLocation === ""
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-200 hover:bg-zinc-700"
                }`}
                onClick={() => setSelectedLocation("")}
              >
                <span>Tüm konaklama yerleri</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    selectedLocation === ""
                      ? "bg-white/20 text-white"
                      : "bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {records.length}
                </span>
              </button>

              <div className="max-h-[calc(100vh-200px)] space-y-1 overflow-y-auto pr-1">
                {uniqueLocations.map((loc) => {
                  const isSelected = selectedLocation === loc;
                  return (
                    <button
                      key={loc}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-emerald-500/10 font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/30"
                          : "text-zinc-200 hover:bg-zinc-700"
                      }`}
                      onClick={() => setSelectedLocation(loc)}
                    >
                      <span className="truncate">{loc}</span>
                      <span
                        className={`ml-2 rounded px-2 py-0.5 text-xs ${
                          isSelected
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {locationStats[loc] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Action List Table / Form Area */}
          <div className="flex min-w-0 flex-col gap-4">
            {/* Filter Bar */}
            <section className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Ara</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      className="h-9 w-full rounded-md border border-zinc-600 bg-zinc-700/60 pl-8 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15"
                      placeholder="İsim veya konaklama yerinde ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  className="h-9 rounded-md border border-zinc-600 bg-zinc-700/60 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
                  onClick={handleClearFilters}
                >
                  Temizle
                </button>
                <button
                  className="h-9 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500 transition"
                  onClick={handleExportExcel}
                  title="Excel olarak dışa aktar"
                >
                  <Download className="size-4" /> Dışa Aktar
                </button>
              </div>
            </section>

            {/* Table View */}
            {viewMode === "table" && (
              <section className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] rounded-xl border border-zinc-700 bg-zinc-800/60 shadow-sm">
                {loading ? (
                  <div className="p-8 text-center text-sm font-medium text-zinc-400">Yükleniyor...</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-zinc-800">
                      <tr className="border-b border-zinc-700 bg-zinc-800 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 select-none">
                        <th className="px-4 py-3">İsim</th>
                        <th className="px-4 py-3">Konaklama</th>
                        <th 
                          className="px-4 py-3 cursor-pointer hover:bg-zinc-700/10 hover:text-zinc-200 select-none transition-colors"
                          onClick={() => handleSort("arrival_date")}
                          title="Geliş Tarihine göre sırala (Artan / Azalan / Varsayılan)"
                        >
                          <div className="flex items-center gap-1">
                            <span>Geliş Tarihi</span>
                            {sortConfig.key === "arrival_date" ? (
                              sortConfig.direction === "asc" ? <ArrowUp className="size-3.5 text-emerald-500" /> : <ArrowDown className="size-3.5 text-emerald-500" />
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 cursor-pointer hover:bg-zinc-700/10 hover:text-zinc-200 select-none transition-colors"
                          onClick={() => handleSort("return_date")}
                          title="Dönüş Tarihine göre sırala (Artan / Azalan / Varsayılan)"
                        >
                          <div className="flex items-center gap-1">
                            <span>Dönüş Tarihi</span>
                            {sortConfig.key === "return_date" ? (
                              sortConfig.direction === "asc" ? <ArrowUp className="size-3.5 text-emerald-500" /> : <ArrowDown className="size-3.5 text-emerald-500" />
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th className="w-24 px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {/* Existing Records */}
                      {filteredRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-3 py-2">
                            <select
                              className="claude-table-input font-medium"
                              value={r.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRecords((prev) =>
                                  prev.map((item) => (item.id === r.id ? { ...item, name: val } : item))
                                );
                                handleUpdateField(r.id, "name", val);
                              }}
                            >
                              {!assignees.some((a) => a.name === r.name) && r.name && (
                                <option value={r.name}>{r.name}</option>
                              )}
                              {assignees.map((a) => (
                                <option key={a.id} value={a.name}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="claude-table-input"
                              value={r.location}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRecords((prev) =>
                                  prev.map((item) => (item.id === r.id ? { ...item, location: val } : item))
                                );
                                handleUpdateField(r.id, "location", val);
                              }}
                            >
                              {!["NCMS Otel", "Dış Otel"].includes(r.location) && r.location && (
                                <option value={r.location}>{r.location}</option>
                              )}
                              <option value="NCMS Otel">NCMS Otel</option>
                              <option value="Dış Otel">Dış Otel</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              className="claude-table-input"
                              value={r.arrival_date || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRecords((prev) =>
                                  prev.map((item) => (item.id === r.id ? { ...item, arrival_date: val } : item))
                                );
                              }}
                              onBlur={(e) => handleUpdateField(r.id, "arrival_date", e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              className="claude-table-input"
                              value={r.return_date || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRecords((prev) =>
                                  prev.map((item) => (item.id === r.id ? { ...item, return_date: val } : item))
                                );
                              }}
                              onBlur={(e) => handleUpdateField(r.id, "return_date", e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="rounded p-1.5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                              title="Kaydı sil"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Inline Create Row */}
                      <tr className="bg-zinc-800/10">
                        <td className="px-3 py-3">
                          <select
                            className="h-9 w-full rounded-md border border-zinc-600 bg-zinc-700/60 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                          >
                            <option value="">Seçiniz...</option>
                            {assignees.map((a) => (
                              <option key={a.id} value={a.name}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            className="h-9 w-full rounded-md border border-zinc-600 bg-zinc-700/60 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15"
                            value={newLocation}
                            onChange={(e) => setNewLocation(e.target.value)}
                          >
                            <option value="">Seçiniz...</option>
                            <option value="NCMS Otel">NCMS Otel</option>
                            <option value="Dış Otel">Dış Otel</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="date"
                            className="h-9 w-full rounded-md border border-zinc-600 bg-zinc-700/60 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15"
                            value={newArrivalDate}
                            onChange={(e) => setNewArrivalDate(e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="date"
                            className="h-9 w-full rounded-md border border-zinc-600 bg-zinc-700/60 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15"
                            value={newReturnDate}
                            onChange={(e) => setNewReturnDate(e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={handleCreate}
                            disabled={isPending}
                            className="inline-flex items-center justify-center rounded-md bg-emerald-600 p-2 text-white hover:bg-emerald-500 transition disabled:opacity-50"
                            title="Yeni kayıt ekle"
                          >
                            <Plus className="size-5" />
                          </button>
                        </td>
                      </tr>

                      {filteredRecords.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-sm font-medium text-zinc-400">
                            Kayıt bulunamadı. Yeni bir kayıt eklemek için alttaki satırı kullanabilirsiniz.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {/* Calendar View */}
            {viewMode === "calendar" && (
              <div className="flex flex-col gap-3">
                <section className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 shadow-sm">
                  {/* Calendar Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">NCMS & Dış Otel Planlama</p>
                      <h2 className="text-lg font-semibold text-zinc-100">
                        {monthNames[month]} {year}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePrevMonth}
                        className="rounded border border-zinc-600 bg-zinc-800/80 p-1.5 hover:bg-zinc-750 hover:text-white transition"
                        title="Önceki Ay"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        onClick={handleNextMonth}
                        className="rounded border border-zinc-600 bg-zinc-800/80 p-1.5 hover:bg-zinc-750 hover:text-white transition"
                        title="Sonraki Ay"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Matrix Container */}
                  <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] rounded-lg border border-zinc-700/80">
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 z-20">
                        <tr className="border-b border-zinc-700 text-left bg-zinc-800 select-none">
                          <th className="px-4 py-3 sticky-col-name text-zinc-300 font-semibold w-40 min-w-[160px]">Personel</th>
                          <th className="px-4 py-3 sticky-col-loc text-zinc-300 font-semibold w-30 min-w-[120px]">Konaklama</th>
                          {Array.from({ length: daysInMonth }).map((_, idx) => (
                            <th 
                              key={`th-day-${idx + 1}`} 
                              className="border-l border-zinc-700/40 py-3 text-center text-zinc-400 font-semibold w-10 min-w-[40px] bg-zinc-850"
                            >
                              {idx + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-700/40">
                        {filteredRecords.map((r) => (
                          <tr key={`matrix-row-${r.id}`} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-zinc-200 sticky-col-name truncate">{r.name}</td>
                            <td className="px-4 py-2.5 text-zinc-400 sticky-col-loc truncate">{r.location}</td>
                            {Array.from({ length: daysInMonth }).map((_, idx) => {
                              const dayNumber = idx + 1;
                              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
                              const isArrival = r.arrival_date === dateStr;
                              const isReturn = r.return_date === dateStr;
                              
                              // Color between arrival and return dates, supporting cases where one boundary is NULL
                              const isStaying = (() => {
                                const arr = r.arrival_date;
                                const ret = r.return_date;
                                if (arr && ret) return arr <= dateStr && dateStr <= ret;
                                if (arr) return dateStr >= arr;
                                if (ret) return dateStr <= ret;
                                return false;
                              })();

                              let cellClass = "border-l border-zinc-700/30 text-center select-none w-10 min-w-[40px] h-9 p-0 font-medium";
                              let cellText = "";

                              if (isArrival) {
                                cellText = "Geliş";
                                cellClass += r.location === "Dış Otel" 
                                  ? " bg-blue-600 text-white font-bold text-[9px] cell-arrival-dis" 
                                  : " bg-orange-500 text-white font-bold text-[9px] cell-arrival-ncms";
                              } else if (isReturn) {
                                cellText = "x";
                                cellClass += r.location === "Dış Otel" 
                                  ? " bg-blue-650 text-white font-bold text-xs cell-return-dis" 
                                  : " bg-orange-600 text-white font-bold text-xs cell-return-ncms";
                              } else if (isStaying) {
                                cellClass += r.location === "Dış Otel" 
                                  ? " bg-blue-500/15 cell-staying-dis" 
                                  : " bg-orange-500/15 cell-staying-ncms";
                              }

                              return (
                                <td 
                                  key={`day-${dayNumber}`} 
                                  className={cellClass}
                                  title={`${r.name} - ${dayNumber} ${monthNames[month]} (${r.location})`}
                                >
                                  {cellText}
                                </td>
                              );
                            })}
                          </tr>
                        ))}

                        {filteredRecords.length === 0 && (
                          <tr>
                            <td colSpan={2 + daysInMonth} className="p-8 text-center text-sm font-medium text-zinc-500">
                              Kayıt bulunamadı. Filtreleri temizlemeyi deneyin.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 items-center text-[10px] mt-4 bg-zinc-800/20 p-2.5 rounded-lg border border-zinc-700/50">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center font-bold text-[9px] w-10 h-4.5 rounded bg-orange-500 text-white">Geliş</span>
                      <span className="text-zinc-400">NCMS Geliş</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center font-bold text-[9px] w-10 h-4.5 rounded bg-blue-600 text-white">Geliş</span>
                      <span className="text-zinc-400">Dış Otel Geliş</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center font-bold w-5 h-4.5 rounded bg-orange-600 text-white">x</span>
                      <span className="text-zinc-400">NCMS Dönüş</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center font-bold w-5 h-4.5 rounded bg-blue-650 text-white">x</span>
                      <span className="text-zinc-400">Dış Otel Dönüş</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-3 rounded bg-orange-500/15 border border-orange-500/30"></span>
                      <span className="text-zinc-400">NCMS Süre</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-3 rounded bg-blue-500/15 border border-blue-500/30"></span>
                      <span className="text-zinc-400">Dış Otel Süre</span>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
