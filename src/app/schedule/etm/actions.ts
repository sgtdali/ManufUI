"use server";

// SQL Migration Script for Supabase Tool Changes Table:
// -------------------------------------------------------------
// -- Çalıştır: Supabase SQL Editor
// -- CREATE TABLE IF NOT EXISTS manuf_etm_tool_changes (
// --   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
// --   tarih date NOT NULL,
// --   machine text NOT NULL,
// --   tool_type text NOT NULL,
// --   description text,
// --   created_at timestamptz DEFAULT now(),
// --   UNIQUE(tarih, machine, tool_type)
// -- );
// -------------------------------------------------------------

import { createClient } from "@/lib/supabase/server";
import type { ScheduleParamRow } from "./types";

function isDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function loadEtmActuals(startDate: string, endDate: string) {
  if (!isDateValue(startDate) || !isDateValue(endDate) || startDate > endDate) {
    return { success: false, error: "Geçersiz tarih aralığı.", actuals: {} as Record<string, number> };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("tarih, manuf_production_rows(uretim_adeti)")
    .ilike("bolum", "ETM%")
    .gte("tarih", startDate)
    .lte("tarih", endDate);

  if (error) {
    console.error("loadEtmActuals database error:", error.message);
    return { success: false, error: error.message, actuals: {} as Record<string, number> };
  }

  const actuals: Record<string, number> = {};
  for (const record of data ?? []) {
    const dateKey = record.tarih;
    const total = (record.manuf_production_rows ?? []).reduce(
      (sum, row: any) => sum + numberValue(row.uretim_adeti),
      0
    );
    actuals[dateKey] = (actuals[dateKey] ?? 0) + total;
  }

  return { success: true, actuals };
}

export async function loadEtmParams() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_schedule_params")
    .select("id, key, label, value, unit, is_custom")
    .like("key", "etm_%")
    .order("key", { ascending: true });

  if (error) {
    console.warn("loadEtmParams: Table 'manuf_schedule_params' may not exist or load failed. Error:", error.message);
    return { success: false, error: error.message, data: [] as ScheduleParamRow[] };
  }

  return { success: true, data: (data ?? []) as ScheduleParamRow[] };
}

export async function upsertEtmParamValue(key: string, value: number) {
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

export async function saveEtmToolChange(
  tarih: string,
  machine: "ETM-1" | "ETM-2",
  toolType: "cutting_insert" | "drill_bit",
  description?: string
) {
  if (!isDateValue(tarih)) {
    return { success: false, error: "Geçersiz tarih." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_etm_tool_changes")
    .upsert(
      {
        tarih,
        machine,
        tool_type: toolType,
        description: description || null,
        created_at: new Date().toISOString(),
      },
      { onConflict: "tarih,machine,tool_type" }
    );

  if (error) {
    console.error("saveEtmToolChange error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function loadEtmToolChanges(startDate: string, endDate: string) {
  if (!isDateValue(startDate) || !isDateValue(endDate) || startDate > endDate) {
    return { success: false, error: "Geçersiz tarih aralığı.", data: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_etm_tool_changes")
    .select("id, tarih, machine, tool_type, description, created_at")
    .gte("tarih", startDate)
    .lte("tarih", endDate)
    .order("tarih", { ascending: true });

  if (error) {
    console.warn("loadEtmToolChanges: Table 'manuf_etm_tool_changes' may not exist or load failed. Error:", error.message);
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data ?? [] };
}

export async function deleteEtmToolChange(tarih: string, machine: "ETM-1" | "ETM-2", toolType: "cutting_insert" | "drill_bit") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_etm_tool_changes")
    .delete()
    .eq("tarih", tarih)
    .eq("machine", machine)
    .eq("tool_type", toolType);

  if (error) {
    console.error("deleteEtmToolChange error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
