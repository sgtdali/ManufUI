"use server";

import { createClient } from "@/lib/supabase/server";

export type PersonnelRecord = {
  id: string;
  name: string;
  location: string;
  arrival_date: string | null;
  return_date: string | null;
  created_at: string;
  updated_at: string;
};

export async function loadPersonnelTracking() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_personnel_tracking")
    .select("*")
    .order("arrival_date", { ascending: false });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as PersonnelRecord[] };
}

export async function createPersonnelRecord(item: {
  name: string;
  location: string;
  arrival_date: string | null;
  return_date: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_personnel_tracking")
    .insert({
      name: item.name,
      location: item.location,
      arrival_date: item.arrival_date || null,
      return_date: item.return_date || null,
    })
    .select()
    .single();

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as PersonnelRecord };
}

export async function updatePersonnelRecord(
  id: string,
  updates: Partial<Omit<PersonnelRecord, "id" | "created_at" | "updated_at">>
) {
  const supabase = await createClient();
  const normalizedUpdates = { ...updates };
  if (normalizedUpdates.arrival_date === "") normalizedUpdates.arrival_date = null;
  if (normalizedUpdates.return_date === "") normalizedUpdates.return_date = null;

  const { data, error } = await supabase
    .from("manuf_personnel_tracking")
    .update({
      ...normalizedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as PersonnelRecord };
}

export async function deletePersonnelRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_personnel_tracking")
    .delete()
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export type Assignee = {
  id: string;
  name: string;
};

export async function loadAssignees() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_personnel")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as Assignee[] };
}
