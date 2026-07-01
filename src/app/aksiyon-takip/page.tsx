"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown, Lock, LockOpen, Search, Download } from "lucide-react";
import { BOLUMLER } from "@/lib/types";
import { isReadOnlyUser } from "@/lib/useAuthRole";
import { createClient } from "@/lib/supabase/client";
import { AssigneeAuthControl } from "./_components/AssigneeAuthControl";
import { Select } from "./_components/Select";
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

const ACTION_CELLS = BOLUMLER.filter(c => c !== "N602 Hücresi" && c !== "N603 Hücresi").reduce<string[]>((acc, c) => {
  if (c === "Flowform Hücresi") {
    return [...acc, c, "N602-N603 Hücresi"];
  }
  return [...acc, c];
}, []);

const ADMIN_EMAILS = ["tayfun.vural@repkon.com.tr", "baris.sahinoglu@repkon.com.tr", "ahmet.akin@repkon.com.tr"];
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
      return <ArrowUpDown className="size-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />;
    if (sortDirection === "asc") return <ArrowUp className="size-3.5 text-emerald-400" />;
    return <ArrowDown className="size-3.5 text-emerald-400" />;
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
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Lora:ital,wght@0,400..700;1,400..700&display=swap');
        
        .claude-theme {
          background-color: #F8F8F6 !important;
          color: #191919 !important;
          font-family: "Anthropic Serif", "Newsreader", "Lora", Georgia, serif !important;
        }
        
        /* Font size overrides (+2px) */
        .claude-theme .text-3xl {
          font-size: 32px !important;
        }
        .claude-theme .text-2xl {
          font-size: 26px !important;
        }
        .claude-theme .text-xl {
          font-size: 22px !important;
        }
        .claude-theme .text-lg {
          font-size: 20px !important;
        }
        .claude-theme .text-base {
          font-size: 18px !important;
        }
        .claude-theme .text-sm {
          font-size: 16px !important;
        }
        .claude-theme .text-xs {
          font-size: 14px !important;
        }
        .claude-theme [class*="text-[11px]"] {
          font-size: 13px !important;
        }
        .claude-theme [class*="text-[10px]"] {
          font-size: 12px !important;
        }
        .claude-theme [class*="text-[9px]"] {
          font-size: 11px !important;
        }
        
        .claude-theme,
        .claude-theme main,
        .claude-theme .bg-zinc-900 {
          background-color: #F8F8F6 !important;
        }
        
        .claude-theme .bg-zinc-800\\/60,
        .claude-theme .bg-zinc-800\\/50,
        .claude-theme aside > div,
        .claude-theme section.bg-zinc-800\\/60,
        .claude-theme select,
        .claude-theme .bg-zinc-700\\/60,
        .claude-theme .bg-zinc-700 {
          background-color: #EFEEEB !important;
        }
        
        .claude-theme table,
        .claude-theme tbody,
        .claude-theme tr,
        .claude-theme td,
        .claude-theme .bg-zinc-800,
        .claude-theme .bg-zinc-800\\/30,
        .claude-theme .bg-zinc-900\\/50,
        .claude-theme .bg-zinc-900\\/40,
        .claude-theme .bg-zinc-900\\/20,
        .claude-theme input,
        .claude-theme textarea {
          background-color: #FFFFFF !important;
        }
        
        .claude-theme thead,
        .claude-theme thead tr,
        .claude-theme thead th,
        .claude-theme th.bg-zinc-800 {
          background-color: #EFEEEB !important;
          color: #191919 !important;
        }
        
        .claude-theme * {
          border-color: #E2E1DC !important;
        }
        
        .claude-theme .divide-zinc-700 > :not([hidden]) ~ :not([hidden]) {
          border-color: #E2E1DC !important;
        }
        
        .claude-theme .text-zinc-100,
        .claude-theme .text-zinc-200,
        .claude-theme .text-zinc-300,
        .claude-theme .text-white,
        .claude-theme h1,
        .claude-theme h2,
        .claude-theme h3,
        .claude-theme h4,
        .claude-theme h5 {
          color: #191919 !important;
        }
        
        .claude-theme .text-zinc-400,
        .claude-theme .text-zinc-500,
        .claude-theme .text-zinc-600,
        .claude-theme p.text-zinc-400,
        .claude-theme span.text-zinc-500 {
          color: #6B6964 !important;
        }
        
        .claude-theme input,
        .claude-theme select,
        .claude-theme textarea {
          background-color: #FFFFFF !important;
          color: #191919 !important;
          border: 1px solid #D1D0C9 !important;
        }
        
        .claude-theme input::placeholder {
          color: #9C9A94 !important;
        }
        
        .claude-theme input:focus,
        .claude-theme select:focus,
        .claude-theme textarea:focus {
          border-color: #D97753 !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(217, 119, 83, 0.2) !important;
        }
        
        .claude-theme .bg-emerald-600 {
          background-color: #D97753 !important;
          color: #FFFFFF !important;
        }
        .claude-theme .bg-emerald-600:hover {
          background-color: #C06543 !important;
        }
        
        .claude-theme .text-emerald-400,
        .claude-theme .text-emerald-300 {
          color: #C25E3B !important;
        }
        .claude-theme .bg-emerald-500\\/10 {
          background-color: rgba(217, 119, 83, 0.12) !important;
        }
        .claude-theme .ring-emerald-500\\/20 {
          --tw-ring-color: rgba(217, 119, 83, 0.25) !important;
        }
        
        .claude-theme .text-blue-400 {
          color: #1d4ed8 !important;
        }
        .claude-theme .bg-blue-500\\/10 {
          background-color: #dbeafe !important;
        }
        .claude-theme .ring-blue-500\\/20 {
          --tw-ring-color: #bfdbfe !important;
        }
        
        .claude-theme .bg-zinc-650 {
          background-color: #EFEEEB !important;
        }
        .claude-theme .text-zinc-200,
        .claude-theme .text-zinc-300 {
          color: #191919 !important;
        }
        .claude-theme .bg-zinc-600\\/40 {
          background-color: #f1f0ea !important;
        }
        .claude-theme .ring-zinc-500\\/40 {
          --tw-ring-color: #e5e5e0 !important;
        }
        
        .claude-theme .text-rose-400 {
          color: #b91c1c !important;
        }
        .claude-theme .text-amber-400 {
          color: #b45309 !important;
        }
        
        .claude-theme .border-rose-500\\/40 {
          border-color: #FCA5A5 !important;
        }
        .claude-theme .bg-rose-500\\/10 {
          background-color: #FEF2F2 !important;
        }
        .claude-theme .text-rose-400 {
          color: #DC2626 !important;
        }
        
        .claude-theme .bg-rose-500\\/15:hover {
          background-color: #FEE2E2 !important;
        }
        
        .claude-theme .bg-zinc-800 {
          background-color: #FFFFFF !important;
          border-color: #E2E1DC !important;
        }
        
        .claude-theme .bg-zinc-800\\/50 {
          background-color: #EFEEEB !important;
        }
        
        .claude-theme tr:hover,
        .claude-theme .hover\\:bg-zinc-700\\/40:hover,
        .claude-theme .hover\\:bg-zinc-700:hover {
          background-color: rgba(239, 238, 235, 0.7) !important;
          color: #191919 !important;
        }
        
        .claude-theme *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .claude-theme *::-webkit-scrollbar-track {
          background: #F8F8F6;
        }
        .claude-theme *::-webkit-scrollbar-thumb {
          background-color: #D0CFC9;
          border-radius: 4px;
        }
        .claude-theme *::-webkit-scrollbar-thumb:hover {
          background-color: #B2B1AA;
        }
      ` }} />
      <main className="min-h-screen bg-zinc-900 px-4 py-4 text-zinc-100 md:px-8 flex flex-col gap-4 claude-theme">
      <header className="flex flex-col gap-2 border-b border-zinc-700 pb-4 md:flex-row md:items-end md:justify-between w-full">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Repkon HF901</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Aksiyon Takip</h1>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <AssigneeAuthControl userEmail={userEmail} onSignedOut={() => setUserEmail(null)} />
          {isFullyAuthorized ? (
            <button onClick={isAdminEmail(userEmail) ? undefined : handleLock}
              disabled={isAdminEmail(userEmail)}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/15 transition disabled:cursor-default disabled:hover:bg-rose-500/10"
              title={isAdminEmail(userEmail) ? "Yönetici e-postası ile tam yetkili giriş" : "Düzenleme modunu kapat"}>
              <LockOpen className="size-4" /> Düzenleme Açık
            </button>
          ) : (
            <button onClick={() => ensureAuthorized(() => {})}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition" title="Düzenleme yapmak için tıklayın">
              <Lock className="size-4" /> Düzenleme Kilitli
            </button>
          )}
          <Link className="inline-flex items-center gap-2 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition" href="/">
            <ArrowLeft className="size-4" /> Forma dön
          </Link>
        </div>
      </header>

      <div className="grid w-full gap-4 xl:grid-cols-[280px_minmax(0,1fr)] flex-1">
        <CellSidebar cells={ACTION_CELLS} selectedCell={filterCell} counts={cellCounts}
          totalCount={itemsMatchingStatusAndPriority.filter((item) => !item.parent_id).length} onSelectCell={setFilterCell} />

        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Ara</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input type="text"
                    className="h-9 w-full rounded-md border border-zinc-600 bg-zinc-700/60 pl-8 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15"
                    placeholder="Başlık veya açıklamada ara..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Durum</label>
                <Select
                  value={filterStatus} onChange={setFilterStatus} placeholder="Tümü"
                  options={[{ value: "", label: "Tümü" }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Öncelik</label>
                <Select
                  value={filterPriority} onChange={setFilterPriority} placeholder="Tümü"
                  options={[{ value: "", label: "Tümü" }, ...PRIORITIES.map((p) => ({ value: p, label: p }))]} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Sorumlu</label>
                <Select
                  value={filterAssignee} onChange={setFilterAssignee} placeholder="Tümü"
                  options={[{ value: "", label: "Tümü" }, ...assigneeOptions.map((a) => ({ value: a, label: a }))]} />
              </div>
              <button className="self-end rounded-md border border-zinc-600 bg-zinc-700/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
                onClick={() => { setFilterCell(""); setFilterStatus(""); setFilterPriority(""); setFilterAssignee(""); setSearchQuery(""); }}>
                Temizle
              </button>
              <button className="inline-flex items-center gap-1.5 self-end rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
                onClick={handleExportExcel} title="Excel olarak dışa aktar">
                <Download className="size-4" /> Dışa Aktar
              </button>
            </div>
          </section>

          <section className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] rounded-xl border border-zinc-700 bg-zinc-800/60 shadow-sm [scrollbar-color:theme(colors.zinc.600)_theme(colors.zinc.900)] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-zinc-900 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb:hover]:bg-zinc-500">
            {loading ? (
              <div className="p-8 text-center text-sm font-medium text-zinc-400">Yükleniyor...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-800">
                  <tr className="border-b border-zinc-700 bg-zinc-800 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 select-none">
                    <th className="w-8 px-3 py-3"></th>
                    <th
                      className="relative px-3 py-3 group/resize select-none"
                      style={{ width: titleWidth, minWidth: titleWidth, maxWidth: titleWidth }}
                    >
                      <span>Başlık</span>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-emerald-500 active:bg-emerald-600 transition-colors"
                        onMouseDown={handleResizeMouseDown}
                        title="Sütun genişliğini ayarlamak için sürükleyin"
                      />
                    </th>
                    {showCellColumn ? <th className="px-3 py-3">Hücre</th> : null}
                    <th className="group cursor-pointer px-3 py-3 hover:text-zinc-100 transition-colors"
                      onClick={() => handleSort("assignee")}>
                      <div className="flex items-center gap-1"><span>Sorumlu</span>{getSortIcon("assignee")}</div>
                    </th>
                    <th className="px-3 py-3">Başlangıç</th>
                    {(["due_date", "priority", "status"] as const).map((field) => (
                      <th key={field} className="group cursor-pointer px-3 py-3 hover:text-zinc-100 transition-colors"
                        onClick={() => handleSort(field)}>
                        <div className="flex items-center gap-1">
                          <span>{field === "due_date" ? "Termin" : field === "priority" ? "Öncelik" : "Durum"}</span>
                          {getSortIcon(field)}
                        </div>
                      </th>
                    ))}
                    <th className="w-24 px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
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
    </>
  );
}
