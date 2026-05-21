"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  loadAllCellActuals,
  loadCellParams,
  loadWipStock,
  type CellParam,
  type WipStockItem,
} from "./actions";
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getDaysInRange,
  toDayKey,
} from "../utils";

import { SummaryBar } from "./_components/SummaryBar";
import { CellGrid } from "./_components/CellGrid";
import { DayDetailPanel } from "./_components/DayDetailPanel";
import { type CellName } from "./constants";

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
  const [isLoading, startTransition] = useTransition();

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

  // ── Data Fetching ────────────────────────────────────────────────────────
  const fetchData = () => {
    startTransition(async () => {
      const [act, params, wip] = await Promise.all([
        loadAllCellActuals(startDate, endDate),
        loadCellParams(),
        loadWipStock(startDate, endDate),
      ]);
      setActuals(act);
      setCellParams(params);
      setWipStock(wip);
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
              <Button type="button" variant="outline" className="flex items-center gap-1 text-xs font-bold">
                <ArrowLeft className="size-3.5" />
                Pres Planı Detayı
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
              {isLoading && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold">
                  <RefreshCw className="size-3.5 animate-spin text-zinc-400" />
                  Yükleniyor...
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
                className="text-zinc-500 hover:text-zinc-800 text-xs font-semibold flex items-center gap-1"
              >
                {!isLoading && <RefreshCw className="size-3.5" />}
                Yenile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary KPIs */}
        <SummaryBar
          actuals={actuals}
          startDate={startDate}
          endDate={endDate}
          campaignTarget={campaignTarget}
        />

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
