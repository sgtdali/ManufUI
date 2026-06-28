export const DISPLAY_CELLS = [
  "Pres Hücresi",
  "ETM Hücresi",
  "ROB108 Hücresi",
  "Flowform Hücresi",
  "ROB104 Hücresi",
  "N602-N603 Hücresi",
  "ROB109 Hücresi",
  "Quench Hücresi",
  "ROB110-111 Hücresi",
  "Fosfat Hücresi",
  "Boya Hücresi",
];

export const CELL_START_DATES: Record<string, string> = {
  "Pres Hücresi": "2026-06-14",
  "ROB108 Hücresi": "2026-06-15",
  "Flowform Hücresi": "2026-06-15",
  "ROB104 Hücresi": "2026-06-16",
  "N602-N603 Hücresi": "2026-06-16",
  "ROB109 Hücresi": "2026-06-17",
  "Quench Hücresi": "2026-06-17",
  "ROB110-111 Hücresi": "2026-06-18",
  "Fosfat Hücresi": "2026-06-18",
  "Boya Hücresi": "2026-06-21",
};

export const EXCLUDED_FROM_PERCENTAGE = ["ROB110-111 Hücresi", "Fosfat Hücresi", "Boya Hücresi"];

export function getCellStartDate(cell: string): string {
  return CELL_START_DATES[cell] ?? "2026-06-14";
}

export function getWeekdayDifference(startStr: string, endStr: string): number {
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 5 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
