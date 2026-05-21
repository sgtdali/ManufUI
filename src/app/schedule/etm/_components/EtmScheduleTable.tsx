"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatNumber, toDayKey } from "../../utils";
import type { EtmDayPlan, EtmDayOverride } from "../types";
import { Wrench, Settings2, Calendar, ShieldAlert } from "lucide-react";

type Props = {
  plans: EtmDayPlan[];
  wipIncoming?: Record<string, number | null>;
  onSaveOverride: (key: string, override: EtmDayOverride) => void;
  onClearOverride: (key: string) => void;
};

export function EtmScheduleTable({ plans, wipIncoming = {}, onSaveOverride, onClearOverride }: Props) {
  const todayKey = toDayKey(new Date());
  
  // Inline editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editProduced, setEditProduced] = useState("");
  const [editOvertime, setEditOvertime] = useState("");
  const [editShiftStart, setEditShiftStart] = useState("");
  const [editShiftEnd, setEditShiftEnd] = useState("");
  const [editForceWorkday, setEditForceWorkday] = useState(false);

  const startEdit = (plan: EtmDayPlan) => {
    setEditingKey(plan.key);
    // Preset fields
    setEditProduced(plan.source === "scenario" ? String(plan.produced) : "");
    setEditOvertime(String(plan.overtimeMinutes));
    setEditShiftStart(plan.shiftStart);
    setEditShiftEnd(plan.shiftEnd);
    setEditForceWorkday(plan.isWorkday && !plan.isBaseWorkday);
  };

  const handleSave = (key: string) => {
    const override: EtmDayOverride = {};
    
    if (editProduced.trim() !== "") {
      override.produced = Math.max(0, parseInt(editProduced, 10) || 0);
    }
    
    override.overtimeMinutes = Math.max(0, parseInt(editOvertime, 10) || 0);
    override.shiftStart = editShiftStart;
    override.shiftEnd = editShiftEnd;
    
    // Only check forceWorkday if not a base workday
    const plan = plans.find(p => p.key === key);
    if (plan && !plan.isBaseWorkday) {
      override.forceWorkday = editForceWorkday;
    }

    onSaveOverride(key, override);
    setEditingKey(null);
  };

  const handleReset = (key: string) => {
    onClearOverride(key);
    setEditingKey(null);
  };

  return (
    <div className="overflow-hidden border border-zinc-200 rounded-xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <th className="py-3 px-4 min-w-[130px]">Gün</th>
              <th className="py-3 px-3 text-center">Hedef</th>
              <th className="py-3 px-3 text-center">Gerçek / Plan</th>
              <th className="py-3 px-3 text-center">Kapasite</th>
              <th className="py-3 px-3 text-center">Pres Stok</th>
              <th className="py-3 px-4">Duruş Detayı</th>
              <th className="py-3 px-4">Uyarılı Durum</th>
              <th className="py-3 px-4 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const isToday = plan.key === todayKey;
              const hasCritical = plan.warnings.some((w) => w.severity === "critical");
              const isWeekend = !plan.isBaseWorkday;
              
              // Determine row background color
              let rowBg = "hover:bg-zinc-50/40";
              if (isToday) {
                rowBg = "bg-blue-50/30 hover:bg-blue-50/50";
              } else if (hasCritical) {
                rowBg = "bg-rose-50/20 hover:bg-rose-50/40";
              } else if (!plan.isWorkday) {
                rowBg = "bg-zinc-50/60 text-zinc-400 hover:bg-zinc-50";
              }

              // Determine produced text color
              let producedColor = "text-zinc-900 font-bold";
              if (plan.target > 0 && plan.isWorkday) {
                if (plan.produced >= plan.target) {
                  producedColor = "text-emerald-600 font-bold";
                } else {
                  producedColor = "text-rose-600 font-bold";
                }
              } else if (!plan.isWorkday) {
                producedColor = "text-zinc-400";
              }

              const isEditing = editingKey === plan.key;

              return (
                <React.Fragment key={plan.key}>
                  {/* Standard row */}
                  <tr className={`border-b border-zinc-150 transition-colors ${rowBg}`}>
                    {/* Day Column */}
                    <td className="py-3 px-4 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className={isToday ? "text-blue-700 font-bold" : ""}>{plan.label}</span>
                        {isToday && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.2 text-[8px] font-bold text-blue-700 animate-pulse">
                            bugün
                          </span>
                        )}
                        {!plan.isWorkday && (
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.2 text-[8px] font-medium text-zinc-500">
                            tatil
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Target Column */}
                    <td className="py-3 px-3 text-center font-medium">
                      {plan.target > 0 ? formatNumber(plan.target) : "—"}
                    </td>

                    {/* Produced Column */}
                    <td className="py-3 px-3 text-center">
                      <span className={producedColor}>
                        {plan.produced > 0 ? formatNumber(plan.produced) : plan.isWorkday ? "0" : "—"}
                      </span>
                      {plan.source === "actual" && plan.produced > 0 && (
                        <span className="ml-1 text-[8px] font-bold bg-zinc-100 text-zinc-500 px-1 py-0.1 rounded border border-zinc-200">G</span>
                      )}
                      {plan.source === "scenario" && (
                        <span className="ml-1 text-[8px] font-bold bg-blue-50 text-blue-600 px-1 py-0.1 rounded border border-blue-200">S</span>
                      )}
                    </td>

                    {/* Capacity Column */}
                    <td className="py-3 px-3 text-center text-zinc-500 font-medium">
                      {plan.isWorkday ? formatNumber(plan.capacityProduced) : "—"}
                    </td>

                    {/* Pres Stok Column */}
                    <td className="py-3 px-3 text-center text-zinc-500 font-semibold">
                      {wipIncoming[plan.key] !== undefined && wipIncoming[plan.key] !== null
                        ? formatNumber(wipIncoming[plan.key] as number)
                        : "—"}
                    </td>

                    {/* Stops Column */}
                    <td className="py-3 px-4 text-zinc-500 font-medium whitespace-nowrap">
                      {plan.isWorkday ? (
                        <span title={plan.stopLabel} className="truncate max-w-[200px] block">
                          {plan.stopLabel}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Warnings Column */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                        {plan.warnings.length === 0 ? (
                          <span className="text-[10px] text-zinc-400 italic">Sorun yok</span>
                        ) : (
                          plan.warnings.map((w, idx) => (
                            <span
                              key={idx}
                              title={w.message}
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border transition-colors ${
                                w.severity === "critical"
                                  ? "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100"
                                  : w.severity === "warning"
                                  ? "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
                                  : "bg-zinc-50 text-zinc-600 border-zinc-150 hover:bg-zinc-100"
                              }`}
                            >
                              {w.severity === "critical" && <ShieldAlert className="size-2.5 mr-1 text-rose-500" />}
                              {w.type === "cutting_insert" && `${w.machine} Kesici`}
                              {w.type === "drill_bit" && `${w.machine} Punta`}
                              {w.type === "talas_kovasi" && "Talaş Kovası"}
                              {w.type === "kum" && "Kum Seviyesi"}
                              {w.type === "filtre" && "Filtre"}
                              {w.type === "bor_yagi" && "Bor Yağı"}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 text-right">
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => startEdit(plan)}
                        className={`text-[11px] font-semibold py-1 px-2 h-7 ${
                          plan.isWorkday
                            ? "text-blue-700 hover:bg-blue-50/50 hover:text-blue-800"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
                        }`}
                      >
                        {plan.isWorkday ? "Düzenle" : "Mesai ekle"}
                      </Button>
                    </td>
                  </tr>

                  {/* Inline edit drawer */}
                  {isEditing && (
                    <tr className="bg-zinc-50/50">
                      <td colSpan={8} className="p-4 border-b border-zinc-200">
                        <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-lg border border-zinc-200 shadow-inner">
                          {/* produced input */}
                          <div className="flex flex-col gap-1">
                            <label htmlFor={`edit-produced-${plan.key}`} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              Senaryo Üretim Adeti
                            </label>
                            <input
                              id={`edit-produced-${plan.key}`}
                              type="number"
                              min="0"
                              placeholder={String(plan.capacityProduced)}
                              className="text-xs border border-zinc-200 rounded p-1.5 w-28 bg-white font-semibold"
                              value={editProduced}
                              onChange={(e) => setEditProduced(e.target.value)}
                            />
                          </div>

                          {/* overtime input */}
                          <div className="flex flex-col gap-1">
                            <label htmlFor={`edit-overtime-${plan.key}`} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              Ek Mesai (Dakika)
                            </label>
                            <input
                              id={`edit-overtime-${plan.key}`}
                              type="number"
                              min="0"
                              className="text-xs border border-zinc-200 rounded p-1.5 w-24 bg-white"
                              value={editOvertime}
                              onChange={(e) => setEditOvertime(e.target.value)}
                            />
                          </div>

                          {/* shiftStart input */}
                          <div className="flex flex-col gap-1">
                            <label htmlFor={`edit-shift-start-${plan.key}`} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              Vardiya Giriş
                            </label>
                            <input
                              id={`edit-shift-start-${plan.key}`}
                              type="text"
                              className="text-xs border border-zinc-200 rounded p-1.5 w-20 bg-white"
                              value={editShiftStart}
                              onChange={(e) => setEditShiftStart(e.target.value)}
                            />
                          </div>

                          {/* shiftEnd input */}
                          <div className="flex flex-col gap-1">
                            <label htmlFor={`edit-shift-end-${plan.key}`} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              Vardiya Çıkış
                            </label>
                            <input
                              id={`edit-shift-end-${plan.key}`}
                              type="text"
                              className="text-xs border border-zinc-200 rounded p-1.5 w-20 bg-white"
                              value={editShiftEnd}
                              onChange={(e) => setEditShiftEnd(e.target.value)}
                            />
                          </div>

                          {/* forceWorkday input (only for weekend/holiday) */}
                          {!plan.isBaseWorkday && (
                            <div className="flex items-center gap-2 h-9">
                              <input
                                id={`force-workday-${plan.key}`}
                                type="checkbox"
                                className="size-4 text-blue-600 focus:ring-blue-500 border-zinc-300 rounded cursor-pointer"
                                checked={editForceWorkday}
                                onChange={(e) => setEditForceWorkday(e.target.checked)}
                              />
                              <label htmlFor={`force-workday-${plan.key}`} className="text-xs font-bold text-zinc-700 cursor-pointer">
                                Çalışma günü say
                              </label>
                            </div>
                          )}

                          {/* buttons */}
                          <div className="flex gap-2 ml-auto">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSave(plan.key)}
                              className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs"
                            >
                              Kaydet
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleReset(plan.key)}
                              className="text-zinc-500 font-semibold border-zinc-200 text-xs"
                            >
                              Sıfırla
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingKey(null)}
                              className="text-zinc-400 hover:text-zinc-600 text-xs font-semibold"
                            >
                              Kapat
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
