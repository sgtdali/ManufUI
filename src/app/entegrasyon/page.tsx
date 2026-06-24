"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Settings,
  Send,
  Save,
  Clock,
  Link2,
  Terminal,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Check,
  Lock,
  KeyRound,
  Database,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Filter,
  Zap,
  X,
  Info,
  Search,
  ArrowRight,
  Wand2,
  Wrench,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import {
  getManufAutomations,
  saveManufAutomation,
  createManufAutomation,
  deleteManufAutomation,
  toggleManufAutomation,
  triggerCronAutomation,
  getTableColumns,
  deployAutomation,
  type ManufAutomation,
  type DeployAutomationParams,
} from "../actions";

// ===================== Constants =====================

type FilterType = "all" | "cron" | "trigger";
type FilterStatus = "all" | "active" | "inactive";
type WizardStep = 1 | 2 | 3 | 4;
type TriggerEvent = "INSERT" | "UPDATE" | "DELETE";
type PayloadFormat = "teams_adaptive_card" | "plain_json";

const MANUF_TABLES = [
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

const CRON_PRESETS = [
  { label: "Her gun 08:00", value: "0 5 * * *" },
  { label: "Hafta ici 08:00", value: "0 5 * * 1-5" },
  { label: "Pazartesi 08:00", value: "0 5 * * 1" },
  { label: "Her saat basi", value: "0 * * * *" },
];

const DATE_RANGES = [
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Dun" },
  { value: "last_7_days", label: "Son 7 Gun" },
  { value: "last_30_days", label: "Son 30 Gun" },
];

const CARD_COLORS = [
  { value: "Default", label: "Varsayilan", color: "#71717a" },
  { value: "Accent", label: "Mavi", color: "#6366f1" },
  { value: "Good", label: "Yesil", color: "#22c55e" },
  { value: "Attention", label: "Kirmizi", color: "#ef4444" },
  { value: "Warning", label: "Turuncu", color: "#f59e0b" },
];

const WIZARD_STEPS = [
  { num: 1, label: "Ne Zaman?" },
  { num: 2, label: "Ne Gonderilecek?" },
  { num: 3, label: "Nereye?" },
  { num: 4, label: "Onizle & Yayinla" },
];

interface WizardState {
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

const INITIAL_WIZARD: WizardState = {
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

// ===================== SQL Preview Generator =====================

function generatePreviewSQL(w: WizardState): string {
  const funcName = `auto_${w.automationId || "ornek"}_func`;
  const triggerName = `auto_${w.automationId || "ornek"}_trigger`;
  const cols = w.selectedColumns.length > 0 ? w.selectedColumns.join(", ") : "*";

  let dateFilter = "";
  if (w.triggerType === "cron" && w.dateFilterColumn) {
    const rangeMap: Record<string, string> = {
      today: `WHERE ${w.dateFilterColumn} >= CURRENT_DATE`,
      yesterday: `WHERE ${w.dateFilterColumn} >= CURRENT_DATE - 1 AND ${w.dateFilterColumn} < CURRENT_DATE`,
      last_7_days: `WHERE ${w.dateFilterColumn} >= CURRENT_DATE - 7`,
      last_30_days: `WHERE ${w.dateFilterColumn} >= CURRENT_DATE - 30`,
    };
    dateFilter = rangeMap[w.dateFilterRange] ? "\n    " + rangeMap[w.dateFilterRange] : "";
  }

  let payloadBlock: string;
  if (w.payloadFormat === "teams_adaptive_card") {
    const facts = w.selectedColumns.length > 0
      ? w.selectedColumns
          .map((c) =>
            w.triggerType === "trigger"
              ? `          jsonb_build_object('title', '${c}', 'value', coalesce(NEW.${c}::text, '-'))`
              : `          jsonb_build_object('title', '${c}', 'value', coalesce(r.${c}::text, '-'))`
          )
          .join(",\n")
      : "          -- Sutun seciniz";

    if (w.triggerType === "trigger") {
      payloadBlock = `  _payload := jsonb_build_object(
    'type', 'message',
    'attachments', jsonb_build_array(
      jsonb_build_object(
        'contentType', 'application/vnd.microsoft.card.adaptive',
        'content', jsonb_build_object(
          'type', 'AdaptiveCard', 'version', '1.4',
          'body', jsonb_build_array(
            jsonb_build_object('type', 'TextBlock', 'text', '${w.cardTitle || "Bildirim"}', 'weight', 'Bolder', 'size', 'Medium', 'color', '${w.cardColor}'),
            jsonb_build_object('type', 'FactSet', 'facts', jsonb_build_array(
${facts}
            ))
          )
        )
      )
    )
  );`;
    } else {
      payloadBlock = `  -- Veri sorgusu + Adaptive Card olusturma
  SELECT jsonb_build_object(...) INTO _payload;`;
    }
  } else {
    if (w.triggerType === "trigger") {
      const fields = w.selectedColumns.map((c) => `    '${c}', NEW.${c}`).join(",\n");
      payloadBlock = `  _payload := jsonb_build_object(
    'automation_id', '${w.automationId || "ornek"}',
    'event', TG_OP,
    'timestamp', now()::text,
${fields || "    -- Sutun seciniz"}
  );`;
    } else {
      payloadBlock = `  _payload := jsonb_build_object(
    'automation_id', '${w.automationId || "ornek"}',
    'timestamp', now()::text,
    'row_count', coalesce(jsonb_array_length(_rows), 0),
    'data', coalesce(_rows, '[]'::jsonb)
  );`;
    }
  }

  if (w.triggerType === "cron") {
    return `-- Cron Fonksiyonu: ${w.automationName || funcName}
CREATE OR REPLACE FUNCTION ${funcName}()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE
  _webhook_url TEXT;
  _payload JSONB;
  _rows JSONB;
BEGIN
  SELECT webhook_url INTO _webhook_url
  FROM manuf_automations WHERE id = '${w.automationId || "ornek"}' AND is_active = true;
  IF _webhook_url IS NULL THEN RETURN; END IF;

  SELECT jsonb_agg(row_to_json(t)) INTO _rows
  FROM (SELECT ${cols} FROM ${w.sourceTable || "tablo_adi"}${dateFilter}) t;
  IF _rows IS NULL THEN _rows := '[]'::jsonb; END IF;

${payloadBlock}

  PERFORM net.http_post(
    url := _webhook_url,
    body := _payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
END; $fn$;

-- Cron zamanlama
SELECT cron.schedule('${w.automationId || "ornek"}', '${w.cronSchedule}', 'SELECT ${funcName}()');`;
  } else {
    const events = w.triggerEvents.join(" OR ");
    return `-- Trigger Fonksiyonu: ${w.automationName || funcName}
CREATE OR REPLACE FUNCTION ${funcName}()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE
  _webhook_url TEXT;
  _payload JSONB;
BEGIN
  SELECT webhook_url INTO _webhook_url
  FROM manuf_automations WHERE id = '${w.automationId || "ornek"}' AND is_active = true;
  IF _webhook_url IS NULL THEN RETURN NEW; END IF;

${payloadBlock}

  PERFORM net.http_post(
    url := _webhook_url,
    body := _payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END; $fn$;

-- Trigger olustur
DROP TRIGGER IF EXISTS ${triggerName} ON ${w.sourceTable || "tablo_adi"};
CREATE TRIGGER ${triggerName}
  AFTER ${events} ON ${w.sourceTable || "tablo_adi"}
  FOR EACH ROW EXECUTE FUNCTION ${funcName}();`;
  }
}

// ===================== Main Component =====================

export default function EntegrasyonPage() {
  const [isReadOnly, setIsReadOnly] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [dbMigrated, setDbMigrated] = useState(true);
  const [copied, setCopied] = useState(false);

  const [automations, setAutomations] = useState<ManufAutomation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const [editingUrls, setEditingUrls] = useState<Record<string, string>>({});
  const [editingSchedules, setEditingSchedules] = useState<Record<string, string>>({});
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});

  const [savingId, setSavingId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Manual form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    id: "", type: "trigger" as "cron" | "trigger", name: "", schedule: "",
    source_event: "", target_function: "", webhook_url: "", description: "",
  });
  const [creatingManual, setCreatingManual] = useState(false);

  // Wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizard, setWizard] = useState<WizardState>(INITIAL_WIZARD);
  const [tableColumns, setTableColumns] = useState<{ column_name: string; data_type: string }[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // ===================== Auth =====================

  const checkAuth = () => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
    };
    const auth = getCookie("password_auth");
    if (auth === "rmk_hf901") {
      setIsReadOnly(false);
      return "admin";
    }
    if (auth === "password_ncms") {
      setIsReadOnly(true);
      return "readonly";
    }
    setIsReadOnly(null);
    return null;
  };

  useEffect(() => {
    const role = checkAuth();
    if (role) {
      loadAutomations();
    } else {
      setLoading(false);
    }
  }, []);

  const loadAutomations = async () => {
    setLoading(true);
    try {
      const res = await getManufAutomations();
      if (res.success && res.data) {
        setAutomations(res.data);
        const urls: Record<string, string> = {};
        const schedules: Record<string, string> = {};
        const descriptions: Record<string, string> = {};
        res.data.forEach((item) => {
          urls[item.id] = item.webhook_url || "";
          schedules[item.id] = item.schedule || "";
          descriptions[item.id] = item.description || "";
        });
        setEditingUrls(urls);
        setEditingSchedules(schedules);
        setEditingDescriptions(descriptions);
        setDbMigrated(true);
      } else {
        if (res.error && (res.error.includes("relation") || res.error.includes("cache") || res.error.includes("does not exist"))) {
          setDbMigrated(false);
        } else {
          toast.error(`Otomasyonlar yuklenemedi: ${res.error}`);
        }
      }
    } catch {
      toast.error("Beklenmeyen bir hata olustu.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (password === "rmk_hf901" || password === "password_ncms") {
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `password_auth=${password}; path=/; max-age=2592000; expires=${expiryDate}; SameSite=Lax`;
      const ro = password === "password_ncms";
      setIsReadOnly(ro);
      toast.success(ro ? "Giris basarili (salt okunur)" : "Giris basarili!");
      loadAutomations();
    } else {
      toast.error("Hatali sifre!");
    }
  };

  // ===================== Table Actions =====================

  const handleSave = async (id: string, type: "cron" | "trigger") => {
    if (isReadOnly) { toast.error("Salt okunur erisim."); return; }
    setSavingId(id);
    try {
      const updates: { webhook_url: string; description: string; schedule?: string } = {
        webhook_url: editingUrls[id], description: editingDescriptions[id],
      };
      if (type === "cron") updates.schedule = editingSchedules[id];
      const res = await saveManufAutomation(id, updates);
      if (res.success) { toast.success("Kaydedildi!"); await loadAutomations(); }
      else toast.error(`Hata: ${res.error}`);
    } catch { toast.error("Hata olustu."); }
    finally { setSavingId(null); }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    if (isReadOnly) { toast.error("Salt okunur erisim."); return; }
    const res = await toggleManufAutomation(id, !currentActive);
    if (res.success) { toast.success(currentActive ? "Devre disi birakildi" : "Aktif edildi"); await loadAutomations(); }
    else toast.error(`Hata: ${res.error}`);
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) { toast.error("Salt okunur erisim."); return; }
    if (!confirm(`"${id}" entegrasyonunu silmek istediginize emin misiniz?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteManufAutomation(id);
      if (res.success) { toast.success("Silindi!"); if (expandedId === id) setExpandedId(null); await loadAutomations(); }
      else toast.error(`Hata: ${res.error}`);
    } catch { toast.error("Hata olustu."); }
    finally { setDeletingId(null); }
  };

  const handleTriggerNow = async (id: string) => {
    setTriggeringId(id);
    try {
      const res = await triggerCronAutomation(id);
      if (res.success) toast.success("Tetiklendi!");
      else toast.error(`Hata: ${res.error}`);
    } catch { toast.error("Hata olustu."); }
    finally { setTriggeringId(null); }
  };

  const handleCreateManual = async () => {
    if (isReadOnly) { toast.error("Salt okunur erisim."); return; }
    if (!manualForm.id || !manualForm.name || !manualForm.target_function) {
      toast.error("ID, Ad ve Hedef Fonksiyon zorunludur."); return;
    }
    setCreatingManual(true);
    try {
      const res = await createManufAutomation({
        id: manualForm.id, type: manualForm.type, name: manualForm.name,
        schedule: manualForm.type === "cron" ? manualForm.schedule || null : null,
        source_event: manualForm.type === "trigger" ? manualForm.source_event || null : null,
        target_function: manualForm.target_function,
        webhook_url: manualForm.webhook_url || null, description: manualForm.description || null,
      });
      if (res.success) {
        toast.success("Eklendi!"); setShowManualForm(false);
        setManualForm({ id: "", type: "trigger", name: "", schedule: "", source_event: "", target_function: "", webhook_url: "", description: "" });
        await loadAutomations();
      } else toast.error(`Hata: ${res.error}`);
    } catch { toast.error("Hata olustu."); }
    finally { setCreatingManual(false); }
  };

  // ===================== Wizard Logic =====================

  const fetchColumns = useCallback(async (table: string) => {
    if (!table) { setTableColumns([]); return; }
    setLoadingColumns(true);
    try {
      const res = await getTableColumns(table);
      if (res.success && res.data) {
        setTableColumns(res.data.map((r) => ({ column_name: r.column_name, data_type: r.data_type })));
      } else {
        toast.error("Sutunlar yuklenemedi.");
        setTableColumns([]);
      }
    } catch { setTableColumns([]); }
    finally { setLoadingColumns(false); }
  }, []);

  const openWizard = () => {
    setWizard(INITIAL_WIZARD);
    setWizardStep(1);
    setTableColumns([]);
    setShowWizard(true);
    setShowManualForm(false);
  };

  const closeWizard = () => setShowWizard(false);

  const wizardCanNext = (): boolean => {
    if (wizardStep === 1) {
      if (wizard.triggerType === "cron") return !!wizard.sourceTable && !!wizard.cronSchedule;
      return !!wizard.sourceTable && wizard.triggerEvents.length > 0;
    }
    if (wizardStep === 2) return wizard.selectedColumns.length > 0;
    if (wizardStep === 3) return !!wizard.webhookUrl;
    return true;
  };

  const wizardNext = () => {
    if (wizardStep === 1 && wizard.sourceTable) fetchColumns(wizard.sourceTable);
    if (wizardStep === 3 && !wizard.automationName) {
      const tableLabel = MANUF_TABLES.find((t) => t.value === wizard.sourceTable)?.label || wizard.sourceTable;
      setWizard((w) => ({
        ...w,
        automationName: `${tableLabel} ${w.triggerType === "cron" ? "Rapor" : "Bildirim"}`,
        automationId: w.automationId || `${w.sourceTable.replace("manuf_", "")}_${w.triggerType === "cron" ? "report" : "notify"}`,
      }));
    }
    setWizardStep((s) => Math.min(s + 1, 4) as WizardStep);
  };

  const wizardBack = () => setWizardStep((s) => Math.max(s - 1, 1) as WizardStep);

  const handleDeploy = async () => {
    if (!wizard.automationId || !wizard.automationName) { toast.error("ID ve Ad zorunludur."); return; }
    setDeploying(true);
    try {
      const params: DeployAutomationParams = {
        automationId: wizard.automationId, name: wizard.automationName, description: wizard.description,
        type: wizard.triggerType, sourceTable: wizard.sourceTable, selectedColumns: wizard.selectedColumns,
        triggerEvents: wizard.triggerEvents, cronSchedule: wizard.triggerType === "cron" ? wizard.cronSchedule : null,
        dateFilterColumn: wizard.dateFilterColumn || null, dateFilterRange: wizard.dateFilterRange || null,
        aggregation: wizard.aggregation, aggregationColumn: wizard.aggregationColumn || null,
        webhookUrl: wizard.webhookUrl, payloadFormat: wizard.payloadFormat, cardTitle: wizard.cardTitle, cardColor: wizard.cardColor,
      };
      const res = await deployAutomation(params);
      if (res.success) { toast.success("Otomasyon basariyla yayinlandi!"); closeWizard(); await loadAutomations(); }
      else toast.error(`Deploy hatasi: ${res.error}`);
    } catch { toast.error("Beklenmeyen hata."); }
    finally { setDeploying(false); }
  };

  const copySqlPreview = () => {
    navigator.clipboard.writeText(generatePreviewSQL(wizard));
    setSqlCopied(true);
    toast.success("SQL kopyalandi!");
    setTimeout(() => setSqlCopied(false), 2000);
  };

  // ===================== Filtering =====================

  const filtered = automations.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterStatus === "active" && !a.is_active) return false;
    if (filterStatus === "inactive" && a.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) ||
        (a.target_function || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q) ||
        (a.webhook_url || "").toLowerCase().includes(q);
    }
    return true;
  });

  const cronCount = automations.filter((a) => a.type === "cron").length;
  const triggerCount = automations.filter((a) => a.type === "trigger").length;
  const activeCount = automations.filter((a) => a.is_active).length;

  // ===================== DB Migration SQL =====================

  const sqlQuery = `-- Supabase SQL Editor'de calistirin:
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

  const copySql = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    toast.success("SQL kopyalandi!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ===================== Loading / Auth Screens =====================

  if (isReadOnly === null || (loading && isReadOnly === false)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Yukleniyor...</p>
        </div>
      </div>
    );
  }

  if (isReadOnly === null) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-zinc-100 font-sans">
        <div className="w-full max-w-md px-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-lg flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-6">
              <Lock className="h-6 w-6 text-indigo-500" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 text-center">Entegrasyon Paneli</h1>
            <p className="text-xs text-zinc-500 mt-2 text-center">Bu sayfaya erismek icin sifrenizi girin.</p>
            <div className="w-full mt-8 relative">
              <span className="absolute left-3.5 top-3 text-zinc-400"><KeyRound className="h-4 w-4" /></span>
              <input type="password" placeholder="Sifre" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="h-10 w-full rounded-lg border border-zinc-300 bg-white text-sm text-zinc-900 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-zinc-400"
                autoFocus />
            </div>
            <button onClick={handleLogin}
              className="w-full mt-6 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-sm active:scale-[0.98] transition-all cursor-pointer">
              Giris Yap
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ===================== Wizard Render =====================

  const renderWizard = () => (
    <div className="bg-white border border-indigo-200 rounded-xl overflow-hidden mb-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-bold text-zinc-800">Otomasyon Sihirbazi</span>
        </div>
        <button onClick={closeWizard} className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 px-5 py-3 border-b border-zinc-100 bg-zinc-50/50">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              wizardStep === s.num ? "bg-indigo-100 text-indigo-700 border border-indigo-200" :
              wizardStep > s.num ? "bg-emerald-50 text-emerald-700" : "text-zinc-400"
            }`}>
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                wizardStep > s.num ? "bg-emerald-500 text-white" :
                wizardStep === s.num ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-500"
              }`}>
                {wizardStep > s.num ? <Check className="h-2.5 w-2.5" /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < WIZARD_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-zinc-300 mx-0.5" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="p-5">
        {wizardStep === 1 && renderStep1()}
        {wizardStep === 2 && renderStep2()}
        {wizardStep === 3 && renderStep3()}
        {wizardStep === 4 && renderStep4()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
        <button onClick={wizardStep === 1 ? closeWizard : wizardBack}
          className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">
          {wizardStep === 1 ? "Vazgec" : "Geri"}
        </button>
        {wizardStep < 4 ? (
          <button onClick={wizardNext} disabled={!wizardCanNext()}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Devam <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <button onClick={handleDeploy} disabled={deploying || !wizard.automationId || !wizard.automationName}
            className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <Zap className="h-3.5 w-3.5" />
            {deploying ? "Yayinlaniyor..." : "Yayinla (Deploy)"}
          </button>
        )}
      </div>
    </div>
  );

  // ---- Step 1: Ne Zaman? ----
  const renderStep1 = () => (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">Otomasyonun ne zaman tetiklenecegini secin.</p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { type: "trigger" as const, icon: <Database className="h-5 w-5" />, title: "Veritabani Olayi", desc: "Tabloda INSERT/UPDATE/DELETE oldugunda" },
          { type: "cron" as const, icon: <Clock className="h-5 w-5" />, title: "Zamanlanmis (Cron)", desc: "Belirli bir saatte/gunde otomatik calisir" },
        ].map((opt) => (
          <button key={opt.type}
            onClick={() => setWizard((w) => ({ ...w, triggerType: opt.type }))}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              wizard.triggerType === opt.type
                ? "border-indigo-400 bg-indigo-50 shadow-sm"
                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
            }`}>
            <div className={`mb-2 ${wizard.triggerType === opt.type ? "text-indigo-600" : "text-zinc-400"}`}>
              {opt.icon}
            </div>
            <p className="text-xs font-bold text-zinc-800">{opt.title}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>

      <div>
        <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Kaynak Tablo</label>
        <select value={wizard.sourceTable}
          onChange={(e) => setWizard((w) => ({ ...w, sourceTable: e.target.value, selectedColumns: [] }))}
          className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer">
          <option value="">Tablo secin...</option>
          {MANUF_TABLES.map((t) => (
            <option key={t.value} value={t.value}>{t.label} ({t.value})</option>
          ))}
        </select>
      </div>

      {wizard.triggerType === "trigger" && (
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Tetikleme Olaylari</label>
          <div className="flex gap-2">
            {(["INSERT", "UPDATE", "DELETE"] as TriggerEvent[]).map((ev) => (
              <button key={ev}
                onClick={() => setWizard((w) => ({
                  ...w,
                  triggerEvents: w.triggerEvents.includes(ev)
                    ? w.triggerEvents.filter((e) => e !== ev)
                    : [...w.triggerEvents, ev],
                }))}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  wizard.triggerEvents.includes(ev)
                    ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                }`}>
                {ev}
              </button>
            ))}
          </div>
        </div>
      )}

      {wizard.triggerType === "cron" && (
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Zamanlama</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {CRON_PRESETS.map((p) => (
              <button key={p.value}
                onClick={() => setWizard((w) => ({ ...w, cronSchedule: p.value }))}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                  wizard.cronSchedule === p.value
                    ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                    : "bg-white text-zinc-500 border-zinc-200"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input value={wizard.cronSchedule}
              onChange={(e) => setWizard((w) => ({ ...w, cronSchedule: e.target.value }))}
              placeholder="0 5 * * *"
              className="w-48 h-8 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
            <span className="text-[9px] text-zinc-400">UTC saat dilimi</span>
          </div>
        </div>
      )}
    </div>
  );

  // ---- Step 2: Ne Gonderilecek? ----
  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        <strong className="text-zinc-700">{MANUF_TABLES.find((t) => t.value === wizard.sourceTable)?.label}</strong> tablosundan hangi sutunlar gonderilecek?
      </p>

      {loadingColumns ? (
        <div className="flex items-center gap-2 py-4 text-zinc-400">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Sutunlar yukleniyor...</span>
        </div>
      ) : tableColumns.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-zinc-400">Sutun bilgisi bulunamadi. RPC fonksiyonunun kurulu oldugundan emin olun.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {tableColumns.map((col) => (
            <label key={col.column_name}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                wizard.selectedColumns.includes(col.column_name)
                  ? "bg-indigo-50 border-indigo-300 text-zinc-800"
                  : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
              }`}>
              <input type="checkbox"
                checked={wizard.selectedColumns.includes(col.column_name)}
                onChange={() => setWizard((w) => ({
                  ...w,
                  selectedColumns: w.selectedColumns.includes(col.column_name)
                    ? w.selectedColumns.filter((c) => c !== col.column_name)
                    : [...w.selectedColumns, col.column_name],
                }))}
                className="accent-indigo-600 cursor-pointer" />
              <span className="font-mono text-[11px]">{col.column_name}</span>
              <span className="text-[9px] text-zinc-400 ml-auto">{col.data_type}</span>
            </label>
          ))}
        </div>
      )}

      {wizard.triggerType === "cron" && tableColumns.length > 0 && (
        <div className="pt-2 border-t border-zinc-100">
          <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Tarih Filtresi (opsiyonel)</label>
          <div className="flex flex-wrap gap-2">
            <select value={wizard.dateFilterColumn}
              onChange={(e) => setWizard((w) => ({ ...w, dateFilterColumn: e.target.value }))}
              className="h-8 px-2 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none cursor-pointer">
              <option value="">Filtre yok</option>
              {tableColumns.filter((c) => c.data_type.includes("date") || c.data_type.includes("timestamp")).map((c) => (
                <option key={c.column_name} value={c.column_name}>{c.column_name}</option>
              ))}
            </select>
            {wizard.dateFilterColumn && (
              <div className="flex gap-1.5">
                {DATE_RANGES.map((r) => (
                  <button key={r.value}
                    onClick={() => setWizard((w) => ({ ...w, dateFilterRange: r.value }))}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer transition-all ${
                      wizard.dateFilterRange === r.value
                        ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                        : "bg-white text-zinc-500 border-zinc-200"
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ---- Step 3: Nereye? ----
  const renderStep3 = () => (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">Verinin gonderilecegi hedef ve format.</p>

      <div>
        <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Webhook URL</label>
        <input type="url" value={wizard.webhookUrl}
          onChange={(e) => setWizard((w) => ({ ...w, webhookUrl: e.target.value }))}
          placeholder="https://..."
          className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono placeholder-zinc-400" />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Gonderim Formati</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { type: "teams_adaptive_card" as const, icon: <Palette className="h-4 w-4" />, title: "Teams Adaptive Card", desc: "Microsoft Teams bildirim karti" },
            { type: "plain_json" as const, icon: <Terminal className="h-4 w-4" />, title: "Plain JSON", desc: "Ham JSON veri paketi" },
          ].map((opt) => (
            <button key={opt.type}
              onClick={() => setWizard((w) => ({ ...w, payloadFormat: opt.type }))}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                wizard.payloadFormat === opt.type
                  ? "border-indigo-400 bg-indigo-50 shadow-sm"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}>
              <div className={`mb-1.5 ${wizard.payloadFormat === opt.type ? "text-indigo-600" : "text-zinc-400"}`}>{opt.icon}</div>
              <p className="text-xs font-bold text-zinc-800">{opt.title}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {wizard.payloadFormat === "teams_adaptive_card" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Kart Basligi</label>
            <input value={wizard.cardTitle}
              onChange={(e) => setWizard((w) => ({ ...w, cardTitle: e.target.value }))}
              placeholder="Bildirim Basligi"
              className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 placeholder-zinc-400" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Renk</label>
            <div className="flex gap-1.5">
              {CARD_COLORS.map((c) => (
                <button key={c.value}
                  onClick={() => setWizard((w) => ({ ...w, cardColor: c.value }))}
                  title={c.label}
                  className={`h-8 w-8 rounded-lg border-2 transition-all cursor-pointer ${
                    wizard.cardColor === c.value ? "border-zinc-800 scale-110 shadow-sm" : "border-zinc-200 hover:border-zinc-400"
                  }`}
                  style={{ backgroundColor: c.color }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ---- Step 4: Onizle & Yayinla ----
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Otomasyon ID</label>
          <input value={wizard.automationId}
            onChange={(e) => setWizard((w) => ({ ...w, automationId: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") }))}
            placeholder="ornek_id"
            className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Otomasyon Adi</label>
          <input value={wizard.automationName}
            onChange={(e) => setWizard((w) => ({ ...w, automationName: e.target.value }))}
            placeholder="Bildirim Adi"
            className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 placeholder-zinc-400" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Aciklama</label>
        <input value={wizard.description}
          onChange={(e) => setWizard((w) => ({ ...w, description: e.target.value }))}
          placeholder="Bu otomasyon ne yapar, nereden veri alir..."
          className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 placeholder-zinc-400" />
      </div>

      {/* SQL Preview */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">SQL Onizleme</label>
          <button onClick={copySqlPreview}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-md cursor-pointer transition-colors">
            {sqlCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            {sqlCopied ? "Kopyalandi" : "Kopyala"}
          </button>
        </div>
        <pre className="bg-zinc-900 border border-zinc-200 rounded-lg p-3 text-[11px] text-zinc-300 font-mono max-h-64 overflow-auto whitespace-pre-wrap select-all leading-relaxed">
          {generatePreviewSQL(wizard)}
        </pre>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">
          {wizard.triggerType === "cron" ? `Cron: ${wizard.cronSchedule}` : `Trigger: ${wizard.triggerEvents.join("/")}`}
        </span>
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">
          Tablo: {wizard.sourceTable}
        </span>
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">
          {wizard.selectedColumns.length} sutun
        </span>
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">
          {wizard.payloadFormat === "teams_adaptive_card" ? "Teams Card" : "JSON"}
        </span>
      </div>
    </div>
  );

  // ===================== Main Render =====================

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 pb-16 font-sans antialiased">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="h-5 w-[1px] bg-zinc-200" />
            <Settings className="h-4 w-4 text-indigo-600" />
            <h1 className="text-sm font-bold tracking-tight text-zinc-900">Entegrasyon Haritasi</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-medium">
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">{cronCount} Cron</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">{triggerCount} Trigger</span>
            <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-md">{activeCount}/{automations.length} Aktif</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* DB Migration Warning */}
        {!dbMigrated && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-sm font-bold text-amber-800">Veritabani Kurulumu Gerekli</h2>
                <p className="text-xs text-amber-700 mt-1">
                  <strong>manuf_automations</strong> tablosu bulunamadi.
                </p>
                <div className="mt-3 bg-zinc-900 rounded-lg p-3 font-mono text-xs relative max-h-48 overflow-y-auto border border-zinc-200">
                  <button onClick={copySql}
                    className="absolute right-2 top-2 p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <pre className="whitespace-pre-wrap text-zinc-300 select-all">{sqlQuery}</pre>
                </div>
                <button onClick={loadAutomations}
                  className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all">
                  Yeniden Kontrol Et
                </button>
              </div>
            </div>
          </section>
        )}

        {dbMigrated && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input type="text" placeholder="Ara..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-zinc-400" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-0.5 shadow-sm">
                  <Filter className="h-3 w-3 text-zinc-400 ml-2" />
                  {(["all", "cron", "trigger"] as FilterType[]).map((t) => (
                    <button key={t} onClick={() => setFilterType(t)}
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                        filterType === t ? "bg-zinc-100 text-zinc-800 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                      }`}>
                      {t === "all" ? "Tumu" : t === "cron" ? "Cron" : "Trigger"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-0.5 shadow-sm">
                  {(["all", "active", "inactive"] as FilterStatus[]).map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                        filterStatus === s ? "bg-zinc-100 text-zinc-800 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                      }`}>
                      {s === "all" ? "Tumu" : s === "active" ? "Aktif" : "Pasif"}
                    </button>
                  ))}
                </div>
                {!isReadOnly && (
                  <button onClick={openWizard}
                    className={`h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      showWizard ? "bg-zinc-200 text-zinc-600 border border-zinc-300" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}>
                    <Wand2 className="h-3.5 w-3.5" />
                    Sihirbaz
                  </button>
                )}
              </div>
            </div>

            {/* Wizard */}
            {showWizard && renderWizard()}

            {/* Manual Form Toggle */}
            {!showWizard && !isReadOnly && (
              <div className="flex justify-end mb-3">
                <button onClick={() => setShowManualForm(!showManualForm)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 flex items-center gap-1 cursor-pointer transition-colors">
                  <Wrench className="h-3 w-3" />
                  {showManualForm ? "Manuel Formu Kapat" : "Manuel Tanimlama"}
                </button>
              </div>
            )}

            {/* Manual Form */}
            {showManualForm && !showWizard && (
              <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-5 shadow-sm">
                <h3 className="text-xs font-bold text-zinc-600 mb-3 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5" /> Manuel Entegrasyon Tanimlama
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">ID</label>
                    <input value={manualForm.id}
                      onChange={(e) => setManualForm({ ...manualForm, id: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                      placeholder="ornek_id"
                      className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Ad</label>
                    <input value={manualForm.name}
                      onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                      placeholder="Otomasyon Adi"
                      className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 placeholder-zinc-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Tip</label>
                    <select value={manualForm.type}
                      onChange={(e) => setManualForm({ ...manualForm, type: e.target.value as "cron" | "trigger" })}
                      className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none cursor-pointer">
                      <option value="trigger">Trigger</option>
                      <option value="cron">Cron</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Hedef Fonksiyon</label>
                    <input value={manualForm.target_function}
                      onChange={(e) => setManualForm({ ...manualForm, target_function: e.target.value })}
                      placeholder="func_name()"
                      className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Webhook URL</label>
                    <input value={manualForm.webhook_url}
                      onChange={(e) => setManualForm({ ...manualForm, webhook_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Aciklama</label>
                    <input value={manualForm.description}
                      onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                      placeholder="Aciklama..."
                      className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 placeholder-zinc-400" />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={handleCreateManual} disabled={creatingManual}
                    className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                    <Plus className="h-3.5 w-3.5" /> {creatingManual ? "Ekleniyor..." : "Manuel Ekle"}
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-zinc-200 border-dashed">
                <Info className="h-6 w-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">
                  {automations.length === 0 ? "Henuz tanimli entegrasyon yok. Sihirbaz ile yeni bir tane olusturun." : "Filtreye uygun entegrasyon bulunamadi."}
                </p>
              </div>
            ) : (
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-[2fr_1fr_2fr_1.5fr_auto] gap-4 px-5 py-2.5 bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <span>Entegrasyon</span>
                  <span>Tip</span>
                  <span>Hedef Fonksiyon</span>
                  <span>Webhook</span>
                  <span className="text-right pr-2">Durum</span>
                </div>

                {filtered.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const isCron = item.type === "cron";
                  const isSaving = savingId === item.id;
                  const isTriggering = triggeringId === item.id;
                  const isDeleting = deletingId === item.id;
                  const webhookShort = item.webhook_url
                    ? item.webhook_url.length > 40 ? item.webhook_url.slice(0, 40) + "..." : item.webhook_url
                    : null;

                  return (
                    <div key={item.id} className="border-b border-zinc-100 last:border-b-0">
                      {/* Summary Row */}
                      <div onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className={`grid grid-cols-1 sm:grid-cols-[2fr_1fr_2fr_1.5fr_auto] gap-2 sm:gap-4 px-5 py-3 items-center cursor-pointer hover:bg-zinc-50 transition-colors ${isExpanded ? "bg-zinc-50" : ""}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-800 truncate">{item.name}</p>
                            <p className="text-[10px] text-zinc-400 font-mono truncate">{item.id}</p>
                          </div>
                        </div>
                        <div>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isCron ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {isCron ? <Clock className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
                            {isCron ? "Cron" : "Trigger"}
                          </span>
                          {isCron && item.schedule && <span className="text-[9px] text-zinc-400 font-mono ml-1.5">{item.schedule}</span>}
                          {!isCron && item.source_event && <span className="text-[9px] text-zinc-400 font-mono ml-1.5 hidden lg:inline">{item.source_event}</span>}
                        </div>
                        <div className="hidden sm:block">
                          <span className="text-[11px] text-zinc-500 font-mono truncate block">{item.target_function}</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                          {webhookShort ? (
                            <><Link2 className="h-3 w-3 text-emerald-500 shrink-0" /><span className="text-[10px] text-zinc-400 font-mono truncate">{webhookShort}</span></>
                          ) : (
                            <span className="text-[10px] text-zinc-300 italic">Tanimsiz</span>
                          )}
                        </div>
                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleToggle(item.id, item.is_active)}
                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${item.is_active ? "bg-emerald-500" : "bg-zinc-300"}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${item.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 bg-zinc-50 border-t border-zinc-100">
                          {/* Flow Diagram */}
                          <div className="flex flex-wrap items-center gap-2 mb-4 py-2.5 px-3 bg-white rounded-lg border border-zinc-200">
                            <div className="flex items-center gap-1.5">
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isCron ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"}`}>
                                {isCron ? <Clock className="h-3 w-3" /> : <Database className="h-3 w-3" />}
                              </div>
                              <span className="text-[10px] font-semibold text-zinc-600 font-mono">
                                {isCron ? editingSchedules[item.id] || item.schedule : item.source_event}
                              </span>
                            </div>
                            <span className="text-zinc-300 text-xs">&rarr;</span>
                            <div className="flex items-center gap-1.5">
                              <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><Terminal className="h-3 w-3" /></div>
                              <span className="text-[10px] font-semibold text-zinc-600 font-mono">{item.target_function}</span>
                            </div>
                            <span className="text-zinc-300 text-xs">&rarr;</span>
                            <div className="flex items-center gap-1.5">
                              <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Link2 className="h-3 w-3" /></div>
                              <span className="text-[10px] font-semibold text-zinc-600">{editingUrls[item.id] ? "Webhook" : "Tanimsiz"}</span>
                            </div>
                          </div>

                          {/* Fields */}
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Webhook URL</label>
                              <input type="url" value={editingUrls[item.id] || ""}
                                onChange={(e) => setEditingUrls({ ...editingUrls, [item.id]: e.target.value })}
                                placeholder="https://..."
                                className="w-full h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono placeholder-zinc-400" />
                            </div>
                            {isCron && (
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Cron Zamanlama</label>
                                <div className="flex items-center gap-3">
                                  <input value={editingSchedules[item.id] || ""}
                                    onChange={(e) => setEditingSchedules({ ...editingSchedules, [item.id]: e.target.value })}
                                    placeholder="0 5 * * *"
                                    className="w-40 h-9 px-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 font-mono placeholder-zinc-400" />
                                  <span className="text-[10px] text-zinc-400">UTC saat dilimi</span>
                                </div>
                              </div>
                            )}
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wide">Aciklama</label>
                              <textarea value={editingDescriptions[item.id] || ""}
                                onChange={(e) => setEditingDescriptions({ ...editingDescriptions, [item.id]: e.target.value })}
                                rows={2} placeholder="Aciklama..."
                                className="w-full px-3 py-2 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed placeholder-zinc-400" />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 pt-3 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                              <span>Son guncelleme: {new Date(item.updated_at).toLocaleString("tr-TR")}</span>
                              <button onClick={() => handleDelete(item.id)} disabled={isDeleting}
                                className="text-red-400 hover:text-red-600 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50">
                                <Trash2 className="h-3 w-3" /> {isDeleting ? "Siliniyor..." : "Sil"}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              {isCron && (
                                <button onClick={() => handleTriggerNow(item.id)} disabled={isTriggering || isSaving}
                                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50">
                                  <Send className="h-3 w-3" /> {isTriggering ? "Tetikleniyor..." : "Test"}
                                </button>
                              )}
                              <button onClick={() => handleSave(item.id, item.type)} disabled={isSaving || isTriggering}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50">
                                <Save className="h-3.5 w-3.5" /> {isSaving ? "Kaydediliyor..." : "Kaydet"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
