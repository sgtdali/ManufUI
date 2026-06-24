"use client";

export function getAuthRole(): "admin" | "readonly" | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split("; password_auth=");
  if (parts.length < 2) return null;
  const cookie = parts[1].split(";")[0];
  if (cookie === "rmk_hf901") return "admin";
  if (cookie === "password_ncms") return "readonly";
  return null;
}

export function isReadOnlyUser(): boolean {
  return getAuthRole() === "readonly";
}
