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
  onSubmit: (e: any) => void;
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
  onSubmit,
}: Props) {
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
                  <th className="py-3 pl-3 pr-1.5 font-semibold text-left whitespace-nowrap">
                    Zaman Dilimi
                  </th>
                  <th className="px-1.5 py-3 text-center font-semibold whitespace-nowrap">
                    Gerçekleşen<br />Üretim Adeti
                  </th>
                  <th className="px-1.5 py-3 text-center font-semibold whitespace-nowrap">
                    Müşteri<br />Var
                  </th>
                  {DURUS_KOLONLARI.map((k) => (
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
                    <td className="py-2.5 pl-3 pr-1.5 font-semibold text-blue-700 whitespace-nowrap">
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
                          const requiredDowntime = r ? getRequiredDowntimeMinutes(r) : 0;
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
                    {DURUS_KOLONLARI.map((k) => {
                      const val = watchedRows?.[i]?.[k.key] as number | null;
                      const hasValue = val != null && val > 0;
                      const r = watchedRows?.[i];
                      const requiredDowntime = r ? getRequiredDowntimeMinutes(r) : 0;
                      const enteredDowntime = r ? getEnteredDowntimeMinutes(r) : 0;
                      const needsDowntime = requiredDowntime > enteredDowntime;

                      return (
                        <td
                          key={k.key}
                          className={`px-1.5 py-2 transition-colors ${needsDowntime ? "bg-rose-50/20" : ""}`}
                        >
                          <div className="flex flex-row items-center gap-1 justify-center">
                            <Input
                              type="number"
                              min={0}
                              max={60}
                              className="h-8 text-center w-16 text-xs font-semibold"
                              placeholder=""
                              {...register(
                                `rows.${i}.${k.key}` as `rows.${number}.${typeof k.key}`,
                                { setValueAs: toNum }
                              )}
                            />
                            {k.altTurKey && k.altTurler && hasValue && (
                              <Controller
                                control={control}
                                name={`rows.${i}.${k.altTurKey}` as `rows.${number}.${typeof k.altTurKey}`}
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
                                      {k.altTurler!.map((t) => (
                                        <SelectItem key={t.code} value={t.code} className="text-xs font-semibold">
                                          {t.code}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            )}
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
