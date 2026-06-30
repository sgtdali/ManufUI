export const FORECAST_CELLS = [
  "Pres Hücresi",
  "ETM Hücresi",
  "ROB108 Hücresi",
  "Flowform Hücresi",
  "ROB104 Hücresi",
  "N602 Hücresi",
  "N603 Hücresi",
  "ROB109 Hücresi",
  "Quench Hücresi",
  "ROB110-111 Hücresi",
  "Fosfat Hücresi",
  "Boya Hücresi",
] as const;

export type ForecastCell = (typeof FORECAST_CELLS)[number];

export type SlotActual = {
  bolum: string;
  tarih: string;
  zamanDilimi: string;
  uretimAdeti: number;
  downtimeDk: number;
  downtimeTurler: string[];
};
