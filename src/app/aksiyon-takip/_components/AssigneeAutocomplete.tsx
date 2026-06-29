"use client";

import { useState, useEffect } from "react";
import type { Assignee } from "../actions";

export function AssigneeAutocomplete({
  value,
  assignees,
  onChange,
  disabled,
}: {
  value: string;
  assignees: Assignee[];
  onChange: (name: string, email: string | null) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const filtered = assignees.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (assignee: Assignee) => {
    setSearch(assignee.name);
    onChange(assignee.name, assignee.email);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      const match = assignees.find(
        (a) => a.name.toLowerCase() === search.trim().toLowerCase()
      );
      if (match) {
        onChange(match.name, match.email);
      } else {
        onChange(search.trim(), null);
      }
    }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        handleSelect(filtered[highlightedIndex]);
      } else {
        e.currentTarget.blur();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="relative w-36">
      <input
        className="h-8 w-full rounded-md border border-zinc-200 bg-transparent px-2 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-75"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Sorumlu"
        disabled={disabled}
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 z-50 mt-1 max-h-60 w-64 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
          {filtered.map((assignee, idx) => (
            <div
              key={assignee.id}
              className={`cursor-pointer rounded px-2 py-1.5 text-left text-xs ${
                idx === highlightedIndex
                  ? "bg-emerald-50 text-emerald-900 font-medium"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
              onMouseDown={() => handleSelect(assignee)}
            >
              <div className="font-semibold">{assignee.name}</div>
              <div className="text-[10px] text-zinc-400 flex justify-between gap-2 mt-0.5">
                <span>{assignee.email}</span>
                {assignee.title && <span className="italic">{assignee.title}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
