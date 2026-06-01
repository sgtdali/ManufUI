"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Hammer, TrendingUp, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoldChange } from "../actions";
import { SHIFT_MINUTES } from "../constants";
import type { DayPlan, DayOverride } from "../types";
import { formatNumber } from "../utils";
import { buildGanttSegments } from "./ScheduleTable";

type Props = {
  schedule: DayPlan[];
  cellName: string;
  periodGap: number;
  neededPerRecoveryDay: number;
  extraMinutesPerRecoveryDay: number;
  requiredHolidayDays: number;
  overrides: Record<string, DayOverride>;
  moldChanges: MoldChange[];
};

type ActionTone = "danger" | "warning" | "info" | "success";

type ActionItem = {
  title: string;
  value: string;
  detail: string;
  tone: ActionTone;
  Icon: typeof AlertTriangle;
};

const toneClasses: Record<ActionTone, string> = {
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const iconClasses: Record<ActionTone, string> = {
  danger: "bg-rose-100 text-rose-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
};

export function OperationsActionPanel({
  schedule,
  cellName,
  periodGap,
  neededPerRecoveryDay,
  extraMinutesPerRecoveryDay,
  requiredHolidayDays,
  overrides,
  moldChanges,
}: Props) {
  const isPress = cellName === "Pres Hücresi";
  const workdays = schedule.filter((day) => day.isWorkday);
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcomingDays = workdays.filter((day) => day.key >= todayKey);
  const candidateDays = upcomingDays.length > 0 ? upcomingDays : workdays;

  const gapDay = candidateDays.find((day) => day.targetGap > 0);
  const overtimeInfo = candidateDays
    .map((day) => {
      const gantt = buildGanttSegments(
        day,
        isPress,
        moldChanges.filter((change) => change.tarih === day.key),
        overrides[day.key]
      );
      const shiftSegment = gantt.segments.find((segment) => segment.id === "shift");
      const standardDuration = day.isBaseWorkday ? SHIFT_MINUTES : 480;
      const overtimeMinutes = shiftSegment ? Math.max(shiftSegment.end - shiftSegment.start - standardDuration, 0) : 0;
      return { day, overtimeMinutes };
    })
    .find((item) => item.overtimeMinutes > 0);
  const breakdownDay = [...candidateDays].sort((a, b) => b.breakdownMinutes - a.breakdownMinutes)[0];
  const moldRiskDay = isPress
    ? candidateDays.find((day) => day.maleRemainingEnd <= 100 || day.femaleRemainingEnd <= 150 || day.maintenanceMinutes > 0)
    : undefined;

  const actions: ActionItem[] = [];

  if (periodGap > 0) {
    actions.push({
      title: "Açığı kapat",
      value: `${formatNumber(periodGap)} adet açık`,
      detail:
        neededPerRecoveryDay > 0
          ? `Kalan plan günlerine +${formatNumber(neededPerRecoveryDay)} adet/gün yay. Yaklaşık +${formatNumber(extraMinutesPerRecoveryDay)} dk/gün ek süre gerekir.`
          : `${requiredHolidayDays} tatil günü çalışması senaryosunu değerlendir.`,
      tone: "danger",
      Icon: TrendingUp,
    });
  }

  if (gapDay) {
    actions.push({
      title: "İlk kritik günü aç",
      value: `${gapDay.label}: -${formatNumber(gapDay.targetGap)} adet`,
      detail: "Gantt detayını açıp üretim süresi, vardiya bitişi veya duruş bloklarını kontrol et.",
      tone: "warning",
      Icon: CalendarClock,
    });
  }

  if (moldRiskDay) {
    const maleRisk = moldRiskDay.maleRemainingEnd <= 100;
    const femaleRisk = moldRiskDay.femaleRemainingEnd <= 150;
    actions.push({
      title: "Kalıp riskini planla",
      value: moldRiskDay.label,
      detail:
        moldRiskDay.maintenanceMinutes > 0
          ? `${moldRiskDay.maintenanceLabel} planı var; vardiya ve ısıtma bloklarıyla çakışmayı kontrol et.`
          : `${maleRisk ? `Erkek ${formatNumber(moldRiskDay.maleRemainingEnd)}` : ""}${maleRisk && femaleRisk ? ", " : ""}${femaleRisk ? `Dişi ${formatNumber(moldRiskDay.femaleRemainingEnd)}` : ""} kalan ömür kritik seviyede.`,
      tone: "warning",
      Icon: Hammer,
    });
  }

  if (breakdownDay && breakdownDay.breakdownMinutes > 0) {
    actions.push({
      title: "Duruş sebebini takip et",
      value: `${breakdownDay.label}: ${formatNumber(breakdownDay.breakdownMinutes)} dk`,
      detail: breakdownDay.breakdownDetails.join(", ") || "Arıza/duruş detayı girilmiş; üretim açığına etkisini kontrol et.",
      tone: "danger",
      Icon: Wrench,
    });
  }

  if (overtimeInfo) {
    actions.push({
      title: "Fazla mesaiyi doğrula",
      value: `${overtimeInfo.day.label}: +${formatNumber(overtimeInfo.overtimeMinutes)} dk`,
      detail: "Vardiya çubuğu planlanan işi kapsıyor; operasyonda uygulanabilirliğini teyit et.",
      tone: "info",
      Icon: Clock3,
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "Plan dengede",
      value: "Acil aksiyon yok",
      detail: "Seçili dönemde hedef, duruş ve kalıp riski için kritik bir uyarı görünmüyor.",
      tone: "success",
      Icon: CheckCircle2,
    });
  }

  return (
    <Card className="rounded-lg border-zinc-200 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-100 pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-sm font-bold text-zinc-900">
          <span>Operasyon aksiyonları</span>
          <span className="text-[11px] font-semibold text-zinc-500">
            {cellName} · {actions.length} öneri
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {actions.slice(0, 5).map(({ title, value, detail, tone, Icon }) => (
            <div key={`${title}-${value}`} className={`rounded-md border p-3 ${toneClasses[tone]}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${iconClasses[tone]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">{title}</p>
                  <p className="mt-1 text-sm font-bold">{value}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed opacity-80">{detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
