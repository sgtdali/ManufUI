"use client";

import { Filter } from "lucide-react";

export function CellSidebar({
  cells,
  selectedCell,
  counts,
  totalCount,
  onSelectCell,
}: {
  cells: readonly string[];
  selectedCell: string;
  counts: Record<string, number>;
  totalCount: number;
  onSelectCell: (cell: string) => void;
}) {
  return (
    <aside className="xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Hücreler
            </p>
            <h2 className="text-sm font-semibold text-zinc-100">
              Aksiyon listesi
            </h2>
          </div>
          <Filter className="size-4 text-zinc-500" />
        </div>

        <button
          className={`mb-2 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition ${
            selectedCell === ""
              ? "bg-emerald-600 text-white"
              : "text-zinc-200 hover:bg-zinc-700"
          }`}
          onClick={() => onSelectCell("")}
        >
          <span>Tüm hücreler</span>
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              selectedCell === ""
                ? "bg-white/20 text-white"
                : "bg-zinc-700 text-zinc-300"
            }`}
          >
            {totalCount}
          </span>
        </button>

        <div className="max-h-[calc(100vh-140px)] space-y-1 overflow-y-auto pr-1 [scrollbar-color:theme(colors.zinc.600)_theme(colors.zinc.900)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-zinc-900 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb:hover]:bg-zinc-500">
          {cells.map((cell) => {
            const isSelected = selectedCell === cell;
            return (
              <button
                key={cell}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "bg-emerald-500/10 font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/30"
                    : "text-zinc-200 hover:bg-zinc-700"
                }`}
                onClick={() => onSelectCell(cell)}
              >
                <span className="truncate">{cell}</span>
                <span
                  className={`ml-2 rounded px-2 py-0.5 text-xs ${
                    isSelected
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {counts[cell] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
