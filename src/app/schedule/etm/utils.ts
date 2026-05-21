import {
  getDaysInRange,
  toDayKey,
  isWeekday,
  formatDate,
  formatWeekday,
  getShiftMinutes,
} from "../utils";
import type { BuildEtmScheduleParams, EtmDayPlan, EtmWarning, EtmProcessParams } from "./types";

// Helper function to simulate tool wear and changes for a single machine and tool type
export function simulateToolChanges(
  initialRemaining: number,
  partsProduced: number,
  interval: number,
  changeMinutes: number
): { changes: number; finalRemaining: number; changeMinutesTotal: number } {
  if (partsProduced <= 0) {
    return { changes: 0, finalRemaining: initialRemaining, changeMinutesTotal: 0 };
  }

  if (partsProduced < initialRemaining) {
    return {
      changes: 0,
      finalRemaining: initialRemaining - partsProduced,
      changeMinutesTotal: 0,
    };
  }

  // First change occurs after initialRemaining parts
  const rest = partsProduced - initialRemaining;
  const extraChanges = Math.floor(rest / interval);
  const totalChanges = 1 + extraChanges;
  const finalRemaining = interval - (rest % interval);

  return {
    changes: totalChanges,
    finalRemaining,
    changeMinutesTotal: totalChanges * changeMinutes,
  };
}

// Resolver for daily production and stop durations given an available minutes budget
function calculateDayProductionAndStops(
  availableMinutes: number,
  params: EtmProcessParams,
  state: {
    etm1Cutting: number;
    etm2Cutting: number;
    etm1Drill: number;
    etm2Drill: number;
  }
): {
  produced: number;
  cuttingInsertStopsMinutes: number;
  drillBitStopsMinutes: number;
  paletStopsMinutes: number;
  totalStopMinutes: number;
  finalState: typeof state;
} {
  if (availableMinutes <= 0) {
    return {
      produced: 0,
      cuttingInsertStopsMinutes: 0,
      drillBitStopsMinutes: 0,
      paletStopsMinutes: 0,
      totalStopMinutes: 0,
      finalState: state,
    };
  }

  const theoreticalMax = Math.floor(availableMinutes / params.hatCycleMinutes);
  for (let p = theoreticalMax; p >= 0; p--) {
    const p1 = Math.ceil(p / 2);
    const p2 = Math.floor(p / 2);

    const etm1CutSim = simulateToolChanges(state.etm1Cutting, p1, params.cuttingInsertInterval, params.cuttingInsertChangeMinutes);
    const etm2CutSim = simulateToolChanges(state.etm2Cutting, p2, params.cuttingInsertInterval, params.cuttingInsertChangeMinutes);

    const etm1DrillSim = simulateToolChanges(state.etm1Drill, p1, params.drillBitInterval, params.drillBitChangeMinutes);
    const etm2DrillSim = simulateToolChanges(state.etm2Drill, p2, params.drillBitInterval, params.drillBitChangeMinutes);

    const paletStops = Math.floor(p / params.paletInterval) * params.paletChangeMinutes;
    const cuttingInsertStops = etm1CutSim.changeMinutesTotal + etm2CutSim.changeMinutesTotal;
    const drillBitStops = etm1DrillSim.changeMinutesTotal + etm2DrillSim.changeMinutesTotal;
    const totalStops = cuttingInsertStops + drillBitStops + paletStops;

    const totalTimeRequired = p * params.hatCycleMinutes + totalStops;
    if (totalTimeRequired <= availableMinutes) {
      return {
        produced: p,
        cuttingInsertStopsMinutes: cuttingInsertStops,
        drillBitStopsMinutes: drillBitStops,
        paletStopsMinutes: paletStops,
        totalStopMinutes: totalStops,
        finalState: {
          etm1Cutting: etm1CutSim.finalRemaining,
          etm2Cutting: etm2CutSim.finalRemaining,
          etm1Drill: etm1DrillSim.finalRemaining,
          etm2Drill: etm2DrillSim.finalRemaining,
        },
      };
    }
  }

  return {
    produced: 0,
    cuttingInsertStopsMinutes: 0,
    drillBitStopsMinutes: 0,
    paletStopsMinutes: 0,
    totalStopMinutes: 0,
    finalState: state,
  };
}

// Calculate stops and wear for a fixed production quantity
function calculateStopsForProduced(
  produced: number,
  params: EtmProcessParams,
  state: {
    etm1Cutting: number;
    etm2Cutting: number;
    etm1Drill: number;
    etm2Drill: number;
  }
) {
  const p1 = Math.ceil(produced / 2);
  const p2 = Math.floor(produced / 2);

  const etm1CutSim = simulateToolChanges(state.etm1Cutting, p1, params.cuttingInsertInterval, params.cuttingInsertChangeMinutes);
  const etm2CutSim = simulateToolChanges(state.etm2Cutting, p2, params.cuttingInsertInterval, params.cuttingInsertChangeMinutes);

  const etm1DrillSim = simulateToolChanges(state.etm1Drill, p1, params.drillBitInterval, params.drillBitChangeMinutes);
  const etm2DrillSim = simulateToolChanges(state.etm2Drill, p2, params.drillBitInterval, params.drillBitChangeMinutes);

  const paletStops = Math.floor(produced / params.paletInterval) * params.paletChangeMinutes;
  const cuttingInsertStops = etm1CutSim.changeMinutesTotal + etm2CutSim.changeMinutesTotal;
  const drillBitStops = etm1DrillSim.changeMinutesTotal + etm2DrillSim.changeMinutesTotal;
  const totalStops = cuttingInsertStops + drillBitStops + paletStops;

  return {
    cuttingInsertStopsMinutes: cuttingInsertStops,
    drillBitStopsMinutes: drillBitStops,
    paletStopsMinutes: paletStops,
    totalStopMinutes: totalStops,
    finalState: {
      etm1Cutting: etm1CutSim.finalRemaining,
      etm2Cutting: etm2CutSim.finalRemaining,
      etm1Drill: etm1DrillSim.finalRemaining,
      etm2Drill: etm2DrillSim.finalRemaining,
    },
  };
}

export function buildEtmSchedule({
  startDate,
  endDate,
  dailyTarget,
  defaultShiftStart,
  defaultShiftEnd,
  overtimeMinutes,
  holidayWorkEnabled,
  etm1InitialCuttingRemaining,
  etm2InitialCuttingRemaining,
  etm1InitialDrillRemaining,
  etm2InitialDrillRemaining,
  overrides,
  actuals,
  toolChangesByDate,
  params,
}: BuildEtmScheduleParams): EtmDayPlan[] {
  const days = getDaysInRange(startDate, endDate);
  const result: EtmDayPlan[] = [];

  let etm1Cutting = etm1InitialCuttingRemaining;
  let etm2Cutting = etm2InitialCuttingRemaining;
  let etm1Drill = etm1InitialDrillRemaining;
  let etm2Drill = etm2InitialDrillRemaining;

  for (const date of days) {
    const key = toDayKey(date);
    const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
    const override = overrides[key];

    const isBaseWorkday = isWeekday(date) || (holidayWorkEnabled && (dayOfWeek === 5 || dayOfWeek === 6));
    const isWorkday = isBaseWorkday || override?.forceWorkday === true;

    const shiftStart = override?.shiftStart ?? defaultShiftStart;
    const shiftEnd = override?.shiftEnd ?? defaultShiftEnd;
    const shift = getShiftMinutes(shiftStart, shiftEnd);

    const dayOvertimeMinutes = override?.overtimeMinutes ?? overtimeMinutes;
    const availableMinutes = isWorkday && shift ? shift.minutes + dayOvertimeMinutes : 0;

    // Apply manual tool changes/resets at the START of the day
    const manualChanges = toolChangesByDate[key] || [];
    for (const change of manualChanges) {
      if (change.machine === "ETM-1") {
        if (change.toolType === "cutting_insert") etm1Cutting = params.cuttingInsertInterval;
        if (change.toolType === "drill_bit") etm1Drill = params.drillBitInterval;
      } else if (change.machine === "ETM-2") {
        if (change.toolType === "cutting_insert") etm2Cutting = params.cuttingInsertInterval;
        if (change.toolType === "drill_bit") etm2Drill = params.drillBitInterval;
      }
    }

    const stateAtStart = { etm1Cutting, etm2Cutting, etm1Drill, etm2Drill };

    // 1. Calculate Capacity Produced (maximum possible parts that could fit in available minutes)
    const capRes = calculateDayProductionAndStops(availableMinutes, params, stateAtStart);
    const capacityProduced = capRes.produced;

    // 2. Determine actual production quantity
    const hasScenario = override?.produced !== undefined;
    const hasActual = actuals[key] !== undefined;
    const isRecoveryWorkday = override?.forceWorkday === true && !isBaseWorkday;

    const inputProduced = hasScenario
      ? Math.max(Math.floor(override?.produced ?? 0), 0)
      : hasActual
        ? Math.max(Math.floor(actuals[key]), 0)
        : isRecoveryWorkday
          ? 0
          : capacityProduced;

    const produced = isWorkday ? inputProduced : 0;
    const source = hasScenario ? "scenario" : hasActual ? "actual" : "plan";
    const target = isBaseWorkday ? dailyTarget : 0;
    const targetGap = Math.max(target - produced, 0);

    // 3. Calculate actual stop times and wear based on the final daily production
    const actualRes = calculateStopsForProduced(produced, params, stateAtStart);

    // Update remaining counters for next day
    etm1Cutting = actualRes.finalState.etm1Cutting;
    etm2Cutting = actualRes.finalState.etm2Cutting;
    etm1Drill = actualRes.finalState.etm1Drill;
    etm2Drill = actualRes.finalState.etm2Drill;

    // 4. Generate stop label details
    const stopParts: string[] = [];
    if (actualRes.cuttingInsertStopsMinutes > 0) {
      const p1 = Math.ceil(produced / 2);
      const p2 = Math.floor(produced / 2);
      const changes1 = simulateToolChanges(stateAtStart.etm1Cutting, p1, params.cuttingInsertInterval, params.cuttingInsertChangeMinutes).changes;
      const changes2 = simulateToolChanges(stateAtStart.etm2Cutting, p2, params.cuttingInsertInterval, params.cuttingInsertChangeMinutes).changes;
      const totalChanges = changes1 + changes2;
      stopParts.push(`Kesici uç ×${totalChanges} (${actualRes.cuttingInsertStopsMinutes}dk)`);
    }
    if (actualRes.drillBitStopsMinutes > 0) {
      const p1 = Math.ceil(produced / 2);
      const p2 = Math.floor(produced / 2);
      const changes1 = simulateToolChanges(stateAtStart.etm1Drill, p1, params.drillBitInterval, params.drillBitChangeMinutes).changes;
      const changes2 = simulateToolChanges(stateAtStart.etm2Drill, p2, params.drillBitInterval, params.drillBitChangeMinutes).changes;
      const totalChanges = changes1 + changes2;
      stopParts.push(`Punta matkabı ×${totalChanges} (${actualRes.drillBitStopsMinutes}dk)`);
    }
    if (actualRes.paletStopsMinutes > 0) {
      const changes = Math.floor(produced / params.paletInterval);
      stopParts.push(`Palet ×${changes} (${actualRes.paletStopsMinutes}dk)`);
    }
    const stopLabel = stopParts.length > 0 ? stopParts.join(" · ") : "-";

    // 5. Generate daily Warnings
    const warnings: EtmWarning[] = [];

    // ETM-1 Cutting insert wear warnings
    if (etm1Cutting < 5) {
      warnings.push({
        type: "cutting_insert",
        machine: "ETM-1",
        message: `ETM-1 Kesici uç kritik seviyede (kalan: ${etm1Cutting} parça)`,
        severity: "critical",
      });
    } else if (etm1Cutting < 20) {
      warnings.push({
        type: "cutting_insert",
        machine: "ETM-1",
        message: `ETM-1 Kesici uç ömrü azaldı (kalan: ${etm1Cutting} parça)`,
        severity: "warning",
      });
    }

    // ETM-2 Cutting insert wear warnings
    if (etm2Cutting < 5) {
      warnings.push({
        type: "cutting_insert",
        machine: "ETM-2",
        message: `ETM-2 Kesici uç kritik seviyede (kalan: ${etm2Cutting} parça)`,
        severity: "critical",
      });
    } else if (etm2Cutting < 20) {
      warnings.push({
        type: "cutting_insert",
        machine: "ETM-2",
        message: `ETM-2 Kesici uç ömrü azaldı (kalan: ${etm2Cutting} parça)`,
        severity: "warning",
      });
    }

    // ETM-1 Drill bit wear warnings
    if (etm1Drill < 10) {
      warnings.push({
        type: "drill_bit",
        machine: "ETM-1",
        message: `ETM-1 Punta matkabı kritik seviyede (kalan: ${etm1Drill} parça)`,
        severity: "critical",
      });
    } else if (etm1Drill < 50) {
      warnings.push({
        type: "drill_bit",
        machine: "ETM-1",
        message: `ETM-1 Punta matkabı ömrü azaldı (kalan: ${etm1Drill} parça)`,
        severity: "warning",
      });
    }

    // ETM-2 Drill bit wear warnings
    if (etm2Drill < 10) {
      warnings.push({
        type: "drill_bit",
        machine: "ETM-2",
        message: `ETM-2 Punta matkabı kritik seviyede (kalan: ${etm2Drill} parça)`,
        severity: "critical",
      });
    } else if (etm2Drill < 50) {
      warnings.push({
        type: "drill_bit",
        machine: "ETM-2",
        message: `ETM-2 Punta matkabı ömrü azaldı (kalan: ${etm2Drill} parça)`,
        severity: "warning",
      });
    }

    // Chip container reminder on workdays
    if (isWorkday) {
      warnings.push({
        type: "talas_kovasi",
        machine: "hucre",
        message: "Talaş kovası boşaltma kontrolü yapılmalı (Günde 1-2 kez).",
        severity: "info",
      });
    }

    result.push({
      date,
      key,
      label: `${formatDate(date)} ${formatWeekday(date)}`,
      isWorkday,
      isBaseWorkday,
      shiftStart,
      shiftEnd,
      availableMinutes,
      overtimeMinutes: dayOvertimeMinutes,
      cuttingInsertStopsMinutes: actualRes.cuttingInsertStopsMinutes,
      drillBitStopsMinutes: actualRes.drillBitStopsMinutes,
      paletStopsMinutes: actualRes.paletStopsMinutes,
      totalStopMinutes: actualRes.totalStopMinutes,
      stopLabel,
      capacityProduced,
      produced,
      source,
      target,
      targetGap,
      etm1CuttingRemainingEnd: etm1Cutting,
      etm2CuttingRemainingEnd: etm2Cutting,
      etm1DrillRemainingEnd: etm1Drill,
      etm2DrillRemainingEnd: etm2Drill,
      warnings,
    });
  }

  return result;
}
