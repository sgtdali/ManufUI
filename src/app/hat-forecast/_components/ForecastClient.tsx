"use client";

import { useMemo, useState, useCallback, useTransition, useEffect, type ReactNode } from "react";
import { Calculator, TrendingUp, Sliders, Calendar, RotateCcw } from "lucide-react";
import { SlotActual } from "../_lib/constants";
import {
  SlotKey, slotKey, InterventionMap, Intervention,
  computeCellAverages, computeCurrentWip, computeProjection, computeFinishDates,
} from "./forecastUtils";
import { saveForecastConfig } from "../_actions/actions";
import CalibrationTable from "./CalibrationTable";
import ProjectionView from "./ProjectionView";
import InterventionPanel from "./InterventionPanel";
import CutoffPanel from "./CutoffPanel";

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
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors border border-zinc-700/50"
          >
            <RotateCcw size={14} />
            Sıfırla
          </button>
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
