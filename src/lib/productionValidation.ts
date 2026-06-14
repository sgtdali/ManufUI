import {
  DURUS_KOLONLARI,
  type ProductionFormData,
  type ProductionRow,
} from "@/lib/types";

export type TargetDowntimeIssue = {
  zamanDilimi: string;
  hedef: number;
  uretim: number;
  eksikAdet: number;
  gerekliDakika: number;
  girilenDakika: number;
};

const DURUS_SURE_KEYS = DURUS_KOLONLARI.map((column) => column.key);

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

export function getRequiredDowntimeMinutes(row: ProductionRow, bolum?: string, tarih?: string | null) {
  const hedef = positiveNumber(row.hedef_uretim_adeti);
  if (hedef <= 0) return 0;

  const uretim = positiveNumber(row.uretim_adeti);
  const eksikAdet = Math.max(hedef - uretim, 0);
  if (eksikAdet <= 0) return 0;

  let slotMinutes = 60;
  if (row.zaman_dilimi === "Günlük") {
    if (tarih) {
      const day = new Date(`${tarih}T00:00:00`).getDay();
      slotMinutes = (day === 5 || day === 6) ? 480 : 540;
    } else {
      slotMinutes = 540;
    }
  }

  return Math.ceil(eksikAdet * (slotMinutes / hedef));
}

export function getEnteredDowntimeMinutes(row: ProductionRow) {
  return DURUS_SURE_KEYS.reduce(
    (total, key) => total + positiveNumber(row[key]),
    0
  );
}

export function validateTargetDowntime(data: ProductionFormData) {
  const issues: TargetDowntimeIssue[] = [];

  // Find the last index of a row that has user input (uretim_adeti is not null, or some downtime is entered)
  let lastActiveIndex = -1;
  for (let i = data.rows.length - 1; i >= 0; i--) {
    const row = data.rows[i];
    const hasUretim = row.uretim_adeti !== null;
    const hasDowntime = getEnteredDowntimeMinutes(row) > 0;
    if (hasUretim || hasDowntime) {
      lastActiveIndex = i;
      break;
    }
  }

  // Validate only rows from index 0 up to lastActiveIndex
  for (let i = 0; i <= lastActiveIndex; i++) {
    const row = data.rows[i];
    const hedef = positiveNumber(row.hedef_uretim_adeti);
    if (hedef <= 0) continue;

    const uretim = positiveNumber(row.uretim_adeti);
    const gerekliDakika = getRequiredDowntimeMinutes(row, data.bolum, data.tarih);
    if (gerekliDakika <= 0) continue;

    const girilenDakika = getEnteredDowntimeMinutes(row);
    if (girilenDakika < gerekliDakika) {
      issues.push({
        zamanDilimi: row.zaman_dilimi,
        hedef,
        uretim,
        eksikAdet: hedef - uretim,
        gerekliDakika,
        girilenDakika,
      });
    }
  }

  return issues;
}

export function formatTargetDowntimeIssues(issues: TargetDowntimeIssue[]) {
  return issues
    .map(
      (issue) =>
        `${issue.zamanDilimi}: hedef ${issue.hedef}, gerçekleşen ${issue.uretim}, ` +
        `eksik ${issue.eksikAdet} adet için en az ${issue.gerekliDakika} dk duruş girilmeli ` +
        `(girilen ${issue.girilenDakika} dk).`
    )
    .join("\n");
}
