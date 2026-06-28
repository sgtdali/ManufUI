"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TimeSlot = { sira_no: number; label: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarih: string;
  onTarihChange: (val: string) => void;
  siraNo: string;
  onSiraNoChange: (val: string) => void;
  degistirilenKalip: string;
  onDegistirilenKalipChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  timeSlots: TimeSlot[];
  isPending: boolean;
  onSave: () => void;
};

export function MoldChangeDialog({
  open,
  onOpenChange,
  tarih,
  onTarihChange,
  siraNo,
  onSiraNoChange,
  degistirilenKalip,
  onDegistirilenKalipChange,
  description,
  onDescriptionChange,
  timeSlots,
  isPending,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-md bg-white border border-zinc-200 shadow-xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            Manuel Kalıp Değİşİmİ Kaydet
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Pres hücresi için planlı/plansız gerçekleştirilen kalıp değişimi kaydını buraya ekleyebilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-tarih" className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Tarih *
              </Label>
              <Input
                id="manual-tarih"
                type="date"
                value={tarih}
                onChange={(e) => {
                  onTarihChange(e.target.value);
                  onSiraNoChange("");
                }}
                className="h-8 text-xs font-semibold text-zinc-700 w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manual-zaman" className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Zaman Dilimi *
              </Label>
              <Select value={siraNo} onValueChange={(val) => onSiraNoChange(val || "")}>
                <SelectTrigger id="manual-zaman" className="h-8 text-xs font-semibold text-zinc-700 w-full">
                  <SelectValue placeholder="Seçiniz..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.sira_no} value={String(slot.sira_no)} className="text-xs font-semibold">
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-kalip" className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Değiştirilen Kalıp *
            </Label>
            <Select value={degistirilenKalip} onValueChange={(val) => onDegistirilenKalipChange(val || "")}>
              <SelectTrigger id="manual-kalip" className="h-8 text-xs font-semibold text-zinc-700 w-full">
                <SelectValue placeholder="Kalıp seçiniz..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {["HFP Erkek BCE", "HFP Erkek UpS", "HFP Dişi", "HIP Ringler", "HIP Erkek"].map((mold) => (
                  <SelectItem key={mold} value={mold} className="text-xs font-semibold">
                    {mold}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="aciklama" className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Açıklama / Not
            </Label>
            <Textarea
              id="aciklama"
              rows={3}
              placeholder="Değişim nedenini, karşılaşılan durumları veya ek bilgileri belirtin..."
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="text-xs font-semibold text-zinc-700 placeholder-zinc-300 focus:ring-1 focus:ring-zinc-950"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-xs font-bold border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-8"
          >
            İptal
          </Button>
          <Button
            onClick={onSave}
            disabled={isPending}
            className="text-xs font-bold bg-zinc-900 hover:bg-zinc-850 text-white h-8"
          >
            {isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
