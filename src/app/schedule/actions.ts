"use server";

import { createClient } from "@/lib/supabase/server";
import { isWeekday } from "./utils";
import type { DayOverride, GanttDependency } from "./types";


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
  mold_type: "male" | "female" | "ring";
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

export async function saveMoldChange(tarih: string, moldType: "male" | "female" | "ring", description?: string) {
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

export async function loadCellActuals(cellName: string, startDate: string, endDate: string) {
  if (!isDateValue(startDate) || !isDateValue(endDate) || startDate > endDate) {
    return { success: false, error: "Geçersiz tarih aralığı.", actuals: {} };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("tarih, manuf_production_rows(uretim_adeti)")
    .like("bolum", `${cellName}%`)
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

export async function loadCellBreakdowns(cellName: string, startDate: string, endDate: string) {
  if (!isDateValue(startDate) || !isDateValue(endDate) || startDate > endDate) {
    return { success: false, error: "Geçersiz tarih aralığı.", data: [], breakdownsByDate: {} };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("tarih, manuf_production_rows(ariza, ariza_turu, ariza_aciklama)")
    .like("bolum", `${cellName}%`)
    .gte("tarih", startDate)
    .lte("tarih", endDate);

  if (error) {
    return { success: false, error: error.message, breakdownsByDate: {} };
  }

  const breakdownsByDate: Record<string, { minutes: number; details: string[] }> = {};
  for (const record of data ?? []) {
    const dateKey = record.tarih;
    if (!breakdownsByDate[dateKey]) {
      breakdownsByDate[dateKey] = { minutes: 0, details: [] };
    }
    const rows = record.manuf_production_rows ?? [];
    for (const row of rows) {
      const minutes = numberValue(row.ariza);
      if (minutes > 0) {
        breakdownsByDate[dateKey].minutes += minutes;
        const typeStr = row.ariza_turu ? `[${row.ariza_turu}] ` : "";
        const descStr = row.ariza_aciklama?.trim() || "Açıklama girilmemiş";
        breakdownsByDate[dateKey].details.push(`${typeStr}${descStr} (${minutes} dk)`);
      }
    }
  }

  return { success: true, breakdownsByDate };
}

export type CellBottleneckStats = {
  bolum: string;
  totalBreakdownMinutes: number;
  breakdownCount: number;
  totalDowntimeMinutes: number;
};

export async function loadBottleneckData(startDate: string, endDate: string) {
  if (!isDateValue(startDate) || !isDateValue(endDate) || startDate > endDate) {
    return { success: false, error: "Geçersiz tarih aralığı.", data: [] as CellBottleneckStats[] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("bolum, tarih, manuf_production_rows(ariza, planli_durus, setup_ve_ayar, kalite_kaynakli_durus, musteri_kaynakli_durus)")
    .gte("tarih", startDate)
    .lte("tarih", endDate);

  if (error) {
    return { success: false, error: error.message, data: [] as CellBottleneckStats[] };
  }

  const statsMap: Record<string, { totalBreakdownMinutes: number; breakdownCount: number; totalDowntimeMinutes: number }> = {};
  
  for (const record of data ?? []) {
    const cellName = record.bolum;
    if (!statsMap[cellName]) {
      statsMap[cellName] = { totalBreakdownMinutes: 0, breakdownCount: 0, totalDowntimeMinutes: 0 };
    }
    
    const rows = record.manuf_production_rows ?? [];
    for (const row of rows) {
      const ariza = numberValue(row.ariza);
      const planli = numberValue(row.planli_durus);
      const setup = numberValue(row.setup_ve_ayar);
      const kalite = numberValue(row.kalite_kaynakli_durus);
      const musteri = numberValue(row.musteri_kaynakli_durus);
      
      if (ariza > 0) {
        statsMap[cellName].totalBreakdownMinutes += ariza;
        statsMap[cellName].breakdownCount += 1;
      }
      
      statsMap[cellName].totalDowntimeMinutes += (ariza + planli + setup + kalite + musteri);
    }
  }

  const statsList: CellBottleneckStats[] = Object.entries(statsMap).map(([bolum, stats]) => ({
    bolum,
    ...stats,
  })).sort((a, b) => b.totalBreakdownMinutes - a.totalBreakdownMinutes);

  return { success: true, data: statsList };
}

// ── Planlama Overrides (Günlük Elle Girişler ve Gantt Ayarları) ────────────────

export async function loadScheduleOverrides(cellName: string, startDate: string, endDate: string) {
  if (!isDateValue(startDate) || !isDateValue(endDate) || startDate > endDate) {
    return { success: false, error: "Geçersiz tarih aralığı.", overrides: {}, dependencies: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_schedule_overrides")
    .select("*")
    .eq("bolum", cellName)
    .gte("tarih", startDate)
    .lte("tarih", endDate);

  if (error) {
    return { success: false, error: error.message, overrides: {}, dependencies: [] };
  }

  const overrides: Record<string, DayOverride> = {};
  let dependencies: GanttDependency[] = [];

  for (const row of (data ?? [])) {
    const dayKey = row.tarih;
    overrides[dayKey] = {
      pressed: row.pressed !== null ? row.pressed : undefined,
      overtimeMinutes: row.overtime_minutes !== null ? row.overtime_minutes : undefined,
      forceWorkday: row.force_workday !== null ? row.force_workday : undefined,
      shiftStart: row.shift_start || undefined,
      shiftEnd: row.shift_end || undefined,
      furnaceStart: row.furnace_start || undefined,
      dieCoolingMinutes: row.die_cooling_minutes !== null ? row.die_cooling_minutes : undefined,
      customGanttItems: Array.isArray(row.custom_gantt_items) ? row.custom_gantt_items : [],
      disabledSegments: Array.isArray(row.disabled_segments) ? row.disabled_segments : [],
      disabledOperations: Array.isArray(row.disabled_operations)
        ? row.disabled_operations
        : Array.isArray(row.disabled_segments)
          ? row.disabled_segments.filter((id: string) => id === "mold-maintenance")
          : [],
      moldMaintenanceStart: row.mold_maintenance_start || undefined,
      postponeMaleChange: row.postpone_male_change !== null ? row.postpone_male_change : undefined,
      postponeFemaleChange: row.postpone_female_change !== null ? row.postpone_female_change : undefined,
      moldChangeMode:
        row.mold_change_mode || (row.postpone_male_change === true || row.postpone_female_change === true ? "postpone" : undefined),
      manualMoldType: row.manual_mold_type || undefined,
      manualMoldChangeAfterPieces: row.manual_mold_change_after_pieces !== null ? row.manual_mold_change_after_pieces : undefined,
      femaleChangeMinutes: row.female_change_minutes !== null ? row.female_change_minutes : undefined,
      maleChangeMinutes: row.male_change_minutes !== null ? row.male_change_minutes : undefined,
      ringChangeMinutes: row.ring_change_minutes !== null ? row.ring_change_minutes : undefined,
    };

    if (Array.isArray(row.dependencies)) {
      dependencies = [...dependencies, ...row.dependencies];
    }
  }

  return { success: true, overrides, dependencies };
}

export async function saveScheduleOverride(
  tarih: string,
  bolum: string,
  override: DayOverride,
  dayDependencies: GanttDependency[]
) {
  if (!isDateValue(tarih)) {
    return { success: false, error: "Geçersiz tarih." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_schedule_overrides")
    .upsert(
      {
        tarih,
        bolum,
        pressed: override.pressed !== undefined ? override.pressed : null,
        overtime_minutes: override.overtimeMinutes !== undefined ? override.overtimeMinutes : null,
        force_workday: override.forceWorkday !== undefined ? override.forceWorkday : null,
        shift_start: override.shiftStart || null,
        shift_end: override.shiftEnd || null,
        furnace_start: override.furnaceStart || null,
        die_cooling_minutes: override.dieCoolingMinutes !== undefined ? override.dieCoolingMinutes : null,
        custom_gantt_items: override.customGanttItems || [],
        disabled_segments: override.disabledSegments || [],
        disabled_operations: override.disabledOperations || [],
        dependencies: dayDependencies || [],
        mold_maintenance_start: override.moldMaintenanceStart || null,
        postpone_male_change: override.postponeMaleChange !== undefined ? override.postponeMaleChange : null,
        postpone_female_change: override.postponeFemaleChange !== undefined ? override.postponeFemaleChange : null,
        mold_change_mode: override.moldChangeMode || null,
        manual_mold_type: override.manualMoldType || null,
        manual_mold_change_after_pieces:
          override.manualMoldChangeAfterPieces !== undefined ? override.manualMoldChangeAfterPieces : null,
        female_change_minutes: override.femaleChangeMinutes !== undefined ? override.femaleChangeMinutes : null,
        male_change_minutes: override.maleChangeMinutes !== undefined ? override.maleChangeMinutes : null,
        ring_change_minutes: override.ringChangeMinutes !== undefined ? override.ringChangeMinutes : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tarih,bolum" }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteScheduleOverride(tarih: string, bolum: string) {
  if (!isDateValue(tarih)) {
    return { success: false, error: "Geçersiz tarih." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_schedule_overrides")
    .delete()
    .eq("tarih", tarih)
    .eq("bolum", bolum);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

