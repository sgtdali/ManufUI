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
  DEFAULT_DIE_COOLING_MINUTES,
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
  ringInterval: number;
  ringChangeMinutes: number;
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
  ringInterval: 1300,
  ringChangeMinutes: 570,
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
  initialRingRemaining: number;
  overrides: Record<string, DayOverride>;
  actuals: Record<string, number>;
  moldChangesByDate: Record<string, ("male" | "female" | "ring")[]>;
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
  initialRingRemaining,
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
    ringInterval,
    ringChangeMinutes,
  } = processParams;
  const days = getDaysInRange(startDate, endDate);
  const result: DayPlan[] = [];
  let maleRemaining = Math.max(initialMaleRemaining, 0);
  let femaleRemaining = Math.max(initialFemaleRemaining, 0);
  let ringRemaining = Math.max(initialRingRemaining, 0);
  let maleChangeCarryover = 0;
  let femaleChangeCarryover = 0;
  let ringChangeCarryover = 0;

  const isPress = cellName === "Pres Hücresi";

  for (const date of days) {
    const key = toDayKey(date);
    const override = overrides[key];
    const day = date.getDay();
    const isBaseWorkday = isWeekday(date) || (holidayWorkEnabled && (day === 5 || day === 6));
    const isWorkday = isBaseWorkday || override?.forceWorkday === true;
    let shiftStart = override?.shiftStart;
    if (!shiftStart) {
      shiftStart = (day === 5 || day === 6) ? "09:00" : defaultShiftStart;
    }
    
    // Friday/Saturday Shift end adjustment
    let shiftEnd = override?.shiftEnd;
    if (!shiftEnd) {
      shiftEnd = (day === 5 || day === 6) ? "17:00" : defaultShiftEnd;
    }

    const dayBreakdown = breakdownsByDate?.[key] || { minutes: 0, details: [] };
    const breakdownMinutes = dayBreakdown.minutes;
    const breakdownDetails = dayBreakdown.details;

    const shift = getShiftMinutes(shiftStart, shiftEnd);
    let furnaceStart = override?.furnaceStart;
    if (!furnaceStart) {
      furnaceStart = (day === 5 || day === 6) ? "09:00" : defaultFurnaceStart;
    }
    const furnaceStartMinute = parseTime(furnaceStart);
    const dayOvertimeMinutes = override?.overtimeMinutes ?? overtimeMinutes;
    const dieCoolingMinutes = Math.max(override?.dieCoolingMinutes ?? DEFAULT_DIE_COOLING_MINUTES, 0);
    
    const dayFemaleDieChangeMinutes = override?.femaleChangeMinutes ?? femaleDieChangeMinutes;
    const dayMaleDieChangeMinutes = override?.maleChangeMinutes ?? maleDieChangeMinutes;
    const dayRingChangeMinutes = override?.ringChangeMinutes ?? ringChangeMinutes;

    const moldChangeMode = override?.moldChangeMode ?? "auto";
    const manualMoldType = override?.manualMoldType;
    const manualMoldChangeAfterPieces =
      override?.manualMoldChangeAfterPieces !== undefined
        ? Math.max(Math.floor(override.manualMoldChangeAfterPieces), 0)
        : null;

    const rawAvailableMinutes = isWorkday && shift ? shift.minutes + dayOvertimeMinutes : 0;
    const availableMinutes = Math.max(rawAvailableMinutes - breakdownMinutes, 0);
    const shiftStartMinute = shift?.startMinute ?? 0;
    const shiftEndMinute = shift ? shift.endMinute + dayOvertimeMinutes : 0;
    const overrideMaintStart = override?.moldMaintenanceStart ? parseTime(override.moldMaintenanceStart) : null;
    const maintStartMinute = overrideMaintStart !== null ? overrideMaintStart : shiftStartMinute;
    
    let maintenanceMinutes = 0;
    let startMaintenanceMinutes = 0;
    let midMaintenanceMinutes = 0;
    let midMaintenanceStartMinute: number | null = null;
    let midMaintenanceComplete = true;
    let femaleUsed = 0;
    let maleUsed = 0;
    let ringUsed = 0;
    const maintenanceParts: string[] = [];

    const manualChanges = moldChangesByDate[key] || [];
    const hasManualMale = manualChanges.includes("male");
    const hasManualFemale = manualChanges.includes("female");
    const hasManualRing = manualChanges.includes("ring");
    const isFemaleDisabled = override?.disabledOperations?.includes("mold-maintenance-female") === true || override?.disabledOperations?.includes("mold-maintenance") === true;
    const isMaleDisabled = override?.disabledOperations?.includes("mold-maintenance-male") === true || override?.disabledOperations?.includes("mold-maintenance") === true;
    const isRingDisabled = override?.disabledOperations?.includes("mold-maintenance-ring") === true || override?.disabledOperations?.includes("mold-maintenance") === true;

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
          maleChangeCarryover = 0;
        } else {
          maleRemaining = maleDieInterval;
          maleChangeCarryover = 0;
        }
      }

      if (hasManualRing) {
        if (isWorkday) {
          ringRemaining = 0;
          ringChangeCarryover = 0;
        } else {
          ringRemaining = ringInterval;
          ringChangeCarryover = 0;
        }
      }

      const availableForMaint = Math.max(shiftEndMinute - maintStartMinute, 0);

      // Determine required maintenance durations for today
      // 1. Female mold change
      let femaleTimeNeeded = 0;
      let isFemaleStarting = false;
      if (isWorkday) {
        if (femaleChangeCarryover > 0) {
          if (override?.postponeFemaleChange !== true && !isFemaleDisabled) {
            femaleTimeNeeded = femaleChangeCarryover;
          }
        } else if (femaleRemaining <= 0 || (moldChangeMode === "manual" && (manualMoldType === "female" || manualMoldType === "female+ring") && manualMoldChangeAfterPieces === 0)) {
          if (override?.postponeFemaleChange !== true && !isFemaleDisabled) {
            femaleTimeNeeded = dayFemaleDieChangeMinutes;
            isFemaleStarting = true;
          }
        }
      }

      // 2. Male mold change
      let maleTimeNeeded = 0;
      let isMaleStarting = false;
      if (isWorkday) {
        if (maleChangeCarryover > 0) {
          if (override?.postponeMaleChange !== true && !isMaleDisabled) {
            maleTimeNeeded = maleChangeCarryover;
          }
        } else if (maleRemaining <= 0 || (moldChangeMode === "manual" && (manualMoldType === "male" || manualMoldType === "male+ring") && manualMoldChangeAfterPieces === 0)) {
          if (override?.postponeMaleChange !== true && !isMaleDisabled) {
            maleTimeNeeded = dayMaleDieChangeMinutes;
            isMaleStarting = true;
          }
        }
      }

      // 3. Ring change
      let ringTimeNeeded = 0;
      let isRingStarting = false;
      if (isWorkday) {
        if (ringChangeCarryover > 0) {
          if (override?.postponeRingChange !== true && !isRingDisabled) {
            ringTimeNeeded = ringChangeCarryover;
          }
        } else if (ringRemaining <= 0 || (moldChangeMode === "manual" && (manualMoldType === "ring" || manualMoldType === "male+ring" || manualMoldType === "female+ring") && manualMoldChangeAfterPieces === 0)) {
          if (override?.postponeRingChange !== true && !isRingDisabled) {
            ringTimeNeeded = dayRingChangeMinutes;
            isRingStarting = true;
          }
        }
      }

      // Female and Male sequentially (femaleTimeNeeded + maleTimeNeeded)
      // Ring in parallel (ringTimeNeeded)
      femaleUsed = Math.min(availableForMaint, femaleTimeNeeded);
      maleUsed = Math.min(Math.max(availableForMaint - femaleUsed, 0), maleTimeNeeded);
      ringUsed = Math.min(availableForMaint, ringTimeNeeded);

      maintenanceMinutes = Math.max(femaleUsed + maleUsed, ringUsed);

      // Update carryovers
      if (isWorkday) {
        if (femaleTimeNeeded > 0) {
          femaleChangeCarryover = Math.max(femaleTimeNeeded - femaleUsed, 0);
        }
        if (maleTimeNeeded > 0) {
          maleChangeCarryover = Math.max(maleTimeNeeded - maleUsed, 0);
        }
        if (ringTimeNeeded > 0) {
          ringChangeCarryover = Math.max(ringTimeNeeded - ringUsed, 0);
        }
      }

      // Handle completions and reset remaining lives
      if (femaleTimeNeeded > 0) {
        if (femaleChangeCarryover <= 0) {
          femaleRemaining = femaleDieInterval;
        } else if (isFemaleStarting) {
          femaleRemaining = 0;
        }
        maintenanceParts.push("Dişi kalıp değişimi");
      }

      if (maleTimeNeeded > 0) {
        if (maleChangeCarryover <= 0) {
          maleRemaining = maleDieInterval;
        } else if (isMaleStarting) {
          maleRemaining = 0;
        }
        maintenanceParts.push("Erkek kalıp değişimi");
      }

      if (ringTimeNeeded > 0) {
        if (ringChangeCarryover <= 0) {
          ringRemaining = ringInterval;
        } else if (isRingStarting) {
          ringRemaining = 0;
        }
        maintenanceParts.push("HIP Ring değişimi");
      }

      startMaintenanceMinutes = maintenanceMinutes;
    }

    const furnaceReadyMinute =
      furnaceStartMinute === null
        ? shiftStartMinute + normalizationWarmupMinutes
        : furnaceStartMinute + normalizationWarmupMinutes;

    let dieHeatEndMinute = 0;
    if (isPress) {
      const fStart = furnaceStartMinute !== null ? furnaceStartMinute : shiftStartMinute;
      const dieHeatStartMinute = Math.max(
        fStart + 60,
        (hasManualMale || hasManualFemale || hasManualRing || maintenanceMinutes > 0) ? (maintStartMinute + startMaintenanceMinutes) : shiftStartMinute
      );
      dieHeatEndMinute = dieHeatStartMinute + 60;
    }

    const pressStartAbsoluteMinute =
      isWorkday && maintenanceMinutes < availableMinutes
        ? isPress
          ? Math.max(
              Math.max(maintStartMinute + maintenanceMinutes, furnaceReadyMinute) + prePressHeatMinutes,
              dieHeatEndMinute
            )
          : Math.max(maintStartMinute + maintenanceMinutes, furnaceReadyMinute) + prePressHeatMinutes
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
    let plannedRingRemainingEnd = ringRemaining;

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

      const productionDemand = inputPressed >= 0 ? Math.min(capacityPressed, inputPressed) : capacityPressed;

      if (pressStartAbsoluteMinute !== null && capacityPressed > 0) {
        const postponeMale = override?.postponeMaleChange === true || moldChangeMode === "postpone" || isMaleDisabled;
        const postponeFemale = override?.postponeFemaleChange === true || moldChangeMode === "postpone" || isFemaleDisabled;
        const postponeRing = override?.postponeRingChange === true || moldChangeMode === "postpone" || isRingDisabled;
        const manualMaleLimit =
          moldChangeMode === "manual" && (manualMoldType === "male" || manualMoldType === "male+ring") && manualMoldChangeAfterPieces !== null && manualMoldChangeAfterPieces > 0
            ? manualMoldChangeAfterPieces
            : null;
        const manualFemaleLimit =
          moldChangeMode === "manual" && (manualMoldType === "female" || manualMoldType === "female+ring") && manualMoldChangeAfterPieces !== null && manualMoldChangeAfterPieces > 0
            ? manualMoldChangeAfterPieces
            : null;
        const manualRingLimit =
          moldChangeMode === "manual" && (manualMoldType === "ring" || manualMoldType === "male+ring" || manualMoldType === "female+ring") && manualMoldChangeAfterPieces !== null && manualMoldChangeAfterPieces > 0
            ? manualMoldChangeAfterPieces
            : null;
        const effectiveMaleRemaining = postponeMale ? Infinity : (manualMaleLimit ?? maleRemaining);
        const effectiveFemaleRemaining = postponeFemale ? Infinity : (manualFemaleLimit ?? femaleRemaining);
        const effectiveRingRemaining = postponeRing ? Infinity : (manualRingLimit ?? ringRemaining);
        const dieLimitedCapacity = Math.min(
          capacityPressed,
          Math.max(effectiveMaleRemaining, 0),
          Math.max(effectiveFemaleRemaining, 0),
          Math.max(effectiveRingRemaining, 0)
        );
        const producedBeforeChange = Math.min(productionDemand, dieLimitedCapacity);

        plannedCapacityPressed = dieLimitedCapacity;
        plannedSameDayCapacity = Math.min(sameDayCapacity, dieLimitedCapacity);

        if (producedBeforeChange < productionDemand) {
          plannedCapacityPressed = dieLimitedCapacity;
          plannedSameDayCapacity = Math.min(sameDayCapacity, dieLimitedCapacity);

          const limitingMale =
            !postponeMale &&
            (manualMaleLimit !== null
              ? manualMaleLimit <= producedBeforeChange
              : maleRemaining > 0 && maleRemaining <= producedBeforeChange);
          const limitingFemale =
            !postponeFemale &&
            (manualFemaleLimit !== null
              ? manualFemaleLimit <= producedBeforeChange
              : femaleRemaining > 0 && femaleRemaining <= producedBeforeChange);
          const limitingRing =
            !postponeRing &&
            (manualRingLimit !== null
              ? manualRingLimit <= producedBeforeChange
              : ringRemaining > 0 && ringRemaining <= producedBeforeChange);
          const limitingRemaining = Math.min(
            limitingMale ? (manualMaleLimit ?? maleRemaining) : Infinity,
            limitingFemale ? (manualFemaleLimit ?? femaleRemaining) : Infinity,
            limitingRing ? (manualRingLimit ?? ringRemaining) : Infinity
          );
          const changeStartMinute =
            Number.isFinite(limitingRemaining)
              ? pressStartAbsoluteMinute + limitingRemaining * pressCycleMinutes + dieCoolingMinutes
              : null;

          if (limitingFemale && changeStartMinute !== null) {
            const availableChangeMinutes = Math.max(shiftEndMinute - changeStartMinute, 0);
            const used = Math.min(availableChangeMinutes, dayFemaleDieChangeMinutes);
            if (used > 0) {
              maintenanceMinutes += used;
              midMaintenanceMinutes = used;
              midMaintenanceStartMinute = changeStartMinute;
              midMaintenanceComplete = used >= dayFemaleDieChangeMinutes;
              maintenanceParts.push("Dişi kalıp değişimi");
            }
            femaleChangeCarryover = dayFemaleDieChangeMinutes - used;
            plannedFemaleRemainingEnd = femaleChangeCarryover <= 0 ? femaleDieInterval : 0;
            plannedMaleRemainingEnd = maleRemaining - producedBeforeChange;
            plannedRingRemainingEnd = ringRemaining - producedBeforeChange;
          } else if (limitingMale && changeStartMinute !== null) {
            const availableChangeMinutes = Math.max(shiftEndMinute - changeStartMinute, 0);
            const used = Math.min(availableChangeMinutes, dayMaleDieChangeMinutes);
            if (used > 0) {
              maintenanceMinutes += used;
              midMaintenanceMinutes = used;
              midMaintenanceStartMinute = changeStartMinute;
              midMaintenanceComplete = used >= dayMaleDieChangeMinutes;
              maintenanceParts.push("Erkek kalıp değişimi");
            }
            maleChangeCarryover = dayMaleDieChangeMinutes - used;
            plannedMaleRemainingEnd = maleChangeCarryover <= 0 ? maleDieInterval : 0;
            plannedFemaleRemainingEnd = femaleRemaining - producedBeforeChange;
            plannedRingRemainingEnd = ringRemaining - producedBeforeChange;
          } else if (limitingRing && changeStartMinute !== null) {
            const availableChangeMinutes = Math.max(shiftEndMinute - changeStartMinute, 0);
            const used = Math.min(availableChangeMinutes, dayRingChangeMinutes);
            if (used > 0) {
              maintenanceMinutes += used;
              midMaintenanceMinutes = used;
              midMaintenanceStartMinute = changeStartMinute;
              midMaintenanceComplete = used >= dayRingChangeMinutes;
              maintenanceParts.push("HIP Ring değişimi");
            }
            ringChangeCarryover = dayRingChangeMinutes - used;
            plannedRingRemainingEnd = ringChangeCarryover <= 0 ? ringInterval : 0;
            plannedMaleRemainingEnd = maleRemaining - producedBeforeChange;
            plannedFemaleRemainingEnd = femaleRemaining - producedBeforeChange;
          } else {
            plannedMaleRemainingEnd = maleRemaining - producedBeforeChange;
            plannedFemaleRemainingEnd = femaleRemaining - producedBeforeChange;
            plannedRingRemainingEnd = ringRemaining - producedBeforeChange;
          }
        } else {
          plannedMaleRemainingEnd = maleRemaining - producedBeforeChange;
          plannedFemaleRemainingEnd = femaleRemaining - producedBeforeChange;
          plannedRingRemainingEnd = ringRemaining - producedBeforeChange;
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
    ringRemaining = plannedRingRemainingEnd;

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
      startMaintenanceMinutes,
      midMaintenanceMinutes,
      midMaintenanceStartMinute,
      midMaintenanceComplete,
      femaleMaintMinutes: isPress ? femaleUsed : 0,
      maleMaintMinutes: isPress ? maleUsed : 0,
      ringMaintMinutes: isPress ? ringUsed : 0,
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
      ringRemainingEnd: isPress ? ringRemaining : 0,
      lastFurnaceExitTime,
      breakdownMinutes,
      breakdownDetails,
    });
  }

  return result;
}
