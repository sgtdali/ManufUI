"use client";

import { Plus, Wrench } from "lucide-react";

type ManualFormData = {
  id: string;
  type: "cron" | "trigger";
  name: string;
  schedule: string;
  source_event: string;
  target_function: string;
  webhook_url: string;
  description: string;
};

export function ManualForm({
  manualForm,
  setManualForm,
  onCreateManual,
  creatingManual,
}: {
  manualForm: ManualFormData;
  setManualForm: (form: ManualFormData) => void;
  onCreateManual: () => void;
  creatingManual: boolean;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-5 shadow-sm">
      <h3 className="text-xs font-bold text-zinc-600 mb-3 flex items-center gap-1.5">
        <Wrench className="h-3.5 w-3.5" /> Manuel Entegrasyon Tanimlama
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">ID</label>
          <input value={manualForm.id}
            onChange={(e) => setManualForm({ ...manualForm, id: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
            placeholder="ornek_id"
            className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Ad</label>
          <input value={manualForm.name}
            onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
            placeholder="Otomasyon Adi"
            className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 placeholder-zinc-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Tip</label>
          <select value={manualForm.type}
            onChange={(e) => setManualForm({ ...manualForm, type: e.target.value as "cron" | "trigger" })}
            className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none cursor-pointer">
            <option value="trigger">Trigger</option>
            <option value="cron">Cron</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Hedef Fonksiyon</label>
          <input value={manualForm.target_function}
            onChange={(e) => setManualForm({ ...manualForm, target_function: e.target.value })}
            placeholder="func_name()"
            className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Webhook URL</label>
          <input value={manualForm.webhook_url}
            onChange={(e) => setManualForm({ ...manualForm, webhook_url: e.target.value })}
            placeholder="https://..."
            className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Aciklama</label>
          <input value={manualForm.description}
            onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
            placeholder="Aciklama..."
            className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 placeholder-zinc-400" />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={onCreateManual} disabled={creatingManual}
          className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> {creatingManual ? "Ekleniyor..." : "Manuel Ekle"}
        </button>
      </div>
    </div>
  );
}
