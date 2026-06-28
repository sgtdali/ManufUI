"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Clock, Info } from "lucide-react";

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

type Props = {
  records: MoldChangeRecord[];
  loading: boolean;
  onDelete: (id: string) => void;
};

export function RecordsTable({ records, loading, onDelete }: Props) {
  return (
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
                        onClick={() => onDelete(row.id)}
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
  );
}
