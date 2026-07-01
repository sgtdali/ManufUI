"use client";

import { useMemo } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { FORECAST_CELLS, SlotActual } from "../_lib/constants";
import { ProjectionDay } from "./forecastUtils";

type Props = {
  projection: ProjectionDay[];
  finishDates: Record<string, string | null>;
  presEndDate: string;
  today: string;
  actuals: SlotActual[];
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(`${d}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysFrom(from: string, to: string | null): number | null {
  if (!to) return null;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function fmtNum(n: number) { return Math.round(n).toLocaleString("tr-TR"); }

export default function ProjectionView({ projection, finishDates, presEndDate, today, actuals }: Props) {
  const cellTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const cell of FORECAST_CELLS) {
      const actSum = actuals.filter((a) => a.bolum === cell).reduce((sum, a) => sum + (a.uretimAdeti ?? 0), 0);
      const projSum = projection.reduce((sum, day) => sum + (day.cells[cell]?.uretim ?? 0), 0);
      totals[cell] = actSum + projSum;
    }
    return totals;
  }, [actuals, projection]);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Hücre Bitiş Tarihleri</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {FORECAST_CELLS.map((cell) => {
            const finish = finishDates[cell];
            const isPast = finish ? finish <= today : false;
            const daysAway = daysFrom(today, finish);
            const isLate = daysAway !== null && daysAway > 60;

            return (
              <div
                key={cell}
                className={`rounded-lg border px-3 py-2.5 flex flex-col gap-1 ${
                  cell === "Pres Hücresi"
                    ? "border-blue-700/50 bg-blue-950/30"
                    : finish
                    ? isLate
                      ? "border-amber-700/50 bg-amber-950/20"
                      : "border-emerald-700/50 bg-emerald-950/20"
                    : "border-zinc-700 bg-zinc-800/30"
                }`}
              >
                <span className="text-[10px] font-medium text-zinc-400 leading-tight">
                  {cell.replace(" Hücresi", "")}
                </span>
                <span className={`text-sm font-bold ${finish ? (isLate ? "text-amber-300" : "text-emerald-300") : "text-zinc-500"}`}>
                  {fmtDate(finish)}
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5">
                  Toplam: <span className="font-semibold text-white">{fmtNum(cellTotals[cell] ?? 0)}</span>
                </span>
                {daysAway !== null && (
                  <span className={`text-[10px] ${daysAway > 0 ? "text-zinc-500" : "text-red-400"}`}>
                    {daysAway > 0 ? `+${daysAway} gün` : daysAway === 0 ? "Bugün" : `${Math.abs(daysAway)} gün önce`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail table */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Günlük Projeksiyon Detayı</h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-700">
          <table className="min-w-full text-xs text-zinc-300 border-collapse">
            <thead>
              <tr className="bg-zinc-800 border-b border-zinc-700">
                <th className="sticky left-0 z-10 bg-zinc-800 px-3 py-2 text-left text-zinc-400 min-w-[120px]">Tarih</th>
                {FORECAST_CELLS.map((cell) => {
                  const total = cellTotals[cell] ?? 0;
                  return (
                    <th key={cell} className="px-2 py-2 text-center text-zinc-400 min-w-[100px]">
                      <div className="font-semibold">{cell.replace(" Hücresi", "")}</div>
                      <div className="text-[10px] text-zinc-500 font-normal">({fmtNum(total)})</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {projection.map((day) => {
                const isFuture = day.tarih >= today;
                const isPresEnd = day.tarih === presEndDate;
                const bg = isFuture
                  ? day.isWorkday
                    ? "bg-zinc-900"
                    : "bg-zinc-950/40 text-zinc-500"
                  : "bg-zinc-950/60 text-zinc-500";

                return (
                  <tr key={day.tarih} className={`border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors ${bg}`}>
                    <td className={`sticky left-0 z-10 px-3 py-1.5 font-medium ${isFuture ? "text-zinc-300" : "text-zinc-500"} ${bg}`}>
                      <div className="flex items-center gap-1">
                        <span>
                          {new Date(`${day.tarih}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                        </span>
                        {!day.isWorkday && <span className="text-[9px] text-zinc-600">(H.sonu)</span>}
                        {isPresEnd && <span className="text-[9px] text-blue-400">(Pres↓)</span>}
                        {day.tarih === today && <span className="text-[9px] text-amber-400">◉</span>}
                      </div>
                    </td>
                    {FORECAST_CELLS.map((cell) => {
                      const c = day.cells[cell];
                      if (!c) return <td key={cell} className="px-2 py-1.5 text-center text-zinc-700">—</td>;

                      const isActive = c.uretim > 0;
                      const wipLow = c.wipCikan < (c.wipGiren * 0.1) && c.wipGiren > 0;

                      return (
                        <td key={cell} className="px-1.5 py-1.5 text-center">
                          <div className="flex flex-col items-center gap-0">
                            <span className={`font-semibold ${isActive ? (isFuture ? "text-emerald-300" : "text-zinc-300") : "text-zinc-700"}`}>
                              {isActive ? fmtNum(c.uretim) : "·"}
                            </span>
                            {c.wipGiren > 0 && (
                              <span className={`text-[9px] ${wipLow ? "text-amber-400" : "text-zinc-600"}`}>
                                WIP:{fmtNum(c.wipCikan)}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
