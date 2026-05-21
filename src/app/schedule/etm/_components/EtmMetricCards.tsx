"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "../../utils";
import type { EtmDayPlan } from "../types";
import { Hammer, Flame, Calculator, AlertTriangle, CheckCircle2, Layers } from "lucide-react";

type Props = {
  plans: EtmDayPlan[];
  wipIncomingValue: number | null;
};

export function EtmMetricCards({ plans, wipIncomingValue }: Props) {
  // 1. Produced metric
  const totalProduced = plans.reduce((acc, p) => acc + p.produced, 0);
  const totalTarget = plans.reduce((acc, p) => acc + p.target, 0);

  // 2. Deficit / Remaining to target
  const gap = totalTarget - totalProduced;

  // 3. Stop times
  const totalCuttingStops = plans.reduce((acc, p) => acc + p.cuttingInsertStopsMinutes, 0);
  const totalDrillStops = plans.reduce((acc, p) => acc + p.drillBitStopsMinutes, 0);
  const totalToolStopMin = totalCuttingStops + totalDrillStops;
  const stopHours = Math.floor(totalToolStopMin / 60);
  const stopMins = totalToolStopMin % 60;
  
  let primaryStopReason = "Duruş yok";
  if (totalToolStopMin > 0) {
    if (totalCuttingStops > totalDrillStops) {
      primaryStopReason = "En büyük sebep: Kesici uç değişimi";
    } else if (totalDrillStops > totalCuttingStops) {
      primaryStopReason = "En büyük sebep: Punta matkabı değişimi";
    } else {
      primaryStopReason = "Kesici uç & Punta değişimi dengeli";
    }
  }

  // 4. Nearest Critical Warning
  const todayStr = new Date().toISOString().split("T")[0];
  let nearestCritical: { daysLeft: number; message: string; dateLabel: string } | null = null;

  for (const plan of plans) {
    const crit = plan.warnings.find((w) => w.severity === "critical");
    if (crit) {
      const planDate = new Date(plan.key + "T00:00:00");
      const todayDate = new Date(todayStr + "T00:00:00");
      const diffTime = planDate.getTime() - todayDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let dateLabel = "";
      if (diffDays === 0) dateLabel = "Bugün";
      else if (diffDays === 1) dateLabel = "Yarın";
      else if (diffDays < 0) dateLabel = `${Math.abs(diffDays)} gün önce`;
      else dateLabel = `${diffDays} gün sonra`;

      nearestCritical = {
        daysLeft: diffDays,
        message: crit.message,
        dateLabel,
      };
      break;
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Produced */}
      <Card className="border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gerçekleşen Üretim</p>
            <p className="text-2xl font-extrabold text-zinc-900">{formatNumber(totalProduced)} <span className="text-xs text-zinc-500 font-semibold">adet</span></p>
            <p className="text-[11px] text-zinc-500 font-medium">Hedef: {formatNumber(totalTarget)} adet</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2.5 text-zinc-600 border border-zinc-100">
            <Hammer className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Deficit / Remaining */}
      <Card className="border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Hedefe Kalan</p>
            {gap > 0 ? (
              <>
                <p className="text-2xl font-extrabold text-amber-600">{formatNumber(gap)} <span className="text-xs font-semibold">adet</span></p>
                <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                  <AlertTriangle className="size-3" /> Hedefe henüz ulaşılamadı
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-emerald-600">+{formatNumber(Math.abs(gap))} <span className="text-xs font-semibold">adet</span></p>
                <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Kampanya hedefi aşıldı!
                </p>
              </>
            )}
          </div>
          <div className={`rounded-lg p-2.5 border ${
            gap > 0 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
          }`}>
            <Calculator className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Stops Duration */}
      <Card className="border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Takım Duruşları</p>
            <p className="text-2xl font-extrabold text-zinc-900">
              {stopHours > 0 ? `${stopHours}s ` : ""}{stopMins}d
            </p>
            <p className="text-[11px] text-zinc-500 font-medium truncate max-w-[200px]" title={primaryStopReason}>
              {primaryStopReason}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2.5 text-zinc-600 border border-zinc-100">
            <Flame className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Nearest Warnings */}
      <Card className={`border shadow-sm hover:shadow-md transition-shadow ${
        nearestCritical ? "border-rose-200 bg-rose-50/10" : "border-zinc-200 bg-white"
      }`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Yaklaşan Kritik Uyarı</p>
            {nearestCritical ? (
              <>
                <p className="text-2xl font-extrabold text-rose-600">{nearestCritical.dateLabel}</p>
                <p className="text-[11px] text-rose-700 font-semibold truncate max-w-[200px]" title={nearestCritical.message}>
                  {nearestCritical.message}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-emerald-600">Yok</p>
                <p className="text-[11px] text-zinc-500 font-medium">Tüm sistemler normal limitlerde</p>
              </>
            )}
          </div>
          <div className={`rounded-lg p-2.5 border ${
            nearestCritical ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-zinc-50 text-zinc-600 border-zinc-100"
          }`}>
            <AlertTriangle className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* 5. Pres'ten Gelen Stok */}
      <Card className={`border shadow-sm hover:shadow-md transition-shadow ${
        wipIncomingValue !== null && wipIncomingValue < 50 ? "border-rose-200 bg-rose-50/10" : "border-zinc-200 bg-white"
      }`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pres'ten Gelen Stok</p>
            <p className={`text-2xl font-extrabold ${
              wipIncomingValue !== null && wipIncomingValue < 50 ? "text-rose-600" : "text-zinc-900"
            }`}>
              {wipIncomingValue !== null ? `${formatNumber(wipIncomingValue)}` : "—"}
              {wipIncomingValue !== null && <span className={`text-xs font-semibold ml-1 ${
                wipIncomingValue < 50 ? "text-rose-500" : "text-zinc-500"
              }`}>adet</span>}
            </p>
            {wipIncomingValue !== null && wipIncomingValue < 50 ? (
              <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                <AlertTriangle className="size-3" /> Düşük stok uyarısı
              </p>
            ) : (
              <p className="text-[11px] text-zinc-500 font-medium">Kümülatif gelen stok</p>
            )}
          </div>
          <div className={`rounded-lg p-2.5 border ${
            wipIncomingValue !== null && wipIncomingValue < 50 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-zinc-50 text-zinc-600 border-zinc-100"
          }`}>
            <Layers className="size-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
