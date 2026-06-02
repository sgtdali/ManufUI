export type CellStateField = {
  key: string;
  label: string;
  min?: number;
  defaultValue: string;
};

export const CELL_STATE_CONFIG: Partial<Record<string, CellStateField[]>> = {
  "Pres Hücresi": [
    { key: "maleRemaining", label: "Erkek kalıp kalan adet", min: 0, defaultValue: "500" },
    { key: "femaleRemaining", label: "Dişi kalıp kalan adet", min: 0, defaultValue: "1300" },
    { key: "ringRemaining", label: "HIP Ring kalan adet", min: 0, defaultValue: "1300" },
  ],
  "ETM Hücresi": [
    { key: "wip", label: "Başlangıç WIP (Pres → ETM)", min: 0, defaultValue: "0" },
    { key: "etm1Cutting", label: "ETM-1 Kesici Uç Kalan", min: 0, defaultValue: "10" },
    { key: "etm2Cutting", label: "ETM-2 Kesici Uç Kalan", min: 0, defaultValue: "10" },
    { key: "etm1Drill", label: "ETM-1 Punta Matkabı Kalan", min: 0, defaultValue: "300" },
    { key: "etm2Drill", label: "ETM-2 Punta Matkabı Kalan", min: 0, defaultValue: "300" },
  ],
  "ROB108 Hücresi": [
    { key: "wip", label: "Başlangıç WIP (ETM → ROB108)", min: 0, defaultValue: "0" },
    { key: "cell1L1Tool", label: "Cell1 T1 Takım Kalan", min: 1, defaultValue: "5" },
    { key: "cell1L2Tool", label: "Cell1 T2 Takım Kalan", min: 1, defaultValue: "5" },
    { key: "cell1L3Tool", label: "Cell1 T3 Takım Kalan", min: 1, defaultValue: "5" },
    { key: "cell2Rob108L1Tool", label: "Cell2 ROB108 T1 Kalan", min: 1, defaultValue: "5" },
    { key: "cell2Rob108L2Tool", label: "Cell2 ROB108 T2 Kalan", min: 1, defaultValue: "5" },
    { key: "cell2Rob104L1Tool", label: "Cell2 ROB104 T1 Kalan", min: 1, defaultValue: "5" },
    { key: "cell2Rob104L2Tool", label: "Cell2 ROB104 T2 Kalan", min: 1, defaultValue: "5" },
  ],
};

export function getDefaultCellState(cell: string): Record<string, string> {
  const config = CELL_STATE_CONFIG[cell] ?? [];
  return Object.fromEntries(config.map((f) => [f.key, f.defaultValue]));
}

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
