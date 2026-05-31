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
};

export type ScheduleParam = {
  id: string;
  key: string;
  label: string;
  value: number;
  unit: string | null;
  is_custom: boolean;
};
