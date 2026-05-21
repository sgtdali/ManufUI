"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Info, AlertTriangle, Play } from "lucide-react";

type StockState = {
  kumLastCheck: string | null;
  filtreLastCheck: string | null;
  holderStock: number;
  borYagiLastCheck: string | null;
  talasLastCheck: string | null;
};

type Props = {
  stockState: StockState;
  setStockState: React.Dispatch<React.SetStateAction<StockState>>;
};

export function EtmStockSidebar({ stockState, setStockState }: Props) {
  const getDaysAgo = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const past = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = today.getTime() - past.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const handleCheck = (key: keyof Omit<StockState, "holderStock">) => {
    const todayStr = new Date().toISOString().split("T")[0];
    setStockState((prev) => ({
      ...prev,
      [key]: todayStr,
    }));
  };

  const getStatusText = (days: number | null, limit: number) => {
    if (days === null) return { text: "Kontrol edilmedi", color: "text-rose-600 font-semibold" };
    if (days === 0) return { text: "Bugün kontrol edildi", color: "text-emerald-600 font-medium" };
    if (days === 1) return { text: "Dün kontrol edildi", color: "text-zinc-600" };
    if (days > limit) return { text: `${days} gün önce (Gecikti)`, color: "text-amber-600 font-bold" };
    return { text: `${days} gün önce kontrol edildi`, color: "text-zinc-600" };
  };

  const kumDays = getDaysAgo(stockState.kumLastCheck);
  const filtreDays = getDaysAgo(stockState.filtreLastCheck);
  const borYagiDays = getDaysAgo(stockState.borYagiLastCheck);
  const talasDays = getDaysAgo(stockState.talasLastCheck);

  const kumStatus = getStatusText(kumDays, 3);
  const filtreStatus = getStatusText(filtreDays, 7);
  const borYagiStatus = getStatusText(borYagiDays, 3);

  const isTalasDoneToday = talasDays === 0;

  return (
    <div className="space-y-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Sarf Malzemeleri & Stok</h3>

      {/* 1. Kum (Sand Level) */}
      <div className="p-3 bg-zinc-50 rounded border border-zinc-150 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800">Kumlama Kum Seviyesi</span>
          {kumDays !== null && kumDays > 3 && <AlertTriangle className="size-4 text-amber-500" />}
        </div>
        <p className={`text-[10px] ${kumStatus.color}`}>{kumStatus.text}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleCheck("kumLastCheck")}
          className="w-full text-xs flex items-center justify-center gap-1 py-1"
        >
          <Check className="size-3" /> Kontrol Edildi
        </Button>
      </div>

      {/* 2. Filtre Basıncı (Filter Pressure) */}
      <div className="p-3 bg-zinc-50 rounded border border-zinc-150 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800">Filtre Basınç Kontrolü</span>
          {filtreDays !== null && filtreDays > 7 && <AlertTriangle className="size-4 text-amber-500" />}
        </div>
        <p className={`text-[10px] ${filtreStatus.color}`}>{filtreStatus.text}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleCheck("filtreLastCheck")}
          className="w-full text-xs flex items-center justify-center gap-1 py-1"
        >
          <Check className="size-3" /> Kontrol Edildi
        </Button>
      </div>

      {/* 3. Bor Yağı (Coolant oil) */}
      <div className="p-3 bg-zinc-50 rounded border border-zinc-150 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800">Bor Yağı Konsantrasyonu</span>
          {borYagiDays !== null && borYagiDays > 3 && <AlertTriangle className="size-4 text-amber-500" />}
        </div>
        <p className={`text-[10px] ${borYagiStatus.color}`}>{borYagiStatus.text}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleCheck("borYagiLastCheck")}
          className="w-full text-xs flex items-center justify-center gap-1 py-1"
        >
          <Check className="size-3" /> Kontrol Edildi
        </Button>
      </div>

      {/* 4. Holder Stok Adeti */}
      <div className="p-3 bg-zinc-50 rounded border border-zinc-150 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800">Yedek Holder Adeti</span>
          {stockState.holderStock <= 2 && <AlertTriangle className="size-4 text-rose-500" />}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            className="text-xs border border-zinc-200 rounded p-1 w-20 bg-white font-semibold"
            value={stockState.holderStock}
            onChange={(e) => setStockState(prev => ({ ...prev, holderStock: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
          />
          <span className="text-xs font-semibold text-zinc-500">adet yedek</span>
        </div>
        {stockState.holderStock <= 2 && (
          <p className="text-[9px] text-rose-600 font-bold">Kritik stok seviyesi! Sipariş açılmalı.</p>
        )}
      </div>

      {/* 5. Talaş Kovası */}
      <div className="p-3 bg-zinc-50 rounded border border-zinc-150 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800">Talaş Kovası</span>
          {!isTalasDoneToday && <Info className="size-4 text-zinc-400" />}
        </div>
        <p className={`text-[10px] ${isTalasDoneToday ? "text-emerald-600 font-medium" : "text-zinc-500"}`}>
          {isTalasDoneToday ? "Bugün boşaltıldı" : "Bugün henüz boşaltılmadı"}
        </p>
        <Button
          type="button"
          size="sm"
          variant={isTalasDoneToday ? "outline" : "default"}
          onClick={() => handleCheck("talasLastCheck")}
          className={`w-full text-xs flex items-center justify-center gap-1 py-1 ${
            !isTalasDoneToday ? "bg-zinc-800 hover:bg-zinc-900 text-white" : ""
          }`}
        >
          <Check className="size-3" /> Boşaltıldı
        </Button>
      </div>
    </div>
  );
}
