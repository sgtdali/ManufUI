"use server";

import { createClient } from "@/lib/supabase/server";
import { CELLS, CELL_FLOWS, type CellName } from "./constants";
import { getDaysInRange, toDayKey } from "../utils";

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
import type { WipStockItem } from "../actions";

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

export async function calculateAndSaveWip(
  startDate: string,
  endDate: string,
  actuals: Record<string, Record<string, number>>
): Promise<{ success: boolean; error?: string; upsertedCount: number }> {
  const supabase = await createClient();

  // 1. Get all days in the range chronologically
  const days = getDaysInRange(startDate, endDate);
  if (days.length === 0) {
    return { success: true, upsertedCount: 0 };
  }

  // 2. Fetch already overridden records to preserve them
  const { data: overriddenData, error: readError } = await supabase
    .from("manuf_wip_stock")
    .select("tarih, kaynak_hucresi, hedef_hucresi")
    .eq("override_edildi", true)
    .gte("tarih", startDate)
    .lte("tarih", endDate);

  if (readError) {
    console.error("calculateAndSaveWip read error:", readError.message);
    return { success: false, error: readError.message, upsertedCount: 0 };
  }

  const overriddenSet = new Set<string>();
  for (const item of overriddenData ?? []) {
    const key = `${item.tarih}_${item.kaynak_hucresi}_${item.hedef_hucresi}`;
    overriddenSet.add(key);
  }

  // 3. Initialize cumulative production counters
  const cumulative: Record<string, number> = {};
  for (const cell of CELLS) {
    cumulative[cell] = 0;
  }

  const recordsToUpsert: Array<{
    tarih: string;
    kaynak_hucresi: string;
    hedef_hucresi: string;
    hesaplanan_adet: number;
  }> = [];

  // 4. Chronological WIP calculation
  for (const d of days) {
    const dateKey = toDayKey(d);

    // Update cumulative actuals for all cells on this day
    for (const cell of CELLS) {
      cumulative[cell] += actuals[cell]?.[dateKey] ?? 0;
    }

    // Calculate WIP for each valid transition path
    for (const cell of CELLS) {
      const flows = CELL_FLOWS[cell] || { upstream: [], downstream: [] };
      for (const down of flows.downstream) {
        // Skip path if it is ROB104 -> N603 (it is combined into ROB104 -> N602)
        if (cell === "ROB104 Hücresi" && down === "N603 Hücresi") {
          continue;
        }
        // Skip path if it is N603 -> ROB109 (it is combined into N602 -> ROB109)
        if (cell === "N603 Hücresi" && down === "ROB109 Hücresi") {
          continue;
        }

        let wip = 0;
        if (cell === "ROB104 Hücresi" && down === "N602 Hücresi") {
          // Combined: ROB104 -> (N602 + N603)
          wip = cumulative["ROB104 Hücresi"] - (cumulative["N602 Hücresi"] + cumulative["N603 Hücresi"]);
        } else if (cell === "N602 Hücresi" && down === "ROB109 Hücresi") {
          // Combined: (N602 + N603) -> ROB109
          wip = (cumulative["N602 Hücresi"] + cumulative["N603 Hücresi"]) - cumulative["ROB109 Hücresi"];
        } else {
          // Standard cumulative difference
          wip = cumulative[cell] - cumulative[down];
        }

        const key = `${dateKey}_${cell}_${down}`;
        if (!overriddenSet.has(key)) {
          recordsToUpsert.push({
            tarih: dateKey,
            kaynak_hucresi: cell,
            hedef_hucresi: down,
            hesaplanan_adet: wip,
          });
        }
      }
    }
  }

  if (recordsToUpsert.length === 0) {
    return { success: true, upsertedCount: 0 };
  }

  // 5. Upsert calculated records
  const { error: upsertError } = await supabase
    .from("manuf_wip_stock")
    .upsert(recordsToUpsert, { onConflict: "tarih,kaynak_hucresi,hedef_hucresi" });

  if (upsertError) {
    console.error("calculateAndSaveWip upsert error:", upsertError.message);
    return { success: false, error: upsertError.message, upsertedCount: 0 };
  }

  return { success: true, upsertedCount: recordsToUpsert.length };
}
