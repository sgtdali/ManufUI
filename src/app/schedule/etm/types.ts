export type EtmWarning = {
  type: "cutting_insert" | "drill_bit" | "palet" | "kum" | "filtre" | "bor_yagi" | "talas_kovasi";
  machine?: "ETM-1" | "ETM-2" | "hucre";
  message: string;
  severity: "info" | "warning" | "critical";
};

export type EtmDayPlan = {
  date: Date;
  key: string;
  label: string;
  isWorkday: boolean;
  isBaseWorkday: boolean;
  shiftStart: string;
  shiftEnd: string;
  availableMinutes: number;
  overtimeMinutes: number;

  cuttingInsertStopsMinutes: number;
  drillBitStopsMinutes: number;
  paletStopsMinutes: number;
  totalStopMinutes: number;
  stopLabel: string;

  capacityProduced: number;
  produced: number;
  source: "plan" | "actual" | "scenario";
  target: number;
  targetGap: number;

  etm1CuttingRemainingEnd: number;
  etm2CuttingRemainingEnd: number;
  etm1DrillRemainingEnd: number;
  etm2DrillRemainingEnd: number;

  warnings: EtmWarning[];
};

export type EtmDayOverride = {
  produced?: number;
  overtimeMinutes?: number;
  forceWorkday?: boolean;
  shiftStart?: string;
  shiftEnd?: string;
};

export type EtmProcessParams = {
  cuttingInsertInterval: number;
  cuttingInsertChangeMinutes: number;
  drillBitInterval: number;
  drillBitChangeMinutes: number;
  paletInterval: number;
  paletChangeMinutes: number;
  hatCycleMinutes: number;
  shiftMinutes: number;
};

export type BuildEtmScheduleParams = {
  startDate: string;
  endDate: string;
  dailyTarget: number;
  defaultShiftStart: string;
  defaultShiftEnd: string;
  overtimeMinutes: number;
  holidayWorkEnabled: boolean;
  etm1InitialCuttingRemaining: number;
  etm2InitialCuttingRemaining: number;
  etm1InitialDrillRemaining: number;
  etm2InitialDrillRemaining: number;
  overrides: Record<string, EtmDayOverride>;
  actuals: Record<string, number>;
  toolChangesByDate: Record<string, { machine: "ETM-1" | "ETM-2"; toolType: "cutting_insert" | "drill_bit" }[]>;
  params: EtmProcessParams;
};

export type ScheduleParamRow = {
  id: string;
  key: string;
  label: string;
  value: number;
  unit: string | null;
  is_custom: boolean;
};

export type ToolChangeItem = {
  id: string;
  tarih: string;
  machine: "ETM-1" | "ETM-2";
  tool_type: "cutting_insert" | "drill_bit";
  description: string | null;
};

