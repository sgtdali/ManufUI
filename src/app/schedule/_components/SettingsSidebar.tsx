"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CellStateField } from "../overview/constants";

type Props = {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  dailyTarget: string;
  setDailyTarget: (v: string) => void;
  clearAllOverrides: () => void;
  selectedCell: string;
  cellState: Record<string, string>;
  onCellStateChange: (key: string, val: string) => void;
  cellStateConfig: CellStateField[];
};

const labelCls = "text-xs font-semibold text-zinc-500 uppercase tracking-wider";

export function SettingsSidebar({
  startDate, setStartDate,
  endDate, setEndDate,
  dailyTarget, setDailyTarget,
  clearAllOverrides,
  cellState,
  onCellStateChange,
  cellStateConfig,
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

        {cellStateConfig.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`cell-state-${field.key}`} className={labelCls}>
              {field.label}
            </Label>
            <Input
              id={`cell-state-${field.key}`}
              type="number"
              min={field.min}
              value={cellState[field.key] ?? field.defaultValue}
              onChange={(e) => onCellStateChange(field.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full text-xs cursor-pointer" onClick={clearAllOverrides}>
        Senaryoyu temizle
      </Button>
    </div>
  );
}
