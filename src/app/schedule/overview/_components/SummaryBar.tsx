"use client";

import { Activity, Calendar, Gauge, Target } from "lucide-react";
import { MetricCard } from "../../_components/MetricCard";
import { getDaysInRange, toDayKey, formatNumber } from "../../utils";

type Props = {
  actuals: Record<string, Record<string, number>>;
  startDate: string;
  endDate: string;
  campaignTarget: number;
};

export function SummaryBar({ actuals, startDate, endDate, campaignTarget }: Props) {
  // 1. Boya çıkışı (gerçekleşen)
  const boyaActuals = actuals["Boya Hücresi"] ?? {};
  const boyaTotalActual = Object.values(boyaActuals).reduce((sum, val) => sum + val, 0);

  // 2. Hedefe kalan
  const remainingTarget = Math.max(campaignTarget - boyaTotalActual, 0);

  // 3. Kalan iş günü (Mon-Fri from today to end date)
  const today = new Date();
  const todayStr = toDayKey(today);
  const startCountingFrom = startDate > todayStr ? startDate : todayStr;
  const remainingDays = getDaysInRange(startCountingFrom, endDate);
  const remainingWorkdays = remainingDays.filter((d) => {
    const day = d.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  }).length;

  // 4. Gereken günlük hız (remaining target / remaining workdays, rounded up)
  const requiredDailySpeed =
    remainingWorkdays > 0 ? Math.ceil(remainingTarget / remainingWorkdays) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        icon={<Activity className="size-5" />}
        label="Boya Çıkışı (Gerçekleşen)"
        value={formatNumber(boyaTotalActual)}
        note="Toplam boya hücresi üretimi"
        color="emerald"
      />
      <MetricCard
        icon={<Target className="size-5" />}
        label="Hedefe Kalan"
        value={formatNumber(remainingTarget)}
        note={`Kampanya hedefi: ${formatNumber(campaignTarget)}`}
        color="blue"
      />
      <MetricCard
        icon={<Calendar className="size-5" />}
        label="Kalan İş Günü"
        value={`${remainingWorkdays} gün`}
        note="Pazartesi - Cuma (Bugün dahil)"
        color="indigo"
      />
      <MetricCard
        icon={<Gauge className="size-5" />}
        label="Gereken Günlük Hız"
        value={remainingWorkdays > 0 ? formatNumber(requiredDailySpeed) : "—"}
        note="Kalan gün başına gereken üretim adeti"
        color="amber"
      />
    </div>
  );
}
