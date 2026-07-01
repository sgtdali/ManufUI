"use client";

import { useMemo, useState, useCallback, useTransition, useEffect, type ReactNode } from "react";
import { Calculator, TrendingUp, Sliders, Calendar, RotateCcw, FileDown } from "lucide-react";
import { SlotActual, FORECAST_CELLS } from "../_lib/constants";
import type { RaporPayload } from "../../api/hat-kapanis-raporu/route";
import {
  SlotKey, slotKey, InterventionMap, Intervention,
  computeCellAverages, computeCurrentWip, computeProjection, computeFinishDates,
  addDays,
} from "./forecastUtils";
import { saveForecastConfig } from "../_actions/actions";
import CalibrationTable from "./CalibrationTable";
import ProjectionView from "./ProjectionView";
import InterventionPanel from "./InterventionPanel";
import CutoffPanel from "./CutoffPanel";

// ── Rapor sabitleri ──────────────────────────────────────────────────────────
const CELL_SHORT: Record<string, string> = {
  "Pres Hücresi": "Pres",
  "ETM Hücresi": "ETM",
  "ROB108 Hücresi": "ROB108",
  "Flowform Hücresi": "Flowform",
  "ROB104 Hücresi": "ROB104",
  "N602 Hücresi": "N602",
  "N603 Hücresi": "N603",
  "ROB109 Hücresi": "ROB109",
  "Quench Hücresi": "Quench",
  "ROB110-111 Hücresi": "ROB110-111",
  "Fosfat Hücresi": "Fosfat",
  "Boya Hücresi": "Boya",
};

// Devredilen WIP: hangi hücrenin wipCikan'ına bakılacak (o hücrenin giriş junction'ı)
const WIP_CIKAN_CELL: Partial<Record<string, string>> = {
  "ETM Hücresi": "ROB108 Hücresi",
  "ROB108 Hücresi": "Flowform Hücresi",
  "Flowform Hücresi": "ROB104 Hücresi",
  "ROB104 Hücresi": "N602 Hücresi",
  "N602 Hücresi": "ROB109 Hücresi",
  "N603 Hücresi": "ROB109 Hücresi",
  "ROB109 Hücresi": "Quench Hücresi",
  "Quench Hücresi": "ROB110-111 Hücresi",
  "ROB110-111 Hücresi": "Fosfat Hücresi",
  "Fosfat Hücresi": "Boya Hücresi",
};

const WIP_LABEL: Record<string, string> = {
  "ETM Hücresi": "ROB108 girişinde",
  "ROB108 Hücresi": "Flowform girişinde",
  "Flowform Hücresi": "ROB104 girişinde",
  "ROB104 Hücresi": "N602 girişinde",
  "N602 Hücresi": "ROB109 girişinde",
  "N603 Hücresi": "ROB109 girişinde",
  "ROB109 Hücresi": "Quench girişinde",
  "Quench Hücresi": "ROB110-111 girişinde",
  "ROB110-111 Hücresi": "Fosfat girişinde",
  "Fosfat Hücresi": "Boya girişinde",
};

const BASE_HOURS: Record<string, number> = {
  "Flowform Hücresi": 13,
};

type Tab = "kalibrasyon" | "projeksiyon" | "mudahale" | "kesis";

type Props = {
  initialActuals: SlotActual[];
  today: string;
  startDate: string;
  initialSelectedSlots: string[] | null;
  initialInterventions: InterventionMap | null;
  initialCutoffDates: Record<string, string> | null;
};

export default function ForecastClient({
  initialActuals,
  today,
  startDate,
  initialSelectedSlots,
  initialInterventions,
  initialCutoffDates,
}: Props) {
  const [actuals, setActuals] = useState<SlotActual[]>(initialActuals);
  const [tab, setTab] = useState<Tab>("kalibrasyon");
  const [isPending, startTransition] = useTransition();

  // ── Calibration state ────────────────────────────────────────────────
  // Default: all slots selected
  const defaultSelected = useMemo(() => {
    const s = new Set<SlotKey>();
    for (const a of initialActuals) s.add(slotKey(a.bolum, a.tarih, a.zamanDilimi));
    return s;
  }, [initialActuals]);

  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(() => {
    if (initialSelectedSlots) {
      return new Set(initialSelectedSlots as SlotKey[]);
    }
    return defaultSelected;
  });

  const [interventions, setInterventions] = useState<InterventionMap>(initialInterventions ?? {});
  const [cutoffDates, setCutoffDates] = useState<Record<string, string>>(() => {
    return initialCutoffDates ?? { "Pres Hücresi": "2026-07-09" };
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Mark as loaded on client mount (prevents SSR/hydration warnings and allows saving)
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Save selectedSlots, interventions and cutoffDates to Supabase with debouncing to avoid API throttling
  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(async () => {
      await saveForecastConfig(Array.from(selectedSlots), interventions, cutoffDates);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedSlots, interventions, cutoffDates, isLoaded]);

  const handleToggleSlot = useCallback((key: SlotKey) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Intervention state ───────────────────────────────────────────────
  const handleSetIntervention = useCallback((tarih: string, bolum: string, iv: Intervention | null) => {
    setInterventions((prev) => {
      const next = { ...prev };
      if (iv === null) {
        if (next[tarih]) {
          const cells = { ...next[tarih] };
          delete cells[bolum];
          if (Object.keys(cells).length === 0) delete next[tarih];
          else next[tarih] = cells;
        }
      } else {
        next[tarih] = { ...(next[tarih] ?? {}), [bolum]: iv };
      }
      return next;
    });
  }, []);

  // ── Cutoff dates state ────────────────────────────────────────────────
  const handleSetCutoffDate = useCallback((bolum: string, dateStr: string | null) => {
    setCutoffDates((prev) => {
      const next = { ...prev };
      if (dateStr === null) {
        delete next[bolum];
      } else {
        next[bolum] = dateStr;
      }
      return next;
    });
  }, []);

  const handleResetAll = useCallback(() => {
    if (window.confirm("Tüm kalibrasyon seçimlerini, gelecek müdahalelerini ve kapanış tarihlerini sıfırlamak istediğinize emin misiniz?")) {
      setSelectedSlots(defaultSelected);
      setInterventions({});
      const defaultCutoff = { "Pres Hücresi": "2026-07-09" };
      setCutoffDates(defaultCutoff);
      startTransition(async () => {
        await saveForecastConfig(Array.from(defaultSelected), {}, defaultCutoff);
      });
    }
  }, [defaultSelected]);

  // ── Derived: averages + projection ──────────────────────────────────
  const cellAverages = useMemo(
    () => computeCellAverages(actuals, selectedSlots),
    [actuals, selectedSlots]
  );

  const currentWip = useMemo(() => computeCurrentWip(actuals), [actuals]);

  const projection = useMemo(
    () => computeProjection(today, cutoffDates, cellAverages, currentWip, interventions),
    [today, cutoffDates, cellAverages, currentWip, interventions]
  );

  const finishDates = useMemo(
    () => computeFinishDates(projection, cutoffDates),
    [projection, cutoffDates]
  );

  const [isDownloading, setIsDownloading] = useState(false);

  // Devredilen WIP için kapanış gününün değil, kapanış tarihi (son üretim + 1) günü kullanılır.
  // Çünkü downstream hücre o gün müdahale ile çalışıp junction'dan tüketim yapıyor olabilir.
  const closureRows = useMemo(() =>
    FORECAST_CELLS.filter(
      (cell) => cell === "Pres Hücresi" || finishDates[cell] !== null
    ).map((cell) => {
      const fd = finishDates[cell] ?? null;
      const lastDay = fd ? projection.find((d) => d.tarih === fd) : null;
      const sonGunUretim = lastDay ? (lastDay.cells[cell]?.uretim ?? null) : null;
      const wipRefCell = WIP_CIKAN_CELL[cell];
      const nextDateStr = fd ? addDays(fd, 1) : null;
      const nextDay = nextDateStr ? projection.find((d) => d.tarih === nextDateStr) : null;
      const devredenWip =
        cell === "Pres Hücresi"
          ? null
          : wipRefCell
          ? (nextDay?.cells[wipRefCell]?.wipCikan ?? lastDay?.cells[wipRefCell]?.wipCikan ?? null)
          : null;
      return {
        name: CELL_SHORT[cell] ?? cell,
        kapanisTarihi: fd,
        sonGunUretim,
        devredenWip,
        wipLabel: WIP_LABEL[cell] ?? "",
      };
    }),
    [finishDates, projection]
  );

  const handleDownloadRapor = useCallback(async () => {
    setIsDownloading(true);
    try {
      const averages = FORECAST_CELLS
        .filter((c) => c !== "Pres Hücresi")
        .map((c) => {
          const avg = cellAverages[c] ?? 0;
          const baseH = BASE_HOURS[c] ?? 9;
          return { name: CELL_SHORT[c] ?? c, saatlikOrt: avg, gunlukProj: avg * baseH };
        });

      const futureInterventions: Record<string, string[]> = {};
      for (const [tarih, bolumMap] of Object.entries(interventions)) {
        if (tarih < today) continue;
        for (const [bolum, iv] of Object.entries(bolumMap)) {
          const label = iv.disabled
            ? `${tarih}: kapalı`
            : iv.extraHours
            ? `${tarih}: +${iv.extraHours} saat ek mesai`
            : null;
          if (!label) continue;
          if (!futureInterventions[bolum]) futureInterventions[bolum] = [];
          futureInterventions[bolum].push(label);
        }
      }
      const interventionsList = Object.entries(futureInterventions).map(([bolum, plans]) => ({
        name: CELL_SHORT[bolum] ?? bolum,
        plan: plans.join("; "),
      }));

      const actualsByCell: Record<string, number> = {};
      for (const a of actuals) {
        actualsByCell[a.bolum] = (actualsByCell[a.bolum] ?? 0) + a.uretimAdeti;
      }
      const toplamRows = FORECAST_CELLS
        .filter((c) => c !== "Pres Hücresi")
        .map((c) => {
          const actual = actualsByCell[c] ?? 0;
          const proj = projection.reduce((sum, d) => sum + (d.cells[c]?.uretim ?? 0), 0);
          return { name: CELL_SHORT[c] ?? c, toplam: actual + proj };
        });

      const presEndDate = cutoffDates["Pres Hücresi"] || "2026-07-09";
      const presEndDateFormatted = new Date(`${presEndDate}T00:00:00`).toLocaleDateString("tr-TR", {
        day: "numeric", month: "long", year: "numeric",
      });

      const nonPresDates = FORECAST_CELLS
        .filter((c) => c !== "Pres Hücresi" && finishDates[c] !== null)
        .map((c) => finishDates[c] as string)
        .sort();
      const fmtShort = (d: string) =>
        new Date(`${d}T00:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
      const fmtLong = (d: string) =>
        new Date(`${d}T00:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
      const nonPresFinishRange =
        nonPresDates.length > 0
          ? `${fmtShort(nonPresDates[0])} – ${fmtLong(nonPresDates[nonPresDates.length - 1])}`
          : "—";

      const payload: RaporPayload = {
        today,
        startDate,
        selectedSlotsCount: selectedSlots.size,
        presEndDateFormatted,
        nonPresFinishRange,
        averages,
        interventionsList,
        closureRows,
        toplamRows,
        footerNote: null,
      };

      const res = await fetch("/api/hat-kapanis-raporu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Rapor oluşturulamadı");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hat_Kapanis_Raporu_${today}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Rapor indirilemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsDownloading(false);
    }
  }, [today, startDate, selectedSlots, cellAverages, interventions, actuals, projection, finishDates, cutoffDates, closureRows]);

  let interventionCount = 0;
  for (const dateKey in interventions) { interventionCount += Object.keys(interventions[dateKey]).length; }

  const cutoffCount = Object.keys(cutoffDates).filter(k => cutoffDates[k] !== "").length;

  const tabs: { id: Tab; label: string; icon: ReactNode; badge?: number }[] = [
    { id: "kalibrasyon", label: "Kalibrasyon", icon: <Calculator size={14} /> },
    { id: "projeksiyon", label: "Projeksiyon", icon: <TrendingUp size={14} /> },
    { id: "mudahale", label: "Müdahaleler", icon: <Sliders size={14} />, badge: interventionCount || undefined },
    { id: "kesis", label: "Kapanış Tarihleri", icon: <Calendar size={14} />, badge: cutoffCount || undefined },
  ];

  const currentPresEndDate = cutoffDates["Pres Hücresi"] || "2026-07-09";

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* Tab bar and Reset button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative ${
                tab === t.id
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.icon}
              {t.label}
              {t.badge !== undefined && (
                <span className="ml-1 text-[10px] bg-emerald-600 text-white rounded-full px-1.5 py-0.5 font-bold">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoaded && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadRapor}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white transition-colors"
            >
              <FileDown size={14} />
              {isDownloading ? "Hazırlanıyor..." : "Raporu İndir"}
            </button>
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors border border-zinc-700/50"
            >
              <RotateCcw size={14} />
              Sıfırla
            </button>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="min-h-0">
        {tab === "kalibrasyon" && (
          <CalibrationTable
            actuals={actuals}
            selectedSlots={selectedSlots}
            onToggleSlot={handleToggleSlot}
            cellAverages={cellAverages}
          />
        )}
        {tab === "projeksiyon" && (
          <ProjectionView
            projection={projection}
            finishDates={finishDates}
            presEndDate={currentPresEndDate}
            today={today}
            actuals={actuals}
          />
        )}
        {tab === "mudahale" && (
          <InterventionPanel
            interventions={interventions}
            onSetIntervention={handleSetIntervention}
            today={today}
          />
        )}
        {tab === "kesis" && (
          <CutoffPanel
            cutoffDates={cutoffDates}
            onSetCutoffDate={handleSetCutoffDate}
            today={today}
          />
        )}
      </div>
    </div>
  );
}
