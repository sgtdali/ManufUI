"use client";

import { useEffect, useRef } from "react";
import { X, Factory, Info, ArrowUpRight, ArrowDownRight, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type CellParam } from "../actions";
import type { WipStockItem } from "../../actions";
import { CELL_FLOWS, type CellName } from "../constants";
import { formatNumber, formatDate, formatWeekday } from "../../utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  cellName: CellName | null;
  date: Date | null;
  dateKey: string | null;
  actualValue: number;
  capacityParam: CellParam | undefined;
  wipStock: WipStockItem[];
};

export function DayDetailPanel({
  isOpen,
  onClose,
  cellName,
  date,
  dateKey,
  actualValue,
  capacityParam,
  wipStock,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cellName || !date || !dateKey) return null;

  const flows = CELL_FLOWS[cellName] || { upstream: [], downstream: [] };
  const capacityValue = capacityParam?.gunluk_max_kapasite ?? null;
  const notesValue = capacityParam?.notlar ?? null;

  // Helper to fetch WIP stock value
  const getWipDetails = (source: string, target: string) => {
    const match = wipStock.find(
      (w) => w.tarih === dateKey && w.kaynak_hucresi === source && w.hedef_hucresi === target
    );
    if (!match) return { value: null, isOverride: false };
    const value = match.override_edildi && match.gercek_adet !== null ? match.gercek_adet : match.hesaplanan_adet;
    return { value, isOverride: match.override_edildi };
  };

  // Compute custom display list for Upstream WIPs
  const upstreamWips = (() => {
    // 1. If N602 or N603, show combined upstream: ROB104 -> N602+N603
    if (cellName === "N602 Hücresi" || cellName === "N603 Hücresi") {
      const { value, isOverride } = getWipDetails("ROB104 Hücresi", "N602 Hücresi");
      return [
        {
          key: "ROB104 Hücresi->N602 Hücresi",
          label: "ROB104 → N602+N603",
          value,
          isOverride,
        },
      ];
    }
    // 2. If ROB109, show combined upstream: N602+N603 -> ROB109
    if (cellName === "ROB109 Hücresi") {
      const { value, isOverride } = getWipDetails("N602 Hücresi", "ROB109 Hücresi");
      return [
        {
          key: "N602 Hücresi->ROB109 Hücresi",
          label: "N602+N603 → ROB109",
          value,
          isOverride,
        },
      ];
    }
    // 3. Normal mapping
    return flows.upstream.map((up) => {
      const { value, isOverride } = getWipDetails(up, cellName);
      return {
        key: `${up}->${cellName}`,
        label: `${up.replace(" Hücresi", "")} → ${cellName.replace(" Hücresi", "")}`,
        value,
        isOverride,
      };
    });
  })();

  // Compute custom display list for Downstream WIPs
  const downstreamWips = (() => {
    // 1. If ROB104, show combined downstream: ROB104 -> N602+N603
    if (cellName === "ROB104 Hücresi") {
      const { value, isOverride } = getWipDetails("ROB104 Hücresi", "N602 Hücresi");
      return [
        {
          key: "ROB104 Hücresi->N602 Hücresi",
          label: "ROB104 → N602+N603",
          value,
          isOverride,
        },
      ];
    }
    // 2. If N602 or N603, show combined downstream: N602+N603 -> ROB109
    if (cellName === "N602 Hücresi" || cellName === "N603 Hücresi") {
      const { value, isOverride } = getWipDetails("N602 Hücresi", "ROB109 Hücresi");
      return [
        {
          key: "N602 Hücresi->ROB109 Hücresi",
          label: "N602+N603 → ROB109",
          value,
          isOverride,
        },
      ];
    }
    // 3. Normal mapping
    return flows.downstream.map((down) => {
      const { value, isOverride } = getWipDetails(cellName, down);
      return {
        key: `${cellName}->${down}`,
        label: `${cellName.replace(" Hücresi", "")} → ${down.replace(" Hücresi", "")}`,
        value,
        isOverride,
      };
    });
  })();

  const formattedDate = `${formatDate(date)} ${formatWeekday(date)}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-55 flex w-full max-w-md flex-col bg-zinc-50 shadow-2xl border-l border-zinc-200 transition-transform duration-300 animate-in slide-in-from-right"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">{cellName}</h2>
            <p className="text-xs font-semibold text-blue-600 mt-0.5">{formattedDate}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Actual vs Capacity Card */}
          <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <Factory className="size-5 text-blue-600" />
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Üretim Durumu</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 font-semibold">Gerçekleşen Üretim</p>
                  <p className="text-3xl font-extrabold text-zinc-950 mt-1">{formatNumber(actualValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-semibold">Maksimum Kapasite</p>
                  <p className="text-3xl font-extrabold text-zinc-950 mt-1">
                    {capacityValue !== null ? formatNumber(capacityValue) : "—"}
                  </p>
                </div>
              </div>
              {capacityValue !== null && (
                <div className="pt-2">
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        actualValue >= capacityValue
                          ? "bg-emerald-500"
                          : actualValue >= capacityValue * 0.6
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min((actualValue / capacityValue) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-500 mt-1.5 text-right">
                    Kapasite kullanım oranı: %{Math.round((actualValue / capacityValue) * 100)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WIP Stock In (Upstream) */}
          <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <ArrowUpRight className="size-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Giriş Stokları (WIP)</h3>
              </div>
              {upstreamWips.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Bu başlangıç istasyonudur, giriş stoku yok.</p>
              ) : (
                <div className="space-y-3">
                  {upstreamWips.map((wip) => (
                    <div key={wip.key} className="flex items-center justify-between border-b border-zinc-50 pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <p className="text-xs font-semibold text-zinc-700">{wip.label}</p>
                        {wip.isOverride && (
                          <span className="inline-flex items-center rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-600/10 mt-0.5">
                            Manuel Giriş
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-extrabold text-zinc-900">
                        {wip.value !== null ? formatNumber(wip.value) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* WIP Stock Out (Downstream) */}
          <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <ArrowDownRight className="size-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Çıkış Stokları (WIP)</h3>
              </div>
              {downstreamWips.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Bu son istasyonudur, çıkış stoku yok.</p>
              ) : (
                <div className="space-y-3">
                  {downstreamWips.map((wip) => (
                    <div key={wip.key} className="flex items-center justify-between border-b border-zinc-50 pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <p className="text-xs font-semibold text-zinc-700">{wip.label}</p>
                        {wip.isOverride && (
                          <span className="inline-flex items-center rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-600/10 mt-0.5">
                            Manuel Giriş
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-extrabold text-zinc-900">
                        {wip.value !== null ? formatNumber(wip.value) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cell Notes */}
          <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <FileText className="size-5 text-amber-500" />
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Hücre Notları</h3>
              </div>
              {notesValue ? (
                <p className="text-xs font-medium text-zinc-700 whitespace-pre-wrap leading-relaxed">
                  {notesValue}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 italic">Not girilmemiş.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-200 bg-white px-6 py-4 flex items-center justify-end">
          <button
            type="button"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
            onClick={onClose}
          >
            Kapat
          </button>
        </footer>
      </div>
    </>
  );
}
