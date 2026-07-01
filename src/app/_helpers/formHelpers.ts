import {
  ProductionFormData,
  ZAMAN_DILIMLERI,
  MAKINE_SAYISI_DEFAULTS,
  BOLUM_SORUMLU,
  getZamanDilimleriForCellAndDate,
  type ZamanDilimi,
  type ProductionRow,
} from "@/lib/types";

export function buildEmptyRows(
  zamanDilimleri: ZamanDilimi[] = ZAMAN_DILIMLERI,
  bolum?: string,
  tarih?: string
): ProductionFormData["rows"] {
  const isTargetDefault20 = bolum && ["Pres Hücresi", "ETM Hücresi", "ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(bolum);
  const isTargetDefault15 = bolum && ["N602 Hücresi", "ROB110-111 Hücresi"].includes(bolum);
  const isTargetDefault12 = bolum === "Flowform Hücresi";
  let isWeekend = false;
  if (tarih) {
    const day = new Date(`${tarih}T00:00:00`).getDay();
    isWeekend = (day === 5 || day === 6);
  }
  const defaultTarget = isWeekend
    ? null
    : bolum === "ROB108 Hücresi"
    ? 18
    : isTargetDefault20
    ? 20
    : isTargetDefault15
    ? 15
    : isTargetDefault12
    ? 12
    : null;

  return zamanDilimleri.map((z) => ({
    sira_no: z.sira_no,
    zaman_dilimi: z.label,
    hedef_uretim_adeti: defaultTarget,
    uretim_adeti: null,
    musteri_var: false,
    mola: null,
    mola_turu: null,
    ariza: null,
    ariza_turu: null,
    ariza_aciklama: null,
    planli_durus: null,
    planli_durus_turu: null,
    planli_durus_aciklama: null,
    setup_ve_ayar: null,
    setup_turu: null,
    setup_aciklama: null,
    takim_degisimi: null,
    takim_degisim_turu: null,
    kalip_demontaj: null,
    kalip_demontaj_turu: null,
    kalip_montaj: null,
    kalip_montaj_turu: null,
    calisan_makine_sayisi: (bolum && MAKINE_SAYISI_DEFAULTS[bolum]) !== undefined ? MAKINE_SAYISI_DEFAULTS[bolum!] : null,
    calisan_makine_aciklama: null,
    onceki_istasyon_bekleme: null,
    musteri_kaynakli_durus: null,
    musteri_durus_turu: null,
    musteri_durus_aciklama: null,
    kalite_kaynakli_durus: null,
  }));
}

export function applyRecordToForm(
  record: Record<string, unknown>,
  bolum: string,
  tarih: string
): ProductionFormData {
  const isTargetDefault20 = ["Pres Hücresi", "ETM Hücresi", "ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(bolum);
  const isTargetDefault15 = bolum && ["N602 Hücresi", "ROB110-111 Hücresi"].includes(bolum);
  const isTargetDefault12 = bolum === "Flowform Hücresi";
  const day = new Date(`${tarih}T00:00:00`).getDay();
  const isWeekend = (day === 5 || day === 6);
  const isTargetReadOnly = (isTargetDefault20 || isTargetDefault15 || isTargetDefault12) && !isWeekend;

  const dbRows = (record.manuf_production_rows as Record<string, unknown>[] ?? []);
  const expectedSlots = getZamanDilimleriForCellAndDate(bolum, tarih);

  const dbRowByLabel = new Map<string, Record<string, number | string | boolean | null>>();
  for (const r of dbRows) {
    const row = r as Record<string, number | string | boolean | null>;
    const label = row.zaman_dilimi as string | null;
    if (label) dbRowByLabel.set(label, row);
  }

  const mapDbRow = (row: Record<string, number | string | boolean | null>, slotIndex: number, slotLabel: string, siraNo: number): ProductionRow => {
    const defaultM = (bolum && MAKINE_SAYISI_DEFAULTS[bolum]) !== undefined ? MAKINE_SAYISI_DEFAULTS[bolum] : null;
    const mSayisi = (row.calisan_makine_sayisi as number | null) ?? defaultM;
    let targetVal = row.hedef_uretim_adeti as number | null;
    if (isTargetReadOnly) {
      if (bolum === "ROB108 Hücresi") {
        const ROB108_TARGETS: Record<number, number> = { 5: 18, 4: 13, 3: 10, 2: 6, 1: 3, 0: 0 };
        targetVal = mSayisi != null && ROB108_TARGETS[mSayisi] !== undefined ? ROB108_TARGETS[mSayisi] : 18;
      } else if (bolum === "N602 Hücresi" || bolum === "ROB110-111 Hücresi") {
        targetVal = 15;
      } else if (bolum === "Flowform Hücresi") {
        targetVal = 12;
      } else {
        targetVal = 20;
      }
    }
    return {
      sira_no: siraNo,
      zaman_dilimi: slotLabel,
      hedef_uretim_adeti: targetVal,
      uretim_adeti: row.uretim_adeti as number | null,
      musteri_var: row.musteri_var === true,
      mola: row.mola as number | null,
      mola_turu: row.mola_turu as string | null,
      ariza: row.ariza as number | null,
      ariza_turu: row.ariza_turu as string | null,
      ariza_aciklama: row.ariza_aciklama as string | null,
      planli_durus: row.planli_durus as number | null,
      planli_durus_turu: row.planli_durus_turu as string | null,
      planli_durus_aciklama: row.planli_durus_aciklama as string | null,
      setup_ve_ayar: row.setup_ve_ayar as number | null,
      setup_turu: row.setup_turu as string | null,
      setup_aciklama: row.setup_aciklama as string | null,
      takim_degisimi: row.takim_degisimi as number | null,
      takim_degisim_turu: row.takim_degisim_turu as string | null,
      kalip_demontaj: row.kalip_demontaj as number | null,
      kalip_demontaj_turu: row.kalip_demontaj_turu as string | null,
      kalip_montaj: row.kalip_montaj as number | null,
      kalip_montaj_turu: row.kalip_montaj_turu as string | null,
      calisan_makine_sayisi: (row.calisan_makine_sayisi as number | null) ?? ((bolum && MAKINE_SAYISI_DEFAULTS[bolum]) !== undefined ? MAKINE_SAYISI_DEFAULTS[bolum] : null),
      calisan_makine_aciklama: row.calisan_makine_aciklama as string | null,
      onceki_istasyon_bekleme: row.onceki_istasyon_bekleme as number | null,
      musteri_kaynakli_durus: row.musteri_kaynakli_durus as number | null,
      musteri_durus_turu: row.musteri_durus_turu as string | null,
      musteri_durus_aciklama: row.musteri_durus_aciklama as string | null,
      kalite_kaynakli_durus: row.kalite_kaynakli_durus as number | null,
    };
  };

  let loadedRows: ProductionRow[];
  if (dbRows.length > 0) {
    const emptySlots = buildEmptyRows(expectedSlots, bolum, tarih);
    loadedRows = expectedSlots.map((slot, i) => {
      const dbRow = dbRowByLabel.get(slot.label);
      if (dbRow) {
        return mapDbRow(dbRow, i, slot.label, slot.sira_no);
      }
      return emptySlots[i];
    });
  } else {
    loadedRows = buildEmptyRows(expectedSlots, bolum, tarih);
  }

  return {
    bolum,
    sorumlu: (record.sorumlu as string) ?? "",
    tarih,
    rows: loadedRows,
  };
}
