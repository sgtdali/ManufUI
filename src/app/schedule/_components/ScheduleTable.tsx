"use client";

import { Fragment, useState, useEffect } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { deleteMoldChange, saveMoldChange, type MoldChange } from "../actions";
import { DEFAULT_DIE_COOLING_MINUTES, SHIFT_MINUTES } from "../constants";
import type { CustomGanttItem, DayPlan, DayOverride, GanttDependency, ToolChangeItem } from "../types";
import { formatNumber, formatTimeFromMinutes, numberInput, parseTime, type ProcessParams } from "../utils";

type Props = {
  schedule: DayPlan[];
  overrides: Record<string, DayOverride>;
  actuals: Record<string, number>;
  wipOutgoing: Record<string, number | null>;
  updateOverride: (key: string, patch: DayOverride) => void;
  clearDayOverride: (key: string) => void;
  cellName?: string;
  moldChanges: MoldChange[];
  setMoldChanges: (v: MoldChange[]) => void;
  processParams?: ProcessParams;
  etmToolChanges?: ToolChangeItem[];
};


type GanttSegment = {
  id: string;
  label: string;
  start: number;
  end: number;
  className: string;
  note?: string;
  editable?: "furnace" | "press" | "shift" | "mold-maintenance" | "mold-maintenance-male" | "mold-maintenance-female" | "mold-maintenance-ring" | "die-cooling";
};


const GANTT_ROWS = [
  "Vardiya",
  "Fırın Isıtma",
  "Kalıp Isıtma",
  "İndüksiyon Başlangıç",
  "Erkek Kalıp Değişimi",
  "Dişi Kalıp Değişimi",
  "HIP Ring Değişimi",
  "Pres Proses",
  "Kalıp Soğutma",
  "Arıza / Duruş",
];

const FIXED_GANTT_ROW = "Vardiya";
const DEFAULT_MOVABLE_GANTT_ROWS = GANTT_ROWS.filter((rowLabel) => rowLabel !== FIXED_GANTT_ROW);
const ROW_LABEL_TO_SEGMENT_ID: Record<string, string> = {
  "Fırın Isıtma": "furnace-warmup",
  "Kalıp Isıtma": "die-heat",
  "İndüksiyon Başlangıç": "induction-start",
  "Erkek Kalıp Değişimi": "mold-maintenance-male",
  "Dişi Kalıp Değişimi": "mold-maintenance-female",
  "HIP Ring Değişimi": "mold-maintenance-ring",
  "Pres Proses": "press-process",
  "Kalıp Soğutma": "die-cooling",
  "ETM-1 Proses": "press-process",
  "ETM-2 Proses": "press-process",
  "ETM-1 Kesici Uç": "etm-cutting-stops",
  "ETM-2 Kesici Uç": "etm-cutting-stops",
  "ETM-1 Punta Matkabı": "etm-drill-stops",
  "ETM-2 Punta Matkabı": "etm-drill-stops",
  "Palet": "etm-palet-stops",
  "Takım / Palet Duruşu": "tool-maintenance",
  "Cell1 Proses": "rob108-c1-proses",
  "Cell2 ROB108 Proses": "rob108-c2r108-proses",
  "Cell2 ROB104 Proses": "rob108-c2r104-proses",
};

function unwrapTime(value: string | null, afterMinute?: number) {
  const minute = value ? parseTime(value) : null;
  if (minute === null) return null;
  if (afterMinute !== undefined && minute < afterMinute) return minute + 1440;
  return minute;
}

function createTimeSlots(startMinute: number, endMinute: number) {
  const slots: number[] = [];
  for (let cursor = startMinute; cursor <= endMinute; cursor += 60) {
    slots.push(cursor);
  }
  return slots;
}

function segmentStyle(segment: GanttSegment, startMinute: number, endMinute: number) {
  const total = Math.max(endMinute - startMinute, 1);
  const left = ((segment.start - startMinute) / total) * 100;
  const width = ((segment.end - segment.start) / total) * 100;
  return {
    left: `${Math.max(0, Math.min(left, 100))}%`,
    width: `${Math.max(1.5, Math.min(width, 100 - left))}%`,
  };
}

function segmentPercent(minute: number, startMinute: number, endMinute: number) {
  const total = Math.max(endMinute - startMinute, 1);
  return clamp(((minute - startMinute) / total) * 100, 0, 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function snapToQuarter(minutes: number) {
  return Math.round(minutes / 15) * 15;
}

export function buildGanttSegments(
  day: DayPlan,
  cellName: string,
  moldChangesForDay: MoldChange[],
  dayOverride?: DayOverride,
  processParams?: ProcessParams,
  toolChangesForDay: ToolChangeItem[] = []
): { startMinute: number; endMinute: number; segments: GanttSegment[] } {
  const isPress = cellName === "Pres Hücresi";
  const isEtm = cellName === "ETM Hücresi";
  const isRob108 = cellName === "ROB108 Hücresi";
  const disabledList = dayOverride?.disabledSegments ?? [];
  const baseShiftStart = unwrapTime(day.shiftStart) ?? 465;
  const baseShiftEnd = unwrapTime(day.shiftEnd, baseShiftStart) ?? baseShiftStart + Math.max(day.availableMinutes, 570);

  const furnaceStart = unwrapTime(day.furnaceStart, baseShiftStart - 180) ?? baseShiftStart;
  const rawPressStart = unwrapTime(day.pressStartTime, baseShiftStart);

  const initMaintenanceStart = unwrapTime(dayOverride?.moldMaintenanceStart ?? null) ?? baseShiftStart;
  const initStartMaintenanceMinutes = day.startMaintenanceMinutes ?? 0;
  const initHasMoldMaintenance = isPress && (initStartMaintenanceMinutes > 0 || moldChangesForDay.length > 0);
  const initFallbackMaintenanceEnd = Math.min(initMaintenanceStart + 30, baseShiftEnd);
  const initMaintenanceEnd =
    initHasMoldMaintenance && initStartMaintenanceMinutes > 0
      ? Math.min(initMaintenanceStart + initStartMaintenanceMinutes, baseShiftEnd)
      : initFallbackMaintenanceEnd;

  const initDieHeatStart = Math.min(
    Math.max(furnaceStart + 60, initHasMoldMaintenance ? initMaintenanceEnd : baseShiftStart),
    baseShiftEnd
  );
  const initDieHeatEnd = Math.min(initDieHeatStart + 60, baseShiftEnd);

  let pressStart = rawPressStart;
  if (isPress && pressStart !== null && !disabledList.includes("die-heat") && pressStart < initDieHeatEnd) {
    pressStart = initDieHeatEnd;
  }
  
  const productionStart = isPress ? pressStart : baseShiftStart;
  const midMaintMinutes = day.midMaintenanceMinutes ?? 0;
  const midMaintStart = day.midMaintenanceStartMinute ?? null;
  const midMaintEnd =
    midMaintStart !== null && midMaintMinutes > 0
      ? midMaintStart + midMaintMinutes
      : null;
  const pressCount = (isPress && day.capacityPressed !== undefined) ? day.capacityPressed : day.pressed;
  const productionMinutes = (isPress || isEtm) ? pressCount * 3 : isRob108 ? 0 : Math.min(day.availableMinutes, baseShiftEnd - baseShiftStart);
  const uninterruptedProductionEnd =
    productionStart !== null ? productionStart + Math.max(productionMinutes, 0) : null;
  const productionCrossesMidMaintenance =
    isPress &&
    productionStart !== null &&
    uninterruptedProductionEnd !== null &&
    midMaintStart !== null &&
    midMaintEnd !== null &&
    midMaintStart > productionStart &&
    midMaintStart < uninterruptedProductionEnd &&
    !disabledList.includes("mold-maintenance");
  const canResumeAfterMidMaintenance = productionCrossesMidMaintenance && day.midMaintenanceComplete;
  const productionEnd =
    uninterruptedProductionEnd !== null
      ? productionCrossesMidMaintenance
        ? canResumeAfterMidMaintenance
          ? uninterruptedProductionEnd + midMaintMinutes
          : midMaintStart
        : uninterruptedProductionEnd
      : null;

  const coolingMinutes = Math.max(dayOverride?.dieCoolingMinutes ?? DEFAULT_DIE_COOLING_MINUTES, 0);
  const coolEnd = (productionEnd !== null && day.pressed > 0) ? productionEnd + coolingMinutes : null;

  const customItems = dayOverride?.customGanttItems ?? [];

  // 1. Pass: expand the visible timeline to cover all active items.
  // Keep the actual shift segment tied to baseShiftStart/baseShiftEnd below.
  let shiftStart = baseShiftStart;
  let shiftEnd = baseShiftEnd;

  if (!disabledList.includes("furnace-warmup")) {
    shiftStart = Math.min(shiftStart, furnaceStart);
    shiftEnd = Math.max(shiftEnd, furnaceStart + 60);
  }
  if (!disabledList.includes("mold-maintenance") && initHasMoldMaintenance) {
    shiftStart = Math.min(shiftStart, initMaintenanceStart);
    shiftEnd = Math.max(shiftEnd, initMaintenanceEnd);
  }
  if (!disabledList.includes("mold-maintenance") && midMaintStart !== null && midMaintEnd !== null) {
    shiftStart = Math.min(shiftStart, midMaintStart);
    shiftEnd = Math.max(shiftEnd, midMaintEnd);
  }
  if (!disabledList.includes("press-process") && productionEnd !== null) {
    if (isPress && pressStart !== null) {
      shiftStart = Math.min(shiftStart, pressStart - 30);
    }
    shiftEnd = Math.max(shiftEnd, productionEnd);
  }
  if (isEtm && day.maintenanceMinutes > 0 && productionEnd !== null && !disabledList.includes("tool-maintenance")) {
    shiftEnd = Math.max(shiftEnd, productionEnd + day.maintenanceMinutes);
  }
  if (isRob108) {
    // Cell1 ve Cell2 simülasyonları birbirinden bağımsız koşar ve her biri vardiya süresini dolduracak şekilde tasarlandı
    shiftEnd = Math.max(shiftEnd, baseShiftEnd);
  }
  if (!disabledList.includes("die-cooling") && isPress && coolingMinutes > 0 && coolEnd !== null) {
    shiftEnd = Math.max(shiftEnd, coolEnd);
  }
  for (const item of customItems) {
    const itemStart = unwrapTime(item.startTime, baseShiftStart);
    if (itemStart !== null) {
      shiftStart = Math.min(shiftStart, itemStart);
      shiftEnd = Math.max(shiftEnd, itemStart + Math.max(item.durationMinutes, 0));
    }
  }

  // 2. Pass: Now compute final segment locations using the expanded shift boundaries
  const startMinute = Math.floor(Math.min(furnaceStart, shiftStart) / 60) * 60;
  const endMinute = Math.max(Math.ceil(shiftEnd / 60) * 60, 1380); // En az 23:00'e kadar çizilsin ki sürükleme alanı olsun

  const segments: GanttSegment[] = [];
  const hasMoldMaintenance = isPress && (day.maintenanceMinutes > 0 || moldChangesForDay.length > 0);
  const maintenanceStart = unwrapTime(dayOverride?.moldMaintenanceStart ?? null) ?? baseShiftStart;
  const startMaintMinutes = day.startMaintenanceMinutes ?? 0;
  const startMaintDuration = startMaintMinutes > 0 ? startMaintMinutes : (moldChangesForDay.length > 0 ? 30 : 0);
  const hasStartMoldMaintenance = startMaintDuration > 0;
  const maintenanceEnd = Math.min(maintenanceStart + startMaintDuration, shiftEnd);

  segments.push({
    id: "shift",
    label: "Vardiya",
    start: baseShiftStart,
    end: baseShiftEnd,
    className: "bg-zinc-300",
    note: `${formatTimeFromMinutes(baseShiftStart)} - ${formatTimeFromMinutes(baseShiftEnd)}`,
    editable: "shift",
  });

  if (isPress) {
    const warmupEnd = Math.min(furnaceStart + 60, endMinute);
    if (!disabledList.includes("furnace-warmup")) {
      segments.push({
        id: "furnace-warmup",
        label: "Fırın Isıtma",
        start: furnaceStart,
        end: warmupEnd,
        className: "bg-amber-400",
        note: `${formatTimeFromMinutes(furnaceStart)} - ${formatTimeFromMinutes(warmupEnd)}`,
        editable: "furnace",
      });
    }

    const dieHeatStart = Math.min(
      Math.max(furnaceStart + 60, hasStartMoldMaintenance && !disabledList.includes("mold-maintenance") ? maintenanceEnd : shiftStart),
      shiftEnd
    );
    const dieHeatEnd = Math.min(dieHeatStart + 60, shiftEnd);
    if (dieHeatEnd > dieHeatStart && !disabledList.includes("die-heat")) {
      segments.push({
        id: "die-heat",
        label: "Kalıp Isıtma",
        start: dieHeatStart,
        end: dieHeatEnd,
        className: "bg-red-500",
        note: hasStartMoldMaintenance
          ? `Kalıp değişimi bitince: ${formatTimeFromMinutes(dieHeatStart)} - ${formatTimeFromMinutes(dieHeatEnd)}`
          : `${formatTimeFromMinutes(dieHeatStart)} - ${formatTimeFromMinutes(dieHeatEnd)}`,
      });
    }

    if (pressStart !== null && !disabledList.includes("press-process")) {
      const inductionEnd = pressStart;
      const inductionStart = Math.max(inductionEnd - 30, shiftStart);
      if (inductionEnd > inductionStart && !disabledList.includes("induction-start")) {
        segments.push({
          id: "induction-start",
          label: "İndüksiyon Başlangıç",
          start: inductionStart,
          end: inductionEnd,
          className: "bg-red-800",
          note: `${formatTimeFromMinutes(inductionStart)} - ${formatTimeFromMinutes(inductionEnd)}`,
        });
      }
    }
  }

  if (isPress) {
    const moldLabels = moldChangesForDay.map((change) => change.mold_type === "male" ? "Erkek" : change.mold_type === "female" ? "Dişi" : "Ring");
    
    // 1. Start-of-day maintenance segments
    if (startMaintDuration > 0) {
      const femaleDuration = day.femaleMaintMinutes ?? 0;
      const maleDuration = day.maleMaintMinutes ?? 0;
      const ringDuration = day.ringMaintMinutes ?? 0;

      // Female Segment
      if (femaleDuration > 0 && !disabledList.includes("mold-maintenance-female") && !disabledList.includes("mold-maintenance")) {
        const segEnd = Math.min(maintenanceStart + femaleDuration, shiftEnd);
        segments.push({
          id: "mold-maintenance-start-female",
          label: "Dişi Kalıp Değişimi",
          start: maintenanceStart,
          end: segEnd,
          className: "bg-purple-500",
          note: `Dişi Kalıp Değişimi · ${femaleDuration} dk`,
          editable: "mold-maintenance-female",
        });
      }

      // Male Segment (starts after female completes because they are sequential)
      if (maleDuration > 0 && !disabledList.includes("mold-maintenance-male") && !disabledList.includes("mold-maintenance")) {
        const maleStart = maintenanceStart + femaleDuration;
        const segEnd = Math.min(maleStart + maleDuration, shiftEnd);
        segments.push({
          id: "mold-maintenance-start-male",
          label: "Erkek Kalıp Değişimi",
          start: maleStart,
          end: segEnd,
          className: "bg-sky-500",
          note: `Erkek Kalıp Değişimi · ${maleDuration} dk`,
          editable: "mold-maintenance-male",
        });
      }

      // Ring Segment (runs in parallel with the female + male sequence)
      if (ringDuration > 0 && !disabledList.includes("mold-maintenance-ring") && !disabledList.includes("mold-maintenance")) {
        const segEnd = Math.min(maintenanceStart + ringDuration, shiftEnd);
        segments.push({
          id: "mold-maintenance-start-ring",
          label: "HIP Ring Değişimi",
          start: maintenanceStart,
          end: segEnd,
          className: "bg-amber-500",
          note: `HIP Ring Değişimi · ${ringDuration} dk`,
          editable: "mold-maintenance-ring",
        });
      }
    }

    // 2. Mid-day maintenance segment
    if (midMaintMinutes > 0 && midMaintStart !== null) {
      const endMaint = Math.min(midMaintStart + midMaintMinutes, shiftEnd);
      let midType: "male" | "female" | "ring" = "male";
      if (day.maintenanceLabel.includes("Ring") && !day.maintenanceLabel.startsWith("HIP Ring")) {
        midType = "ring";
      } else if (day.maintenanceLabel.includes("Dişi") && day.maintenanceLabel.includes("Erkek")) {
        midType = "male";
      } else if (day.maintenanceLabel.endsWith("Dişi kalıp değişimi")) {
        midType = "female";
      } else if (day.maintenanceLabel.endsWith("HIP Ring değişimi")) {
        midType = "ring";
      } else if (day.maintenanceLabel.endsWith("Erkek kalıp değişimi")) {
        midType = "male";
      }

      const segId = `mold-maintenance-${midType}`;
      if (!disabledList.includes(segId) && !disabledList.includes("mold-maintenance")) {
        segments.push({
          id: `mold-maintenance-mid-${midType}`,
          label: midType === "female" ? "Dişi Kalıp Değişimi" : midType === "male" ? "Erkek Kalıp Değişimi" : "HIP Ring Değişimi",
          start: midMaintStart,
          end: endMaint,
          className: midType === "female" ? "bg-purple-500" : midType === "ring" ? "bg-amber-500" : "bg-sky-500",
          note: `Ara ${midType === "female" ? "Dişi" : midType === "male" ? "Erkek" : "Ring"} Değişimi · ${midMaintMinutes} dk`,
          editable: `mold-maintenance-${midType}` as any,
        });
      }
    }
  }

  if (!isEtm && !isRob108 && productionStart !== null && productionEnd !== null && productionEnd > productionStart && !disabledList.includes("press-process")) {
    const productionSegments =
      productionCrossesMidMaintenance && midMaintStart !== null && midMaintEnd !== null
        ? canResumeAfterMidMaintenance
          ? [
              { id: "press-process-before-maintenance", start: productionStart, end: midMaintStart },
              { id: "press-process-after-maintenance", start: midMaintEnd, end: productionEnd },
            ].filter((segment) => segment.end > segment.start)
          : [{ id: "press-process-before-maintenance", start: productionStart, end: midMaintStart }]
        : [{ id: "press-process", start: productionStart, end: productionEnd }];

    for (const segment of productionSegments) {
      segments.push({
        id: segment.id,
        label: isPress ? "Pres Proses" : isEtm ? "ETM Proses" : "Proses",
        start: segment.start,
        end: segment.end,
        className: "bg-lime-500",
        note: `${formatNumber(day.pressed)} adet`,
        editable: segment.id === "press-process" ? "press" : undefined,
      });
    }
  }

  if (isEtm && productionEnd !== null) {
    let currentMinute = productionStart ?? baseShiftStart;
    const parts = day.pressed;
    const etmSegments: GanttSegment[] = [];

    const cuttingInsertInterval = processParams?.cuttingInsertInterval ?? 10;
    const cuttingInsertChangeMinutes = processParams?.cuttingInsertChangeMinutes ?? 5;
    const drillBitInterval = processParams?.drillBitInterval ?? 300;
    const drillBitChangeMinutes = processParams?.drillBitChangeMinutes ?? 10;
    const paletInterval = processParams?.paletInterval ?? 20;
    const paletChangeMinutes = processParams?.paletChangeMinutes ?? 10;
    const hatCycleMinutes = processParams?.hatCycleMinutes ?? 3;

    // Draw manual tool changes first
    for (const change of toolChangesForDay) {
      const isCutting = change.tool_type === "cutting_insert";
      const isDrill = change.tool_type === "drill_bit";
      const duration = isCutting ? cuttingInsertChangeMinutes : isDrill ? drillBitChangeMinutes : 0;
      if (duration === 0) continue;

      const label = change.machine === "ETM-1"
        ? (isCutting ? "ETM-1 Kesici Uç" : "ETM-1 Punta Matkabı")
        : (isCutting ? "ETM-2 Kesici Uç" : "ETM-2 Punta Matkabı");

      const className = isCutting ? "bg-orange-400" : "bg-amber-500";
      const note = change.description ? `Manuel: ${change.description}` : `Manuel ${label}`;

      etmSegments.push({
        id: `manual-${change.machine}-${change.tool_type}-${day.key}`,
        label,
        start: currentMinute,
        end: currentMinute + duration,
        className,
        note,
      });

      currentMinute += duration;
    }

    let etm1CutRemaining = day.etm1CuttingStart ?? cuttingInsertInterval;
    let etm2CutRemaining = day.etm2CuttingStart ?? cuttingInsertInterval;
    let etm1DrillRemaining = day.etm1DrillStart ?? drillBitInterval;
    let etm2DrillRemaining = day.etm2DrillStart ?? drillBitInterval;

    let activeProses1: GanttSegment | null = null;
    let activeProses2: GanttSegment | null = null;

    for (let p = 1; p <= parts; p++) {
      const isMachine1 = p % 2 === 1;

      if (isMachine1) {
        if (activeProses1) {
          activeProses1.end = currentMinute + hatCycleMinutes;
        } else {
          activeProses1 = {
            id: `etm1-proses-${p}`,
            label: "ETM-1 Proses",
            start: currentMinute,
            end: currentMinute + hatCycleMinutes,
            className: "bg-lime-500",
            note: "",
            editable: undefined,
          };
          etmSegments.push(activeProses1);
        }
      } else {
        if (activeProses2) {
          activeProses2.end = currentMinute + hatCycleMinutes;
        } else {
          activeProses2 = {
            id: `etm2-proses-${p}`,
            label: "ETM-2 Proses",
            start: currentMinute,
            end: currentMinute + hatCycleMinutes,
            className: "bg-lime-500",
            note: "",
            editable: undefined,
          };
          etmSegments.push(activeProses2);
        }
      }
      currentMinute += hatCycleMinutes;

      let cellWideStop = false;
      let machine1Stop = false;
      let machine2Stop = false;

      if (isMachine1) {
        // ETM-1 (odd parts)
        etm1CutRemaining--;
        if (etm1CutRemaining <= 0) {
          if (!disabledList.includes("etm-cutting-stops")) {
            etmSegments.push({
              id: `etm1-cut-${p}`,
              label: "ETM-1 Kesici Uç",
              start: currentMinute,
              end: currentMinute + cuttingInsertChangeMinutes,
              className: "bg-orange-400",
              note: `ETM-1 Kesici Uç`,
            });
            currentMinute += cuttingInsertChangeMinutes;
            machine1Stop = true;
          }
          etm1CutRemaining = cuttingInsertInterval;
        }

        etm1DrillRemaining--;
        if (etm1DrillRemaining <= 0) {
          if (!disabledList.includes("etm-drill-stops")) {
            etmSegments.push({
              id: `etm1-drill-${p}`,
              label: "ETM-1 Punta Matkabı",
              start: currentMinute,
              end: currentMinute + drillBitChangeMinutes,
              className: "bg-amber-500",
              note: `ETM-1 Punta Matkabı`,
            });
            currentMinute += drillBitChangeMinutes;
            machine1Stop = true;
          }
          etm1DrillRemaining = drillBitInterval;
        }
      } else {
        // ETM-2 (even parts)
        etm2CutRemaining--;
        if (etm2CutRemaining <= 0) {
          if (!disabledList.includes("etm-cutting-stops")) {
            etmSegments.push({
              id: `etm2-cut-${p}`,
              label: "ETM-2 Kesici Uç",
              start: currentMinute,
              end: currentMinute + cuttingInsertChangeMinutes,
              className: "bg-orange-400",
              note: `ETM-2 Kesici Uç`,
            });
            currentMinute += cuttingInsertChangeMinutes;
            machine2Stop = true;
          }
          etm2CutRemaining = cuttingInsertInterval;
        }

        etm2DrillRemaining--;
        if (etm2DrillRemaining <= 0) {
          if (!disabledList.includes("etm-drill-stops")) {
            etmSegments.push({
              id: `etm2-drill-${p}`,
              label: "ETM-2 Punta Matkabı",
              start: currentMinute,
              end: currentMinute + drillBitChangeMinutes,
              className: "bg-amber-500",
              note: `ETM-2 Punta Matkabı`,
            });
            currentMinute += drillBitChangeMinutes;
            machine2Stop = true;
          }
          etm2DrillRemaining = drillBitInterval;
        }
      }

      if (p % paletInterval === 0 && !disabledList.includes("etm-palet-stops")) {
        etmSegments.push({
          id: `etm-palet-${p}`,
          label: "Palet",
          start: currentMinute,
          end: currentMinute + paletChangeMinutes,
          className: "bg-yellow-400",
          note: `Palet`,
        });
        currentMinute += paletChangeMinutes;
        cellWideStop = true;
      }

      if (cellWideStop || machine1Stop || machine2Stop) {
        activeProses1 = null;
        activeProses2 = null;
      }
    }

    // Set notes (piece counts) for processes based on their durations
    for (const s of etmSegments) {
      if (s.label.endsWith("Proses")) {
        const count = Math.round((s.end - s.start + hatCycleMinutes) / (hatCycleMinutes * 2));
        s.note = `${count} adet`;
      }
    }

    // Mark the last ETM Proses segment as editable for time/quantity dragging
    const lastProses = [...etmSegments].reverse().find(s => s.label.endsWith("Proses"));
    if (lastProses) {
      lastProses.editable = "press";
    }

    segments.push(...etmSegments);
  }

  if (isRob108 && day.isWorkday) {
    const rob108Cycle = processParams?.rob108CycleMinutes || 15;
    const rob104Cycle = processParams?.rob104CycleMinutes || 3;
    const toolInterval = processParams?.rob108ToolInterval || 5;
    const toolChangeDur = processParams?.rob108ToolChangeDuration || 10;
    const rob104ToolInterval = processParams?.rob104ToolInterval || 5;
    const rob104ToolChangeDur = processParams?.rob104ToolChangeDuration || 10;
    const paletSize = processParams?.rob108PaletSize || 20;
    const paletChangeDur = processParams?.rob108PaletChangeDuration || 10;
    const rob108TicksPerPart = Math.round(rob108Cycle / rob104Cycle);

    const cell1Avail = day.rob108Cell1AvailableMinutes || 0;
    const cell2Avail = day.rob108Cell2AvailableMinutes || 0;
    const c1L1 = day.rob108Cell1L1ToolStart || toolInterval;
    const c1L2 = day.rob108Cell1L2ToolStart || toolInterval;
    const c1L3 = day.rob108Cell1L3ToolStart || toolInterval;
    const c2R108L1 = day.rob108Cell2Rob108L1ToolStart || toolInterval;
    const c2R108L2 = day.rob108Cell2Rob108L2ToolStart || toolInterval;
    const c2R104L1 = day.rob108Cell2Rob104L1ToolStart || toolInterval;
    const c2R104L2 = day.rob108Cell2Rob104L2ToolStart || toolInterval;

    // ── Cell 1: 3 ROB108 tornası, her 15 dk'da 3 parça eş zamanlı ──────────
    {
      let wt = baseShiftStart;
      let tr1 = c1L1, tr2 = c1L2, tr3 = c1L3;
      let coll = 0;
      let c1PaletDone = 0;
      let activeSeg: GanttSegment | null = null;
      const totalTicks = Math.floor(cell1Avail / rob108Cycle);
      for (let i = 0; i < totalTicks; i++) {
        if (activeSeg) {
          activeSeg.end = wt + rob108Cycle;
        } else {
          activeSeg = { id: `c1-prod-${i}`, label: "Cell1 Proses", start: wt, end: wt + rob108Cycle, className: "bg-lime-500", note: "" };
          segments.push(activeSeg);
        }
        wt += rob108Cycle;
        coll += 3; tr1--; tr2--; tr3--;
        let stop = false;
        let stepPaletDT = 0;
        let stepToolDT = 0;

        const paletsNeeded = Math.floor(coll / paletSize);
        if (paletsNeeded > c1PaletDone) {
          stepPaletDT = 2 * paletChangeDur;
        }

        let t1Need = tr1 <= 0;
        let t2Need = tr2 <= 0;
        let t3Need = tr3 <= 0;
        let numTools = (t1Need ? 1 : 0) + (t2Need ? 1 : 0) + (t3Need ? 1 : 0);
        stepToolDT = numTools * toolChangeDur;

        if (stepPaletDT > 0 || stepToolDT > 0) {
          const stepDowntime = Math.max(stepPaletDT, stepToolDT);

          if (paletsNeeded > c1PaletDone) {
            segments.push({ id: `c1-pi-${i}`, label: "Cell1 Proses", start: wt, end: wt + paletChangeDur, className: "bg-yellow-400", note: "Giriş palet" });
            segments.push({ id: `c1-po-${i}`, label: "Cell1 Proses", start: wt + paletChangeDur, end: wt + 2 * paletChangeDur, className: "bg-yellow-500", note: "Çıkış palet" });
            c1PaletDone = paletsNeeded;
          }

          let twt = wt;
          if (t1Need) {
            segments.push({ id: `c1-t1-${i}`, label: "Cell1 Proses", start: twt, end: twt + toolChangeDur, className: "bg-orange-400", note: "T1 takım" });
            twt += toolChangeDur; tr1 = toolInterval;
          }
          if (t2Need) {
            segments.push({ id: `c1-t2-${i}`, label: "Cell1 Proses", start: twt, end: twt + toolChangeDur, className: "bg-orange-500", note: "T2 takım" });
            twt += toolChangeDur; tr2 = toolInterval;
          }
          if (t3Need) {
            segments.push({ id: `c1-t3-${i}`, label: "Cell1 Proses", start: twt, end: twt + toolChangeDur, className: "bg-orange-600", note: "T3 takım" });
            twt += toolChangeDur; tr3 = toolInterval;
          }

          wt += stepDowntime;
          stop = true;
        }
        if (stop) activeSeg = null;
      }
      shiftEnd = Math.max(shiftEnd, wt);
    }

    // ── Cell 2: 2 ROB108 (15dk) + 2 ROB104 (3dk), paylaşımlı robot ─────────
    {
      let wt = baseShiftStart;
      const r108Rem = [c2R108L1, c2R108L2];
      const r104Rem = [c2R104L1, c2R104L2];
      let r108Coll = 0, r104Coll = 0, r108Tick = 0;
      let activeR108: GanttSegment | null = null;
      let activeR104: GanttSegment | null = null;
      const totalTicks = Math.floor(cell2Avail / rob104Cycle);
      for (let tick = 0; tick < totalTicks; tick++) {
        r108Tick++;
        const isR108Part = r108Tick >= rob108TicksPerPart;
        // Extend both production rows
        if (activeR108) { activeR108.end = wt + rob104Cycle; } else {
          activeR108 = { id: `c2r108-${tick}`, label: "Cell2 ROB108 Proses", start: wt, end: wt + rob104Cycle, className: "bg-lime-400", note: "" };
          segments.push(activeR108);
        }
        if (activeR104) { activeR104.end = wt + rob104Cycle; } else {
          activeR104 = { id: `c2r104-${tick}`, label: "Cell2 ROB104 Proses", start: wt, end: wt + rob104Cycle, className: "bg-teal-400", note: "" };
          segments.push(activeR104);
        }
        wt += rob104Cycle;
        r104Coll += 2; r104Rem[0]--; r104Rem[1]--;
        if (isR108Part) { r108Coll += 2; r108Rem[0]--; r108Rem[1]--; r108Tick = 0; }
        let stop = false;

        let stepPaletDT = 0;
        let stepToolDT = 0;

        let r104PaletNeed = r104Coll > 0 && r104Coll % paletSize === 0;
        if (r104PaletNeed) stepPaletDT += 2 * paletChangeDur;

        let r108PaletNeed = isR108Part && r108Coll > 0 && r108Coll % paletSize === 0;
        if (r108PaletNeed) stepPaletDT += 2 * paletChangeDur;

        let r104T1Need = r104Rem[0] <= 0;
        let r104T2Need = r104Rem[1] <= 0;
        stepToolDT += (r104T1Need ? 1 : 0) * rob104ToolChangeDur + (r104T2Need ? 1 : 0) * rob104ToolChangeDur;

        let r108T1Need = isR108Part && r108Rem[0] <= 0;
        let r108T2Need = isR108Part && r108Rem[1] <= 0;
        stepToolDT += (r108T1Need ? 1 : 0) * toolChangeDur + (r108T2Need ? 1 : 0) * toolChangeDur;

        if (stepPaletDT > 0 || stepToolDT > 0) {
          const stepDowntime = Math.max(stepPaletDT, stepToolDT);

          // ROB104 palet
          if (r104PaletNeed) {
            segments.push({ id: `c2r104-pi-${tick}`, label: "Cell2 ROB104 Proses", start: wt, end: wt + paletChangeDur, className: "bg-yellow-400", note: "ROB104 giriş" });
            segments.push({ id: `c2r104-po-${tick}`, label: "Cell2 ROB104 Proses", start: wt + paletChangeDur, end: wt + 2 * paletChangeDur, className: "bg-yellow-400", note: "ROB104 çıkış" });
            segments.push({ id: `c2r104-pi2-${tick}`, label: "Cell2 ROB108 Proses", start: wt, end: wt + 2 * paletChangeDur, className: "bg-yellow-400", note: "ROB104 palet (durdurdu)" });
          }
          // ROB108 palet
          if (r108PaletNeed) {
            const offset = r104PaletNeed ? 2 * paletChangeDur : 0;
            segments.push({ id: `c2r108-pi-${tick}`, label: "Cell2 ROB108 Proses", start: wt + offset, end: wt + offset + paletChangeDur, className: "bg-yellow-300", note: "ROB108 giriş" });
            segments.push({ id: `c2r108-po-${tick}`, label: "Cell2 ROB108 Proses", start: wt + offset + paletChangeDur, end: wt + offset + 2 * paletChangeDur, className: "bg-yellow-300", note: "ROB108 çıkış" });
            segments.push({ id: `c2r108-pi2-${tick}`, label: "Cell2 ROB104 Proses", start: wt + offset, end: wt + offset + 2 * paletChangeDur, className: "bg-yellow-300", note: "ROB108 palet (durdurdu)" });
          }

          let twt = wt;
          // ROB104 takım
          if (r104T1Need) {
            segments.push({ id: `c2r104-t1-${tick}`, label: "Cell2 ROB104 Proses", start: twt, end: twt + rob104ToolChangeDur, className: "bg-orange-400", note: "ROB104 T1" });
            segments.push({ id: `c2r104-t1b-${tick}`, label: "Cell2 ROB108 Proses", start: twt, end: twt + rob104ToolChangeDur, className: "bg-orange-400", note: "ROB104 T1 (durdurdu)" });
            twt += rob104ToolChangeDur; r104Rem[0] = rob104ToolInterval;
          }
          if (r104T2Need) {
            segments.push({ id: `c2r104-t2-${tick}`, label: "Cell2 ROB104 Proses", start: twt, end: twt + rob104ToolChangeDur, className: "bg-orange-500", note: "ROB104 T2" });
            segments.push({ id: `c2r104-t2b-${tick}`, label: "Cell2 ROB108 Proses", start: twt, end: twt + rob104ToolChangeDur, className: "bg-orange-500", note: "ROB104 T2 (durdurdu)" });
            twt += rob104ToolChangeDur; r104Rem[1] = rob104ToolInterval;
          }
          // ROB108 takım
          if (r108T1Need) {
            segments.push({ id: `c2r108-t1-${tick}`, label: "Cell2 ROB108 Proses", start: twt, end: twt + toolChangeDur, className: "bg-blue-400", note: "ROB108 T1" });
            segments.push({ id: `c2r108-t1b-${tick}`, label: "Cell2 ROB104 Proses", start: twt, end: twt + toolChangeDur, className: "bg-blue-400", note: "ROB108 T1 (durdurdu)" });
            twt += toolChangeDur; r108Rem[0] = toolInterval;
          }
          if (r108T2Need) {
            segments.push({ id: `c2r108-t2-${tick}`, label: "Cell2 ROB108 Proses", start: twt, end: twt + toolChangeDur, className: "bg-blue-500", note: "ROB108 T2" });
            segments.push({ id: `c2r108-t2b-${tick}`, label: "Cell2 ROB104 Proses", start: twt, end: twt + toolChangeDur, className: "bg-blue-500", note: "ROB108 T2 (durdurdu)" });
            twt += toolChangeDur; r108Rem[1] = toolInterval;
          }

          wt += stepDowntime;
          stop = true;
        }
        if (stop) { activeR108 = null; activeR104 = null; }
      }
      shiftEnd = Math.max(shiftEnd, wt);
    }
  }

  const coolStart = (productionEnd !== null && day.pressed > 0) ? productionEnd : null;
  if (isPress && coolStart !== null && coolEnd !== null && coolingMinutes > 0 && coolEnd > coolStart && !disabledList.includes("die-cooling")) {
    segments.push({
      id: "die-cooling",
      label: "Kalıp Soğutma",
      start: coolStart,
      end: coolEnd,
      className: "bg-blue-500",
      editable: "die-cooling" as const,
      note: `${formatTimeFromMinutes(coolStart)} - ${formatTimeFromMinutes(coolEnd)} (${coolingMinutes} dk)`,
    });
  }

  for (const item of customItems) {
    const itemStart = unwrapTime(item.startTime, shiftStart);
    const duration = Math.max(Math.floor(item.durationMinutes), 0);
    if (itemStart === null || duration <= 0 || !item.label.trim()) continue;

    segments.push({
      id: `custom-${item.id}`,
      label: item.label.trim(),
      start: itemStart,
      end: itemStart + duration,
      className: "bg-teal-500",
      note: `${formatTimeFromMinutes(itemStart)} - ${formatTimeFromMinutes(itemStart + duration)} (${duration} dk)`,
    });
  }



  if (day.breakdownMinutes > 0) {
    const breakdownStart = Math.max(shiftStart, Math.min(shiftEnd - day.breakdownMinutes, productionStart ?? shiftStart));
    segments.push({
      id: "breakdown",
      label: "Arıza / Duruş",
      start: breakdownStart,
      end: breakdownStart + day.breakdownMinutes,
      className: "bg-rose-500",
      note: day.breakdownDetails.join(", ") || `${day.breakdownMinutes} dk`,
    });
  }

  return { startMinute, endMinute, segments: segments.filter(seg => !disabledList.includes(seg.id)) };
}

export function ScheduleTable({ schedule, overrides, actuals, wipOutgoing, updateOverride, clearDayOverride, cellName = "Pres Hücresi", moldChanges, setMoldChanges, processParams, etmToolChanges }: Props) {
  const isPress = cellName === "Pres Hücresi";
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);
  const [pendingMoldKey, setPendingMoldKey] = useState<string | null>(null);
  const [ganttRowOrder, setGanttRowOrder] = useState<string[]>(DEFAULT_MOVABLE_GANTT_ROWS);
  const [draggedRowLabel, setDraggedRowLabel] = useState<string | null>(null);

  useEffect(() => {
    if (cellName === "Pres Hücresi") {
      setGanttRowOrder(DEFAULT_MOVABLE_GANTT_ROWS);
    } else if (cellName === "ROB108 Hücresi") {
      setGanttRowOrder(["Cell1 Proses", "Cell2 ROB108 Proses", "Cell2 ROB104 Proses"]);
    } else if (cellName === "ETM Hücresi") {
      setGanttRowOrder([
        "ETM-1 Proses",
        "ETM-1 Kesici Uç",
        "ETM-1 Punta Matkabı",
        "ETM-2 Proses",
        "ETM-2 Kesici Uç",
        "ETM-2 Punta Matkabı",
        "Palet",
        "Arıza / Duruş",
      ]);
    } else {
      setGanttRowOrder([
        "Proses",
        "Arıza / Duruş",
      ]);
    }
  }, [cellName]);

  const isEtm = cellName === "ETM Hücresi";
  const isRob108Cell = cellName === "ROB108 Hücresi";
  const visibleColumnCount = isPress ? 7 : isEtm ? 8 : 7;

  const addMoldChange = async (day: DayPlan, moldType: "male" | "female") => {
    setPendingMoldKey(`${day.key}-${moldType}`);
    const res = await saveMoldChange(
      day.key,
      moldType,
      `${day.label} Gantt panelinden eklendi`
    );
    setPendingMoldKey(null);

    if (!res.success || !res.data) {
      toast.error(`Kalıp değişimi kaydedilemedi: ${res.error}`);
      return;
    }

    setMoldChanges([
      ...moldChanges.filter((change) => !(change.tarih === day.key && change.mold_type === moldType)),
      res.data as MoldChange,
    ].sort((a, b) => a.tarih.localeCompare(b.tarih)));
    toast.success(`${moldType === "male" ? "Erkek" : "Dişi"} kalıp değişimi plana işlendi.`);
  };

  const removeMoldChange = async (change: MoldChange) => {
    setPendingMoldKey(change.id);
    const res = await deleteMoldChange(change.id);
    setPendingMoldKey(null);

    if (!res.success) {
      toast.error(`Kalıp değişimi silinemedi: ${res.error}`);
      return;
    }

    setMoldChanges(moldChanges.filter((item) => item.id !== change.id));
    toast.success("Kalıp değişimi plandan kaldırıldı.");
  };



  const moveGanttRow = (targetRowLabel: string) => {
    if (!draggedRowLabel || draggedRowLabel === targetRowLabel || targetRowLabel === FIXED_GANTT_ROW) return;

    setGanttRowOrder((current) => {
      const withoutDragged = current.filter((rowLabel) => rowLabel !== draggedRowLabel);
      const targetIndex = withoutDragged.indexOf(targetRowLabel);
      if (targetIndex < 0) return current;

      const next = [...withoutDragged];
      next.splice(targetIndex, 0, draggedRowLabel);
      return next;
    });
    setDraggedRowLabel(null);
  };

  const addCustomGanttItem = (day: DayPlan, form: HTMLFormElement) => {
    const fd = new FormData(form);
    const label = String(fd.get("label") ?? "").trim();
    const startTime = String(fd.get("startTime") ?? "");
    const durationMinutes = Math.max(Math.floor(numberInput(String(fd.get("durationMinutes") ?? ""))), 0);

    if (!label || !startTime || durationMinutes <= 0) {
      toast.error("Madde adı, başlangıç saati ve süre zorunludur.");
      return;
    }

    const item: CustomGanttItem = {
      id: `${day.key}-${Date.now()}`,
      label,
      startTime,
      durationMinutes,
    };

    updateOverride(day.key, {
      customGanttItems: [...(overrides[day.key]?.customGanttItems ?? []), item],
    });
    setGanttRowOrder((current) => current.includes(label) ? current : [...current, label]);
    form.reset();
    toast.success(`${label} Gantt'a eklendi.`);
  };

  const removeCustomGanttItem = (day: DayPlan, itemId: string) => {
    const nextItems = (overrides[day.key]?.customGanttItems ?? []).filter((item) => item.id !== itemId);
    updateOverride(day.key, { customGanttItems: nextItems.length > 0 ? nextItems : undefined });
  };

  const beginSegmentDrag = (
    event: ReactPointerEvent<HTMLElement>,
    day: DayPlan,
    segment: GanttSegment,
    gantt: { startMinute: number; endMinute: number },
    mode: "move" | "resize-start" | "resize-end",
  ) => {
    if (!segment.editable || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const track = event.currentTarget.closest(".relative.min-h-7");
    if (!track) return;

    const targetEl = event.currentTarget;
    try {
      targetEl.setPointerCapture(event.pointerId);
    } catch (err) {
      console.error("Failed to set pointer capture", err);
    }

    const rect = track.getBoundingClientRect();
    const minutesPerPixel = (gantt.endMinute - gantt.startMinute) / Math.max(rect.width, 1);
    const originX = event.clientX;
    const originalStart = segment.start;
    const originalEnd = segment.end;
    const originalDuration = Math.max(originalEnd - originalStart, 15);
    // Capture configured (not dynamic) shift bounds at drag start
    const shiftStart = unwrapTime(overrides[day.key]?.shiftStart ?? day.shiftStart) ?? gantt.startMinute;
    const shiftEnd = unwrapTime(overrides[day.key]?.shiftEnd ?? day.shiftEnd, shiftStart) ?? gantt.endMinute;
    const furnaceStart = unwrapTime(overrides[day.key]?.furnaceStart ?? day.furnaceStart, shiftStart - 180) ?? shiftStart;
    // Use a fixed late-night ceiling so stale gantt.endMinute doesn't cap drags
    const MAX_MINUTE = 1439; // 23:59

    const applyDrag = (clientX: number) => {
      const delta = snapToQuarter((clientX - originX) * minutesPerPixel);

      if (segment.editable === "furnace") {
        const nextStart = clamp(furnaceStart + delta, 0, MAX_MINUTE - 15);
        updateOverride(day.key, { furnaceStart: formatTimeFromMinutes(nextStart) });
        return;
      }

      if (segment.editable === "press") {
        if (mode === "resize-end") {
          // Allow dragging well past shift end for overtime — ceiling is midnight
          const nextEnd = clamp(originalEnd + delta, originalStart + 15, MAX_MINUTE);
          updateOverride(day.key, { pressed: Math.max(Math.floor((nextEnd - originalStart) / 3), 0) });
          return;
        }

        // Move: infer the required furnace start without tying it to the shift window.
        const nextStart = clamp(originalStart + delta, gantt.startMinute, MAX_MINUTE - originalDuration);
        const pressDelta = nextStart - originalStart;
        updateOverride(day.key, { furnaceStart: formatTimeFromMinutes(clamp(furnaceStart + pressDelta, 0, MAX_MINUTE - 15)) });
        return;
      }

      if (segment.editable?.startsWith("mold-maintenance")) {
        if (mode === "resize-end") {
          const nextEnd = clamp(originalEnd + delta, originalStart + 15, MAX_MINUTE);
          const newDuration = Math.round(nextEnd - originalStart);
          const type = segment.id.includes("female")
            ? "female"
            : segment.id.includes("male")
              ? "male"
              : "ring";
          
          if (type === "female") {
            updateOverride(day.key, { femaleChangeMinutes: newDuration });
          } else if (type === "male") {
            updateOverride(day.key, { maleChangeMinutes: newDuration });
          } else {
            updateOverride(day.key, { ringChangeMinutes: newDuration });
          }
          return;
        }

        const nextStart = clamp(originalStart + delta, gantt.startMinute, shiftEnd - originalDuration);
        const patch: DayOverride = {};
        if (segment.id.includes("-mid-")) {
          if ((overrides[day.key]?.moldChangeMode ?? "auto") === "manual") {
            const pressStart = unwrapTime(day.pressStartTime, shiftStart);
            const coolingMinutes = Math.max(overrides[day.key]?.dieCoolingMinutes ?? DEFAULT_DIE_COOLING_MINUTES, 0);
            if (pressStart !== null) {
              patch.manualMoldChangeAfterPieces = Math.max(Math.floor((nextStart - coolingMinutes - pressStart) / 3), 0);
            }
          }
        } else {
          patch.moldMaintenanceStart = formatTimeFromMinutes(nextStart);
        }
        updateOverride(day.key, patch);
        return;
      }

      if (segment.editable === "die-cooling") {
        if (mode === "resize-end") {
          const nextEnd = clamp(originalEnd + delta, originalStart + 15, MAX_MINUTE);
          updateOverride(day.key, { dieCoolingMinutes: Math.round(nextEnd - originalStart) });
        }
        return;
      }

      if (segment.editable === "shift") {
        if (mode === "resize-start") {
          const nextStart = clamp(originalStart + delta, gantt.startMinute, originalEnd - 15);
          updateOverride(day.key, { shiftStart: formatTimeFromMinutes(nextStart), overtimeMinutes: 0 });
          return;
        }

        if (mode === "resize-end") {
          const nextEnd = Math.max(originalEnd + delta, originalStart + 15);
          updateOverride(day.key, { shiftEnd: formatTimeFromMinutes(nextEnd), overtimeMinutes: 0 });
          return;
        }

        const nextStart = clamp(originalStart + delta, gantt.startMinute, gantt.endMinute - originalDuration);
        updateOverride(day.key, {
          shiftStart: formatTimeFromMinutes(nextStart),
          shiftEnd: formatTimeFromMinutes(nextStart + originalDuration),
          overtimeMinutes: 0,
        });
      }
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      applyDrag(moveEvent.clientX);
    };

    const onPointerUp = () => {
      try {
        targetEl.releasePointerCapture(event.pointerId);
      } catch (err) {}
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
    };

    const onPointerCancel = () => {
      try {
        targetEl.releasePointerCapture(event.pointerId);
      } catch (err) {}
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel, { once: true });
  };

  return (
    <Card className="rounded-xl shadow-sm border-zinc-200 overflow-hidden bg-white">
      <CardHeader className="border-b border-zinc-100 pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold text-zinc-800 uppercase tracking-wider">
          Günlük {cellName} Planı Simülasyonu
        </CardTitle>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Supabase Verisi
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Senaryo / Elle Girilen
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50/70">
                <th className="py-2.5 pl-3 pr-1.5 font-semibold">Gün</th>
                <th className="px-3 py-2.5 font-semibold">Üretim / Hedef</th>
                <th className="px-3 py-2.5 text-right font-semibold">Fark</th>
                <th className="px-3 py-2.5 text-right font-semibold">F.Mesai</th>
                {(isPress || cellName === "ETM Hücresi") && (
                  <th className="px-3 py-2.5 text-center font-semibold">
                    {isPress ? "Kalıp" : "Takımlar (ETM)"}
                  </th>
                )}
                {cellName !== "Pres Hücresi" && (
                  <th className="px-3 py-2.5 text-center font-semibold">
                    WIP (Başla → Bitir)
                  </th>
                )}
                <th className="px-3 py-2.5 font-semibold text-rose-500">Arıza</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Sıfırla</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((day) => {
                const isRowDisabled = !day.isWorkday;
                const isExpanded = expandedDayKey === day.key;
                const maleRisk = isPress && day.maleRemainingEnd <= 100;
                const femaleRisk = isPress && day.femaleRemainingEnd <= 300;
                const isWeekend = day.label.includes("Cumartesi") || day.label.includes("Pazar");
                const moldChangesForDay = moldChanges.filter((change) => change.tarih === day.key);
                const hasMaleMoldChange = moldChangesForDay.some((change) => change.mold_type === "male");
                const hasFemaleMoldChange = moldChangesForDay.some((change) => change.mold_type === "female");
                const customGanttItems = overrides[day.key]?.customGanttItems ?? [];
                const toolChangesForDay = (etmToolChanges ?? []).filter((change) => change.tarih === day.key);
                const gantt = buildGanttSegments(day, cellName, moldChangesForDay, overrides[day.key], processParams, toolChangesForDay);
                const timeSlots = createTimeSlots(gantt.startMinute, gantt.endMinute);

                const customGanttRows = Array.from(new Set(gantt.segments.map((segment) => segment.label)))
                  .filter((label) => !GANTT_ROWS.includes(label));
                const disabledList = overrides[day.key]?.disabledSegments ?? [];
                const visibleGanttRows = [
                  FIXED_GANTT_ROW,
                  ...ganttRowOrder,
                  ...customGanttRows.filter((label) => !ganttRowOrder.includes(label)),
                ].filter((rowLabel) => {
                  if (rowLabel === "Arıza / Duruş") {
                    return gantt.segments.some((segment) => segment.label === rowLabel);
                  }
                  const segmentId = ROW_LABEL_TO_SEGMENT_ID[rowLabel];
                  if (segmentId && disabledList.includes(segmentId)) {
                    return false;
                  }
                  return true;
                });
                const inputCls =
                  "bg-transparent border-transparent hover:bg-zinc-100/80 hover:border-zinc-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded shadow-none text-xs font-medium disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent";

                // Derive displayed shift times from the Gantt shift segment (single source of truth)
                const shiftSegment = gantt.segments.find((s) => s.id === "shift");
                const displayShiftStart = shiftSegment
                  ? formatTimeFromMinutes(shiftSegment.start)
                  : (overrides[day.key]?.shiftStart ?? day.shiftStart ?? "");
                const displayShiftEnd = shiftSegment
                  ? formatTimeFromMinutes(shiftSegment.end)
                  : (overrides[day.key]?.shiftEnd ?? day.shiftEnd ?? "");
                // Overtime = how much shift exceeds the override/default configured end
                const standardShiftDuration = day.isBaseWorkday ? SHIFT_MINUTES : 480;
                const actualDuration = shiftSegment ? Math.max(shiftSegment.end - shiftSegment.start, 0) : day.availableMinutes;
                const displayOvertime = Math.max(actualDuration - standardShiftDuration, 0);
                const displayShiftDuration = shiftSegment ? actualDuration : day.availableMinutes;

                return (
                  <Fragment key={day.key}>
                  <tr
                    className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 transition-colors ${
                      !day.isWorkday ? "bg-zinc-50/40 text-zinc-400 opacity-75" : ""
                    } ${isExpanded ? "bg-blue-50/30" : ""}`}
                  >
                    <td className="py-2 pl-3 pr-1.5 font-semibold text-zinc-900 text-xs">
                      <button
                        type="button"
                        className="group flex w-full items-center gap-2 text-left"
                        aria-expanded={isExpanded}
                        aria-controls={`gantt-${day.key}`}
                        onClick={() => setExpandedDayKey((current) => (current === day.key ? null : day.key))}
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-hover:text-blue-600 ${
                            isExpanded ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                        <span className="flex flex-col">
                          <span>{day.label}</span>
                          {isWeekend && <span className="text-[9px] text-zinc-400 font-normal">Hafta Sonu</span>}
                        </span>
                      </button>
                    </td>
                    {/* ── Üretim / Hedef progress cell ── */}
                    <td className="px-3 py-2">
                      {day.isWorkday ? (
                        <div className="flex flex-col gap-0.5 min-w-[120px]">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className={`text-xs font-bold ${
                              day.source === "scenario" ? "text-blue-700" :
                              day.source === "actual" ? "text-emerald-700" : "text-zinc-800"
                            }`}>{formatNumber(day.pressed)}</span>
                            <span className="text-[10px] text-zinc-400 font-medium">/ {formatNumber(day.target)}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                day.pressed >= day.target ? "bg-emerald-500" :
                                day.pressed >= day.target * 0.85 ? "bg-amber-400" : "bg-rose-400"
                              }`}
                              style={{ width: `${Math.min(100, day.target > 0 ? (day.pressed / day.target) * 100 : 0)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-300 text-xs">Tatil</span>
                      )}
                    </td>

                    {/* ── Fark ── */}
                    <td className="px-3 py-2 text-right">
                      {day.isWorkday ? (
                        <span className={`text-xs font-bold ${
                          day.targetGap > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}>
                          {day.targetGap > 0 ? `-${formatNumber(day.targetGap)}` : `+${formatNumber(Math.abs(day.targetGap))}`}
                        </span>
                      ) : <span className="text-zinc-300">—</span>}
                    </td>

                    {/* ── Fazla Mesai ── */}
                    <td className="px-3 py-2 text-right">
                      {displayOvertime > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          +{displayOvertime} dk
                        </span>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>

                    {/* ── Kalıp ömrü (sadece Pres) ── */}
                    {isPress && (
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              maleRisk ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
                            }`}
                            title="Erkek kalıp kalan"
                          >
                            E {formatNumber(day.maleRemainingEnd)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              femaleRisk ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
                            }`}
                            title="Dişi kalıp kalan"
                          >
                            D {formatNumber(day.femaleRemainingEnd)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              day.ringRemainingEnd <= 300 ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
                            }`}
                            title="HIP Ring kalan"
                          >
                            R {formatNumber(day.ringRemainingEnd)}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* ── Takım ömrü (sadece ETM) ── */}
                    {cellName === "ETM Hücresi" && (
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              (day.etm1CuttingRemainingEnd ?? 0) <= 2 ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
                            }`}
                            title="ETM-1 Kesici Uç kalan"
                          >
                            E1-K {day.etm1CuttingRemainingEnd ?? 0}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              (day.etm2CuttingRemainingEnd ?? 0) <= 2 ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
                            }`}
                            title="ETM-2 Kesici Uç kalan"
                          >
                            E2-K {day.etm2CuttingRemainingEnd ?? 0}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              (day.etm1DrillRemainingEnd ?? 0) <= 50 ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
                            }`}
                            title="ETM-1 Matkap kalan"
                          >
                            E1-M {day.etm1DrillRemainingEnd ?? 0}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              (day.etm2DrillRemainingEnd ?? 0) <= 50 ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
                            }`}
                            title="ETM-2 Matkap kalan"
                          >
                            E2-M {day.etm2DrillRemainingEnd ?? 0}
                          </span>
                        </div>
                      </td>
                    )}

                    {cellName !== "Pres Hücresi" && (() => {
                      const wipStart = cellName === "ETM Hücresi" ? (day.etmWipStart ?? null)
                        : cellName === "ROB108 Hücresi" ? (day.rob108WipStart ?? null)
                        : null;
                      const wipEnd = cellName === "ETM Hücresi" ? (day.etmWipEnd ?? null)
                        : cellName === "ROB108 Hücresi" ? (day.rob108WipEnd ?? null)
                        : null;
                      return (
                        <td className="px-3 py-2 text-center">
                          {wipStart !== null && wipEnd !== null ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <span
                                className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-700"
                                title="Gün başı WIP"
                              >
                                {wipStart}
                              </span>
                              <span className="text-zinc-400">→</span>
                              <span
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  wipEnd === 0 ? "bg-amber-50 border border-amber-200 text-amber-700" : "bg-zinc-100 text-zinc-600"
                                }`}
                                title="Gün sonu WIP"
                              >
                                {wipEnd}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-300 text-xs">—</span>
                          )}
                        </td>
                      );
                    })()}

                    {/* ── Arıza ── */}
                    <td className="px-3 py-2">
                      {day.breakdownMinutes > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700 cursor-help"
                          title={day.breakdownDetails.join("\n")}
                        >
                          {day.breakdownMinutes} dk
                        </span>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>

                    {/* ── Sıfırla ── */}
                    <td className="py-2 pr-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-blue-600 rounded hover:bg-zinc-100 transition-colors"
                        disabled={!overrides[day.key]}
                        onClick={() => clearDayOverride(day.key)}
                        title="Satır senaryosunu temizle"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-zinc-200 bg-zinc-50/80">
                      <td colSpan={visibleColumnCount} className="px-3 py-3 max-w-0">
                        <div id={`gantt-${day.key}`} className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                {day.label} Gantt Detayı
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                Vardiya {displayShiftStart} - {displayShiftEnd} ({displayShiftDuration} dk kullanılabilir süre)
                                {displayOvertime > 0 ? ` + ${displayOvertime} dk fazla mesai` : ""}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-zinc-600">
                              <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1">
                                Üretim: {formatNumber(day.pressed)}
                              </span>
                              <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1">
                                Kapasite: {formatNumber(day.capacityPressed)}
                              </span>
                              {isPress && day.lastFurnaceExitTime && (
                                <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1">
                                  Fırın Son Çıkış: {day.lastFurnaceExitTime}
                                </span>
                              )}
                              {day.breakdownMinutes > 0 && (
                                <span className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                                  Arıza: {day.breakdownMinutes} dk
                                </span>
                              )}
                            </div>
                          </div>

                          {isPress && (
                            <div className="mb-3 flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                  Kalip Degisim Modu
                                </label>
                                <select
                                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700"
                                  disabled={isRowDisabled}
                                  value={overrides[day.key]?.moldChangeMode ?? "auto"}
                                  onChange={(e) => {
                                    const mode = e.target.value as DayOverride["moldChangeMode"];
                                    updateOverride(day.key, {
                                      moldChangeMode: mode === "auto" ? undefined : mode,
                                      postponeMaleChange: mode === "postpone" ? true : undefined,
                                      postponeFemaleChange: mode === "postpone" ? true : undefined,
                                      postponeRingChange: mode === "postpone" ? true : undefined,
                                      manualMoldType: mode === "manual" ? (overrides[day.key]?.manualMoldType ?? "male") : undefined,
                                      manualMoldChangeAfterPieces:
                                        mode === "manual"
                                          ? (overrides[day.key]?.manualMoldChangeAfterPieces ?? Math.max(day.pressed, 0))
                                          : undefined,
                                    });
                                  }}
                                >
                                  <option value="auto">Otomatik</option>
                                  <option value="postpone">Ertele / Zorla</option>
                                  <option value="manual">Elle Planla</option>
                                </select>
                              </div>

                              {(overrides[day.key]?.moldChangeMode ?? "auto") === "manual" && (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kalip</label>
                                    <select
                                      className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700"
                                      disabled={isRowDisabled}
                                      value={overrides[day.key]?.manualMoldType ?? "male"}
                                      onChange={(e) => updateOverride(day.key, { manualMoldType: e.target.value as any })}
                                    >
                                      <option value="male">Erkek</option>
                                      <option value="female">Dişi</option>
                                      <option value="ring">HIP Ring</option>
                                      <option value="male+ring">Erkek + HIP Ring</option>
                                      <option value="female+ring">Dişi + HIP Ring</option>
                                    </select>
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kac parcadan sonra</label>
                                    <Input
                                      className="h-8 w-28 bg-white text-right text-xs font-semibold"
                                      disabled={isRowDisabled}
                                      min={0}
                                      type="number"
                                      value={overrides[day.key]?.manualMoldChangeAfterPieces ?? ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        updateOverride(day.key, {
                                          manualMoldChangeAfterPieces:
                                            value === "" ? undefined : Math.max(Math.floor(numberInput(value)), 0),
                                        });
                                      }}
                                    />
                                  </div>
                                </>
                              )}

                              {(overrides[day.key]?.moldChangeMode ?? "auto") === "postpone" && (
                                <p className="pb-1 text-[11px] font-semibold text-amber-700">
                                  Kalip omru asilabilir; kalan omur negatif gosterilir.
                                </p>
                              )}
                            </div>
                          )}
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            {isPress && (
                              <label className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
                                <span>Fırın başlangıç</span>
                                <Input
                                  className="h-6 w-24 bg-white px-1.5 text-xs font-semibold"
                                  disabled={isRowDisabled}
                                  type="time"
                                  value={overrides[day.key]?.furnaceStart ?? day.furnaceStart}
                                  onChange={(e) => updateOverride(day.key, { furnaceStart: e.target.value || undefined })}
                                />
                              </label>
                            )}
                            <label className="flex h-8 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 cursor-pointer select-none">
                              <input
                                checked={day.isWorkday}
                                className="h-3.5 w-3.5 accent-blue-700 disabled:opacity-50"
                                disabled={day.isBaseWorkday}
                                type="checkbox"
                                onChange={(e) =>
                                  updateOverride(day.key, { forceWorkday: e.target.checked ? true : undefined })
                                }
                              />
                              Çalış
                            </label>
                            {(() => {
                              const dVal = new Date(day.date);
                              const isWeekend = dVal.getDay() === 5 || dVal.getDay() === 6;
                              if (isWeekend && day.isWorkday) {
                                return (
                                  <label className="flex h-8 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 cursor-pointer select-none">
                                    <input
                                      checked={overrides[day.key]?.disabledOperations?.includes("weekend-process-enabled") || false}
                                      className="h-3.5 w-3.5 accent-blue-700 cursor-pointer"
                                      type="checkbox"
                                      onChange={(e) => {
                                        const currentDisabledOps = overrides[day.key]?.disabledOperations || [];
                                        const nextDisabledOps = e.target.checked
                                          ? [...currentDisabledOps.filter((op) => op !== "weekend-process-enabled"), "weekend-process-enabled"]
                                          : currentDisabledOps.filter((op) => op !== "weekend-process-enabled");
                                        updateOverride(day.key, { disabledOperations: nextDisabledOps });
                                      }}
                                    />
                                    Proses Yapılsın
                                  </label>
                                );
                              }
                              return null;
                            })()}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              disabled={!overrides[day.key]}
                              onClick={() => clearDayOverride(day.key)}
                            >
                              Sıfırla
                            </Button>
                          </div>




                          <div className="mb-3 rounded-md border border-zinc-200 bg-white p-2">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                Gün Bazlı Gantt Maddeleri
                              </p>
                              <span className="text-[11px] text-zinc-500">
                                Standart şablona ek olarak sadece bu gün için görünür.
                              </span>
                            </div>

                            <form
                              className="grid gap-2 md:grid-cols-[1fr_120px_110px_auto]"
                              onSubmit={(e) => {
                                e.preventDefault();
                                addCustomGanttItem(day, e.currentTarget);
                              }}
                            >
                              <Input
                                className="h-8 text-xs"
                                name="label"
                                placeholder="Madde adı"
                                disabled={isRowDisabled}
                              />
                              <Input
                                key={day.shiftStart}
                                className="h-8 text-xs"
                                name="startTime"
                                type="time"
                                defaultValue={day.shiftStart}
                                disabled={isRowDisabled}
                              />
                              <Input
                                className="h-8 text-xs"
                                name="durationMinutes"
                                min={15}
                                step={15}
                                type="number"
                                placeholder="dk"
                                disabled={isRowDisabled}
                              />
                              <Button type="submit" size="sm" className="h-8 text-xs" disabled={isRowDisabled}>
                                <Plus className="mr-1 h-3 w-3" />
                                Ekle
                              </Button>
                            </form>

                            {customGanttItems.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {customGanttItems.map((item) => (
                                  <span
                                    key={item.id}
                                    className="inline-flex items-center gap-1 rounded border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-700"
                                  >
                                    {item.label} · {item.startTime} · {item.durationMinutes} dk
                                    <button
                                      type="button"
                                      className="rounded p-0.5 text-teal-500 hover:bg-white hover:text-rose-600"
                                      onClick={() => removeCustomGanttItem(day, item.id)}
                                      title="Maddeyi sil"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {overrides[day.key]?.disabledSegments && overrides[day.key].disabledSegments!.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Gizlenen Bloklar:</span>
                                {overrides[day.key].disabledSegments!.map((segId) => {
                                  let label = segId;
                                  if (segId === "furnace-warmup") label = "Fırın Isıtma";
                                  else if (segId === "die-heat") label = "Kalıp Isıtma";
                                  else if (segId === "induction-start") label = "İndüksiyon Başlangıç";
                                  else if (segId === "mold-maintenance") label = "Planlı Duruş / Kalıp Değişimi";
                                  else if (segId === "mold-maintenance-male") label = "Erkek Kalıp Değişimi";
                                  else if (segId === "mold-maintenance-female") label = "Dişi Kalıp Değişimi";
                                  else if (segId === "mold-maintenance-ring") label = "HIP Ring Değişimi";
                                  else if (segId === "press-process") label = "Pres Proses";
                                  else if (segId === "die-cooling") label = "Kalıp Soğutma";
                                  else if (segId === "breakdown") label = "Arıza / Duruş";

                                  return (
                                    <span
                                      key={segId}
                                      className="inline-flex items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700"
                                    >
                                      {label}
                                      <button
                                        type="button"
                                        className="rounded p-0.5 text-rose-500 hover:bg-white hover:text-emerald-600 cursor-pointer"
                                        onClick={() => {
                                          const nextDisabled = (overrides[day.key]?.disabledSegments ?? []).filter(
                                            (id) => id !== segId
                                          );
                                          const nextDisabledOperations = (overrides[day.key]?.disabledOperations ?? []).filter(
                                            (id) => id !== segId
                                          );
                                          updateOverride(day.key, {
                                            disabledSegments: nextDisabled.length > 0 ? nextDisabled : undefined,
                                            disabledOperations: nextDisabledOperations.length > 0 ? nextDisabledOperations : undefined,
                                          });
                                          toast.success(`${label} geri getirildi.`);
                                        }}
                                        title="Geri getir"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>



                          <div className="overflow-x-auto">
                            <div style={{ width: `${160 + (timeSlots.length - 1) * 72}px` }} className="min-w-full">
                              <div className="grid grid-cols-[160px_1fr] border border-zinc-900 text-[10px] font-bold">
                                <div className="border-r border-zinc-900 bg-zinc-50" />
                                <div
                                  className="relative grid"
                                  style={{ gridTemplateColumns: `repeat(${timeSlots.length - 1}, minmax(72px, 1fr))` }}
                                >
                                  {timeSlots.slice(0, -1).map((slot, index) => (
                                    <div key={slot} className="border-r border-zinc-900 px-1.5 py-1 text-center last:border-r-0">
                                      {formatTimeFromMinutes(slot)} - {formatTimeFromMinutes(timeSlots[index + 1])}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="relative">
                              {visibleGanttRows.map((rowLabel) => {
                                const rowSegments = gantt.segments.filter((segment) => segment.label === rowLabel);

                                return (
                                  <div
                                    key={rowLabel}
                                    className={`grid grid-cols-[160px_1fr] border-x border-b border-zinc-900 text-[11px] ${
                                      draggedRowLabel === rowLabel ? "bg-blue-50" : ""
                                    }`}
                                    onDragOver={(e) => {
                                      if (rowLabel !== FIXED_GANTT_ROW) e.preventDefault();
                                    }}
                                    onDrop={() => moveGanttRow(rowLabel)}
                                  >
                                    <div
                                      className={`border-r border-zinc-900 px-2 py-1.5 font-semibold text-zinc-900 ${
                                        rowLabel === FIXED_GANTT_ROW
                                          ? "bg-zinc-100"
                                          : "cursor-grab select-none bg-white active:cursor-grabbing"
                                      }`}
                                      draggable={rowLabel !== FIXED_GANTT_ROW}
                                      onDragEnd={() => setDraggedRowLabel(null)}
                                      onDragStart={(e) => {
                                        if (rowLabel === FIXED_GANTT_ROW) return;
                                        setDraggedRowLabel(rowLabel);
                                        e.dataTransfer.effectAllowed = "move";
                                        e.dataTransfer.setData("text/plain", rowLabel);
                                      }}
                                      title={rowLabel === FIXED_GANTT_ROW ? "Vardiya satırı sabit" : "Satırı taşımak için tutup sürükleyin"}
                                    >
                                      <span className="flex items-center justify-between w-full gap-1.5">
                                        <span className="flex items-center gap-1.5">
                                          {rowLabel !== FIXED_GANTT_ROW && (
                                            <span className="text-[10px] text-zinc-400">↕</span>
                                          )}
                                          {rowLabel}
                                        </span>
                                        {rowLabel !== FIXED_GANTT_ROW && rowSegments[0] && (
                                          <button
                                            type="button"
                                            className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 cursor-pointer transition-colors"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const segment = rowSegments[0];
                                              if (segment.id.startsWith("custom-")) {
                                                const nextItems = (overrides[day.key]?.customGanttItems ?? []).filter(
                                                  (item) => item.label.trim() !== rowLabel.trim()
                                                );
                                                updateOverride(day.key, {
                                                  customGanttItems: nextItems.length > 0 ? nextItems : undefined,
                                                });
                                              } else {
                                                const currentDisabled = overrides[day.key]?.disabledSegments ?? [];
                                                const disabledId = segment.id.startsWith("press-process")
                                                  ? "press-process"
                                                  : segment.id.includes("female")
                                                    ? "mold-maintenance-female"
                                                    : segment.id.includes("male")
                                                      ? "mold-maintenance-male"
                                                      : segment.id.includes("ring")
                                                        ? "mold-maintenance-ring"
                                                        : segment.id.startsWith("mold-maintenance")
                                                          ? "mold-maintenance"
                                                          : segment.id;
                                                const currentDisabledOperations = overrides[day.key]?.disabledOperations ?? [];
                                                const isMoldMaint = disabledId.startsWith("mold-maintenance");
                                                updateOverride(day.key, {
                                                  disabledSegments: [...currentDisabled, disabledId],
                                                  disabledOperations:
                                                    isMoldMaint
                                                      ? [...currentDisabledOperations.filter((id) => id !== disabledId), disabledId]
                                                      : currentDisabledOperations.length > 0 ? currentDisabledOperations : undefined,
                                                });
                                              }
                                              toast.success(`${rowLabel} satırı kaldırıldı.`);
                                            }}
                                            title={`${rowLabel} satırını sil`}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                      </span>
                                    </div>
                                    <div
                                      className="relative min-h-7 bg-white"
                                      style={{
                                        backgroundImage:
                                          "linear-gradient(to right, rgba(24,24,27,0.16) 1px, transparent 1px)",
                                        backgroundSize: "72px 100%",
                                      }}
                                    >
                                      {rowSegments.map((segment) => (
                                        <div
                                          key={segment.id}
                                          className={`absolute top-1 bottom-1 rounded-sm border border-black/10 ${segment.className} ${
                                            segment.editable ? "cursor-grab touch-none ring-1 ring-black/5 active:cursor-grabbing" : ""
                                          }`}
                                          style={segmentStyle(segment, gantt.startMinute, gantt.endMinute)}
                                          title={segment.note}
                                          onPointerDown={(e) => beginSegmentDrag(e, day, segment, gantt, "move")}
                                        >
                                          {segment.editable === "shift" && (
                                            <span
                                              className="absolute left-0 top-0 z-10 h-full w-2 cursor-ew-resize rounded-l-sm bg-black/20"
                                              onPointerDown={(e) => beginSegmentDrag(e, day, segment, gantt, "resize-start")}
                                              title="Vardiya başlangıcını sürükle"
                                            />
                                          )}
                                          {(segment.editable === "shift" || segment.editable === "press" || segment.editable === "die-cooling" || segment.editable?.startsWith("mold-maintenance")) && (
                                            <span
                                              className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize rounded-r-sm bg-black/20"
                                              onPointerDown={(e) => beginSegmentDrag(e, day, segment, gantt, "resize-end")}
                                              title={segment.editable === "press" ? "Üretim süresini/adedi sürükle" : segment.editable === "die-cooling" ? "Soğutma süresini ayarla" : segment.editable?.startsWith("mold-maintenance") ? "Kalıp/Ring değişim süresini sürükleyerek ayarla" : "Vardiya bitişini sürükle"}
                                            />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                               );
                              })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
