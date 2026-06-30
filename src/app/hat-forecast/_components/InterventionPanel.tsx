"use client";

import { useState } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { FORECAST_CELLS, ForecastCell } from "../_actions/actions";
import { InterventionMap, Intervention } from "./forecastUtils";

type Props = {
  interventions: InterventionMap;
  onSetIntervention: (tarih: string, bolum: string, iv: Intervention | null) => void;
  today: string;
};

const CELL_LABELS: Record<string, string> = {};
for (const c of FORECAST_CELLS) CELL_LABELS[c] = c.replace(" Hücresi", "");

export default function InterventionPanel({ interventions, onSetIntervention, today }: Props) {
  const [addDate, setAddDate] = useState("");
  const [addCell, setAddCell] = useState<string>(FORECAST_CELLS[0]);
  const [addType, setAddType] = useState<"disabled" | "extra">("extra");
  const [addHours, setAddHours] = useState<number>(2);

  function handleAdd() {
    if (!addDate) return;
    const iv: Intervention = addType === "disabled" ? { disabled: true } : { extraHours: addHours };
    onSetIntervention(addDate, addCell, iv);
    setAddDate("");
  }

  // Flatten all interventions to display list
  const entries: { tarih: string; bolum: string; iv: Intervention }[] = [];
  for (const [tarih, cells] of Object.entries(interventions)) {
    for (const [bolum, iv] of Object.entries(cells)) {
      entries.push({ tarih, bolum, iv });
    }
  }
  entries.sort((a, b) => a.tarih.localeCompare(b.tarih) || a.bolum.localeCompare(b.bolum));

  return (
    <div className="flex flex-col gap-4">
      {/* Add form */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
          <Plus size={14} className="text-emerald-400" />
          Müdahale Ekle
        </h4>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 uppercase">Tarih</label>
            <input
              type="date"
              value={addDate}
              min={today}
              onChange={(e) => setAddDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 uppercase">Hücre</label>
            <select
              value={addCell}
              onChange={(e) => setAddCell(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600"
            >
              {FORECAST_CELLS.map((c) => (
                <option key={c} value={c}>{CELL_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 uppercase">Tür</label>
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as "disabled" | "extra")}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600"
            >
              <option value="extra">Mesai (+saat)</option>
              <option value="disabled">Çalışmıyor</option>
            </select>
          </div>
          {addType === "extra" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 uppercase">Ekstra Saat</label>
              <input
                type="number"
                min={0.5}
                max={16}
                step={0.5}
                value={addHours}
                onChange={(e) => setAddHours(parseFloat(e.target.value))}
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 w-20 focus:outline-none focus:border-emerald-600"
              />
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={!addDate}
            className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Ekle
          </button>
        </div>
      </div>

      {/* List */}
      {entries.length === 0 ? (
        <p className="text-zinc-600 text-sm italic">Henüz müdahale yok. Eklemek için yukarıdaki formu kullan.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map(({ tarih, bolum, iv }) => (
            <div
              key={`${tarih}-${bolum}`}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                iv.disabled
                  ? "border-red-800/50 bg-red-950/20 text-red-300"
                  : "border-emerald-800/50 bg-emerald-950/20 text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-zinc-300">
                  {new Date(`${tarih}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                </span>
                <span className="text-zinc-400">{CELL_LABELS[bolum] ?? bolum}</span>
                <span className={iv.disabled ? "text-red-400" : "text-emerald-400"}>
                  {iv.disabled ? "✕ Çalışmıyor" : `+${iv.extraHours}sa mesai`}
                </span>
              </div>
              <button
                onClick={() => onSetIntervention(tarih, bolum, null)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
