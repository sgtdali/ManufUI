"use server";

import { createClient } from "@/lib/supabase/server";
import { FORECAST_CELLS, SlotActual } from "../_lib/constants";

export async function loadForecastActuals(
  startDate: string,
  endDate: string
): Promise<SlotActual[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manuf_production_records")
    .select(
      `bolum, tarih, manuf_production_rows(
        zaman_dilimi,
        uretim_adeti,
        ariza, ariza_turu,
        planli_durus, planli_durus_turu,
        setup_ve_ayar, setup_turu,
        takim_degisimi,
        kalip_demontaj,
        kalip_montaj,
        mola,
        onceki_istasyon_bekleme,
        musteri_kaynakli_durus,
        kalite_kaynakli_durus
      )`
    )
    .gte("tarih", startDate)
    .lte("tarih", endDate)
    .in("bolum", FORECAST_CELLS as unknown as string[])
    .order("tarih", { ascending: true });

  if (error || !data) return [];

  const slots: SlotActual[] = [];

  for (const record of data) {
    const rows = record.manuf_production_rows as any[];
    if (!rows) continue;

    for (const row of rows) {
      const turler: string[] = [];
      let totalDk = 0;

      if (row.ariza) { totalDk += row.ariza; turler.push(`Arıza${row.ariza_turu ? ` (${row.ariza_turu})` : ""} ${row.ariza}dk`); }
      if (row.planli_durus) { totalDk += row.planli_durus; turler.push(`Planlı ${row.planli_durus}dk`); }
      if (row.setup_ve_ayar) { totalDk += row.setup_ve_ayar; turler.push(`Setup ${row.setup_ve_ayar}dk`); }
      if (row.takim_degisimi) { totalDk += row.takim_degisimi; turler.push(`Takım Değ. ${row.takim_degisimi}dk`); }
      if (row.kalip_demontaj) { totalDk += row.kalip_demontaj; turler.push(`Kalıp Dem. ${row.kalip_demontaj}dk`); }
      if (row.kalip_montaj) { totalDk += row.kalip_montaj; turler.push(`Kalıp Mon. ${row.kalip_montaj}dk`); }
      if (row.mola) { totalDk += row.mola; turler.push(`Mola ${row.mola}dk`); }
      if (row.onceki_istasyon_bekleme) { totalDk += row.onceki_istasyon_bekleme; turler.push(`İstasyon Bekleme ${row.onceki_istasyon_bekleme}dk`); }
      if (row.musteri_kaynakli_durus) { totalDk += row.musteri_kaynakli_durus; turler.push(`Müşteri ${row.musteri_kaynakli_durus}dk`); }
      if (row.kalite_kaynakli_durus) { totalDk += row.kalite_kaynakli_durus; turler.push(`Kalite ${row.kalite_kaynakli_durus}dk`); }

      slots.push({
        bolum: record.bolum,
        tarih: record.tarih,
        zamanDilimi: row.zaman_dilimi,
        uretimAdeti: row.uretim_adeti ?? 0,
        downtimeDk: totalDk,
        downtimeTurler: turler,
      });
    }
  }

  return slots;
}
