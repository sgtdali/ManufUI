"use client";

import { Fragment, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { deleteMoldChange, saveMoldChange, type MoldChange } from "../actions";
import type { CustomGanttItem, DayPlan, DayOverride, GanttDependency } from "../types";
import { formatNumber, formatTimeFromMinutes, numberInput, parseTime } from "../utils";

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
  dependencies: GanttDependency[];
  updateDayDependencies: (key: string, nextDeps: GanttDependency[]) => Promise<void>;
};


type GanttSegment = {
  id: string;
  label: string;
  start: number;
  end: number;
  className: string;
  note?: string;
  editable?: "furnace" | "press" | "shift" | "mold-maintenance" | "die-cooling";
};


const GANTT_ROWS = [

  "Vardiya",
  "Fırın Isıtma",
  "Kalıp Isıtma",
  "İndüksiyon Başlangıç",
  "Planlı Duruş / Kalıp Değişimi",
  "Pres Proses",
  "Kalıp Soğutma",
  "Arıza / Duruş",
];

const FIXED_GANTT_ROW = "Vardiya";
const DEFAULT_MOVABLE_GANTT_ROWS = GANTT_ROWS.filter((rowLabel) => rowLabel !== FIXED_GANTT_ROW);
const DEFAULT_DIE_COOLING_MINUTES = 90;

const ROW_LABEL_TO_SEGMENT_ID: Record<string, string> = {
  "Fırın Isıtma": "furnace-warmup",
  "Kalıp Isıtma": "die-heat",
  "İndüksiyon Başlangıç": "induction-start",
  "Planlı Duruş / Kalıp Değişimi": "mold-maintenance",
  "Pres Proses": "press-process",
  "Kalıp Soğutma": "die-cooling",
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

function buildGanttSegments(day: DayPlan, isPress: boolean, moldChangesForDay: MoldChange[], dayOverride?: DayOverride): { startMinute: number; endMinute: number; segments: GanttSegment[] } {
  const disabledList = dayOverride?.disabledSegments ?? [];
  const baseShiftStart = unwrapTime(day.shiftStart) ?? 465;
  const baseShiftEnd = unwrapTime(day.shiftEnd, baseShiftStart) ?? baseShiftStart + Math.max(day.availableMinutes, 570);

  const furnaceStart = unwrapTime(day.furnaceStart, baseShiftStart - 180) ?? baseShiftStart;
  const rawPressStart = unwrapTime(day.pressStartTime, baseShiftStart);

  const initMaintenanceStart = unwrapTime(dayOverride?.moldMaintenanceStart ?? null) ?? baseShiftStart;
  const initHasMoldMaintenance = isPress && (day.maintenanceMinutes > 0 || moldChangesForDay.length > 0);
  const initFallbackMaintenanceEnd = Math.min(initMaintenanceStart + 30, baseShiftEnd);
  const initMaintenanceEnd =
    initHasMoldMaintenance && day.maintenanceMinutes > 0
      ? Math.min(initMaintenanceStart + day.maintenanceMinutes, baseShiftEnd)
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
  const productionMinutes = isPress ? day.pressed * 3 : Math.min(day.availableMinutes, baseShiftEnd - baseShiftStart);
  const productionEnd =
    productionStart !== null ? productionStart + Math.max(productionMinutes, 0) : null;

  const coolingMinutes = Math.max(dayOverride?.dieCoolingMinutes ?? DEFAULT_DIE_COOLING_MINUTES, 0);
  const coolEnd = productionEnd !== null ? productionEnd + coolingMinutes : baseShiftEnd;

  const customItems = dayOverride?.customGanttItems ?? [];

  // 1. Pass: Calculate dynamic shiftStart and shiftEnd to cover all active items
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
  if (!disabledList.includes("press-process") && productionEnd !== null) {
    if (isPress && pressStart !== null) {
      shiftStart = Math.min(shiftStart, pressStart - 30);
    }
    shiftEnd = Math.max(shiftEnd, productionEnd);
  }
  if (!disabledList.includes("die-cooling") && isPress && coolingMinutes > 0) {
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
  const maintenanceEnd = Math.min(maintenanceStart + startMaintDuration, shiftEnd);

  segments.push({
    id: "shift",
    label: "Vardiya",
    start: shiftStart,
    end: shiftEnd,
    className: "bg-zinc-300",
    note: `${formatTimeFromMinutes(shiftStart)} - ${formatTimeFromMinutes(shiftEnd)}`,
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
      Math.max(furnaceStart + 60, hasMoldMaintenance && !disabledList.includes("mold-maintenance") ? maintenanceEnd : shiftStart),
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
        note: hasMoldMaintenance
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

  if (isPress && !disabledList.includes("mold-maintenance")) {
    const moldLabels = moldChangesForDay.map((change) => change.mold_type === "male" ? "Erkek" : "Dişi");
    
    // 1. Start-of-day maintenance segment
    if (startMaintDuration > 0) {
      segments.push({
        id: "mold-maintenance-start",
        label: "Planlı Duruş / Kalıp Değişimi",
        start: maintenanceStart,
        end: maintenanceEnd,
        className: moldChangesForDay.some((change) => change.mold_type === "female") ? "bg-purple-500" : "bg-sky-500",
        note: [
          day.maintenanceLabel !== "-" && startMaintMinutes > 0 ? day.maintenanceLabel : null,
          moldLabels.length > 0 ? `Kayıt: ${moldLabels.join(" + ")}` : null,
          startMaintMinutes > 0 ? `${startMaintMinutes} dk` : "Kayıtlı değişim",
        ].filter(Boolean).join(" · "),
        editable: "mold-maintenance",
      });
    }

    // 2. Mid-day maintenance segment
    const midMaintMinutes = day.midMaintenanceMinutes ?? 0;
    const midMaintStart = day.midMaintenanceStartMinute ?? null;
    if (midMaintMinutes > 0 && midMaintStart !== null) {
      const endMaint = Math.min(midMaintStart + midMaintMinutes, shiftEnd);
      segments.push({
        id: "mold-maintenance-mid",
        label: "Planlı Duruş / Kalıp Değişimi",
        start: midMaintStart,
        end: endMaint,
        className: "bg-sky-500",
        note: `Ara Kalıp Değişimi · ${midMaintMinutes} dk`,
      });
    }
  }

  if (productionStart !== null && productionEnd !== null && productionEnd > productionStart && !disabledList.includes("press-process")) {
    segments.push({
      id: "press-process",
      label: "Pres Proses",
      start: productionStart,
      end: productionEnd,
      className: "bg-lime-500",
      note: `${formatNumber(day.pressed)} adet`,
      editable: "press",
    });
  }

  const coolStart = productionEnd !== null ? productionEnd : Math.max(shiftEnd - coolingMinutes, shiftStart);
  if (isPress && coolingMinutes > 0 && coolEnd > coolStart && !disabledList.includes("die-cooling")) {
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

export function ScheduleTable({ schedule, overrides, actuals, wipOutgoing, updateOverride, clearDayOverride, cellName = "Pres Hücresi", moldChanges, setMoldChanges, dependencies, updateDayDependencies }: Props) {
  const isPress = cellName === "Pres Hücresi";
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);
  const [pendingMoldKey, setPendingMoldKey] = useState<string | null>(null);
  const [linkingDependency, setLinkingDependency] = useState<{

    dayKey: string;
    segmentId: string;
    segmentLabel: string;
  } | null>(null);
  const [ganttRowOrder, setGanttRowOrder] = useState<string[]>(DEFAULT_MOVABLE_GANTT_ROWS);
  const [draggedRowLabel, setDraggedRowLabel] = useState<string | null>(null);
  const visibleColumnCount = isPress ? 7 : 6;

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

  const beginDependencyLink = (
    event: ReactPointerEvent<HTMLElement>,
    day: DayPlan,
    segment: GanttSegment,
  ) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    setLinkingDependency({
      dayKey: day.key,
      segmentId: segment.id,
      segmentLabel: segment.label,
    });

    const onPointerUp = (upEvent: PointerEvent) => {
      const target = document
        .elementFromPoint(upEvent.clientX, upEvent.clientY)
        ?.closest<HTMLElement>("[data-gantt-endpoint='true']");

      setLinkingDependency(null);

      if (!target) return;
      if (target.dataset.dayKey !== day.key) return;

      const successorId = target.dataset.segmentId;
      const successorLabel = target.dataset.segmentLabel;
      if (!successorId || !successorLabel || successorId === segment.id) return;

      const dependency: GanttDependency = {
        id: `${day.key}:${segment.id}->${successorId}`,
        dayKey: day.key,
        predecessorId: segment.id,
        predecessorLabel: segment.label,
        successorId,
        successorLabel,
      };

      const dayDeps = dependencies.filter((d) => d.dayKey === day.key);
      const nextDayDeps = [
        ...dayDeps.filter((item) => item.id !== dependency.id),
        dependency,
      ];
      updateDayDependencies(day.key, nextDayDeps);
      toast.success(`${segment.label} öncül, ${successorLabel} ardıl olarak bağlandı.`);
    };

    document.addEventListener("pointerup", onPointerUp, { once: true });
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

    const track = event.currentTarget.parentElement;
    if (!track) return;

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
        const nextStart = clamp(furnaceStart + delta, gantt.startMinute, shiftEnd - 15);
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

        // Move: shift the whole press block (and furnace along with it)
        // Clamp to gantt area so overtime is possible
        const nextStart = clamp(originalStart + delta, gantt.startMinute, MAX_MINUTE - originalDuration);
        const pressDelta = nextStart - originalStart;
        updateOverride(day.key, { furnaceStart: formatTimeFromMinutes(furnaceStart + pressDelta) });
        return;
      }

      if (segment.editable === "mold-maintenance") {
        const nextStart = clamp(originalStart + delta, gantt.startMinute, shiftEnd - originalDuration);
        updateOverride(day.key, { moldMaintenanceStart: formatTimeFromMinutes(nextStart) });
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
          updateOverride(day.key, { shiftStart: formatTimeFromMinutes(nextStart) });
          return;
        }

        if (mode === "resize-end") {
          const nextEnd = Math.max(originalEnd + delta, originalStart + 15);
          updateOverride(day.key, { shiftEnd: formatTimeFromMinutes(nextEnd) });
          return;
        }

        const nextStart = clamp(originalStart + delta, gantt.startMinute, gantt.endMinute - originalDuration);
        updateOverride(day.key, {
          shiftStart: formatTimeFromMinutes(nextStart),
          shiftEnd: formatTimeFromMinutes(nextStart + originalDuration),
        });
      }
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      applyDrag(moveEvent.clientX);
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp, { once: true });
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
                {isPress && <th className="px-3 py-2.5 text-center font-semibold">Kalıp</th>}
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
                const gantt = buildGanttSegments(day, isPress, moldChangesForDay, overrides[day.key]);
                const timeSlots = createTimeSlots(gantt.startMinute, gantt.endMinute);
                const dayDependencies = dependencies.filter((dependency) => dependency.dayKey === day.key);
                const customGanttRows = gantt.segments
                  .map((segment) => segment.label)
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
                const configuredShiftEnd = parseTime(overrides[day.key]?.shiftEnd ?? day.shiftEnd ?? "") ?? 0;
                const configuredShiftStart = parseTime(overrides[day.key]?.shiftStart ?? day.shiftStart ?? "") ?? 0;
                const configuredDuration = Math.max(configuredShiftEnd - configuredShiftStart, 0);
                const actualDuration = shiftSegment ? Math.max(shiftSegment.end - shiftSegment.start, 0) : configuredDuration;
                const displayOvertime = overrides[day.key]?.overtimeMinutes !== undefined
                  ? overrides[day.key].overtimeMinutes!
                  : Math.max(actualDuration - configuredDuration, 0);

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
                        </div>
                      </td>
                    )}

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
                                Vardiya {day.shiftStart} - {day.shiftEnd} ({day.availableMinutes} dk kullanılabilir süre)
                                {day.overtimeMinutes > 0 ? ` + ${day.overtimeMinutes} dk fazla mesai` : ""}
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
                            <div className="mb-3 flex flex-wrap items-center gap-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer select-none">
                                <input
                                  checked={overrides[day.key]?.postponeMaleChange === true}
                                  className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 accent-blue-700"
                                  disabled={isRowDisabled}
                                  type="checkbox"
                                  onChange={(e) => {
                                    updateOverride(day.key, {
                                      postponeMaleChange: e.target.checked ? true : undefined,
                                    });
                                  }}
                                />
                                Erkek Kalıp Değişimini Ertele
                              </label>
                              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer select-none">
                                <input
                                  checked={overrides[day.key]?.postponeFemaleChange === true}
                                  className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 accent-blue-700"
                                  disabled={isRowDisabled}
                                  type="checkbox"
                                  onChange={(e) => {
                                    updateOverride(day.key, {
                                      postponeFemaleChange: e.target.checked ? true : undefined,
                                    });
                                  }}
                                />
                                Dişi Kalıp Değişimini Ertele
                              </label>
                            </div>
                          )}
                          <div className="mb-3 flex items-center gap-2">
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


                          {isPress && (
                            <div className="mb-3 rounded-md border border-zinc-200 bg-white p-2">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                  Kalıp Değişimi
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  <Button
                                    type="button"
                                    variant={hasMaleMoldChange ? "secondary" : "outline"}
                                    size="sm"
                                    className="h-7 px-2 text-[11px]"
                                    disabled={hasMaleMoldChange || pendingMoldKey === `${day.key}-male`}
                                    onClick={() => addMoldChange(day, "male")}
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    Erkek kalıp ekle
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={hasFemaleMoldChange ? "secondary" : "outline"}
                                    size="sm"
                                    className="h-7 px-2 text-[11px]"
                                    disabled={hasFemaleMoldChange || pendingMoldKey === `${day.key}-female`}
                                    onClick={() => addMoldChange(day, "female")}
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    Dişi kalıp ekle
                                  </Button>
                                </div>
                              </div>

                              {moldChangesForDay.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {moldChangesForDay.map((change) => (
                                    <span
                                      key={change.id}
                                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-bold ${
                                        change.mold_type === "male"
                                          ? "border-sky-200 bg-sky-50 text-sky-700"
                                          : "border-purple-200 bg-purple-50 text-purple-700"
                                      }`}
                                    >
                                      {change.mold_type === "male" ? "Erkek kalıp" : "Dişi kalıp"}
                                      <button
                                        type="button"
                                        className="rounded p-0.5 text-zinc-400 hover:bg-white hover:text-rose-600"
                                        disabled={pendingMoldKey === change.id}
                                        onClick={() => removeMoldChange(change)}
                                        title="Kalıp değişimini kaldır"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-zinc-500">
                                  Bu güne kayıtlı kalıp değişimi yok. Eklediğinde simülasyon tekrar hesaplanır ve Gantt üzerinde blok olarak görünür.
                                </p>
                              )}
                            </div>
                          )}

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
                                          updateOverride(day.key, {
                                            disabledSegments: nextDisabled.length > 0 ? nextDisabled : undefined,
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

                          <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-2">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                Öncül / Ardıl Bağları
                              </p>
                              {linkingDependency?.dayKey === day.key && (
                                <span className="rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                                  {linkingDependency.segmentLabel} noktasından diğer bloğa bırakın
                                </span>
                              )}
                            </div>

                            {dayDependencies.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {dayDependencies.map((dependency) => (
                                  <span
                                    key={dependency.id}
                                    className="inline-flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700"
                                  >
                                    {dependency.predecessorLabel} → {dependency.successorLabel}
                                    <button
                                      type="button"
                                      className="rounded p-0.5 text-blue-400 hover:bg-white hover:text-rose-600"
                                      onClick={() => {
                                        const dayDeps = dependencies.filter((d) => d.dayKey === day.key);
                                        updateDayDependencies(
                                          day.key,
                                          dayDeps.filter((item) => item.id !== dependency.id)
                                        );
                                      }}
                                      title="Bağı kaldır"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-zinc-500">
                                Çubuk uçlarındaki noktalardan birini diğer çubuğun noktasına sürükleyerek öncül → ardıl bağı kurun.
                              </p>
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
                                                updateOverride(day.key, {
                                                  disabledSegments: [...currentDisabled, segment.id],
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
                                          key={`${segment.label}-${segment.start}-${segment.end}`}
                                          className={`absolute top-1 bottom-1 rounded-sm border border-black/10 ${segment.className} ${
                                            segment.editable ? "cursor-grab touch-none ring-1 ring-black/5 active:cursor-grabbing" : ""
                                          } ${
                                            dayDependencies.some(
                                              (dependency) =>
                                                dependency.predecessorId === segment.id ||
                                                dependency.successorId === segment.id
                                            )
                                              ? "ring-2 ring-blue-500"
                                              : ""
                                          }`}
                                          style={segmentStyle(segment, gantt.startMinute, gantt.endMinute)}
                                          title={segment.note}
                                          onPointerDown={(e) => beginSegmentDrag(e, day, segment, gantt, "move")}
                                        >
                                          <span
                                            data-gantt-endpoint="true"
                                            data-day-key={day.key}
                                            data-segment-id={segment.id}
                                            data-segment-label={segment.label}
                                            data-endpoint-side="start"
                                            className="absolute -left-1 top-1/2 z-20 h-2 w-2 -translate-y-1/2 rounded-full border border-white bg-blue-600 shadow-sm hover:scale-125"
                                            onPointerDown={(e) => beginDependencyLink(e, day, segment)}
                                            title={`${segment.label} bağlantı noktası`}
                                          />
                                          <span
                                            data-gantt-endpoint="true"
                                            data-day-key={day.key}
                                            data-segment-id={segment.id}
                                            data-segment-label={segment.label}
                                            data-endpoint-side="end"
                                            className="absolute -right-1 top-1/2 z-20 h-2 w-2 -translate-y-1/2 rounded-full border border-white bg-blue-600 shadow-sm hover:scale-125"
                                            onPointerDown={(e) => beginDependencyLink(e, day, segment)}
                                            title={`${segment.label} bağlantı noktası`}
                                          />
                                          {segment.editable === "shift" && (
                                            <span
                                              className="absolute left-0 top-0 z-10 h-full w-2 cursor-ew-resize rounded-l-sm bg-black/20"
                                              onPointerDown={(e) => beginSegmentDrag(e, day, segment, gantt, "resize-start")}
                                              title="Vardiya başlangıcını sürükle"
                                            />
                                          )}
                                          {(segment.editable === "shift" || segment.editable === "press" || segment.editable === "die-cooling") && (
                                            <span
                                              className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize rounded-r-sm bg-black/20"
                                              onPointerDown={(e) => beginSegmentDrag(e, day, segment, gantt, "resize-end")}
                                              title={segment.editable === "press" ? "Üretim süresini/adedi sürükle" : segment.editable === "die-cooling" ? "Soğutma süresini ayarla" : "Vardiya bitişini sürükle"}
                                            />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                                {dayDependencies.length > 0 && (
                                  <svg
                                    className="pointer-events-none absolute z-40 overflow-visible"
                                    preserveAspectRatio="none"
                                    style={{
                                      height: `${visibleGanttRows.length * 28}px`,
                                      left: "160px",
                                      top: 0,
                                      width: "calc(100% - 160px)",
                                    }}
                                    viewBox={`0 0 100 ${visibleGanttRows.length * 28}`}
                                  >
                                    <defs>
                                      <marker
                                        id={`arrow-${day.key}`}
                                        markerHeight="8"
                                        markerWidth="8"
                                        orient="auto"
                                        refX="7"
                                        refY="4"
                                      >
                                        <path d="M0,0 L8,4 L0,8 Z" fill="#1d4ed8" />
                                      </marker>
                                    </defs>
                                    {dayDependencies.map((dependency) => {
                                      const predecessor = gantt.segments.find((segment) => segment.id === dependency.predecessorId);
                                      const successor = gantt.segments.find((segment) => segment.id === dependency.successorId);
                                      if (!predecessor || !successor) return null;

                                      const predecessorRow = visibleGanttRows.indexOf(predecessor.label);
                                      const successorRow = visibleGanttRows.indexOf(successor.label);
                                      if (predecessorRow < 0 || successorRow < 0) return null;

                                      const x1 = segmentPercent(predecessor.end, gantt.startMinute, gantt.endMinute);
                                      const x2 = segmentPercent(successor.start, gantt.startMinute, gantt.endMinute);
                                      const y1 = predecessorRow * 28 + 14;
                                      const y2 = successorRow * 28 + 14;
                                      const controlOffset = Math.max(Math.abs(x2 - x1) * 0.35, 8);
                                      const c1 = Math.min(x1 + controlOffset, 100);
                                      const c2 = Math.max(x2 - controlOffset, 0);

                                      return (
                                        <path
                                          key={dependency.id}
                                          d={`M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`}
                                          fill="none"
                                          markerEnd={`url(#arrow-${day.key})`}
                                          stroke="#1d4ed8"
                                          strokeLinecap="round"
                                          strokeWidth="2.4"
                                          vectorEffect="non-scaling-stroke"
                                        />
                                      );
                                    })}
                                  </svg>
                                )}
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
