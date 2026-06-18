"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeSuggestion(id: string, completionNote: string) {
  const cleanId = id.trim();
  const cleanNote = completionNote.trim();

  if (!cleanId) {
    return { success: false, error: "Öneri kaydı bulunamadı." };
  }

  if (!cleanNote) {
    return { success: false, error: "Tamamlanma açıklaması zorunludur." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_suggestions")
    .update({
      completed_at: new Date().toISOString(),
      completion_note: cleanNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cleanId)
    .is("completed_at", null);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/oneriler");
  return { success: true };
}
