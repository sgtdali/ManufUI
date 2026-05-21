"use server";

import { createClient } from "@/lib/supabase/server";
import { isWeekday } from "./utils";

type ProductionRow = {
  uretim_adeti: number | null;
};

type ProductionRecord = {
  tarih: string;
  manuf_production_rows: ProductionRow[] | null;
};

function isDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function loadPressActuals(startDate: string, endDate: string) {
  if (!isDateValue(startDate) || !isDateValue(endDate) || startDate > endDate) {
    return { success: false, error: "Geçersiz tarih aralığı.", actuals: {} };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("tarih, manuf_production_rows(uretim_adeti)")
    .like("bolum", "Pres%")
    .gte("tarih", startDate)
    .lte("tarih", endDate);

  if (error) {
    return { success: false, error: error.message, actuals: {} };
  }

  const actuals: Record<string, number> = {};
  for (const record of (data ?? []) as ProductionRecord[]) {
    actuals[record.tarih] = (record.manuf_production_rows ?? []).reduce(
      (total, row) => total + numberValue(row.uretim_adeti),
      actuals[record.tarih] ?? 0
    );
  }

  return { success: true, actuals };
}

export type MoldChange = {
  id: string;
  tarih: string;
  mold_type: "male" | "female";
  description: string | null;
  created_at: string;
};

export async function loadMoldChanges(startDate: string, endDate: string) {
  if (!isDateValue(startDate) || !isDateValue(endDate) || startDate > endDate) {
    return { success: false, error: "Geçersiz tarih aralığı.", data: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_mold_changes")
    .select("*")
    .gte("tarih", startDate)
    .lte("tarih", endDate)
    .order("tarih", { ascending: true });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data as MoldChange[] };
}

export async function saveMoldChange(tarih: string, moldType: "male" | "female", description?: string) {
  if (!isDateValue(tarih)) {
    return { success: false, error: "Geçersiz tarih." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_mold_changes")
    .upsert(
      {
        tarih,
        mold_type: moldType,
        description: description || null,
        created_at: new Date().toISOString(),
      },
      { onConflict: "tarih,mold_type" }
    )
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function deleteMoldChange(id: string) {
  if (!id) {
    return { success: false, error: "Kayıt kimliği belirtilmedi." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_mold_changes")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ── Proses parametreleri ──────────────────────────────────────────────────────

export type ScheduleParamRow = {
  id: string;
  key: string;
  label: string;
  value: number;
  unit: string | null;
  is_custom: boolean;
};

export async function loadScheduleParams() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_schedule_params")
    .select("id, key, label, value, unit, is_custom")
    .order("is_custom", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message, data: [] as ScheduleParamRow[] };
  return { success: true, data: (data ?? []) as ScheduleParamRow[] };
}

export async function upsertScheduleParamValue(key: string, value: number) {
  if (!key) return { success: false, error: "Anahtar belirtilmedi." };
  if (!Number.isFinite(value)) return { success: false, error: "Geçersiz değer." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_schedule_params")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function saveCustomScheduleParam(
  key: string,
  label: string,
  value: number,
  unit: string | null,
) {
  if (!key || !label) return { success: false, error: "Anahtar ve etiket zorunludur." };
  if (!Number.isFinite(value)) return { success: false, error: "Geçersiz değer." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_schedule_params")
    .upsert(
      { key, label, value, unit: unit || null, is_custom: true, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    )
    .select("id, key, label, value, unit, is_custom")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ScheduleParamRow };
}

export async function deleteCustomScheduleParam(key: string) {
  if (!key) return { success: false, error: "Anahtar belirtilmedi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_schedule_params")
    .delete()
    .eq("key", key)
    .eq("is_custom", true);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export type WipStockItem = {
  tarih: string;
  kaynak_hucresi: string;
  hedef_hucresi: string;
  hesaplanan_adet: number;
  gercek_adet: number | null;
  override_edildi: boolean;
};

export async function loadCellWipStock(
  cellName: string,
  startDate: string,
  endDate: string
): Promise<{
  incoming: WipStockItem[];
  outgoing: WipStockItem[];
}> {
  if (!isDateValue(startDate) || !isDateValue(endDate) || startDate > endDate) {
    return { incoming: [], outgoing: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_wip_stock")
    .select("tarih, kaynak_hucresi, hedef_hucresi, hesaplanan_adet, gercek_adet, override_edildi")
    .gte("tarih", startDate)
    .lte("tarih", endDate);

  if (error) {
    console.warn("loadCellWipStock error:", error.message);
    return { incoming: [], outgoing: [] };
  }

  const items = (data ?? []) as WipStockItem[];
  const incoming = items.filter(item => item.hedef_hucresi === cellName);
  const outgoing = items.filter(item => item.kaynak_hucresi === cellName);

  return { incoming, outgoing };
}

export async function loadYesterdayPressData(targetDate: string): Promise<{
  success: boolean;
  data: { tarih: string; pressed: number } | null;
  error?: string;
}> {
  if (!isDateValue(targetDate)) {
    return { success: false, error: "Geçersiz tarih.", data: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("tarih, manuf_production_rows(uretim_adeti)")
    .like("bolum", "Pres%")
    .lt("tarih", targetDate)
    .order("tarih", { ascending: false });

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  for (const record of (data ?? []) as ProductionRecord[]) {
    const recordDate = new Date(record.tarih + "T00:00:00");
    if (!isWeekday(recordDate)) {
      continue;
    }
    const totalPressed = (record.manuf_production_rows ?? []).reduce(
      (total, row) => total + numberValue(row.uretim_adeti),
      0
    );
    if (totalPressed === 0) {
      continue;
    }
    return {
      success: true,
      data: {
        tarih: record.tarih,
        pressed: totalPressed,
      },
    };
  }

  return { success: true, data: null };
}

