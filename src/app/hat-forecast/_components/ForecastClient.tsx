"use client";

import { useMemo, useState, useCallback, useTransition, type ReactNode } from "react";
import { Calculator, TrendingUp, Sliders } from "lucide-react";
import { SlotActual } from "../_lib/constants";
import {
  SlotKey, slotKey, InterventionMap, Intervention,
  computeCellAverages, computeCurrentWip, computeProjection, computeFinishDates,
} from "./forecastUtils";
import CalibrationTable from "./CalibrationTable";
import ProjectionView from "./ProjectionView";
import InterventionPanel from "./InterventionPanel";

type Tab = "kalibrasyon" | "projeksiyon" | "mudahale";

type Props = {
  initialActuals: SlotActual[];
  today: string;
  presEndDate: string;
  startDate: string;
};

export default function ForecastClient({ initialActuals, today, presEndDate, startDate }: Props) {
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

  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(defaultSelected);

  const handleToggleSlot = useCallback((key: SlotKey) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Intervention state ───────────────────────────────────────────────
  const [interventions, setInterventions] = useState<InterventionMap>({});

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

  // ── Derived: averages + projection ──────────────────────────────────
  const cellAverages = useMemo(
    () => computeCellAverages(actuals, selectedSlots),
    [actuals, selectedSlots]
  );

  const currentWip = useMemo(() => computeCurrentWip(actuals), [actuals]);

  const projection = useMemo(
    () => computeProjection(today, presEndDate, cellAverages, currentWip, interventions),
    [today, presEndDate, cellAverages, currentWip, interventions]
  );

  const finishDates = useMemo(
    () => computeFinishDates(projection, presEndDate),
    [projection, presEndDate]
  );

  let interventionCount = 0;
  for (const dateKey in interventions) { interventionCount += Object.keys(interventions[dateKey]).length; }

  const tabs: { id: Tab; label: string; icon: ReactNode; badge?: number }[] = [
    { id: "kalibrasyon", label: "Kalibrasyon", icon: <Calculator size={14} /> },
    { id: "projeksiyon", label: "Projeksiyon", icon: <TrendingUp size={14} /> },
    { id: "mudahale", label: "Müdahaleler", icon: <Sliders size={14} />, badge: interventionCount || undefined },
  ];

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* Tab bar */}
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
            presEndDate={presEndDate}
            today={today}
          />
        )}
        {tab === "mudahale" && (
          <InterventionPanel
            interventions={interventions}
            onSetIntervention={handleSetIntervention}
            today={today}
          />
        )}
      </div>
    </div>
  );
}
