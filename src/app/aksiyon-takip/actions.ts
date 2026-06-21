"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionItem = {
  id: string;
  parent_id: string | null;
  cell: string;
  title: string;
  assignee: string;
  due_date: string | null;
  priority: string | null;
  status: "Açık" | "Devam Ediyor" | "Tamamlandı";
  created_at: string;
  updated_at: string;
  children?: ActionItem[];
};

export async function loadActionItems() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_action_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as ActionItem[] };
}

export async function createActionItem(item: {
  parent_id?: string | null;
  cell: string;
  title: string;
  assignee: string;
  due_date?: string | null;
  priority?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_action_items")
    .insert({
      parent_id: item.parent_id || null,
      cell: item.cell,
      title: item.title,
      assignee: item.assignee,
      due_date: item.due_date || null,
      priority: item.priority || null,
      status: "Açık",
    })
    .select()
    .single();

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as ActionItem };
}

export async function updateActionItem(
  id: string,
  updates: {
    title?: string;
    assignee?: string;
    due_date?: string | null;
    priority?: string | null;
    status?: string;
    cell?: string;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_action_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function deleteActionItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_action_items")
    .delete()
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}
