"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bolum: string;
  tarih: string;
  onConfirm: () => void;
};

export function OverwriteConfirmDialog({
  isOpen,
  onOpenChange,
  bolum,
  tarih,
  onConfirm,
}: Props) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-900 font-bold">Mevcut kayıt güncellenecek</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-600 font-medium text-xs leading-relaxed">
            <strong>{bolum}</strong> bölümü için{" "}
            <strong>{tarih}</strong> tarihli kayıt zaten mevcut.
            Değişiklikleriniz mevcut verinin üzerine yazılacak. Devam etmek
            istiyor musunuz?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-xs font-bold">İptal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="text-xs font-bold">
            Güncelle
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
