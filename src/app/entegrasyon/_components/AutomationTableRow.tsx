"use client";

import {
  Clock, Link2, Terminal, Database,
  ChevronDown, ChevronRight, Zap,
  Send, Save, Trash2,
} from "lucide-react";
import type { ManufAutomation } from "../../actions";

export function AutomationTableRow({
  item, isExpanded, onToggleExpand,
  editingUrls, editingSchedules, editingDescriptions,
  onUrlChange, onScheduleChange, onDescriptionChange,
  onSave, onToggle, onDelete, onTriggerNow,
  savingId, triggeringId, deletingId, isReadOnly,
}: {
  item: ManufAutomation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  editingUrls: Record<string, string>;
  editingSchedules: Record<string, string>;
  editingDescriptions: Record<string, string>;
  onUrlChange: (id: string, value: string) => void;
  onScheduleChange: (id: string, value: string) => void;
  onDescriptionChange: (id: string, value: string) => void;
  onSave: (id: string, type: "cron" | "trigger") => void;
  onToggle: (id: string, currentActive: boolean) => void;
  onDelete: (id: string) => void;
  onTriggerNow: (id: string) => void;
  savingId: string | null;
  triggeringId: string | null;
  deletingId: string | null;
  isReadOnly: boolean;
}) {
  const isCron = item.type === "cron";
  const isSaving = savingId === item.id;
  const isTriggering = triggeringId === item.id;
  const isDeleting = deletingId === item.id;
  const webhookShort = item.webhook_url
    ? item.webhook_url.length > 40 ? item.webhook_url.slice(0, 40) + "..." : item.webhook_url
    : null;

  return (
    <div className="border-b border-zinc-100 last:border-b-0">
      <div onClick={onToggleExpand}
        className={`grid grid-cols-1 sm:grid-cols-[2fr_1fr_2fr_1.5fr_auto] gap-2 sm:gap-4 px-5 py-3 items-center cursor-pointer hover:bg-zinc-50 transition-colors ${isExpanded ? "bg-zinc-50" : ""}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-800 truncate">{item.name}</p>
            <p className="text-[10px] text-zinc-400 font-mono truncate">{item.id}</p>
          </div>
        </div>
        <div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
            isCron ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {isCron ? <Clock className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
            {isCron ? "Cron" : "Trigger"}
          </span>
          {isCron && item.schedule && <span className="text-[9px] text-zinc-400 font-mono ml-1.5">{item.schedule}</span>}
          {!isCron && item.source_event && <span className="text-[9px] text-zinc-400 font-mono ml-1.5 hidden lg:inline">{item.source_event}</span>}
        </div>
        <div className="hidden sm:block">
          <span className="text-[11px] text-zinc-500 font-mono truncate block">{item.target_function}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 min-w-0">
          {webhookShort ? (
            <><Link2 className="h-3 w-3 text-emerald-500 shrink-0" /><span className="text-[10px] text-zinc-400 font-mono truncate">{webhookShort}</span></>
          ) : (
            <span className="text-[10px] text-zinc-300 italic">Tanimsiz</span>
          )}
        </div>
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onToggle(item.id, item.is_active)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${item.is_active ? "bg-emerald-500" : "bg-zinc-300"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${item.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 pt-1 bg-zinc-50 border-t border-zinc-100">
          <div className="flex flex-wrap items-center gap-2 mb-4 py-2.5 px-3 bg-white rounded-lg border border-zinc-200">
            <div className="flex items-center gap-1.5">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isCron ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"}`}>
                {isCron ? <Clock className="h-3 w-3" /> : <Database className="h-3 w-3" />}
              </div>
              <span className="text-[10px] font-semibold text-zinc-600 font-mono">
                {isCron ? editingSchedules[item.id] || item.schedule : item.source_event}
              </span>
            </div>
            <span className="text-zinc-300 text-xs">&rarr;</span>
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><Terminal className="h-3 w-3" /></div>
              <span className="text-[10px] font-semibold text-zinc-600 font-mono">{item.target_function}</span>
            </div>
            <span className="text-zinc-300 text-xs">&rarr;</span>
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Link2 className="h-3 w-3" /></div>
              <span className="text-[10px] font-semibold text-zinc-600">{editingUrls[item.id] ? "Webhook" : "Tanimsiz"}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Webhook URL</label>
              <input type="url" value={editingUrls[item.id] || ""}
                onChange={(e) => onUrlChange(item.id, e.target.value)}
                placeholder="https://..."
                className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono placeholder-zinc-400" />
            </div>
            {isCron && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Cron Zamanlama</label>
                <div className="flex items-center gap-3">
                  <input value={editingSchedules[item.id] || ""}
                    onChange={(e) => onScheduleChange(item.id, e.target.value)}
                    placeholder="0 5 * * *"
                    className="w-40 h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
                  <span className="text-[10px] text-zinc-400">UTC saat dilimi</span>
                </div>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Aciklama</label>
              <textarea value={editingDescriptions[item.id] || ""}
                onChange={(e) => onDescriptionChange(item.id, e.target.value)}
                rows={2} placeholder="Aciklama..."
                className="w-full px-3 py-2 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed placeholder-zinc-400" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 text-[10px] text-zinc-400">
              <span>Son guncelleme: {new Date(item.updated_at).toLocaleString("tr-TR")}</span>
              <button onClick={() => onDelete(item.id)} disabled={isDeleting}
                className="text-red-400 hover:text-red-600 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50">
                <Trash2 className="h-3 w-3" /> {isDeleting ? "Siliniyor..." : "Sil"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {isCron && (
                <button onClick={() => onTriggerNow(item.id)} disabled={isTriggering || isSaving}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50">
                  <Send className="h-3 w-3" /> {isTriggering ? "Tetikleniyor..." : "Test"}
                </button>
              )}
              <button onClick={() => onSave(item.id, item.type)} disabled={isSaving || isTriggering}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> {isSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
