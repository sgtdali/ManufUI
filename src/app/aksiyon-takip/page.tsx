"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown, Lock, LockOpen } from "lucide-react";
import { BOLUMLER } from "@/lib/types";
import { isReadOnlyUser } from "@/lib/useAuthRole";
import { loadActionItems, createActionItem, updateActionItem, deleteActionItem, loadAssignees } from "./actions";
import type { ActionItem, Assignee } from "./actions";
import { PRIORITIES, STATUSES, buildTree, sortTree, removeItemBranch } from "./_components/helpers";
import { CellSidebar } from "./_components/CellSidebar";
import { ActionRow } from "./_components/ActionRow";
import { InlineActionCreateRow } from "./_components/InlineActionCreateRow";
import { PasswordDialog } from "./_components/PasswordDialog";

const ACTION_CELLS = [...BOLUMLER];

export default function AksiyonTakipPage() {
  const [globalReadOnly, setGlobalReadOnly] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    const ro = isReadOnlyUser();
    setGlobalReadOnly(ro);
    if (typeof window !== "undefined" && !ro) {
      const auth = localStorage.getItem("action_items_authorized") === "true";
      setIsAuthorized(auth);
    }
  }, []);

  const handleLock = () => {
    setIsAuthorized(false);
    localStorage.removeItem("action_items_authorized");
    toast.success("Düzenleme modu kilitlendi.");
  };

  const handleConfirmPassword = (pw: string): boolean => {
    if (globalReadOnly) {
      toast.error("Salt okunur erisim — duzenleme yetkiniz yok.");
      return false;
    }
    if (pw === "repkonopm") {
      setIsAuthorized(true);
      localStorage.setItem("action_items_authorized", "true");
      toast.success("Düzenleme yetkisi doğrulandı.");
      if (pendingAction) { pendingAction(); setPendingAction(null); }
      return true;
    }
    return false;
  };

  const ensureAuthorized = (callback: () => void) => {
    if (globalReadOnly) { toast.error("Salt okunur erisim — duzenleme yetkiniz yok."); return; }
    if (isAuthorized) { callback(); } else { setPendingAction(() => callback); setIsPasswordDialogOpen(true); }
  };

  const [items, setItems] = useState<ActionItem[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [filterCell, setFilterCell] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [subFormParentId, setSubFormParentId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [inlineTitle, setInlineTitle] = useState("");
  const [subInlineTitle, setSubInlineTitle] = useState("");

  const [sortField, setSortField] = useState<"assignee" | "due_date" | "priority" | "status" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | "default">("default");

  const handleSort = (field: "assignee" | "due_date" | "priority" | "status") => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") { setSortDirection("default"); setSortField(null); }
      else setSortDirection("asc");
    } else { setSortField(field); setSortDirection("asc"); }
  };

  const getSortIcon = (field: "assignee" | "due_date" | "priority" | "status") => {
    if (sortField !== field || sortDirection === "default")
      return <ArrowUpDown className="size-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    if (sortDirection === "asc") return <ArrowUp className="size-3.5 text-emerald-600" />;
    return <ArrowDown className="size-3.5 text-emerald-600" />;
  };

  const fetchData = async () => {
    setLoading(true);
    const [actionItemsRes, assigneesRes] = await Promise.all([loadActionItems(), loadAssignees()]);
    if (actionItemsRes.success) setItems(actionItemsRes.data);
    else toast.error("Veriler yüklenemedi: " + actionItemsRes.error);
    if (assigneesRes.success) setAssignees(assigneesRes.data);
    else toast.error("Sorumlu listesi yüklenemedi: " + assigneesRes.error);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const itemsMatchingStatusAndPriority = items.filter((item) => {
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterPriority && item.priority !== filterPriority) return false;
    return true;
  });

  const filteredItems = itemsMatchingStatusAndPriority.filter((item) => !filterCell || item.cell === filterCell);
  const rawTree = buildTree(filteredItems);
  const tree = sortTree(rawTree, sortField, sortDirection);

  const cellCounts = ACTION_CELLS.reduce<Record<string, number>>((acc, cell) => {
    acc[cell] = itemsMatchingStatusAndPriority.filter((item) => !item.parent_id && item.cell === cell).length;
    return acc;
  }, {});

  const handleInlineCreate = () => {
    const title = inlineTitle.trim();
    if (!filterCell) { toast.error("Yeni aksiyon eklemek için soldan bir hücre seçin."); return; }
    if (!title) return;
    startTransition(async () => {
      const res = await createActionItem({ parent_id: null, cell: filterCell, title, assignee: "", due_date: null, priority: null });
      if (res.success) { setItems((prev) => [res.data, ...prev]); setInlineTitle(""); }
      else toast.error("Kayıt hatası: " + res.error);
    });
  };

  const handleSubInlineCreate = (parentId: string, cell: string) => {
    const title = subInlineTitle.trim();
    if (!title) return;
    startTransition(async () => {
      const res = await createActionItem({ parent_id: parentId, cell, title, assignee: "", due_date: null, priority: null });
      if (res.success) { setItems((prev) => [res.data, ...prev]); setSubInlineTitle(""); setSubFormParentId(null); }
      else toast.error("Kayıt hatası: " + res.error);
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { status });
      if (res.success) { toast.success("Durum güncellendi."); setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: status as ActionItem["status"] } : item))); }
      else toast.error("Güncelleme hatası: " + res.error);
    });
  };

  const handlePriorityChange = (id: string, priority: string | null) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { priority });
      if (res.success) { toast.success("Öncelik güncellendi."); setItems((prev) => prev.map((item) => (item.id === id ? { ...item, priority } : item))); }
      else toast.error("Güncelleme hatası: " + res.error);
    });
  };

  const handleAssigneeChange = (id: string, assignee: string, assignee_email: string | null) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { assignee, assignee_email });
      if (res.success) { toast.success("Sorumlu güncellendi."); setItems((prev) => prev.map((item) => item.id === id ? { ...item, assignee, assignee_email } : item)); }
      else toast.error("Güncelleme hatası: " + res.error);
    });
  };

  const handleDueDateChange = (id: string, due_date: string) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { due_date: due_date || null });
      if (res.success) { toast.success("Termin tarihi güncellendi."); setItems((prev) => prev.map((item) => item.id === id ? { ...item, due_date: due_date || null } : item)); }
      else toast.error("Güncelleme hatası: " + res.error);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bu aksiyonu silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await deleteActionItem(id);
      if (res.success) { toast.success("Aksiyon silindi."); setItems((prev) => removeItemBranch(prev, id)); }
      else toast.error("Silme hatası: " + res.error);
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const openSubForm = (parentId: string) => {
    setSubFormParentId(parentId);
    setSubInlineTitle("");
    setExpandedRows((prev) => new Set(prev).add(parentId));
  };

  const showCellColumn = !filterCell;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-4 text-zinc-950 md:px-8 flex flex-col gap-4">
      <header className="flex flex-col gap-2 border-b border-zinc-200 pb-3 md:flex-row md:items-end md:justify-between w-full">
        <div><h1 className="text-2xl font-semibold tracking-normal">Aksiyon Takip</h1></div>
        <div className="flex flex-wrap gap-2 items-center">
          {isAuthorized ? (
            <button onClick={handleLock}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-100 transition" title="Düzenleme modunu kapat">
              <LockOpen className="size-4" /> Düzenleme Açık
            </button>
          ) : (
            <button onClick={() => ensureAuthorized(() => {})}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-100 transition" title="Düzenleme yapmak için tıklayın">
              <Lock className="size-4" /> Düzenleme Kilitli
            </button>
          )}
          <Link className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100" href="/">
            <ArrowLeft className="size-4" /> Forma dön
          </Link>
        </div>
      </header>

      <div className="grid w-full gap-4 xl:grid-cols-[280px_minmax(0,1fr)] flex-1">
        <CellSidebar cells={ACTION_CELLS} selectedCell={filterCell} counts={cellCounts}
          totalCount={itemsMatchingStatusAndPriority.filter((item) => !item.parent_id).length} onSelectCell={setFilterCell} />

        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">Durum</label>
                <select className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                  value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Tümü</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">Öncelik</label>
                <select className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                  value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  <option value="">Tümü</option>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button className="self-end rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
                onClick={() => { setFilterCell(""); setFilterStatus(""); setFilterPriority(""); }}>
                Temizle
              </button>
            </div>
          </section>

          <section className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] rounded-lg border border-zinc-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-500">Yükleniyor...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-50">
                  <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 select-none">
                    <th className="w-8 px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8]"></th>
                    <th className="px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8]">Başlık</th>
                    {showCellColumn ? <th className="px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8]">Hücre</th> : null}
                    {(["assignee", "due_date", "priority", "status"] as const).map((field) => (
                      <th key={field} className="group cursor-pointer px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8] hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                        onClick={() => handleSort(field)}>
                        <div className="flex items-center gap-1">
                          <span>{field === "assignee" ? "Sorumlu" : field === "due_date" ? "Termin" : field === "priority" ? "Öncelik" : "Durum"}</span>
                          {getSortIcon(field)}
                        </div>
                      </th>
                    ))}
                    <th className="w-24 px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {tree.map((item) => (
                    <ActionRow key={item.id} item={item} depth={0}
                      expandedRows={expandedRows} toggleExpand={toggleExpand} assignees={assignees}
                      onStatusChange={(id, status) => ensureAuthorized(() => handleStatusChange(id, status))}
                      onPriorityChange={(id, priority) => ensureAuthorized(() => handlePriorityChange(id, priority))}
                      onAssigneeChange={(id, assignee, email) => ensureAuthorized(() => handleAssigneeChange(id, assignee, email))}
                      onDueDateChange={(id, due_date) => ensureAuthorized(() => handleDueDateChange(id, due_date))}
                      onDelete={(id) => ensureAuthorized(() => handleDelete(id))}
                      onAddSub={(parentId, _parentCell) => ensureAuthorized(() => openSubForm(parentId))}
                      onCreateSub={(parentId, parentCell) => ensureAuthorized(() => handleSubInlineCreate(parentId, parentCell))}
                      onCloseSub={() => setSubFormParentId(null)}
                      isPending={isPending} subFormParentId={subFormParentId} subTitle={subInlineTitle}
                      onSubTitleChange={setSubInlineTitle} showCellColumn={showCellColumn}
                      isAuthorized={isAuthorized} ensureAuthorized={ensureAuthorized} />
                  ))}
                  <InlineActionCreateRow selectedCell={filterCell} title={inlineTitle} isPending={isPending}
                    onTitleChange={setInlineTitle} onCreate={() => ensureAuthorized(() => handleInlineCreate())}
                    showCellColumn={showCellColumn} isAuthorized={isAuthorized} ensureAuthorized={ensureAuthorized} />
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
      <PasswordDialog isOpen={isPasswordDialogOpen}
        onClose={() => { setIsPasswordDialogOpen(false); setPendingAction(null); }}
        onConfirm={handleConfirmPassword} />
    </main>
  );
}
