"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DayPlan, DayOverride } from "../types";
import { formatNumber, numberInput } from "../utils";

type Props = {
  schedule: DayPlan[];
  overrides: Record<string, DayOverride>;
  actuals: Record<string, number>;
  wipOutgoing: Record<string, number | null>;
  updateOverride: (key: string, patch: DayOverride) => void;
  clearDayOverride: (key: string) => void;
};

export function ScheduleTable({ schedule, overrides, actuals, wipOutgoing, updateOverride, clearDayOverride }: Props) {
  return (
    <Card className="rounded-xl shadow-sm border-zinc-200 overflow-hidden bg-white">
      <CardHeader className="border-b border-zinc-100 pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold text-zinc-800 uppercase tracking-wider">
          Günlük Pres Planı Simülasyonu
        </CardTitle>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Supabase Verisi
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Senaryo / Elle Girilen
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50/70">
                <th className="py-2.5 pl-3 pr-1.5 font-semibold">Gün</th>
                <th className="px-1.5 py-2.5 text-right font-semibold">Süre</th>
                <th className="px-1.5 py-2.5 font-semibold">Vardiya</th>
                <th className="px-1.5 py-2.5 font-semibold">Fırın</th>
                <th className="px-1.5 py-2.5 text-right font-semibold">F.Mesai</th>
                <th className="px-1.5 py-2.5 text-right font-semibold">Manuel</th>
                <th className="px-1.5 py-2.5 text-center font-semibold">Çalış</th>
                <th className="px-1.5 py-2.5 font-semibold">Planlı Duruş</th>
                <th className="px-1.5 py-2.5 font-semibold">İlk Pres</th>
                <th className="px-1.5 py-2.5 text-right font-semibold text-zinc-500">Hedef</th>
                <th className="px-1.5 py-2.5 text-right font-semibold text-zinc-500">Kapas.</th>
                <th className="px-1.5 py-2.5 text-right font-semibold">Pres</th>
                <th className="px-1.5 py-2.5 text-right font-semibold">ETM</th>
                <th className="px-1.5 py-2.5 text-right font-semibold text-zinc-500">ETM Stok</th>
                <th className="px-1.5 py-2.5 text-right font-semibold">Fark</th>
                <th className="px-1.5 py-2.5 text-right font-semibold">Erkek</th>
                <th className="px-1.5 py-2.5 text-right font-semibold">Dişi</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Sıfırla</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((day) => {
                const isRowDisabled = !day.isWorkday;
                const maleRisk = day.maleRemainingEnd <= 100;
                const femaleRisk = day.femaleRemainingEnd <= 300;
                const isWeekend = day.label.includes("Cumartesi") || day.label.includes("Pazar");
                const inputCls =
                  "bg-transparent border-transparent hover:bg-zinc-100/80 hover:border-zinc-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded shadow-none text-xs font-medium disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent";

                return (
                  <tr
                    key={day.date.toISOString()}
                    className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 transition-colors ${
                      !day.isWorkday ? "bg-zinc-50/40 text-zinc-400 opacity-75" : ""
                    }`}
                  >
                    <td className="py-2 pl-3 pr-1.5 font-semibold text-zinc-900 text-xs">
                      <div className="flex flex-col">
                        <span>{day.label}</span>
                        {isWeekend && <span className="text-[9px] text-zinc-400 font-normal">Hafta Sonu</span>}
                      </div>
                    </td>
                    <td className="px-1.5 py-2 text-right font-medium text-zinc-500 text-xs">
                      {day.availableMinutes} dk
                    </td>
                    {/* Vardiya */}
                    <td className="px-1.5 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          aria-label={`${day.label} vardiya başlangıç`}
                          className={`h-7 w-[68px] text-center p-0 ${inputCls}`}
                          type="time"
                          disabled={isRowDisabled}
                          value={overrides[day.key]?.shiftStart ?? day.shiftStart}
                          onChange={(e) => updateOverride(day.key, { shiftStart: e.target.value || undefined })}
                        />
                        <span className="text-zinc-300">-</span>
                        <Input
                          aria-label={`${day.label} vardiya bitiş`}
                          className={`h-7 w-[68px] text-center p-0 ${inputCls}`}
                          type="time"
                          disabled={isRowDisabled}
                          value={overrides[day.key]?.shiftEnd ?? day.shiftEnd}
                          onChange={(e) => updateOverride(day.key, { shiftEnd: e.target.value || undefined })}
                        />
                      </div>
                    </td>
                    {/* Fırın */}
                    <td className="px-1.5 py-2">
                      <Input
                        aria-label={`${day.label} fırın başlangıç`}
                        className={`h-7 w-[68px] text-center p-0 ${inputCls}`}
                        type="time"
                        disabled={isRowDisabled}
                        value={overrides[day.key]?.furnaceStart ?? day.furnaceStart}
                        onChange={(e) => updateOverride(day.key, { furnaceStart: e.target.value || undefined })}
                      />
                    </td>
                    {/* Fazla mesai */}
                    <td className="px-1.5 py-2">
                      <Input
                        aria-label={`${day.label} fazla mesai`}
                        className={`ml-auto h-7 w-[56px] text-right px-1 ${inputCls}`}
                        min={0}
                        step={15}
                        type="number"
                        disabled={isRowDisabled}
                        value={overrides[day.key]?.overtimeMinutes ?? ""}
                        placeholder={String(day.overtimeMinutes)}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateOverride(day.key, {
                            overtimeMinutes: v === "" ? undefined : Math.max(numberInput(v), 0),
                          });
                        }}
                      />
                    </td>
                    {/* Manuel üretim */}
                    <td className="px-1.5 py-2">
                      <Input
                        aria-label={`${day.label} gerçekleşen pres adedi`}
                        className={`ml-auto h-7 w-[68px] text-right px-1 ${inputCls}`}
                        min={0}
                        type="number"
                        disabled={isRowDisabled}
                        value={overrides[day.key]?.pressed ?? actuals[day.key] ?? ""}
                        placeholder={String(day.capacityPressed)}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateOverride(day.key, {
                            pressed: v === "" ? undefined : Math.max(Math.floor(numberInput(v)), 0),
                          });
                        }}
                      />
                    </td>
                    {/* Çalış checkbox */}
                    <td className="px-1.5 py-2 text-center">
                      <input
                        aria-label={`${day.label} çalışma günü yap`}
                        checked={day.isWorkday}
                        className="h-3.5 w-3.5 accent-blue-700 cursor-pointer disabled:opacity-50"
                        disabled={day.isBaseWorkday}
                        type="checkbox"
                        onChange={(e) =>
                          updateOverride(day.key, { forceWorkday: e.target.checked ? true : undefined })
                        }
                      />
                    </td>
                    {/* Planlı duruş */}
                    <td className="px-1.5 py-2">
                      <span
                        className={
                          day.maintenanceMinutes > 0
                            ? "inline-flex items-center rounded bg-amber-50 border border-amber-200 px-1 py-0.5 text-[9px] font-semibold text-amber-800"
                            : "text-zinc-400 text-xs"
                        }
                      >
                        {day.maintenanceLabel}
                      </span>
                    </td>
                    {/* İlk pres */}
                    <td className="px-1.5 py-2 text-zinc-500 text-xs">{day.pressStartTime ?? "-"}</td>
                    {/* Hedef */}
                    <td className="px-1.5 py-2 text-right font-medium text-zinc-400 text-xs">
                      {formatNumber(day.target)}
                    </td>
                    {/* Kapasite */}
                    <td className="px-1.5 py-2 text-right text-zinc-400 text-xs">
                      {formatNumber(day.capacityPressed)}
                    </td>
                    {/* Preslenen */}
                    <td className="px-1.5 py-2 text-right">
                      <span
                        className={
                          day.source === "scenario"
                            ? "inline-flex items-center rounded bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700"
                            : day.source === "actual"
                              ? "inline-flex items-center rounded bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700"
                              : "text-zinc-700 text-xs font-semibold"
                        }
                        title={
                          day.source === "scenario"
                            ? "Senaryo değeri"
                            : day.source === "actual"
                              ? "Supabase gerçekleşen değeri"
                              : "Planlanan kapasite"
                        }
                      >
                        {formatNumber(day.pressed)}
                      </span>
                    </td>
                    {/* ETM hazır */}
                    <td className="px-1.5 py-2 text-right text-zinc-500 text-xs">
                      {formatNumber(day.sameDayEtmReady)}
                    </td>
                    {/* ETM Stok */}
                    <td className="px-1.5 py-2 text-right text-zinc-500 font-medium text-xs">
                      {wipOutgoing[day.key] !== undefined && wipOutgoing[day.key] !== null
                        ? formatNumber(wipOutgoing[day.key]!)
                        : "—"}
                    </td>
                    {/* Fark */}
                    <td className="px-1.5 py-2 text-right">
                      <span
                        className={
                          day.targetGap > 0
                            ? "font-bold text-rose-600 text-xs"
                            : "font-medium text-emerald-600 text-xs"
                        }
                      >
                        {day.targetGap > 0
                          ? `-${formatNumber(day.targetGap)}`
                          : `+${formatNumber(Math.abs(day.targetGap))}`}
                      </span>
                    </td>
                    {/* Erkek kalan */}
                    <td
                      className={`px-1.5 py-2 text-right text-xs font-semibold transition-all ${
                        maleRisk ? "text-rose-600 font-bold bg-rose-50 rounded px-1" : "text-zinc-600"
                      }`}
                    >
                      {formatNumber(day.maleRemainingEnd)}
                    </td>
                    {/* Dişi kalan */}
                    <td
                      className={`px-1.5 py-2 text-right text-xs font-semibold transition-all ${
                        femaleRisk ? "text-rose-600 font-bold bg-rose-50 rounded px-1" : "text-zinc-600"
                      }`}
                    >
                      {formatNumber(day.femaleRemainingEnd)}
                    </td>
                    {/* Sıfırla */}
                    <td className="py-2 pr-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-blue-600 rounded hover:bg-zinc-100 transition-colors"
                        disabled={!overrides[day.key]}
                        onClick={() => clearDayOverride(day.key)}
                        title="Satır senaryosunu temizle"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
