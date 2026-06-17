"use server";

import { createClient } from "@/lib/supabase/server";
import { ProductionFormData, FFPreformRow, FFPreformRejectRow, FFPreformReworkRow } from "@/lib/types";
import {
  formatTargetDowntimeIssues,
  validateTargetDowntime,
} from "@/lib/productionValidation";

export async function saveProductionRecord(data: ProductionFormData) {
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
