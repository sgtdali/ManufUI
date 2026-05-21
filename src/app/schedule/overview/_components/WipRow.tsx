"use client";

import { type WipStockItem } from "../actions";
import { toDayKey, formatNumber } from "../../utils";

type Props = {
  source: string;
  target: string;
  days: Date[];
  wipStock: WipStockItem[];
  todayKey: string;
};

export function WipRow({ source, target, days, wipStock, todayKey }: Props) {
  return (
    <tr className="border-b border-zinc-100/60 bg-zinc-50/30 text-[11px] text-zinc-500 font-medium">
      <td className="py-1.5 pl-3 pr-2 sticky left-0 z-10 bg-zinc-50/95 font-semibold text-zinc-600 border-r border-zinc-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap min-w-[220px]">
        <div className="flex items-center gap-1">
          <span className="text-zinc-400">↓ Stok:</span>
          <span>
            {source === "ROB104 Hücresi" && target === "N602 Hücresi"
              ? "ROB104 → N602+N603"
              : source === "N602 Hücresi" && target === "ROB109 Hücresi"
              ? "N602+N603 → ROB109"
              : `${source.replace(" Hücresi", "")} → ${target.replace(" Hücresi", "")}`}
          </span>
        </div>
      </td>
      {days.map((d) => {
        const dateKey = toDayKey(d);
        const day = d.getDay();
        const isWeekend = day === 0 || day === 6;
        const isToday = dateKey === todayKey;

        // Find matching WIP stock record
        const match = wipStock.find(
          (w) => w.tarih === dateKey && w.kaynak_hucresi === source && w.hedef_hucresi === target
        );
        const value =
          match !== undefined
            ? match.override_edildi && match.gercek_adet !== null
              ? match.gercek_adet
              : match.hesaplanan_adet
            : null;

        const isPastWorkday = !isWeekend && dateKey <= todayKey;
        const isStarved = isPastWorkday && value === 0;

        return (
          <td
            key={dateKey}
            className={`px-1 py-1.5 text-center transition-all border-r border-zinc-100/40 ${
              isWeekend ? "w-[50px] min-w-[50px] bg-zinc-100/10 text-zinc-400" : "w-[75px] min-w-[75px]"
            } ${isToday ? "border-l border-r border-blue-500/20 bg-blue-50/5" : ""} ${
              isStarved ? "text-orange-600 font-bold bg-orange-50/60" : ""
            }`}
          >
            {value !== null ? formatNumber(value) : "—"}
          </td>
        );
      })}
    </tr>
  );
}
