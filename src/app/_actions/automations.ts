"use server";

import { createClient } from "@/lib/supabase/server";

export interface ManufAutomation {
  id: string;
  type: "cron" | "trigger";
  name: string;
  schedule: string | null;
  source_event: string | null;
  target_function: string;
  webhook_url: string | null;
  description: string | null;
  is_active: boolean;
  updated_at: string;
}

export async function getManufAutomations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manuf_automations")
    .select("*")
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as ManufAutomation[] };
}

export async function saveManufAutomation(
  id: string,
  updates: {
    webhook_url?: string | null;
    description?: string | null;
    schedule?: string | null;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_automations")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  if (updates.schedule) {
    const { error: rpcError } = await supabase.rpc("update_manuf_cron_schedule", {
      new_schedule: updates.schedule
    });
    if (rpcError) {
      console.error("Reschedule error:", rpcError);
      return { success: false, error: `Cron zamanlaması güncellenirken hata oluştu: ${rpcError.message}` };
    }
  }

  return { success: true };
}

export async function createManufAutomation(data: {
  id: string;
  type: "cron" | "trigger";
  name: string;
  schedule?: string | null;
  source_event?: string | null;
  target_function: string;
  webhook_url?: string | null;
  description?: string | null;
}) {
  if (!data.id || !data.name || !data.target_function) {
    return { success: false, error: "ID, Ad ve Hedef Fonksiyon zorunludur." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_automations")
    .insert({
      ...data,
      is_active: true,
      updated_at: new Date().toISOString()
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteManufAutomation(id: string) {
  if (!id) {
    return { success: false, error: "ID zorunludur." };
  }

  const supabase = await createClient();

  try {
    await supabase.rpc("undeploy_automation_sql", { p_automation_id: id });
  } catch {
    // RPC fonksiyonu henuz kurulmamis olabilir
  }

  const { error } = await supabase
    .from("manuf_automations")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function toggleManufAutomation(id: string, is_active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_automations")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function triggerCronAutomation(id: string) {
  const supabase = await createClient();

  const knownFunctions: Record<string, string> = {
    daily_report_cron: "send_daily_production_email_func",
  };

  let functionName = knownFunctions[id];

  if (!functionName) {
    functionName = "auto_" + id + "_func";
  }

  const { error } = await supabase.rpc(functionName);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getTableColumns(tableName: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_manuf_table_columns", {
    p_table_name: tableName,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as { table_name: string; column_name: string; data_type: string; is_nullable: string }[] };
}

export interface DeployAutomationParams {
  automationId: string;
  name: string;
  description: string;
  type: "cron" | "trigger";
  sourceTable: string;
  selectedColumns: string[];
  triggerEvents: string[];
  cronSchedule: string | null;
  dateFilterColumn: string | null;
  dateFilterRange: string | null;
  aggregation: string;
  aggregationColumn: string | null;
  webhookUrl: string;
  payloadFormat: "teams_adaptive_card" | "plain_json";
  cardTitle: string;
  cardColor: string;
}

export async function deployAutomation(params: DeployAutomationParams) {
  const supabase = await createClient();

  const { data: rpcResult, error: rpcError } = await supabase.rpc("deploy_automation_sql", {
    p_automation_id: params.automationId,
    p_type: params.type,
    p_source_table: params.sourceTable,
    p_selected_columns: params.selectedColumns,
    p_trigger_events: params.triggerEvents || [],
    p_cron_schedule: params.cronSchedule || "",
    p_date_filter_column: params.dateFilterColumn || "",
    p_date_filter_range: params.dateFilterRange || "",
    p_aggregation: params.aggregation || "none",
    p_aggregation_column: params.aggregationColumn || "",
    p_payload_format: params.payloadFormat,
    p_card_title: params.cardTitle || "",
    p_card_color: params.cardColor || "Default",
  });

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  if (rpcResult && !(rpcResult as any).success) {
    return { success: false, error: (rpcResult as any).error };
  }

  const functionName = (rpcResult as any)?.function_name || `auto_${params.automationId}_func`;

  const { error: insertError } = await supabase
    .from("manuf_automations")
    .insert({
      id: params.automationId,
      type: params.type,
      name: params.name,
      schedule: params.type === "cron" ? params.cronSchedule : null,
      source_event: params.type === "trigger"
        ? `${params.sourceTable} (${params.triggerEvents.join("/")})`
        : null,
      target_function: `${functionName}()`,
      webhook_url: params.webhookUrl,
      description: params.description,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true };
}
