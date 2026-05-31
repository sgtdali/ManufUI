"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, Factory, Hammer, TimerReset, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import {
  loadCellActuals,
  loadCellBreakdowns,
  loadMoldChanges,
  loadScheduleParams,
  loadCellWipStock,
  loadBottleneckData,
  type MoldChange,
  type ScheduleParamRow,
  type WipStockItem,
  type CellBottleneckStats,
} from "./actions";
import { CELLS, CELL_FLOWS, type CellName } from "./overview/constants";
import { loadCellParams, type CellParam } from "./overview/actions";
import { SHIFT_START, SHIFT_END, FURNACE_START } from "./constants";
import type { DayOverride } from "./types";
import {
  buildSchedule,
  formatNumber,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  numberInput,
  sum,
  DEFAULT_PROCESS_PARAMS,
  toDayKey,
  type ProcessParams,
} from "./utils";

import { MetricCard } from "./_components/MetricCard";
import { RecoveryCard } from "./_components/RecoveryCard";
import { InfoPanel } from "./_components/InfoPanel";
import { ScheduleTable } from "./_components/ScheduleTable";
import { SettingsSidebar } from "./_components/SettingsSidebar";
import { MoldChangesSidebar } from "./_components/MoldChangesSidebar";
import { ParamsSidebar } from "./_components/ParamsSidebar";
import { LossAnalysisPanel } from "./_components/LossAnalysisPanel";
import { CampaignOptimizer } from "./_components/CampaignOptimizer";


export default function SchedulePage() {
  const today = new Date();

  // ── Simülasyon ayarları ──────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(getFirstDayOfMonth(today));
  const [endDate, setEndDate] = useState(getLastDayOfMonth(today));
  const [dailyTarget, setDailyTarget] = useState("100");
  const [defaultShiftStart, setDefaultShiftStart] = useState(SHIFT_START);
  const [defaultShiftEnd, setDefaultShiftEnd] = useState(SHIFT_END);
  const [defaultFurnaceStart, setDefaultFurnaceStart] = useState(FURNACE_START);
  const [overtimeMinutes, setOvertimeMinutes] = useState("0");
  const [initialMaleRemaining, setInitialMaleRemaining] = useState("500");
  const [initialFemaleRemaining, setInitialFemaleRemaining] = useState("1300");
  const [holidayWorkEnabled, setHolidayWorkEnabled] = useState(false);

  // ── Override / senaryo durumu ────────────────────────────────────────────
  const [overrides, setOverrides] = useState<Record<string, DayOverride>>({});

  // ── Supabase gerçekleşen verisi ──────────────────────────────────────────
  const [actuals, setActuals] = useState<Record<string, number>>({});
  const [actualsError, setActualsError] = useState<string | null>(null);
  const [isLoadingActuals, startActualsTransition] = useTransition();

  // ── Kalıp değişimleri ────────────────────────────────────────────────────
  const [moldChanges, setMoldChanges] = useState<MoldChange[]>([]);
  const [, startMoldChangesTransition] = useTransition();

  // ── Proses parametreleri ─────────────────────────────────────────────────
  const [scheduleParams, setScheduleParams] = useState<ScheduleParamRow[]>([]);
  const [, startParamsTransition] = useTransition();

  // ── WIP verisi ───────────────────────────────────────────────────────────
  const [wipData, setWipData] = useState<{ incoming: WipStockItem[]; outgoing: WipStockItem[] }>({
    incoming: [],
    outgoing: [],
  });

  // ── Sidebar sekme durumu ─────────────────────────────────────────────────
  const [activeSidebarTab, setActiveSidebarTab] = useState<"settings" | "molds" | "params">("settings");

  // ── Dinamik Hücre ve Arıza Durumları ─────────────────────────────────────
  const [selectedCell, setSelectedCell] = useState<CellName>("Pres Hücresi");
  const [breakdownsByDate, setBreakdownsByDate] = useState<Record<string, { minutes: number; details: string[] }>>({});
  const [allCellParams, setAllCellParams] = useState<Record<string, CellParam>>({});
  const [bottlenecks, setBottlenecks] = useState<CellBottleneckStats[]>([]);


  // ── Veri yükleme ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    startActualsTransition(async () => {
      const result = await loadCellActuals(selectedCell, startDate, endDate);
      if (cancelled) return;
      if (result.success) {
        setActuals(result.actuals);
        setActualsError(null);
      } else {
        setActuals({});
        setActualsError(result.error ?? "Bilinmeyen hata.");
      }
    });

    startMoldChangesTransition(async () => {
      const mcResult = await loadMoldChanges(startDate, endDate);
      if (cancelled) return;
      if (mcResult.success) setMoldChanges(mcResult.data ?? []);
      else setMoldChanges([]);
    });

    const loadWipAndBreakdowns = async () => {
      const [wipResult, breakdownResult, paramsResult, bResult] = await Promise.all([
        loadCellWipStock(selectedCell, startDate, endDate),
        loadCellBreakdowns(selectedCell, startDate, endDate),
        loadCellParams(),
        loadBottleneckData(startDate, endDate),
      ]);
      if (cancelled) return;
      setWipData(wipResult);
      if (breakdownResult.success) {
        setBreakdownsByDate(breakdownResult.breakdownsByDate ?? {});
      }
      setAllCellParams(paramsResult);
      if (bResult.success) {
        setBottlenecks(bResult.data ?? []);
      }
    };
    loadWipAndBreakdowns();

    return () => { cancelled = true; };
  }, [endDate, startDate, selectedCell]);

  useEffect(() => {
    startParamsTransition(async () => {
      const result = await loadScheduleParams();
      if (result.success) setScheduleParams(result.data);
    });
  }, []);


  // ── Kalıp değişim haritası ────────────────────────────────────────────────
  const moldChangesByDate = useMemo(() => {
    const map: Record<string, ("male" | "female")[]> = {};
    for (const mc of moldChanges) {
      if (!map[mc.tarih]) map[mc.tarih] = [];
      map[mc.tarih].push(mc.mold_type);
    }
    return map;
  }, [moldChanges]);

  // ── Proses parametreleri map ──────────────────────────────────────────────
  const processParams = useMemo<ProcessParams>(() => {
    const map: Record<string, number> = {};
    for (const p of scheduleParams) map[p.key] = Number(p.value);
    return {
      normalizationWarmupMinutes: map["normalization_warmup_minutes"] ?? DEFAULT_PROCESS_PARAMS.normalizationWarmupMinutes,
      prePressHeatMinutes: map["pre_press_heat_minutes"] ?? DEFAULT_PROCESS_PARAMS.prePressHeatMinutes,
      pressCycleMinutes: map["press_cycle_minutes"] ?? DEFAULT_PROCESS_PARAMS.pressCycleMinutes,
      normalizationProcessMinutes: map["normalization_process_minutes"] ?? DEFAULT_PROCESS_PARAMS.normalizationProcessMinutes,
      maleDieInterval: map["male_die_interval"] ?? DEFAULT_PROCESS_PARAMS.maleDieInterval,
      femaleDieInterval: map["female_die_interval"] ?? DEFAULT_PROCESS_PARAMS.femaleDieInterval,
      maleDieChangeMinutes: map["male_die_change_minutes"] ?? DEFAULT_PROCESS_PARAMS.maleDieChangeMinutes,
      femaleDieChangeMinutes: map["female_die_change_minutes"] ?? DEFAULT_PROCESS_PARAMS.femaleDieChangeMinutes,
    };
  }, [scheduleParams]);

  // ── Simülasyon ────────────────────────────────────────────────────────────
  const schedule = useMemo(
    () =>
      buildSchedule({
        startDate,
        endDate,
        dailyTarget: Math.max(numberInput(dailyTarget), 0),
        defaultShiftStart,
        defaultShiftEnd,
        defaultFurnaceStart,
        overtimeMinutes: Math.max(numberInput(overtimeMinutes), 0),
        holidayWorkEnabled,
        initialMaleRemaining: Math.max(numberInput(initialMaleRemaining), 0),
        initialFemaleRemaining: Math.max(numberInput(initialFemaleRemaining), 0),
        overrides,
        actuals,
        moldChangesByDate,
        processParams,
        breakdownsByDate,
        cellName: selectedCell,
        cellParams: allCellParams,
      }),
    [
      actuals, dailyTarget, defaultFurnaceStart, defaultShiftEnd, defaultShiftStart,
      endDate, holidayWorkEnabled, initialFemaleRemaining, initialMaleRemaining,
      moldChangesByDate, overtimeMinutes, overrides, processParams, startDate,
      breakdownsByDate, selectedCell, allCellParams,
    ]
  );


  // ── Özet metrikler ────────────────────────────────────────────────────────
  const targetDays        = schedule.filter((d) => d.isBaseWorkday).length;
  const activeWorkdays    = schedule.filter((d) => d.isWorkday).length;
  const periodTarget      = sum(schedule, "target");
  const periodPressed     = sum(schedule, "pressed");
  const periodSameDayReady = sum(schedule, "sameDayEtmReady");
  const periodGap         = Math.max(periodTarget - periodPressed, 0);
  const periodSurplus     = Math.max(periodPressed - periodTarget, 0);
  const maintenanceHours  = sum(schedule, "maintenanceMinutes") / 60;
  const firstRiskDay      = schedule.find((d) => d.isWorkday && (d.targetGap > 0 || d.maintenanceMinutes > 0));

  const todayKey = useMemo(() => {
    return toDayKey(new Date());
  }, []);

  const downstreamCell = useMemo(() => {
    return CELL_FLOWS[selectedCell]?.downstream[0] || null;
  }, [selectedCell]);

  const wipMetricValue = useMemo(() => {
    if (!downstreamCell) return null;
    const pastWorkdays = schedule.filter((d) => d.isWorkday && d.key <= todayKey);
    const targetDay = pastWorkdays[pastWorkdays.length - 1];
    if (!targetDay) return null;

    const match = wipData.outgoing.find(
      (item) => item.tarih === targetDay.key && item.hedef_hucresi === downstreamCell
    );
    if (!match) return null;

    return match.override_edildi && match.gercek_adet !== null ? match.gercek_adet : match.hesaplanan_adet;
  }, [schedule, wipData.outgoing, todayKey, downstreamCell]);

  const wipOutgoing = useMemo(() => {
    const map: Record<string, number | null> = {};
    if (!downstreamCell) return map;
    for (const item of wipData.outgoing) {
      if (item.hedef_hucresi === downstreamCell) {
        map[item.tarih] = item.override_edildi && item.gercek_adet !== null ? item.gercek_adet : item.hesaplanan_adet;
      }
    }
    return map;
  }, [wipData.outgoing, downstreamCell]);

  // ── Kurtarma hesabı ───────────────────────────────────────────────────────
  const recoveryDays = schedule.filter((d) => d.isWorkday && d.source === "plan" && d.availableMinutes > 0);
  const neededPerRecoveryDay =
    periodGap > 0 && recoveryDays.length > 0 ? Math.ceil(periodGap / recoveryDays.length) : 0;
  const extraMinutesPerRecoveryDay = neededPerRecoveryDay > 0 ? neededPerRecoveryDay * 3 : 0;

  const defaultShift = schedule[0]?.availableMinutes ?? 570;
  const holidayCapacity = Math.floor(Math.max(defaultShift - 150, 0) / 3);
  const requiredHolidayDays =
    periodGap > 0 && holidayCapacity > 0 ? Math.ceil(periodGap / holidayCapacity) : 0;

  // ── Override yardımcıları ─────────────────────────────────────────────────
  const updateOverride = (key: string, patch: DayOverride) => {
    setOverrides((cur) => {
      const next = { ...cur, [key]: { ...(cur[key] ?? {}), ...patch } };
      const item = next[key];
      if (
        item.pressed === undefined &&
        item.overtimeMinutes === undefined &&
        item.forceWorkday === undefined &&
        item.shiftStart === undefined &&
        item.shiftEnd === undefined &&
        item.furnaceStart === undefined
      ) {
        delete next[key];
      }
      return next;
    });
  };

  const clearDayOverride = (key: string) =>
    setOverrides((cur) => { const next = { ...cur }; delete next[key]; return next; });

  const clearAllOverrides = () => setOverrides({});

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-[1600px] w-full flex-col gap-6">

        {/* Başlık */}
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700">Hücre bazlı dönem planı</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">Schedule — {selectedCell}</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              {selectedCell === "Pres Hücresi"
                ? "Pres başlangıç hazırlığı, normalizasyon fırını, kalıp ömürleri ve fazla mesai etkisini seçili tarih aralığına göre görün."
                : `${selectedCell} kapasite planlaması, günlük duruşları ve hedefleri izleyin.`}
            </p>
            
            {/* Hücre Seçici */}
            <div className="mt-4 flex flex-col gap-1 max-w-[280px]">
              <label htmlFor="cell-select" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Aktif Hücre
              </label>
              <select
                id="cell-select"
                className="text-xs font-bold text-zinc-700 bg-white border border-zinc-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                value={selectedCell}
                onChange={(e) => setSelectedCell(e.target.value as CellName)}
              >
                {CELLS.map((cell) => (
                  <option key={cell} value={cell}>
                    {cell}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-3 text-xs font-medium text-zinc-500">
              {isLoadingActuals
                ? `Supabase gerçekleşen ${selectedCell} adetleri yükleniyor...`
                : actualsError
                  ? `Gerçekleşen veriler okunamadı: ${actualsError}`
                  : `${formatNumber(Object.keys(actuals).length)} gün için Supabase gerçekleşen verisi yüklendi.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/schedule/overview"><Button type="button" variant="outline">Hat Görünümü</Button></Link>
            <Link href="/dashboard"><Button type="button" variant="outline">Dashboard</Button></Link>
            <Link href="/"><Button type="button" variant="outline">Forma dön</Button></Link>
          </div>
        </header>


        {/* Ana ızgara: sol sidebar + sağ içerik */}
        <div className="grid gap-6 xl:grid-cols-[360px_1fr] items-start">

          {/* Sol – Yapışkan Sidebar */}
          <div className="flex flex-col gap-4 xl:sticky xl:top-6">
            <Card className="rounded-lg shadow-sm border-zinc-200 overflow-hidden">
              {/* Sekme başlıkları */}
              <div className="flex border-b border-zinc-200 bg-zinc-50/50">
                <button
                  type="button"
                  className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all ${
                    activeSidebarTab === "settings"
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                  }`}
                  onClick={() => setActiveSidebarTab("settings")}
                >
                  Plan Ayarları
                </button>
                <button
                  type="button"
                  className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                    activeSidebarTab === "molds"
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                  }`}
                  onClick={() => setActiveSidebarTab("molds")}
                >
                  <span>Kalıplar</span>
                  <span
                    className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      activeSidebarTab === "molds" ? "bg-blue-100 text-blue-700" : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {moldChanges.length}
                  </span>
                </button>
                <button
                  type="button"
                  className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all ${
                    activeSidebarTab === "params"
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                  }`}
                  onClick={() => setActiveSidebarTab("params")}
                >
                  Parametreler
                </button>
              </div>

              <CardContent className="p-4">
                {activeSidebarTab === "settings" && (
                  <SettingsSidebar
                    startDate={startDate} setStartDate={setStartDate}
                    endDate={endDate} setEndDate={setEndDate}
                    dailyTarget={dailyTarget} setDailyTarget={setDailyTarget}
                    defaultShiftStart={defaultShiftStart} setDefaultShiftStart={setDefaultShiftStart}
                    defaultShiftEnd={defaultShiftEnd} setDefaultShiftEnd={setDefaultShiftEnd}
                    defaultFurnaceStart={defaultFurnaceStart} setDefaultFurnaceStart={setDefaultFurnaceStart}
                    overtimeMinutes={overtimeMinutes} setOvertimeMinutes={setOvertimeMinutes}
                    initialMaleRemaining={initialMaleRemaining} setInitialMaleRemaining={setInitialMaleRemaining}
                    initialFemaleRemaining={initialFemaleRemaining} setInitialFemaleRemaining={setInitialFemaleRemaining}
                    holidayWorkEnabled={holidayWorkEnabled} setHolidayWorkEnabled={setHolidayWorkEnabled}
                    clearAllOverrides={clearAllOverrides}
                    normalizationWarmupMinutes={processParams.normalizationWarmupMinutes}
                    prePressHeatMinutes={processParams.prePressHeatMinutes}
                    normalizationProcessMinutes={processParams.normalizationProcessMinutes}
                  />
                )}
                {activeSidebarTab === "molds" && (
                  <MoldChangesSidebar
                    startDate={startDate}
                    moldChanges={moldChanges}
                    setMoldChanges={setMoldChanges}
                  />
                )}
                {activeSidebarTab === "params" && (
                  <ParamsSidebar
                    params={scheduleParams}
                    setParams={setScheduleParams}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sağ – Metrikler + içerik */}
          <div className="flex flex-col gap-6">
            {/* Metrik kartları */}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 items-start">
              <MetricCard
                icon={<CalendarDays />}
                label="Hedef günü"
                value={`${targetDays} gün`}
                note={`${activeWorkdays} aktif gün, hedef ${formatNumber(periodTarget)} adet`}
                color="indigo"
              />
              <MetricCard
                icon={<Factory />}
                label="Dönem pres çıktısı"
                value={formatNumber(periodPressed)}
                note={
                  periodGap > 0
                    ? `Hedef ${formatNumber(periodTarget)}, açık ${formatNumber(periodGap)}`
                    : `Hedef ${formatNumber(periodTarget)}, fazla ${formatNumber(periodSurplus)}`
                }
                color="emerald"
              />
              <MetricCard
                icon={<TimerReset />}
                label="Aynı gün ETM hazır"
                value={formatNumber(periodSameDayReady)}
                note="4,5 saat fırın gecikmesi dahil"
                color="blue"
              />
              <MetricCard
                icon={<Hammer />}
                label="Kalıp duruşu"
                value={`${formatNumber(Math.round(maintenanceHours))} saat`}
                note={firstRiskDay ? `${firstRiskDay.label}: ${firstRiskDay.maintenanceLabel}` : "Planlı duruş yok"}
                color="amber"
              />
              <MetricCard
                icon={<Layers />}
                label="ETM'ye giden stok"
                value={wipMetricValue !== null ? formatNumber(wipMetricValue) : "—"}
                note="Kümülatif birikmiş stok"
                color={wipMetricValue !== null && wipMetricValue > 0 ? "blue" : "amber"}
              />
            </div>

            {/* Kurtarma senaryosu */}
            <RecoveryCard
              periodGap={periodGap}
              periodTarget={periodTarget}
              neededPerRecoveryDay={neededPerRecoveryDay}
              extraMinutesPerRecoveryDay={extraMinutesPerRecoveryDay}
              requiredHolidayDays={requiredHolidayDays}
              holidayCapacity={holidayCapacity}
            />

             {/* Kayıp Analizi ve Öneriler */}
            <LossAnalysisPanel
              schedule={schedule}
              cycleTime={selectedCell === "Pres Hücresi" ? 3 : (570 / (allCellParams[selectedCell]?.gunluk_max_kapasite ?? 100))}
              cellName={selectedCell}
            />

            {/* Kampanya Optimizasyonu */}
            <CampaignOptimizer
              schedule={schedule}
              cellName={selectedCell}
              overtimeMinutes={overtimeMinutes}
              setOvertimeMinutes={setOvertimeMinutes}
              holidayWorkEnabled={holidayWorkEnabled}
              setHolidayWorkEnabled={setHolidayWorkEnabled}
              updateOverride={updateOverride}
              bottlenecks={bottlenecks}
            />

            {/* Bilgi paneli */}
            <InfoPanel />


            {/* Günlük simülasyon tablosu */}
            <ScheduleTable
              schedule={schedule}
              overrides={overrides}
              actuals={actuals}
              wipOutgoing={wipOutgoing}
              updateOverride={updateOverride}
              clearDayOverride={clearDayOverride}
              cellName={selectedCell}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
