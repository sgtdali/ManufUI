"use client";

import { useState, useEffect } from "react";
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
import { AciklamaDialogType } from "@/lib/types";

type Props = {
  dialogData: AciklamaDialogType | null;
  onClose: () => void;
  onConfirm: (finalText: string) => void;
  zamanDilimiLabel: string;
};

const SUB_CATEGORIES: Record<string, string[]> = {
  "Pres Öncesi": [
    "İndüksiyon",
    "WJS",
    "Hadde",
    "Diğer / Belirsiz"
  ],
  "Pres": [
    "Mekanik",
    "Elektrik",
    "Akışkan",
    "Otomasyon",
    "Kalıp",
    "Hidrolik Yağ Sıcaklık Alarmı",
    "Diğer / Belirsiz"
  ],
  "Pres Sonrası": [
    "Kaydırak",
    "Konveyör",
    "Fırın",
    "Diğer / Belirsiz"
  ]
};

const NO_DETAIL_REQUIRED = new Set(["Hidrolik Yağ Sıcaklık Alarmı"]);

export function DowntimeExplanationDialog({
  dialogData,
  onClose,
  onConfirm,
  zamanDilimiLabel,
}: Props) {
  const [subCategory, setSubCategory] = useState("");
  const [detail, setDetail] = useState("");

  const mainCategory = dialogData?.selectedAltTur || "";
  const isPressAriza = mainCategory in SUB_CATEGORIES;
  const subCats = isPressAriza ? SUB_CATEGORIES[mainCategory] : [];
  const activeSubCat = subCategory || (subCats.length > 0 ? subCats[0] : "");
  const detailRequired = !NO_DETAIL_REQUIRED.has(activeSubCat);

  useEffect(() => {
    if (dialogData) {
      const rawText = dialogData.aciklama || "";
      const match = rawText.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (match) {
        setSubCategory(match[1]);
        setDetail(match[2]);
      } else {
        setSubCategory("");
        setDetail(rawText);
      }
    } else {
      setSubCategory("");
      setDetail("");
    }
  }, [dialogData]);

  if (!dialogData) return null;

  const handleConfirm = () => {
    const selectedSub = activeSubCat;
    let combinedText: string;
    if (isPressAriza && selectedSub) {
      const trimmedDetail = detail.trim();
      combinedText = trimmedDetail ? `[${selectedSub}] ${trimmedDetail}` : `[${selectedSub}]`;
    } else {
      combinedText = detail.trim();
    }
    onConfirm(combinedText);
  };

  return (
    <Dialog open={dialogData !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            {dialogData.baslik} — {zamanDilimiLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {isPressAriza && subCats.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                Alt Kategori
              </label>
              <Select value={subCategory || subCats[0]} onValueChange={(val) => setSubCategory(val || "")}>
                <SelectTrigger className="h-8 text-xs font-semibold text-zinc-700 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {subCats.map((sc) => (
                    <SelectItem key={sc} value={sc} className="text-xs font-semibold">
                      {sc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {detailRequired && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                Detaylı Açıklama
              </label>
              <Textarea
                rows={4}
                placeholder="Duruş gerekçesini detaylıca açıklayınız..."
                value={detail}
                className="text-xs font-semibold text-zinc-700 focus:ring-1 focus:ring-blue-500"
                onChange={(e) => setDetail(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="text-xs font-bold">
            İptal
          </Button>
          <Button onClick={handleConfirm} className="text-xs font-bold">
            Tamam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
