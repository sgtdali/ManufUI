"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Wrench } from "lucide-react";
import { formatDate } from "../utils";
import type { ToolChangeItem } from "../types";

type Props = {
  toolChanges: ToolChangeItem[];
  onSaveToolChange: (tarih: string, machine: "ETM-1" | "ETM-2", toolType: "cutting_insert" | "drill_bit", description: string) => Promise<void>;
  onDeleteToolChange: (tarih: string, machine: "ETM-1" | "ETM-2", toolType: "cutting_insert" | "drill_bit") => Promise<void>;
};

export function EtmToolsSidebar({ toolChanges, onSaveToolChange, onDeleteToolChange }: Props) {
  const [tarih, setTarih] = useState(new Date().toISOString().split("T")[0]);
  const [machine, setMachine] = useState<"ETM-1" | "ETM-2">("ETM-1");
  const [toolType, setToolType] = useState<"cutting_insert" | "drill_bit">("cutting_insert");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarih) return;
    setIsSubmitting(true);
    try {
      await onSaveToolChange(tarih, machine, toolType, description);
      setDescription("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Tool change logger form */}
      <form onSubmit={handleSubmit} className="space-y-3 border-b border-zinc-150 pb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Yeni Takım Değişimi</h3>
        
        <div className="flex flex-col gap-1">
          <label htmlFor="tools-tarih" className="text-[10px] font-bold text-zinc-500">Değişim Tarihi</label>
          <input
            id="tools-tarih"
            type="date"
            required
            className="text-xs border border-zinc-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-zinc-800"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="tools-machine" className="text-[10px] font-bold text-zinc-500">Makine</label>
            <select
              id="tools-machine"
              className="text-xs border border-zinc-200 rounded p-1.5 focus:outline-none bg-white cursor-pointer text-zinc-800"
              value={machine}
              onChange={(e) => setMachine(e.target.value as "ETM-1" | "ETM-2")}
            >
              <option value="ETM-1">ETM-1</option>
              <option value="ETM-2">ETM-2</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="tools-type" className="text-[10px] font-bold text-zinc-500">Takım Tipi</label>
            <select
              id="tools-type"
              className="text-xs border border-zinc-200 rounded p-1.5 focus:outline-none bg-white cursor-pointer text-zinc-800"
              value={toolType}
              onChange={(e) => setToolType(e.target.value as "cutting_insert" | "drill_bit")}
            >
              <option value="cutting_insert">Kesici Uç</option>
              <option value="drill_bit">Punta Matkabı</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tools-description" className="text-[10px] font-bold text-zinc-500">Not / Açıklama</label>
          <input
            id="tools-description"
            type="text"
            placeholder="Kullanıcı veya sebep notu..."
            className="text-xs border border-zinc-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-zinc-800"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center gap-1 py-2 cursor-pointer"
        >
          <Wrench className="size-3.5" />
          Değişimi Kaydet
        </Button>
      </form>

      {/* Log list */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Kayıtlı Değişimler</h3>
        {toolChanges.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">Bu dönemde kayıtlı takım değişimi bulunmuyor.</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {toolChanges.map((change) => {
              const formatted = formatDate(new Date(change.tarih + "T00:00:00"));
              return (
                <div
                  key={change.id}
                  className="flex items-center justify-between p-2 rounded bg-zinc-50 border border-zinc-150 hover:bg-zinc-100 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <p className="text-[10px] font-bold text-zinc-500">{formatted} · <span className="text-blue-700">{change.machine}</span></p>
                    <p className="text-xs font-bold text-zinc-800">
                      {change.tool_type === "cutting_insert" ? "Kesici Uç" : "Punta Matkabı"}
                    </p>
                    {change.description && (
                      <p className="text-[10px] text-zinc-500 truncate" title={change.description}>
                        {change.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteToolChange(change.tarih, change.machine, change.tool_type)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 rounded hover:bg-zinc-200 transition-colors shrink-0 cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
