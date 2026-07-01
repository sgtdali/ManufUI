"use client";

import { FORECAST_CELLS } from "../_lib/constants";
import { X, Calendar } from "lucide-react";

type Props = {
  cutoffDates: Record<string, string>;
  onSetCutoffDate: (bolum: string, dateStr: string | null) => void;
  today: string;
};

const CELL_LABELS: Record<string, string> = {};
for (const c of FORECAST_CELLS) CELL_LABELS[c] = c.replace(" Hücresi", "");

export default function CutoffPanel({ cutoffDates, onSetCutoffDate, today }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-zinc-200 mb-2">Hücre Bazlı Üretim Kapanış Tarihleri</h3>
        <p className="text-xs text-zinc-500 leading-relaxed mb-4">
          Her hücre için üretimin duracağı tarihi belirleyebilirsiniz. Belirtilen tarihten sonraki günlerde o hücrede 
          üretim yapılmayacak (kapasite 0 olacak) ve o an hücrenin girişinde biriken tüm WIP (yarı mamul) olduğu gibi 
          kalacaktır. Hücre kapanana kadar ürettiği parçalar ise sonraki hücreler tarafından kendi wıp'leri olarak 
          tüketilmeye devam eder.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {FORECAST_CELLS.map((cell) => {
            const dateVal = cutoffDates[cell] || "";
            const isPres = cell === "Pres Hücresi";
            const fallbackText = isPres ? "Varsayılan: 2026-07-09" : "Sınırsız (WIP bitene kadar)";

            return (
              <div
                key={cell}
                className="bg-zinc-800/40 border border-zinc-800/80 rounded-lg p-3 flex flex-col justify-between gap-2.5 hover:border-zinc-700/60 transition-all"
              >
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    {CELL_LABELS[cell]}
                  </h4>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    {isPres ? "İlk Üretim İstasyonu" : "Ara/Son İstasyon"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={dateVal}
                      min={today}
                      placeholder={fallbackText}
                      onChange={(e) => onSetCutoffDate(cell, e.target.value || null)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 pr-8 text-xs text-zinc-200 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/50 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                      <Calendar size={13} />
                    </div>
                  </div>

                  {dateVal && (
                    <button
                      onClick={() => onSetCutoffDate(cell, null)}
                      className="p-1.5 rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-750 text-zinc-400 hover:text-red-400 transition-colors"
                      title="Kapanış Tarihini Kaldır"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="text-[10px]">
                  {dateVal ? (
                    <span className="text-emerald-400/90 font-medium">
                      Kapanış: {new Date(`${dateVal}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  ) : (
                    <span className="text-zinc-600 italic">
                      {fallbackText}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
