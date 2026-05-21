"use client";

import { useState } from "react";
import { Clock, Gauge, Hammer, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InfoPanel() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="rounded-xl border border-zinc-200 shadow-sm bg-white overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 bg-zinc-50/50 hover:bg-zinc-50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-500" />
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Planlama Yardımı ve Kalıp Kuralları
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
      </button>

      {open && (
        <CardContent className="p-5 border-t border-zinc-100 bg-white">
          <div className="grid gap-6 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-zinc-800">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-xs uppercase tracking-wider text-zinc-500">Başlangıç Penceresi</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-600 font-medium list-disc list-inside">
                <li>Normalizasyon fırını: 120 dk ısınma</li>
                <li>Pres öncesi parça ısıtma: 30 dk</li>
                <li>İlk pres üretimi: Yaklaşık 10:15 civarı başlar</li>
              </ul>
            </div>
            <div className="space-y-3 md:pl-6">
              <div className="flex items-center gap-2 text-zinc-800">
                <Gauge className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-xs uppercase tracking-wider text-zinc-500">Pres Kapasitesi</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-600 font-medium list-disc list-inside">
                <li>Cycle süresi: 3 dk/parça</li>
                <li>Standart günde teorik pres: 140 adet</li>
                <li>Aynı gün ETM&apos;ye hazır: En fazla 50 adet</li>
              </ul>
            </div>
            <div className="space-y-3 md:pl-6">
              <div className="flex items-center gap-2 text-zinc-800">
                <Hammer className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-xs uppercase tracking-wider text-zinc-500">Kalıp Kuralları</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-600 font-medium list-disc list-inside">
                <li>Erkek kalıp ömrü: 500 parçada yarım gün duruş</li>
                <li>Dişi kalıp ömrü: 1300 parçada 2 gün duruş</li>
                <li>Sayaçlar üretim yapıldıkça otomatik azalır</li>
              </ul>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
