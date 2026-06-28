"use client";

import { ETM_ARIZA_TURLER, ROB_ARIZA_TURLER, N_ARIZA_TURLER } from "@/lib/types";

type Props = {
  bolum: string;
  tur: string;
  isPending: boolean;
  onChange: (newType: string) => void;
};

export function TypeSelector({ bolum, tur, isPending, onChange }: Props) {
  const selectClass =
    "text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer disabled:opacity-50";

  if (bolum === "Pres Hücresi") {
    return (
      <select value={tur} disabled={isPending} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="Pres Öncesi">Pres Öncesi</option>
        <option value="Pres">Pres</option>
        <option value="Pres Sonrası">Pres Sonrası</option>
      </select>
    );
  }

  if (bolum === "ETM Hücresi") {
    return (
      <select value={tur} disabled={isPending} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {ETM_ARIZA_TURLER.map((opt) => (
          <option key={opt.code} value={opt.code}>{opt.code}</option>
        ))}
      </select>
    );
  }

  if (["ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(bolum)) {
    return (
      <select value={tur} disabled={isPending} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {ROB_ARIZA_TURLER.map((opt) => (
          <option key={opt.code} value={opt.code}>{opt.code}</option>
        ))}
      </select>
    );
  }

  if (["N602 Hücresi", "N603 Hücresi"].includes(bolum)) {
    return (
      <select value={tur} disabled={isPending} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {N_ARIZA_TURLER.map((opt) => (
          <option key={opt.code} value={opt.code}>{opt.code}</option>
        ))}
      </select>
    );
  }

  return (
    <select value={tur} disabled={isPending} onChange={(e) => onChange(e.target.value)} className={selectClass}>
      <option value="E">E</option>
      <option value="A">A</option>
      <option value="M">M</option>
      <option value="O">O</option>
      <option value="Kalite">Kalite</option>
      <option value="Belirsiz">Belirsiz</option>
    </select>
  );
}
