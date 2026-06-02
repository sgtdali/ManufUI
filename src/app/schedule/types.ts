// Tipler – schedule modülünün ortak tip tanımları

export type DayPlan = {
  date: Date;
  key: string;
  label: string;
  isWorkday: boolean;
  isBaseWorkday: boolean;
  shiftStart: string;
  shiftEnd: string;
  furnaceStart: string;
  availableMinutes: number;
  overtimeMinutes: number;
  maintenanceMinutes: number;
  startMaintenanceMinutes: number;
  midMaintenanceMinutes: number;
  midMaintenanceStartMinute: number | null;
  midMaintenanceComplete: boolean;
  maintenanceLabel: string;
  femaleMaintMinutes?: number;
  maleMaintMinutes?: number;
  ringMaintMinutes?: number;
  pressStartTime: string | null;
  capacityPressed: number;
  pressed: number;
  source: "plan" | "actual" | "scenario";
  sameDayEtmReady: number;
  target: number;
  targetGap: number;
  maleRemainingEnd: number;
  femaleRemainingEnd: number;
  ringRemainingEnd: number;
  lastFurnaceExitTime: string | null;
  breakdownMinutes: number;
  breakdownDetails: string[];
  etm1CuttingRemainingEnd?: number;
  etm2CuttingRemainingEnd?: number;
  etm1DrillRemainingEnd?: number;
  etm2DrillRemainingEnd?: number;
  etmWarnings?: EtmWarning[];
  etmCuttingStopsMinutes?: number;
  etmDrillStopsMinutes?: number;
  etmPaletStopsMinutes?: number;
  etm1CuttingStart?: number;
  etm2CuttingStart?: number;
  etm1DrillStart?: number;
  etm2DrillStart?: number;
  etmWipStart?: number;
  etmWipEnd?: number;
  rob108WipStart?: number;
  rob108WipEnd?: number;
  rob108Cell1Prod?: number;
  rob108Cell1AvailableMinutes?: number;
  rob108Cell2Rob108Prod?: number;
  rob108Cell2Rob104Prod?: number;
  rob108Cell2AvailableMinutes?: number;
  rob108Cell1L1ToolStart?: number;
  rob108Cell1L2ToolStart?: number;
  rob108Cell1L3ToolStart?: number;
  rob108Cell2Rob108L1ToolStart?: number;
  rob108Cell2Rob108L2ToolStart?: number;
  rob108Cell2Rob104L1ToolStart?: number;
  rob108Cell2Rob104L2ToolStart?: number;
};

export type EtmWarning = {
  type: "cutting_insert" | "drill_bit" | "palet" | "kum" | "filtre" | "bor_yagi" | "talas_kovasi";
  machine?: "ETM-1" | "ETM-2" | "hucre";
  message: string;
  severity: "info" | "warning" | "critical";
};

export type DayOverride = {
  pressed?: number;
  overtimeMinutes?: number;
  forceWorkday?: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  furnaceStart?: string;
  dieCoolingMinutes?: number;
  customGanttItems?: CustomGanttItem[];
  disabledSegments?: string[];
  disabledOperations?: string[];
  postponeMaleChange?: boolean;
  postponeFemaleChange?: boolean;
  postponeRingChange?: boolean;
  moldMaintenanceStart?: string;
  moldChangeMode?: "auto" | "postpone" | "manual";
  manualMoldType?: "male" | "female" | "ring" | "male+ring" | "female+ring";
  manualMoldChangeAfterPieces?: number;
  femaleChangeMinutes?: number;
  maleChangeMinutes?: number;
  ringChangeMinutes?: number;
};

export type CustomGanttItem = {
  id: string;
  label: string;
  startTime: string;
  durationMinutes: number;
};

export type ScheduleParam = {
  id: string;
  key: string;
  label: string;
  value: number;
  unit: string | null;
  is_custom: boolean;
};

export type GanttDependency = {
  id: string;
  dayKey: string;
  predecessorId: string;
  predecessorLabel: string;
  successorId: string;
  successorLabel: string;
};

export type ToolChangeItem = {
  id: string;
  tarih: string;
  machine: "ETM-1" | "ETM-2";
  tool_type: "cutting_insert" | "drill_bit";
  description: string | null;
};
