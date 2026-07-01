import { SlotActual, FORECAST_CELLS } from "../_lib/constants";

export type SlotKey = string; // `${bolum}||${tarih}||${zamanDilimi}`
export type Intervention = { disabled?: boolean; extraHours?: number };
export type InterventionMap = Record<string, Record<string, Intervention>>; // tarih → bolum → override

export type ProjectionDayCell = {
  uretim: number;
  wipGiren: number;   // WIP at start of day (queue this cell draws from)
  wipCikan: number;   // WIP at end of day
  bitti: boolean;
};

export type ProjectionDay = {
  tarih: string;
  isWorkday: boolean;
  cells: Record<string, ProjectionDayCell>;
};

export function slotKey(bolum: string, tarih: string, zamanDilimi: string): SlotKey {
  return `${bolum}||${tarih}||${zamanDilimi}`;
}

// Saudi work week: Sun(0)–Thu(4) working, Fri(5)–Sat(6) weekend
export function isWorkday(dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  return day !== 5 && day !== 6;
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Compute per-cell hourly averages from selected slots
export function computeCellAverages(
  actuals: SlotActual[],
  selectedSlots: Set<SlotKey>
): Record<string, number> {
  const totals: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const s of actuals) {
    const key = slotKey(s.bolum, s.tarih, s.zamanDilimi);
    if (!selectedSlots.has(key)) continue;
    totals[s.bolum] = (totals[s.bolum] ?? 0) + s.uretimAdeti;
    counts[s.bolum] = (counts[s.bolum] ?? 0) + 1;
  }

  const avgs: Record<string, number> = {};
  for (const cell of FORECAST_CELLS) {
    avgs[cell] = counts[cell] ? totals[cell] / counts[cell] : 0;
  }
  return avgs;
}

// Compute current WIP at each junction from cumulative actuals
export function computeCurrentWip(actuals: SlotActual[]): Record<string, number> {
  const cumSum: Record<string, number> = {};
  for (const cell of FORECAST_CELLS) cumSum[cell] = 0;

  for (const s of actuals) {
    if (cumSum[s.bolum] !== undefined) cumSum[s.bolum] += s.uretimAdeti;
  }

  const n602n603 = cumSum["N602 Hücresi"] + cumSum["N603 Hücresi"];

  return {
    "Pres→ETM": Math.max(0, cumSum["Pres Hücresi"] - cumSum["ETM Hücresi"]),
    "ETM→ROB108": Math.max(0, cumSum["ETM Hücresi"] - cumSum["ROB108 Hücresi"]),
    "ROB108→Flowform": Math.max(0, cumSum["ROB108 Hücresi"] - cumSum["Flowform Hücresi"]),
    "Flowform→ROB104": Math.max(0, cumSum["Flowform Hücresi"] - cumSum["ROB104 Hücresi"]),
    "ROB104→N": Math.max(0, cumSum["ROB104 Hücresi"] - n602n603),
    "N→ROB109": Math.max(0, n602n603 - cumSum["ROB109 Hücresi"]),
    "ROB109→Quench": Math.max(0, cumSum["ROB109 Hücresi"] - cumSum["Quench Hücresi"]),
    "Quench→ROB110": Math.max(0, cumSum["Quench Hücresi"] - cumSum["ROB110-111 Hücresi"]),
    "ROB110→Fosfat": Math.max(0, cumSum["ROB110-111 Hücresi"] - cumSum["Fosfat Hücresi"]),
    "Fosfat→Boya": Math.max(0, cumSum["Fosfat Hücresi"] - cumSum["Boya Hücresi"]),
  };
}

const STANDARD_HOURS = 9;

function getDailyCapacity(
  bolum: string,
  dateStr: string,
  hourlyAvg: number,
  interventions: InterventionMap
): number {
  const iv = interventions[dateStr]?.[bolum];
  if (iv?.disabled) return 0;

  const working = iv ? true : isWorkday(dateStr); // intervention overrides weekend
  if (!working) return 0;

  const extraHours = iv?.extraHours ?? 0;
  return hourlyAvg * (STANDARD_HOURS + extraHours);
}

export function computeProjection(
  startDate: string,
  presEndDate: string,
  cellAvgs: Record<string, number>,
  initialWip: Record<string, number>,
  interventions: InterventionMap,
  maxDays = 120
): ProjectionDay[] {
  const wip = { ...initialWip };
  const days: ProjectionDay[] = [];

  // Track if upstream chain is exhausted (no more parts will ever arrive)
  // presExhausted = true after presEndDate and wip["Pres→ETM"] = 0
  let presExhausted = false;
  const junctionExhausted: Record<string, boolean> = {};

  for (let i = 0; i < maxDays; i++) {
    const dateStr = addDays(startDate, i);

    // Check if we can stop early: all WIP zeros and Pres exhausted
    if (i > 0 && presExhausted && Object.values(wip).every((v) => v <= 0)) break;

    const dayResult: ProjectionDay = { tarih: dateStr, isWorkday: isWorkday(dateStr), cells: {} };

    // ─── Pres ────────────────────────────────────────────────────
    const presAfterEnd = dateStr > presEndDate;
    const presCap = presAfterEnd ? 0 : getDailyCapacity("Pres Hücresi", dateStr, cellAvgs["Pres Hücresi"] ?? 0, interventions);
    const presUretim = presCap;
    wip["Pres→ETM"] += presUretim;
    dayResult.cells["Pres Hücresi"] = { uretim: presUretim, wipGiren: 0, wipCikan: 0, bitti: presAfterEnd && wip["Pres→ETM"] <= 0 };

    if (presAfterEnd && wip["Pres→ETM"] <= 0) presExhausted = true;

    // ─── ETM ─────────────────────────────────────────────────────
    const etmWipStart = wip["Pres→ETM"];
    const etmCap = getDailyCapacity("ETM Hücresi", dateStr, cellAvgs["ETM Hücresi"] ?? 0, interventions);
    const etmUretim = Math.min(etmCap, wip["Pres→ETM"]);
    wip["Pres→ETM"] -= etmUretim;
    wip["ETM→ROB108"] += etmUretim;
    dayResult.cells["ETM Hücresi"] = { uretim: etmUretim, wipGiren: etmWipStart, wipCikan: wip["Pres→ETM"], bitti: false };

    // ─── ROB108 ──────────────────────────────────────────────────
    const rob108WipStart = wip["ETM→ROB108"];
    const rob108Cap = getDailyCapacity("ROB108 Hücresi", dateStr, cellAvgs["ROB108 Hücresi"] ?? 0, interventions);
    const rob108Uretim = Math.min(rob108Cap, wip["ETM→ROB108"]);
    wip["ETM→ROB108"] -= rob108Uretim;
    wip["ROB108→Flowform"] += rob108Uretim;
    dayResult.cells["ROB108 Hücresi"] = { uretim: rob108Uretim, wipGiren: rob108WipStart, wipCikan: wip["ETM→ROB108"], bitti: false };

    // ─── Flowform ─────────────────────────────────────────────────
    const ffWipStart = wip["ROB108→Flowform"];
    const ffCap = getDailyCapacity("Flowform Hücresi", dateStr, cellAvgs["Flowform Hücresi"] ?? 0, interventions);
    const ffUretim = Math.min(ffCap, wip["ROB108→Flowform"]);
    wip["ROB108→Flowform"] -= ffUretim;
    wip["Flowform→ROB104"] += ffUretim;
    dayResult.cells["Flowform Hücresi"] = { uretim: ffUretim, wipGiren: ffWipStart, wipCikan: wip["ROB108→Flowform"], bitti: false };

    // ─── ROB104 ───────────────────────────────────────────────────
    const rob104WipStart = wip["Flowform→ROB104"];
    const rob104Cap = getDailyCapacity("ROB104 Hücresi", dateStr, cellAvgs["ROB104 Hücresi"] ?? 0, interventions);
    const rob104Uretim = Math.min(rob104Cap, wip["Flowform→ROB104"]);
    wip["Flowform→ROB104"] -= rob104Uretim;
    wip["ROB104→N"] += rob104Uretim;
    dayResult.cells["ROB104 Hücresi"] = { uretim: rob104Uretim, wipGiren: rob104WipStart, wipCikan: wip["Flowform→ROB104"], bitti: false };

    // ─── N602 + N603 (parallel, combined pool) ───────────────────
    const nWipStart = wip["ROB104→N"];
    const n602Cap = getDailyCapacity("N602 Hücresi", dateStr, cellAvgs["N602 Hücresi"] ?? 0, interventions);
    const n603Cap = getDailyCapacity("N603 Hücresi", dateStr, cellAvgs["N603 Hücresi"] ?? 0, interventions);
    const nCombinedCap = n602Cap + n603Cap;
    const nCombinedUretim = Math.min(nCombinedCap, wip["ROB104→N"]);
    const n602Uretim = nCombinedCap > 0 ? Math.round(nCombinedUretim * (n602Cap / nCombinedCap)) : 0;
    const n603Uretim = nCombinedUretim - n602Uretim;
    wip["ROB104→N"] -= nCombinedUretim;
    wip["N→ROB109"] += nCombinedUretim;
    dayResult.cells["N602 Hücresi"] = { uretim: n602Uretim, wipGiren: nWipStart, wipCikan: wip["ROB104→N"], bitti: false };
    dayResult.cells["N603 Hücresi"] = { uretim: n603Uretim, wipGiren: nWipStart, wipCikan: wip["ROB104→N"], bitti: false };

    // ─── ROB109 ───────────────────────────────────────────────────
    const rob109WipStart = wip["N→ROB109"];
    const rob109Cap = getDailyCapacity("ROB109 Hücresi", dateStr, cellAvgs["ROB109 Hücresi"] ?? 0, interventions);
    const rob109Uretim = Math.min(rob109Cap, wip["N→ROB109"]);
    wip["N→ROB109"] -= rob109Uretim;
    wip["ROB109→Quench"] += rob109Uretim;
    dayResult.cells["ROB109 Hücresi"] = { uretim: rob109Uretim, wipGiren: rob109WipStart, wipCikan: wip["N→ROB109"], bitti: false };

    // ─── Quench ───────────────────────────────────────────────────
    const quenchWipStart = wip["ROB109→Quench"];
    const quenchCap = getDailyCapacity("Quench Hücresi", dateStr, cellAvgs["Quench Hücresi"] ?? 0, interventions);
    const quenchUretim = Math.min(quenchCap, wip["ROB109→Quench"]);
    wip["ROB109→Quench"] -= quenchUretim;
    wip["Quench→ROB110"] += quenchUretim;
    dayResult.cells["Quench Hücresi"] = { uretim: quenchUretim, wipGiren: quenchWipStart, wipCikan: wip["ROB109→Quench"], bitti: false };

    // ─── ROB110-111 ───────────────────────────────────────────────
    const rob110WipStart = wip["Quench→ROB110"];
    const rob110Cap = getDailyCapacity("ROB110-111 Hücresi", dateStr, cellAvgs["ROB110-111 Hücresi"] ?? 0, interventions);
    const rob110Uretim = Math.min(rob110Cap, wip["Quench→ROB110"]);
    wip["Quench→ROB110"] -= rob110Uretim;
    wip["ROB110→Fosfat"] += rob110Uretim;
    dayResult.cells["ROB110-111 Hücresi"] = { uretim: rob110Uretim, wipGiren: rob110WipStart, wipCikan: wip["Quench→ROB110"], bitti: false };

    // ─── Fosfat ───────────────────────────────────────────────────
    const fosfatWipStart = wip["ROB110→Fosfat"];
    const fosfatCap = getDailyCapacity("Fosfat Hücresi", dateStr, cellAvgs["Fosfat Hücresi"] ?? 0, interventions);
    const fosfatUretim = Math.min(fosfatCap, wip["ROB110→Fosfat"]);
    wip["ROB110→Fosfat"] -= fosfatUretim;
    wip["Fosfat→Boya"] += fosfatUretim;
    dayResult.cells["Fosfat Hücresi"] = { uretim: fosfatUretim, wipGiren: fosfatWipStart, wipCikan: wip["ROB110→Fosfat"], bitti: false };

    // ─── Boya ─────────────────────────────────────────────────────
    const boyaWipStart = wip["Fosfat→Boya"];
    const boyaCap = getDailyCapacity("Boya Hücresi", dateStr, cellAvgs["Boya Hücresi"] ?? 0, interventions);
    const boyaUretim = Math.min(boyaCap, wip["Fosfat→Boya"]);
    wip["Fosfat→Boya"] -= boyaUretim;
    dayResult.cells["Boya Hücresi"] = { uretim: boyaUretim, wipGiren: boyaWipStart, wipCikan: wip["Fosfat→Boya"], bitti: false };

    days.push(dayResult);
  }

  return days;
}

export function computeFinishDates(
  projection: ProjectionDay[],
  presEndDate: string
): Record<string, string | null> {
  const finishDates: Record<string, string | null> = {};

  // Pres finish date is fixed
  finishDates["Pres Hücresi"] = presEndDate;

  // For other cells: last day they produced > 0
  for (const cell of FORECAST_CELLS) {
    if (cell === "Pres Hücresi") continue;
    let lastActiveDate: string | null = null;
    for (const day of projection) {
      if ((day.cells[cell]?.uretim ?? 0) > 0) {
        lastActiveDate = day.tarih;
      }
    }
    finishDates[cell] = lastActiveDate;
  }

  return finishDates;
}
