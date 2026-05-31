"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markArizaResolved(rowId: string, comment: string) {
  const cleanRowId = rowId.trim();
  const cleanComment = comment.trim();

  if (!cleanRowId) {
    return { success: false, error: "Arıza kaydı bulunamadı." };
  }

  if (!cleanComment) {
    return { success: false, error: "Arızanın nasıl giderildiğini yazmak zorunludur." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_production_rows")
    .update({
      ariza_giderildi: true,
      ariza_giderilme_aciklama: cleanComment,
      ariza_giderildi_at: new Date().toISOString(),
    })
    .eq("id", cleanRowId)
    .gt("ariza", 0);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/ariza");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateArizaType(rowId: string, newType: string) {
  const cleanRowId = rowId.trim();
  const cleanType = newType.trim();

  if (!cleanRowId) {
    return { success: false, error: "Arıza kaydı bulunamadı." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_production_rows")
    .update({
      ariza_turu: cleanType,
    })
    .eq("id", cleanRowId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/ariza");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  return { success: true };
}

