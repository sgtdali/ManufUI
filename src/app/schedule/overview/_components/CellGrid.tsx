"use client";

import { useState, Fragment } from "react";
import { CellGridRow } from "./CellGridRow";
import { WipRow } from "./WipRow";
import { type CellParam } from "../actions";
import type { WipStockItem } from "../../actions";
import { CELLS, CELL_FLOWS, type CellName } from "../constants";
import { toDayKey, formatDate, formatWeekday, formatNumber } from "../../utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  days: Date[];
  actuals: Record<string, Record<string, number>>;
  cellParams: Record<string, CellParam>;
  wipStock: WipStockItem[];
  todayKey: string;
  onCellClick: (cellName: CellName, date: Date, actualValue: number) => void;
};

export function CellGrid({
  days,
  actuals,
  cellParams,
  wipStock,
  todayKey,
  onCellClick,
}: Props) {
  const [showFullRange, setShowFullRange] = useState(false);

  // Mobile days (show last 7 days by default)
  const mobileDays = showFullRange ? days : days.slice(-7);

  // Helper to fetch WIP stock value
  const getWipValue = (dateKey: string, source: string, target: string) => {
    const match = wipStock.find(
      (w) => w.tarih === dateKey && w.kaynak_hucresi === source && w.hedef_hucresi === target
    );
    if (!match) return null;
    return match.override_edildi && match.gercek_adet !== null ? match.gercek_adet : match.hesaplanan_adet;
  };

  const getCellClassesForMobile = (
    actual: number,
    capacity: number | null,
    isWorkday: boolean,
    isWeekend: boolean,
    dateKey: string
  ) => {
    const isFuture = dateKey > todayKey;

    if (isFuture && actual === 0) {
      return "bg-zinc-50 text-zinc-400 border border-zinc-200";
    }
    if (!isWorkday && actual === 0) {
      return "bg-zinc-100 text-zinc-400 border border-zinc-200/50";
    }
    if (isWorkday && actual === 0 && dateKey <= todayKey) {
      return "bg-rose-100 text-rose-800 border border-rose-200 font-bold animate-pulse";
    }
    if (capacity !== null && capacity > 0) {
      const ratio = actual / capacity;
      if (ratio >= 1.0) {
        return "bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold";
      } else if (ratio >= 0.6) {
        return "bg-amber-100 text-amber-800 border border-amber-200 font-semibold";
      } else {
        return "bg-rose-100 text-rose-800 border border-rose-200 font-bold";
      }
    }
    return "bg-zinc-100 text-zinc-700 border border-zinc-200";
  };

  return (
    <div className="w-full">
      {/* ────────────────────────────────────────────────────────────────────────
          DESKTOP VIEW: Gantt Table Grid
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <Card className="rounded-xl border border-zinc-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50/80">
                    <th className="py-3 pl-3 pr-2 sticky left-0 z-20 bg-zinc-50/95 border-r border-zinc-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[220px]">
                      Üretim Hücresi
                    </th>
                    {days.map((d) => {
                      const dateKey = toDayKey(d);
                      const day = d.getDay();
                      const isWeekend = day === 0 || day === 6;
                      const isToday = dateKey === todayKey;

                      return (
                        <th
                          key={dateKey}
                          className={`py-3 text-center border-r border-zinc-200/60 font-semibold ${
                            isWeekend ? "w-[50px] min-w-[50px] bg-zinc-100/40 text-zinc-400" : "w-[75px] min-w-[75px] text-zinc-500"
                          } ${isToday ? "border-l-2 border-r-2 border-blue-500 bg-blue-50/10 text-blue-700 font-bold" : ""}`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{formatDate(d)}</span>
                            <span className="text-[9px] font-medium opacity-80 mt-0.5">
                              {formatWeekday(d)}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {CELLS.map((cell, index) => {
                    const isLastCell = index === CELLS.length - 1;
                    const flows = CELL_FLOWS[cell] || { upstream: [], downstream: [] };

                    return (
                      <Fragment key={cell}>
                        {/* 1. Production cell row */}
                        <CellGridRow
                          cellName={cell}
                          days={days}
                          actuals={actuals[cell] ?? {}}
                          capacityParam={cellParams[cell]}
                          todayKey={todayKey}
                          onCellClick={onCellClick}
                        />

                        {/* 2. Downstream WIP Row(s) */}
                        {!isLastCell &&
                          flows.downstream.map((down) => {
                            if (cell === "ROB104 Hücresi" && down === "N603 Hücresi") return null;
                            if (cell === "N603 Hücresi" && down === "ROB109 Hücresi") return null;
                            return (
                              <WipRow
                                key={`${cell}->${down}`}
                                source={cell}
                                target={down}
                                days={days}
                                wipStock={wipStock}
                                todayKey={todayKey}
                              />
                            );
                          })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          MOBILE VIEW: Stacked Cards
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="block md:hidden space-y-4">
        {/* Date control toggle for Mobile */}
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500">
            Gösterilen gün sayısı: <span className="text-zinc-950 font-bold">{mobileDays.length} gün</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs font-bold"
            onClick={() => setShowFullRange(!showFullRange)}
          >
            {showFullRange ? "Son 7 Günü Göster" : "Tüm Dönemi Göster"}
          </Button>
        </div>

        {/* Stacked Cards */}
        {CELLS.map((cell) => {
          const param = cellParams[cell];
          const capacity = param?.gunluk_max_kapasite ?? null;
          const cellActuals = actuals[cell] ?? {};
          const flows = CELL_FLOWS[cell] || { upstream: [], downstream: [] };

          return (
            <Card key={cell} className="border border-zinc-200 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-150 px-4 py-3">
                <CardTitle className="text-sm font-bold text-zinc-900 flex items-center justify-between">
                  <span>{cell}</span>
                  <span className="text-[10px] bg-zinc-200/70 text-zinc-600 px-2 py-0.5 rounded-full font-semibold">
                    Kapasite: {capacity !== null ? formatNumber(capacity) : "—"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  {mobileDays.map((d) => {
                    const dateKey = toDayKey(d);
                    const day = d.getDay();
                    const isWeekend = day === 0 || day === 6;
                    const isWorkday = day >= 1 && day <= 5;
                    const isToday = dateKey === todayKey;
                    const actualValue = cellActuals[dateKey] ?? 0;
                    const cellCls = getCellClassesForMobile(actualValue, capacity, isWorkday, isWeekend, dateKey);

                    // Grab downstream WIP stocks for display
                    const downstreamStocks = flows.downstream
                      .filter((down) => !(cell === "ROB104 Hücresi" && down === "N603 Hücresi"))
                      .filter((down) => !(cell === "N603 Hücresi" && down === "ROB109 Hücresi"))
                      .map((down) => {
                        const wipVal = getWipValue(dateKey, cell, down);
                        const isStarved = !isWeekend && dateKey <= todayKey && wipVal === 0;
                        const label = cell === "ROB104 Hücresi" && down === "N602 Hücresi"
                          ? "N602+N603"
                          : cell === "N602 Hücresi" && down === "ROB109 Hücresi"
                          ? "ROB109 (N602+N603)"
                          : down.replace(" Hücresi", "");
                        return {
                          targetName: label,
                          val: wipVal,
                          isStarved,
                        };
                      });

                    return (
                      <div
                        key={dateKey}
                        className={`flex flex-col gap-1.5 p-2 rounded-lg border border-transparent transition-all ${
                          isToday ? "bg-blue-50/40 border-blue-200" : "hover:bg-zinc-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-700">
                            {formatDate(d)} {formatWeekday(d)}
                            {isToday && (
                              <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.2 text-[8px] font-bold text-blue-700">
                                Bugün
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            className={`px-3 py-1 rounded text-xs font-bold shadow-sm transition-transform active:scale-95 ${cellCls}`}
                            onClick={() => onCellClick(cell, d, actualValue)}
                          >
                            {actualValue > 0 ? formatNumber(actualValue) : cellActuals[dateKey] !== undefined ? "0" : "—"}
                          </button>
                        </div>

                        {/* WIP stock under cell if present */}
                        {downstreamStocks.length > 0 && (
                          <div className="flex flex-wrap gap-2 pl-1.5 border-l-2 border-zinc-200">
                            {downstreamStocks.map((st) => (
                              <div
                                key={st.targetName}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  st.isStarved
                                    ? "bg-orange-100 text-orange-800 border border-orange-200"
                                    : "bg-zinc-150/70 text-zinc-500"
                                }`}
                              >
                                Stok → {st.targetName}: {st.val !== null ? formatNumber(st.val) : "—"}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
