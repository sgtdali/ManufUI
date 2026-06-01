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
  pressStartTime: string | null;
  capacityPressed: number;
  pressed: number;
  source: "plan" | "actual" | "scenario";
  sameDayEtmReady: number;
  target: number;
  targetGap: number;
  maleRemainingEnd: number;
  femaleRemainingEnd: number;
  lastFurnaceExitTime: string | null;
  breakdownMinutes: number;
  breakdownDetails: string[];
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
  moldMaintenanceStart?: string;
  moldChangeMode?: "auto" | "postpone" | "manual";
  manualMoldType?: "male" | "female";
  manualMoldChangeAfterPieces?: number;
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
