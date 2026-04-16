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

export function getRequiredDowntimeMinutes(row: ProductionRow) {
  const hedef = positiveNumber(row.hedef_uretim_adeti);
  if (hedef <= 0) return 0;

  const uretim = positiveNumber(row.uretim_adeti);
  const eksikAdet = Math.max(hedef - uretim, 0);
  if (eksikAdet <= 0) return 0;

  return Math.ceil(eksikAdet * (60 / hedef));
}

export function getEnteredDowntimeMinutes(row: ProductionRow) {
  return DURUS_SURE_KEYS.reduce(
    (total, key) => total + positiveNumber(row[key]),
    0
  );
}

export function validateTargetDowntime(data: ProductionFormData) {
  const issues: TargetDowntimeIssue[] = [];

  data.rows.forEach((row) => {
    const hedef = positiveNumber(row.hedef_uretim_adeti);
    if (hedef <= 0) return;

    const uretim = positiveNumber(row.uretim_adeti);
    const gerekliDakika = getRequiredDowntimeMinutes(row);
    if (gerekliDakika <= 0) return;

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
  });

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
