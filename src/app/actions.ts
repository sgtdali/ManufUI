"use server";

import { createClient } from "@/lib/supabase/server";
import { ProductionFormData, MAKINE_SAYISI_DEFAULTS, FFPreformRow, FFPreformRejectRow, FFPreformReworkRow } from "@/lib/types";
import {
  formatTargetDowntimeIssues,
  validateTargetDowntime,
} from "@/lib/productionValidation";

const TARGET_20_CELLS = ["Pres Hücresi", "ETM Hücresi", "ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"];
const TARGET_15_CELLS = ["N602 Hücresi"];
const ROB108_TARGETS: Record<number, number> = { 5: 20, 4: 13, 3: 10, 2: 6, 1: 3, 0: 0 };

function enforceServerTargets(data: ProductionFormData): ProductionFormData {
  const bolum = data.bolum || "";
  const is20 = TARGET_20_CELLS.includes(bolum);
  const is15 = TARGET_15_CELLS.includes(bolum);
  if (!is20 && !is15) return data;

  const day = data.tarih ? new Date(`${data.tarih}T00:00:00`).getDay() : 1;
  const isWeekend = day === 5 || day === 6;
  if (isWeekend) return data;

  const defaultM = MAKINE_SAYISI_DEFAULTS[bolum] ?? null;

  return {
    ...data,
    rows: data.rows.map((row) => {
      let hedef = is15 ? 15 : 20;
      if (bolum === "ROB108 Hücresi") {
        const m = row.calisan_makine_sayisi ?? defaultM;
        hedef = (m != null && ROB108_TARGETS[m] !== undefined) ? ROB108_TARGETS[m] : 20;
      }
      return { ...row, hedef_uretim_adeti: hedef };
    }),
  };
}

export async function saveProductionRecord(data: ProductionFormData) {
  data = enforceServerTargets(data);
  const targetIssues = validateTargetDowntime(data);
  if (targetIssues.length > 0) {
    return {
      success: false,
      error: formatTargetDowntimeIssues(targetIssues),
    };
  }

  const supabase = await createClient();

  // Başlık kaydını upsert et (aynı bölüm+tarih varsa güncelle)
  const { data: record, error: recordError } = await supabase
    .from("manuf_production_records")
    .upsert(
      {
        bolum: data.bolum,
        sorumlu: data.sorumlu,
        tarih: data.tarih,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "bolum,tarih" }
    )
    .select("id")
    .single();

  if (recordError) {
    return { success: false, error: recordError.message };
  }

  // Satırları upsert et
  const rows = data.rows.map((row) => {
    const r: any = {
      record_id: record.id,
      sira_no: row.sira_no,
      zaman_dilimi: row.zaman_dilimi,
      hedef_uretim_adeti: row.hedef_uretim_adeti,
      uretim_adeti: row.uretim_adeti,
      musteri_var: row.musteri_var,
      mola: row.mola,
      mola_turu: row.mola_turu,
      ariza: row.ariza,
      ariza_turu: row.ariza_turu,
      ariza_aciklama: row.ariza_aciklama,
      planli_durus: row.planli_durus,
      planli_durus_turu: row.planli_durus_turu,
      planli_durus_aciklama: row.planli_durus_aciklama,
      setup_ve_ayar: row.setup_ve_ayar,
      setup_turu: row.setup_turu,
      setup_aciklama: row.setup_aciklama,
      takim_degisimi: row.takim_degisimi,
      takim_degisim_turu: row.takim_degisim_turu,
      kalip_demontaj: row.kalip_demontaj,
      kalip_demontaj_turu: row.kalip_demontaj_turu,
      kalip_montaj: row.kalip_montaj,
      kalip_montaj_turu: row.kalip_montaj_turu,
      onceki_istasyon_bekleme: row.onceki_istasyon_bekleme,
      musteri_kaynakli_durus: row.musteri_kaynakli_durus,
      musteri_durus_turu: row.musteri_durus_turu,
      musteri_durus_aciklama: row.musteri_durus_aciklama,
      kalite_kaynakli_durus: row.kalite_kaynakli_durus,
    };

    if (["ETM Hücresi", "ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(data.bolum || "")) {
      r.calisan_makine_sayisi = row.calisan_makine_sayisi;
      r.calisan_makine_aciklama = row.calisan_makine_aciklama;
    }

    return r;
  });

  const { error: rowsError } = await supabase
    .from("manuf_production_rows")
    .upsert(rows, { onConflict: "record_id,zaman_dilimi" });

  if (rowsError) {
    return { success: false, error: rowsError.message };
  }

  return { success: true, recordId: record.id };
}

export async function loadAllProductionRecords() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("*, manuf_production_rows(*)")
    .order("tarih", { ascending: false })
    .order("bolum", { ascending: true });

  if (error) return null;
  return data;
}

export async function loadProductionRecord(bolum: string, tarih: string) {
  const supabase = await createClient();

  const { data: record, error } = await supabase
    .from("manuf_production_records")
    .select("*, manuf_production_rows(*)")
    .eq("bolum", bolum)
    .eq("tarih", tarih)
    .single();

  if (error) return null;
  return record;
}

export async function loadProductionSumByDateRange(startDate: string, endDate: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("bolum, tarih, id, manuf_production_rows(uretim_adeti)")
    .gte("tarih", startDate)
    .lte("tarih", endDate);

  if (error) {
    console.error("Error loading production sum:", error);
    return null;
  }

  const sumByCell: Record<string, number> = {};
  
  const BOLUMLER = [
    "Pres Hücresi",
    "ETM Hücresi",
    "ROB104 Hücresi",
    "ROB108 Hücresi",
    "Flowform Hücresi",
    "N602 Hücresi",
    "N603 Hücresi",
    "ROB109 Hücresi",
    "Quench Hücresi",
    "ROB110-111 Hücresi",
    "Fosfat Hücresi",
    "Boya Hücresi"
  ];
  
  BOLUMLER.forEach(cell => {
    sumByCell[cell] = 0;
  });

  data?.forEach(record => {
    const rows = record.manuf_production_rows as { uretim_adeti: number | null }[] | null;
    let recordSum = 0;
    rows?.forEach(row => {
      recordSum += row.uretim_adeti || 0;
    });
    if (sumByCell[record.bolum] !== undefined) {
      sumByCell[record.bolum] += recordSum;
    } else {
      sumByCell[record.bolum] = recordSum;
    }
  });

  return sumByCell;
}

export async function saveSuggestion(bolum: string, onerisi: string) {
  if (!bolum || !onerisi?.trim()) {
    return { success: false, error: "Hücre seçimi ve öneri açıklaması zorunludur." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_suggestions")
    .insert({
      bolum,
      onerisi: onerisi.trim()
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, id: data.id };
}

export async function loadFFPreformMeasurement(tarih: string) {
  if (!tarih) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manuf_ff_preform_measurements")
    .select("*")
    .eq("tarih", tarih)
    .order("sira_no", { ascending: true });

  if (error) {
    console.error("Error loading FF Preform measurements:", error);
    return null;
  }

  return data;
}

export async function saveFFPreformMeasurement(
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

  // 1. Ölçüm satırlarını upsert et
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
    .from("manuf_ff_preform_measurements")
    .upsert(payload, { onConflict: "tarih,sira_no" });

  if (mainError) {
    return { success: false, error: mainError.message };
  }

  // 2. O tarihe ait eski red sebeplerini sil
  const { error: deleteRejectError } = await supabase
    .from("manuf_ff_preform_rejects")
    .delete()
    .eq("tarih", tarih);

  if (deleteRejectError) {
    return { success: false, error: deleteRejectError.message };
  }

  // 3. Varsa yeni red sebeplerini insert et
  if (rejects.length > 0) {
    const rejectPayload = rejects.map((r) => ({
      tarih,
      sira_no: r.sira_no,
      parca_no: r.parca_no,
      red_sebebi: r.red_sebebi,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertRejectError } = await supabase
      .from("manuf_ff_preform_rejects")
      .insert(rejectPayload);

    if (insertRejectError) {
      return { success: false, error: insertRejectError.message };
    }
  }

  // 4. O tarihe ait eski rework sebeplerini sil
  const { error: deleteReworkError } = await supabase
    .from("manuf_ff_preform_reworks")
    .delete()
    .eq("tarih", tarih);

  if (deleteReworkError) {
    return { success: false, error: deleteReworkError.message };
  }

  // 5. Varsa yeni rework sebeplerini insert et
  if (reworks.length > 0) {
    const reworkPayload = reworks.map((r) => ({
      tarih,
      sira_no: r.sira_no,
      parca_no: r.parca_no,
      rework_nedeni: r.rework_nedeni,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertReworkError } = await supabase
      .from("manuf_ff_preform_reworks")
      .insert(reworkPayload);

    if (insertReworkError) {
      return { success: false, error: insertReworkError.message };
    }
  }

  return { success: true };
}

export async function loadFFPreformRejects(tarih: string) {
  if (!tarih) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manuf_ff_preform_rejects")
    .select("*")
    .eq("tarih", tarih)
    .order("sira_no", { ascending: true });

  if (error) {
    console.error("Error loading FF Preform rejects:", error);
    return null;
  }

  return data;
}

export async function loadFFPreformReworks(tarih: string) {
  if (!tarih) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manuf_ff_preform_reworks")
    .select("*")
    .eq("tarih", tarih)
    .order("sira_no", { ascending: true });

  if (error) {
    console.error("Error loading FF Preform reworks:", error);
    return null;
  }

  return data;
}

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

  // 1. Ölçüm satırlarını upsert et
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

  // 2. O tarihe ait eski red sebeplerini sil
  const { error: deleteRejectError } = await supabase
    .from("manuf_final_olcum_rejects")
    .delete()
    .eq("tarih", tarih);

  if (deleteRejectError) {
    return { success: false, error: deleteRejectError.message };
  }

  // 3. Varsa yeni red sebeplerini insert et
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

  // 4. O tarihe ait eski rework sebeplerini sil
  const { error: deleteReworkError } = await supabase
    .from("manuf_final_olcum_reworks")
    .delete()
    .eq("tarih", tarih);

  if (deleteReworkError) {
    return { success: false, error: deleteReworkError.message };
  }

  // 5. Varsa yeni rework sebeplerini insert et
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

export async function loadPressMoldChanges() {
  const supabase = await createClient();

  // 2. Load all changes from public.manuf_press_mold_changes
  const { data: changes, error: changesError } = await supabase
    .from("manuf_press_mold_changes")
    .select("*")
    .order("tarih", { ascending: true })
    .order("sira_no", { ascending: true });

  if (changesError) {
    return { success: false, error: changesError.message, data: [] };
  }

  // 3. Load all production records to count pieces
  const { data: pressProd, error: prodError } = await supabase
    .from("manuf_production_records")
    .select("tarih, manuf_production_rows(sira_no, uretim_adeti)")
    .eq("bolum", "Pres Hücresi");

  if (prodError) {
    return { success: false, error: prodError.message, data: [] };
  }

  // Flatten and sort production rows
  const flatProd: { tarih: string; sira_no: number; uretim: number }[] = [];
  pressProd?.forEach((record) => {
    const rows = (record.manuf_production_rows as any[]) || [];
    rows.forEach((row) => {
      flatProd.push({
        tarih: record.tarih,
        sira_no: row.sira_no,
        uretim: row.uretim_adeti || 0,
      });
    });
  });

  flatProd.sort((a, b) => {
    if (a.tarih !== b.tarih) return a.tarih.localeCompare(b.tarih);
    return a.sira_no - b.sira_no;
  });

  // Helper function to check if a production slot is >= a mold change slot
  const isAfterOrEqual = (pTarih: string, pSira: number, cTarih: string, cSira: number) => {
    if (pTarih !== cTarih) return pTarih.localeCompare(cTarih) > 0;
    return pSira >= cSira;
  };

  // Calculate pieces for each mold change
  const result = changes.map((c: any, index: number) => {
    const nextChange = changes.slice(index + 1).find((nc: any) => nc.takilan_kalip === c.takilan_kalip);

    let piecesBetween = 0;
    let piecesAfter = 0;

    flatProd.forEach((p) => {
      const isAfterThisChange = isAfterOrEqual(p.tarih, p.sira_no, c.tarih, c.sira_no);
      if (isAfterThisChange) {
        piecesAfter += p.uretim;

        const isBeforeNextChange = !nextChange || !isAfterOrEqual(p.tarih, p.sira_no, nextChange.tarih, nextChange.sira_no);
        if (isBeforeNextChange) {
          piecesBetween += p.uretim;
        }
      }
    });

    return {
      ...c,
      piecesBetween,
      piecesAfter,
    };
  });

  // Sort descending by date/sira_no so newest is at top of timeline
  result.sort((a: any, b: any) => {
    if (a.tarih !== b.tarih) return b.tarih.localeCompare(a.tarih);
    return b.sira_no - a.sira_no;
  });

  return { success: true, data: result };
}

export async function saveManualMoldChange(
  tarih: string,
  zaman_dilimi: string,
  sira_no: number,
  sokulen_kalip: string | null,
  takilan_kalip: string | null,
  description: string | null
) {
  if (!tarih || !zaman_dilimi || !sira_no) {
    return { success: false, error: "Tarih ve Zaman Dilimi zorunludur." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_press_mold_changes")
    .upsert(
      {
        tarih,
        zaman_dilimi,
        sira_no,
        sokulen_kalip: sokulen_kalip || null,
        takilan_kalip: takilan_kalip || null,
        description: description || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tarih,sira_no" }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteMoldChange(id: string) {
  if (!id) {
    return { success: false, error: "ID zorunludur." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_press_mold_changes")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getManufSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_settings")
    .select("key, value");

  if (error) {
    return { success: false, error: error.message };
  }

  const settings: Record<string, string> = {};
  if (data) {
    data.forEach((row: any) => {
      settings[row.key] = row.value;
    });
  }

  return { success: true, data: settings };
}

export async function saveManufSettings(settings: Record<string, string>) {
  const supabase = await createClient();
  
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from("manuf_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    return { success: false, error: error.message };
  }

  // If schedule is changed, trigger reschedule function in postgres
  if (settings["daily_production_cron_schedule"]) {
    const { error: rpcError } = await supabase.rpc("update_manuf_cron_schedule", {
      new_schedule: settings["daily_production_cron_schedule"]
    });
    if (rpcError) {
      console.error("Reschedule error:", rpcError);
    }
  }

  return { success: true };
}

export async function triggerDailyProductionEmailAction() {
  const supabase = await createClient();
  
  const { error } = await supabase.rpc("send_daily_production_email_func");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export interface ManufAutomation {
  id: string;
  type: "cron" | "trigger";
  name: string;
  schedule: string | null;
  source_event: string | null;
  target_function: string;
  webhook_url: string | null;
  description: string | null;
  is_active: boolean;
  updated_at: string;
}

export async function getManufAutomations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_automations")
    .select("*")
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as ManufAutomation[] };
}

export async function saveManufAutomation(
  id: string,
  updates: {
    webhook_url?: string | null;
    description?: string | null;
    schedule?: string | null;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_automations")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  // If schedule is changed and it's a cron automation, trigger reschedule function in postgres
  if (updates.schedule) {
    const { error: rpcError } = await supabase.rpc("update_manuf_cron_schedule", {
      new_schedule: updates.schedule
    });
    if (rpcError) {
      console.error("Reschedule error:", rpcError);
      return { success: false, error: `Cron zamanlaması güncellenirken hata oluştu: ${rpcError.message}` };
    }
  }

  return { success: true };
}

export async function triggerCronAutomation(id: string) {
  const supabase = await createClient();
  let functionName = "";
  if (id === "daily_report_cron") {
    functionName = "send_daily_production_email_func";
  } else {
    return { success: false, error: "Tetiklenebilir bir cron fonksiyonu bulunamadı." };
  }

  const { error } = await supabase.rpc(functionName);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
