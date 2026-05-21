"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "../utils";

type Props = {
  periodGap: number;
  periodTarget: number;
  neededPerRecoveryDay: number;
  extraMinutesPerRecoveryDay: number;
  requiredHolidayDays: number;
  holidayCapacity: number;
};

export function RecoveryCard({
  periodGap,
  periodTarget: _periodTarget,
  neededPerRecoveryDay,
  extraMinutesPerRecoveryDay,
  requiredHolidayDays,
  holidayCapacity,
}: Props) {
  return (
    <Card className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-blue-100/50 bg-white/40 pb-3">
        <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2 uppercase tracking-wider">
          <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
          Kurtarma Senaryosu Analizi
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid gap-6 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-blue-100/60">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-800/80">Dönem Açığı</p>
            <p className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              {formatNumber(periodGap)} <span className="text-sm font-medium text-zinc-500">adet</span>
            </p>
            <p className="text-[11px] text-zinc-500 leading-normal">Gün bazlı gerçekleşen adet girildikçe güncellenir.</p>
          </div>
          <div className="space-y-1 pt-4 md:pt-0 md:pl-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-800/80">Kalan Günlere Yayılım</p>
            <p className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              +{formatNumber(neededPerRecoveryDay)} <span className="text-sm font-medium text-zinc-500">adet/gün</span>
            </p>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Yaklaşık <strong className="text-blue-950">+{formatNumber(extraMinutesPerRecoveryDay)} dk/gün</strong> ek pres süresi gerektirir.
            </p>
          </div>
          <div className="space-y-1 pt-4 md:pt-0 md:pl-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-800/80">Tatil Çalışması İle Kapatma</p>
            <p className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              {periodGap > 0 ? `${requiredHolidayDays} gün` : "Gerek yok"}
            </p>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Bir tatil günü yaklaşık <strong className="text-blue-950">{formatNumber(holidayCapacity)}</strong> adet pres kapasitesi sağlar.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
