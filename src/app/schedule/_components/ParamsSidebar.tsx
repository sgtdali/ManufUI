"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  upsertScheduleParamValue,
  saveCustomScheduleParam,
  deleteCustomScheduleParam,
  type ScheduleParamRow,
} from "../actions";

type Props = {
  params: ScheduleParamRow[];
  setParams: (params: ScheduleParamRow[]) => void;
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

export function ParamsSidebar({ params, setParams }: Props) {
  const predefined = params.filter((p) => !p.is_custom);
  const custom = params.filter((p) => p.is_custom);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [adding, startAdding] = useTransition();
  const [deleting, startDeleting] = useTransition();

  const handleSaveValue = async (key: string, value: number) => {
    const result = await upsertScheduleParamValue(key, value);
    if (result.success) {
      setParams(params.map((p) => (p.key === key ? { ...p, value } : p)));
      toast.success("Parametre güncellendi.");
    } else {
      toast.error(result.error ?? "Güncelleme başarısız.");
    }
  };

  const handleAdd = () => {
    const parsedValue = Number(newValue);
    if (!newLabel.trim()) { toast.error("Etiket zorunludur."); return; }
    if (!Number.isFinite(parsedValue)) { toast.error("Geçersiz değer."); return; }

    const key = `custom_${newLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}_${Date.now()}`;

    startAdding(async () => {
      const result = await saveCustomScheduleParam(key, newLabel.trim(), parsedValue, newUnit.trim() || null);
      if (result.success && result.data) {
        setParams([...params, result.data]);
        setNewLabel("");
        setNewValue("");
        setNewUnit("");
        setShowAddForm(false);
        toast.success("Parametre eklendi.");
      } else {
        toast.error(result.error ?? "Ekleme başarısız.");
      }
    });
  };

  const handleDelete = (key: string) => {
    startDeleting(async () => {
      const result = await deleteCustomScheduleParam(key);
      if (result.success) {
        setParams(params.filter((p) => p.key !== key));
        toast.success("Parametre silindi.");
      } else {
        toast.error(result.error ?? "Silme başarısız.");
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Öntanımlı parametreler */}
      <div className="space-y-3">
        <p className={labelCls}>Proses Parametreleri</p>
        <div className="space-y-2">
          {predefined.map((p) => (
            <div key={p.key} className="space-y-1">
              <Label className="text-xs text-zinc-600">{p.label}</Label>
              <ParamInput param={p} onSave={handleSaveValue} />
            </div>
          ))}
        </div>
      </div>

      {/* Özel parametreler */}
      {(custom.length > 0 || showAddForm) && (
        <div className="space-y-3">
          <p className={labelCls}>Özel Parametreler</p>
          <div className="space-y-2">
            {custom.map((p) => (
              <div key={p.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-zinc-600">{p.label}</Label>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete(p.key)}
                    className="text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <ParamInput param={p} onSave={handleSaveValue} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yeni parametre formu */}
      {showAddForm && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2">
          <p className={labelCls}>Yeni Parametre</p>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Etiket</Label>
            <Input
              placeholder="örn. Soğuma süresi"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-600">Değer</Label>
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="0"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-600">Birim (opsiyonel)</Label>
              <Input
                placeholder="dk, adet…"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="flex-1 text-xs h-8"
              disabled={adding}
              onClick={handleAdd}
            >
              Ekle
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => { setShowAddForm(false); setNewLabel(""); setNewValue(""); setNewUnit(""); }}
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      {!showAddForm && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={14} />
          Yeni parametre ekle
        </Button>
      )}
    </div>
  );
}
