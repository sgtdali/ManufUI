"use client";

import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  dailyTarget: number;
  setDailyTarget: (v: number) => void;
  defaultShiftStart: string;
  setDefaultShiftStart: (v: string) => void;
  defaultShiftEnd: string;
  setDefaultShiftEnd: (v: string) => void;
  overtimeMinutes: number;
  setOvertimeMinutes: (v: number) => void;
  holidayWorkEnabled: boolean;
  setHolidayWorkEnabled: (v: boolean) => void;

  etm1InitialCutting: number;
  setEtm1InitialCutting: (v: number) => void;
  etm2InitialCutting: number;
  setEtm2InitialCutting: (v: number) => void;
  etm1InitialDrill: number;
  setEtm1InitialDrill: (v: number) => void;
  etm2InitialDrill: number;
  setEtm2InitialDrill: (v: number) => void;

  onClearOverrides: () => void;
};

export function EtmSettingsSidebar({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  dailyTarget,
  setDailyTarget,
  defaultShiftStart,
  setDefaultShiftStart,
  defaultShiftEnd,
  setDefaultShiftEnd,
  overtimeMinutes,
  setOvertimeMinutes,
  holidayWorkEnabled,
  setHolidayWorkEnabled,
  etm1InitialCutting,
  setEtm1InitialCutting,
  etm2InitialCutting,
  setEtm2InitialCutting,
  etm1InitialDrill,
  setEtm1InitialDrill,
  etm2InitialDrill,
  setEtm2InitialDrill,
  onClearOverrides,
}: Props) {
  return (
    <div className="space-y-5">
      {/* 1. Date range settings */}
      <div className="space-y-3 border-b border-zinc-150 pb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Tarih ve Hedef</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-start-date" className="text-[10px] font-bold text-zinc-500">Başlangıç</label>
            <input
              id="settings-start-date"
              type="date"
              className="text-xs border border-zinc-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-end-date" className="text-[10px] font-bold text-zinc-500">Bitiş</label>
            <input
              id="settings-end-date"
              type="date"
              className="text-xs border border-zinc-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="settings-daily-target" className="text-[10px] font-bold text-zinc-500">Günlük Hedef (Adet)</label>
          <input
            id="settings-daily-target"
            type="number"
            min="0"
            className="text-xs border border-zinc-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-semibold"
            value={dailyTarget}
            onChange={(e) => setDailyTarget(Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
        </div>
      </div>

      {/* 2. Shift and Workday timings */}
      <div className="space-y-3 border-b border-zinc-150 pb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Vardiya & Çalışma</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-shift-start" className="text-[10px] font-bold text-zinc-500">Vardiya Giriş</label>
            <input
              id="settings-shift-start"
              type="text"
              placeholder="08:00"
              className="text-xs border border-zinc-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              value={defaultShiftStart}
              onChange={(e) => setDefaultShiftStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settings-shift-end" className="text-[10px] font-bold text-zinc-500">Vardiya Çıkış</label>
            <input
              id="settings-shift-end"
              type="text"
              placeholder="17:30"
              className="text-xs border border-zinc-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              value={defaultShiftEnd}
              onChange={(e) => setDefaultShiftEnd(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="settings-overtime" className="text-[10px] font-bold text-zinc-500">Varsayılan Mesai (Dakika)</label>
          <input
            id="settings-overtime"
            type="number"
            min="0"
            className="text-xs border border-zinc-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            value={overtimeMinutes}
            onChange={(e) => setOvertimeMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <label htmlFor="settings-holiday-work" className="text-[11px] font-bold text-zinc-600">Hafta Sonu Çalışma Aktif</label>
          <input
            id="settings-holiday-work"
            type="checkbox"
            className="size-4 text-blue-600 focus:ring-blue-500 border-zinc-300 rounded cursor-pointer"
            checked={holidayWorkEnabled}
            onChange={(e) => setHolidayWorkEnabled(e.target.checked)}
          />
        </div>
      </div>

      {/* 3. Initial Wear States */}
      <div className="space-y-3 border-b border-zinc-150 pb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Başlangıç Takım Ömürleri</h3>
        <div className="space-y-2">
          <div className="bg-zinc-50 p-2 rounded border border-zinc-100 space-y-2">
            <p className="text-[10px] font-bold text-zinc-500">ETM-1</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="settings-etm1-cutting" className="text-[9px] font-semibold text-zinc-400">Kesici Uç (Kalan)</label>
                <input
                  id="settings-etm1-cutting"
                  type="number"
                  min="0"
                  className="text-xs border border-zinc-200 rounded p-1 focus:outline-none bg-white"
                  value={etm1InitialCutting}
                  onChange={(e) => setEtm1InitialCutting(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="settings-etm1-drill" className="text-[9px] font-semibold text-zinc-400">Punta (Kalan)</label>
                <input
                  id="settings-etm1-drill"
                  type="number"
                  min="0"
                  className="text-xs border border-zinc-200 rounded p-1 focus:outline-none bg-white"
                  value={etm1InitialDrill}
                  onChange={(e) => setEtm1InitialDrill(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 p-2 rounded border border-zinc-100 space-y-2">
            <p className="text-[10px] font-bold text-zinc-500">ETM-2</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="settings-etm2-cutting" className="text-[9px] font-semibold text-zinc-400">Kesici Uç (Kalan)</label>
                <input
                  id="settings-etm2-cutting"
                  type="number"
                  min="0"
                  className="text-xs border border-zinc-200 rounded p-1 focus:outline-none bg-white"
                  value={etm2InitialCutting}
                  onChange={(e) => setEtm2InitialCutting(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="settings-etm2-drill" className="text-[9px] font-semibold text-zinc-400">Punta (Kalan)</label>
                <input
                  id="settings-etm2-drill"
                  type="number"
                  min="0"
                  className="text-xs border border-zinc-200 rounded p-1 focus:outline-none bg-white"
                  value={etm2InitialDrill}
                  onChange={(e) => setEtm2InitialDrill(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Reset overrides */}
      <div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onClearOverrides}
          className="w-full text-xs font-bold py-2"
        >
          Tüm Plan Değişikliklerini Sıfırla
        </Button>
      </div>
    </div>
  );
}
