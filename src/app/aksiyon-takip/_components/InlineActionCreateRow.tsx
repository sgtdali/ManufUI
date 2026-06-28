"use client";

import { statusColor } from "./helpers";

export function InlineActionCreateRow({
  selectedCell, title, isPending, onTitleChange, onCreate,
  onEmptyBlur, depth = 0, placeholder, showCellColumn,
  isAuthorized, ensureAuthorized,
}: {
  selectedCell: string;
  title: string;
  isPending: boolean;
  onTitleChange: (title: string) => void;
  onCreate: () => void;
  onEmptyBlur?: () => void;
  depth?: number;
  placeholder?: string;
  showCellColumn: boolean;
  isAuthorized: boolean;
  ensureAuthorized: (cb: () => void) => void;
}) {
  const disabled = !selectedCell || isPending;

  return (
    <tr className="border-t border-dashed border-zinc-200 bg-zinc-50/60">
      <td className="px-3 py-3 text-zinc-300">
        {depth > 0 ? <span style={{ marginLeft: depth * 12 }}>└</span> : "+"}
      </td>
      <td className="px-3 py-3">
        <div
          onClickCapture={(e) => {
            if (!isAuthorized) {
              e.stopPropagation();
              e.preventDefault();
              ensureAuthorized(() => {});
            }
          }}
        >
          <input
            className="h-8 w-full rounded-md border border-transparent bg-white px-2 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => {
              if (!title.trim() && onEmptyBlur) { onEmptyBlur(); return; }
              onCreate();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); onCreate(); }
            }}
            placeholder={selectedCell ? placeholder ?? "Yeni aksiyon yazın, Enter ile ekleyin" : "Yeni aksiyon için soldan hücre seçin"}
            style={{ paddingLeft: depth > 0 ? depth * 12 : undefined }}
            disabled={disabled || !isAuthorized}
          />
        </div>
      </td>
      {showCellColumn ? (
        <td className="px-3 py-3">
          {selectedCell ? (
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">{selectedCell}</span>
          ) : (
            <span className="text-xs text-zinc-400">-</span>
          )}
        </td>
      ) : null}
      <td className="px-3 py-3 text-zinc-400">-</td>
      <td className="px-3 py-3 text-zinc-400">-</td>
      <td className="px-3 py-3 text-zinc-400">-</td>
      <td className="px-3 py-3">
        <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${statusColor("Açık")}`}>Açık</span>
      </td>
      <td className="px-3 py-3 text-xs text-zinc-400">Enter</td>
    </tr>
  );
}
