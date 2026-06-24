"use client";

import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { loadProductionSumByDateRange } from "../actions";
import { toast } from "sonner";

const DISPLAY_CELLS = [
  "Pres Hücresi",
  "ETM Hücresi",
  "ROB108 Hücresi",
  "Flowform Hücresi",
  "ROB104 Hücresi",
  "N602-N603 Hücresi",
  "ROB109 Hücresi",
  "Quench Hücresi",
  "ROB110-111 Hücresi",
  "Fosfat Hücresi",
  "Boya Hücresi",
];

const CELL_START_DATES: Record<string, string> = {
  "Pres Hücresi": "2026-06-14",
  "ROB108 Hücresi": "2026-06-15",
  "Flowform Hücresi": "2026-06-15",
  "ROB104 Hücresi": "2026-06-16",
  "N602-N603 Hücresi": "2026-06-16",
  "ROB109 Hücresi": "2026-06-17",
  "Quench Hücresi": "2026-06-17",
  "ROB110-111 Hücresi": "2026-06-18",
  "Fosfat Hücresi": "2026-06-18",
  "Boya Hücresi": "2026-06-21",
};

function getCellStartDate(cell: string): string {
  return CELL_START_DATES[cell] ?? "2026-06-14";
}

function getWeekdayDifference(startStr: string, endStr: string): number {
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    // 5 is Friday, 6 is Saturday. Weekdays are Sunday (0) to Thursday (4).
    if (day !== 5 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

import { 
  Calendar, 
  TrendingUp, 
  ArrowLeft, 
  RotateCw,
  LayoutDashboard,
  Share2
} from "lucide-react";

export default function DashboardyPage() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [startDate, setStartDate] = useState<string>("2026-06-13");
  const [endDate, setEndDate] = useState<string>("2026-07-09");

  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    const node = document.getElementById("performance-table-container");
    if (!node) {
      toast.error("Paylaşılacak tablo bulunamadı.");
      return;
    }

    setSharing(true);
    toast.info("Görüntü hazırlanıyor...");

    try {
      const { toBlob } = await import("html-to-image");
      
      const blob = await toBlob(node, {
        backgroundColor: "#fafafa",
        pixelRatio: 3,
        style: {
          margin: "0",
          padding: "24px",
          borderRadius: "0px",
        },
      });

      if (!blob) {
        throw new Error("Görüntü oluşturulamadı.");
      }

      const file = new File([blob], `HF901_Performans_Raporu_${startDate}_${endDate}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        toast.success("Paylaşım ekranı açıldı.");
      } else {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob
            })
          ]);
          toast.success("Görüntü panoya kopyalandı! WhatsApp'ta doğrudan yapıştırabilirsiniz (Ctrl+V).");
        } catch (clipErr) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `HF901_Performans_Raporu_${startDate}_${endDate}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("Görüntü indirildi, WhatsApp'tan gönderebilirsiniz.");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Paylaşım başarısız oldu: ${err.message || err}`);
    } finally {
      setSharing(false);
    }
  };

  const fetchData = (start: string, end: string) => {
    setLoading(true);
    startTransition(async () => {
      try {
        const res = await loadProductionSumByDateRange(start, end);
        if (res) {
          setData(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };
    const auth = getCookie('password_auth');
    setIsReadOnly(auth !== 'rmk_hf901');
  }, []);

  useEffect(() => {
    fetchData(startDate, endDate);
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quick Presets
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days === 0) {
      // This month
      start.setDate(1);
    } else {
      start.setDate(end.getDate() - days);
    }
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    setStartDate(startStr);
    setEndDate(endStr);
  };

  // Sum of all cells
  const EXCLUDED_FROM_PERCENTAGE = ["ROB110-111 Hücresi", "Fosfat Hücresi", "Boya Hücresi"];
  const percentageCells = DISPLAY_CELLS.filter((c) => !EXCLUDED_FROM_PERCENTAGE.includes(c));

  const totalProduction = percentageCells.reduce((sum, cell) => {
    const produced = cell === "N602-N603 Hücresi"
      ? (data["N602 Hücresi"] ?? 0) + (data["N603 Hücresi"] ?? 0)
      : (data[cell] ?? 0);
    return sum + produced;
  }, 0);
  const totalTarget = percentageCells.length * 2000;
  const overallPercentage = Math.min(Math.round((totalProduction / totalTarget) * 100), 100);

  const totalTargetedQty = percentageCells.reduce((sum, cell) => {
    const startDateStr = getCellStartDate(cell);
    const weekdayCount = getWeekdayDifference(startDateStr, todayStr);
    return sum + (weekdayCount * 100);
  }, 0);
  const targetPercentage = Math.min(Math.round((totalTargetedQty / totalTarget) * 100), 100);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 pb-16 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200/80 sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <>
                <Link 
                  href="/"
                  className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                  title="Form Sayfasına Dön"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="h-6 w-[1px] bg-zinc-200" />
              </>
            )}
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-indigo-600" />
              <h1 className="text-lg font-bold tracking-tight text-zinc-900">
                Detaylı Performans Paneli
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={sharing || loading}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-3.5 py-2 rounded-lg transition-all border border-indigo-700 disabled:border-indigo-500 flex items-center gap-1.5 shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-95 disabled:scale-100"
            >
              {sharing ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  Hazırlanıyor...
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  Raporu Paylaş
                </>
              )}
            </button>
            {!isReadOnly && (
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-3 py-2 rounded-lg hover:bg-zinc-100 transition-all border border-zinc-200 bg-zinc-50"
              >
                Standart OEE Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Date Range Picker Panel */}
        <section className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="text-base font-bold text-zinc-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-500" />
                Tarih Aralığı Seçimi
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Seçilen tarih aralığındaki gerçekleşen toplam üretim adetlerini görüntülersiniz.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Presets */}
              <button 
                onClick={() => setPreset(7)}
                className="text-xs px-3 py-1.5 font-medium rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 transition-all"
              >
                Son 7 Gün
              </button>
              <button 
                onClick={() => setPreset(30)}
                className="text-xs px-3 py-1.5 font-medium rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 transition-all"
              >
                Son 30 Gün
              </button>
              <button 
                onClick={() => setPreset(0)}
                className="text-xs px-3 py-1.5 font-medium rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 transition-all"
              >
                Bu Ay
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-zinc-600">Başlangıç:</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-zinc-600">Bitiş:</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              
              <button
                onClick={() => fetchData(startDate, endDate)}
                className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 active:scale-95 transition-all"
                title="Yenile"
              >
                <RotateCw className={`h-4 w-4 text-zinc-500 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Share Wrapper */}
        <div id="performance-table-container" className="space-y-8 p-4 -m-4 rounded-3xl bg-[#fafafa]">
          {/* Global Summary Card */}
          <section className="bg-[#18174f] text-white rounded-[24px] border border-[#232168] p-7 shadow-lg relative overflow-hidden">
            {/* Custom SVG Trendline Background */}
            <div className="absolute right-0 bottom-0 w-[55%] h-[85%] pointer-events-none select-none">
              <svg
                className="w-full h-full opacity-60"
                viewBox="0 0 300 150"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <path
                  d="M 20 120 L 120 50 L 195 105 L 290 15"
                  stroke="#2d2b7c"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 20 120 L 120 50 L 195 105 L 290 15"
                  stroke="#3d3ab2"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-70"
                />
              </svg>
            </div>
            
            <div className="relative z-10 flex flex-col gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#9caaf5] bg-[#201d6d]/60 px-3.5 py-1.5 rounded-full border border-[#3e3ab4]/70">
                  Genel İlerleme Durumu
                </span>
                <h2 className="text-4xl font-semibold mt-4 flex items-baseline">
                  <span className="font-serif text-white">% {overallPercentage}</span>
                  <span className="text-lg font-normal text-[#8d8ab7] ml-2 font-sans">
                    (%{targetPercentage})
                  </span>
                </h2>
              </div>

              <div className="w-full mt-2">
                <div className="h-5 w-full bg-[#11103c]/90 rounded-full overflow-hidden border border-[#2d2b70] p-[3px]">
                  <div 
                    className="h-full bg-[#1ada93] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Cells Rows Table */}
          <section className="relative bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm">
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-xs flex items-center justify-center z-10" />
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200/85 text-zinc-600 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Hücre Adı</th>
                  <th className="py-4 px-6 text-center">Toplam Üretim / Hedef</th>
                  <th className="py-4 px-6 text-center">Hedeflenen Miktar</th>
                  <th className="py-4 px-6">Performans (% / İlerleme)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {DISPLAY_CELLS.map((cell) => {
                  const produced = cell === "N602-N603 Hücresi"
                    ? (data["N602 Hücresi"] ?? 0) + (data["N603 Hücresi"] ?? 0)
                    : (data[cell] ?? 0);
                  const target = 2000;

                  const startDateStr = getCellStartDate(cell);
                  const weekdayCount = getWeekdayDifference(startDateStr, todayStr);
                  const targetedQty = weekdayCount * 100;

                  const percentage = Math.round((produced / target) * 100);
                  const isTargetAchieved = produced >= target;
                  
                  let progressColorClass = "from-red-500 to-rose-500";

                  if (isTargetAchieved) {
                    progressColorClass = "from-emerald-500 to-teal-500";
                  } else if (produced >= 1000) {
                    progressColorClass = "from-amber-500 to-orange-500";
                  }

                  const targetCell = cell === "N602-N603 Hücresi" ? "N602 Hücresi" : cell;
                  const linkUrl = `/?bolum=${encodeURIComponent(targetCell)}&tarih=${todayStr}`;

                  return (
                    <tr key={cell} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        {isReadOnly ? (
                          <span className="font-bold text-sm text-zinc-800 block">
                            {cell}
                          </span>
                        ) : (
                          <Link 
                            href={linkUrl}
                            className="font-bold text-sm text-zinc-800 hover:text-indigo-600 hover:underline transition-colors block"
                          >
                            {cell}
                          </Link>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-sm font-black text-zinc-800">{produced.toLocaleString("tr-TR")}</span>
                        <span className="text-xs text-zinc-400 font-medium ml-1">/ 2.000</span>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-sm text-[#0c0a09] bg-zinc-50/30">
                        {targetedQty.toLocaleString("tr-TR")}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4 max-w-md">
                          <span className="text-xs font-bold text-zinc-600 min-w-[36px]">{percentage}%</span>
                          <div className="h-2 flex-1 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/30 p-[1px]">
                            <div 
                              className={`h-full bg-gradient-to-r ${progressColorClass} rounded-full transition-all duration-500 ease-out`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
    </div>
  );
}
