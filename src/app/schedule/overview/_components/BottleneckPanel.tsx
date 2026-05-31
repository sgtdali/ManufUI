"use client";

import { ShieldAlert, Activity, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CellBottleneckStats } from "../../actions";
import { formatNumber } from "../../utils";

type Props = {
  stats: CellBottleneckStats[];
};

export function BottleneckPanel({ stats }: Props) {
  if (stats.length === 0) return null;

  // The list is already sorted by totalBreakdownMinutes desc in loadBottleneckData
  const mainBottleneck = stats[0];
  const otherBottlenecks = stats.slice(1, 4).filter(s => s.totalBreakdownMinutes > 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Ana Darboğaz Kartı */}
      <Card className="md:col-span-2 rounded-xl border border-rose-100 bg-rose-50/20 shadow-sm overflow-hidden flex flex-col justify-between">
        <CardContent className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-rose-100/50">
            <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
              <ShieldAlert className="size-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-rose-800 uppercase tracking-wider">Kritik Hat Darboğazı</h2>
              <p className="text-lg font-bold text-zinc-900 leading-tight mt-0.5">{mainBottleneck.bolum}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 my-1">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Toplam Arıza Süresi</p>
              <p className="text-2xl font-extrabold text-rose-600 tracking-tight">
                {formatNumber(mainBottleneck.totalBreakdownMinutes)} <span className="text-xs font-medium text-zinc-500">dk</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Arıza Sıklığı</p>
              <p className="text-2xl font-extrabold text-rose-600 tracking-tight">
                {mainBottleneck.breakdownCount} <span className="text-xs font-medium text-zinc-500">adet duruş</span>
              </p>
            </div>
          </div>

          <p className="text-xs text-zinc-600 font-medium leading-relaxed bg-white/50 p-2.5 rounded border border-rose-100/40">
            🚨 <strong>Etki Analizi:</strong> Bu hücrede yaşanan sık arızalar ve toplam duruş süresi, hattın genel akış hızını düşürerek diğer istasyonlarda parça bekleme veya stok birikmesi darboğazına sebep olmaktadır.
          </p>
        </CardContent>
      </Card>

      {/* Diğer Kritik Duruş Yapan Hücreler */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-5 flex flex-col gap-3 h-full justify-between">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Activity className="size-4.5 text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Diğer Kritik Duruşlar</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center divide-y divide-zinc-100">
            {otherBottlenecks.length > 0 ? (
              otherBottlenecks.map((s) => (
                <div key={s.bolum} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 truncate max-w-[150px]">{s.bolum}</span>
                  <div className="flex items-center gap-2 font-bold text-zinc-900 shrink-0">
                    <Timer className="size-3.5 text-zinc-400" />
                    <span>{formatNumber(s.totalBreakdownMinutes)} dk</span>
                    <span className="text-[10px] font-normal text-zinc-400">({s.breakdownCount} kez)</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-zinc-400 font-medium">Başka duruş yapan hücre bulunmuyor.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
