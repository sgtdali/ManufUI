export const BOLUMLER = [
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
  "Boya Hücresi",
] as const;

export const BOLUM_SORUMLU: Record<string, string> = {
  "Pres Hücresi": "Musa Akyol",
  "ETM Hücresi": "İbrahim Çetinbak",
  "ROB104 Hücresi": "Suat Tunç",
  "ROB108 Hücresi": "Suat Tunç",
  "Flowform Hücresi": "Gökalp Atmaca",
  "N602 Hücresi": "Gökalp Atmaca",
  "N603 Hücresi": "Gökalp Atmaca",
  "ROB109 Hücresi": "Mücahit Toptaş",
  "Quench Hücresi": "Calor",
  "ROB110-111 Hücresi": "Taner Çelik",
  "Fosfat Hücresi": "Halil Kesit",
  "Boya Hücresi": "Halil Kesit",
};

export type Bolum = (typeof BOLUMLER)[number];

export type ProductionRow = {
  id?: string;
  sira_no: number;
  zaman_dilimi: string;
  uretim_adeti: number | null;
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
  onceki_istasyon_bekleme: number | null;
  musteri_kaynakli_durus: number | null;
  musteri_durus_turu: string | null;
  kalite_kaynakli_durus: number | null;
  ariza_giderildi?: boolean;
  ariza_giderilme_aciklama?: string | null;
  ariza_giderildi_at?: string | null;
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

export const ZAMAN_DILIMLERI = [
  { sira_no: 1, label: "07:45 - 08:45" },
  { sira_no: 2, label: "08:45 - 09:45" },
  { sira_no: 3, label: "09:45 - 10:45" },
  { sira_no: 4, label: "10:45 - 12:00" },
  { sira_no: 5, label: "12:00 - 13:00" },
  { sira_no: 6, label: "13:00 - 14:00" },
  { sira_no: 7, label: "14:00 - 15:00" },
  { sira_no: 8, label: "15:00 - 16:00" },
  { sira_no: 9, label: "16:00 - 17:15" },
];

export type AltTurOption = { code: string };

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
    altTurler: [{ code: "M1" }, { code: "M2" }],
  },
  {
    key: "ariza",
    label: "Arıza",
    altTurKey: "ariza_turu",
    altTurler: [{ code: "E" }, { code: "A" }, { code: "M" }, { code: "O" }],
  },
  {
    key: "planli_durus",
    label: "Planlı Duruş",
    altTurKey: "planli_durus_turu",
    altTurler: [{ code: "P1" }, { code: "P2" }, { code: "P3" }],
  },
  {
    key: "setup_ve_ayar",
    label: "Setup ve Ayar",
    altTurKey: "setup_turu",
    altTurler: [{ code: "SA1" }, { code: "SA2" }],
  },
  { key: "takim_degisimi", label: "Takım Değişimi" },
  { key: "onceki_istasyon_bekleme", label: "Bir Önceki İstasyon Parça Bekleme" },
  {
    key: "musteri_kaynakli_durus",
    label: "Müşteri Kaynaklı Duruş",
    altTurKey: "musteri_durus_turu",
    altTurler: [{ code: "MKB1" }, { code: "MKB2" }, { code: "MKB3" }],
  },
  { key: "kalite_kaynakli_durus", label: "Kalite Kaynaklı Duruş" },
];
