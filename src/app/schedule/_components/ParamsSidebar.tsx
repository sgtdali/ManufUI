"use client";

import { useState, useTransition, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  upsertScheduleParamValue,
  type ScheduleParamRow,
} from "../actions";

type Props = {
  params: ScheduleParamRow[];
  setParams: (params: ScheduleParamRow[]) => void;
  selectedCell: string;
};

const labelCls = "text-xs font-semibold text-zinc-500 uppercase tracking-wider";

function ParamInput({
  param,
  onSave,
}: {
  param: ScheduleParamRow;
  onSave: (key: string, value: number) => Promise<void>;
}) {
  const [localValue, setLocalValue] = useState(String(param.value));
  const [saving, startSaving] = useTransition();

  // Keep local value in sync when the param database value changes
  useEffect(() => {
    setLocalValue(String(param.value));
  }, [param.value]);

  const handleBlur = () => {
    const parsed = Number(localValue);
    if (!Number.isFinite(parsed) || parsed === param.value) return;
    startSaving(async () => {
      await onSave(param.key, parsed);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        step="any"
        value={localValue}
        disabled={saving}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className="h-8 text-sm"
      />
      {param.unit && (
        <span className="text-xs text-zinc-400 whitespace-nowrap w-8 shrink-0">{param.unit}</span>
      )}
    </div>
  );
}

export function ParamsSidebar({ params, setParams, selectedCell }: Props) {
  const filtered = params.filter((p) => {
    if (selectedCell === "Pres Hücresi") {
      return !p.key.startsWith("etm_") && !p.key.startsWith("rob108_") && !p.key.startsWith("rob104_");
    }
    if (selectedCell === "ETM Hücresi") {
      return p.key.startsWith("etm_");
    }
    if (selectedCell === "ROB108 Hücresi" || selectedCell === "ROB104 Hücresi") {
      return p.key.startsWith("rob108_") || p.key.startsWith("rob104_");
    }
    return false;
  });

  const handleSaveValue = async (key: string, value: number) => {
    const result = await upsertScheduleParamValue(key, value);
    if (result.success) {
      setParams(params.map((p) => (p.key === key ? { ...p, value } : p)));
      toast.success("Parametre güncellendi.");
    } else {
      toast.error(result.error ?? "Güncelleme başarısız.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className={labelCls}>Proses Parametreleri</p>
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.key} className="space-y-1">
                <Label className="text-xs text-zinc-600">{p.label}</Label>
                <ParamInput param={p} onSave={handleSaveValue} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic">
            Seçili hücre ({selectedCell}) için tanımlanmış bir parametre bulunmamaktadır.
          </p>
        )}
      </div>
    </div>
  );
}
