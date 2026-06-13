"use client";

import { Control, Controller, UseFormRegister } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ProductionFormData,
  ProductionRow,
  DURUS_KOLONLARI,
  MAKINE_SAYISI_DEFAULTS,
  ETM_ARIZA_TURLER,
  ROB_ARIZA_TURLER,
} from "@/lib/types";
import {
  getEnteredDowntimeMinutes,
  getRequiredDowntimeMinutes,
} from "@/lib/productionValidation";

type Props = {
  register: UseFormRegister<ProductionFormData>;
  control: Control<ProductionFormData>;
  tableRows: ProductionRow[];
  watchedRows: ProductionRow[] | undefined;
  saving: boolean;
  onOpenAciklamaDialog: (rowIndex: number, k: typeof DURUS_KOLONLARI[number], val: string) => void;
  onOpenCalisanMakineDialog?: (rowIndex: number, val: number | null) => void;
  onSubmit: (e: any) => void;
  bolum: string;
  tarih?: string;
};

function toNum(val: string): number | null {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

export function ProductionTable({
  register,
  control,
  tableRows,
  watchedRows,
  saving,
  onOpenAciklamaDialog,
  onOpenCalisanMakineDialog,
  onSubmit,
  bolum,
  tarih,
}: Props) {
  const visibleColumns = DURUS_KOLONLARI.filter((column) => {
    if (bolum === "Pres Hücresi") {
      return column.key !== "takim_degisimi";
    } else if (bolum === "Quench Hücresi") {
      return column.key !== "kalip_demontaj" && column.key !== "kalip_montaj" && column.key !== "setup_ve_ayar";
    } else {
      return column.key !== "kalip_demontaj" && column.key !== "kalip_montaj";
    }
  }).map((column) => {
    if ((bolum === "Pres Hücresi" || bolum === "ETM Hücresi") && column.key === "setup_ve_ayar") {
      return { ...column, label: "Hazırlık" };
    }
    if (bolum === "ETM Hücresi" && column.key === "takim_degisimi") {
      return {
        ...column,
        label: "Holder - Insert Değişim",
        altTurKey: "takim_degisim_turu" as keyof ProductionRow,
        altTurler: [
          { code: "Holder Değişim" },
          { code: "Holder Ayar" },
          { code: "Insert Değişim" },
          { code: "Punta Değişim" },
        ],
      };
    }
    if (bolum === "Quench Hücresi" && column.key === "takim_degisimi") {
      return { ...column, label: "Rejim Bekleme" };
    }
    return column;
  });

  return (
    <Card className="border-zinc-200 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
        <CardTitle className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
          Üretim Verisi — Duruş Süreleri (dk)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={onSubmit}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-blue-750 text-zinc-800 border-b border-zinc-200 text-left text-[10px] font-bold uppercase tracking-wider bg-zinc-50/70">
                  <th className="py-3 pl-3 pr-1.5 font-semibold text-left whitespace-nowrap sticky left-0 z-10 bg-zinc-50 border-r border-zinc-200">
                    Zaman Dilimi
                  </th>
                  <th className="px-1.5 py-3 text-center font-semibold whitespace-nowrap">
                    Gerçekleşen<br />Üretim Adeti
                  </th>
                  <th className="px-1.5 py-3 text-center font-semibold whitespace-nowrap">
                    Müşteri<br />Var
                  </th>
                  {MAKINE_SAYISI_DEFAULTS[bolum] !== undefined && (
                    <th className="px-1.5 py-3 text-center font-semibold whitespace-nowrap">
                      Çalışan<br />Makinesi Sayısı
                    </th>
                  )}
                  {visibleColumns.map((k) => (
                    <th
                      key={k.key}
                      className="px-1.5 py-3 text-center font-semibold max-w-[90px]"
                    >
                      {k.label}
                    </th>
                  ))}
                  <th className="py-3 pr-3 pl-1.5 text-center font-semibold whitespace-nowrap">
                    Hedef<br />Üretim Adeti
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr
                    key={row.zaman_dilimi}
                    className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-zinc-50/20"
                    }`}
                  >
                    <td className={`py-2.5 pl-3 pr-1.5 font-semibold text-blue-700 whitespace-nowrap sticky left-0 z-10 border-r border-zinc-200 ${
                      i % 2 === 0 ? "bg-white" : "bg-zinc-50"
                    }`}>
                      {row.zaman_dilimi}
                    </td>
                    <td className="px-1.5 py-2">
                      <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 text-center w-20 text-xs font-semibold"
                          placeholder=""
                          {...register(`rows.${i}.uretim_adeti`, {
                            setValueAs: toNum,
                          })}
                        />
                        {(() => {
                          const r = watchedRows?.[i];
                          const requiredDowntime = r ? getRequiredDowntimeMinutes(r, bolum, tarih) : 0;
                          const enteredDowntime = r ? getEnteredDowntimeMinutes(r) : 0;
                          const remainingDowntime = Math.max(requiredDowntime - enteredDowntime, 0);

                          return (
                            <span
                              className={`inline-flex h-8 min-w-20 items-center justify-center rounded border px-2 text-[10px] font-bold uppercase tracking-wider ${
                                remainingDowntime > 0
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                              }`}
                              title={`Gerekli: ${requiredDowntime} dk, girilen: ${enteredDowntime} dk`}
                            >
                              Kalan {remainingDowntime} dk
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-1.5 py-2 text-center">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-700 cursor-pointer"
                        aria-label={`${row.zaman_dilimi} müşteri var`}
                        {...register(`rows.${i}.musteri_var`)}
                      />
                    </td>
                    {(() => {
                      const defaultLimit = MAKINE_SAYISI_DEFAULTS[bolum];
                      if (defaultLimit === undefined) return null;

                      const val = watchedRows?.[i]?.calisan_makine_sayisi;
                      const hasDesc = !!watchedRows?.[i]?.calisan_makine_aciklama;
                      return (
                        <td className="px-1.5 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <Input
                              type="number"
                              min={0}
                              max={defaultLimit}
                              className="h-8 text-center w-14 text-xs font-semibold"
                              {...register(`rows.${i}.calisan_makine_sayisi`, {
                                setValueAs: toNum,
                                onChange: (e) => {
                                  const valNum = toNum(e.target.value);
                                  if (onOpenCalisanMakineDialog) {
                                    onOpenCalisanMakineDialog(i, valNum);
                                  }
                                }
                              })}
                            />
                            {val != null && val < defaultLimit && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenCalisanMakineDialog) {
                                    onOpenCalisanMakineDialog(i, val);
                                  }
                                }}
                                className={`flex items-center justify-center h-8 w-8 rounded border text-xs font-bold transition-colors ${
                                  hasDesc
                                    ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                                    : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 animate-pulse"
                                }`}
                                title={hasDesc ? "Açıklamayı Düzenle" : "Açıklama Ekle (Zorunlu!)"}
                              >
                                ✍️
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })()}
                    {visibleColumns.map((k) => {
                      const val = watchedRows?.[i]?.[k.key] as number | null;
                      const hasValue = val != null && val > 0;
                      const r = watchedRows?.[i];
                      const requiredDowntime = r ? getRequiredDowntimeMinutes(r, bolum, tarih) : 0;
                      const enteredDowntime = r ? getEnteredDowntimeMinutes(r) : 0;
                      const needsDowntime = requiredDowntime > enteredDowntime;
                      const maxVal = bolum === "Quench Hücresi" ? 540 : 60;

                      return (
                        <td
                          key={k.key}
                          className={`px-1.5 py-2 transition-colors ${needsDowntime ? "bg-rose-50/20" : ""}`}
                        >
                          <div className="flex flex-row items-center gap-1 justify-center">
                            <Input
                              type="number"
                              min={0}
                              max={maxVal}
                              className="h-8 text-center w-16 text-xs font-semibold"
                              placeholder=""
                              {...register(
                                `rows.${i}.${k.key}` as `rows.${number}.${typeof k.key}`,
                                { setValueAs: toNum }
                              )}
                            />
                            {k.altTurKey && k.altTurler && hasValue && (() => {
                              let options = k.altTurler;
                              if (bolum === "Pres Hücresi") {
                                if (k.key === "ariza") {
                                  options = [{ code: "Pres Öncesi" }, { code: "Pres" }, { code: "Pres Sonrası" }];
                                } else if (k.key === "setup_ve_ayar") {
                                  options = [
                                    { code: "Kalıp Isıtma" },
                                    { code: "Fırın Isıtma Bekleme" },
                                    { code: "IHU Rejim Bekleme" },
                                    { code: "Kalıp Soğuma Bekleme" },
                                    { code: "Offset Alma" },
                                    { code: "Kaçak Kontrolü" },
                                  ];
                                }
                              } else if (bolum === "ETM Hücresi") {
                                if (k.key === "ariza") {
                                  options = ETM_ARIZA_TURLER;
                                } else if (k.key === "setup_ve_ayar") {
                                  options = [
                                    { code: "Parça Ölçüm" },
                                    { code: "Otomatik Mod Hazırlık" },
                                  ];
                                } else if (k.key === "planli_durus") {
                                  options = [
                                    { code: "Planlı Bakım" },
                                    { code: "Parça Basmama Kararı" },
                                    { code: "Kasa Alma - Bırakma" },
                                  ];
                                }
                              } else if (["ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(bolum || "")) {
                                if (k.key === "ariza") {
                                  options = ROB_ARIZA_TURLER;
                                }
                              }

                              const hasKasaAlmaOption = [
                                "ETM Hücresi",
                                "ROB104 Hücresi",
                                "ROB105 Hücresi",
                                "Flowform Hücresi",
                                "N602 Hücresi",
                                "N603 Hücresi",
                              ].includes(bolum || "");
                              if (k.key === "planli_durus" && hasKasaAlmaOption) {
                                options = [
                                  { code: "Planlı Bakım" },
                                  { code: "Parça Basmama Kararı" },
                                  { code: "Kasa Alma - Bırakma" },
                                ];
                              }
                              return (
                                <Controller
                                  control={control}
                                  name={`rows.${i}.${k.altTurKey}` as any}
                                  render={({ field }) => (
                                    <Select
                                      onValueChange={(valSelected) => {
                                        field.onChange(valSelected);
                                        onOpenAciklamaDialog(i, k, valSelected || "");
                                      }}
                                      value={(field.value as string) ?? ""}
                                    >
                                      <SelectTrigger className="h-7 text-xs w-16 px-1 font-semibold text-zinc-700">
                                        <SelectValue placeholder="" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {options.map((t) => (
                                          <SelectItem key={t.code} value={t.code} className="text-xs font-semibold">
                                            {t.code}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              );
                            })()}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-2 pr-3 pl-1.5">
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-center w-20 mx-auto text-xs font-semibold"
                        placeholder=""
                        {...register(`rows.${i}.hedef_uretim_adeti`, {
                          setValueAs: toNum,
                        })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 flex justify-end border-t border-zinc-150 bg-zinc-50/30">
            <Button type="submit" disabled={saving} className="px-8 text-xs font-bold uppercase tracking-wider">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
