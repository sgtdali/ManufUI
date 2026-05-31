"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Layers, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  loadAllCellActuals,
  loadCellParams,
  loadWipStock,
  calculateAndSaveWip,
  type CellParam,
} from "./actions";
import { WipStockItem, loadBottleneckData, type CellBottleneckStats } from "../actions";
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getDaysInRange,
  toDayKey,
  formatNumber,
} from "../utils";

import { SummaryBar } from "./_components/SummaryBar";
import { CellGrid } from "./_components/CellGrid";
import { DayDetailPanel } from "./_components/DayDetailPanel";
import { BottleneckPanel } from "./_components/BottleneckPanel";
import { type CellName } from "./constants";

const TRANSITIONS = [
  { source: "Pres Hücresi", target: "ETM Hücresi", label: "Pres → ETM" },
  { source: "ETM Hücresi", target: "ROB108 Hücresi", label: "ETM → ROB108" },
  { source: "ROB108 Hücresi", target: "Flowform Hücresi", label: "ROB108 → Flowform" },
  { source: "Flowform Hücresi", target: "ROB104 Hücresi", label: "Flowform → ROB104" },
  { source: "ROB104 Hücresi", target: "N602 Hücresi", label: "ROB104 → N602+N603" },
  { source: "N602 Hücresi", target: "ROB109 Hücresi", label: "N602+N603 → ROB109" },
  { source: "ROB109 Hücresi", target: "Quench Hücresi", label: "ROB109 → Quench" },
  { source: "Quench Hücresi", target: "ROB110-111 Hücresi", label: "Quench → ROB110-111" },
  { source: "ROB110-111 Hücresi", target: "Fosfat Hücresi", label: "ROB110-111 → Fosfat" },
  { source: "Fosfat Hücresi", target: "Boya Hücresi", label: "Fosfat → Boya" },
];

export default function ScheduleOverviewPage() {
  const today = new Date();

  // ── States ──────────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(getFirstDayOfMonth(today));
  const [endDate, setEndDate] = useState(getLastDayOfMonth(today));
  const [campaignTargetInput, setCampaignTargetInput] = useState("2000");

  // Data states
  const [actuals, setActuals] = useState<Record<string, Record<string, number>>>({});
  const [cellParams, setCellParams] = useState<Record<string, CellParam>>({});
  const [wipStock, setWipStock] = useState<WipStockItem[]>([]);
  const [bottleneckData, setBottleneckData] = useState<CellBottleneckStats[]>([]);
  const [isLoading, startTransition] = useTransition();

  // WIP calculation states
  const [wipError, setWipError] = useState<string | null>(null);
  const [isCalculatingWip, setIsCalculatingWip] = useState(false);

  // Detail panel states
  const [selectedCellName, setSelectedCellName] = useState<CellName | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedActualValue, setSelectedActualValue] = useState<number>(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // ── Parsed States ────────────────────────────────────────────────────────
  const campaignTarget = useMemo(() => {
    const parsed = parseInt(campaignTargetInput, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2000;
  }, [campaignTargetInput]);

  const daysInRange = useMemo(() => {
    return getDaysInRange(startDate, endDate);
  }, [startDate, endDate]);

  const todayKey = useMemo(() => {
    return toDayKey(today);
  }, []);

  const latestWipDate = useMemo(() => {
    if (wipStock.length === 0) return null;
    const dates = Array.from(new Set(wipStock.map((w) => w.tarih))).sort();
    const pastDates = dates.filter((d) => d <= todayKey);
    if (pastDates.length > 0) {
      return pastDates[pastDates.length - 1];
    }
    return dates[dates.length - 1];
  }, [wipStock, todayKey]);

  // ── Data Fetching ────────────────────────────────────────────────────────
  const fetchData = () => {
    startTransition(async () => {
      const [act, params, wip, bRes] = await Promise.all([
        loadAllCellActuals(startDate, endDate),
        loadCellParams(),
        loadWipStock(startDate, endDate),
        loadBottleneckData(startDate, endDate),
      ]);
      setActuals(act);
      setCellParams(params);
      setWipStock(wip);
      if (bRes.success) {
        setBottleneckData(bRes.data ?? []);
      }
    });
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCellClick = (cellName: CellName, date: Date, actualValue: number) => {
    setSelectedCellName(cellName);
    setSelectedDate(date);
    setSelectedDateKey(toDayKey(date));
    setSelectedActualValue(actualValue);
    setIsPanelOpen(true);
  };

  const handleCalculateWip = async () => {
    setWipError(null);
    setIsCalculatingWip(true);
    try {
      const res = await calculateAndSaveWip(startDate, endDate, actuals);
      if (res.success) {
        fetchData();
      } else {
        setWipError(res.error || "WIP hesabı başarısız oldu.");
      }
    } catch (err: any) {
      console.error("WIP calculation failed:", err);
      setWipError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setIsCalculatingWip(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-[1600px] w-full flex-col gap-6">
        
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-blue-700" />
              <p className="text-sm font-semibold text-blue-700">Üretim Hat Planlama</p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-zinc-900">
              Genel Hat Görünümü
            </h1>
            <p className="text-sm text-zinc-500 font-medium">
              12 üretim hücresinin günlük gerçekleşen üretimlerini, WIP stok seviyelerini ve maksimum kapasite durumlarını izleyin.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Link href="/schedule">
              <Button type="button" variant="outline" className="text-xs font-bold">
                Pres Detay
              </Button>
            </Link>
            <Link href="/schedule/etm">
              <Button type="button" variant="outline" className="text-xs font-bold">
                ETM Detay
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button type="button" variant="outline" className="text-xs font-bold">
                Dashboard
              </Button>
            </Link>
          </div>
        </header>

        {/* Configuration Bar */}
        <Card className="rounded-xl border border-zinc-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
              <div className="flex flex-col gap-1">
                <label htmlFor="start-date-input" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Başlangıç Tarihi
                </label>
                <input
                  id="start-date-input"
                  type="date"
                  className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="end-date-input" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Bitiş Tarihi
                </label>
                <input
                  id="end-date-input"
                  type="date"
                  className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="campaign-target-input" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Kampanya Hedefi (Boya)
                </label>
                <input
                  id="campaign-target-input"
                  type="number"
                  min="1"
                  className="text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 w-[140px]"
                  value={campaignTargetInput}
                  onChange={(e) => setCampaignTargetInput(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {wipError && (
                <span className="text-xs text-rose-600 font-semibold mr-2 animate-pulse">
                  Hata: {wipError}
                </span>
              )}
              {(isLoading || isCalculatingWip) && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold">
                  <RefreshCw className="size-3.5 animate-spin text-zinc-400" />
                  Yükleniyor...
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCalculateWip}
                disabled={isLoading || isCalculatingWip}
                className="text-blue-700 hover:text-blue-800 border-blue-200 hover:bg-blue-50 text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                {isCalculatingWip ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Calculator className="size-3.5" />
                )}
                WIP Hesapla
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchData}
                disabled={isLoading || isCalculatingWip}
                className="text-zinc-500 hover:text-zinc-800 text-xs font-semibold flex items-center gap-1"
              >
                {!(isLoading || isCalculatingWip) && <RefreshCw className="size-3.5" />}
                Yenile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Darboğaz Analizi Kartı */}
        <BottleneckPanel stats={bottleneckData} />

        {/* Summary KPIs */}
        <SummaryBar
          actuals={actuals}
          startDate={startDate}
          endDate={endDate}
          campaignTarget={campaignTarget}
        />

        {/* Hat WIP Özeti */}
        {latestWipDate ? (
          <Card className="rounded-xl border border-zinc-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                    <Layers className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-zinc-800">Hat WIP Özeti</h2>
                    <p className="text-[11px] text-zinc-500 font-medium">Hücreler arası stok durum göstergeleri</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Son Güncelleme:</span>
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-700 border border-zinc-200">
                    {latestWipDate.split("-").reverse().join(".")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {TRANSITIONS.map((t) => {
                  const match = wipStock.find(
                    (w) =>
                      w.tarih === latestWipDate &&
                      w.kaynak_hucresi === t.source &&
                      w.hedef_hucresi === t.target
                  );
                  const value =
                    match !== undefined
                      ? match.override_edildi && match.gercek_adet !== null
                        ? match.gercek_adet
                        : match.hesaplanan_adet
                      : null;

                  // Define status
                  let status: "starved" | "low" | "healthy" | "nodata" = "nodata";
                  if (value !== null) {
                    if (value === 0) status = "starved";
                    else if (value < 50) status = "low";
                    else status = "healthy";
                  }

                  // Styling based on status
                  let statusBg = "bg-zinc-50/50 border-zinc-150 text-zinc-800";
                  let badgeClass = "bg-zinc-100 text-zinc-600 border-zinc-200";
                  let statusText = "Veri Yok";
                  let valueColor = "text-zinc-400";

                  if (status === "starved") {
                    statusBg = "bg-rose-50/30 border-rose-100 hover:bg-rose-50/50";
                    badgeClass = "bg-rose-100 text-rose-700 border-rose-200";
                    statusText = "Kritik (Boş)";
                    valueColor = "text-rose-600 font-extrabold";
                  } else if (status === "low") {
                    statusBg = "bg-amber-50/30 border-amber-100 hover:bg-amber-50/50";
                    badgeClass = "bg-amber-100 text-amber-700 border-amber-250";
                    statusText = "Düşük Stok";
                    valueColor = "text-amber-600 font-bold";
                  } else if (status === "healthy") {
                    statusBg = "bg-emerald-50/20 border-emerald-100 hover:bg-emerald-50/40";
                    badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                    statusText = "Yeterli";
                    valueColor = "text-emerald-600 font-bold";
                  }

                  return (
                    <div
                      key={t.label}
                      className={`flex flex-col justify-between p-3 rounded-lg border transition-all ${statusBg}`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate" title={t.label}>
                          {t.label}
                        </p>
                        <p className={`text-lg leading-tight ${valueColor}`}>
                          {value !== null ? formatNumber(value) : "—"}
                          {value !== null && <span className="text-[10px] font-normal ml-0.5 text-zinc-500"> adet</span>}
                        </p>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold border uppercase tracking-wider ${badgeClass}`}>
                          {statusText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Timeline Grid */}
        {daysInRange.length === 0 ? (
          <Card className="rounded-xl border border-zinc-200 shadow-sm bg-white p-8 text-center text-zinc-500 font-medium">
            Seçili tarih aralığı geçerli gün barındırmıyor.
          </Card>
        ) : (
          <CellGrid
            days={daysInRange}
            actuals={actuals}
            cellParams={cellParams}
            wipStock={wipStock}
            todayKey={todayKey}
            onCellClick={handleCellClick}
          />
        )}
      </div>

      {/* Day Detail Sidebar */}
      <DayDetailPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        cellName={selectedCellName}
        date={selectedDate}
        dateKey={selectedDateKey}
        actualValue={selectedActualValue}
        capacityParam={selectedCellName ? cellParams[selectedCellName] : undefined}
        wipStock={wipStock}
      />
    </main>
  );
}
