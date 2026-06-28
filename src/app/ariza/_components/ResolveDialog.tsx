"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type ArizaDetail } from "@/lib/types";
import { formatDate } from "./helpers";

type Props = {
  selectedDetail: ArizaDetail | null;
  comment: string;
  onCommentChange: (val: string) => void;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function ResolveDialog({
  selectedDetail,
  comment,
  onCommentChange,
  isPending,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Dialog
      open={selectedDetail !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Arıza giderildi</DialogTitle>
          <DialogDescription>
            {selectedDetail
              ? `${selectedDetail.bolum} · ${formatDate(selectedDetail.tarih)} · ${selectedDetail.zamanDilimi}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ariza-giderilme-aciklama">
            Arıza nasıl giderildi? *
          </label>
          <Textarea
            id="ariza-giderilme-aciklama"
            rows={5}
            placeholder="Yapılan müdahaleyi ve sonucu yazınız..."
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
            İptal
          </Button>
          <Button type="button" disabled={isPending} onClick={onSubmit}>
            {isPending ? "Kaydediliyor..." : "Tamam"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
