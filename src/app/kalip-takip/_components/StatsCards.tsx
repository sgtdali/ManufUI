"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Activity, Calendar, Layers } from "lucide-react";

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

export function StatsCards({ records }: { records: MoldChangeRecord[] }) {
  const totalChanges = records.length;
  const latestRecord = records[0];
  const piecesSinceLatest = latestRecord ? latestRecord.piecesAfter : 0;

  return (
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
  );
}
