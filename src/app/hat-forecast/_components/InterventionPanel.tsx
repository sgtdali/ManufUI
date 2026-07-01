"use client";

import { useState, useMemo } from "react";
import { Plus, X, Pencil, Check } from "lucide-react";
import { FORECAST_CELLS } from "../_lib/constants";
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

  // Edit states
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editType, setEditType] = useState<"disabled" | "extra">("extra");
  const [editHours, setEditHours] = useState<number>(2);

  function handleAdd() {
    if (!addDate) return;
    const iv: Intervention = addType === "disabled" ? { disabled: true } : { extraHours: addHours };
    onSetIntervention(addDate, addCell, iv);
    setAddDate("");
  }

  function startEdit(tarih: string, bolum: string, iv: Intervention) {
    setEditingKey(`${tarih}-${bolum}`);
    setEditType(iv.disabled ? "disabled" : "extra");
    setEditHours(iv.extraHours ?? 2);
  }

  function saveEdit(tarih: string, bolum: string) {
    const iv: Intervention = editType === "disabled" ? { disabled: true } : { extraHours: editHours };
    onSetIntervention(tarih, bolum, iv);
    setEditingKey(null);
  }

  // Flatten all interventions
  const entries = useMemo(() => {
    const list: { tarih: string; bolum: string; iv: Intervention }[] = [];
    for (const [tarih, cells] of Object.entries(interventions)) {
      for (const [bolum, iv] of Object.entries(cells)) {
        list.push({ tarih, bolum, iv });
      }
    }
    list.sort((a, b) => a.tarih.localeCompare(b.tarih) || a.bolum.localeCompare(b.bolum));
    return list;
  }, [interventions]);

  // Group entries by bolum
  const groupedEntries = useMemo(() => {
    const groups: Record<string, typeof entries> = {};
    for (const entry of entries) {
      if (!groups[entry.bolum]) groups[entry.bolum] = [];
      groups[entry.bolum].push(entry);
    }
    return groups;
  }, [entries]);

  const activeCells = useMemo(() => {
    return FORECAST_CELLS.filter(cell => groupedEntries[cell] && groupedEntries[cell].length > 0);
  }, [groupedEntries]);

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

      {/* Grouped List */}
      {activeCells.length === 0 ? (
        <p className="text-zinc-600 text-sm italic">Henüz müdahale yok. Eklemek için yukarıdaki formu kullan.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeCells.map((cell) => (
            <div key={cell} className="bg-zinc-850/40 border border-zinc-800 rounded-lg p-3.5 flex flex-col gap-2.5">
              <h5 className="text-xs font-semibold text-emerald-400 border-b border-zinc-800 pb-1.5 tracking-wider uppercase">
                {CELL_LABELS[cell]}
              </h5>
              <div className="flex flex-col gap-2">
                {groupedEntries[cell].map(({ tarih, bolum, iv }) => {
                  const key = `${tarih}-${bolum}`;
                  const isEditing = editingKey === key;

                  if (isEditing) {
                    return (
                      <div
                        key={key}
                        className="flex flex-col gap-2 p-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs"
                      >
                        <div className="flex items-center justify-between text-zinc-400 font-medium">
                          <span>
                            {new Date(`${tarih}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as "disabled" | "extra")}
                            className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-600 flex-1"
                          >
                            <option value="extra">Mesai (+saat)</option>
                            <option value="disabled">Çalışmıyor</option>
                          </select>
                          {editType === "extra" && (
                            <input
                              type="number"
                              min={0.5}
                              max={16}
                              step={0.5}
                              value={editHours}
                              onChange={(e) => setEditHours(parseFloat(e.target.value))}
                              className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-200 w-16 focus:outline-none focus:border-emerald-600 text-center font-semibold"
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-1 border-t border-zinc-700/50 pt-2">
                          <button
                            onClick={() => setEditingKey(null)}
                            className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-650 text-zinc-300 transition-colors font-medium"
                          >
                            Vazgeç
                          </button>
                          <button
                            onClick={() => saveEdit(tarih, bolum)}
                            className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white transition-colors font-medium flex items-center gap-1"
                          >
                            <Check size={12} />
                            Kaydet
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${
                        iv.disabled
                          ? "border-red-900/40 bg-red-950/15 text-red-300"
                          : "border-emerald-900/40 bg-emerald-950/15 text-emerald-300"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-zinc-300">
                          {new Date(`${tarih}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                        </span>
                        <span className={`text-[10px] ${iv.disabled ? "text-red-400" : "text-emerald-400"}`}>
                          {iv.disabled ? "✕ Çalışmıyor" : `+${iv.extraHours}sa mesai`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(tarih, bolum, iv)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded hover:bg-zinc-800/50"
                          title="Düzenle"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => onSetIntervention(tarih, bolum, null)}
                          className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-zinc-800/50"
                          title="Sil"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
