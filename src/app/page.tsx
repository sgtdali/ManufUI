"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { saveProductionRecord, loadProductionRecord } from "./actions";
import {
  ProductionFormData,
  DURUS_KOLONLARI,
  BOLUM_SORUMLU,
  MAKINE_SAYISI_DEFAULTS,
  getZamanDilimleriForDate,
  getZamanDilimleriForCellAndDate,
  type AciklamaDialogType,
} from "@/lib/types";
import {
  formatTargetDowntimeIssues,
  validateTargetDowntime,
} from "@/lib/productionValidation";
import { isReadOnlyUser } from "@/lib/useAuthRole";
import { FormHeader } from "./_components/FormHeader";
import { ProductionTable } from "./_components/ProductionTable";
import { FFPreformTable } from "./_components/FFPreformTable";
import { FinalOlcumTable } from "./_components/FinalOlcumTable";
import { DowntimeExplanationDialog } from "./_components/DowntimeExplanationDialog";
import { OverwriteConfirmDialog } from "./_components/OverwriteConfirmDialog";
import { OneriKayitDialog } from "./_components/OneriKayitDialog";
import { buildEmptyRows, applyRecordToForm } from "./_helpers/formHelpers";
import { validateAltTurSelections, validateAciklamaFields } from "./_helpers/formValidation";

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

  const [readOnly, setReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [oneriDialogOpen, setOneriDialogOpen] = useState(false);
  const pendingDataRef = useRef<ProductionFormData | null>(null);
  const [aciklamaDialog, setAciklamaDialog] = useState<AciklamaDialogType | null>(null);

  useEffect(() => { setReadOnly(isReadOnlyUser()); }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlBolum = params.get("bolum");
      const urlTarih = params.get("tarih");
      if (urlBolum) setValue("bolum", urlBolum);
      if (urlTarih) setValue("tarih", urlTarih);
    }
  }, [setValue]);

  const bolum = watch("bolum");
  const tarih = watch("tarih");
  const watchedRows = watch("rows");
  const zamanDilimleri = getZamanDilimleriForCellAndDate(bolum, tarih);
  const tableRows = watchedRows && watchedRows.length > 0 ? watchedRows : buildEmptyRows(zamanDilimleri, bolum);

  useEffect(() => {
    if (!bolum || !tarih) { setHasExistingRecord(false); return; }
    if (bolum === "FF Preform Ölçüm" || bolum === "Final Ölçüm") { setHasExistingRecord(false); return; }
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
        reset({ bolum, sorumlu: BOLUM_SORUMLU[bolum] ?? "", tarih, rows: buildEmptyRows(getZamanDilimleriForCellAndDate(bolum, tarih), bolum, tarih) });
      }
    });
    return () => { cancelled = true; };
  }, [bolum, tarih]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualLoad = useCallback(async () => {
    if (!bolum || !tarih) { toast.warning("Bölüm ve tarih giriniz."); return; }
    setAutoLoading(true);
    const record = await loadProductionRecord(bolum, tarih);
    setAutoLoading(false);
    if (!record) {
      setHasExistingRecord(false);
      toast.info("Bu bölüm/tarih için kayıt bulunamadı.");
      reset({ bolum, sorumlu: BOLUM_SORUMLU[bolum] ?? "", tarih, rows: buildEmptyRows(getZamanDilimleriForDate(tarih), bolum, tarih) });
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
    if (result.success) { setHasExistingRecord(true); toast.success("Kayıt başarıyla kaydedildi."); }
    else { toast.error(`Hata: ${result.error}`); }
  }, []);

  const onSubmit = useCallback(async (data: ProductionFormData) => {
    if (readOnly) { toast.error("Salt okunur erisim — veri kaydetme yetkiniz yok."); return; }
    if (!data.bolum) { toast.error("Bölüm zorunludur."); return; }

    const eksikler = validateAltTurSelections(data);
    if (eksikler.length > 0) {
      toast.error(`Aşağıdaki satırlarda tür seçimi yapılmadı:\n${eksikler.join("\n")}`, { duration: 6000, style: { whiteSpace: "pre-line" } });
      return;
    }

    const aciklamaEksik = validateAciklamaFields(data);
    if (aciklamaEksik.length > 0) {
      toast.error(`Aşağıdaki satırlarda açıklama girilmedi:\n${aciklamaEksik.join("\n")}`, { duration: 6000, style: { whiteSpace: "pre-line" } });
      return;
    }

    const targetIssues = validateTargetDowntime(data);
    if (targetIssues.length > 0) {
      toast.error(`Hedef/gerçekleşen farkı için duruş süresi eksik:\n${formatTargetDowntimeIssues(targetIssues)}`, { duration: 9000, style: { whiteSpace: "pre-line" } });
      return;
    }

    if (hasExistingRecord) { pendingDataRef.current = data; setConfirmOpen(true); return; }
    await doSave(data);
  }, [hasExistingRecord, doSave]);

  const handleConfirmUpdate = useCallback(async () => {
    setConfirmOpen(false);
    if (pendingDataRef.current) { await doSave(pendingDataRef.current); pendingDataRef.current = null; }
  }, [doSave]);

  const handleOpenAciklamaDialog = useCallback((rowIndex: number, k: typeof DURUS_KOLONLARI[number], val: string) => {
    if (k.key === "ariza") {
      const isEtmCell = bolum === "ETM Hücresi";
      const isRobCell = ["ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(bolum || "");
      const isNCell = ["N602 Hücresi", "N603 Hücresi"].includes(bolum || "");
      const shouldOpen = isEtmCell ? ["Mekanik", "Elektrik", "Akışkan", "SBU Arıza", "Calor Konveyör Arıza", "Robot"].includes(val)
        : isRobCell ? ["Mekanik", "Elektrik", "Akışkan", "Belirsiz", "Robot"].includes(val)
        : isNCell ? ["E", "A", "M", "O", "Kalite", "Belirsiz"].includes(val)
        : true;
      if (shouldOpen) {
        setAciklamaDialog({ rowIndex, alan: "ariza", baslik: "Arıza Açıklaması", aciklamaKey: "ariza_aciklama", aciklama: (watchedRows?.[rowIndex]?.ariza_aciklama as string) ?? "", selectedAltTur: val });
      } else { setValue(`rows.${rowIndex}.ariza_aciklama`, null); }
    } else if (k.key === "planli_durus") {
      if (val === "Planlı Bakım") {
        setAciklamaDialog({ rowIndex, alan: "planli_durus", baslik: "Planlı Duruş Açıklaması", aciklamaKey: "planli_durus_aciklama", aciklama: (watchedRows?.[rowIndex]?.planli_durus_aciklama as string) ?? "" });
      } else { setValue(`rows.${rowIndex}.planli_durus_aciklama`, null); }
    } else if (k.key === "setup_ve_ayar") {
      const isPressCell = bolum === "Pres Hücresi";
      const isEtmCell = bolum === "ETM Hücresi";
      const shouldOpen = isEtmCell ? false : isPressCell ? (val === "Kaçak Kontrolü") : true;
      if (shouldOpen) {
        setAciklamaDialog({ rowIndex, alan: "setup", baslik: (isPressCell || isEtmCell) ? "Hazırlık Açıklaması" : "Setup ve Ayar Açıklaması", aciklamaKey: "setup_aciklama", aciklama: (watchedRows?.[rowIndex]?.setup_aciklama as string) ?? "" });
      } else { setValue(`rows.${rowIndex}.setup_aciklama`, null); }
    } else if (k.key === "musteri_kaynakli_durus") {
      setAciklamaDialog({ rowIndex, alan: "musteri", baslik: "Müşteri Kaynaklı Duruş Açıklaması", aciklamaKey: "musteri_durus_aciklama", aciklama: (watchedRows?.[rowIndex]?.musteri_durus_aciklama as string) ?? "" });
    }
  }, [watchedRows]);

  const handleOpenCalisanMakineDialog = useCallback((rowIndex: number, val: number | null) => {
    const defaultLimit = MAKINE_SAYISI_DEFAULTS[bolum];
    const isRob108 = bolum === "ROB108 Hücresi";
    if (isRob108 && val != null) {
      const ROB108_TARGETS: Record<number, number> = { 5: 18, 4: 13, 3: 10, 2: 6, 1: 3, 0: 0 };
      setValue(`rows.${rowIndex}.hedef_uretim_adeti`, ROB108_TARGETS[val] !== undefined ? ROB108_TARGETS[val] : 18);
    }
    const isExplanationRequired = isRob108 ? val != null && val !== 5 : defaultLimit !== undefined && val != null && val < defaultLimit;
    if (isExplanationRequired) {
      setAciklamaDialog({ rowIndex, alan: "calisan_makine", baslik: `Çalışan Makinesi Sayısı Açıklaması (${val} Makine / Normal: ${isRob108 ? 5 : defaultLimit})`, aciklamaKey: "calisan_makine_aciklama", aciklama: (watchedRows?.[rowIndex]?.calisan_makine_aciklama as string) ?? "" });
    } else { setValue(`rows.${rowIndex}.calisan_makine_aciklama`, null); }
  }, [watchedRows, setValue, bolum]);

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8 text-zinc-950">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <header className="text-center pb-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Günlük Üretim Takip Formu</h1>
        </header>

        <FormHeader control={control} register={register} setValue={setValue} autoLoading={autoLoading} hasExistingRecord={hasExistingRecord} bolum={bolum} tarih={tarih} onManualLoad={handleManualLoad} onOpenOneriDialog={() => setOneriDialogOpen(true)} />

        {bolum === "FF Preform Ölçüm" ? (
          <FFPreformTable tarih={tarih} sorumlu={watch("sorumlu")} />
        ) : bolum === "Final Ölçüm" ? (
          <FinalOlcumTable tarih={tarih} sorumlu={watch("sorumlu")} />
        ) : (
          <ProductionTable register={register} control={control} tableRows={tableRows} watchedRows={watchedRows} saving={saving} onOpenAciklamaDialog={handleOpenAciklamaDialog} onOpenCalisanMakineDialog={handleOpenCalisanMakineDialog} onSubmit={handleSubmit(onSubmit)} bolum={bolum} tarih={tarih} />
        )}
      </div>

      <DowntimeExplanationDialog dialogData={aciklamaDialog} onClose={() => setAciklamaDialog(null)}
        onConfirm={(finalText) => { if (aciklamaDialog !== null) { setValue(`rows.${aciklamaDialog.rowIndex}.${aciklamaDialog.aciklamaKey}`, finalText || null); } setAciklamaDialog(null); }}
        zamanDilimiLabel={aciklamaDialog !== null ? tableRows[aciklamaDialog.rowIndex]?.zaman_dilimi ?? "" : ""} />

      <OverwriteConfirmDialog isOpen={confirmOpen} onOpenChange={setConfirmOpen} bolum={getValues("bolum")} tarih={getValues("tarih")} onConfirm={handleConfirmUpdate} />
      <OneriKayitDialog isOpen={oneriDialogOpen} onClose={() => setOneriDialogOpen(false)} />
    </div>
  );
}
