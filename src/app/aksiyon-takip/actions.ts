"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionItem = {
  id: string;
  parent_id: string | null;
  cell: string;
  title: string;
  description: string | null;
  assignee: string;
  assignee_email: string | null;
  planner_task_id: string | null;
  start_date: string | null;
  due_date: string | null;
  priority: string | null;
  status: "Açık" | "Tamamlandı";
  created_at: string;
  updated_at: string;
  children?: ActionItem[];
};

export type ActionComment = {
  id: string;
  action_item_id: string;
  author: string;
  comment: string;
  created_at: string;
};

export type Assignee = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  department: string | null;
};

export async function loadAssignees() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_assignees")
    .select("*")
    .order("name", { ascending: true });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as Assignee[] };
}

export async function loadActionItems() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_action_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { success: false as const, error: error.message };
  const mapped = (data as ActionItem[]).map(item => {
    if (item.cell === "N602 Hücresi" || item.cell === "N603 Hücresi") {
      return { ...item, cell: "N602-N603 Hücresi" };
    }
    return item;
  });
  return { success: true as const, data: mapped };
}

export async function createActionItem(item: {
  parent_id?: string | null;
  cell: string;
  title: string;
  description?: string | null;
  assignee: string;
  assignee_email?: string | null;
  start_date?: string | null;
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
      description: item.description || null,
      assignee: item.assignee,
      assignee_email: item.assignee_email || null,
      start_date: item.start_date || new Date().toISOString().split("T")[0],
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
    description?: string | null;
    assignee?: string;
    assignee_email?: string | null;
    planner_task_id?: string | null;
    start_date?: string | null;
    due_date?: string | null;
    priority?: string | null;
    status?: string;
    cell?: string;
  }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_action_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as ActionItem };
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

export async function loadComments(actionItemId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_action_item_comments")
    .select("*")
    .eq("action_item_id", actionItemId)
    .order("created_at", { ascending: true });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as ActionComment[] };
}

export async function addComment(actionItemId: string, author: string, comment: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_action_item_comments")
    .insert({ action_item_id: actionItemId, author, comment })
    .select()
    .single();

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as ActionComment };
}
