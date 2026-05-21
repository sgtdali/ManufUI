"use client";

import { type CellParam } from "../actions";
import { type CellName } from "../constants";
import { toDayKey, formatNumber } from "../../utils";

type Props = {
  cellName: CellName;
  days: Date[];
  actuals: Record<string, number>;
  capacityParam: CellParam | undefined;
  todayKey: string;
  onCellClick: (cellName: CellName, date: Date, actualValue: number) => void;
};

export function CellGridRow({
  cellName,
  days,
  actuals,
  capacityParam,
  todayKey,
  onCellClick,
}: Props) {
  const capacity = capacityParam?.gunluk_max_kapasite ?? null;

  const getCellClasses = (
    dateKey: string,
    actual: number,
    isWorkday: boolean,
    isWeekend: boolean
  ) => {
    const isFuture = dateKey > todayKey;

    // 1. Future dates with no data yet
    if (isFuture && actual === 0) {
      return "bg-white text-zinc-400 border border-zinc-200/50 hover:bg-zinc-50/50";
    }

    // 2. Weekend / non-workday with no data (actual is 0)
    if (!isWorkday && actual === 0) {
      return "bg-zinc-100/70 text-zinc-400/60 border border-zinc-200/10 hover:bg-zinc-200/30";
    }

    // 3. Past or today workday with 0 actual
    if (isWorkday && actual === 0 && dateKey <= todayKey) {
      return "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/80 font-semibold";
    }

    // 4. Capacity checks
    if (capacity !== null && capacity > 0) {
      const ratio = actual / capacity;
      if (ratio >= 1.0) {
        return "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold";
      } else if (ratio >= 0.6) {
        return "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-semibold";
      } else {
        return "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold";
      }
    }

    // 5. Fallback neutral color (e.g. if capacity is not set but there is data, or if it is weekend with actual data)
    return "bg-zinc-50/80 text-zinc-700 border border-zinc-200/60 hover:bg-zinc-100";
  };

  return (
    <tr className="border-b border-zinc-200 hover:bg-zinc-50/40 transition-colors">
      {/* Sticky Left Column: Cell Name + Capacity */}
      <td className="py-2.5 pl-3 pr-2 sticky left-0 z-10 bg-white font-bold text-zinc-900 border-r border-zinc-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap min-w-[220px]">
        <div className="flex flex-col">
          <span className="text-xs">{cellName}</span>
          <span className="text-[10px] text-zinc-500 font-normal mt-0.5">
            Maks. Kapasite: {capacity !== null ? formatNumber(capacity) : "—"}
          </span>
        </div>
      </td>

      {/* Daily Gantt Cells */}
      {days.map((d) => {
        const dateKey = toDayKey(d);
        const day = d.getDay();
        const isWeekend = day === 0 || day === 6;
        const isToday = dateKey === todayKey;
        // Check if workday: standard weekdays (Mon-Fri are 1-5, but let's check standard isWeekday helper:
        // isWeekday in utils.ts returns true for 0 to 4. For our grid, a workday is Mon-Fri.
        // Let's use the explicit check: day >= 1 && day <= 5.
        const isWorkday = day >= 1 && day <= 5;

        const actualValue = actuals[dateKey] ?? 0;
        const cellCls = getCellClasses(dateKey, actualValue, isWorkday, isWeekend);

        return (
          <td
            key={dateKey}
            className={`p-1 text-center transition-all border-r border-zinc-100 ${
              isWeekend ? "w-[50px] min-w-[50px] bg-zinc-50/45" : "w-[75px] min-w-[75px]"
            } ${isToday ? "border-l-2 border-r-2 border-blue-500 bg-blue-50/10" : ""}`}
          >
            <button
              type="button"
              className={`w-full py-1.5 rounded text-xs transition-all outline-none focus:ring-1 focus:ring-blue-500 ${cellCls}`}
              onClick={() => onCellClick(cellName, d, actualValue)}
            >
              {actualValue > 0 ? formatNumber(actualValue) : actuals[dateKey] !== undefined ? "0" : "—"}
            </button>
          </td>
        );
      })}
    </tr>
  );
}
