"use client";

import { useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
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
};

const labelCls = "text-xs font-semibold text-zinc-500 uppercase tracking-wider";

export function MoldChangesSidebar({ startDate, moldChanges, setMoldChanges }: Props) {
  const [, startTransition] = useTransition();

  const refresh = (start: string, end: string) => {
    startTransition(async () => {
      const result = await loadMoldChanges(start, end);
      if (result.success) setMoldChanges(result.data ?? []);
    });
  };

  return (
    <div className="space-y-4">
      <form
        className="space-y-3 border-b border-zinc-100 pb-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const dateVal = fd.get("date") as string;
          const typeVal = fd.get("mold_type") as "male" | "female";
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

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Kayıtlı Değişimler ({moldChanges.length})
        </h3>
        {moldChanges.length === 0 ? (
          <p className="text-xs text-zinc-400 italic py-4 text-center">
            Bu tarih aralığında kayıtlı kalıp değişimi yok.
          </p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {moldChanges.map((mc) => (
              <div
                key={mc.id}
                className="flex items-start justify-between rounded-md border border-zinc-100 bg-zinc-50/50 p-2.5 text-xs hover:bg-zinc-50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                    <span>{formatDate(new Date(mc.tarih))}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        mc.mold_type === "male"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-purple-50 text-purple-700 border border-purple-100"
                      }`}
                    >
                      {mc.mold_type === "male" ? "Erkek" : "Dişi"}
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
        )}
      </div>
    </div>
  );
}
