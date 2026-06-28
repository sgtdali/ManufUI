"use client";

import { Input } from "@/components/ui/input";
import type { FFPreformRejectRow, FFPreformReworkRow } from "@/lib/types";

export function RejectTable({
  rejects,
  onRejectChange,
  disabled,
}: {
  rejects: FFPreformRejectRow[];
  onRejectChange: (index: number, field: keyof FFPreformRejectRow, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-6 border-t border-zinc-200">
      <div className="p-4 bg-zinc-50/50 border-b border-zinc-200">
        <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Red Sebepleri</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50/70 border-b border-zinc-200 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-800">
              <th className="py-3 pl-4 pr-3 font-semibold text-left w-24 border-r border-zinc-200 bg-zinc-50">Sıra No</th>
              <th className="px-3 py-3 text-center font-semibold w-[250px]">Parça No</th>
              <th className="px-3 py-3 text-center font-semibold">Red Sebebi</th>
            </tr>
          </thead>
          <tbody>
            {rejects.map((rejectRow, idx) => (
              <tr key={rejectRow.sira_no} className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/20"}`}>
                <td className="py-3 pl-4 pr-3 font-semibold text-blue-700 w-24 border-r border-zinc-200 bg-zinc-50">{rejectRow.sira_no}. Red</td>
                <td className="px-3 py-2 text-center">
                  <Input type="text" className="h-8 text-center w-full max-w-[200px] mx-auto text-xs font-semibold" placeholder="Parça No giriniz..." value={rejectRow.parca_no} onChange={(e) => onRejectChange(idx, "parca_no", e.target.value)} disabled={disabled} />
                </td>
                <td className="px-3 py-2 text-center">
                  <Input type="text" className="h-8 text-left w-full text-xs font-semibold" placeholder="Red sebebini giriniz..." value={rejectRow.red_sebebi} onChange={(e) => onRejectChange(idx, "red_sebebi", e.target.value)} disabled={disabled} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReworkTable({
  reworks,
  onReworkChange,
  disabled,
}: {
  reworks: FFPreformReworkRow[];
  onReworkChange: (index: number, field: keyof FFPreformReworkRow, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-6 border-t border-zinc-200">
      <div className="p-4 bg-zinc-50/50 border-b border-zinc-200">
        <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider text-amber-800">Rework Sebepleri</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50/70 border-b border-zinc-200 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-800">
              <th className="py-3 pl-4 pr-3 font-semibold text-left w-24 border-r border-zinc-200 bg-zinc-50">Sıra No</th>
              <th className="px-3 py-3 text-center font-semibold w-[250px]">Parça No</th>
              <th className="px-3 py-3 text-center font-semibold">Rework Nedeni</th>
            </tr>
          </thead>
          <tbody>
            {reworks.map((reworkRow, idx) => (
              <tr key={reworkRow.sira_no} className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/20"}`}>
                <td className="py-3 pl-4 pr-3 font-semibold text-blue-700 w-24 border-r border-zinc-200 bg-zinc-50">{reworkRow.sira_no}. Rework</td>
                <td className="px-3 py-2 text-center">
                  <Input type="text" className="h-8 text-center w-full max-w-[200px] mx-auto text-xs font-semibold" placeholder="Parça No giriniz..." value={reworkRow.parca_no} onChange={(e) => onReworkChange(idx, "parca_no", e.target.value)} disabled={disabled} />
                </td>
                <td className="px-3 py-2 text-center">
                  <Input type="text" className="h-8 text-left w-full text-xs font-semibold" placeholder="Rework nedenini giriniz..." value={reworkRow.rework_nedeni} onChange={(e) => onReworkChange(idx, "rework_nedeni", e.target.value)} disabled={disabled} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
