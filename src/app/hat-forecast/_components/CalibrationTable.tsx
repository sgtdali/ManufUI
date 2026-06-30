"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SlotActual, FORECAST_CELLS } from "../_lib/constants";
import { slotKey, SlotKey } from "./forecastUtils";

type Props = {
  actuals: SlotActual[];
  selectedSlots: Set<SlotKey>;
  onToggleSlot: (key: SlotKey) => void;
  cellAverages: Record<string, number>;
};

function fmtDate(d: string) {
  const dt = new Date(`${d}T00:00:00`);
  return dt.toLocaleDateString("tr-TR", { weekday: "short", day: "2-digit", month: "short" });
}

function fmtNum(n: number) {
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

export default function CalibrationTable({ actuals, selectedSlots, onToggleSlot, cellAverages }: Props) {
  // Group actuals: date → cell → slot[]
  const grouped = useMemo(() => {
    const byDate: Record<string, Record<string, SlotActual[]>> = {};
    for (const s of actuals) {
      if (!byDate[s.tarih]) byDate[s.tarih] = {};
      if (!byDate[s.tarih][s.bolum]) byDate[s.tarih][s.bolum] = [];
      byDate[s.tarih][s.bolum].push(s);
    }
    return byDate;
  }, [actuals]);

  const dates = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // Collect all unique time slots per date-cell combination (for row count)
  const allZamanDilimleri = useMemo(() => {
    const set = new Set<string>();
    for (const s of actuals) set.add(s.zamanDilimi);
    // Sort by sira_no implicitly via label
    return Array.from(set).sort();
  }, [actuals]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleDay(d: string) {
    setCollapsed((p) => ({ ...p, [d]: !p[d] }));
  }

  // Select/deselect all slots for a day
  function toggleDay_slots(date: string, select: boolean) {
    const slots = actuals.filter((s) => s.tarih === date);
    for (const s of slots) {
      const k = slotKey(s.bolum, s.tarih, s.zamanDilimi);
      const has = selectedSlots.has(k);
      if (select && !has) onToggleSlot(k);
      if (!select && has) onToggleSlot(k);
    }
  }

  // Select/deselect all slots for a cell
  function toggleCell_slots(cell: string, select: boolean) {
    const slots = actuals.filter((s) => s.bolum === cell);
    for (const s of slots) {
      const k = slotKey(s.bolum, s.tarih, s.zamanDilimi);
      const has = selectedSlots.has(k);
      if (select && !has) onToggleSlot(k);
      if (!select && has) onToggleSlot(k);
    }
  }

  const selectedCount = selectedSlots.size;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-zinc-400">
          {selectedCount} saat seçili · Saatlik ortalama bu seçimden hesaplanır
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { for (const s of actuals) { const k = slotKey(s.bolum, s.tarih, s.zamanDilimi); if (!selectedSlots.has(k)) onToggleSlot(k); } }}
            className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
          >Tümünü Seç</button>
          <button
            onClick={() => { for (const s of actuals) { const k = slotKey(s.bolum, s.tarih, s.zamanDilimi); if (selectedSlots.has(k)) onToggleSlot(k); } }}
            className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
          >Tümünü Kaldır</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="min-w-full text-xs text-zinc-300 border-collapse">
          <thead>
            <tr className="bg-zinc-800 border-b border-zinc-700">
              <th className="sticky left-0 z-10 bg-zinc-800 px-3 py-2 text-left font-semibold text-zinc-400 min-w-[160px]">
                Tarih / Saat
              </th>
              {FORECAST_CELLS.map((cell) => (
                <th key={cell} className="px-2 py-2 text-center font-semibold text-zinc-400 min-w-[90px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="leading-tight">{cell.replace(" Hücresi", "").replace("-111", "-111")}</span>
                    <div className="flex gap-1 mt-0.5">
                      <button onClick={() => toggleCell_slots(cell, true)} className="text-[10px] text-emerald-400 hover:text-emerald-300">↑Tüm</button>
                      <button onClick={() => toggleCell_slots(cell, false)} className="text-[10px] text-zinc-500 hover:text-zinc-400">↓Sıfır</button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Average row */}
            <tr className="bg-zinc-900 border-b-2 border-zinc-600 sticky top-0 z-10">
              <td className="sticky left-0 z-10 bg-zinc-900 px-3 py-2 font-semibold text-amber-400">
                Saatlik Ort.
              </td>
              {FORECAST_CELLS.map((cell) => (
                <td key={cell} className="px-2 py-2 text-center font-bold text-amber-300">
                  {fmtNum(cellAverages[cell] ?? 0)}
                  <span className="text-zinc-500 font-normal ml-0.5">/sa</span>
                </td>
              ))}
            </tr>
            <tr className="bg-zinc-900 border-b border-zinc-700">
              <td className="sticky left-0 z-10 bg-zinc-900 px-3 py-1.5 text-zinc-500 italic text-[10px]">
                Günlük projeksiyon (×9sa)
              </td>
              {FORECAST_CELLS.map((cell) => (
                <td key={cell} className="px-2 py-1.5 text-center text-zinc-400 text-[11px]">
                  {Math.round((cellAverages[cell] ?? 0) * 9)}
                </td>
              ))}
            </tr>

            {/* Per-day rows */}
            {dates.map((date) => {
              const isCollapsed = collapsed[date] ?? false;
              const daySlots = actuals.filter((s) => s.tarih === date);
              const selectedInDay = daySlots.filter((s) => selectedSlots.has(slotKey(s.bolum, s.tarih, s.zamanDilimi))).length;
              const allSelected = selectedInDay === daySlots.length;

              // Unique time slots for this day
              const dayZamanDilimleri = Array.from(
                new Set(actuals.filter((s) => s.tarih === date).map((s) => s.zamanDilimi))
              ).sort();

              return [
                // Day header row
                <tr key={`day-${date}`} className="bg-zinc-800/80 border-t border-zinc-700 cursor-pointer hover:bg-zinc-800"
                  onClick={() => toggleDay(date)}
                >
                  <td className="sticky left-0 z-10 bg-zinc-800/90 px-3 py-2 font-semibold text-zinc-200">
                    <div className="flex items-center gap-2">
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      <span>{fmtDate(date)}</span>
                      <span className="text-[10px] text-zinc-500">({selectedInDay}/{daySlots.length} seçili)</span>
                    </div>
                  </td>
                  {FORECAST_CELLS.map((cell) => {
                    const cellDay = grouped[date]?.[cell] ?? [];
                    const dayTotal = cellDay.reduce((a, s) => a + s.uretimAdeti, 0);
                    const cellSelected = cellDay.filter((s) => selectedSlots.has(slotKey(s.bolum, s.tarih, s.zamanDilimi))).length;
                    return (
                      <td key={cell} className="px-2 py-2 text-center text-zinc-400">
                        <span className="font-semibold text-zinc-300">{dayTotal}</span>
                        {cellDay.length > 0 && (
                          <span className="text-[10px] text-zinc-600 ml-1">({cellSelected}/{cellDay.length})</span>
                        )}
                      </td>
                    );
                  })}
                </tr>,

                // Slot rows (when expanded)
                ...(!isCollapsed ? dayZamanDilimleri.map((zaman) => (
                  <tr key={`${date}-${zaman}`} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="sticky left-0 z-10 bg-zinc-900 px-3 py-1.5 text-zinc-500 pl-8">
                      {zaman}
                    </td>
                    {FORECAST_CELLS.map((cell) => {
                      const slot = grouped[date]?.[cell]?.find((s) => s.zamanDilimi === zaman);
                      if (!slot) {
                        return <td key={cell} className="px-2 py-1.5 text-center text-zinc-700">—</td>;
                      }
                      const key = slotKey(cell, date, zaman);
                      const checked = selectedSlots.has(key);
                      return (
                        <td key={cell} className="px-1.5 py-1.5 text-center">
                          <label className="flex flex-col items-center gap-0.5 cursor-pointer group">
                            <div className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onToggleSlot(key)}
                                className="accent-emerald-500 w-3 h-3"
                              />
                              <span className={`font-semibold ${checked ? "text-zinc-200" : "text-zinc-500"}`}>
                                {slot.uretimAdeti}
                              </span>
                            </div>
                            {slot.downtimeDk > 0 && (
                              <span
                                className="text-[9px] text-amber-500 leading-tight max-w-[80px] truncate"
                                title={slot.downtimeTurler.join(" · ")}
                              >
                                {slot.downtimeTurler[0]}{slot.downtimeTurler.length > 1 ? ` +${slot.downtimeTurler.length - 1}` : ""}
                              </span>
                            )}
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                )) : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
