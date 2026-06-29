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
      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Hücreler
            </p>
            <h2 className="text-sm font-semibold text-zinc-900">
              Aksiyon listesi
            </h2>
          </div>
          <Filter className="size-4 text-zinc-400" />
        </div>

        <button
          className={`mb-2 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition ${
            selectedCell === ""
              ? "bg-emerald-700 text-white"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
          onClick={() => onSelectCell("")}
        >
          <span>Tüm hücreler</span>
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              selectedCell === ""
                ? "bg-white/20 text-white"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {totalCount}
          </span>
        </button>

        <div className="max-h-[calc(100vh-140px)] space-y-1 overflow-y-auto pr-1">
          {cells.map((cell) => {
            const isSelected = selectedCell === cell;
            return (
              <button
                key={cell}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-200"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
                onClick={() => onSelectCell(cell)}
              >
                <span className="truncate">{cell}</span>
                <span
                  className={`ml-2 rounded px-2 py-0.5 text-xs ${
                    isSelected
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-100 text-zinc-600"
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
