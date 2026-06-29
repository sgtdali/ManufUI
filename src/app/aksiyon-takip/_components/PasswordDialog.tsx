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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-zinc-900">Düzenleme Şifresi</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Değişiklik yapmak için lütfen şifreyi giriniz.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="password"
            autoFocus
            className={`h-9 w-full rounded-md border px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 ${
              error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : "border-zinc-300"
            }`}
            placeholder="Şifre"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
          />

          {error && (
            <p className="text-xs font-medium text-rose-600">
              Hatalı şifre girdiniz. Lütfen tekrar deneyin.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              onClick={() => { setError(false); setPassword(""); onClose(); }}>
              İptal
            </button>
            <button type="submit"
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">
              Onayla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
