import { ProductionFormData, MAKINE_SAYISI_DEFAULTS } from "@/lib/types";

export function validateAltTurSelections(data: ProductionFormData): string[] {
  const eksikler: string[] = [];
  const altTurKontrol: { key: string; altTurKey: string; label: string }[] = [
    { key: "mola", altTurKey: "mola_turu", label: "Mola" },
    { key: "ariza", altTurKey: "ariza_turu", label: "Arıza" },
    { key: "planli_durus", altTurKey: "planli_durus_turu", label: "Planlı Duruş" },
    { key: "setup_ve_ayar", altTurKey: "setup_turu", label: "Setup ve Ayar" },
    { key: "musteri_kaynakli_durus", altTurKey: "musteri_durus_turu", label: "Müşteri Kaynaklı Duruş" },
    { key: "kalip_demontaj", altTurKey: "kalip_demontaj_turu", label: "Kalıp Demontaj" },
    { key: "kalip_montaj", altTurKey: "kalip_montaj_turu", label: "Kalıp Montaj" },
  ];
  if (data.bolum === "ETM Hücresi") {
    altTurKontrol.push({ key: "takim_degisimi", altTurKey: "takim_degisim_turu", label: "Holder - Insert Değişim" });
  } else if (data.bolum === "Flowform Hücresi") {
    altTurKontrol.push({ key: "takim_degisimi", altTurKey: "takim_degisim_turu", label: "Takım Değişimi" });
  }
  data.rows.forEach((row) => {
    altTurKontrol.forEach(({ key, altTurKey, label }) => {
      const sure = (row as Record<string, unknown>)[key] as number | null;
      const tur = (row as Record<string, unknown>)[altTurKey] as string | null;
      if (sure != null && sure > 0 && !tur) {
        eksikler.push(`${row.zaman_dilimi} → ${label}`);
      }
    });
  });
  return eksikler;
}

export function validateAciklamaFields(data: ProductionFormData): string[] {
  const aciklamaEksik: string[] = [];
  data.rows.forEach((row) => {
    const isEtmCell = data.bolum === "ETM Hücresi";
    const isRobCell = ["ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(data.bolum || "");
    const isNCell = ["N602 Hücresi", "N603 Hücresi"].includes(data.bolum || "");
    const isArizaExplanationRequired = isEtmCell
      ? ["Mekanik", "Elektrik", "Akışkan", "SBU Arıza", "Calor Konveyör Arıza", "Robot"].includes(row.ariza_turu || "")
      : isRobCell
      ? ["Mekanik", "Elektrik", "Akışkan", "Belirsiz", "Robot"].includes(row.ariza_turu || "")
      : isNCell
      ? ["E", "A", "M", "O", "Kalite", "Belirsiz"].includes(row.ariza_turu || "")
      : !!row.ariza_turu;
    if (isArizaExplanationRequired && !row.ariza_aciklama?.trim())
      aciklamaEksik.push(`${row.zaman_dilimi} → Arıza açıklaması`);
    if (row.planli_durus_turu === "Planlı Bakım" && !row.planli_durus_aciklama?.trim())
      aciklamaEksik.push(`${row.zaman_dilimi} → Planlı Duruş açıklaması`);
    const isPressCell = data.bolum === "Pres Hücresi";
    const isSetupExplanationRequired = isEtmCell
      ? false
      : isPressCell
      ? (row.setup_turu === "Kaçak Kontrolü")
      : !!row.setup_turu;
    if (isSetupExplanationRequired && !row.setup_aciklama?.trim()) {
      const labelText = (isPressCell || isEtmCell) ? "Hazırlık" : "Setup ve Ayar";
      aciklamaEksik.push(`${row.zaman_dilimi} → ${labelText} açıklaması`);
    }
    if (row.musteri_durus_turu && !row.musteri_durus_aciklama?.trim())
      aciklamaEksik.push(`${row.zaman_dilimi} → Müşteri Kaynaklı Duruş açıklaması`);
    const defaultLimit = MAKINE_SAYISI_DEFAULTS[data.bolum];
    if (defaultLimit !== undefined && row.calisan_makine_sayisi != null) {
      const isRob108 = data.bolum === "ROB108 Hücresi";
      const isExplanationRequired = isRob108
        ? row.calisan_makine_sayisi !== 5
        : row.calisan_makine_sayisi < defaultLimit;
      if (isExplanationRequired && !row.calisan_makine_aciklama?.trim()) {
        aciklamaEksik.push(`${row.zaman_dilimi} → Çalışan Makinesi Sayısı açıklaması`);
      }
    }
  });
  return aciklamaEksik;
}
