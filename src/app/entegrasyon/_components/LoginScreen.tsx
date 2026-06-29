"use client";

import { Lock, KeyRound } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Yukleniyor...</p>
      </div>
    </div>
  );
}

type LoginProps = {
  password: string;
  onPasswordChange: (val: string) => void;
  onLogin: () => void;
};

export function LoginScreen({ password, onPasswordChange, onLogin }: LoginProps) {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-zinc-100 font-sans">
      <div className="w-full max-w-md px-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-lg flex flex-col items-center">
          <div className="h-14 w-14 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-6">
            <Lock className="h-6 w-6 text-indigo-500" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 text-center">Entegrasyon Paneli</h1>
          <p className="text-xs text-zinc-500 mt-2 text-center">Bu sayfaya erismek icin sifrenizi girin.</p>
          <div className="w-full mt-8 relative">
            <span className="absolute left-3.5 top-3 text-zinc-400"><KeyRound className="h-4 w-4" /></span>
            <input type="password" placeholder="Sifre" value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onLogin()}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white text-sm text-zinc-900 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-zinc-400"
              autoFocus />
          </div>
          <button onClick={onLogin}
            className="w-full mt-6 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-sm active:scale-[0.98] transition-all cursor-pointer">
            Giris Yap
          </button>
        </div>
      </div>
    </main>
  );
}
