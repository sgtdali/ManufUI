export const CELLS = [
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

export type CellName = typeof CELLS[number];

export const CELL_FLOWS: Record<CellName, { upstream: CellName[]; downstream: CellName[] }> = {
  "Pres Hücresi": { upstream: [], downstream: ["ETM Hücresi"] },
  "ETM Hücresi": { upstream: ["Pres Hücresi"], downstream: ["ROB108 Hücresi"] },
  "ROB108 Hücresi": { upstream: ["ETM Hücresi"], downstream: ["Flowform Hücresi"] },
  "Flowform Hücresi": { upstream: ["ROB108 Hücresi"], downstream: ["ROB104 Hücresi"] },
  "ROB104 Hücresi": { upstream: ["Flowform Hücresi"], downstream: ["N602 Hücresi", "N603 Hücresi"] },
  "N602 Hücresi": { upstream: ["ROB104 Hücresi"], downstream: ["ROB109 Hücresi"] },
  "N603 Hücresi": { upstream: ["ROB104 Hücresi"], downstream: ["ROB109 Hücresi"] },
  "ROB109 Hücresi": { upstream: ["N602 Hücresi", "N603 Hücresi"], downstream: ["Quench Hücresi"] },
  "Quench Hücresi": { upstream: ["ROB109 Hücresi"], downstream: ["ROB110-111 Hücresi"] },
  "ROB110-111 Hücresi": { upstream: ["Quench Hücresi"], downstream: ["Fosfat Hücresi"] },
  "Fosfat Hücresi": { upstream: ["ROB110-111 Hücresi"], downstream: ["Boya Hücresi"] },
  "Boya Hücresi": { upstream: ["Fosfat Hücresi"], downstream: [] },
};
