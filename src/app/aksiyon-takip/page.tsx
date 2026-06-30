"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown, Lock, LockOpen, Search, Download } from "lucide-react";
import { BOLUMLER } from "@/lib/types";
import { isReadOnlyUser } from "@/lib/useAuthRole";
import { createClient } from "@/lib/supabase/client";
import { AssigneeAuthControl } from "./_components/AssigneeAuthControl";
import {
  loadActionItems, createActionItem, updateActionItem, deleteActionItem, loadAssignees,
  loadComments, addComment,
} from "./actions";
import type { ActionItem, Assignee, ActionComment } from "./actions";
import { PRIORITIES, STATUSES, buildTree, sortTree, removeItemBranch, filterBySearch, flattenTree, exportItemsToExcel } from "./_components/helpers";
import { CellSidebar } from "./_components/CellSidebar";
import { ActionRow } from "./_components/ActionRow";
import { InlineActionCreateRow } from "./_components/InlineActionCreateRow";
import { PasswordDialog } from "./_components/PasswordDialog";
import { ActionDetailModal } from "./_components/ActionDetailModal";

const ACTION_CELLS = [...BOLUMLER];

const ADMIN_EMAILS = ["tayfun.vural@repkon.com.tr", "baris.sahinoglu@repkon.com.tr"];
const isAdminEmail = (email: string | null) => !!email && ADMIN_EMAILS.includes(email.toLowerCase());

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

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // tayfun.vural / baris.sahinoglu için magic-link girişi, "repkonopm" şifresini girmiş gibi tam yetki verir
  const isFullyAuthorized = isAuthorized || isAdminEmail(userEmail);

  const ensureAuthorized = (callback: () => void) => {
    if (globalReadOnly) { toast.error("Salt okunur erisim — duzenleme yetkiniz yok."); return; }
    if (isFullyAuthorized) { callback(); } else { setPendingAction(() => callback); setIsPasswordDialogOpen(true); }
  };

  const isOwnerOfItem = (item: ActionItem | null | undefined): boolean =>
    !!item && !!userEmail && !!item.assignee_email && userEmail.toLowerCase() === item.assignee_email.toLowerCase();

  const canEditItem = (item: ActionItem | null | undefined): boolean => isFullyAuthorized || isOwnerOfItem(item);

  const ensureRowAuthorized = (item: ActionItem | null | undefined, callback: () => void) => {
    if (globalReadOnly) { toast.error("Salt okunur erisim — duzenleme yetkiniz yok."); return; }
    if (canEditItem(item)) { callback(); return; }
    ensureAuthorized(callback);
  };

  const [titleWidth, setTitleWidth] = useState(300);

  useEffect(() => {
    const saved = localStorage.getItem("action_title_width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!parsed) return;
      setTitleWidth(parsed);
    }
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = titleWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(150, startWidth + (moveEvent.pageX - startX));
      setTitleWidth(newWidth);
    };

    const handleMouseUp = (moveEvent: MouseEvent) => {
      const finalWidth = Math.max(150, startWidth + (moveEvent.pageX - startX));
      localStorage.setItem("action_title_width", finalWidth.toString());
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const [items, setItems] = useState<ActionItem[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [filterCell, setFilterCell] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [subFormParentId, setSubFormParentId] = useState<string | null>(null);

  const [detailItem, setDetailItem] = useState<ActionItem | null>(null);
  const [detailComments, setDetailComments] = useState<ActionComment[]>([]);
  const [detailCommentsLoading, setDetailCommentsLoading] = useState(false);
  const [commenterName, setCommenterName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("action_commenter_name");
    if (saved) setCommenterName(saved);
  }, []);

  const handleCommenterNameChange = (name: string) => {
    setCommenterName(name);
    localStorage.setItem("action_commenter_name", name);
  };
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
    if (filterAssignee && item.assignee !== filterAssignee) return false;
    return true;
  });

  const cellFilteredItems = itemsMatchingStatusAndPriority.filter((item) => !filterCell || item.cell === filterCell);
  const filteredItems = filterBySearch(cellFilteredItems, searchQuery);
  const rawTree = buildTree(filteredItems);
  const tree = sortTree(rawTree, sortField, sortDirection);

  const cellCounts = ACTION_CELLS.reduce<Record<string, number>>((acc, cell) => {
    acc[cell] = itemsMatchingStatusAndPriority.filter((item) => !item.parent_id && item.cell === cell).length;
    return acc;
  }, {});

  const assigneeOptions = Array.from(new Set(items.map((i) => i.assignee).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "tr-TR")
  );

  const handleInlineCreate = () => {
    const title = inlineTitle.trim();
    if (!filterCell) { toast.error("Yeni aksiyon eklemek için soldan bir hücre seçin."); return; }
    if (!title) return;
    startTransition(async () => {
      const res = await createActionItem({ parent_id: null, cell: filterCell, title, assignee: "", due_date: null, priority: null });
      if (res.success) { setItems((prev) => [...prev, res.data]); setInlineTitle(""); }
      else toast.error("Kayıt hatası: " + res.error);
    });
  };

  const handleSubInlineCreate = (parentId: string, cell: string) => {
    const title = subInlineTitle.trim();
    if (!title) return;
    startTransition(async () => {
      const res = await createActionItem({ parent_id: parentId, cell, title, assignee: "", due_date: null, priority: null });
      if (res.success) { setItems((prev) => [...prev, res.data]); setSubInlineTitle(""); setSubFormParentId(null); }
      else toast.error("Kayıt hatası: " + res.error);
    });
  };

  const handleStartDateChange = (id: string, start_date: string) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { start_date: start_date || null });
      if (res.success) {
        toast.success("Başlangıç tarihi güncellendi.");
        setItems((prev) => prev.map((item) => item.id === id ? { ...item, start_date: res.data.start_date, updated_at: res.data.updated_at } : item));
        setDetailItem((prev) => prev && prev.id === id ? { ...prev, start_date: res.data.start_date, updated_at: res.data.updated_at } : prev);
      } else toast.error("Güncelleme hatası: " + res.error);
    });
  };

  const handleDescriptionChange = (id: string, description: string) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { description: description || null });
      if (res.success) {
        setItems((prev) => prev.map((item) => item.id === id ? { ...item, description: res.data.description, updated_at: res.data.updated_at } : item));
        setDetailItem((prev) => prev && prev.id === id ? { ...prev, description: res.data.description, updated_at: res.data.updated_at } : prev);
      } else toast.error("Güncelleme hatası: " + res.error);
    });
  };

  const handleOpenDetail = (item: ActionItem) => {
    setDetailItem(item);
    setDetailComments([]);
    setDetailCommentsLoading(true);
    startTransition(async () => {
      const res = await loadComments(item.id);
      if (res.success) setDetailComments(res.data);
      else toast.error("Yorumlar yüklenemedi: " + res.error);
      setDetailCommentsLoading(false);
    });
  };

  const handleAddComment = (id: string, author: string, comment: string) => {
    startTransition(async () => {
      const res = await addComment(id, author, comment);
      if (res.success) setDetailComments((prev) => [...prev, res.data]);
      else toast.error("Yorum eklenemedi: " + res.error);
    });
  };

  const handleExportExcel = () => {
    const flat = flattenTree(tree);
    if (flat.length === 0) { toast.error("Dışa aktarılacak kayıt yok."); return; }
    startTransition(async () => {
      await exportItemsToExcel(flat, `aksiyon-takip-${new Date().toISOString().split("T")[0]}.xlsx`);
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { status });
      if (res.success) {
        toast.success("Durum güncellendi.");
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: res.data.status, updated_at: res.data.updated_at } : item)));
        setDetailItem((prev) => prev && prev.id === id ? { ...prev, status: res.data.status, updated_at: res.data.updated_at } : prev);
      } else toast.error("Güncelleme hatası: " + res.error);
    });
  };

  const handlePriorityChange = (id: string, priority: string | null) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { priority });
      if (res.success) {
        toast.success("Öncelik güncellendi.");
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, priority: res.data.priority, updated_at: res.data.updated_at } : item)));
        setDetailItem((prev) => prev && prev.id === id ? { ...prev, priority: res.data.priority, updated_at: res.data.updated_at } : prev);
      } else toast.error("Güncelleme hatası: " + res.error);
    });
  };

  const handleAssigneeChange = (id: string, assignee: string, assignee_email: string | null) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { assignee, assignee_email });
      if (res.success) {
        toast.success("Sorumlu güncellendi.");
        setItems((prev) => prev.map((item) => item.id === id ? { ...item, assignee: res.data.assignee, assignee_email: res.data.assignee_email, updated_at: res.data.updated_at } : item));
        setDetailItem((prev) => prev && prev.id === id ? { ...prev, assignee: res.data.assignee, assignee_email: res.data.assignee_email, updated_at: res.data.updated_at } : prev);
      } else toast.error("Güncelleme hatası: " + res.error);
    });
  };

  const handleDueDateChange = (id: string, due_date: string) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { due_date: due_date || null });
      if (res.success) {
        toast.success("Termin tarihi güncellendi.");
        setItems((prev) => prev.map((item) => item.id === id ? { ...item, due_date: res.data.due_date, updated_at: res.data.updated_at } : item));
        setDetailItem((prev) => prev && prev.id === id ? { ...prev, due_date: res.data.due_date, updated_at: res.data.updated_at } : prev);
      } else toast.error("Güncelleme hatası: " + res.error);
    });
  };

  const handleTitleChange = (id: string, title: string) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { title });
      if (res.success) {
        toast.success("Başlık güncellendi.");
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, title: res.data.title, updated_at: res.data.updated_at } : item)));
        setDetailItem((prev) => prev && prev.id === id ? { ...prev, title: res.data.title, updated_at: res.data.updated_at } : prev);
      } else {
        toast.error("Güncelleme hatası: " + res.error);
      }
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
          <AssigneeAuthControl userEmail={userEmail} onSignedOut={() => setUserEmail(null)} />
          {isFullyAuthorized ? (
            <button onClick={isAdminEmail(userEmail) ? undefined : handleLock}
              disabled={isAdminEmail(userEmail)}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-100 transition disabled:cursor-default disabled:hover:bg-rose-50"
              title={isAdminEmail(userEmail) ? "Yönetici e-postası ile tam yetkili giriş" : "Düzenleme modunu kapat"}>
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
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">Ara</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input type="text"
                    className="h-9 w-full rounded-md border border-zinc-300 bg-white pl-8 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                    placeholder="Başlık veya açıklamada ara..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
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
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">Sorumlu</label>
                <select className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                  value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
                  <option value="">Tümü</option>
                  {assigneeOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <button className="self-end rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
                onClick={() => { setFilterCell(""); setFilterStatus(""); setFilterPriority(""); setFilterAssignee(""); setSearchQuery(""); }}>
                Temizle
              </button>
              <button className="inline-flex items-center gap-1.5 self-end rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
                onClick={handleExportExcel} title="Excel olarak dışa aktar">
                <Download className="size-4" /> Dışa Aktar
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
                    <th
                      className="relative px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8] group/resize select-none"
                      style={{ width: titleWidth, minWidth: titleWidth, maxWidth: titleWidth }}
                    >
                      <span>Başlık</span>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-zinc-300 hover:bg-emerald-600 hover:w-1.5 active:bg-emerald-800 active:w-1.5 transition-all"
                        onMouseDown={handleResizeMouseDown}
                        title="Sütun genişliğini ayarlamak için sürükleyin"
                      />
                    </th>
                    {showCellColumn ? <th className="px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8]">Hücre</th> : null}
                    <th className="group cursor-pointer px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8] hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                      onClick={() => handleSort("assignee")}>
                      <div className="flex items-center gap-1"><span>Sorumlu</span>{getSortIcon("assignee")}</div>
                    </th>
                    <th className="px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8]">Başlangıç</th>
                    {(["due_date", "priority", "status"] as const).map((field) => (
                      <th key={field} className="group cursor-pointer px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8] hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                        onClick={() => handleSort(field)}>
                        <div className="flex items-center gap-1">
                          <span>{field === "due_date" ? "Termin" : field === "priority" ? "Öncelik" : "Durum"}</span>
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
                      titleWidth={titleWidth}
                      expandedRows={expandedRows} toggleExpand={toggleExpand} assignees={assignees}
                      onStatusChange={(id, status) => ensureRowAuthorized(items.find((i) => i.id === id), () => handleStatusChange(id, status))}
                      onPriorityChange={(id, priority) => ensureRowAuthorized(items.find((i) => i.id === id), () => handlePriorityChange(id, priority))}
                      onAssigneeChange={(id, assignee, email) => ensureAuthorized(() => handleAssigneeChange(id, assignee, email))}
                      onStartDateChange={(id, start_date) => ensureRowAuthorized(items.find((i) => i.id === id), () => handleStartDateChange(id, start_date))}
                      onDueDateChange={(id, due_date) => ensureRowAuthorized(items.find((i) => i.id === id), () => handleDueDateChange(id, due_date))}
                      onTitleChange={(id, title) => ensureRowAuthorized(items.find((i) => i.id === id), () => handleTitleChange(id, title))}
                      onDelete={(id) => ensureAuthorized(() => handleDelete(id))}
                      onAddSub={(parentId, _parentCell) => ensureAuthorized(() => openSubForm(parentId))}
                      onCreateSub={(parentId, parentCell) => ensureAuthorized(() => handleSubInlineCreate(parentId, parentCell))}
                      onCloseSub={() => setSubFormParentId(null)}
                      isPending={isPending} subFormParentId={subFormParentId} subTitle={subInlineTitle}
                      onSubTitleChange={setSubInlineTitle} showCellColumn={showCellColumn}
                      isAuthorized={isFullyAuthorized} ensureAuthorized={ensureAuthorized}
                      onOpenDetail={handleOpenDetail}
                      canEditItem={canEditItem} ensureRowAuthorized={ensureRowAuthorized} />
                  ))}
                  <InlineActionCreateRow selectedCell={filterCell} title={inlineTitle} isPending={isPending}
                    titleWidth={titleWidth}
                    onTitleChange={setInlineTitle} onCreate={() => ensureAuthorized(() => handleInlineCreate())}
                    showCellColumn={showCellColumn} isAuthorized={isFullyAuthorized} ensureAuthorized={ensureAuthorized} />
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
      <PasswordDialog isOpen={isPasswordDialogOpen}
        onClose={() => { setIsPasswordDialogOpen(false); setPendingAction(null); }}
        onConfirm={handleConfirmPassword} />
      {detailItem ? (
        <ActionDetailModal
          item={detailItem}
          comments={detailComments}
          commentsLoading={detailCommentsLoading}
          commenterName={commenterName}
          onCommenterNameChange={handleCommenterNameChange}
          onClose={() => setDetailItem(null)}
          onDescriptionChange={(id, description) => ensureRowAuthorized(detailItem, () => handleDescriptionChange(id, description))}
          onAddComment={handleAddComment}
          isAuthorized={canEditItem(detailItem)}
          ensureAuthorized={(cb) => ensureRowAuthorized(detailItem, cb)}
        />
      ) : null}
    </main>
  );
}
