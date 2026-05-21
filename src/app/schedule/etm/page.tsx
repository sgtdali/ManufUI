"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ETM_SHIFT_START, ETM_SHIFT_END, ETM_HAT_CYCLE_MINUTES, ETM_CUTTING_INSERT_INTERVAL, ETM_DRILL_BIT_INTERVAL, ETM_PALET_INTERVAL, ETM_CUTTING_INSERT_CHANGE_MINUTES, ETM_DRILL_BIT_CHANGE_MINUTES, ETM_PALET_CHANGE_MINUTES } from "./constants";
import type { EtmDayOverride, EtmProcessParams, ToolChangeItem, ScheduleParamRow } from "./types";
import { buildEtmSchedule } from "./utils";
import { getFirstDayOfMonth, getLastDayOfMonth, formatNumber, toDayKey } from "../utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { EtmMetricCards } from "./_components/EtmMetricCards";
import { EtmSettingsSidebar } from "./_components/EtmSettingsSidebar";
import { EtmToolsSidebar } from "./_components/EtmToolsSidebar";
import { EtmStockSidebar } from "./_components/EtmStockSidebar";
import { EtmScheduleTable } from "./_components/EtmScheduleTable";

import {
  loadEtmActuals,
  loadEtmParams,
  saveEtmToolChange,
  loadEtmToolChanges,
  deleteEtmToolChange,
} from "./actions";
import { loadCellWipStock, type WipStockItem } from "../actions";

type StockState = {
  kumLastCheck: string | null;
  filtreLastCheck: string | null;
  holderStock: number;
  borYagiLastCheck: string | null;
  talasLastCheck: string | null;
};

const defaultStockState: StockState = {
  kumLastCheck: null,
  filtreLastCheck: null,
  holderStock: 5,
  borYagiLastCheck: null,
  talasLastCheck: null,
};

export default function EtmSchedulePage() {
  const today = new Date();

  // ── Simülasyon ayarları ──────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(getFirstDayOfMonth(today));
  const [endDate, setEndDate] = useState(getLastDayOfMonth(today));
  const [dailyTarget, setDailyTarget] = useState(100);
  const [defaultShiftStart, setDefaultShiftStart] = useState(ETM_SHIFT_START);
  const [defaultShiftEnd, setDefaultShiftEnd] = useState(ETM_SHIFT_END);
  const [overtimeMinutes, setOvertimeMinutes] = useState(0);
  const [holidayWorkEnabled, setHolidayWorkEnabled] = useState(false);

  // Başlangıç takım kalan ömürleri
  const [etm1InitialCutting, setEtm1InitialCutting] = useState(10);
  const [etm2InitialCutting, setEtm2InitialCutting] = useState(10);
  const [etm1InitialDrill, setEtm1InitialDrill] = useState(300);
  const [etm2InitialDrill, setEtm2InitialDrill] = useState(300);

  // ── Override / senaryo durumu ────────────────────────────────────────────
  const [overrides, setOverrides] = useState<Record<string, EtmDayOverride>>({});

  // ── Supabase gerçekleşen verisi ──────────────────────────────────────────
  const [actuals, setActuals] = useState<Record<string, number>>({});
  const [toolChanges, setToolChanges] = useState<ToolChangeItem[]>([]);
  const [scheduleParams, setScheduleParams] = useState<ScheduleParamRow[]>([]);
  
  // ── WIP verisi ───────────────────────────────────────────────────────────
  const [wipData, setWipData] = useState<{ incoming: WipStockItem[]; outgoing: WipStockItem[] }>({
    incoming: [],
    outgoing: [],
  });

  const [isLoading, startTransition] = useTransition();

  // ── Stok / Sarf Malzeme Durumu ───────────────────────────────────────────
  const [stockState, setStockState] = useState<StockState>(defaultStockState);

  // LocalStorage senkronizasyonu
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("manuf_etm_stock");
      if (saved) {
        try {
          setStockState(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing stock state from localStorage", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("manuf_etm_stock", JSON.stringify(stockState));
    }
  }, [stockState]);

  // ── Veri Yükleme Fonksiyonu ──────────────────────────────────────────────
  const reloadData = () => {
    startTransition(async () => {
      try {
        const actResult = await loadEtmActuals(startDate, endDate);
        if (actResult.success) {
          setActuals(actResult.actuals);
        } else {
          toast.error(`Gerçekleşen veriler yüklenemedi: ${actResult.error}`);
        }

        const tcResult = await loadEtmToolChanges(startDate, endDate);
        if (tcResult.success) {
          setToolChanges(tcResult.data as ToolChangeItem[]);
        } else {
          toast.error(`Takım değişimleri yüklenemedi: ${tcResult.error}`);
        }

        const paramsResult = await loadEtmParams();
        if (paramsResult.success) {
          setScheduleParams(paramsResult.data);
        } else {
          toast.error(`Parametreler yüklenemedi: ${paramsResult.error}`);
        }

        const wipResult = await loadCellWipStock("ETM Hücresi", startDate, endDate);
        setWipData(wipResult);
      } catch (e) {
        console.error(e);
        toast.error("Veriler yüklenirken bir hata oluştu.");
      }
    });
  };

  useEffect(() => {
    reloadData();
  }, [startDate, endDate]);

  // ── Takım değişim haritası ────────────────────────────────────────────────
  const toolChangesByDate = useMemo(() => {
    const map: Record<string, { machine: "ETM-1" | "ETM-2"; toolType: "cutting_insert" | "drill_bit" }[]> = {};
    for (const tc of toolChanges) {
      const key = tc.tarih;
      if (!map[key]) map[key] = [];
      map[key].push({
        machine: tc.machine,
        toolType: tc.tool_type,
      });
    }
    return map;
  }, [toolChanges]);

  // ── Proses Parametreleri Map ──────────────────────────────────────────────
  const processParams = useMemo<EtmProcessParams>(() => {
    const map: Record<string, number> = {};
    for (const p of scheduleParams) map[p.key] = Number(p.value);
    
    // Shift minutes computation helper
    const startMinute = defaultShiftStart.split(":").map(Number);
    const endMinute = defaultShiftEnd.split(":").map(Number);
    let shiftMinutes = 570;
    if (startMinute.length === 2 && endMinute.length === 2) {
      let start = startMinute[0] * 60 + startMinute[1];
      let end = endMinute[0] * 60 + endMinute[1];
      if (end <= start) end += 1440;
      shiftMinutes = end - start;
    }

    return {
      cuttingInsertInterval: map["etm_cutting_insert_interval"] ?? ETM_CUTTING_INSERT_INTERVAL,
      cuttingInsertChangeMinutes: map["etm_cutting_insert_change_minutes"] ?? ETM_CUTTING_INSERT_CHANGE_MINUTES,
      drillBitInterval: map["etm_drill_bit_interval"] ?? ETM_DRILL_BIT_INTERVAL,
      drillBitChangeMinutes: map["etm_drill_bit_change_minutes"] ?? ETM_DRILL_BIT_CHANGE_MINUTES,
      paletInterval: map["etm_palet_interval"] ?? ETM_PALET_INTERVAL,
      paletChangeMinutes: map["etm_palet_change_minutes"] ?? ETM_PALET_CHANGE_MINUTES,
      hatCycleMinutes: map["etm_hat_cycle_minutes"] ?? ETM_HAT_CYCLE_MINUTES,
      shiftMinutes,
    };
  }, [scheduleParams, defaultShiftStart, defaultShiftEnd]);

  // ── Simülasyon Planı Oluşturma ────────────────────────────────────────────
  const rawSchedule = useMemo(
    () =>
      buildEtmSchedule({
        startDate,
        endDate,
        dailyTarget,
        defaultShiftStart,
        defaultShiftEnd,
        overtimeMinutes,
        holidayWorkEnabled,
        etm1InitialCuttingRemaining: etm1InitialCutting,
        etm2InitialCuttingRemaining: etm2InitialCutting,
        etm1InitialDrillRemaining: etm1InitialDrill,
        etm2InitialDrillRemaining: etm2InitialDrill,
        overrides,
        actuals,
        toolChangesByDate,
        params: processParams,
      }),
    [
      startDate,
      endDate,
      dailyTarget,
      defaultShiftStart,
      defaultShiftEnd,
      overtimeMinutes,
      holidayWorkEnabled,
      etm1InitialCutting,
      etm2InitialCutting,
      etm1InitialDrill,
      etm2InitialDrill,
      overrides,
      actuals,
      toolChangesByDate,
      processParams,
    ]
  );

  // ── Stok Uyarılarını Bugünün Planına Enjekte Etme ─────────────────────────
  const schedule = useMemo(() => {
    const getDaysAgo = (dateStr: string | null): number | null => {
      if (!dateStr) return null;
      const past = new Date(dateStr + "T00:00:00");
      const current = new Date();
      current.setHours(0, 0, 0, 0);
      const diff = current.getTime() - past.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const todayStr = new Date().toISOString().split("T")[0];

    const kumDays = getDaysAgo(stockState.kumLastCheck);
    const filtreDays = getDaysAgo(stockState.filtreLastCheck);
    const borYagiDays = getDaysAgo(stockState.borYagiLastCheck);
    const talasDays = getDaysAgo(stockState.talasLastCheck);

    return rawSchedule.map((plan) => {
      if (plan.key === todayStr) {
        const warnings = [...plan.warnings];

        // Talaş kovası bugün boşaltıldıysa uyarıyı temizle
        const isTalasDoneToday = talasDays === 0;
        if (isTalasDoneToday) {
          const filtered = warnings.filter((w) => w.type !== "talas_kovasi");
          warnings.length = 0;
          warnings.push(...filtered);
        }

        // Kum kontrolü
        if (kumDays === null) {
          warnings.push({
            type: "kum",
            machine: "hucre",
            message: "Kumlama kum seviyesi kontrolü henüz yapılmadı",
            severity: "warning",
          });
        } else if (kumDays > 3) {
          warnings.push({
            type: "kum",
            machine: "hucre",
            message: `Kumlama kum seviyesi kontrolü gecikti (${kumDays} gün)`,
            severity: "critical",
          });
        }

        // Filtre kontrolü
        if (filtreDays === null) {
          warnings.push({
            type: "filtre",
            machine: "hucre",
            message: "Filtre basınç kontrolü henüz yapılmadı",
            severity: "warning",
          });
        } else if (filtreDays > 7) {
          warnings.push({
            type: "filtre",
            machine: "hucre",
            message: `Filtre basınç kontrolü gecikti (${filtreDays} gün)`,
            severity: "critical",
          });
        }

        // Bor yağı kontrolü
        if (borYagiDays === null) {
          warnings.push({
            type: "bor_yagi",
            machine: "hucre",
            message: "Bor yağı konsantrasyonu kontrolü henüz yapılmadı",
            severity: "warning",
          });
        } else if (borYagiDays > 3) {
          warnings.push({
            type: "bor_yagi",
            machine: "hucre",
            message: `Bor yağı konsantrasyon kontrolü gecikti (${borYagiDays} gün)`,
            severity: "critical",
          });
        }

        // Holder stok kontrolü
        if (stockState.holderStock <= 2) {
          warnings.push({
            type: "cutting_insert",
            machine: "hucre",
            message: `Yedek holder adeti kritik seviyede! (Kalan: ${stockState.holderStock})`,
            severity: "critical",
          });
        }

        return {
          ...plan,
          warnings,
        };
      }
      return plan;
    });
  }, [rawSchedule, stockState]);

  const wipIncoming = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const item of wipData.incoming) {
      if (item.kaynak_hucresi === "Pres Hücresi") {
        map[item.tarih] = item.override_edildi && item.gercek_adet !== null ? item.gercek_adet : item.hesaplanan_adet;
      }
    }
    return map;
  }, [wipData.incoming]);

  const todayKey = useMemo(() => {
    return toDayKey(new Date());
  }, []);

  const wipMetricValue = useMemo(() => {
    const pastWorkdays = schedule.filter((d) => d.isWorkday && d.key <= todayKey);
    const targetDay = pastWorkdays[pastWorkdays.length - 1];
    if (!targetDay) return null;
    return wipIncoming[targetDay.key] ?? null;
  }, [schedule, wipIncoming, todayKey]);

  // ── Override Yönetimi ────────────────────────────────────────────────────
  const handleSaveOverride = (key: string, override: EtmDayOverride) => {
    setOverrides((cur) => {
      const next = { ...cur, [key]: { ...(cur[key] ?? {}), ...override } };
      
      const item = next[key];
      if (
        item.produced === undefined &&
        item.overtimeMinutes === undefined &&
        item.forceWorkday === undefined &&
        item.shiftStart === undefined &&
        item.shiftEnd === undefined
      ) {
        delete next[key];
      }
      return next;
    });
  };

  const handleClearOverride = (key: string) => {
    setOverrides((cur) => {
      const next = { ...cur };
      delete next[key];
      return next;
    });
  };

  const handleClearAllOverrides = () => {
    setOverrides({});
    toast.success("Tüm plan değişiklikleri sıfırlandı.");
  };

  // ── Takım Değişimi Kayıt ve Silme ────────────────────────────────────────
  const handleSaveToolChange = async (
    tarih: string,
    machine: "ETM-1" | "ETM-2",
    toolType: "cutting_insert" | "drill_bit",
    description: string
  ) => {
    const result = await saveEtmToolChange(tarih, machine, toolType, description);
    if (result.success) {
      toast.success("Takım değişimi kaydedildi.");
      reloadData();
    } else {
      toast.error(`Takım değişimi kaydedilemedi: ${result.error}`);
    }
  };

  const handleDeleteToolChange = async (
    tarih: string,
    machine: "ETM-1" | "ETM-2",
    toolType: "cutting_insert" | "drill_bit"
  ) => {
    const result = await deleteEtmToolChange(tarih, machine, toolType);
    if (result.success) {
      toast.success("Takım değişimi silindi.");
      reloadData();
    } else {
      toast.error(`Takım değişimi silinemedi: ${result.error}`);
    }
  };

  // ── Sidebar Sekme Yönetimi ───────────────────────────────────────────────
  const [activeSidebarTab, setActiveSidebarTab] = useState<"settings" | "tools" | "stock">("settings");

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-[1600px] w-full flex-col gap-6">

        {/* Başlık */}
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">ETM hücresi dönem planı</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">ETM Schedule</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              ETM-1 ve ETM-2 paralel makineleri, kesici uç & punta matkabı ömürleri, palet duruşları ve sarf malzeme kontrollerinin simülasyonunu yönetin.
            </p>
            <p className="mt-2 text-xs font-medium text-zinc-500">
              {isLoading
                ? "ETM verileri yükleniyor..."
                : `${formatNumber(Object.keys(actuals).length)} gün gerçekleşen veri ve ${toolChanges.length} takım değişimi yüklendi.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard">
              <Button type="button" variant="outline">Dashboard</Button>
            </Link>
            <Link href="/schedule">
              <Button type="button" variant="outline">Pres Schedule</Button>
            </Link>
            <Link href="/">
              <Button type="button" variant="outline">Forma Dön</Button>
            </Link>
          </div>
        </header>

        {/* Ana Metrik Kartları */}
        <EtmMetricCards plans={schedule} wipIncomingValue={wipMetricValue} />

        {/* Sol Sidebar + Sağ Timeline Izgarası */}
        <div className="grid gap-6 xl:grid-cols-[360px_1fr] items-start">
          
          {/* Sol – Yapışkan Sidebar */}
          <div className="flex flex-col gap-4 xl:sticky xl:top-6">
            <Card className="rounded-lg shadow-sm border-zinc-200 overflow-hidden bg-white">
              
              {/* Sekme Butonları */}
              <div className="flex border-b border-zinc-200 bg-zinc-50/50">
                <button
                  type="button"
                  className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${
                    activeSidebarTab === "settings"
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                  }`}
                  onClick={() => setActiveSidebarTab("settings")}
                >
                  Ayarlar
                </button>
                <button
                  type="button"
                  className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                    activeSidebarTab === "tools"
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                  }`}
                  onClick={() => setActiveSidebarTab("tools")}
                >
                  <span>Takımlar</span>
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                      activeSidebarTab === "tools" ? "bg-blue-100 text-blue-700" : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {toolChanges.length}
                  </span>
                </button>
                <button
                  type="button"
                  className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${
                    activeSidebarTab === "stock"
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                  }`}
                  onClick={() => setActiveSidebarTab("stock")}
                >
                  Stok / Sarf
                </button>
              </div>

              {/* Sekme İçerikleri */}
              <CardContent className="p-4">
                {activeSidebarTab === "settings" && (
                  <EtmSettingsSidebar
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    dailyTarget={dailyTarget}
                    setDailyTarget={setDailyTarget}
                    defaultShiftStart={defaultShiftStart}
                    setDefaultShiftStart={setDefaultShiftStart}
                    defaultShiftEnd={defaultShiftEnd}
                    setDefaultShiftEnd={setDefaultShiftEnd}
                    overtimeMinutes={overtimeMinutes}
                    setOvertimeMinutes={setOvertimeMinutes}
                    holidayWorkEnabled={holidayWorkEnabled}
                    setHolidayWorkEnabled={setHolidayWorkEnabled}
                    etm1InitialCutting={etm1InitialCutting}
                    setEtm1InitialCutting={setEtm1InitialCutting}
                    etm2InitialCutting={etm2InitialCutting}
                    setEtm2InitialCutting={setEtm2InitialCutting}
                    etm1InitialDrill={etm1InitialDrill}
                    setEtm1InitialDrill={setEtm1InitialDrill}
                    etm2InitialDrill={etm2InitialDrill}
                    setEtm2InitialDrill={setEtm2InitialDrill}
                    onClearOverrides={handleClearAllOverrides}
                  />
                )}
                {activeSidebarTab === "tools" && (
                  <EtmToolsSidebar
                    toolChanges={toolChanges}
                    onSaveToolChange={handleSaveToolChange}
                    onDeleteToolChange={handleDeleteToolChange}
                  />
                )}
                {activeSidebarTab === "stock" && (
                  <EtmStockSidebar
                    stockState={stockState}
                    setStockState={setStockState}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sağ – Zaman Çizelgesi Tablosu */}
          <div className="flex flex-col gap-6">
            <EtmScheduleTable
              plans={schedule}
              wipIncoming={wipIncoming}
              onSaveOverride={handleSaveOverride}
              onClearOverride={handleClearOverride}
            />
          </div>

        </div>

      </div>
    </main>
  );
}
