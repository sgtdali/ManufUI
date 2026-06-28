"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Settings, AlertTriangle, ArrowLeft, Copy, Check,
  Filter, Wand2, X, Info, Search, Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  getManufAutomations, saveManufAutomation, createManufAutomation,
  deleteManufAutomation, toggleManufAutomation, triggerCronAutomation,
  getTableColumns, deployAutomation,
  type ManufAutomation, type DeployAutomationParams,
} from "../actions";
import type { FilterType, FilterStatus, WizardStep } from "./_components/constants";
import { MANUF_TABLES, INITIAL_WIZARD, DB_MIGRATION_SQL } from "./_components/constants";
import type { WizardState } from "./_components/constants";
import { generatePreviewSQL } from "./_components/generatePreviewSQL";
import { ManualForm } from "./_components/ManualForm";
import { AutomationTableRow } from "./_components/AutomationTableRow";
import { LoadingScreen, LoginScreen } from "./_components/LoginScreen";
import { WizardPanel } from "./_components/WizardPanel";

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

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    id: "", type: "trigger" as "cron" | "trigger", name: "", schedule: "",
    source_event: "", target_function: "", webhook_url: "", description: "",
  });
  const [creatingManual, setCreatingManual] = useState(false);

  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizard, setWizard] = useState<WizardState>(INITIAL_WIZARD);
  const [tableColumns, setTableColumns] = useState<{ column_name: string; data_type: string }[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const checkAuth = () => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
    };
    const auth = getCookie("password_auth");
    if (auth === "rmk_hf901") { setIsReadOnly(false); return "admin"; }
    if (auth === "password_ncms") { setIsReadOnly(true); return "readonly"; }
    setIsReadOnly(null);
    return null;
  };

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
        setEditingUrls(urls); setEditingSchedules(schedules); setEditingDescriptions(descriptions);
        setDbMigrated(true);
      } else {
        if (res.error && (res.error.includes("relation") || res.error.includes("cache") || res.error.includes("does not exist"))) { setDbMigrated(false); }
        else { toast.error(`Otomasyonlar yuklenemedi: ${res.error}`); }
      }
    } catch { toast.error("Beklenmeyen bir hata olustu."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const role = checkAuth();
    if (role) { loadAutomations(); } else { setLoading(false); }
  }, []);

  const handleLogin = () => {
    if (password === "rmk_hf901" || password === "password_ncms") {
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `password_auth=${password}; path=/; max-age=2592000; expires=${expiryDate}; SameSite=Lax`;
      const ro = password === "password_ncms";
      setIsReadOnly(ro);
      toast.success(ro ? "Giris basarili (salt okunur)" : "Giris basarili!");
      loadAutomations();
    } else { toast.error("Hatali sifre!"); }
  };

  const handleSave = async (id: string, type: "cron" | "trigger") => {
    if (isReadOnly) { toast.error("Salt okunur erisim."); return; }
    setSavingId(id);
    try {
      const updates: { webhook_url: string; description: string; schedule?: string } = { webhook_url: editingUrls[id], description: editingDescriptions[id] };
      if (type === "cron") updates.schedule = editingSchedules[id];
      const res = await saveManufAutomation(id, updates);
      if (res.success) { toast.success("Kaydedildi!"); await loadAutomations(); } else toast.error(`Hata: ${res.error}`);
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
      if (res.success) { toast.success("Silindi!"); if (expandedId === id) setExpandedId(null); await loadAutomations(); } else toast.error(`Hata: ${res.error}`);
    } catch { toast.error("Hata olustu."); }
    finally { setDeletingId(null); }
  };

  const handleTriggerNow = async (id: string) => {
    setTriggeringId(id);
    try {
      const res = await triggerCronAutomation(id);
      if (res.success) toast.success("Tetiklendi!"); else toast.error(`Hata: ${res.error}`);
    } catch { toast.error("Hata olustu."); }
    finally { setTriggeringId(null); }
  };

  const handleCreateManual = async () => {
    if (isReadOnly) { toast.error("Salt okunur erisim."); return; }
    if (!manualForm.id || !manualForm.name || !manualForm.target_function) { toast.error("ID, Ad ve Hedef Fonksiyon zorunludur."); return; }
    setCreatingManual(true);
    try {
      const res = await createManufAutomation({
        id: manualForm.id, type: manualForm.type, name: manualForm.name,
        schedule: manualForm.type === "cron" ? manualForm.schedule || null : null,
        source_event: manualForm.type === "trigger" ? manualForm.source_event || null : null,
        target_function: manualForm.target_function, webhook_url: manualForm.webhook_url || null, description: manualForm.description || null,
      });
      if (res.success) {
        toast.success("Eklendi!"); setShowManualForm(false);
        setManualForm({ id: "", type: "trigger", name: "", schedule: "", source_event: "", target_function: "", webhook_url: "", description: "" });
        await loadAutomations();
      } else toast.error(`Hata: ${res.error}`);
    } catch { toast.error("Hata olustu."); }
    finally { setCreatingManual(false); }
  };

  const fetchColumns = useCallback(async (table: string) => {
    if (!table) { setTableColumns([]); return; }
    setLoadingColumns(true);
    try {
      const res = await getTableColumns(table);
      if (res.success && res.data) { setTableColumns(res.data.map((r) => ({ column_name: r.column_name, data_type: r.data_type }))); }
      else { toast.error("Sutunlar yuklenemedi."); setTableColumns([]); }
    } catch { setTableColumns([]); }
    finally { setLoadingColumns(false); }
  }, []);

  const openWizard = () => { setWizard(INITIAL_WIZARD); setWizardStep(1); setTableColumns([]); setShowWizard(true); setShowManualForm(false); };
  const closeWizard = () => setShowWizard(false);

  const wizardCanNext = (): boolean => {
    if (wizardStep === 1) return wizard.triggerType === "cron" ? !!wizard.sourceTable && !!wizard.cronSchedule : !!wizard.sourceTable && wizard.triggerEvents.length > 0;
    if (wizardStep === 2) return wizard.selectedColumns.length > 0;
    if (wizardStep === 3) return !!wizard.webhookUrl;
    return true;
  };

  const wizardNext = () => {
    if (wizardStep === 1 && wizard.sourceTable) fetchColumns(wizard.sourceTable);
    if (wizardStep === 3 && !wizard.automationName) {
      const tableLabel = MANUF_TABLES.find((t) => t.value === wizard.sourceTable)?.label || wizard.sourceTable;
      setWizard((w) => ({ ...w, automationName: `${tableLabel} ${w.triggerType === "cron" ? "Rapor" : "Bildirim"}`, automationId: w.automationId || `${w.sourceTable.replace("manuf_", "")}_${w.triggerType === "cron" ? "report" : "notify"}` }));
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
    setSqlCopied(true); toast.success("SQL kopyalandi!"); setTimeout(() => setSqlCopied(false), 2000);
  };

  const filtered = automations.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterStatus === "active" && !a.is_active) return false;
    if (filterStatus === "inactive" && a.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || (a.target_function || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q) || (a.webhook_url || "").toLowerCase().includes(q);
    }
    return true;
  });

  const cronCount = automations.filter((a) => a.type === "cron").length;
  const triggerCount = automations.filter((a) => a.type === "trigger").length;
  const activeCount = automations.filter((a) => a.is_active).length;

  const copySql = () => { navigator.clipboard.writeText(DB_MIGRATION_SQL); setCopied(true); toast.success("SQL kopyalandi!"); setTimeout(() => setCopied(false), 2000); };

  if (isReadOnly === null || (loading && isReadOnly === false)) return <LoadingScreen />;
  if (isReadOnly === null) return <LoginScreen password={password} onPasswordChange={setPassword} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 pb-16 font-sans antialiased">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all"><ArrowLeft className="h-4 w-4" /></Link>
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
        {!dbMigrated && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-sm font-bold text-amber-800">Veritabani Kurulumu Gerekli</h2>
                <p className="text-xs text-amber-700 mt-1"><strong>manuf_automations</strong> tablosu bulunamadi.</p>
                <div className="mt-3 bg-zinc-900 rounded-lg p-3 font-mono text-xs relative max-h-48 overflow-y-auto border border-zinc-200">
                  <button onClick={copySql} className="absolute right-2 top-2 p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <pre className="whitespace-pre-wrap text-zinc-300 select-all">{DB_MIGRATION_SQL}</pre>
                </div>
                <button onClick={loadAutomations} className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all">Yeniden Kontrol Et</button>
              </div>
            </div>
          </section>
        )}

        {dbMigrated && (
          <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input type="text" placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 border border-zinc-300 bg-white rounded-lg text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-zinc-400" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-0.5 shadow-sm">
                  <Filter className="h-3 w-3 text-zinc-400 ml-2" />
                  {(["all", "cron", "trigger"] as FilterType[]).map((t) => (
                    <button key={t} onClick={() => setFilterType(t)} className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${filterType === t ? "bg-zinc-100 text-zinc-800 shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>
                      {t === "all" ? "Tumu" : t === "cron" ? "Cron" : "Trigger"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-0.5 shadow-sm">
                  {(["all", "active", "inactive"] as FilterStatus[]).map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s)} className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${filterStatus === s ? "bg-zinc-100 text-zinc-800 shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>
                      {s === "all" ? "Tumu" : s === "active" ? "Aktif" : "Pasif"}
                    </button>
                  ))}
                </div>
                {!isReadOnly && (
                  <button onClick={openWizard} className={`h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${showWizard ? "bg-zinc-200 text-zinc-600 border border-zinc-300" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
                    <Wand2 className="h-3.5 w-3.5" /> Sihirbaz
                  </button>
                )}
              </div>
            </div>

            {showWizard && (
              <WizardPanel wizard={wizard} setWizard={setWizard} wizardStep={wizardStep}
                onClose={closeWizard} onBack={wizardBack} onNext={wizardNext} canNext={wizardCanNext()}
                onDeploy={handleDeploy} deploying={deploying}
                loadingColumns={loadingColumns} tableColumns={tableColumns}
                sqlPreview={generatePreviewSQL(wizard)} onCopySql={copySqlPreview} sqlCopied={sqlCopied} />
            )}

            {!showWizard && !isReadOnly && (
              <div className="flex justify-end mb-3">
                <button onClick={() => setShowManualForm(!showManualForm)} className="text-[10px] text-zinc-400 hover:text-zinc-600 flex items-center gap-1 cursor-pointer transition-colors">
                  <Wrench className="h-3 w-3" />{showManualForm ? "Manuel Formu Kapat" : "Manuel Tanimlama"}
                </button>
              </div>
            )}

            {showManualForm && !showWizard && (
              <ManualForm manualForm={manualForm} setManualForm={setManualForm} onCreateManual={handleCreateManual} creatingManual={creatingManual} />
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-zinc-200 border-dashed">
                <Info className="h-6 w-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">{automations.length === 0 ? "Henuz tanimli entegrasyon yok. Sihirbaz ile yeni bir tane olusturun." : "Filtreye uygun entegrasyon bulunamadi."}</p>
              </div>
            ) : (
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="hidden sm:grid grid-cols-[2fr_1fr_2fr_1.5fr_auto] gap-4 px-5 py-2.5 bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <span>Entegrasyon</span><span>Tip</span><span>Hedef Fonksiyon</span><span>Webhook</span><span className="text-right pr-2">Durum</span>
                </div>
                {filtered.map((item) => (
                  <AutomationTableRow key={item.id} item={item}
                    isExpanded={expandedId === item.id} onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    editingUrls={editingUrls} editingSchedules={editingSchedules} editingDescriptions={editingDescriptions}
                    onUrlChange={(id, v) => setEditingUrls({ ...editingUrls, [id]: v })}
                    onScheduleChange={(id, v) => setEditingSchedules({ ...editingSchedules, [id]: v })}
                    onDescriptionChange={(id, v) => setEditingDescriptions({ ...editingDescriptions, [id]: v })}
                    onSave={handleSave} onToggle={handleToggle} onDelete={handleDelete} onTriggerNow={handleTriggerNow}
                    savingId={savingId} triggeringId={triggeringId} deletingId={deletingId} isReadOnly={!!isReadOnly} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
