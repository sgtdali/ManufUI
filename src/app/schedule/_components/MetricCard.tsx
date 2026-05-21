"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Color = "blue" | "emerald" | "amber" | "purple" | "indigo";

const colorMap: Record<Color, string> = {
  blue: "bg-blue-50 text-blue-600 border border-blue-100",
  emerald: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border border-amber-100",
  purple: "bg-purple-50 text-purple-600 border border-purple-100",
  indigo: "bg-indigo-50 text-indigo-600 border border-indigo-100",
};

const barColorMap: Record<Color, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  indigo: "bg-indigo-500",
};

type Props = {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  color?: Color;
};

export function MetricCard({ icon, label, value, note, color = "blue" }: Props) {
  return (
    <Card className="rounded-xl shadow-sm border-zinc-200 bg-white hover:shadow-md transition-all duration-300 group overflow-hidden">
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
          <div
            className={`flex size-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm ${colorMap[color]}`}
          >
            {icon}
          </div>
        </div>
        <p className="text-3xl font-bold text-zinc-950 tracking-tight">{value}</p>
        {note && <p className="mt-2 text-xs font-medium text-zinc-500 line-clamp-1">{note}</p>}
        <div
          className={`absolute bottom-0 left-0 right-0 h-1 transition-all duration-300 scale-x-0 group-hover:scale-x-100 ${barColorMap[color]}`}
        />
      </CardContent>
    </Card>
  );
}
