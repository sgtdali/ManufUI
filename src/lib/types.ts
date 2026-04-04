export type ProductionRow = {
  sira_no: number;
  zaman_dilimi: string;
  uretim_adeti: number | null;
  mola: number | null;
  ariza: number | null;
  planli_durus: number | null;
  setup_ve_ayar: number | null;
  takim_degisimi: number | null;
  onceki_istasyon_bekleme: number | null;
  musteri_kaynakli_durus: number | null;
  kalite_kaynakli_durus: number | null;
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

export const DURUS_KOLONLARI: { key: keyof ProductionRow; label: string }[] = [
  { key: "mola", label: "Mola" },
  { key: "ariza", label: "Arıza" },
  { key: "planli_durus", label: "Planlı Duruş" },
  { key: "setup_ve_ayar", label: "Setup ve Ayar" },
  { key: "takim_degisimi", label: "Takım Değişimi" },
  { key: "onceki_istasyon_bekleme", label: "Bir Önceki İstasyon Parça Bekleme" },
  { key: "musteri_kaynakli_durus", label: "Müşteri Kaynaklı Duruş" },
  { key: "kalite_kaynakli_durus", label: "Kalite Kaynaklı Duruş" },
];
