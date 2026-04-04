"use server";

import { createClient } from "@/lib/supabase/server";
import { ProductionFormData } from "@/lib/types";

export async function saveProductionRecord(data: ProductionFormData) {
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
  const rows = data.rows.map((row) => ({
    record_id: record.id,
    sira_no: row.sira_no,
    zaman_dilimi: row.zaman_dilimi,
    uretim_adeti: row.uretim_adeti,
    mola: row.mola,
    mola_turu: row.mola_turu,
    ariza: row.ariza,
    ariza_turu: row.ariza_turu,
    ariza_aciklama: row.ariza_aciklama,
    planli_durus: row.planli_durus,
    planli_durus_turu: row.planli_durus_turu,
    setup_ve_ayar: row.setup_ve_ayar,
    setup_turu: row.setup_turu,
    takim_degisimi: row.takim_degisimi,
    onceki_istasyon_bekleme: row.onceki_istasyon_bekleme,
    musteri_kaynakli_durus: row.musteri_kaynakli_durus,
    musteri_durus_turu: row.musteri_durus_turu,
    kalite_kaynakli_durus: row.kalite_kaynakli_durus,
  }));

  const { error: rowsError } = await supabase
    .from("manuf_production_rows")
    .upsert(rows, { onConflict: "record_id,zaman_dilimi" });

  if (rowsError) {
    return { success: false, error: rowsError.message };
  }

  return { success: true, recordId: record.id };
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
