"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, Factory, Hammer, TimerReset, Layers, Save } from "lucide-react";
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
  loadScheduleOverrides,
  saveScheduleOverride,
  deleteScheduleOverride,
  loadEtmToolChanges,
  saveEtmToolChange,
  deleteEtmToolChange,
  type MoldChange,
  type ScheduleParamRow,
  type WipStockItem,
  type CellBottleneckStats,

} from "./actions";
import { CELLS, CELL_FLOWS, CELL_STATE_CONFIG, getDefaultCellState, type CellName } from "./overview/constants";
import { loadCellParams, type CellParam } from "./overview/actions";
import { SHIFT_START, SHIFT_END, FURNACE_START } from "./constants";
import type { DayOverride, GanttDependency, ToolChangeItem } from "./types";

import {
  buildCellChain,
  getUpstreamChain,
  formatNumber,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  numberInput,
  sum,
  DEFAULT_PROCESS_PARAMS,
  toDayKey,
  type ProcessParams,
  type UpstreamCellData,
} from "./utils";

import { MetricCard } from "./_components/MetricCard";
import { InfoPanel } from "./_components/InfoPanel";
import { ScheduleTable } from "./_components/ScheduleTable";
import { SettingsSidebar } from "./_components/SettingsSidebar";
import { MoldChangesSidebar } from "./_components/MoldChangesSidebar";
import { ParamsSidebar } from "./_components/ParamsSidebar";
import { LossAnalysisPanel } from "./_components/LossAnalysisPanel";
import { OperationsActionPanel } from "./_components/OperationsActionPanel";
import { EtmToolsSidebar } from "./_components/EtmToolsSidebar";


export default function SchedulePage() {
  const today = new Date();

  // â”€â”€ Simülasyon ayarları â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [startDate, setStartDate] = useState(getFirstDayOfMonth(today));
  const [endDate, setEndDate] = useState(getLastDayOfMonth(today));
  const [dailyTarget, setDailyTarget] = useState("100");
  const [defaultShiftStart, setDefaultShiftStart] = useState(SHIFT_START);
  const [defaultShiftEnd, setDefaultShiftEnd] = useState(SHIFT_END);
  const [defaultFurnaceStart, setDefaultFurnaceStart] = useState(FURNACE_START);
  const [overtimeMinutes, setOvertimeMinutes] = useState("0");
  const [holidayWorkEnabled, setHolidayWorkEnabled] = useState(false);

  // ── Hücre başlangıç durumu (kalıp kalan, takım kalan, WIP) ─────────────────
  const [cellInitialState, setCellInitialState] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const [cell, config] of Object.entries(CELL_STATE_CONFIG)) {
      if (config) init[cell] = Object.fromEntries(config.map((f) => [f.key, f.defaultValue]));
    }
    return init;
  });

  // â”€â”€ Override / senaryo durumu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [overrides, setOverrides] = useState<Record<string, DayOverride>>({});
  const [dependencies, setDependencies] = useState<GanttDependency[]>([]);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyKeys.size > 0) {
        e.preventDefault();
        e.returnValue = "Kaydedilmemiş deÄŸişiklikleriniz var!";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyKeys]);



  // â”€â”€ Supabase gerçekleşen verisi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [actuals, setActuals] = useState<Record<string, number>>({});
  const [actualsError, setActualsError] = useState<string | null>(null);
  const [isLoadingActuals, startActualsTransition] = useTransition();

  // â”€â”€ Kalıp deÄŸişimleri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [moldChanges, setMoldChanges] = useState<MoldChange[]>([]);
  const [, startMoldChangesTransition] = useTransition();

  // â”€â”€ ETM Takım DeÄŸişimleri ve Ã–mürleri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [etmToolChanges, setEtmToolChanges] = useState<ToolChangeItem[]>([]);
  const [, startEtmChangesTransition] = useTransition();

  // â”€â”€ Upstream zincir DB verisi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [upstreamCellData, setUpstreamCellData] = useState<Partial<Record<string, UpstreamCellData>>>({});

  // â”€â”€ Proses parametreleri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [scheduleParams, setScheduleParams] = useState<ScheduleParamRow[]>([]);
  const [, startParamsTransition] = useTransition();

  // â”€â”€ WIP verisi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [wipData, setWipData] = useState<{ incoming: WipStockItem[]; outgoing: WipStockItem[] }>({
    incoming: [],
    outgoing: [],
  });

  // â”€â”€ Sidebar sekme durumu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [activeSidebarTab, setActiveSidebarTab] = useState<"settings" | "molds" | "params">("settings");

  // â”€â”€ Dinamik Hücre ve Arıza Durumları â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedCell, setSelectedCell] = useState<CellName>("Pres Hücresi");
  const [breakdownsByDate, setBreakdownsByDate] = useState<Record<string, { minutes: number; details: string[] }>>({});
  const [allCellParams, setAllCellParams] = useState<Record<string, CellParam>>({});
  const [bottlenecks, setBottlenecks] = useState<CellBottleneckStats[]>([]);


  // â”€â”€ Veri yükleme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    if (selectedCell === "Pres Hücresi") {
      startMoldChangesTransition(async () => {
        const mcResult = await loadMoldChanges(startDate, endDate);
        if (cancelled) return;
        if (mcResult.success) setMoldChanges(mcResult.data ?? []);
        else setMoldChanges([]);
      });
    }

    if (selectedCell === "ETM Hücresi") {
      startEtmChangesTransition(async () => {
        const tcResult = await loadEtmToolChanges(startDate, endDate);
        if (cancelled) return;
        if (tcResult.success) setEtmToolChanges(tcResult.data ?? []);
        else setEtmToolChanges([]);
      });
    }

    // Load data for all upstream cells in chain
    const upstreamChain = getUpstreamChain(selectedCell);
    if (upstreamChain.length > 0) {
      Promise.all(
        upstreamChain.map(async (upstreamCell) => {
          const [actualsRes, overridesRes, breakdownsRes] = await Promise.all([
            loadCellActuals(upstreamCell, startDate, endDate),
            loadScheduleOverrides(upstreamCell, startDate, endDate),
            loadCellBreakdowns(upstreamCell, startDate, endDate),
          ]);
          let moldChangesByDate: Record<string, ("male" | "female" | "ring")[]> = {};
          let toolChangesByDate: Record<string, { machine: "ETM-1" | "ETM-2"; toolType: "cutting_insert" | "drill_bit" }[]> = {};
          if (upstreamCell === "Pres Hücresi") {
            const moldRes = await loadMoldChanges(startDate, endDate);
            if (moldRes.success) {
              for (const mc of moldRes.data ?? []) {
                if (!moldChangesByDate[mc.tarih]) moldChangesByDate[mc.tarih] = [];
                moldChangesByDate[mc.tarih].push(mc.mold_type);
              }
            }
          } else if (upstreamCell === "ETM Hücresi") {
            const toolRes = await loadEtmToolChanges(startDate, endDate);
            if (toolRes.success) {
              for (const tc of toolRes.data ?? []) {
                if (!toolChangesByDate[tc.tarih]) toolChangesByDate[tc.tarih] = [];
                toolChangesByDate[tc.tarih].push({ machine: tc.machine, toolType: tc.tool_type });
              }
            }
          }
          return {
            cell: upstreamCell,
            data: {
              actuals: actualsRes.success ? actualsRes.actuals : {},
              overrides: overridesRes.success ? (overridesRes.overrides ?? {}) : {},
              breakdownsByDate: breakdownsRes.success ? (breakdownsRes.breakdownsByDate ?? {}) : {},
              moldChangesByDate,
              toolChangesByDate,
            } satisfies UpstreamCellData,
          };
        })
      ).then((results) => {
        if (cancelled) return;
        const newData: Partial<Record<string, UpstreamCellData>> = {};
        for (const { cell, data } of results) newData[cell] = data;
        setUpstreamCellData(newData);
      });
    } else {
      setUpstreamCellData({});
    }

    const loadWipAndBreakdowns = async () => {
      const d = new Date(`${startDate}T00:00:00`);
      d.setDate(d.getDate() - 1);
      const prevDayKey = toDayKey(d);

      const [wipResult, breakdownResult, paramsResult, bResult, overridesResult] = await Promise.all([
        loadCellWipStock(selectedCell, prevDayKey, endDate),
        loadCellBreakdowns(selectedCell, startDate, endDate),
        loadCellParams(),
        loadBottleneckData(startDate, endDate),
        loadScheduleOverrides(selectedCell, startDate, endDate),
      ]);
      if (cancelled) return;

      const dailyIncoming = wipResult.incoming.filter((item) => item.tarih >= startDate);
      const dailyOutgoing = wipResult.outgoing.filter((item) => item.tarih >= startDate);
      setWipData({ incoming: dailyIncoming, outgoing: dailyOutgoing });

      const primaryUpstream = CELL_FLOWS[selectedCell]?.upstream[0];
      if (primaryUpstream) {
        const initialWipItem = wipResult.incoming.find(
          (item) => item.tarih === prevDayKey && item.kaynak_hucresi === primaryUpstream
        );
        const val = initialWipItem
          ? (initialWipItem.override_edildi && initialWipItem.gercek_adet !== null
              ? initialWipItem.gercek_adet
              : initialWipItem.hesaplanan_adet)
          : 0;
        setCellInitialState((prev) => ({
          ...prev,
          [selectedCell]: { ...(prev[selectedCell] ?? {}), wip: String(val) },
        }));
      }

      if (breakdownResult.success) {
        setBreakdownsByDate(breakdownResult.breakdownsByDate ?? {});
      }
      setAllCellParams(paramsResult);
      if (bResult.success) {
        setBottlenecks(bResult.data ?? []);
      }
      if (overridesResult.success) {
        setOverrides(overridesResult.overrides ?? {});
        setDependencies(overridesResult.dependencies ?? []);
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



  // â”€â”€ Kalıp deÄŸişim haritası â”€â”
  const moldChangesByDate = useMemo(() => {
    const map: Record<string, ("male" | "female" | "ring")[]> = {};
    for (const mc of moldChanges) {
      if (!map[mc.tarih]) map[mc.tarih] = [];
      map[mc.tarih].push(mc.mold_type);
    }
    return map;
  }, [moldChanges]);


  // â”€â”€ ETM Takım deÄŸişim haritası â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toolChangesByDate = useMemo(() => {
    const map: Record<string, { machine: "ETM-1" | "ETM-2"; toolType: "cutting_insert" | "drill_bit" }[]> = {};
    for (const tc of etmToolChanges) {
      if (!map[tc.tarih]) map[tc.tarih] = [];
      map[tc.tarih].push({
        machine: tc.machine,
        toolType: tc.tool_type,
      });
    }
    return map;
  }, [etmToolChanges]);

  // â”€â”€ Proses parametreleri map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      ringInterval: map["ring_interval"] ?? DEFAULT_PROCESS_PARAMS.ringInterval,
      ringChangeMinutes: map["ring_change_minutes"] ?? DEFAULT_PROCESS_PARAMS.ringChangeMinutes,
      cuttingInsertInterval: map["etm_cutting_insert_interval"] ?? DEFAULT_PROCESS_PARAMS.cuttingInsertInterval,
      cuttingInsertChangeMinutes: map["etm_cutting_insert_change_minutes"] ?? DEFAULT_PROCESS_PARAMS.cuttingInsertChangeMinutes,
      drillBitInterval: map["etm_drill_bit_interval"] ?? DEFAULT_PROCESS_PARAMS.drillBitInterval,
      drillBitChangeMinutes: map["etm_drill_bit_change_minutes"] ?? DEFAULT_PROCESS_PARAMS.drillBitChangeMinutes,
      paletInterval: map["etm_palet_interval"] ?? DEFAULT_PROCESS_PARAMS.paletInterval,
      paletChangeMinutes: map["etm_palet_change_minutes"] ?? DEFAULT_PROCESS_PARAMS.paletChangeMinutes,
      hatCycleMinutes: map["etm_hat_cycle_minutes"] ?? DEFAULT_PROCESS_PARAMS.hatCycleMinutes,
      rob108ToolInterval: map["rob108_tool_interval"] || DEFAULT_PROCESS_PARAMS.rob108ToolInterval,
      rob108ToolChangeDuration: map["rob108_tool_change_duration"] || DEFAULT_PROCESS_PARAMS.rob108ToolChangeDuration,
      rob108PaletSize: map["rob108_palet_size"] || DEFAULT_PROCESS_PARAMS.rob108PaletSize,
      rob108PaletChangeDuration: map["rob108_palet_change_duration"] || DEFAULT_PROCESS_PARAMS.rob108PaletChangeDuration,
      rob108CycleMinutes: map["rob108_cycle_minutes"] || DEFAULT_PROCESS_PARAMS.rob108CycleMinutes,
      rob104CycleMinutes: map["rob104_cycle_minutes"] || DEFAULT_PROCESS_PARAMS.rob104CycleMinutes,
      rob104ToolInterval: map["rob104_tool_interval"] || DEFAULT_PROCESS_PARAMS.rob104ToolInterval,
      rob104ToolChangeDuration: map["rob104_tool_change_duration"] || DEFAULT_PROCESS_PARAMS.rob104ToolChangeDuration,
    };
  }, [scheduleParams]);

  // â”€â”€ Simülasyon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Aralık parametresi değiştiğinde ROB108 takım kalan değerlerini senkronize et
  useEffect(() => {
    const rob108Int = String(processParams.rob108ToolInterval || 5);
    const rob104Int = String(processParams.rob104ToolInterval || 5);
    setCellInitialState((prev) => ({
      ...prev,
      "ROB108 Hücresi": {
        ...(prev["ROB108 Hücresi"] || {}),
        cell1L1Tool: rob108Int,
        cell1L2Tool: rob108Int,
        cell1L3Tool: rob108Int,
        cell2Rob108L1Tool: rob108Int,
        cell2Rob108L2Tool: rob108Int,
        cell2Rob104L1Tool: rob104Int,
        cell2Rob104L2Tool: rob104Int,
      },
    }));
  }, [processParams.rob108ToolInterval, processParams.rob104ToolInterval]);

  const currentCellState = useMemo(
    () => cellInitialState[selectedCell] ?? {},
    [cellInitialState, selectedCell]
  );

  const schedule = useMemo(
    () => {
      const cs = currentCellState;
      const g = (v: string | undefined, d: number) => Math.max(numberInput(v || String(d)), 0);
      return buildCellChain({
        targetCell: selectedCell,
        startDate,
        endDate,
        dailyTarget: Math.max(numberInput(dailyTarget), 0),
        defaultShiftStart,
        defaultShiftEnd,
        defaultFurnaceStart,
        overtimeMinutes: Math.max(numberInput(overtimeMinutes), 0),
        holidayWorkEnabled,
        processParams,
        cellParams: allCellParams,
        actuals,
        overrides,
        breakdownsByDate,
        moldChangesByDate,
        toolChangesByDate,
        initialMaleRemaining: g(cs.maleRemaining, 500),
        initialFemaleRemaining: g(cs.femaleRemaining, 1300),
        initialRingRemaining: g(cs.ringRemaining, 1300),
        etm1InitialCutting: g(cs.etm1Cutting, 10),
        etm2InitialCutting: g(cs.etm2Cutting, 10),
        etm1InitialDrill: g(cs.etm1Drill, 300),
        etm2InitialDrill: g(cs.etm2Drill, 300),
        initialWip: g(cs.wip, 0),
        rob108Cell1L1Tool: g(cs.cell1L1Tool, 5),
        rob108Cell1L2Tool: g(cs.cell1L2Tool, 5),
        rob108Cell1L3Tool: g(cs.cell1L3Tool, 5),
        rob108Cell2Rob108L1Tool: g(cs.cell2Rob108L1Tool, 5),
        rob108Cell2Rob108L2Tool: g(cs.cell2Rob108L2Tool, 5),
        rob108Cell2Rob104L1Tool: g(cs.cell2Rob104L1Tool, 5),
        rob108Cell2Rob104L2Tool: g(cs.cell2Rob104L2Tool, 5),
        upstreamCellData,
      });
    },
    [
      actuals, dailyTarget, defaultFurnaceStart, defaultShiftEnd, defaultShiftStart,
      endDate, holidayWorkEnabled, moldChangesByDate, overtimeMinutes, overrides,
      processParams, startDate, breakdownsByDate, selectedCell, allCellParams,
      toolChangesByDate, currentCellState, upstreamCellData,
    ]
  );


  // â”€â”€ Ã–zet metrikler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const targetDays        = schedule.filter((d) => d.isBaseWorkday).length;
  const activeWorkdays    = schedule.filter((d) => d.isWorkday).length;
  const periodTarget      = sum(schedule, "target");
  const periodPressed     = sum(schedule, "pressed");
  const periodSameDayReady = sum(schedule, "sameDayEtmReady");
  const periodGap         = Math.max(periodTarget - periodPressed, 0);
  const periodSurplus     = Math.max(periodPressed - periodTarget, 0);
  const maintenanceHours  = sum(schedule, "maintenanceMinutes") / 60;
  const firstRiskDay      = schedule.find((d) => d.isWorkday && (d.targetGap > 0 || d.maintenanceMinutes > 0));
  const isEtmCell         = selectedCell === "ETM Hücresi";

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

  const latestEtmWipEnd = useMemo(() => {
    if (selectedCell === "ROB108 Hücresi") {
      const rob108Workdays = schedule.filter((d) => d.isWorkday && d.rob108WipEnd !== undefined);
      return rob108Workdays[rob108Workdays.length - 1]?.rob108WipEnd ?? null;
    }
    const etmWorkdays = schedule.filter((d) => d.isWorkday && d.etmWipEnd !== undefined);
    return etmWorkdays[etmWorkdays.length - 1]?.etmWipEnd ?? null;
  }, [schedule, selectedCell]);

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


  // â”€â”€ Override yardımcıları â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const updateOverride = (key: string, patch: DayOverride) => {
    setOverrides((cur) => {
      const next = { ...cur, [key]: { ...(cur[key] ?? {}), ...patch } };
      const item = next[key];
      const hasAnyValue =
        item.pressed !== undefined ||
        item.overtimeMinutes !== undefined ||
        item.forceWorkday !== undefined ||
        item.shiftStart !== undefined ||
        item.shiftEnd !== undefined ||
        item.furnaceStart !== undefined ||
        item.dieCoolingMinutes !== undefined ||
        item.moldMaintenanceStart !== undefined ||
        item.postponeMaleChange !== undefined ||
        item.postponeFemaleChange !== undefined ||
        item.postponeRingChange !== undefined ||
        item.femaleChangeMinutes !== undefined ||
        item.maleChangeMinutes !== undefined ||
        item.ringChangeMinutes !== undefined ||
        item.moldChangeMode !== undefined ||
        item.manualMoldType !== undefined ||
        item.manualMoldChangeAfterPieces !== undefined ||
        (item.customGanttItems !== undefined && item.customGanttItems.length > 0) ||
        (item.disabledSegments !== undefined && item.disabledSegments.length > 0) ||
        (item.disabledOperations !== undefined && item.disabledOperations.length > 0);

      if (!hasAnyValue) {
        delete next[key];
      }
      return next;
    });

    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const updateDayDependencies = async (key: string, nextDeps: GanttDependency[]) => {
    setDependencies((current) => [
      ...current.filter((d) => d.dayKey !== key),
      ...nextDeps,
    ]);

    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const clearDayOverride = (key: string) => {
    setOverrides((cur) => { const next = { ...cur }; delete next[key]; return next; });
    setDependencies((current) => current.filter((d) => d.dayKey !== key));
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const clearAllOverrides = () => {
    const keys = Object.keys(overrides);
    setOverrides({});
    setDependencies([]);
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      keys.forEach(k => next.add(k));
      return next;
    });
  };

  const handleSaveToolChange = async (
    tarih: string,
    machine: "ETM-1" | "ETM-2",
    toolType: "cutting_insert" | "drill_bit",
    description: string
  ) => {
    const result = await saveEtmToolChange(tarih, machine, toolType, description);
    if (result.success) {
      toast.success("Takım deÄŸişimi kaydedildi.");
      const tcResult = await loadEtmToolChanges(startDate, endDate);
      if (tcResult.success) setEtmToolChanges(tcResult.data ?? []);
    } else {
      toast.error(`Takım deÄŸişimi kaydedilemedi: ${result.error}`);
    }
  };

  const handleDeleteToolChange = async (
    tarih: string,
    machine: "ETM-1" | "ETM-2",
    toolType: "cutting_insert" | "drill_bit"
  ) => {
    const result = await deleteEtmToolChange(tarih, machine, toolType);
    if (result.success) {
      toast.success("Takım deÄŸişimi silindi.");
      const tcResult = await loadEtmToolChanges(startDate, endDate);
      if (tcResult.success) setEtmToolChanges(tcResult.data ?? []);
    } else {
      toast.error(`Takım deÄŸişimi silinemedi: ${result.error}`);
    }
  };

  const handleSaveAllChanges = async () => {
    if (dirtyKeys.size === 0) return;
    setIsSaving(true);
    try {
      const promises = Array.from(dirtyKeys).map((key) => {
        const override = overrides[key];
        const dayDeps = dependencies.filter((d) => d.dayKey === key);
        if (!override) {
          return deleteScheduleOverride(key, selectedCell);
        } else {
          return saveScheduleOverride(key, selectedCell, override, dayDeps);
        }
      });
      await Promise.all(promises);
      setDirtyKeys(new Set());
      toast.success("Tüm planlama deÄŸişiklikleri başarıyla Supabase'e kaydedildi!");
    } catch (err) {
      console.error(err);
      toast.error("DeÄŸişiklikler kaydedilirken bir hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };



  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-[1600px] w-full flex-col gap-6">

        {/* Başlık */}
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">Schedule - {selectedCell}</h1>
            
            {/* Hücre Seçici */}
            <div className="mt-4 flex flex-col gap-1 max-w-[280px]">
              <label htmlFor="cell-select" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Aktif Hücre
              </label>
              <select
                id="cell-select"
                className="text-xs font-bold text-zinc-700 bg-white border border-zinc-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                value={selectedCell}
                onChange={(e) => {
                  if (dirtyKeys.size > 0 && !window.confirm("Kaydedilmemiş planlama deÄŸişiklikleriniz var! Hücreyi deÄŸiştirirseniz bu deÄŸişiklikler kaybolacaktır. Devam etmek istiyor musunuz?")) {
                    return;
                  }
                  const newCell = e.target.value as CellName;
                  setSelectedCell(newCell);
                  if (newCell !== "Pres Hücresi" && newCell !== "ETM Hücresi") {
                    setActiveSidebarTab("settings");
                  }
                }}
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
          <div className="flex flex-wrap gap-2 items-center">
            {dirtyKeys.size > 0 && (
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-md flex items-center gap-2 animate-pulse cursor-pointer"
                onClick={handleSaveAllChanges}
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Kaydediliyor..." : `Değişiklikleri Kaydet (${dirtyKeys.size})`}
              </Button>
            )}
            <Link href="/schedule/overview"><Button type="button" variant="outline">Hat Görünümü</Button></Link>
            <Link href="/dashboard"><Button type="button" variant="outline">Dashboard</Button></Link>
            <Link href="/"><Button type="button" variant="outline">Forma dön</Button></Link>
          </div>
        </header>


        {/* Ana ızgara: sol sidebar + saÄŸ içerik */}
        <div className="grid gap-6 xl:grid-cols-[360px_1fr] items-start">

          {/* Sol â€“ Yapışkan Sidebar */}
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
                {(selectedCell === "Pres Hücresi" || selectedCell === "ETM Hücresi") && (
                  <button
                    type="button"
                    className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                      activeSidebarTab === "molds"
                        ? "border-blue-600 text-blue-600 bg-white"
                        : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                    }`}
                    onClick={() => setActiveSidebarTab("molds")}
                  >
                    <span>{selectedCell === "Pres Hücresi" ? "Kalıplar" : "Takımlar (ETM)"}</span>
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        activeSidebarTab === "molds" ? "bg-blue-100 text-blue-700" : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {selectedCell === "Pres Hücresi" ? moldChanges.length : etmToolChanges.length}
                    </span>
                  </button>
                )}
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
                    clearAllOverrides={clearAllOverrides}
                    selectedCell={selectedCell}
                    cellState={cellInitialState[selectedCell] || {}}
                    onCellStateChange={(key, val) =>
                      setCellInitialState((prev) => ({
                        ...prev,
                        [selectedCell]: { ...(prev[selectedCell] || {}), [key]: val },
                      }))
                    }
                    cellStateConfig={CELL_STATE_CONFIG[selectedCell] || []}
                  />
                )}
                {activeSidebarTab === "molds" && (
                  selectedCell === "ETM Hücresi" ? (
                    <EtmToolsSidebar
                      toolChanges={etmToolChanges}
                      onSaveToolChange={handleSaveToolChange}
                      onDeleteToolChange={handleDeleteToolChange}
                    />
                  ) : (
                    <MoldChangesSidebar
                      startDate={startDate}
                      moldChanges={moldChanges}
                      setMoldChanges={setMoldChanges}
                      schedule={schedule}
                    />
                  )
                )}
                {activeSidebarTab === "params" && (
                  <ParamsSidebar
                    params={scheduleParams}
                    setParams={setScheduleParams}
                    selectedCell={selectedCell}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* SaÄŸ â€“ Metrikler + içerik */}
          <div className="flex flex-col gap-6">
            <OperationsActionPanel
              schedule={schedule}
              cellName={selectedCell}
              periodGap={periodGap}
              overrides={overrides}
              moldChanges={moldChanges}
              processParams={processParams}
              etmToolChanges={etmToolChanges}
            />

            {/* Günlük simülasyon tablosu */}
            <ScheduleTable
              schedule={schedule}
              overrides={overrides}
              actuals={actuals}
              wipOutgoing={wipOutgoing}
              updateOverride={updateOverride}
              clearDayOverride={clearDayOverride}
              cellName={selectedCell}
              moldChanges={moldChanges}
              setMoldChanges={setMoldChanges}
              processParams={processParams}
              etmToolChanges={etmToolChanges}
            />

            <details className="group rounded-lg border border-zinc-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-zinc-900">
                <span>Planlama ve analiz araçları</span>
                <span className="text-xs font-semibold text-zinc-500 group-open:hidden">Aç</span>
                <span className="hidden text-xs font-semibold text-zinc-500 group-open:inline">Kapat</span>
              </summary>
              <div className="flex flex-col gap-6 border-t border-zinc-100 p-4">
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
                label={selectedCell === "ROB108 Hücresi" ? "Dönem ROB108 çıktısı" : isEtmCell ? "Dönem ETM çıktısı" : "Dönem pres çıktısı"}
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
                label={isEtmCell || selectedCell === "ROB108 Hücresi" ? "Gün sonu WIP" : "Aynı gün ETM hazır"}
                value={isEtmCell || selectedCell === "ROB108 Hücresi" ? (latestEtmWipEnd !== null ? formatNumber(latestEtmWipEnd) : "—") : formatNumber(periodSameDayReady)}
                note={selectedCell === "ROB108 Hücresi" ? "ETM çıkışı + başlangıç WIP sonrası devreden stok" : isEtmCell ? "Pres çıkışı + başlangıç WIP sonrası devreden stok" : "Normalizasyon gecikmesi dahil"}
                color="blue"
              />
              <MetricCard
                icon={<Hammer />}
                label={isEtmCell || selectedCell === "ROB108 Hücresi" ? "Takım / palet duruşu" : "Kalıp duruşu"}
                value={`${formatNumber(Math.round(maintenanceHours))} saat`}
                note={firstRiskDay ? `${firstRiskDay.label}: ${firstRiskDay.maintenanceLabel}` : (isEtmCell || selectedCell === "ROB108 Hücresi" ? "Takım/palet duruşu yok" : "Planlı duruş yok")}
                color="amber"
              />
              <MetricCard
                icon={<Layers />}
                label={downstreamCell ? `${downstreamCell}'ye giden stok` : "Giden stok"}
                value={wipMetricValue !== null ? formatNumber(wipMetricValue) : "—"}
                note="Kümülatif birikmiş stok"
                color={wipMetricValue !== null && wipMetricValue > 0 ? "blue" : "amber"}
              />
                </div>

             {/* Kayıp Analizi ve Ã–neriler */}
            <LossAnalysisPanel
              schedule={schedule}
              cycleTime={selectedCell === "Pres Hücresi" ? 3 : (570 / (allCellParams[selectedCell]?.gunluk_max_kapasite ?? 100))}
              cellName={selectedCell}
            />

            {/* Bilgi paneli */}
            <InfoPanel cellName={selectedCell} processParams={processParams} />
              </div>
            </details>


          </div>
        </div>
      </div>
    </main>
  );
}
