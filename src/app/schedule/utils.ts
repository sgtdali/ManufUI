// Yardımcı fonksiyonlar ve buildSchedule simülasyon motoru
import type { DayPlan, DayOverride } from "./types";
import {
  NORMALIZATION_WARMUP_MINUTES,
  PRE_PRESS_HEAT_MINUTES,
  PRESS_CYCLE_MINUTES,
  NORMALIZATION_PROCESS_MINUTES,
  MALE_DIE_INTERVAL,
  FEMALE_DIE_INTERVAL,
  MALE_DIE_CHANGE_MINUTES,
  FEMALE_DIE_CHANGE_MINUTES,
} from "./constants";

export type ProcessParams = {
  normalizationWarmupMinutes: number;
  prePressHeatMinutes: number;
  pressCycleMinutes: number;
  normalizationProcessMinutes: number;
  maleDieInterval: number;
  femaleDieInterval: number;
  maleDieChangeMinutes: number;
  femaleDieChangeMinutes: number;
};

export const DEFAULT_PROCESS_PARAMS: ProcessParams = {
  normalizationWarmupMinutes: NORMALIZATION_WARMUP_MINUTES,
  prePressHeatMinutes: PRE_PRESS_HEAT_MINUTES,
  pressCycleMinutes: PRESS_CYCLE_MINUTES,
  normalizationProcessMinutes: NORMALIZATION_PROCESS_MINUTES,
  maleDieInterval: MALE_DIE_INTERVAL,
  femaleDieInterval: FEMALE_DIE_INTERVAL,
  maleDieChangeMinutes: MALE_DIE_CHANGE_MINUTES,
  femaleDieChangeMinutes: FEMALE_DIE_CHANGE_MINUTES,
};

// --- String / Date helpers ---

export function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function toDayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(date);
}

export function parseTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function formatTimeFromMinutes(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const date = new Date(2026, 0, 1, 0, normalized);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getShiftMinutes(start: string, end: string) {
  const startMinute = parseTime(start);
  let endMinute = parseTime(end);
  if (startMinute === null || endMinute === null) return null;
  if (endMinute <= startMinute) endMinute += 1440;
  return { startMinute, endMinute, minutes: endMinute - startMinute };
}

export function getFirstDayOfMonth(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
}

export function getLastDayOfMonth(date: Date) {
  return toDateInputValue(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function getDaysInRange(startValue: string, endValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startValue) || !/^\d{4}-\d{2}-\d{2}$/.test(endValue)) {
    return [];
  }
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function isWeekday(date: Date) {
  const day = date.getDay();
  return day >= 0 && day <= 4;
}

export function numberInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function sum(
  days: DayPlan[],
  key: keyof Pick<DayPlan, "pressed" | "sameDayEtmReady" | "target" | "targetGap" | "maintenanceMinutes">
) {
  return days.reduce((total, day) => total + day[key], 0);
}

// --- Simülasyon motoru ---

export type BuildScheduleParams = {
  startDate: string;
  endDate: string;
  dailyTarget: number;
  defaultShiftStart: string;
  defaultShiftEnd: string;
  defaultFurnaceStart: string;
  overtimeMinutes: number;
  holidayWorkEnabled: boolean;
  initialMaleRemaining: number;
  initialFemaleRemaining: number;
  overrides: Record<string, DayOverride>;
  actuals: Record<string, number>;
  moldChangesByDate: Record<string, ("male" | "female")[]>;
  processParams: ProcessParams;
  breakdownsByDate?: Record<string, { minutes: number; details: string[] }>;
  cellName?: string;
  cellParams?: Record<string, { gunluk_max_kapasite: number | null; notlar: string | null }>;
};

export function buildSchedule({
  startDate,
  endDate,
  dailyTarget,
  defaultShiftStart,
  defaultShiftEnd,
  defaultFurnaceStart,
  overtimeMinutes,
  holidayWorkEnabled,
  initialMaleRemaining,
  initialFemaleRemaining,
  overrides,
  actuals,
  moldChangesByDate,
  processParams,
  breakdownsByDate,
  cellName = "Pres Hücresi",
  cellParams,
}: BuildScheduleParams): DayPlan[] {
  const {
    normalizationWarmupMinutes,
    prePressHeatMinutes,
    pressCycleMinutes,
    normalizationProcessMinutes,
    maleDieInterval,
    femaleDieInterval,
    maleDieChangeMinutes,
    femaleDieChangeMinutes,
  } = processParams;
  const days = getDaysInRange(startDate, endDate);
  const result: DayPlan[] = [];
  let maleRemaining = Math.max(initialMaleRemaining, 0);
  let femaleRemaining = Math.max(initialFemaleRemaining, 0);
  let maleChangeCarryover = 0;
  let femaleChangeCarryover = 0;

  const isPress = cellName === "Pres Hücresi";

  for (const date of days) {
    const key = toDayKey(date);
    const override = overrides[key];
    const day = date.getDay();
    const isBaseWorkday = isWeekday(date) || (holidayWorkEnabled && (day === 5 || day === 6));
    const isWorkday = isBaseWorkday || override?.forceWorkday === true;
    let shiftStart = override?.shiftStart ?? defaultShiftStart;
    if ((day === 5 || day === 6) && !override?.shiftStart && defaultShiftStart === "07:45") {
      shiftStart = "09:00";
    }
    
    // Friday/Saturday Shift end adjustment
    let shiftEnd = override?.shiftEnd ?? defaultShiftEnd;
    if ((day === 5 || day === 6) && !override?.shiftEnd && defaultShiftEnd === "17:15") {
      shiftEnd = "17:00";
    }

    const dayBreakdown = breakdownsByDate?.[key] || { minutes: 0, details: [] };
    const breakdownMinutes = dayBreakdown.minutes;
    const breakdownDetails = dayBreakdown.details;

    const shift = getShiftMinutes(shiftStart, shiftEnd);
    let furnaceStart = override?.furnaceStart ?? defaultFurnaceStart;
    if ((day === 5 || day === 6) && !override?.furnaceStart && defaultFurnaceStart === "07:45") {
      furnaceStart = "09:00";
    }
    const furnaceStartMinute = parseTime(furnaceStart);
    const dayOvertimeMinutes = override?.overtimeMinutes ?? overtimeMinutes;
    
    const rawAvailableMinutes = isWorkday && shift ? shift.minutes + dayOvertimeMinutes : 0;
    const availableMinutes = Math.max(rawAvailableMinutes - breakdownMinutes, 0);
    const shiftStartMinute = shift?.startMinute ?? 0;
    const shiftEndMinute = shift ? shift.endMinute + dayOvertimeMinutes : 0;
    
    let maintenanceMinutes = 0;
    const maintenanceParts: string[] = [];

    const manualChanges = moldChangesByDate[key] || [];
    const hasManualMale = manualChanges.includes("male");
    const hasManualFemale = manualChanges.includes("female");

    if (isPress) {
      if (hasManualFemale) {
        if (isWorkday) {
          femaleRemaining = 0;
          femaleChangeCarryover = 0;
        } else {
          femaleRemaining = femaleDieInterval;
          femaleChangeCarryover = 0;
        }
      }

      if (hasManualMale) {
        if (isWorkday) {
          maleRemaining = 0;
        } else {
          maleRemaining = maleDieInterval;
        }
      }

      if (isWorkday && femaleChangeCarryover > 0) {
        const used = Math.min(availableMinutes, femaleChangeCarryover);
        maintenanceMinutes += used;
        femaleChangeCarryover -= used;
        maintenanceParts.push("Dişi kalıp değişimi");
      }

      if (isWorkday && femaleChangeCarryover <= 0 && femaleRemaining <= 0) {
        const used = Math.min(availableMinutes - maintenanceMinutes, femaleDieChangeMinutes);
        maintenanceMinutes += Math.max(used, 0);
        femaleChangeCarryover = femaleDieChangeMinutes - Math.max(used, 0);
        femaleRemaining = femaleDieInterval;
        maintenanceParts.push("Dişi kalıp değişimi");
      }

      if (
        isWorkday &&
        femaleChangeCarryover <= 0 &&
        maleRemaining <= 0 &&
        maintenanceMinutes < availableMinutes
      ) {
        const used = Math.min(availableMinutes - maintenanceMinutes, maleDieChangeMinutes);
        maintenanceMinutes += Math.max(used, 0);
        maleRemaining = maleDieInterval;
        maintenanceParts.push("Erkek kalıp değişimi");
      }
    }

    const furnaceReadyMinute =
      furnaceStartMinute === null
        ? shiftStartMinute + normalizationWarmupMinutes
        : furnaceStartMinute + normalizationWarmupMinutes;
    const pressStartAbsoluteMinute =
      isWorkday && maintenanceMinutes < availableMinutes
        ? Math.max(shiftStartMinute + maintenanceMinutes, furnaceReadyMinute) + prePressHeatMinutes
        : null;
    const pressStartTime =
      isPress && pressStartAbsoluteMinute !== null && pressStartAbsoluteMinute < shiftEndMinute
        ? formatTimeFromMinutes(pressStartAbsoluteMinute)
        : null;

    let capacityPressed = 0;
    let sameDayEtmReady = 0;
    let plannedCapacityPressed = 0;
    let plannedSameDayCapacity = 0;
    let plannedMaleRemainingEnd = maleRemaining;
    let plannedFemaleRemainingEnd = femaleRemaining;

    const hasScenario = override?.pressed !== undefined;
    const hasActual = actuals[key] !== undefined;
    const isRecoveryWorkday = override?.forceWorkday === true && !isBaseWorkday;
    const inputPressed = hasScenario
      ? Math.max(Math.floor(override?.pressed ?? 0), 0)
      : hasActual
        ? Math.max(Math.floor(actuals[key]), 0)
        : isRecoveryWorkday
          ? 0
          : -1; // -1 means use plan

    if (isPress) {
      const pressMinutes =
        pressStartAbsoluteMinute === null ? 0 : Math.max(shiftEndMinute - pressStartAbsoluteMinute, 0);
      
      // Reduce press runtime by breakdown minutes
      const activePressMinutes = Math.max(pressMinutes - breakdownMinutes, 0);
      capacityPressed = Math.floor(activePressMinutes / pressCycleMinutes);

      const sameDayReadyMinutes =
        pressStartAbsoluteMinute === null
          ? 0
          : Math.max(shiftEndMinute - pressStartAbsoluteMinute - normalizationProcessMinutes, 0);
      const activeSameDayReadyMinutes = Math.max(sameDayReadyMinutes - breakdownMinutes, 0);
      const sameDayCapacity = Math.floor(activeSameDayReadyMinutes / pressCycleMinutes);

      plannedCapacityPressed = capacityPressed;
      plannedSameDayCapacity = sameDayCapacity;

      const dieSimulationDemand = inputPressed >= 0 ? Math.min(capacityPressed, inputPressed) : capacityPressed;

      if (pressStartAbsoluteMinute !== null && dieSimulationDemand > 0) {
        const dieLimitedCapacity = Math.min(
          dieSimulationDemand,
          Math.max(maleRemaining, 0),
          Math.max(femaleRemaining, 0)
        );

        if (dieLimitedCapacity < dieSimulationDemand) {
          plannedCapacityPressed = dieLimitedCapacity;
          plannedSameDayCapacity = Math.min(sameDayCapacity, dieLimitedCapacity);

          if (maleRemaining > 0 && maleRemaining <= dieLimitedCapacity) {
            const changeStartMinute =
              pressStartAbsoluteMinute + maleRemaining * pressCycleMinutes;
            const availableChangeMinutes = Math.max(shiftEndMinute - changeStartMinute, 0);
            const used = Math.min(availableChangeMinutes, maleDieChangeMinutes);
            if (used > 0) {
              maintenanceMinutes += used;
              maintenanceParts.push("Erkek kalıp değişimi");
            }
            maleChangeCarryover = maleDieChangeMinutes - used;
            plannedMaleRemainingEnd = maleChangeCarryover <= 0 ? maleDieInterval : 0;
          } else {
            plannedMaleRemainingEnd = Math.max(maleRemaining - dieLimitedCapacity, 0);
          }

          plannedFemaleRemainingEnd = Math.max(femaleRemaining - dieLimitedCapacity, 0);
        } else {
          plannedCapacityPressed = dieLimitedCapacity;
          plannedSameDayCapacity = Math.min(sameDayCapacity, dieLimitedCapacity);
          plannedMaleRemainingEnd = Math.max(maleRemaining - dieLimitedCapacity, 0);
          plannedFemaleRemainingEnd = Math.max(femaleRemaining - dieLimitedCapacity, 0);
        }
      }
    } else {
      // General Cell capacity calculation scaling based on max capacity
      const maxCapacity = cellParams?.[cellName]?.gunluk_max_kapasite ?? dailyTarget ?? 100;
      const baseShiftMinutes = shift ? shift.minutes : 570;
      capacityPressed = isWorkday
        ? Math.floor((availableMinutes / Math.max(baseShiftMinutes, 1)) * maxCapacity)
        : 0;
      plannedCapacityPressed = capacityPressed;
    }

    const finalPressed =
      hasScenario || hasActual || isRecoveryWorkday
        ? inputPressed
        : plannedCapacityPressed;

    const pressedVal = Math.max(finalPressed, 0);
    const source = hasScenario ? "scenario" : hasActual ? "actual" : "plan";
    sameDayEtmReady = isPress ? Math.min(pressedVal, plannedSameDayCapacity) : pressedVal;
    const target = isBaseWorkday ? dailyTarget : 0;

    let lastFurnaceExitTime: string | null = null;
    if (isPress && pressStartAbsoluteMinute !== null && pressedVal > 0) {
      const lastFurnaceExitMinute = pressStartAbsoluteMinute + (pressedVal * pressCycleMinutes) + normalizationProcessMinutes;
      lastFurnaceExitTime = formatTimeFromMinutes(lastFurnaceExitMinute);
    }

    maleRemaining = plannedMaleRemainingEnd;
    femaleRemaining = plannedFemaleRemainingEnd;

    result.push({
      date,
      key,
      label: `${formatDate(date)} ${formatWeekday(date)}`,
      isWorkday,
      isBaseWorkday,
      shiftStart,
      shiftEnd,
      furnaceStart,
      availableMinutes,
      overtimeMinutes: dayOvertimeMinutes,
      maintenanceMinutes,
      maintenanceLabel: maintenanceParts.length > 0 ? maintenanceParts.join(" + ") : "-",
      pressStartTime,
      capacityPressed: plannedCapacityPressed,
      pressed: pressedVal,
      source,
      sameDayEtmReady,
      target,
      targetGap: Math.max(target - pressedVal, 0),
      maleRemainingEnd: isPress ? maleRemaining : 0,
      femaleRemainingEnd: isPress ? femaleRemaining : 0,
      lastFurnaceExitTime,
      breakdownMinutes,
      breakdownDetails,
    });
  }

  return result;
}

