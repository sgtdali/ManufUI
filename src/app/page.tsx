"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { saveProductionRecord, loadProductionRecord } from "./actions";
import {
  ProductionFormData,
  ZAMAN_DILIMLERI,
  DURUS_KOLONLARI,
  BOLUM_SORUMLU,
  MAKINE_SAYISI_DEFAULTS,
  ETM_ARIZA_TURLER,
  getZamanDilimleriForDate,
  getZamanDilimleriForCellAndDate,
  type ZamanDilimi,
  type ProductionRow,
  type AciklamaDialogType,
} from "@/lib/types";
import {
  formatTargetDowntimeIssues,
  validateTargetDowntime,
} from "@/lib/productionValidation";

import { FormHeader } from "./_components/FormHeader";
import { ProductionTable } from "./_components/ProductionTable";
import { FFPreformTable } from "./_components/FFPreformTable";
import { FinalOlcumTable } from "./_components/FinalOlcumTable";
import { DowntimeExplanationDialog } from "./_components/DowntimeExplanationDialog";
import { OverwriteConfirmDialog } from "./_components/OverwriteConfirmDialog";
import { OneriKayitDialog } from "./_components/OneriKayitDialog";

// AciklamaDialogType is imported from @/lib/types

function buildEmptyRows(
  zamanDilimleri: ZamanDilimi[] = ZAMAN_DILIMLERI,
  bolum?: string,
  tarih?: string
): ProductionFormData["rows"] {
  const isTargetDefault20 = bolum && ["Pres Hücresi", "ETM Hücresi", "ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(bolum);
  const isTargetDefault15 = bolum === "N602 Hücresi";
  const isTargetDefault12 = bolum === "Flowform Hücresi";
  let isWeekend = false;
  if (tarih) {
    const day = new Date(`${tarih}T00:00:00`).getDay();
    isWeekend = (day === 5 || day === 6);
  }
  const defaultTarget = isWeekend
    ? null
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

function applyRecordToForm(
  record: Record<string, unknown>,
  bolum: string,
  tarih: string
): ProductionFormData {
  const isTargetDefault20 = ["Pres Hücresi", "ETM Hücresi", "ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(bolum);
  const isTargetDefault15 = bolum === "N602 Hücresi";
  const isTargetDefault12 = bolum === "Flowform Hücresi";
  const day = new Date(`${tarih}T00:00:00`).getDay();
  const isWeekend = (day === 5 || day === 6);
  const isTargetReadOnly = (isTargetDefault20 || isTargetDefault15 || isTargetDefault12) && !isWeekend;

  const dbRows = (record.manuf_production_rows as Record<string, unknown>[] ?? []);
  const expectedSlots = getZamanDilimleriForCellAndDate(bolum, tarih);

  // DB'de kayıtlı satırları zaman_dilimi label'ına göre map'le
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
        const ROB108_TARGETS: Record<number, number> = {
          5: 20,
          4: 13,
          3: 10,
          2: 6,
          1: 3,
          0: 0
        };
        targetVal = mSayisi != null && ROB108_TARGETS[mSayisi] !== undefined ? ROB108_TARGETS[mSayisi] : 20;
      } else if (bolum === "N602 Hücresi") {
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
    // Beklenen her slot için DB'den satırı al; yoksa boş satır oluştur
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

export default function ProductionFormPage() {
  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, watch, reset, control, setValue, getValues } =
    useForm<ProductionFormData>({
      defaultValues: {
        bolum: "",
        sorumlu: "",
        tarih: today,
        rows: buildEmptyRows(getZamanDilimleriForCellAndDate(undefined, today), undefined, today),
      },
    });

  const [saving, setSaving] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [oneriDialogOpen, setOneriDialogOpen] = useState(false);
  const pendingDataRef = useRef<ProductionFormData | null>(null);

  // Açıklama dialog state
  const [aciklamaDialog, setAciklamaDialog] = useState<AciklamaDialogType | null>(null);

  // URL parametrelerini başlangıçta oku
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlBolum = params.get("bolum");
      const urlTarih = params.get("tarih");
      if (urlBolum) {
        setValue("bolum", urlBolum);
      }
      if (urlTarih) {
        setValue("tarih", urlTarih);
      }
    }
  }, [setValue]);

  const bolum = watch("bolum");
  const tarih = watch("tarih");
  const watchedRows = watch("rows");
  const zamanDilimleri = getZamanDilimleriForCellAndDate(bolum, tarih);
  const tableRows =
    watchedRows && watchedRows.length > 0
      ? watchedRows
      : buildEmptyRows(zamanDilimleri, bolum);

  // Otomatik yükleme: bölüm veya tarih değişince arka planda çek
  useEffect(() => {
    if (!bolum || !tarih) {
      setHasExistingRecord(false);
      return;
    }
    if (bolum === "FF Preform Ölçüm" || bolum === "Final Ölçüm") {
      setHasExistingRecord(false);
      return;
    }
    let cancelled = false;
    setAutoLoading(true);
    loadProductionRecord(bolum, tarih).then((record) => {
      if (cancelled) return;
      setAutoLoading(false);
      if (record) {
        setHasExistingRecord(true);
        reset(applyRecordToForm(record as Record<string, unknown>, bolum, tarih));
        toast.success(`${bolum} / ${tarih} kaydı otomatik yüklendi.`);
      } else {
        setHasExistingRecord(false);
        reset({
          bolum,
          sorumlu: BOLUM_SORUMLU[bolum] ?? "",
          tarih,
          rows: buildEmptyRows(getZamanDilimleriForCellAndDate(bolum, tarih), bolum, tarih),
        });
      }
    });
    return () => { cancelled = true; };
  }, [bolum, tarih]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualLoad = useCallback(async () => {
    if (!bolum || !tarih) {
      toast.warning("Bölüm ve tarih giriniz.");
      return;
    }
    setAutoLoading(true);
    const record = await loadProductionRecord(bolum, tarih);
    setAutoLoading(false);
    if (!record) {
      setHasExistingRecord(false);
      toast.info("Bu bölüm/tarih için kayıt bulunamadı.");
      reset({
        bolum,
        sorumlu: BOLUM_SORUMLU[bolum] ?? "",
        tarih,
        rows: buildEmptyRows(getZamanDilimleriForDate(tarih), bolum, tarih),
      });
      return;
    }
    setHasExistingRecord(true);
    reset(applyRecordToForm(record as Record<string, unknown>, bolum, tarih));
    toast.success("Kayıt yenilendi.");
  }, [bolum, tarih, reset]);

  const doSave = useCallback(async (data: ProductionFormData) => {
    setSaving(true);
    const result = await saveProductionRecord(data);
    setSaving(false);
    if (result.success) {
      setHasExistingRecord(true);
      toast.success("Kayıt başarıyla kaydedildi.");
    } else {
      toast.error(`Hata: ${result.error}`);
    }
  }, []);

  const onSubmit = useCallback(async (data: ProductionFormData) => {
    if (!data.bolum) {
      toast.error("Bölüm zorunludur.");
      return;
    }

    // Alt tür validasyonu
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
    if (eksikler.length > 0) {
      toast.error(
        `Aşağıdaki satırlarda tür seçimi yapılmadı:\n${eksikler.join("\n")}`,
        { duration: 6000, style: { whiteSpace: "pre-line" } }
      );
      return;
    }

    // Açıklama validasyonu
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
    if (aciklamaEksik.length > 0) {
      toast.error(
        `Aşağıdaki satırlarda açıklama girilmedi:\n${aciklamaEksik.join("\n")}`,
        { duration: 6000, style: { whiteSpace: "pre-line" } }
      );
      return;
    }

    const targetIssues = validateTargetDowntime(data);
    if (targetIssues.length > 0) {
      toast.error(
        `Hedef/gerçekleşen farkı için duruş süresi eksik:\n${formatTargetDowntimeIssues(targetIssues)}`,
        { duration: 9000, style: { whiteSpace: "pre-line" } }
      );
      return;
    }

    if (hasExistingRecord) {
      pendingDataRef.current = data;
      setConfirmOpen(true);
      return;
    }
    await doSave(data);
  }, [hasExistingRecord, doSave]);

  const handleConfirmUpdate = useCallback(async () => {
    setConfirmOpen(false);
    if (pendingDataRef.current) {
      await doSave(pendingDataRef.current);
      pendingDataRef.current = null;
    }
  }, [doSave]);

  const handleOpenAciklamaDialog = useCallback((rowIndex: number, k: typeof DURUS_KOLONLARI[number], val: string) => {
    if (k.key === "ariza") {
      const isEtmCell = bolum === "ETM Hücresi";
      const isRobCell = ["ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(bolum || "");
      const isNCell = ["N602 Hücresi", "N603 Hücresi"].includes(bolum || "");
      const shouldOpen = isEtmCell
        ? ["Mekanik", "Elektrik", "Akışkan", "SBU Arıza", "Calor Konveyör Arıza", "Robot"].includes(val)
        : isRobCell
        ? ["Mekanik", "Elektrik", "Akışkan", "Belirsiz", "Robot"].includes(val)
        : isNCell
        ? ["E", "A", "M", "O", "Kalite", "Belirsiz"].includes(val)
        : true;
      if (shouldOpen) {
        setAciklamaDialog({
          rowIndex,
          alan: "ariza",
          baslik: "Arıza Açıklaması",
          aciklamaKey: "ariza_aciklama",
          aciklama: (watchedRows?.[rowIndex]?.ariza_aciklama as string) ?? "",
          selectedAltTur: val,
        });
      } else {
        setValue(`rows.${rowIndex}.ariza_aciklama`, null);
      }
    } else if (k.key === "planli_durus") {
      const shouldOpen = val === "Planlı Bakım";
      if (shouldOpen) {
        setAciklamaDialog({
          rowIndex,
          alan: "planli_durus",
          baslik: "Planlı Duruş Açıklaması",
          aciklamaKey: "planli_durus_aciklama",
          aciklama: (watchedRows?.[rowIndex]?.planli_durus_aciklama as string) ?? "",
        });
      } else {
        setValue(`rows.${rowIndex}.planli_durus_aciklama`, null);
      }
    } else if (k.key === "setup_ve_ayar") {
      const isPressCell = bolum === "Pres Hücresi";
      const isEtmCell = bolum === "ETM Hücresi";
      const shouldOpen = isEtmCell ? false : isPressCell ? (val === "Kaçak Kontrolü") : true;
      if (shouldOpen) {
        setAciklamaDialog({
          rowIndex,
          alan: "setup",
          baslik: (isPressCell || isEtmCell) ? "Hazırlık Açıklaması" : "Setup ve Ayar Açıklaması",
          aciklamaKey: "setup_aciklama",
          aciklama: (watchedRows?.[rowIndex]?.setup_aciklama as string) ?? "",
        });
      } else {
        setValue(`rows.${rowIndex}.setup_aciklama`, null);
      }
    } else if (k.key === "musteri_kaynakli_durus") {
      setAciklamaDialog({
        rowIndex,
        alan: "musteri",
        baslik: "Müşteri Kaynaklı Duruş Açıklaması",
        aciklamaKey: "musteri_durus_aciklama",
        aciklama: (watchedRows?.[rowIndex]?.musteri_durus_aciklama as string) ?? "",
      });
    }
  }, [watchedRows]);

  const handleOpenCalisanMakineDialog = useCallback((rowIndex: number, val: number | null) => {
    const defaultLimit = MAKINE_SAYISI_DEFAULTS[bolum];
    const isRob108 = bolum === "ROB108 Hücresi";

    if (isRob108 && val != null) {
      const ROB108_TARGETS: Record<number, number> = {
        5: 20,
        4: 13,
        3: 10,
        2: 6,
        1: 3,
        0: 0
      };
      const newTarget = ROB108_TARGETS[val] !== undefined ? ROB108_TARGETS[val] : 20;
      setValue(`rows.${rowIndex}.hedef_uretim_adeti`, newTarget);
    }

    const isExplanationRequired = isRob108
      ? val != null && val !== 5
      : defaultLimit !== undefined && val != null && val < defaultLimit;

    if (isExplanationRequired) {
      setAciklamaDialog({
        rowIndex,
        alan: "calisan_makine",
        baslik: `Çalışan Makinesi Sayısı Açıklaması (${val} Makine / Normal: ${isRob108 ? 5 : defaultLimit})`,
        aciklamaKey: "calisan_makine_aciklama",
        aciklama: (watchedRows?.[rowIndex]?.calisan_makine_aciklama as string) ?? "",
      });
    } else {
      setValue(`rows.${rowIndex}.calisan_makine_aciklama`, null);
    }
  }, [watchedRows, setValue, bolum]);

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8 text-zinc-950">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <header className="text-center pb-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            Günlük Üretim Takip Formu
          </h1>
        </header>

        {/* Form Başlığı Bileşeni */}
        <FormHeader
          control={control}
          register={register}
          setValue={setValue}
          autoLoading={autoLoading}
          hasExistingRecord={hasExistingRecord}
          bolum={bolum}
          tarih={tarih}
          onManualLoad={handleManualLoad}
          onOpenOneriDialog={() => setOneriDialogOpen(true)}
        />

        {/* Üretim Tablosu Bileşeni */}
        {bolum === "FF Preform Ölçüm" ? (
          <FFPreformTable
            tarih={tarih}
            sorumlu={watch("sorumlu")}
          />
        ) : bolum === "Final Ölçüm" ? (
          <FinalOlcumTable
            tarih={tarih}
            sorumlu={watch("sorumlu")}
          />
        ) : (
          <ProductionTable
            register={register}
            control={control}
            tableRows={tableRows}
            watchedRows={watchedRows}
            saving={saving}
            onOpenAciklamaDialog={handleOpenAciklamaDialog}
            onOpenCalisanMakineDialog={handleOpenCalisanMakineDialog}
            onSubmit={handleSubmit(onSubmit)}
            bolum={bolum}
            tarih={tarih}
          />
        )}
      </div>

      {/* Duruş Açıklama Modal Dialog Bileşeni */}
      <DowntimeExplanationDialog
        dialogData={aciklamaDialog}
        onClose={() => setAciklamaDialog(null)}
        onConfirm={(finalText) => {
          if (aciklamaDialog !== null) {
            setValue(
              `rows.${aciklamaDialog.rowIndex}.${aciklamaDialog.aciklamaKey}`,
              finalText || null
            );
          }
          setAciklamaDialog(null);
        }}
        zamanDilimiLabel={aciklamaDialog !== null ? tableRows[aciklamaDialog.rowIndex]?.zaman_dilimi ?? "" : ""}
      />

      {/* Kayıt Üzerine Yazma Onay Alert Dialog Bileşeni */}
      <OverwriteConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        bolum={getValues("bolum")}
        tarih={getValues("tarih")}
        onConfirm={handleConfirmUpdate}
      />

      {/* Öneri Kayıt Dialog Bileşeni */}
      <OneriKayitDialog
        isOpen={oneriDialogOpen}
        onClose={() => setOneriDialogOpen(false)}
      />
    </div>
  );
}
