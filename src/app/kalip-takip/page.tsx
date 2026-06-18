"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Activity, 
  Calendar, 
  Layers, 
  RefreshCw,
  Clock,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { getZamanDilimleriForCellAndDate } from "@/lib/types";
import { loadPressMoldChanges, saveManualMoldChange, deleteMoldChange } from "@/app/actions";

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
  const [records, setRecords] = useState<MoldChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
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

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSave = () => {
    if (!tarih) {
      toast.error("Lütfen bir tarih seçiniz.");
      return;
    }
    if (!siraNo) {
      toast.error("Lütfen bir zaman dilimi seçiniz.");
      return;
    }
    if (!degistirilenKalip) {
      toast.error("Lütfen değiştirilen kalıbı seçiniz.");
      return;
    }

    const selectedSlot = timeSlots.find(slot => slot.sira_no === Number(siraNo));
    if (!selectedSlot) {
      toast.error("Geçersiz zaman dilimi seçimi.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await saveManualMoldChange(
          tarih,
          selectedSlot.label,
          selectedSlot.sira_no,
          null,
          degistirilenKalip,
          description.trim() || null
        );

        if (res.success) {
          toast.success("Kalıp değişimi başarıyla kaydedildi.");
          setIsDialogOpen(false);
          // Clear form
          setSiraNo("");
          setDegistirilenKalip("");
          setDescription("");
          // Reload records
          fetchRecords();
        } else {
          toast.error(`Kaydedilemedi: ${res.error}`);
        }
      } catch (err: any) {
        toast.error(`Hata: ${err.message || err}`);
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kalıp değişim kaydını silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const res = await deleteMoldChange(id);
      if (res.success) {
        toast.success("Kayıt başarıyla silindi.");
        fetchRecords();
      } else {
        toast.error(`Silinemedi: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Hata: ${err.message || err}`);
    }
  };

  // Stats
  const totalChanges = records.length;
  const latestRecord = records[0]; // Already sorted descending by server action
  const piecesSinceLatest = latestRecord ? latestRecord.piecesAfter : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-800">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl md:text-2xl font-black text-zinc-800 tracking-tight">
              Pres Hücresİ Kalıp Değİşİm Takİbİ
            </h1>
          </div>
          <p className="text-xs text-zinc-500 font-medium pl-10">
            Kalıp montaj/demontaj geçmişini ve değişim sonrası basılan parça sayılarını izleyin.
          </p>
        </div>

        <div className="flex items-center gap-2 pl-10 md:pl-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecords}
            disabled={loading}
            className="text-xs font-bold border-zinc-200 text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="text-xs font-bold bg-zinc-900 hover:bg-zinc-850 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Manuel Değişim Ekle
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-200/80 shadow-sm rounded-xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-zinc-100 rounded-lg text-zinc-800">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Toplam Değişim
              </p>
              <h3 className="text-2xl font-black text-zinc-800 tracking-tight mt-0.5">
                {totalChanges}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 shadow-sm rounded-xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-zinc-100 rounded-lg text-zinc-800">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Son Değişim
              </p>
              <h3 className="text-sm font-bold text-zinc-800 truncate mt-0.5">
                {latestRecord ? (
                  <>
                    {latestRecord.takilan_kalip || "Boş"} 
                    <span className="text-zinc-400 font-normal text-xs ml-1">
                      ({latestRecord.tarih} - {latestRecord.zaman_dilimi})
                    </span>
                  </>
                ) : (
                  "Kayıt Yok"
                )}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 shadow-sm rounded-xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Son Kalıpla Basılan
              </p>
              <h3 className="text-2xl font-black text-blue-700 tracking-tight mt-0.5">
                {latestRecord ? `${piecesSinceLatest} Adet` : "0 Adet"}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-zinc-200 shadow-sm rounded-xl bg-white">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <CardTitle className="text-sm font-bold text-zinc-850 uppercase tracking-wider">
            Değişim Geçmişi ve Üretim Raporu
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400 font-medium">
            Her değişim satırı için, o kalıpla bir sonraki kalıp değişimine kadar üretilen toplam parça adeti hesaplanmaktadır.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-zinc-500 animate-pulse">
              Yükleniyor...
            </div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-zinc-400 flex flex-col items-center justify-center gap-2">
              <Info className="h-6 w-6 text-zinc-300" />
              Kayıtlı kalıp değişimi bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/75 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">
                    <th className="py-3 px-4">Tarih / Saat</th>
                    <th className="py-3 px-4">Değiştirilen Kalıp</th>
                    <th className="py-3 px-4">Açıklama</th>
                    <th className="py-3 px-4 text-center">Üretim Adeti</th>
                    <th className="py-3 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                  {records.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-800">{row.tarih}</div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" /> {row.zaman_dilimi}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {row.takilan_kalip ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                            {row.takilan_kalip}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500 max-w-[200px] truncate" title={row.description || ""}>
                        {row.description || <span className="text-zinc-300 italic">Girilmemiş</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-sm font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          {row.piecesBetween.toLocaleString("tr-TR")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(row.id)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Mold Change Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
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
                    setTarih(e.target.value);
                    setSiraNo(""); // Clear slot selection when date changes
                  }}
                  className="h-8 text-xs font-semibold text-zinc-700 w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manual-zaman" className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  Zaman Dilimi *
                </Label>
                <Select value={siraNo} onValueChange={(val) => setSiraNo(val || "")}>
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
              <Select value={degistirilenKalip} onValueChange={(val) => setDegistirilenKalip(val || "")}>
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
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs font-semibold text-zinc-700 placeholder-zinc-300 focus:ring-1 focus:ring-zinc-950"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)} 
              disabled={isPending}
              className="text-xs font-bold border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-8"
            >
              İptal
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isPending}
              className="text-xs font-bold bg-zinc-900 hover:bg-zinc-850 text-white h-8"
            >
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
