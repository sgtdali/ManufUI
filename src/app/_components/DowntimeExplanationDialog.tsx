"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AciklamaDialogType = {
  rowIndex: number;
  alan: "ariza" | "planli_durus" | "setup" | "musteri";
  baslik: string;
  aciklamaKey: "ariza_aciklama" | "planli_durus_aciklama" | "setup_aciklama" | "musteri_durus_aciklama";
  aciklama: string;
};

type Props = {
  dialogData: AciklamaDialogType | null;
  onClose: () => void;
  onTextChange: (text: string) => void;
  onConfirm: () => void;
  zamanDilimiLabel: string;
};

export function DowntimeExplanationDialog({
  dialogData,
  onClose,
  onTextChange,
  onConfirm,
  zamanDilimiLabel,
}: Props) {
  if (!dialogData) return null;

  return (
    <Dialog open={dialogData !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            {dialogData.baslik} — {zamanDilimiLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Textarea
            rows={4}
            placeholder="Duruş gerekçesini detaylıca açıklayınız..."
            value={dialogData.aciklama}
            className="text-xs font-semibold text-zinc-700 focus:ring-1 focus:ring-blue-500"
            onChange={(e) => onTextChange(e.target.value)}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="text-xs font-bold">
            İptal
          </Button>
          <Button onClick={onConfirm} className="text-xs font-bold">
            Tamam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
