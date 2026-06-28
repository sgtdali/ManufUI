import { formatNumber } from "./helpers";

export function SummaryPanel({
  title,
  items,
  maxMinutes,
  barColor,
}: {
  title: string;
  items: { label: string; count: number; minutes: number }[];
  maxMinutes: number;
  barColor: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-4">{title}</h3>
      <div className="space-y-4 flex-1">
        {items.map((item) => {
          const ratio = Math.max(Math.round((item.minutes / maxMinutes) * 100), 3);
          return (
            <div key={item.label} className="group">
              <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-zinc-700">
                <span className="truncate max-w-[160px]">{item.label}</span>
                <span className="text-zinc-500 whitespace-nowrap">
                  {formatNumber(item.minutes)} dk · {item.count} kez
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[120px] rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-xs font-medium text-zinc-500">
            Kayıt bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
