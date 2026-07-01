export const BOLUMLER = [
  "Pres Hücresi",
  "ETM Hücresi",
  "ROB104 Hücresi",
  "ROB108 Hücresi",
  "FF Preform Ölçüm",
  "Flowform Hücresi",
  "N602 Hücresi",
  "N603 Hücresi",
  "ROB109 Hücresi",
  "Quench Hücresi",
  "ROB110-111 Hücresi",
  "Final Ölçüm",
  "Fosfat Hücresi",
  "Boya Hücresi",
] as const;

export const BOLUM_SORUMLU: Record<string, string> = {
  "Pres Hücresi": "Musa Akyol",
  "ETM Hücresi": "Çağrı Can Çolak",
  "ROB104 Hücresi": "Suat Tunç",
  "ROB108 Hücresi": "Suat Tunç",
  "FF Preform Ölçüm": "Zeynep Ece Toker",
  "Flowform Hücresi": "Yücel Kıroğlu",
  "N602 Hücresi": "Yücel Kıroğlu",
  "N603 Hücresi": "Yücel Kıroğlu",
  "ROB109 Hücresi": "Mücahit Toptaş",
  "Quench Hücresi": "Calor",
  "ROB110-111 Hücresi": "Taner Çelik",
  "Final Ölçüm": "Zeynep Ece Toker",
  "Fosfat Hücresi": "Ahmet Hakan Akın",
  "Boya Hücresi": "Ahmet Hakan Akın",
};

export const MAKINE_SAYISI_DEFAULTS: Record<string, number> = {
  "ETM Hücresi": 2,
  "ROB108 Hücresi": 5,
  "ROB104 Hücresi": 2,
  "ROB109 Hücresi": 2,
};

export type Bolum = (typeof BOLUMLER)[number];

export type ProductionRow = {
  id?: string;
  sira_no: number;
  zaman_dilimi: string;
  hedef_uretim_adeti: number | null;
  uretim_adeti: number | null;
  musteri_var: boolean;
  mola: number | null;
  mola_turu: string | null;
  ariza: number | null;
  ariza_turu: string | null;
  ariza_aciklama: string | null;
  planli_durus: number | null;
  planli_durus_turu: string | null;
  planli_durus_aciklama: string | null;
  setup_ve_ayar: number | null;
  setup_turu: string | null;
  setup_aciklama: string | null;
  takim_degisimi: number | null;
  takim_degisim_turu: string | null;
  kalip_demontaj: number | null;
  kalip_demontaj_turu: string | null;
  kalip_montaj: number | null;
  kalip_montaj_turu: string | null;
  calisan_makine_sayisi: number | null;
  calisan_makine_aciklama: string | null;
  onceki_istasyon_bekleme: number | null;
  musteri_kaynakli_durus: number | null;
  musteri_durus_turu: string | null;
  musteri_durus_aciklama: string | null;
  kalite_kaynakli_durus: number | null;
  ariza_giderildi?: boolean;
  ariza_giderilme_aciklama?: string | null;
  ariza_giderildi_at?: string | null;
};

export type AciklamaDialogType = {
  rowIndex: number;
  alan: "ariza" | "planli_durus" | "setup" | "musteri" | "calisan_makine";
  baslik: string;
  aciklamaKey: "ariza_aciklama" | "planli_durus_aciklama" | "setup_aciklama" | "musteri_durus_aciklama" | "calisan_makine_aciklama";
  aciklama: string;
  selectedAltTur?: string;
};

export type ArizaDetail = {
  id: string;
  tarih: string;
  bolum: string;
  sorumlu: string;
  zamanDilimi: string;
  dakika: number;
  tur: string;
  aciklama: string;
  giderildi: boolean;
  giderilmeAciklama: string | null;
  giderildiAt: string | null;
};

export type ProductionFormData = {
  bolum: string;
  sorumlu: string;
  tarih: string;
  rows: ProductionRow[];
};

export type ZamanDilimi = {
  sira_no: number;
  label: string;
};

export const ZAMAN_DILIMLERI: ZamanDilimi[] = [
  { sira_no: 1, label: "08:00 - 09:00" },
  { sira_no: 2, label: "09:00 - 10:00" },
  { sira_no: 3, label: "10:00 - 11:00" },
  { sira_no: 4, label: "11:00 - 12:00" },
  { sira_no: 5, label: "12:00 - 13:00" },
  { sira_no: 6, label: "13:00 - 14:00" },
  { sira_no: 7, label: "14:00 - 15:00" },
  { sira_no: 8, label: "15:00 - 16:00" },
  { sira_no: 9, label: "16:00 - 17:00" },
];

export const ETM_FLOWFORM_UZATILMIS_ZAMAN_DILIMLERI: ZamanDilimi[] = [
  ...ZAMAN_DILIMLERI,
  { sira_no: 10, label: "17:00 - 18:00" },
  { sira_no: 11, label: "18:00 - 19:00" },
  { sira_no: 12, label: "19:00 - 20:00" },
  { sira_no: 13, label: "20:00 - 21:00" },
];

export const FLOWFORM_GECE_UZATILMIS_ZAMAN_DILIMLERI: ZamanDilimi[] = [
  ...ETM_FLOWFORM_UZATILMIS_ZAMAN_DILIMLERI,
  { sira_no: 14, label: "21:00 - 22:00" },
  { sira_no: 15, label: "22:00 - 23:00" },
  { sira_no: 16, label: "23:00 - 24:00" },
  { sira_no: 17, label: "24:00 - 01:00" },
];

export const CUMA_CUMARTESI_ZAMAN_DILIMLERI: ZamanDilimi[] = [
  { sira_no: 1, label: "09:00 - 10:00" },
  { sira_no: 2, label: "10:00 - 11:00" },
  { sira_no: 3, label: "11:00 - 12:00" },
  { sira_no: 4, label: "12:00 - 13:00" },
  { sira_no: 5, label: "13:00 - 14:00" },
  { sira_no: 6, label: "14:00 - 15:00" },
  { sira_no: 7, label: "15:00 - 16:00" },
  { sira_no: 8, label: "16:00 - 17:00" },
];

export function getZamanDilimleriForDate(tarih: string | null | undefined) {
  if (!tarih || !/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
    return ZAMAN_DILIMLERI;
  }

  const day = new Date(`${tarih}T00:00:00`).getDay();
  if (day === 5 || day === 6) {
    return CUMA_CUMARTESI_ZAMAN_DILIMLERI;
  }

  return ZAMAN_DILIMLERI;
}

export function getZamanDilimleriForCellAndDate(bolum: string | null | undefined, tarih: string | null | undefined) {
  if (bolum === "Quench Hücresi") {
    return [{ sira_no: 1, label: "Günlük" }];
  }
  if (
    bolum === "ETM Hücresi" ||
    bolum === "Flowform Hücresi" ||
    bolum === "ROB104 Hücresi" ||
    bolum === "ROB108 Hücresi" ||
    bolum === "ROB109 Hücresi" ||
    bolum === "ROB110-111 Hücresi"
  ) {
    if (tarih && /^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
      const day = new Date(`${tarih}T00:00:00`).getDay();
      if (day !== 5 && day !== 6) {
        if (bolum === "Flowform Hücresi") return FLOWFORM_GECE_UZATILMIS_ZAMAN_DILIMLERI;
        return ETM_FLOWFORM_UZATILMIS_ZAMAN_DILIMLERI;
      }
    }
  }
  return getZamanDilimleriForDate(tarih);
}

export type AltTurOption = { code: string };

export const ETM_ARIZA_TURLER: AltTurOption[] = [
  { code: "Mekanik" },
  { code: "Elektrik" },
  { code: "Akışkan" },
  { code: "Belirsiz" },
  { code: "SBU Arıza" },
  { code: "Calor Konveyör Arıza" },
  { code: "Robot" },
  { code: "SBU Parça Boşaltma" },
  { code: "SBU Parça Yükleme" },
  { code: "Kesici Takım Yok" },
  { code: "Bor Yağı Bitti" },
];

export const ROB_ARIZA_TURLER: AltTurOption[] = [
  { code: "Mekanik" },
  { code: "Elektrik" },
  { code: "Akışkan" },
  { code: "Belirsiz" },
  { code: "Robot" },
  { code: "Talaş Arabası Dolu" },
  { code: "Manuel İşlemler" },
  { code: "Kesici Takım Yok" },
  { code: "Bor Yağı Bitti" },
];

export const N_ARIZA_TURLER: AltTurOption[] = [
  { code: "E" },
  { code: "A" },
  { code: "M" },
  { code: "O" },
  { code: "Kalite" },
  { code: "Belirsiz" },
  { code: "Çıkış Konveyörü Dolu" },
];

export const DURUS_KOLONLARI: {
  key: keyof ProductionRow;
  label: string;
  altTurKey?: keyof ProductionRow;
  altTurler?: AltTurOption[];
}[] = [
  {
    key: "mola",
    label: "Mola",
    altTurKey: "mola_turu",
    altTurler: [{ code: "Çay" }, { code: "Yemek" }],
  },
  {
    key: "ariza",
    label: "Arıza",
    altTurKey: "ariza_turu",
    altTurler: [
      { code: "E" },
      { code: "A" },
      { code: "M" },
      { code: "O" },
      { code: "Kalite" },
      { code: "Belirsiz" },
    ],
  },
  {
    key: "planli_durus",
    label: "Planlı Duruş",
    altTurKey: "planli_durus_turu",
    altTurler: [{ code: "Planlı Bakım" }, { code: "Parça Basmama Kararı" }],
  },
  {
    key: "setup_ve_ayar",
    label: "Setup ve Ayar",
    altTurKey: "setup_turu",
    altTurler: [{ code: "SA1" }, { code: "SA2" }],
  },
  { key: "takim_degisimi", label: "Takım Değişimi" },
  {
    key: "kalip_demontaj",
    label: "Kalıp Demontaj",
    altTurKey: "kalip_demontaj_turu",
    altTurler: [
      { code: "HFP Erkek BCE" },
      { code: "HFP Erkek UpS" },
      { code: "HFP Dişi" },
      { code: "HIP Ringler" },
      { code: "HIP Erkek" },
    ],
  },
  {
    key: "kalip_montaj",
    label: "Kalıp Montaj",
    altTurKey: "kalip_montaj_turu",
    altTurler: [
      { code: "HFP Erkek BCE" },
      { code: "HFP Erkek UpS" },
      { code: "HFP Dişi" },
      { code: "HIP Ringler" },
      { code: "HIP Erkek" },
    ],
  },
  { key: "onceki_istasyon_bekleme", label: "Bir Önceki İstasyon Parça Bekleme" },
  {
    key: "musteri_kaynakli_durus",
    label: "Müşteri Kaynaklı Duruş",
    altTurKey: "musteri_durus_turu",
    altTurler: [
      { code: "Utility Eksiği" },
      { code: "Consumable Eksiği" },
      { code: "Operatör Bekleme" },
    ],
  },
  { key: "kalite_kaynakli_durus", label: "Kalite Kaynaklı Duruş" },
];

export type FFPreformRow = {
  id?: string;
  sira_no: number;
  olculen_adet: number | null;
  red_adet: number | null;
  rework_adet: number | null;
};

export type FFPreformRejectRow = {
  id?: string;
  sira_no: number;
  parca_no: string;
  red_sebebi: string;
};

export type FFPreformReworkRow = {
  id?: string;
  sira_no: number;
  parca_no: string;
  rework_nedeni: string;
};
