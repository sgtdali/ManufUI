"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isReadOnlyUser } from "@/lib/useAuthRole";
import { getZamanDilimleriForCellAndDate } from "@/lib/types";
import { loadPressMoldChanges, saveManualMoldChange, deleteMoldChange } from "@/app/actions";
import { StatsCards } from "./_components/StatsCards";
import { RecordsTable } from "./_components/RecordsTable";
import { MoldChangeDialog } from "./_components/MoldChangeDialog";

interface MoldChangeRecord {
  id: string;
  tarih: string;
  zaman_dilimi: string;
  sira_no: number;
  sokulen_kalip: string | null;
  takilan_kalip: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  piecesBetween: number;
  piecesAfter: number;
}

export default function KalipTakipPage() {
  const [readOnly, setReadOnly] = useState(false);
  const [records, setRecords] = useState<MoldChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [tarih, setTarih] = useState(new Date().toISOString().split("T")[0]);
  const [siraNo, setSiraNo] = useState<string>("");
  const [degistirilenKalip, setDegistirilenKalip] = useState<string>("");
  const [description, setDescription] = useState("");

  const timeSlots = getZamanDilimleriForCellAndDate("Pres Hücresi", tarih);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await loadPressMoldChanges();
      if (res.success && res.data) {
        setRecords(res.data as MoldChangeRecord[]);
      } else {
        toast.error(`Veriler yüklenemedi: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Sistemsel Hata: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setReadOnly(isReadOnlyUser()); }, []);
  useEffect(() => { fetchRecords(); }, []);

  const handleSave = () => {
    if (readOnly) { toast.error("Salt okunur erisim — veri kaydetme yetkiniz yok."); return; }
    if (!tarih) { toast.error("Lütfen bir tarih seçiniz."); return; }
    if (!siraNo) { toast.error("Lütfen bir zaman dilimi seçiniz."); return; }
    if (!degistirilenKalip) { toast.error("Lütfen değiştirilen kalıbı seçiniz."); return; }

    const selectedSlot = timeSlots.find(slot => slot.sira_no === Number(siraNo));
    if (!selectedSlot) { toast.error("Geçersiz zaman dilimi seçimi."); return; }

    startTransition(async () => {
      try {
        const res = await saveManualMoldChange(tarih, selectedSlot.label, selectedSlot.sira_no, null, degistirilenKalip, description.trim() || null);
        if (res.success) {
          toast.success("Kalıp değişimi başarıyla kaydedildi.");
          setIsDialogOpen(false);
          setSiraNo(""); setDegistirilenKalip(""); setDescription("");
          fetchRecords();
        } else { toast.error(`Kaydedilemedi: ${res.error}`); }
      } catch (err: any) { toast.error(`Hata: ${err.message || err}`); }
    });
  };

  const handleDelete = async (id: string) => {
    if (readOnly) { toast.error("Salt okunur erisim — silme yetkiniz yok."); return; }
    if (!confirm("Bu kalıp değişim kaydını silmek istediğinize emin misiniz?")) return;
    try {
      const res = await deleteMoldChange(id);
      if (res.success) { toast.success("Kayıt başarıyla silindi."); fetchRecords(); }
      else { toast.error(`Silinemedi: ${res.error}`); }
    } catch (err: any) { toast.error(`Hata: ${err.message || err}`); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/"><Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-800"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <h1 className="text-xl md:text-2xl font-black text-zinc-800 tracking-tight">Pres Hücresİ Kalıp Değİşİm Takİbİ</h1>
          </div>
          <p className="text-xs text-zinc-500 font-medium pl-10">Kalıp montaj/demontaj geçmişini ve değişim sonrası basılan parça sayılarını izleyin.</p>
        </div>
        <div className="flex items-center gap-2 pl-10 md:pl-0">
          <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loading} className="text-xs font-bold border-zinc-200 text-zinc-700 hover:bg-zinc-50">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />Yenile
          </Button>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="text-xs font-bold bg-zinc-900 hover:bg-zinc-850 text-white">
            <Plus className="h-3.5 w-3.5 mr-1.5" />Manuel Değişim Ekle
          </Button>
        </div>
      </div>

      <StatsCards records={records} />
      <RecordsTable records={records} loading={loading} onDelete={handleDelete} />

      <MoldChangeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tarih={tarih}
        onTarihChange={setTarih}
        siraNo={siraNo}
        onSiraNoChange={setSiraNo}
        degistirilenKalip={degistirilenKalip}
        onDegistirilenKalipChange={setDegistirilenKalip}
        description={description}
        onDescriptionChange={setDescription}
        timeSlots={timeSlots}
        isPending={isPending}
        onSave={handleSave}
      />
    </div>
  );
}
