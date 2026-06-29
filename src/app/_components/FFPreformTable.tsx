"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FFPreformRow, FFPreformRejectRow, FFPreformReworkRow } from "@/lib/types";
import {
  loadFFPreformMeasurement,
  loadFFPreformRejects,
  loadFFPreformReworks,
  saveFFPreformMeasurement,
} from "../actions";
import { RejectTable, ReworkTable } from "./RejectReworkTables";

type Props = {
  tarih: string;
  sorumlu: string;
};

export function FFPreformTable({ tarih, sorumlu }: Props) {
  const [rows, setRows] = useState<FFPreformRow[]>([]);
  const [rejects, setRejects] = useState<FFPreformRejectRow[]>([]);
  const [reworks, setReworks] = useState<FFPreformReworkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const getEmptyRows = (): FFPreformRow[] => {
    return Array.from({ length: 6 }, (_, i) => ({
      sira_no: i + 1,
      olculen_adet: null,
      red_adet: null,
      rework_adet: null,
    }));
  };

  useEffect(() => {
    if (!tarih) return;
    let cancelled = false;
    setLoading(true);

    loadFFPreformMeasurement(tarih).then((data) => {
      if (cancelled) return;
      if (data && data.length > 0) {
        const loadedRows = Array.from({ length: 6 }, (_, i) => {
          const matching = data.find((r) => r.sira_no === i + 1);
          return { id: matching?.id, sira_no: i + 1, olculen_adet: matching?.olculen_adet ?? null, red_adet: matching?.red_adet ?? null, rework_adet: matching?.rework_adet ?? null };
        });
        setRows(loadedRows);
        const computedTotalRejects = loadedRows.reduce((acc, r) => acc + (r.red_adet || 0), 0);
        const computedTotalReworks = loadedRows.reduce((acc, r) => acc + (r.rework_adet || 0), 0);

        Promise.all([loadFFPreformRejects(tarih), loadFFPreformReworks(tarih)]).then(([rejectData, reworkData]) => {
          if (cancelled) return;
          setLoading(false);
          setRejects(Array.from({ length: computedTotalRejects }, (_, idx) => {
            const dbReject = rejectData && rejectData.find((rj) => rj.sira_no === idx + 1);
            return { id: dbReject?.id, sira_no: idx + 1, parca_no: dbReject?.parca_no ?? "", red_sebebi: dbReject?.red_sebebi ?? "" };
          }));
          setReworks(Array.from({ length: computedTotalReworks }, (_, idx) => {
            const dbRework = reworkData && reworkData.find((rw) => rw.sira_no === idx + 1);
            return { id: dbRework?.id, sira_no: idx + 1, parca_no: dbRework?.parca_no ?? "", rework_nedeni: dbRework?.rework_nedeni ?? "" };
          }));
          toast.success(`FF Preform Ölçüm, Red ve Rework kayıtları (${tarih}) yüklendi.`);
        });
      } else {
        setRows(getEmptyRows());
        setRejects([]);
        setReworks([]);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [tarih]);

  const handleInputChange = (index: number, field: keyof FFPreformRow, value: string) => {
    const num = value === "" ? null : parseInt(value, 10);
    setRows((prev) => { const next = [...prev]; next[index] = { ...next[index], [field]: isNaN(num as any) ? null : num }; return next; });
  };

  const handleRejectInputChange = (index: number, field: keyof FFPreformRejectRow, value: string) => {
    setRejects((prev) => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next; });
  };

  const handleReworkInputChange = (index: number, field: keyof FFPreformReworkRow, value: string) => {
    setReworks((prev) => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next; });
  };

  const totalRejects = rows.reduce((acc, r) => acc + (r.red_adet || 0), 0);
  const totalReworks = rows.reduce((acc, r) => acc + (r.rework_adet || 0), 0);

  useEffect(() => {
    setRejects((prev) => {
      if (prev.length === totalRejects) return prev;
      if (prev.length < totalRejects) {
        const added = Array.from({ length: totalRejects - prev.length }, (_, i) => ({ sira_no: prev.length + i + 1, parca_no: "", red_sebebi: "" }));
        return [...prev, ...added];
      }
      return prev.slice(0, totalRejects);
    });
  }, [totalRejects]);

  useEffect(() => {
    setReworks((prev) => {
      if (prev.length === totalReworks) return prev;
      if (prev.length < totalReworks) {
        const added = Array.from({ length: totalReworks - prev.length }, (_, i) => ({ sira_no: prev.length + i + 1, parca_no: "", rework_nedeni: "" }));
        return [...prev, ...added];
      }
      return prev.slice(0, totalReworks);
    });
  }, [totalReworks]);

  const handleSave = () => {
    if (totalRejects > 0 && rejects.some((r) => !r.parca_no.trim() || !r.red_sebebi.trim())) {
      toast.error("Lütfen tüm red sebepleri için 'Parça No' ve 'Red Sebebi' alanlarını doldurunuz.", { duration: 5000 });
      return;
    }
    if (totalReworks > 0 && reworks.some((r) => !r.parca_no.trim() || !r.rework_nedeni.trim())) {
      toast.error("Lütfen tüm rework nedenleri için 'Parça No' ve 'Rework Nedeni' alanlarını doldurunuz.", { duration: 5000 });
      return;
    }
    startSaving(async () => {
      try {
        const res = await saveFFPreformMeasurement(tarih, sorumlu, rows, rejects, reworks);
        if (res.success) { toast.success("Tüm Ölçüm, Red ve Rework kayıtları başarıyla kaydedildi."); }
        else { toast.error(`Hata: ${res.error}`); }
      } catch (err: any) { toast.error(`Sistemsel Hata: ${err.message || err}`); }
    });
  };

  return (
    <Card className="border-zinc-200 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
        <CardTitle className="text-sm font-bold text-zinc-800 flex items-center gap-3 uppercase tracking-wider">
          FF Preform Ölçüm Verisi
          {loading && <span className="text-xs font-semibold text-blue-600 animate-pulse">Yükleniyor...</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50/70 border-b border-zinc-200 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                <th className="py-3 pl-4 pr-3 font-semibold text-left w-24 border-r border-zinc-200 bg-zinc-50">Ölçüm No</th>
                <th className="px-3 py-3 text-center font-semibold">Ölçülen Adet</th>
                <th className="px-3 py-3 text-center font-semibold">Red Parça Sayısı</th>
                <th className="px-3 py-3 text-center font-semibold">Rework Parça Sayısı</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.sira_no} className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/20"}`}>
                  <td className="py-3 pl-4 pr-3 font-semibold text-blue-700 w-24 border-r border-zinc-200 bg-zinc-50">{row.sira_no}. Ölçüm</td>
                  <td className="px-3 py-2 text-center"><Input type="number" min={0} className="h-8 text-center w-32 mx-auto text-xs font-semibold" value={row.olculen_adet === null ? "" : row.olculen_adet} onChange={(e) => handleInputChange(i, "olculen_adet", e.target.value)} disabled={loading || isSaving} /></td>
                  <td className="px-3 py-2 text-center"><Input type="number" min={0} className="h-8 text-center w-32 mx-auto text-xs font-semibold text-red-600" value={row.red_adet === null ? "" : row.red_adet} onChange={(e) => handleInputChange(i, "red_adet", e.target.value)} disabled={loading || isSaving} /></td>
                  <td className="px-3 py-2 text-center"><Input type="number" min={0} className="h-8 text-center w-32 mx-auto text-xs font-semibold text-amber-600" value={row.rework_adet === null ? "" : row.rework_adet} onChange={(e) => handleInputChange(i, "rework_adet", e.target.value)} disabled={loading || isSaving} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalRejects > 0 && <RejectTable rejects={rejects} onRejectChange={handleRejectInputChange} disabled={loading || isSaving} />}
        {totalReworks > 0 && <ReworkTable reworks={reworks} onReworkChange={handleReworkInputChange} disabled={loading || isSaving} />}
        <div className="p-4 flex justify-end border-t border-zinc-150 bg-zinc-50/30">
          <Button type="button" onClick={handleSave} disabled={loading || isSaving} className="px-8 text-xs font-bold uppercase tracking-wider">
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
