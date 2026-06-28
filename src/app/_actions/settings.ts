"use server";

import { createClient } from "@/lib/supabase/server";

export async function getManufSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_settings")
    .select("key, value");

  if (error) {
    return { success: false, error: error.message };
  }

  const settings: Record<string, string> = {};
  if (data) {
    data.forEach((row: any) => {
      settings[row.key] = row.value;
    });
  }

  return { success: true, data: settings };
}

export async function saveManufSettings(settings: Record<string, string>) {
  const supabase = await createClient();

  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from("manuf_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    return { success: false, error: error.message };
  }

  if (settings["daily_production_cron_schedule"]) {
    const { error: rpcError } = await supabase.rpc("update_manuf_cron_schedule", {
      new_schedule: settings["daily_production_cron_schedule"]
    });
    if (rpcError) {
      console.error("Reschedule error:", rpcError);
    }
  }

  return { success: true };
}

export async function triggerDailyProductionEmailAction() {
  const supabase = await createClient();

  const { error } = await supabase.rpc("send_daily_production_email_func");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
