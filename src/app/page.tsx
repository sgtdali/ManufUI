"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { saveProductionRecord, loadProductionRecord } from "./actions";
import {
  ProductionFormData,
  ZAMAN_DILIMLERI,
  DURUS_KOLONLARI,
  BOLUMLER,
  BOLUM_SORUMLU,
} from "@/lib/types";

function toNum(val: string): number | null {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function buildEmptyRows(): ProductionFormData["rows"] {
  return ZAMAN_DILIMLERI.map((z) => ({
    sira_no: z.sira_no,
    zaman_dilimi: z.label,
    uretim_adeti: null,
    mola: null,
    ariza: null,
    planli_durus: null,
    setup_ve_ayar: null,
    takim_degisimi: null,
    onceki_istasyon_bekleme: null,
    musteri_kaynakli_durus: null,
    kalite_kaynakli_durus: null,
  }));
}

function applyRecordToForm(
  record: Record<string, unknown>,
  bolum: string,
  tarih: string
): ProductionFormData {
  const rows = (record.manuf_production_rows as Record<string, unknown>[] ?? []);
  const loadedRows = buildEmptyRows().map((emptyRow) => {
    const found = rows.find(
      (r) => r.zaman_dilimi === emptyRow.zaman_dilimi
    ) as Record<string, number | null> | undefined;
    return found
      ? {
          sira_no: emptyRow.sira_no,
          zaman_dilimi: emptyRow.zaman_dilimi,
          uretim_adeti: found.uretim_adeti,
          mola: found.mola,
          ariza: found.ariza,
          planli_durus: found.planli_durus,
          setup_ve_ayar: found.setup_ve_ayar,
          takim_degisimi: found.takim_degisimi,
          onceki_istasyon_bekleme: found.onceki_istasyon_bekleme,
          musteri_kaynakli_durus: found.musteri_kaynakli_durus,
          kalite_kaynakli_durus: found.kalite_kaynakli_durus,
        }
      : emptyRow;
  });
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
        rows: buildEmptyRows(),
      },
    });

  const [saving, setSaving] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingDataRef = useRef<ProductionFormData | null>(null);

  const bolum = watch("bolum");
  const tarih = watch("tarih");

  // Otomatik yükleme: bölüm veya tarih değişince arka planda çek
  useEffect(() => {
    if (!bolum || !tarih) {
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
        reset({ bolum, sorumlu: BOLUM_SORUMLU[bolum] ?? "", tarih, rows: buildEmptyRows() });
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
      reset({ bolum, sorumlu: BOLUM_SORUMLU[bolum] ?? "", tarih, rows: buildEmptyRows() });
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Günlük Üretim Takip Formu
          </h1>
        </div>

        {/* Form başlığı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-3">
              Form Bilgileri
              {autoLoading && (
                <span className="text-xs font-normal text-blue-600 animate-pulse">
                  Kayıt kontrol ediliyor...
                </span>
              )}
              {!autoLoading && hasExistingRecord && bolum && tarih && (
                <span className="text-xs font-normal text-green-600">
                  ✓ Mevcut kayıt yüklendi
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="bolum">Bölüm *</Label>
                <Controller
                  control={control}
                  name="bolum"
                  render={({ field }) => (
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setValue("sorumlu", BOLUM_SORUMLU[val as string] ?? "");
                      }}
                      value={field.value}
                    >
                      <SelectTrigger id="bolum">
                        <SelectValue placeholder="Bölüm seçiniz..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BOLUMLER.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sorumlu">Sorumlu</Label>
                <Input
                  id="sorumlu"
                  placeholder="Ad Soyad"
                  {...register("sorumlu")}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tarih">Tarih *</Label>
                <Input id="tarih" type="date" {...register("tarih")} />
              </div>
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleManualLoad}
                disabled={autoLoading}
              >
                {autoLoading ? "Yükleniyor..." : "Yenile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Üretim tablosu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Üretim Verisi — Duruş Süreleri (dk)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-700 text-white">
                      <th className="border border-blue-800 px-3 py-2 text-left whitespace-nowrap">
                        Zaman Dilimi
                      </th>
                      <th className="border border-blue-800 px-3 py-2 text-center whitespace-nowrap">
                        Gerçekleşen<br />Üretim Adeti
                      </th>
                      {DURUS_KOLONLARI.map((k) => (
                        <th
                          key={k.key}
                          className="border border-blue-800 px-2 py-2 text-center text-xs leading-tight max-w-[90px]"
                        >
                          {k.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ZAMAN_DILIMLERI.map((z, i) => (
                      <tr
                        key={z.label}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="border border-gray-300 px-3 py-1 font-medium whitespace-nowrap text-blue-800">
                          {z.label}
                        </td>
                        <td className="border border-gray-300 px-1 py-1">
                          <Input
                            type="number"
                            min={0}
                            className="h-8 text-center w-20 mx-auto"
                            placeholder="—"
                            {...register(`rows.${i}.uretim_adeti`, {
                              setValueAs: toNum,
                            })}
                          />
                        </td>
                        {DURUS_KOLONLARI.map((k) => (
                          <td
                            key={k.key}
                            className="border border-gray-300 px-1 py-1"
                          >
                            <Input
                              type="number"
                              min={0}
                              max={60}
                              className="h-8 text-center w-16 mx-auto"
                              placeholder="—"
                              {...register(
                                `rows.${i}.${k.key}` as `rows.${number}.${typeof k.key}`,
                                { setValueAs: toNum }
                              )}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 flex justify-end">
                <Button type="submit" disabled={saving} className="px-8">
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Güncelleme onay diyalogu */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mevcut kayıt güncellenecek</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{getValues("bolum")}</strong> bölümü için{" "}
              <strong>{getValues("tarih")}</strong> tarihli kayıt zaten mevcut.
              Değişiklikleriniz mevcut verinin üzerine yazılacak. Devam etmek
              istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdate}>
              Güncelle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
