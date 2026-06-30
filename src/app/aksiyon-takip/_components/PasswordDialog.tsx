"use client";

import { useState } from "react";

export function PasswordDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => boolean;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onConfirm(password);
    if (success) {
      setPassword("");
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-zinc-100">Düzenleme Şifresi</h3>
        <p className="mt-1 text-sm font-medium text-zinc-400">
          Değişiklik yapmak için lütfen şifreyi giriniz.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="password"
            autoFocus
            className={`h-9 w-full rounded-md border bg-zinc-700/60 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15 ${
              error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : "border-zinc-600"
            }`}
            placeholder="Şifre"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
          />

          {error && (
            <p className="text-xs font-medium text-rose-400">
              Hatalı şifre girdiniz. Lütfen tekrar deneyin.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button"
              className="rounded-md border border-zinc-600 bg-zinc-700/60 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
              onClick={() => { setError(false); setPassword(""); onClose(); }}>
              İptal
            </button>
            <button type="submit"
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition">
              Onayla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
