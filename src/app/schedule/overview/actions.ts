"use server";

import { createClient } from "@/lib/supabase/server";

import { CELLS, type CellName } from "./constants";

type ProductionRow = {
  uretim_adeti: number | null;
};

type ProductionRecord = {
  bolum: string;
  tarih: string;
  manuf_production_rows: ProductionRow[] | null;
};

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function loadAllCellActuals(startDate: string, endDate: string) {
  // Return structure: Record<cellName, Record<dateKey, number>>
  const actuals: Record<string, Record<string, number>> = {};
  for (const cell of CELLS) {
    actuals[cell] = {};
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("bolum, tarih, manuf_production_rows(uretim_adeti)")
    .gte("tarih", startDate)
    .lte("tarih", endDate);

  if (error) {
    console.error("loadAllCellActuals error:", error.message);
    return actuals;
  }

  for (const record of (data ?? []) as ProductionRecord[]) {
    // Find matching cell
    const matchedCell = CELLS.find(
      (cell) => record.bolum === cell || record.bolum?.startsWith(cell)
    );
    if (matchedCell) {
      const dateKey = record.tarih;
      const total = (record.manuf_production_rows ?? []).reduce(
        (sum, row) => sum + numberValue(row.uretim_adeti),
        0
      );
      actuals[matchedCell][dateKey] = (actuals[matchedCell][dateKey] ?? 0) + total;
    }
  }

  return actuals;
}

export type CellParam = {
  gunluk_max_kapasite: number | null;
  notlar: string | null;
};

export async function loadCellParams() {
  const params: Record<string, CellParam> = {};
  for (const cell of CELLS) {
    params[cell] = { gunluk_max_kapasite: null, notlar: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_cell_params")
    .select("bolum, gunluk_max_kapasite, notlar");

  if (error) {
    // Handle error gracefully if table does not exist
    console.warn("loadCellParams: Table 'manuf_cell_params' may not exist or load failed. Error:", error.message);
    return params;
  }

  for (const row of data ?? []) {
    if (row.bolum && params[row.bolum] !== undefined) {
      params[row.bolum] = {
        gunluk_max_kapasite: row.gunluk_max_kapasite ?? null,
        notlar: row.notlar ?? null,
      };
    }
  }

  return params;
}

export type WipStockItem = {
  tarih: string;
  kaynak_hucresi: string;
  hedef_hucresi: string;
  hesaplanan_adet: number;
  gercek_adet: number | null;
  override_edildi: boolean;
};

export async function loadWipStock(startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_wip_stock")
    .select("tarih, kaynak_hucresi, hedef_hucresi, hesaplanan_adet, gercek_adet, override_edildi")
    .gte("tarih", startDate)
    .lte("tarih", endDate);

  if (error) {
    console.warn("loadWipStock: Table 'manuf_wip_stock' may not exist or load failed. Error:", error.message);
    return [] as WipStockItem[];
  }

  return (data ?? []) as WipStockItem[];
}
