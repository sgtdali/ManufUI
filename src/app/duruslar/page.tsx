import { createClient } from "@/lib/supabase/server";
import { type ProductionRow } from "@/lib/types";
import { DurusRecordsTable } from "./DurusRecordsTable";

export const metadata = {
  title: "Duruş Takip ve Analiz | Üretim Takip Sistemi",
};

type DbRecord = {
  id: string;
  bolum: string;
  sorumlu: string | null;
  tarih: string;
  updated_at: string | null;
  manuf_production_rows: ProductionRow[] | null;
};

export type DurusDetail = {
  id: string;
  tarih: string;
  bolum: string;
  sorumlu: string;
  zamanDilimi: string;
  durusTipiKey: string;
  durusTipiLabel: string;
  dakika: number;
  altTur: string;
  aciklama: string;
  arizaGiderildi?: boolean;
  arizaGiderilmeAciklama?: string | null;
};

export type ActiveDay = {
  bolum: string;
  tarih: string;
};

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildDurusDetails(records: DbRecord[]): DurusDetail[] {
  const details: DurusDetail[] = [];

  for (const record of records) {
    const rows = record.manuf_production_rows ?? [];
    for (const row of rows) {
      // Arıza
      if (numberValue(row.ariza) > 0) {
        details.push({
          id: `${row.id ?? record.id}-${row.sira_no}-ariza`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          durusTipiKey: "ariza",
          durusTipiLabel: "Arıza",
          dakika: numberValue(row.ariza),
          altTur: row.ariza_turu ?? "-",
          aciklama: row.ariza_aciklama?.trim() || "-",
          arizaGiderildi: row.ariza_giderildi ?? false,
          arizaGiderilmeAciklama: row.ariza_giderilme_aciklama ?? null,
        });
      }

      // Planlı Duruş
      if (numberValue(row.planli_durus) > 0) {
        details.push({
          id: `${row.id ?? record.id}-${row.sira_no}-planli`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          durusTipiKey: "planli_durus",
          durusTipiLabel: "Planlı Duruş",
          dakika: numberValue(row.planli_durus),
          altTur: row.planli_durus_turu ?? "-",
          aciklama: row.planli_durus_aciklama?.trim() || "-",
        });
      }

      // Setup ve Ayar / Hazırlık
      if (numberValue(row.setup_ve_ayar) > 0) {
        const label = (record.bolum === "Pres Hücresi" || record.bolum === "ETM Hücresi") ? "Hazırlık" : "Setup ve Ayar";
        details.push({
          id: `${row.id ?? record.id}-${row.sira_no}-setup`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          durusTipiKey: "setup_ve_ayar",
          durusTipiLabel: label,
          dakika: numberValue(row.setup_ve_ayar),
          altTur: row.setup_turu ?? "-",
          aciklama: row.setup_aciklama?.trim() || "-",
        });
      }

      // Müşteri Kaynaklı Duruş
      if (numberValue(row.musteri_kaynakli_durus) > 0) {
        details.push({
          id: `${row.id ?? record.id}-${row.sira_no}-musteri`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          durusTipiKey: "musteri_kaynakli_durus",
          durusTipiLabel: "Müşteri Kaynaklı Duruş",
          dakika: numberValue(row.musteri_kaynakli_durus),
          altTur: row.musteri_durus_turu ?? "-",
          aciklama: row.musteri_durus_aciklama?.trim() || "-",
        });
      }

      // Takım Değişimi
      if (numberValue(row.takim_degisimi) > 0) {
        const label = record.bolum === "ETM Hücresi" ? "Holder - Insert Değişim" : record.bolum === "Quench Hücresi" ? "Rejim Bekleme" : "Takım Değişimi";
        details.push({
          id: `${row.id ?? record.id}-${row.sira_no}-takim`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          durusTipiKey: "takim_degisimi",
          durusTipiLabel: label,
          dakika: numberValue(row.takim_degisimi),
          altTur: row.takim_degisim_turu ?? "-",
          aciklama: "-",
        });
      }

      // Kalıp Demontaj
      if (numberValue(row.kalip_demontaj) > 0) {
        details.push({
          id: `${row.id ?? record.id}-${row.sira_no}-kalip-demo`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          durusTipiKey: "kalip_demontaj",
          durusTipiLabel: "Kalıp Demontaj",
          dakika: numberValue(row.kalip_demontaj),
          altTur: row.kalip_demontaj_turu ?? "-",
          aciklama: "-",
        });
      }

      // Kalıp Montaj
      if (numberValue(row.kalip_montaj) > 0) {
        details.push({
          id: `${row.id ?? record.id}-${row.sira_no}-kalip-mont`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          durusTipiKey: "kalip_montaj",
          durusTipiLabel: "Kalıp Montaj",
          dakika: numberValue(row.kalip_montaj),
          altTur: row.kalip_montaj_turu ?? "-",
          aciklama: "-",
        });
      }

      // Bir Önceki İstasyon Bekleme
      if (numberValue(row.onceki_istasyon_bekleme) > 0) {
        details.push({
          id: `${row.id ?? record.id}-${row.sira_no}-onceki-ist`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          durusTipiKey: "onceki_istasyon_bekleme",
          durusTipiLabel: "Bir Önceki İstasyon Bekleme",
          dakika: numberValue(row.onceki_istasyon_bekleme),
          altTur: "-",
          aciklama: "-",
        });
      }

      // Kalite Kaynaklı Duruş
      if (numberValue(row.kalite_kaynakli_durus) > 0) {
        details.push({
          id: `${row.id ?? record.id}-${row.sira_no}-kalite-durus`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          durusTipiKey: "kalite_kaynakli_durus",
          durusTipiLabel: "Kalite Kaynaklı Duruş",
          dakika: numberValue(row.kalite_kaynakli_durus),
          altTur: "-",
          aciklama: "-",
        });
      }

      // Mola
      if (numberValue(row.mola) > 0) {
        details.push({
          id: `${row.id ?? record.id}-${row.sira_no}-mola`,
          tarih: record.tarih,
          bolum: record.bolum,
          sorumlu: record.sorumlu ?? "-",
          zamanDilimi: row.zaman_dilimi,
          durusTipiKey: "mola",
          durusTipiLabel: "Mola",
          dakika: numberValue(row.mola),
          altTur: row.mola_turu ?? "-",
          aciklama: "-",
        });
      }
    }
  }

  return details.sort((a, b) => b.tarih.localeCompare(a.tarih));
}

function hasAnyInput(record: DbRecord) {
  const rows = record.manuf_production_rows ?? [];
  return rows.some(row => 
    row.uretim_adeti !== null || 
    numberValue(row.ariza) > 0 ||
    numberValue(row.planli_durus) > 0 ||
    numberValue(row.setup_ve_ayar) > 0 ||
    numberValue(row.musteri_kaynakli_durus) > 0 ||
    numberValue(row.takim_degisimi) > 0 ||
    numberValue(row.kalip_demontaj) > 0 ||
    numberValue(row.kalip_montaj) > 0 ||
    numberValue(row.onceki_istasyon_bekleme) > 0 ||
    numberValue(row.kalite_kaynakli_durus) > 0 ||
    numberValue(row.mola) > 0
  );
}

export default async function DuruslarPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_production_records")
    .select("id, bolum, sorumlu, tarih, updated_at, manuf_production_rows(*)")
    .order("tarih", { ascending: false })
    .order("bolum", { ascending: true });

  const records = (data ?? []) as DbRecord[];
  const details = buildDurusDetails(records);
  const activeDays: ActiveDay[] = records
    .filter(hasAnyInput)
    .map(r => ({ bolum: r.bolum, tarih: r.tarih }));

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Veri yüklenirken hata oluştu: {error.message}
          </section>
        ) : null}

        <DurusRecordsTable details={details} activeDays={activeDays} />
      </div>
    </main>
  );
}
