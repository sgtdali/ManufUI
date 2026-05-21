"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  dailyTarget: string;
  setDailyTarget: (v: string) => void;
  defaultShiftStart: string;
  setDefaultShiftStart: (v: string) => void;
  defaultShiftEnd: string;
  setDefaultShiftEnd: (v: string) => void;
  defaultFurnaceStart: string;
  setDefaultFurnaceStart: (v: string) => void;
  overtimeMinutes: string;
  setOvertimeMinutes: (v: string) => void;
  initialMaleRemaining: string;
  setInitialMaleRemaining: (v: string) => void;
  initialFemaleRemaining: string;
  setInitialFemaleRemaining: (v: string) => void;
  holidayWorkEnabled: boolean;
  setHolidayWorkEnabled: (v: boolean) => void;
  clearAllOverrides: () => void;
  normalizationWarmupMinutes: number;
  prePressHeatMinutes: number;
  normalizationProcessMinutes: number;
};

const labelCls = "text-xs font-semibold text-zinc-500 uppercase tracking-wider";

export function SettingsSidebar({
  startDate, setStartDate,
  endDate, setEndDate,
  dailyTarget, setDailyTarget,
  defaultShiftStart, setDefaultShiftStart,
  defaultShiftEnd, setDefaultShiftEnd,
  defaultFurnaceStart, setDefaultFurnaceStart,
  overtimeMinutes, setOvertimeMinutes,
  initialMaleRemaining, setInitialMaleRemaining,
  initialFemaleRemaining, setInitialFemaleRemaining,
  holidayWorkEnabled, setHolidayWorkEnabled,
  clearAllOverrides,
  normalizationWarmupMinutes,
  prePressHeatMinutes,
  normalizationProcessMinutes,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="space-y-1">
          <Label htmlFor="start-date" className={labelCls}>Başlangıç</Label>
          <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="end-date" className={labelCls}>Bitiş</Label>
          <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="daily-target" className={labelCls}>Günlük hedef</Label>
          <Input id="daily-target" min={0} type="number" value={dailyTarget} onChange={(e) => setDailyTarget(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="shift-start" className={labelCls}>Vardiya başlangıç</Label>
          <Input id="shift-start" type="time" value={defaultShiftStart} onChange={(e) => setDefaultShiftStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="shift-end" className={labelCls}>Vardiya bitiş</Label>
          <Input id="shift-end" type="time" value={defaultShiftEnd} onChange={(e) => setDefaultShiftEnd(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="furnace-start" className={labelCls}>Fırın başlangıç</Label>
          <Input id="furnace-start" type="time" value={defaultFurnaceStart} onChange={(e) => setDefaultFurnaceStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="overtime" className={labelCls}>Günlük fazla mesai (dk)</Label>
          <Input id="overtime" min={0} step={15} type="number" value={overtimeMinutes} onChange={(e) => setOvertimeMinutes(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="male-remaining" className={labelCls}>Erkek kalıp kalan adet</Label>
          <Input id="male-remaining" min={0} type="number" value={initialMaleRemaining} onChange={(e) => setInitialMaleRemaining(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="female-remaining" className={labelCls}>Dişi kalıp kalan adet</Label>
          <Input id="female-remaining" min={0} type="number" value={initialFemaleRemaining} onChange={(e) => setInitialFemaleRemaining(e.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50 transition-colors">
        <input
          checked={holidayWorkEnabled}
          className="h-4 w-4 accent-blue-700 cursor-pointer"
          type="checkbox"
          onChange={(e) => setHolidayWorkEnabled(e.target.checked)}
        />
        <span className="text-zinc-700 font-medium">Cuma/Cumartesi çalışılsın</span>
      </label>

      <Card className="rounded-lg border-blue-100 bg-blue-50">
        <CardContent className="p-3 text-xs text-blue-900 leading-relaxed">
          Fırın başlangıcından <strong>{normalizationWarmupMinutes} dk</strong> sonra normalizasyon hazır kabul edilir.
          Ardından <strong>{prePressHeatMinutes} dk</strong> parça ısıtma, ETM&apos;ye hazır oluş için ek{" "}
          <strong>{normalizationProcessMinutes} dk</strong> normalizasyon süresi hesaplanır.
        </CardContent>
      </Card>

      <Button type="button" variant="outline" className="w-full text-xs" onClick={clearAllOverrides}>
        Senaryoyu temizle
      </Button>
    </div>
  );
}
