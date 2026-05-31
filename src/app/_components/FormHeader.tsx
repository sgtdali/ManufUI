"use client";

import Link from "next/link";
import { Control, Controller, UseFormRegister, UseFormSetValue } from "react-hook-form";
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
import { BOLUMLER, BOLUM_SORUMLU, ProductionFormData } from "@/lib/types";

type Props = {
  control: Control<ProductionFormData>;
  register: UseFormRegister<ProductionFormData>;
  setValue: UseFormSetValue<ProductionFormData>;
  autoLoading: boolean;
  hasExistingRecord: boolean;
  bolum: string;
  tarih: string;
  onManualLoad: () => void;
};

export function FormHeader({
  control,
  register,
  setValue,
  autoLoading,
  hasExistingRecord,
  bolum,
  tarih,
  onManualLoad,
}: Props) {
  return (
    <Card className="border-zinc-200 shadow-sm rounded-xl">
      <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
        <CardTitle className="text-sm font-bold text-zinc-800 flex items-center gap-3 uppercase tracking-wider">
          Form Bilgileri
          {autoLoading && (
            <span className="text-xs font-semibold text-blue-600 animate-pulse">
              Kayıt kontrol ediliyor...
            </span>
          )}
          {!autoLoading && hasExistingRecord && bolum && tarih && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              ✓ Mevcut kayıt yüklendi
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="bolum" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Bölüm *
            </Label>
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
                  <SelectTrigger id="bolum" className="text-xs font-semibold text-zinc-700">
                    <SelectValue placeholder="Bölüm seçiniz..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BOLUMLER.map((b) => (
                      <SelectItem key={b} value={b} className="text-xs font-medium">
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sorumlu" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Sorumlu
            </Label>
            <Input
              id="sorumlu"
              placeholder="Ad Soyad"
              className="text-xs font-semibold text-zinc-700"
              {...register("sorumlu")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tarih" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Tarih *
            </Label>
            <Input
              id="tarih"
              type="date"
              className="text-xs font-semibold text-zinc-700"
              {...register("tarih")}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onManualLoad}
            disabled={autoLoading}
            className="text-xs font-bold border-zinc-200 hover:bg-zinc-50 text-zinc-700"
          >
            {autoLoading ? "Yükleniyor..." : "Yenile"}
          </Button>
          <Link href="/api/export" download className="block">
            <Button
              type="button"
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50 text-xs font-bold"
            >
              Excel&apos;e Aktar
            </Button>
          </Link>
          <Link href="/dashboard" className="block">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold"
            >
              Dashboard
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
