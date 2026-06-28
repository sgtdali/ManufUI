"use server";

import { createClient } from "@/lib/supabase/server";
import { FFPreformRow, FFPreformRejectRow, FFPreformReworkRow } from "@/lib/types";

export async function loadFinalOlcumMeasurement(tarih: string) {
  if (!tarih) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manuf_final_olcum_measurements")
    .select("*")
    .eq("tarih", tarih)
    .order("sira_no", { ascending: true });

  if (error) {
    console.error("Error loading Final Ölçüm measurements:", error);
    return null;
  }

  return data;
}

export async function loadFinalOlcumRejects(tarih: string) {
  if (!tarih) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manuf_final_olcum_rejects")
    .select("*")
    .eq("tarih", tarih)
    .order("sira_no", { ascending: true });

  if (error) {
    console.error("Error loading Final Ölçüm rejects:", error);
    return null;
  }

  return data;
}

export async function loadFinalOlcumReworks(tarih: string) {
  if (!tarih) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manuf_final_olcum_reworks")
    .select("*")
    .eq("tarih", tarih)
    .order("sira_no", { ascending: true });

  if (error) {
    console.error("Error loading Final Ölçüm reworks:", error);
    return null;
  }

  return data;
}

export async function saveFinalOlcumMeasurement(
  tarih: string,
  sorumlu: string,
  rows: FFPreformRow[],
  rejects: FFPreformRejectRow[],
  reworks: FFPreformReworkRow[]
) {
  if (!tarih) {
    return { success: false, error: "Tarih zorunludur." };
  }

  const supabase = await createClient();

  const payload = rows.map((row) => ({
    tarih,
    sorumlu: sorumlu || "Zeynep Ece Toker",
    sira_no: row.sira_no,
    olculen_adet: row.olculen_adet,
    red_adet: row.red_adet,
    rework_adet: row.rework_adet,
    updated_at: new Date().toISOString(),
  }));

  const { error: mainError } = await supabase
    .from("manuf_final_olcum_measurements")
    .upsert(payload, { onConflict: "tarih,sira_no" });

  if (mainError) {
    return { success: false, error: mainError.message };
  }

  const { error: deleteRejectError } = await supabase
    .from("manuf_final_olcum_rejects")
    .delete()
    .eq("tarih", tarih);

  if (deleteRejectError) {
    return { success: false, error: deleteRejectError.message };
  }

  if (rejects.length > 0) {
    const rejectPayload = rejects.map((r) => ({
      tarih,
      sira_no: r.sira_no,
      parca_no: r.parca_no,
      red_sebebi: r.red_sebebi,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertRejectError } = await supabase
      .from("manuf_final_olcum_rejects")
      .insert(rejectPayload);

    if (insertRejectError) {
      return { success: false, error: insertRejectError.message };
    }
  }

  const { error: deleteReworkError } = await supabase
    .from("manuf_final_olcum_reworks")
    .delete()
    .eq("tarih", tarih);

  if (deleteReworkError) {
    return { success: false, error: deleteReworkError.message };
  }

  if (reworks.length > 0) {
    const reworkPayload = reworks.map((r) => ({
      tarih,
      sira_no: r.sira_no,
      parca_no: r.parca_no,
      rework_nedeni: r.rework_nedeni,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertReworkError } = await supabase
      .from("manuf_final_olcum_reworks")
      .insert(reworkPayload);

    if (insertReworkError) {
      return { success: false, error: insertReworkError.message };
    }
  }

  return { success: true };
}
