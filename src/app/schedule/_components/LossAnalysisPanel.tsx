"use client";

import { AlertTriangle, Hammer, ShieldAlert, Sparkles, TrendingDown, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DayPlan } from "../types";
import { formatNumber } from "../utils";

type Props = {
  schedule: DayPlan[];
  cycleTime: number; // in minutes
  cellName: string;
};

export function LossAnalysisPanel({ schedule, cycleTime, cellName }: Props) {
  const isPress = cellName === "Pres Hücresi";
  
  // Calculate total metrics
  const totalTarget = schedule.reduce((sum, d) => sum + d.target, 0);
  const totalPressed = schedule.reduce((sum, d) => sum + d.pressed, 0);
  const totalGap = Math.max(totalTarget - totalPressed, 0);
  
  const totalBreakdownMinutes = schedule.reduce((sum, d) => sum + d.breakdownMinutes, 0);
  const totalMaintenanceMinutes = schedule.reduce((sum, d) => sum + d.maintenanceMinutes, 0);

  // Convert minutes to equivalent part losses
  const breakdownLossParts = Math.round(totalBreakdownMinutes / Math.max(cycleTime, 0.1));
  const maintenanceLossParts = Math.round(totalMaintenanceMinutes / Math.max(cycleTime, 0.1));
  const otherLossParts = Math.max(totalGap - breakdownLossParts - maintenanceLossParts, 0);

  const totalLossAccounted = breakdownLossParts + maintenanceLossParts + otherLossParts;
  const breakdownPercent = totalLossAccounted > 0 ? Math.round((breakdownLossParts / totalLossAccounted) * 100) : 0;
  const maintenancePercent = totalLossAccounted > 0 ? Math.round((maintenanceLossParts / totalLossAccounted) * 100) : 0;
  const otherPercent = totalLossAccounted > 0 ? Math.round((otherLossParts / totalLossAccounted) * 100) : 0;

  // Determine key recommendation
  let recommendationTitle = "Hedefler Başarıyla Karşılanıyor";
  let recommendationDesc = "Seçilen tarih aralığında üretim hedefleri teorik kapasite dahilinde yakalanıyor. Mevcut verimli çalışma temposunu, duruş yönetimini ve bakım planını korumaya özen gösterin.";
  let RecIcon = Sparkles;
  let recTone: "success" | "warning" | "danger" | "info" = "success";

  if (totalGap > 0) {
    if (breakdownLossParts > 0 && breakdownLossParts >= maintenanceLossParts && breakdownLossParts >= otherLossParts) {
      recommendationTitle = "Önleyici Bakım & Yedek Parça Kontrolü Önerilir";
      recommendationDesc = `${cellName} üzerinde arıza kaynaklı duruşlar (${formatNumber(totalBreakdownMinutes)} dk) en yüksek kayıp kalemi durumunda. Beklenmedik mekanik/elektriksel arızaları en aza indirmek amacıyla periyodik bakım aralıklarını sıklaştırmayı ve kritik yedek parçaların stokta hazır bulundurulmasını öneriyoruz.`;
      RecIcon = ShieldAlert;
      recTone = "danger";
    } else if (isPress && maintenanceLossParts > 0 && maintenanceLossParts >= breakdownLossParts && maintenanceLossParts >= otherLossParts) {
      recommendationTitle = "Kalıp Değişim Süresi (SMED) Optimizasyonu";
      recommendationDesc = "Kalıp değişimi için harcanan duruş süresi en büyük kayba sebep oluyor. Kalıp değişim sürelerini düşürmek adına hızlı kalıp değişimi (SMED) çalışmaları başlatmayı, kalıp arabaları ve hazırlık süreçlerini önceden koordine etmeyi tavsiye ederiz.";
      RecIcon = Wrench;
      recTone = "warning";
    } else {
      recommendationTitle = "Hücre Verimlilik ve Kaynak Optimizasyonu";
      recommendationDesc = "Planlanan hedeflere ulaşılamama sebebi doğrudan makine duruşlarından (arıza/kalıp) ziyade genel verimsizlik veya organizasyonel eksiklikler (operatör devamsızlığı, malzeme beklemeleri vb.) gibi görünüyor. Vardiya içi kayıp analizleri yapabilir veya kapasiteyi artırmak için fazla mesai (Overtime) seçeneğini değerlendirebilirsiniz.";
      RecIcon = AlertTriangle;
      recTone = "info";
    }
  }

  // Recommendation theme classes
  const toneClasses = {
    success: "bg-emerald-50/50 border-emerald-100 text-emerald-800",
    warning: "bg-amber-50/50 border-amber-100 text-amber-800",
    danger: "bg-rose-50/50 border-rose-100 text-rose-800",
    info: "bg-blue-50/50 border-blue-100 text-blue-800",
  };

  const iconClasses = {
    success: "text-emerald-600 bg-emerald-100",
    warning: "text-amber-600 bg-amber-100",
    danger: "text-rose-600 bg-rose-100",
    info: "text-blue-600 bg-blue-100",
  };

  return (
    <Card className="rounded-xl border border-zinc-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="border-b border-zinc-100 pb-3">
        <CardTitle className="text-sm font-bold text-zinc-800 flex items-center gap-2 uppercase tracking-wider">
          <TrendingDown className="h-4 w-4 text-zinc-500" />
          "Neden Kaybettik?" Dönem Analizi
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 flex flex-col gap-6">
        {totalGap === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-100 bg-emerald-50/20">
            <Sparkles className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-800 font-medium">
              Bu dönemde herhangi bir üretim açığı bulunmamaktadır. Tüm hedefler yakalanmış veya aşılmıştır!
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Visual Breakdown Bars */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Kayıp Kırılımları</h3>
              <div className="space-y-3">
                {/* Breakdown Loss */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-700 flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                      Arıza Kaynaklı Duruşlar
                    </span>
                    <span className="text-zinc-900">
                      -{formatNumber(breakdownLossParts)} adet ({totalBreakdownMinutes} dk)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${breakdownPercent}%` }} />
                  </div>
                </div>

                {/* Maintenance Loss */}
                {isPress && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-700 flex items-center gap-1">
                        <Hammer className="h-3.5 w-3.5 text-amber-600" />
                        Kalıp Değişimi
                      </span>
                      <span className="text-zinc-900">
                        -{formatNumber(maintenanceLossParts)} adet ({totalMaintenanceMinutes} dk)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${maintenancePercent}%` }} />
                    </div>
                  </div>
                )}

                {/* Other Loss */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-700 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-zinc-500" />
                      Diğer Kayıplar (Verimsizlik vb.)
                    </span>
                    <span className="text-zinc-900">
                      -{formatNumber(otherLossParts)} adet
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-500 rounded-full" style={{ width: `${otherPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Recommendation Box */}
            <div className={`p-4 rounded-lg border flex flex-col justify-between gap-3 ${toneClasses[recTone]}`}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg shrink-0 ${iconClasses[recTone]}`}>
                    <RecIcon className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">{recommendationTitle}</h4>
                </div>
                <p className="text-xs leading-relaxed font-medium opacity-90">{recommendationDesc}</p>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                Öneriler geçmiş duruş ve arıza verilerine göre üretilmiştir.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
