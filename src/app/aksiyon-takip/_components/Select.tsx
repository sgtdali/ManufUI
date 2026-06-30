"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  triggerClassName,
  align = "left",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
  align?: "left" | "right";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className={
          triggerClassName ??
          "h-9 w-full inline-flex items-center justify-between gap-2 rounded-md border border-zinc-600 bg-zinc-700/40 px-3 text-sm text-zinc-100 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        <span className={`truncate ${selected ? "" : "text-zinc-500"}`}>{selected ? selected.label : placeholder ?? "Seçin"}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-70" />
      </button>
      {isOpen ? (
        <div
          className={`absolute z-50 mt-1 max-h-60 min-w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-800 p-1 shadow-xl [scrollbar-color:theme(colors.zinc.600)_theme(colors.zinc.900)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-zinc-900 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs whitespace-nowrap transition-colors ${
                opt.value === value ? "bg-emerald-500/10 text-emerald-300 font-medium" : "text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value ? <Check className="size-3.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
