export function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-extrabold text-zinc-950 tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-zinc-500 font-medium">{note}</p>
    </div>
  );
}
