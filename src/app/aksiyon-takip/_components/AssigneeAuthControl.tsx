"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Mail, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AssigneeAuthControl({ userEmail, onSignedOut }: { userEmail: string | null; onSignedOut: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/aksiyon-takip`,
        },
      });
      if (error) {
        toast.error("Giriş linki gönderilemedi: " + error.message);
        return;
      }
      setSent(true);
      toast.success("Giriş linki e-postanıza gönderildi.");
    } catch (err) {
      toast.error("Giriş linki gönderilemedi: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsOpen(false);
    setSent(false);
    setEmail("");
    onSignedOut();
    toast.success("Çıkış yapıldı.");
  };

  if (userEmail) {
    return (
      <div className="relative" ref={containerRef}>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 shadow-sm hover:bg-emerald-100 transition"
          title="Sorumlu girişi"
        >
          <Mail className="size-4" /> {userEmail} <ChevronDown className="size-3.5" />
        </button>
        {isOpen ? (
          <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-zinc-200 bg-white p-2 shadow-lg">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm text-rose-700 hover:bg-rose-50"
            >
              <LogOut className="size-4" /> Çıkış yap
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-100 transition"
        title="Sorumlu olarak e-posta ile giriş yap"
      >
        <Mail className="size-4" /> Sorumlu Girişi
      </button>
      {isOpen ? (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-md border border-zinc-200 bg-white p-3 shadow-lg">
          {sent ? (
            <p className="text-xs text-zinc-600">
              <span className="font-medium text-emerald-700">{email}</span> adresine bir giriş linki gönderdik.
              Gelen kutunuzu kontrol edip linke tıklayın.
            </p>
          ) : (
            <>
              <label className="text-xs font-medium text-zinc-600">Kurumsal e-postanız</label>
              <input
                type="email"
                autoFocus
                className="mt-1 h-9 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                placeholder="ad.soyad@repkon.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendLink(); }}
              />
              <button
                onClick={handleSendLink}
                disabled={sending || !email.trim()}
                className="mt-2 w-full rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {sending ? "Gönderiliyor..." : "Giriş linki gönder"}
              </button>
              <p className="mt-2 text-[11px] text-zinc-400">
                Sadece kendinize atanmış aksiyonları düzenlemek için kullanılır.
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
