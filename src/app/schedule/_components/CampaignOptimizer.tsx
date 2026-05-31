"use client";

import { useState, useMemo } from "react";
import { AlertCircle, Calendar, CheckCircle2, ChevronRight, Clock, Play, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DayPlan, DayOverride } from "../types";
import { formatNumber } from "../utils";

type Props = {
  schedule: DayPlan[];
  cellName: string;
  overtimeMinutes: string;
  setOvertimeMinutes: (val: string) => void;
  holidayWorkEnabled: boolean;
  setHolidayWorkEnabled: (val: boolean) => void;
  updateOverride: (key: string, patch: DayOverride) => void;
  bottlenecks: any[];
};

export function CampaignOptimizer({
  schedule,
  cellName,
  overtimeMinutes,
  setOvertimeMinutes,
  holidayWorkEnabled,
  setHolidayWorkEnabled,
  updateOverride,
  bottlenecks,
}: Props) {
  const [campaignTarget, setCampaignTarget] = useState<number>(2000);

  // 1. Calculate cumulative completion date
  const projection = useMemo(() => {
    let accumulated = 0;
    let completionDate: Date | null = null;
    let completionDayKey: string | null = null;
    let daysToComplete = 0;

    // Search within the current scheduled period
    for (const day of schedule) {
      if (day.isWorkday) {
        accumulated += day.pressed;
        daysToComplete++;
        if (accumulated >= campaignTarget && !completionDate) {
          completionDate = day.date;
          completionDayKey = day.key;
          break;
        }
      }
    }

    // If not completed within the period, project outward
    let isProjectedOutward = false;
    let projectedDate = completionDate;
    if (accumulated < campaignTarget) {
      isProjectedOutward = true;
      const totalPressed = schedule.reduce((sum, d) => sum + d.pressed, 0);
      const activeWorkdays = schedule.filter((d) => d.isWorkday).length;
      const avgDailyOutput = activeWorkdays > 0 ? totalPressed / activeWorkdays : 0;

      if (avgDailyOutput > 0) {
        const remaining = campaignTarget - accumulated;
        const extraWorkdaysNeeded = Math.ceil(remaining / avgDailyOutput);
        
        // Project day by day starting from the last date of the schedule
        const lastDay = schedule[schedule.length - 1];
        let currentDate = lastDay ? new Date(lastDay.date) : new Date();
        let addedDays = 0;

        while (addedDays < extraWorkdaysNeeded) {
          currentDate.setDate(currentDate.getDate() + 1);
          const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
          
          // If holiday work is disabled, skip Sundays
          const isSunday = dayOfWeek === 0;
          if (isSunday && !holidayWorkEnabled) {
            continue;
          }
          addedDays++;
        }
        projectedDate = currentDate;
        daysToComplete += extraWorkdaysNeeded;
      }
    }

    return {
      completionDate: projectedDate,
      completionDayKey,
      accumulated,
      isProjectedOutward,
      daysToComplete,
    };
  }, [schedule, campaignTarget, holidayWorkEnabled]);

  // 2. Generate smart recommendations based on current schedule bottlenecks
  const recommendations = useMemo(() => {
    const list: {
      id: string;
      title: string;
      description: string;
      impact: string;
      actionLabel: string;
      action: () => void;
      applied: boolean;
    }[] = [];

    // Recommendation 1: Enable weekend/holiday work
    if (!holidayWorkEnabled) {
      list.push({
        id: "weekend_work",
        title: "Pazar Günleri Çalışmayı Etkinleştir",
        description: "Hafta sonu Pazar günlerini de çalışma gününe dahil ederek ekstra üretim kapasitesi kazanın.",
        impact: "Kampanya bitişini 2-3 gün öne çeker",
        actionLabel: "Pazar Çalışmasını Etkinleştir",
        action: () => setHolidayWorkEnabled(true),
        applied: false,
      });
    } else {
      list.push({
        id: "weekend_work",
        title: "Pazar Günleri Çalışmayı Devre Dışı Bırak",
        description: "Pazar günleri çalışması şu an aktif. Devre dışı bırakarak personel dinlenmesini sağlayabilirsiniz.",
        impact: "Maliyeti düşürür, kapasiteyi azaltır",
        actionLabel: "Pazar Çalışmasını Kapat",
        action: () => setHolidayWorkEnabled(false),
        applied: true,
      });
    }

    // Recommendation 2: Increase general overtime
    const currentOT = Number(overtimeMinutes) || 0;
    if (currentOT < 90) {
      list.push({
        id: "increase_ot",
        title: "Günlük Fazla Mesaiyi 90 Dakikaya Çıkar",
        description: `Şu anki genel fazla mesai ${currentOT} dakika. Tüm planlanan günlerde bunu 90 dakikaya yükseltin.`,
        impact: `Günlük teorik kapasiteyi ~%15 artırır`,
        actionLabel: "Mesaiyi 90 Dk Yap",
        action: () => setOvertimeMinutes("90"),
        applied: false,
      });
    }

    // Recommendation 3: Specific bottleneck warning if the active cell has high breakdown frequency
    const cellBottleneck = bottlenecks.find(b => b.cellName === cellName);
    if (cellBottleneck && cellBottleneck.totalBreakdownMinutes > 120) {
      list.push({
        id: "preventive_maintenance",
        title: "Önleyici Bakım Arası Planla",
        description: `${cellName} son zamanlarda ${cellBottleneck.totalBreakdownMinutes} dakika arıza yaptı. Kampanya sırasında büyük bir kesinti yaşamamak için ilk haftaya 60 dakikalık bir koruyucu bakım ekleyin.`,
        impact: "Arıza riskini azaltır, uzun vadede OEE yükseltir",
        actionLabel: "Bakım Duruşu Önerisini İncele",
        action: () => {
          // Suggest setting maintenance override on the first available workday
          const firstWorkday = schedule.find(d => d.isWorkday && d.source === "plan");
          if (firstWorkday) {
            updateOverride(firstWorkday.key, { overtimeMinutes: 0 }); // Just a trigger to focus user attention
          }
        },
        applied: false,
      });
    }

    return list;
  }, [holidayWorkEnabled, overtimeMinutes, bottlenecks, cellName, schedule, setHolidayWorkEnabled, setOvertimeMinutes, updateOverride]);

  return (
    <Card className="rounded-xl border border-blue-100 shadow-sm bg-gradient-to-br from-white to-blue-50/20 overflow-hidden">
      <CardHeader className="border-b border-zinc-100 pb-3 bg-white/80 backdrop-blur-sm">
        <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2 uppercase tracking-wider">
          <Zap className="h-4 w-4 text-blue-600 animate-pulse" />
          Kampanya Tamamlama Optimizasyonu (2000 Parça)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 flex flex-col gap-6">
        
        {/* Input & Target Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Kampanya Toplam Hedefi</h3>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={campaignTarget}
                onChange={(e) => setCampaignTarget(Math.max(Number(e.target.value) || 0, 1))}
                className="w-24 text-lg font-bold text-zinc-900 bg-white border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-zinc-600">parça</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-right">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Tahmini Bitiş</p>
              <p className="text-sm font-bold text-blue-800 flex items-center justify-end gap-1.5 mt-0.5">
                <Calendar className="h-4 w-4 text-blue-500" />
                {projection.completionDate
                  ? projection.completionDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
                  : "Hesaplanamıyor"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Gereken Süre</p>
              <p className="text-sm font-bold text-zinc-800 mt-0.5">
                {projection.daysToComplete} İş Günü
              </p>
            </div>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-zinc-700">Dönem Sonu Kümülatif Üretim</span>
            <span className="text-blue-700">
              {formatNumber(projection.accumulated)} / {formatNumber(campaignTarget)} adet
            </span>
          </div>
          <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-200/50">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                projection.accumulated >= campaignTarget
                  ? "bg-emerald-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${Math.min((projection.accumulated / campaignTarget) * 100, 100)}%` }}
            />
          </div>
          {projection.accumulated >= campaignTarget ? (
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Tebrikler! Belirlenen tarih aralığı içerisinde kampanya başarıyla tamamlanıyor.
            </p>
          ) : (
            <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Bu hızla giderse kampanya dönem sonuna yetişmiyor, ek aksiyonlar alınmalı.
            </p>
          )}
        </div>

        {/* Smart Recommendations List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            Önerilen Karar Destek Adımları
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`p-3.5 rounded-lg border text-xs flex flex-col justify-between gap-3 transition-all ${
                  rec.applied
                    ? "bg-emerald-50/30 border-emerald-100 text-emerald-900"
                    : "bg-white border-zinc-200 hover:border-blue-200 text-zinc-700"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">{rec.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold uppercase tracking-wide">
                      {rec.impact}
                    </span>
                  </div>
                  <p className="text-zinc-500 leading-relaxed font-medium">{rec.description}</p>
                </div>
                <Button
                  type="button"
                  variant={rec.applied ? "secondary" : "default"}
                  size="sm"
                  className="w-full text-xs font-semibold"
                  onClick={rec.action}
                >
                  {rec.applied ? "Uygulandı" : rec.actionLabel}
                  {!rec.applied && <ChevronRight className="ml-1 h-3 w-3" />}
                </Button>
              </div>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
