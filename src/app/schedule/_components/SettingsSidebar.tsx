"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  overtimeMinutes: string;
  setOvertimeMinutes: (v: string) => void;
  initialMaleRemaining: string;
  setInitialMaleRemaining: (v: string) => void;
  initialFemaleRemaining: string;
  setInitialFemaleRemaining: (v: string) => void;
  initialRingRemaining: string;
  setInitialRingRemaining: (v: string) => void;
  etm1InitialCutting: string;
  setEtm1InitialCutting: (v: string) => void;
  etm2InitialCutting: string;
  setEtm2InitialCutting: (v: string) => void;
  etm1InitialDrill: string;
  setEtm1InitialDrill: (v: string) => void;
  etm2InitialDrill: string;
  setEtm2InitialDrill: (v: string) => void;
  initialWip?: string;
  setInitialWip?: (v: string) => void;
  holidayWorkEnabled: boolean;
  setHolidayWorkEnabled: (v: boolean) => void;
  clearAllOverrides: () => void;
  normalizationWarmupMinutes: number;
  prePressHeatMinutes: number;
  normalizationProcessMinutes: number;
  selectedCell: string;
};

const labelCls = "text-xs font-semibold text-zinc-500 uppercase tracking-wider";

export function SettingsSidebar({
  startDate, setStartDate,
  endDate, setEndDate,
  dailyTarget, setDailyTarget,
  defaultShiftStart, setDefaultShiftStart,
  defaultShiftEnd, setDefaultShiftEnd,
  overtimeMinutes, setOvertimeMinutes,
  initialMaleRemaining, setInitialMaleRemaining,
  initialFemaleRemaining, setInitialFemaleRemaining,
  initialRingRemaining, setInitialRingRemaining,
  etm1InitialCutting, setEtm1InitialCutting,
  etm2InitialCutting, setEtm2InitialCutting,
  etm1InitialDrill, setEtm1InitialDrill,
  etm2InitialDrill, setEtm2InitialDrill,
  initialWip, setInitialWip,
  holidayWorkEnabled, setHolidayWorkEnabled,
  clearAllOverrides,
  selectedCell,
}: Props) {
  const isPress = selectedCell === "Pres Hücresi";
  const isEtm = selectedCell === "ETM Hücresi";

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

        {/* Pres-specific parameters */}
        {isPress && (
          <>
            <div className="space-y-1">
              <Label htmlFor="male-remaining" className={labelCls}>Erkek kalıp kalan adet</Label>
              <Input id="male-remaining" min={0} type="number" value={initialMaleRemaining} onChange={(e) => setInitialMaleRemaining(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="female-remaining" className={labelCls}>Dişi kalıp kalan adet</Label>
              <Input id="female-remaining" min={0} type="number" value={initialFemaleRemaining} onChange={(e) => setInitialFemaleRemaining(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ring-remaining" className={labelCls}>HIP Ring kalan adet</Label>
              <Input id="ring-remaining" min={0} type="number" value={initialRingRemaining} onChange={(e) => setInitialRingRemaining(e.target.value)} />
            </div>
          </>
        )}

        {/* ETM-specific parameters */}
        {isEtm && (
          <>
            <div className="space-y-1">
              <Label htmlFor="initial-wip" className={labelCls}>Başlangıç WIP (Pres → ETM)</Label>
              <Input id="initial-wip" min={0} type="number" value={initialWip ?? "0"} onChange={(e) => setInitialWip?.(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="etm1-cutting" className={labelCls}>ETM-1 Kesici Uç Kalan</Label>
              <Input id="etm1-cutting" min={0} type="number" value={etm1InitialCutting} onChange={(e) => setEtm1InitialCutting(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="etm2-cutting" className={labelCls}>ETM-2 Kesici Uç Kalan</Label>
              <Input id="etm2-cutting" min={0} type="number" value={etm2InitialCutting} onChange={(e) => setEtm2InitialCutting(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="etm1-drill" className={labelCls}>ETM-1 Punta Matkabı Kalan</Label>
              <Input id="etm1-drill" min={0} type="number" value={etm1InitialDrill} onChange={(e) => setEtm1InitialDrill(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="etm2-drill" className={labelCls}>ETM-2 Punta Matkabı Kalan</Label>
              <Input id="etm2-drill" min={0} type="number" value={etm2InitialDrill} onChange={(e) => setEtm2InitialDrill(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <Button type="button" variant="outline" className="w-full text-xs cursor-pointer" onClick={clearAllOverrides}>
        Senaryoyu temizle
      </Button>
    </div>
  );
}
