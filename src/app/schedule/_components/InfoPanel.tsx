"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Clock, Gauge, Hammer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ProcessParams } from "../utils";

type Props = {
  cellName?: string;
  processParams?: ProcessParams;
};

export function InfoPanel({ cellName = "Pres Hücresi", processParams }: Props) {
  const [open, setOpen] = useState(false);
  const isEtm = cellName === "ETM Hücresi";

  return (
    <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left bg-zinc-50/50 transition-colors hover:bg-zinc-50"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            {isEtm ? "Planlama Yardımı ve ETM Kuralları" : "Planlama Yardımı ve Kalıp Kuralları"}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
      </button>

      {open && (
        <CardContent className="border-t border-zinc-100 bg-white p-5">
          {isEtm ? (
            <div className="grid gap-6 divide-y divide-zinc-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <InfoBlock icon={<Clock className="h-4 w-4 text-blue-600" />} title="WIP Giriş Kuralı">
                <li>ETM üretimi Pres çıkışı + başlangıç WIP ile sınırlıdır</li>
                <li>Gün başı WIP, gün içi Pres çıktısı ile artar</li>
                <li>Gün sonu WIP sonraki güne devreder</li>
              </InfoBlock>
              <InfoBlock icon={<Gauge className="h-4 w-4 text-blue-600" />} title="ETM Kapasitesi" padded>
                <li>Hat çevrim süresi: {processParams?.hatCycleMinutes ?? 3} dk/parça</li>
                <li>ETM-1 ve ETM-2 prosesleri parça bazlı dengelenir</li>
                <li>Takım ve palet değişimleri kapasiteden düşülür</li>
              </InfoBlock>
              <InfoBlock icon={<Hammer className="h-4 w-4 text-blue-600" />} title="Takım / Palet Kuralları" padded>
                <li>
                  Kesici uç: {processParams?.cuttingInsertInterval ?? 10} parçada{" "}
                  {processParams?.cuttingInsertChangeMinutes ?? 5} dk
                </li>
                <li>
                  Punta matkabı: {processParams?.drillBitInterval ?? 300} parçada{" "}
                  {processParams?.drillBitChangeMinutes ?? 10} dk
                </li>
                <li>
                  Palet: {processParams?.paletInterval ?? 20} parçada {processParams?.paletChangeMinutes ?? 10} dk
                </li>
              </InfoBlock>
            </div>
          ) : (
            <div className="grid gap-6 divide-y divide-zinc-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <InfoBlock icon={<Clock className="h-4 w-4 text-blue-600" />} title="Başlangıç Penceresi">
                <li>Normalizasyon fırını: {processParams?.normalizationWarmupMinutes ?? 60} dk ısınma</li>
                <li>Pres öncesi parça ısıtma: {processParams?.prePressHeatMinutes ?? 30} dk</li>
                <li>İlk pres üretimi fırın ve kalıp hazırlığından sonra başlar</li>
              </InfoBlock>
              <InfoBlock icon={<Gauge className="h-4 w-4 text-blue-600" />} title="Pres Kapasitesi" padded>
                <li>Cycle süresi: {processParams?.pressCycleMinutes ?? 3} dk/parça</li>
                <li>Pres prosesi vardiya sonuna kadar devam edebilir</li>
                <li>Kalıp soğutma vardiya sonrasına sarkabilir</li>
              </InfoBlock>
              <InfoBlock icon={<Hammer className="h-4 w-4 text-blue-600" />} title="Kalıp Kuralları" padded>
                <li>Erkek kalıp ömrü: {processParams?.maleDieInterval ?? 500} parça</li>
                <li>Dişi kalıp ömrü: {processParams?.femaleDieInterval ?? 1300} parça</li>
                <li>Sayaçlar üretim yapıldıkça otomatik azalır</li>
              </InfoBlock>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function InfoBlock({
  icon,
  title,
  children,
  padded = false,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div className={`space-y-3 ${padded ? "md:pl-6" : ""}`}>
      <div className="flex items-center gap-2 text-zinc-800">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</span>
      </div>
      <ul className="list-inside list-disc space-y-1.5 text-xs font-medium text-zinc-600">{children}</ul>
    </div>
  );
}
