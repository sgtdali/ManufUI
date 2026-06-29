"use client";

import { Database, Clock, Terminal, Palette, Check, Copy } from "lucide-react";
import type { WizardState, TriggerEvent } from "./constants";
import { MANUF_TABLES, CRON_PRESETS, DATE_RANGES, CARD_COLORS } from "./constants";

type SetWizard = React.Dispatch<React.SetStateAction<WizardState>>;

export function WizardStep1({ wizard, setWizard }: { wizard: WizardState; setWizard: SetWizard }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">Otomasyonun ne zaman tetiklenecegini secin.</p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { type: "trigger" as const, icon: <Database className="h-5 w-5" />, title: "Veritabani Olayi", desc: "Tabloda INSERT/UPDATE/DELETE oldugunda" },
          { type: "cron" as const, icon: <Clock className="h-5 w-5" />, title: "Zamanlanmis (Cron)", desc: "Belirli bir saatte/gunde otomatik calisir" },
        ].map((opt) => (
          <button key={opt.type}
            onClick={() => setWizard((w) => ({ ...w, triggerType: opt.type }))}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              wizard.triggerType === opt.type
                ? "border-indigo-400 bg-indigo-50 shadow-sm"
                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
            }`}>
            <div className={`mb-2 ${wizard.triggerType === opt.type ? "text-indigo-600" : "text-zinc-400"}`}>
              {opt.icon}
            </div>
            <p className="text-xs font-bold text-zinc-800">{opt.title}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>

      <div>
        <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Kaynak Tablo</label>
        <select value={wizard.sourceTable}
          onChange={(e) => setWizard((w) => ({ ...w, sourceTable: e.target.value, selectedColumns: [] }))}
          className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer">
          <option value="">Tablo secin...</option>
          {MANUF_TABLES.map((t) => (
            <option key={t.value} value={t.value}>{t.label} ({t.value})</option>
          ))}
        </select>
      </div>

      {wizard.triggerType === "trigger" && (
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Tetikleme Olaylari</label>
          <div className="flex gap-2">
            {(["INSERT", "UPDATE", "DELETE"] as TriggerEvent[]).map((ev) => (
              <button key={ev}
                onClick={() => setWizard((w) => ({
                  ...w,
                  triggerEvents: w.triggerEvents.includes(ev)
                    ? w.triggerEvents.filter((e) => e !== ev)
                    : [...w.triggerEvents, ev],
                }))}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  wizard.triggerEvents.includes(ev)
                    ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                }`}>
                {ev}
              </button>
            ))}
          </div>
        </div>
      )}

      {wizard.triggerType === "cron" && (
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Zamanlama</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {CRON_PRESETS.map((p) => (
              <button key={p.value}
                onClick={() => setWizard((w) => ({ ...w, cronSchedule: p.value }))}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                  wizard.cronSchedule === p.value
                    ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                    : "bg-white text-zinc-500 border-zinc-200"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input value={wizard.cronSchedule}
              onChange={(e) => setWizard((w) => ({ ...w, cronSchedule: e.target.value }))}
              placeholder="0 5 * * *"
              className="w-48 h-8 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
            <span className="text-[9px] text-zinc-400">UTC saat dilimi</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function WizardStep2({
  wizard, setWizard, loadingColumns, tableColumns,
}: {
  wizard: WizardState;
  setWizard: SetWizard;
  loadingColumns: boolean;
  tableColumns: { column_name: string; data_type: string }[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        <strong className="text-zinc-700">{MANUF_TABLES.find((t) => t.value === wizard.sourceTable)?.label}</strong> tablosundan hangi sutunlar gonderilecek?
      </p>

      {loadingColumns ? (
        <div className="flex items-center gap-2 py-4 text-zinc-400">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Sutunlar yukleniyor...</span>
        </div>
      ) : tableColumns.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-zinc-400">Sutun bilgisi bulunamadi. RPC fonksiyonunun kurulu oldugundan emin olun.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {tableColumns.map((col) => (
            <label key={col.column_name}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                wizard.selectedColumns.includes(col.column_name)
                  ? "bg-indigo-50 border-indigo-300 text-zinc-800"
                  : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
              }`}>
              <input type="checkbox"
                checked={wizard.selectedColumns.includes(col.column_name)}
                onChange={() => setWizard((w) => ({
                  ...w,
                  selectedColumns: w.selectedColumns.includes(col.column_name)
                    ? w.selectedColumns.filter((c) => c !== col.column_name)
                    : [...w.selectedColumns, col.column_name],
                }))}
                className="accent-indigo-600 cursor-pointer" />
              <span className="font-mono text-[11px]">{col.column_name}</span>
              <span className="text-[9px] text-zinc-400 ml-auto">{col.data_type}</span>
            </label>
          ))}
        </div>
      )}

      {wizard.triggerType === "cron" && tableColumns.length > 0 && (
        <div className="pt-2 border-t border-zinc-100">
          <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Tarih Filtresi (opsiyonel)</label>
          <div className="flex flex-wrap gap-2">
            <select value={wizard.dateFilterColumn}
              onChange={(e) => setWizard((w) => ({ ...w, dateFilterColumn: e.target.value }))}
              className="h-8 px-2 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none cursor-pointer">
              <option value="">Filtre yok</option>
              {tableColumns.filter((c) => c.data_type.includes("date") || c.data_type.includes("timestamp")).map((c) => (
                <option key={c.column_name} value={c.column_name}>{c.column_name}</option>
              ))}
            </select>
            {wizard.dateFilterColumn && (
              <div className="flex gap-1.5">
                {DATE_RANGES.map((r) => (
                  <button key={r.value}
                    onClick={() => setWizard((w) => ({ ...w, dateFilterRange: r.value }))}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer transition-all ${
                      wizard.dateFilterRange === r.value
                        ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                        : "bg-white text-zinc-500 border-zinc-200"
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function WizardStep3({ wizard, setWizard }: { wizard: WizardState; setWizard: SetWizard }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">Verinin gonderilecegi hedef ve format.</p>

      <div>
        <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Webhook URL</label>
        <input type="url" value={wizard.webhookUrl}
          onChange={(e) => setWizard((w) => ({ ...w, webhookUrl: e.target.value }))}
          placeholder="https://..."
          className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono placeholder-zinc-400" />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Gonderim Formati</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { type: "teams_adaptive_card" as const, icon: <Palette className="h-4 w-4" />, title: "Teams Adaptive Card", desc: "Microsoft Teams bildirim karti" },
            { type: "plain_json" as const, icon: <Terminal className="h-4 w-4" />, title: "Plain JSON", desc: "Ham JSON veri paketi" },
          ].map((opt) => (
            <button key={opt.type}
              onClick={() => setWizard((w) => ({ ...w, payloadFormat: opt.type }))}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                wizard.payloadFormat === opt.type
                  ? "border-indigo-400 bg-indigo-50 shadow-sm"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}>
              <div className={`mb-1.5 ${wizard.payloadFormat === opt.type ? "text-indigo-600" : "text-zinc-400"}`}>{opt.icon}</div>
              <p className="text-xs font-bold text-zinc-800">{opt.title}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {wizard.payloadFormat === "teams_adaptive_card" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Kart Basligi</label>
            <input value={wizard.cardTitle}
              onChange={(e) => setWizard((w) => ({ ...w, cardTitle: e.target.value }))}
              placeholder="Bildirim Basligi"
              className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 placeholder-zinc-400" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Renk</label>
            <div className="flex gap-1.5">
              {CARD_COLORS.map((c) => (
                <button key={c.value}
                  onClick={() => setWizard((w) => ({ ...w, cardColor: c.value }))}
                  title={c.label}
                  className={`h-8 w-8 rounded-lg border-2 transition-all cursor-pointer ${
                    wizard.cardColor === c.value ? "border-zinc-800 scale-110 shadow-sm" : "border-zinc-200 hover:border-zinc-400"
                  }`}
                  style={{ backgroundColor: c.color }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function WizardStep4({
  wizard, setWizard, sqlPreview, onCopySql, sqlCopied,
}: {
  wizard: WizardState;
  setWizard: SetWizard;
  sqlPreview: string;
  onCopySql: () => void;
  sqlCopied: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Otomasyon ID</label>
          <input value={wizard.automationId}
            onChange={(e) => setWizard((w) => ({ ...w, automationId: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") }))}
            placeholder="ornek_id"
            className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Otomasyon Adi</label>
          <input value={wizard.automationName}
            onChange={(e) => setWizard((w) => ({ ...w, automationName: e.target.value }))}
            placeholder="Bildirim Adi"
            className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 placeholder-zinc-400" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Aciklama</label>
        <input value={wizard.description}
          onChange={(e) => setWizard((w) => ({ ...w, description: e.target.value }))}
          placeholder="Bu otomasyon ne yapar, nereden veri alir..."
          className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 placeholder-zinc-400" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">SQL Onizleme</label>
          <button onClick={onCopySql}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-md cursor-pointer transition-colors">
            {sqlCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            {sqlCopied ? "Kopyalandi" : "Kopyala"}
          </button>
        </div>
        <pre className="bg-zinc-900 border border-zinc-200 rounded-lg p-3 text-[11px] text-zinc-300 font-mono max-h-64 overflow-auto whitespace-pre-wrap select-all leading-relaxed">
          {sqlPreview}
        </pre>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px]">
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">
          {wizard.triggerType === "cron" ? `Cron: ${wizard.cronSchedule}` : `Trigger: ${wizard.triggerEvents.join("/")}`}
        </span>
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">
          Tablo: {wizard.sourceTable}
        </span>
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">
          {wizard.selectedColumns.length} sutun
        </span>
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">
          {wizard.payloadFormat === "teams_adaptive_card" ? "Teams Card" : "JSON"}
        </span>
      </div>
    </div>
  );
}
