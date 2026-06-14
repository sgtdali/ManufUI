"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOLUMLER } from "@/lib/types";
import { saveSuggestion } from "../actions";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function OneriKayitDialog({ isOpen, onClose }: Props) {
  const [bolum, setBolum] = useState<string>("");
  const [onerisi, setOnerisi] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    if (!bolum) {
      toast.error("Lütfen bir hücre seçiniz.");
      return;
    }
    if (!onerisi?.trim()) {
      toast.error("Lütfen önerinizi giriniz.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await saveSuggestion(bolum, onerisi);
        if (res.success) {
          toast.success("Öneriniz başarıyla kaydedildi.");
          setBolum("");
          setOnerisi("");
          onClose();
        } else {
          toast.error(`Hata: ${res.error}`);
        }
      } catch (err: any) {
        toast.error(`Sistemsel Hata: ${err.message || err}`);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            Önerİ Kayıt
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              Hücre
            </label>
            <Select value={bolum} onValueChange={(val) => setBolum(val || "")}>
              <SelectTrigger className="h-8 text-xs font-semibold text-zinc-700 w-full">
                <SelectValue placeholder="Hücre seçiniz..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {BOLUMLER.map((b) => (
                  <SelectItem key={b} value={b} className="text-xs font-semibold">
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              Detaylı Açıklama / Önerİ
            </label>
            <Textarea
              rows={4}
              placeholder="Önerinizi detaylıca açıklayınız..."
              value={onerisi}
              className="text-xs font-semibold text-zinc-700 focus:ring-1 focus:ring-blue-500"
              onChange={(e) => setOnerisi(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="text-xs font-bold">
            İptal
          </Button>
          <Button onClick={handleConfirm} disabled={isPending} className="text-xs font-bold">
            {isPending ? "Kaydediliyor..." : "Tamam"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
