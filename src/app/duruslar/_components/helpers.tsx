export const DURUS_TIPLERI = [
  { key: "all", label: "Tüm Duruşlar" },
  { key: "ariza", label: "Arıza" },
  { key: "planli_durus", label: "Planlı Duruş" },
  { key: "setup_ve_ayar", label: "Setup ve Ayar / Hazırlık" },
  { key: "musteri_kaynakli_durus", label: "Müşteri Kaynaklı Duruş" },
  { key: "takim_degisimi", label: "Takım Değişimi / Rejim" },
  { key: "kalip_demontaj", label: "Kalıp Demontaj" },
  { key: "kalip_montaj", label: "Kalıp Montaj" },
  { key: "onceki_istasyon_bekleme", label: "Bir Önceki İstasyon Bekleme" },
  { key: "kalite_kaynakli_durus", label: "Kalite Kaynaklı Duruş" },
  { key: "mola", label: "Mola" },
];

export function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function DURUS_TIP_OPTIONS(selected: string) {
  return DURUS_TIPLERI.map((t) => (
    <option key={t.key} value={t.key}>
      {t.label}
    </option>
  ));
}
