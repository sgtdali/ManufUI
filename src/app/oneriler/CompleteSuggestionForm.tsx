"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { completeSuggestion } from "./actions";

type Props = {
  suggestionId: string;
};

export function CompleteSuggestionForm({ suggestionId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!note.trim()) {
      toast.error("Tamamlanma açıklaması giriniz.");
      return;
    }

    startTransition(async () => {
      const result = await completeSuggestion(suggestionId, note);

      if (result.success) {
        toast.success("Öneri tamamlandı olarak işaretlendi.");
        setNote("");
        setIsOpen(false);
      } else {
        toast.error(result.error ?? "Öneri güncellenemedi.");
      }
    });
  };

  if (!isOpen) {
    return (
      <button
        className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-emerald-700 bg-emerald-700 px-3 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <CheckCircle2 className="size-4" />
        Tamamlandı yap
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <label className="text-sm font-medium text-zinc-800" htmlFor={`note-${suggestionId}`}>
        Tamamlanma açıklaması
      </label>
      <textarea
        className="mt-2 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
        disabled={isPending}
        id={`note-${suggestionId}`}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Ne yapıldı, nasıl kapatıldı?"
        value={note}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-md border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={handleSubmit}
          type="button"
        >
          {isPending ? "Kaydediliyor..." : "Kaydet ve kapat"}
        </button>
        <button
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
          disabled={isPending}
          onClick={() => {
            setIsOpen(false);
            setNote("");
          }}
          type="button"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}
