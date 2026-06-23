"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, LayoutDashboard, KeyRound } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (password === "rmk_hf901") {
      // Set cookie for 30 days with max-age and expires for max browser/device compatibility
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `password_auth=rmk_hf901; path=/; max-age=2592000; expires=${expiryDate}; SameSite=Lax`;
      toast.success("Giriş başarılı, yönlendiriliyorsunuz...");
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } else {
      toast.error("Hatalı şifre girdiniz!");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const handleGoToDashboardy = () => {
    window.location.href = "/dashboardy";
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 overflow-hidden font-sans">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-[128px] pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
          {/* Lock icon container */}
          <div className="h-14 w-14 rounded-full bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center mb-6">
            <Lock className="h-6 w-6 text-indigo-400" />
          </div>

          {/* Heading */}
          <h1 className="text-xl font-bold tracking-tight text-white text-center">
            Üretim Takip Sistemi
          </h1>
          <p className="text-xs text-zinc-400 mt-2 text-center">
            Sisteme erişebilmek için lütfen şifrenizi girin.
          </p>

          {/* Input field */}
          <div className="w-full mt-8 relative">
            <span className="absolute left-3.5 top-3 text-zinc-500">
              <KeyRound className="h-4 w-4" />
            </span>
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyPress}
              className="h-10 w-full rounded-lg bg-zinc-800/30 border border-zinc-800 text-sm text-white pl-10 pr-4 outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 transition-all font-sans placeholder-zinc-500"
              autoFocus
            />
          </div>

          {/* Buttons container */}
          <div className="w-full mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={handleLogin}
              className="h-10 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-950/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              Giriş
            </button>
            <button
              onClick={handleGoToDashboardy}
              className="h-10 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700 text-sm font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4" />
              Performance Panel
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
