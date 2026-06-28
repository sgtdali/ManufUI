"use server";

import { createClient } from "@/lib/supabase/server";
import { ProductionFormData, MAKINE_SAYISI_DEFAULTS } from "@/lib/types";
import {
  formatTargetDowntimeIssues,
  validateTargetDowntime,
} from "@/lib/productionValidation";

const TARGET_20_CELLS = ["Pres Hücresi", "ETM Hücresi", "ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"];
const TARGET_15_CELLS = ["N602 Hücresi", "ROB110-111 Hücresi"];
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
