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
  ClipboardList,
} from "lucide-react";
import { BOLUMLER } from "@/lib/types";
import {
  loadActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
} from "./actions";
import type { ActionItem } from "./actions";

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
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [filterCell, setFilterCell] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const [subFormParentId, setSubFormParentId] = useState<string | null>(null);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [inlineTitle, setInlineTitle] = useState("");
  const [subInlineTitle, setSubInlineTitle] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const res = await loadActionItems();
    if (res.success) {
      setItems(res.data);
    } else {
      toast.error("Veriler yüklenemedi: " + res.error);
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

  const tree = buildTree(filteredItems);

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

  const handleAssigneeChange = (id: string, assignee: string) => {
    startTransition(async () => {
      const res = await updateActionItem(id, { assignee });
      if (res.success) {
        toast.success("Sorumlu güncellendi.");
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, assignee } : item))
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
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="grid w-full gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <CellSidebar
          cells={ACTION_CELLS}
          selectedCell={filterCell}
          counts={cellCounts}
          totalCount={itemsMatchingStatusAndPriority.filter((item) => !item.parent_id).length}
          onSelectCell={setFilterCell}
        />

        <div className="flex min-w-0 flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              <ClipboardList className="mr-1 inline size-4" />
              {totalCount} aksiyon
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Aksiyon Takip
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
              href="/"
            >
              <ArrowLeft className="size-4" />
              Forma dön
            </Link>
          </div>
        </header>

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
        <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Yükleniyor...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <th className="w-8 px-3 py-3"></th>
                  <th className="px-3 py-3">Başlık</th>
                  {showCellColumn ? (
                    <th className="px-3 py-3">Hücre</th>
                  ) : null}
                  <th className="px-3 py-3">Sorumlu</th>
                  <th className="px-3 py-3">Termin</th>
                  <th className="px-3 py-3">Öncelik</th>
                  <th className="px-3 py-3">Durum</th>
                  <th className="w-24 px-3 py-3"></th>
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
                    onStatusChange={handleStatusChange}
                    onPriorityChange={handlePriorityChange}
                    onAssigneeChange={handleAssigneeChange}
                    onDueDateChange={handleDueDateChange}
                    onDelete={handleDelete}
                    onAddSub={openSubForm}
                    onCreateSub={handleSubInlineCreate}
                    onCloseSub={() => setSubFormParentId(null)}
                    isPending={isPending}
                    subFormParentId={subFormParentId}
                    subTitle={subInlineTitle}
                    onSubTitleChange={setSubInlineTitle}
                    showCellColumn={showCellColumn}
                  />
                ))}
                <InlineActionCreateRow
                  selectedCell={filterCell}
                  title={inlineTitle}
                  isPending={isPending}
                  onTitleChange={setInlineTitle}
                  onCreate={handleInlineCreate}
                  showCellColumn={showCellColumn}
                />
              </tbody>
            </table>
          )}
        </section>
        </div>
      </div>
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
    <aside className="xl:sticky xl:top-6 xl:self-start">
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

        <div className="max-h-[calc(100vh-170px)] space-y-1 overflow-y-auto pr-1">
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
        <input
          className="h-8 w-full rounded-md border border-transparent bg-white px-2 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 disabled:bg-zinc-100 disabled:text-zinc-400"
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
          disabled={disabled}
        />
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

function ActionRow({
  item,
  depth,
  expandedRows,
  toggleExpand,
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
}: {
  item: ActionItem;
  depth: number;
  expandedRows: Set<string>;
  toggleExpand: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onPriorityChange: (id: string, priority: string | null) => void;
  onAssigneeChange: (id: string, assignee: string) => void;
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
          {depth === 0 ? (
            <button
              className={
                hasChildren
                  ? "text-emerald-700 hover:text-emerald-900"
                  : "text-zinc-300 hover:text-zinc-500"
              }
              onClick={() => toggleExpand(item.id)}
              title={hasChildren ? "Alt maddeleri göster/gizle" : "Alt madde yok"}
            >
              {isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          ) : (
            <span
              className="inline-block text-zinc-300"
              style={{ marginLeft: depth * 12 }}
            >
              └
            </span>
          )}
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
          <input
            className="h-8 w-36 rounded-md border border-zinc-200 bg-transparent px-2 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
            defaultValue={item.assignee}
            onBlur={(e) => {
              if (e.target.value !== item.assignee) {
                onAssigneeChange(item.id, e.target.value.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            placeholder="Sorumlu"
            disabled={isPending}
          />
        </td>
        <td className="px-3 py-3">
          <input
            type="date"
            className={`h-8 w-32 rounded-md border px-2 text-xs outline-none ${
              isOverdue
                ? "border-rose-300 bg-rose-50 font-medium text-rose-600"
                : "border-zinc-200 bg-transparent text-zinc-700"
            } focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20`}
            value={item.due_date ?? ""}
            onChange={(e) => onDueDateChange(item.id, e.target.value)}
            disabled={isPending}
          />
        </td>
        <td className="px-3 py-3">
          <select
            className={`rounded-md px-2 py-1 text-xs font-medium outline-none ${item.priority ? priorityColor(item.priority) : "bg-zinc-100 text-zinc-500"}`}
            value={item.priority ?? ""}
            onChange={(e) => onPriorityChange(item.id, e.target.value || null)}
            disabled={isPending}
          >
            <option value="">Seçiniz</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-3">
          <select
            className={`rounded-md px-2 py-1 text-xs font-medium outline-none ${statusColor(item.status)}`}
            value={item.status}
            onChange={(e) => onStatusChange(item.id, e.target.value)}
            disabled={isPending}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-1">
            {depth === 0 ? (
              <button
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-emerald-700"
                title="Alt madde ekle"
                onClick={() => onAddSub(item.id, item.cell)}
              >
                <Plus className="size-4" />
              </button>
            ) : null}
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
            />
          ))
        : null}
    </>
  );
}

