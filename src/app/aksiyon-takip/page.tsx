"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Lock,
  LockOpen,
} from "lucide-react";
import { BOLUMLER } from "@/lib/types";
import { isReadOnlyUser } from "@/lib/useAuthRole";
import {
  loadActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  loadAssignees,
} from "./actions";
import type { ActionItem, Assignee } from "./actions";

const PRIORITIES = ["Yüksek", "Orta", "Düşük"] as const;
const STATUSES = ["Açık", "Devam Ediyor", "Tamamlandı"] as const;

const ACTION_CELLS = [...BOLUMLER];

function priorityColor(p: string) {
  if (p === "Yüksek") return "bg-rose-100 text-rose-800";
  if (p === "Düşük") return "bg-zinc-100 text-zinc-600";
  return "bg-amber-100 text-amber-800";
}

function statusColor(s: string) {
  if (s === "Tamamlandı") return "bg-emerald-100 text-emerald-800";
  if (s === "Devam Ediyor") return "bg-blue-100 text-blue-800";
  return "bg-zinc-100 text-zinc-700";
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));
}

function buildTree(items: ActionItem[]): ActionItem[] {
  const map = new Map<string, ActionItem>();
  const roots: ActionItem[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function sortTree(
  nodes: ActionItem[],
  sortField: "assignee" | "due_date" | "priority" | "status" | null,
  sortDirection: "asc" | "desc" | "default"
): ActionItem[] {
  if (sortDirection === "default" || !sortField) return nodes;

  const compare = (a: ActionItem, b: ActionItem) => {
    let valA: any = a[sortField];
    let valB: any = b[sortField];

    if (sortField === "assignee") {
      valA = valA ? valA.trim().toLocaleLowerCase("tr-TR") : "";
      valB = valB ? valB.trim().toLocaleLowerCase("tr-TR") : "";
    } else if (sortField === "due_date") {
      valA = valA ? new Date(valA).getTime() : (sortDirection === "asc" ? Infinity : -Infinity);
      valB = valB ? new Date(valB).getTime() : (sortDirection === "asc" ? Infinity : -Infinity);
    } else if (sortField === "priority") {
      const priorityOrder: Record<string, number> = { "Yüksek": 3, "Orta": 2, "Düşük": 1 };
      valA = priorityOrder[valA || ""] || 0;
      valB = priorityOrder[valB || ""] || 0;
    } else if (sortField === "status") {
      const statusOrder: Record<string, number> = { "Açık": 1, "Devam Ediyor": 2, "Tamamlandı": 3 };
      valA = statusOrder[valA || ""] || 0;
      valB = statusOrder[valB || ""] || 0;
    }

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  };

  const sorted = [...nodes].sort(compare);

  for (const node of sorted) {
    if (node.children && node.children.length > 0) {
      node.children = sortTree(node.children, sortField, sortDirection);
    }
  }

  return sorted;
}

function removeItemBranch(items: ActionItem[], id: string) {
  const idsToRemove = new Set([id]);
  let foundChild = true;

  while (foundChild) {
    foundChild = false;
    for (const item of items) {
      if (item.parent_id && idsToRemove.has(item.parent_id) && !idsToRemove.has(item.id)) {
        idsToRemove.add(item.id);
        foundChild = true;
      }
    }
  }

  return items.filter((item) => !idsToRemove.has(item.id));
}

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
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
      return true;
    }
    return false;
  };

  const ensureAuthorized = (callback: () => void) => {
    if (globalReadOnly) {
      toast.error("Salt okunur erisim — duzenleme yetkiniz yok.");
      return;
    }
    if (isAuthorized) {
      callback();
    } else {
      setPendingAction(() => callback);
      setIsPasswordDialogOpen(true);
    }
  };

  const handleClosePasswordDialog = () => {
    setIsPasswordDialogOpen(false);
    setPendingAction(null);
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
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection("default");
        setSortField(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: "assignee" | "due_date" | "priority" | "status") => {
    if (sortField !== field || sortDirection === "default") {
      return <ArrowUpDown className="size-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="size-3.5 text-emerald-600" />;
    }
    return <ArrowDown className="size-3.5 text-emerald-600" />;
  };

  const fetchData = async () => {
    setLoading(true);
    const [actionItemsRes, assigneesRes] = await Promise.all([
      loadActionItems(),
      loadAssignees(),
    ]);
    if (actionItemsRes.success) {
      setItems(actionItemsRes.data);
    } else {
      toast.error("Veriler yüklenemedi: " + actionItemsRes.error);
    }
    if (assigneesRes.success) {
      setAssignees(assigneesRes.data);
    } else {
      toast.error("Sorumlu listesi yüklenemedi: " + assigneesRes.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const itemsMatchingStatusAndPriority = items.filter((item) => {
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterPriority && item.priority !== filterPriority) return false;
    return true;
  });

  const filteredItems = itemsMatchingStatusAndPriority.filter((item) => {
    if (filterCell && item.cell !== filterCell) return false;
    return true;
  });

  const rawTree = buildTree(filteredItems);
  const tree = sortTree(rawTree, sortField, sortDirection);

  const cellCounts = ACTION_CELLS.reduce<Record<string, number>>((acc, cell) => {
    acc[cell] = itemsMatchingStatusAndPriority.filter(
      (item) => !item.parent_id && item.cell === cell
    ).length;
    return acc;
  }, {});

  const handleInlineCreate = () => {
    const title = inlineTitle.trim();

    if (!filterCell) {
      toast.error("Yeni aksiyon eklemek için soldan bir hücre seçin.");
      return;
    }

    if (!title) return;

    startTransition(async () => {
      const res = await createActionItem({
        parent_id: null,
        cell: filterCell,
        title,
        assignee: "",
        due_date: null,
        priority: null,
      });

      if (res.success) {
        setItems((prev) => [res.data, ...prev]);
        setInlineTitle("");
      } else {
        toast.error("Kayıt hatası: " + res.error);
      }
    });
  };

  const handleSubInlineCreate = (parentId: string, cell: string) => {
    const title = subInlineTitle.trim();
    if (!title) return;

    startTransition(async () => {
      const res = await createActionItem({
        parent_id: parentId,
        cell,
        title,
        assignee: "",
        due_date: null,
        priority: null,
      });

      if (res.success) {
        setItems((prev) => [res.data, ...prev]);
        setSubInlineTitle("");
        setSubFormParentId(null);
      } else {
        toast.error("Kayıt hatası: " + res.error);
      }
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { status });
      if (res.success) {
        toast.success("Durum güncellendi.");
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: status as ActionItem["status"] } : item))
        );
      } else {
        toast.error("Güncelleme hatası: " + res.error);
      }
    });
  };

  const handlePriorityChange = (id: string, priority: string | null) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { priority });
      if (res.success) {
        toast.success("Öncelik güncellendi.");
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, priority } : item))
        );
      } else {
        toast.error("Güncelleme hatası: " + res.error);
      }
    });
  };

  const handleAssigneeChange = (id: string, assignee: string, assignee_email: string | null) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { assignee, assignee_email });
      if (res.success) {
        toast.success("Sorumlu güncellendi.");
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, assignee, assignee_email } : item
          )
        );
      } else {
        toast.error("Güncelleme hatası: " + res.error);
      }
    });
  };

  const handleDueDateChange = (id: string, due_date: string) => {
    startTransition(async () => {
      const res = await updateActionItem(id, {
        due_date: due_date || null,
      });
      if (res.success) {
        toast.success("Termin tarihi güncellendi.");
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, due_date: due_date || null } : item
          )
        );
      } else {
        toast.error("Güncelleme hatası: " + res.error);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bu aksiyonu silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await deleteActionItem(id);
      if (res.success) {
        toast.success("Aksiyon silindi.");
        setItems((prev) => removeItemBranch(prev, id));
      } else {
        toast.error("Silme hatası: " + res.error);
      }
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSubForm = (parentId: string, parentCell: string) => {
    setSubFormParentId(parentId);
    setSubInlineTitle("");
    setExpandedRows((prev) => new Set(prev).add(parentId));
  };

  const totalCount = items.filter((i) => !i.parent_id).length;
  const showCellColumn = !filterCell;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-4 text-zinc-950 md:px-8 flex flex-col gap-4">
      {/* Header - Sayfanın En Tepesinde */}
      <header className="flex flex-col gap-2 border-b border-zinc-200 pb-3 md:flex-row md:items-end md:justify-between w-full">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Aksiyon Takip
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {isAuthorized ? (
            <button
              onClick={handleLock}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-100 transition"
              title="Düzenleme modunu kapat"
            >
              <LockOpen className="size-4" />
              Düzenleme Açık
            </button>
          ) : (
            <button
              onClick={() => ensureAuthorized(() => {})}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-100 transition"
              title="Düzenleme yapmak için tıklayın"
            >
              <Lock className="size-4" />
              Düzenleme Kilitli
            </button>
          )}
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
            href="/"
          >
            <ArrowLeft className="size-4" />
            Forma dön
          </Link>
        </div>
      </header>

      {/* Grid Layout - Sidebar ve İçerik Yan Yana */}
      <div className="grid w-full gap-4 xl:grid-cols-[280px_minmax(0,1fr)] flex-1">
        <CellSidebar
          cells={ACTION_CELLS}
          selectedCell={filterCell}
          counts={cellCounts}
          totalCount={itemsMatchingStatusAndPriority.filter((item) => !item.parent_id).length}
          onSelectCell={setFilterCell}
        />

        <div className="flex min-w-0 flex-col gap-4">
          {/* Filters */}
          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">
                  Durum
                </label>
                <select
                  className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Tümü</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">
                  Öncelik
                </label>
                <select
                  className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <option value="">Tümü</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="self-end rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
                onClick={() => {
                  setFilterCell("");
                  setFilterStatus("");
                  setFilterPriority("");
                }}
              >
                Temizle
              </button>
            </div>
          </section>

        {/* Table */}
        <section className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] rounded-lg border border-zinc-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Yükleniyor...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50">
                <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 select-none">
                  <th className="w-8 px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8]"></th>
                  <th className="px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8]">Başlık</th>
                  {showCellColumn ? (
                    <th className="px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8]">Hücre</th>
                  ) : null}
                  <th
                    className="group cursor-pointer px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8] hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                    onClick={() => handleSort("assignee")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Sorumlu</span>
                      {getSortIcon("assignee")}
                    </div>
                  </th>
                  <th
                    className="group cursor-pointer px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8] hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                    onClick={() => handleSort("due_date")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Termin</span>
                      {getSortIcon("due_date")}
                    </div>
                  </th>
                  <th
                    className="group cursor-pointer px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8] hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                    onClick={() => handleSort("priority")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Öncelik</span>
                      {getSortIcon("priority")}
                    </div>
                  </th>
                  <th
                    className="group cursor-pointer px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8] hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Durum</span>
                      {getSortIcon("status")}
                    </div>
                  </th>
                  <th className="w-24 px-3 py-3 shadow-[inset_0_-2px_0_0_#d4d4d8]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {tree.map((item) => (
                  <ActionRow
                    key={item.id}
                    item={item}
                    depth={0}
                    expandedRows={expandedRows}
                    toggleExpand={toggleExpand}
                    assignees={assignees}
                    onStatusChange={(id, status) => ensureAuthorized(() => handleStatusChange(id, status))}
                    onPriorityChange={(id, priority) => ensureAuthorized(() => handlePriorityChange(id, priority))}
                    onAssigneeChange={(id, assignee, assignee_email) => ensureAuthorized(() => handleAssigneeChange(id, assignee, assignee_email))}
                    onDueDateChange={(id, due_date) => ensureAuthorized(() => handleDueDateChange(id, due_date))}
                    onDelete={(id) => ensureAuthorized(() => handleDelete(id))}
                    onAddSub={(parentId, parentCell) => ensureAuthorized(() => openSubForm(parentId, parentCell))}
                    onCreateSub={(parentId, parentCell) => ensureAuthorized(() => handleSubInlineCreate(parentId, parentCell))}
                    onCloseSub={() => setSubFormParentId(null)}
                    isPending={isPending}
                    subFormParentId={subFormParentId}
                    subTitle={subInlineTitle}
                    onSubTitleChange={setSubInlineTitle}
                    showCellColumn={showCellColumn}
                    isAuthorized={isAuthorized}
                    ensureAuthorized={ensureAuthorized}
                  />
                ))}
                <InlineActionCreateRow
                  selectedCell={filterCell}
                  title={inlineTitle}
                  isPending={isPending}
                  onTitleChange={setInlineTitle}
                  onCreate={() => ensureAuthorized(() => handleInlineCreate())}
                  showCellColumn={showCellColumn}
                  isAuthorized={isAuthorized}
                  ensureAuthorized={ensureAuthorized}
                />
              </tbody>
            </table>
          )}
        </section>
        </div>
      </div>
      <PasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={handleClosePasswordDialog}
        onConfirm={handleConfirmPassword}
      />
    </main>
  );
}

function CellSidebar({
  cells,
  selectedCell,
  counts,
  totalCount,
  onSelectCell,
}: {
  cells: readonly string[];
  selectedCell: string;
  counts: Record<string, number>;
  totalCount: number;
  onSelectCell: (cell: string) => void;
}) {
  return (
    <aside className="xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Hücreler
            </p>
            <h2 className="text-sm font-semibold text-zinc-900">
              Aksiyon listesi
            </h2>
          </div>
          <Filter className="size-4 text-zinc-400" />
        </div>

        <button
          className={`mb-2 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition ${
            selectedCell === ""
              ? "bg-emerald-700 text-white"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
          onClick={() => onSelectCell("")}
        >
          <span>Tüm hücreler</span>
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              selectedCell === ""
                ? "bg-white/20 text-white"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {totalCount}
          </span>
        </button>

        <div className="max-h-[calc(100vh-140px)] space-y-1 overflow-y-auto pr-1">
          {cells.map((cell) => {
            const isSelected = selectedCell === cell;
            return (
              <button
                key={cell}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-200"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
                onClick={() => onSelectCell(cell)}
              >
                <span className="truncate">{cell}</span>
                <span
                  className={`ml-2 rounded px-2 py-0.5 text-xs ${
                    isSelected
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {counts[cell] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function InlineActionCreateRow({
  selectedCell,
  title,
  isPending,
  onTitleChange,
  onCreate,
  onEmptyBlur,
  depth = 0,
  placeholder,
  showCellColumn,
  isAuthorized,
  ensureAuthorized,
}: {
  selectedCell: string;
  title: string;
  isPending: boolean;
  onTitleChange: (title: string) => void;
  onCreate: () => void;
  onEmptyBlur?: () => void;
  depth?: number;
  placeholder?: string;
  showCellColumn: boolean;
  isAuthorized: boolean;
  ensureAuthorized: (cb: () => void) => void;
}) {
  const disabled = !selectedCell || isPending;

  return (
    <tr className="border-t border-dashed border-zinc-200 bg-zinc-50/60">
      <td className="px-3 py-3 text-zinc-300">
        {depth > 0 ? (
          <span style={{ marginLeft: depth * 12 }}>└</span>
        ) : (
          "+"
        )}
      </td>
      <td className="px-3 py-3">
        <div
          onClickCapture={(e) => {
            if (!isAuthorized) {
              e.stopPropagation();
              e.preventDefault();
              ensureAuthorized(() => {});
            }
          }}
        >
          <input
            className="h-8 w-full rounded-md border border-transparent bg-white px-2 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => {
              if (!title.trim() && onEmptyBlur) {
                onEmptyBlur();
                return;
              }
              onCreate();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCreate();
              }
            }}
            placeholder={
              selectedCell
                ? placeholder ?? "Yeni aksiyon yazın, Enter ile ekleyin"
                : "Yeni aksiyon için soldan hücre seçin"
            }
            style={{ paddingLeft: depth > 0 ? depth * 12 : undefined }}
            disabled={disabled || !isAuthorized}
          />
        </div>
      </td>
      {showCellColumn ? (
        <td className="px-3 py-3">
          {selectedCell ? (
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
              {selectedCell}
            </span>
          ) : (
            <span className="text-xs text-zinc-400">-</span>
          )}
        </td>
      ) : null}
      <td className="px-3 py-3 text-zinc-400">-</td>
      <td className="px-3 py-3 text-zinc-400">-</td>
      <td className="px-3 py-3 text-zinc-400">-</td>
      <td className="px-3 py-3">
        <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${statusColor("Açık")}`}>
          Açık
        </span>
      </td>
      <td className="px-3 py-3 text-xs text-zinc-400">Enter</td>
    </tr>
  );
}

function AssigneeAutocomplete({
  value,
  assignees,
  onChange,
  disabled,
}: {
  value: string;
  assignees: Assignee[];
  onChange: (name: string, email: string | null) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const filtered = assignees.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (assignee: Assignee) => {
    setSearch(assignee.name);
    onChange(assignee.name, assignee.email);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      const match = assignees.find(
        (a) => a.name.toLowerCase() === search.trim().toLowerCase()
      );
      if (match) {
        onChange(match.name, match.email);
      } else {
        onChange(search.trim(), null);
      }
    }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        handleSelect(filtered[highlightedIndex]);
      } else {
        e.currentTarget.blur();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="relative w-36">
      <input
        className="h-8 w-full rounded-md border border-zinc-200 bg-transparent px-2 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-75"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Sorumlu"
        disabled={disabled}
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 z-50 mt-1 max-h-60 w-64 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
          {filtered.map((assignee, idx) => (
            <div
              key={assignee.id}
              className={`cursor-pointer rounded px-2 py-1.5 text-left text-xs ${
                idx === highlightedIndex
                  ? "bg-emerald-50 text-emerald-900 font-medium"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
              onMouseDown={() => handleSelect(assignee)}
            >
              <div className="font-semibold">{assignee.name}</div>
              <div className="text-[10px] text-zinc-400 flex justify-between gap-2 mt-0.5">
                <span>{assignee.email}</span>
                {assignee.title && <span className="italic">{assignee.title}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  item,
  depth,
  expandedRows,
  toggleExpand,
  assignees,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDueDateChange,
  onDelete,
  onAddSub,
  onCreateSub,
  onCloseSub,
  isPending,
  subFormParentId,
  subTitle,
  onSubTitleChange,
  showCellColumn,
  isAuthorized,
  ensureAuthorized,
}: {
  item: ActionItem;
  depth: number;
  expandedRows: Set<string>;
  toggleExpand: (id: string) => void;
  assignees: Assignee[];
  onStatusChange: (id: string, status: string) => void;
  onPriorityChange: (id: string, priority: string | null) => void;
  onAssigneeChange: (id: string, assignee: string, assignee_email: string | null) => void;
  onDueDateChange: (id: string, due_date: string) => void;
  onDelete: (id: string) => void;
  onAddSub: (parentId: string, parentCell: string) => void;
  onCreateSub: (parentId: string, parentCell: string) => void;
  onCloseSub: () => void;
  isPending: boolean;
  subFormParentId: string | null;
  subTitle: string;
  onSubTitleChange: (title: string) => void;
  showCellColumn: boolean;
  isAuthorized: boolean;
  ensureAuthorized: (cb: () => void) => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedRows.has(item.id);
  const isOverdue =
    item.due_date &&
    item.status !== "Tamamlandı" &&
    new Date(item.due_date) < new Date(new Date().toISOString().split("T")[0]);

  return (
    <>
      <tr className={`hover:bg-zinc-50 ${depth > 0 ? "bg-zinc-25" : ""}`}>
        <td className="px-3 py-3">
          <div className="flex items-center" style={{ marginLeft: depth > 0 ? depth * 12 : 0 }}>
            {hasChildren ? (
              <button
                className="text-emerald-700 hover:text-emerald-900 mr-1"
                onClick={() => toggleExpand(item.id)}
                title={hasChildren ? "Alt maddeleri göster/gizle" : "Alt madde yok"}
              >
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            ) : depth > 0 ? (
              <span className="inline-block text-zinc-300 w-5 mr-1 text-center">
                └
              </span>
            ) : (
              <span className="inline-block w-5 mr-1" />
            )}
          </div>
        </td>
        <td className="px-3 py-3">
          <span
            className={`font-medium ${item.status === "Tamamlandı" ? "text-zinc-400 line-through" : "text-zinc-900"}`}
            style={{ paddingLeft: depth > 0 ? depth * 12 : 0 }}
          >
            {item.title}
          </span>
        </td>
        {showCellColumn ? (
          <td className="px-3 py-3">
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
              {item.cell}
            </span>
          </td>
        ) : null}
        <td className="px-3 py-3">
          <div
            onClickCapture={(e) => {
              if (!isAuthorized) {
                e.stopPropagation();
                e.preventDefault();
                ensureAuthorized(() => {});
              }
            }}
          >
            <AssigneeAutocomplete
              value={item.assignee}
              assignees={assignees}
              onChange={(name, email) => {
                if (name !== item.assignee || email !== item.assignee_email) {
                  onAssigneeChange(item.id, name, email);
                }
              }}
              disabled={isPending || !isAuthorized}
            />
          </div>
        </td>
        <td className="px-3 py-3">
          <div
            onClickCapture={(e) => {
              if (!isAuthorized) {
                e.stopPropagation();
                e.preventDefault();
                ensureAuthorized(() => {});
              }
            }}
          >
            <input
              type="date"
              className={`h-8 w-32 rounded-md border px-2 text-xs outline-none ${
                isOverdue
                  ? "border-rose-300 bg-rose-50 font-medium text-rose-600"
                  : "border-zinc-200 bg-transparent text-zinc-700"
              }`}
              value={item.due_date || ""}
              onChange={(e) => onDueDateChange(item.id, e.target.value)}
              disabled={isPending || !isAuthorized}
            />
          </div>
        </td>
        <td className="px-3 py-3">
          <div
            onClickCapture={(e) => {
              if (!isAuthorized) {
                e.stopPropagation();
                e.preventDefault();
                ensureAuthorized(() => {});
              }
            }}
          >
            <select
              className={`h-8 w-24 rounded-md border border-zinc-200 bg-transparent px-2 text-xs text-zinc-700 outline-none disabled:cursor-not-allowed ${
                item.priority === "Yüksek"
                  ? "text-rose-600 font-semibold"
                  : item.priority === "Orta"
                    ? "text-amber-600 font-medium"
                    : item.priority === "Düşük"
                      ? "text-blue-600 font-medium"
                      : "text-zinc-400"
              }`}
              value={item.priority || ""}
              onChange={(e) => onPriorityChange(item.id, e.target.value || null)}
              disabled={isPending || !isAuthorized}
            >
              <option value="">Öncelik</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </td>
        <td className="px-3 py-3">
          <div
            onClickCapture={(e) => {
              if (!isAuthorized) {
                e.stopPropagation();
                e.preventDefault();
                ensureAuthorized(() => {});
              }
            }}
          >
            <select
              className={`rounded-md px-2 py-1 text-xs font-medium outline-none disabled:cursor-not-allowed ${statusColor(item.status)}`}
              value={item.status}
              onChange={(e) => onStatusChange(item.id, e.target.value)}
              disabled={isPending || !isAuthorized}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-1">
            <button
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-emerald-700"
              title="Alt madde ekle"
              onClick={() => onAddSub(item.id, item.cell)}
            >
              <Plus className="size-4" />
            </button>
            <button
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600"
              title="Sil"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </td>
      </tr>
      {/* Sub-item creation row */}
      {subFormParentId === item.id ? (
        <InlineActionCreateRow
          selectedCell={item.cell}
          title={subTitle}
          isPending={isPending}
          onTitleChange={onSubTitleChange}
          onCreate={() => onCreateSub(item.id, item.cell)}
          onEmptyBlur={onCloseSub}
          depth={depth + 1}
          placeholder="Alt madde yazın, Enter ile ekleyin"
          showCellColumn={showCellColumn}
          isAuthorized={isAuthorized}
          ensureAuthorized={ensureAuthorized}
        />
      ) : null}
      {/* Children rows */}
      {isExpanded && hasChildren
        ? item.children!.map((child) => (
            <ActionRow
              key={child.id}
              item={child}
              depth={depth + 1}
              expandedRows={expandedRows}
              toggleExpand={toggleExpand}
              assignees={assignees}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              onAssigneeChange={onAssigneeChange}
              onDueDateChange={onDueDateChange}
              onDelete={onDelete}
              onAddSub={onAddSub}
              onCreateSub={onCreateSub}
              onCloseSub={onCloseSub}
              isPending={isPending}
              subFormParentId={subFormParentId}
              subTitle={subTitle}
              onSubTitleChange={onSubTitleChange}
              showCellColumn={showCellColumn}
              isAuthorized={isAuthorized}
              ensureAuthorized={ensureAuthorized}
            />
          ))
        : null}
    </>
  );
}

function PasswordDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => boolean;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onConfirm(password);
    if (success) {
      setPassword("");
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-zinc-900">Düzenleme Şifresi</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Değişiklik yapmak için lütfen şifreyi giriniz.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="password"
            autoFocus
            className={`h-9 w-full rounded-md border px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 ${
              error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : "border-zinc-300"
            }`}
            placeholder="Şifre"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
          />

          {error && (
            <p className="text-xs font-medium text-rose-600">
              Hatalı şifre girdiniz. Lütfen tekrar deneyin.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              onClick={() => {
                setError(false);
                setPassword("");
                onClose();
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Onayla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

