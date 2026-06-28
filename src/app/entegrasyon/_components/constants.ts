export type FilterType = "all" | "cron" | "trigger";
export type FilterStatus = "all" | "active" | "inactive";
export type WizardStep = 1 | 2 | 3 | 4;
export type TriggerEvent = "INSERT" | "UPDATE" | "DELETE";
export type PayloadFormat = "teams_adaptive_card" | "plain_json";

export const MANUF_TABLES = [
  { value: "manuf_production_records", label: "Uretim Kayitlari" },
  { value: "manuf_production_rows", label: "Uretim Satirlari (Saatlik)" },
  { value: "manuf_ff_preform_measurements", label: "FF Preform Olcumleri" },
  { value: "manuf_ff_preform_rejects", label: "FF Preform Redler" },
  { value: "manuf_ff_preform_reworks", label: "FF Preform Rework" },
  { value: "manuf_final_olcum_measurements", label: "Final Olcum" },
  { value: "manuf_final_olcum_rejects", label: "Final Olcum Redler" },
  { value: "manuf_final_olcum_reworks", label: "Final Olcum Rework" },
  { value: "manuf_press_mold_changes", label: "Kalip Degisim Kayitlari" },
  { value: "manuf_action_items", label: "Aksiyon Kalemleri" },
  { value: "manuf_suggestions", label: "Oneriler" },
  { value: "manuf_wip_stock", label: "WIP Stok" },
  { value: "manuf_schedule_params", label: "Planlama Parametreleri" },
  { value: "manuf_schedule_overrides", label: "Planlama Istisna Kayitlari" },
  { value: "manuf_settings", label: "Ayarlar" },
  { value: "manuf_automations", label: "Otomasyon Kayitlari" },
];

export const CRON_PRESETS = [
  { label: "Her gun 08:00", value: "0 5 * * *" },
  { label: "Hafta ici 08:00", value: "0 5 * * 1-5" },
  { label: "Pazartesi 08:00", value: "0 5 * * 1" },
  { label: "Her saat basi", value: "0 * * * *" },
];

export const DATE_RANGES = [
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Dun" },
  { value: "last_7_days", label: "Son 7 Gun" },
  { value: "last_30_days", label: "Son 30 Gun" },
];

export const CARD_COLORS = [
  { value: "Default", label: "Varsayilan", color: "#71717a" },
  { value: "Accent", label: "Mavi", color: "#6366f1" },
  { value: "Good", label: "Yesil", color: "#22c55e" },
  { value: "Attention", label: "Kirmizi", color: "#ef4444" },
  { value: "Warning", label: "Turuncu", color: "#f59e0b" },
];

export const WIZARD_STEPS = [
  { num: 1, label: "Ne Zaman?" },
  { num: 2, label: "Ne Gonderilecek?" },
  { num: 3, label: "Nereye?" },
  { num: 4, label: "Onizle & Yayinla" },
];

export interface WizardState {
  triggerType: "cron" | "trigger";
  cronSchedule: string;
  sourceTable: string;
  triggerEvents: TriggerEvent[];
  selectedColumns: string[];
  dateFilterColumn: string;
  dateFilterRange: string;
  aggregation: "none" | "count" | "sum";
  aggregationColumn: string;
  webhookUrl: string;
  payloadFormat: PayloadFormat;
  cardTitle: string;
  cardColor: string;
  automationName: string;
  automationId: string;
  description: string;
}

export const INITIAL_WIZARD: WizardState = {
  triggerType: "trigger",
  cronSchedule: "0 5 * * *",
  sourceTable: "",
  triggerEvents: ["INSERT"],
  selectedColumns: [],
  dateFilterColumn: "",
  dateFilterRange: "",
  aggregation: "none",
  aggregationColumn: "",
  webhookUrl: "",
  payloadFormat: "teams_adaptive_card",
  cardTitle: "",
  cardColor: "Default",
  automationName: "",
  automationId: "",
  description: "",
};

export const DB_MIGRATION_SQL = `-- Supabase SQL Editor'de calistirin:
CREATE TABLE IF NOT EXISTS manuf_automations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  schedule TEXT,
  source_event TEXT,
  target_function TEXT NOT NULL,
  webhook_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE manuf_automations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manuf_automations' AND policyname = 'allow_all') THEN
    CREATE POLICY allow_all ON manuf_automations FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;`;
