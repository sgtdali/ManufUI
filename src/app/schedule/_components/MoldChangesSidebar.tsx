"use client";

import { useTransition, useState, useMemo } from "react";
import { Plus, Trash2, Calendar, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadMoldChanges, saveMoldChange, deleteMoldChange, type MoldChange } from "../actions";
import { formatDate } from "../utils";

type Props = {
  startDate: string;
  moldChanges: MoldChange[];
  setMoldChanges: (v: MoldChange[]) => void;
  schedule?: any[];
};

const labelCls = "text-xs font-semibold text-zinc-500 uppercase tracking-wider";

export function MoldChangesSidebar({ startDate, moldChanges, setMoldChanges, schedule }: Props) {
  const [, startTransition] = useTransition();
  const [activeListTab, setActiveListTab] = useState<"actual" | "planned">("actual");

  const refresh = (start: string, end: string) => {
    startTransition(async () => {
      const result = await loadMoldChanges(start, end);
      if (result.success) setMoldChanges(result.data ?? []);
    });
  };

  const plannedChanges = useMemo(() => {
    if (!schedule) return [];
    const list: { id: string; tarih: string; mold_type: "male" | "female" | "ring"; description?: string }[] = [];
    for (const day of schedule) {
      if (day.maintenanceMinutes > 0 && day.maintenanceLabel !== "-") {
        if (day.maintenanceLabel.includes("Erkek")) {
          list.push({
            id: `planned-${day.key}-male`,
            tarih: day.key,
            mold_type: "male",
            description: `Simülasyon Planı`,
          });
        }
        if (day.maintenanceLabel.includes("Dişi")) {
          list.push({
            id: `planned-${day.key}-female`,
            tarih: day.key,
            mold_type: "female",
            description: `Simülasyon Planı`,
          });
        }
        if (day.maintenanceLabel.includes("Ring")) {
          list.push({
            id: `planned-${day.key}-ring`,
            tarih: day.key,
            mold_type: "ring",
            description: `Simülasyon Planı`,
          });
        }
      }
    }
    return list;
  }, [schedule]);

  return (
    <div className="space-y-4">
      <form
        className="space-y-3 border-b border-zinc-100 pb-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const dateVal = fd.get("date") as string;
          const typeVal = fd.get("mold_type") as "male" | "female" | "ring";
          const descVal = fd.get("description") as string;

          if (!dateVal || !typeVal) {
            toast.error("Lütfen tarih ve kalıp türünü seçin.");
            return;
          }

          const res = await saveMoldChange(dateVal, typeVal, descVal);
          if (res.success) {
            toast.success("Kalıp değişimi kaydedildi.");
            // Fetch updated list for the current period
            const [minDate, maxDate] = moldChanges.length
              ? [moldChanges[0].tarih, moldChanges[moldChanges.length - 1].tarih]
              : [dateVal, dateVal];
            refresh(Math.min(...[minDate, dateVal].map(d => new Date(d).getTime())) === new Date(minDate).getTime() ? minDate : dateVal,
                   Math.max(...[maxDate, dateVal].map(d => new Date(d).getTime())) === new Date(maxDate).getTime() ? maxDate : dateVal);
            e.currentTarget.reset();
          } else {
            toast.error(`Kayıt hatası: ${res.error}`);
          }
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="mc-date" className={labelCls}>Değişim Tarihi</Label>
          <Input id="mc-date" name="date" type="date" required defaultValue={startDate} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mc-type" className={labelCls}>Kalıp Türü</Label>
          <Select name="mold_type" required defaultValue="male">
            <SelectTrigger id="mc-type">
              <SelectValue placeholder="Tür seçin..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Erkek Kalıp (500 adet)</SelectItem>
              <SelectItem value="female">Dişi Kalıp (1300 adet)</SelectItem>
              <SelectItem value="ring">HIP Ring (1300 adet)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="mc-desc" className={labelCls}>Açıklama (İsteğe bağlı)</Label>
          <Input id="mc-desc" name="description" placeholder="Örn: Aşınma sebebiyle yenilendi" />
        </div>
        <Button type="submit" size="sm" className="w-full">
          <Plus className="mr-1 h-4 w-4" /> Kalıp Değişimi Ekle
        </Button>
      </form>

      <div className="space-y-3">
        {/* State Tabs */}
        <div className="flex rounded-md bg-zinc-100 p-0.5 border border-zinc-200">
          <button
            type="button"
            className={`flex-1 py-1.5 text-center text-xs font-semibold rounded transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeListTab === "actual"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
            onClick={() => setActiveListTab("actual")}
          >
            <ClipboardCheck className="h-3 w-3" />
            <span>Gerçekleşen ({moldChanges.length})</span>
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 text-center text-xs font-semibold rounded transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeListTab === "planned"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
            onClick={() => setActiveListTab("planned")}
          >
            <Calendar className="h-3 w-3" />
            <span>Planlanan ({plannedChanges.length})</span>
          </button>
        </div>

        {activeListTab === "actual" ? (
          moldChanges.length === 0 ? (
            <p className="text-xs text-zinc-400 italic py-4 text-center">
              Bu tarih aralığında kayıtlı kalıp değişimi yok.
            </p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {moldChanges.map((mc) => (
                <div
                  key={mc.id}
                  className="flex items-start justify-between rounded-md border border-zinc-150 bg-white p-2.5 text-xs hover:bg-zinc-50 transition-colors shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                      <span>{formatDate(new Date(mc.tarih))}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          mc.mold_type === "male"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : mc.mold_type === "female"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {mc.mold_type === "male" ? "Erkek" : mc.mold_type === "female" ? "Dişi" : "Ring"}
                      </span>
                    </div>
                    {mc.description && (
                      <p className="text-zinc-500 text-[11px] leading-tight">{mc.description}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={async () => {
                      if (confirm("Bu kalıp değişim kaydını silmek istediğinize emin misiniz?")) {
                        const res = await deleteMoldChange(mc.id);
                        if (res.success) {
                          toast.success("Kayıt silindi.");
                          setMoldChanges(moldChanges.filter((m) => m.id !== mc.id));
                        } else {
                          toast.error(`Silme hatası: ${res.error}`);
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : (
          plannedChanges.length === 0 ? (
            <p className="text-xs text-zinc-400 italic py-4 text-center">
              Simülasyonda öngörülen kalıp değişimi bulunmamaktadır.
            </p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {plannedChanges.map((mc) => (
                <div
                  key={mc.id}
                  className="flex items-start justify-between rounded-md border border-zinc-150 bg-amber-50/20 p-2.5 text-xs shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                      <span>{formatDate(new Date(mc.tarih))}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          mc.mold_type === "male"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : mc.mold_type === "female"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {mc.mold_type === "male" ? "Erkek" : mc.mold_type === "female" ? "Dişi" : "Ring"}
                      </span>
                    </div>
                    {mc.description && (
                      <p className="text-zinc-500 text-[11px] leading-tight">{mc.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
