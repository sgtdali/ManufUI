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
import { BOLUMLER, BOLUM_SORUMLU } from "@/lib/types";
import {
  loadActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
} from "./actions";
import type { ActionItem } from "./actions";

const PRIORITIES = ["Yüksek", "Orta", "Düşük"] as const;
const STATUSES = ["Açık", "Devam Ediyor", "Tamamlandı"] as const;

const OEE_CELLS = BOLUMLER.filter(
  (b) => b !== "FF Preform Ölçüm" && b !== "Final Ölçüm"
);

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

export default function AksiyonTakipPage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [filterCell, setFilterCell] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [subFormParentId, setSubFormParentId] = useState<string | null>(null);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [formCell, setFormCell] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formAssignee, setFormAssignee] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPriority, setFormPriority] = useState<string>("Orta");

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

  const filteredItems = items.filter((item) => {
    if (filterCell && item.cell !== filterCell) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterPriority && item.priority !== filterPriority) return false;
    return true;
  });

  const tree = buildTree(filteredItems);

  const resetForm = () => {
    setFormCell("");
    setFormTitle("");
    setFormAssignee("");
    setFormDueDate("");
    setFormPriority("Orta");
  };

  const handleCellChange = (cell: string) => {
    setFormCell(cell);
    const sorumlu = BOLUM_SORUMLU[cell];
    if (sorumlu) setFormAssignee(sorumlu);
  };

  const handleCreate = () => {
    if (!formCell || !formTitle.trim() || !formAssignee.trim()) {
      toast.error("Hücre, başlık ve sorumlu alanları zorunludur.");
      return;
    }

    startTransition(async () => {
      const res = await createActionItem({
        parent_id: subFormParentId,
        cell: formCell,
        title: formTitle.trim(),
        assignee: formAssignee.trim(),
        due_date: formDueDate || null,
        priority: formPriority,
      });

      if (res.success) {
        toast.success(
          subFormParentId ? "Alt madde eklendi." : "Aksiyon eklendi."
        );
        resetForm();
        setShowForm(false);
        setSubFormParentId(null);
        fetchData();
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
        fetchData();
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
        fetchData();
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
    setShowForm(true);
    setFormCell(parentCell);
    const sorumlu = BOLUM_SORUMLU[parentCell];
    if (sorumlu) setFormAssignee(sorumlu);
  };

  const openNewForm = () => {
    setSubFormParentId(null);
    resetForm();
    setShowForm(true);
  };

  const totalCount = items.filter((i) => !i.parent_id).length;
  const openCount = items.filter(
    (i) => !i.parent_id && i.status !== "Tamamlandı"
  ).length;
  const completedCount = totalCount - openCount;

  const formContent = (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-zinc-800">
        {subFormParentId ? "Alt Madde Ekle" : "Yeni Aksiyon Ekle"}
      </h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">Hücre *</label>
          <select
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
            value={formCell}
            onChange={(e) => handleCellChange(e.target.value)}
          >
            <option value="">Seçiniz</option>
            {OEE_CELLS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 md:col-span-2 lg:col-span-1">
          <label className="text-xs font-medium text-zinc-600">Başlık *</label>
          <input
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Aksiyon açıklaması"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">
            Sorumlu *
          </label>
          <input
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
            value={formAssignee}
            onChange={(e) => setFormAssignee(e.target.value)}
            placeholder="Sorumlu kişi"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">
            Termin Tarihi
          </label>
          <input
            type="date"
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
            value={formDueDate}
            onChange={(e) => setFormDueDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">Öncelik</label>
          <select
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
            value={formPriority}
            onChange={(e) => setFormPriority(e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
          onClick={handleCreate}
          disabled={isPending}
        >
          <Plus className="size-4" />
          {isPending ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
          onClick={() => {
            setShowForm(false);
            setSubFormParentId(null);
            resetForm();
          }}
        >
          İptal
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
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
            <button
              className="inline-flex items-center gap-2 rounded-md border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
              onClick={openNewForm}
            >
              <Plus className="size-4" />
              Yeni Aksiyon
            </button>
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
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600">
                Hücre
              </label>
              <select
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                value={filterCell}
                onChange={(e) => setFilterCell(e.target.value)}
              >
                <option value="">Tüm hücreler</option>
                {OEE_CELLS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
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

        {/* Metrics */}
        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Toplam" value={totalCount} />
          <MetricCard label="Açık / Devam Ediyor" value={openCount} />
          <MetricCard label="Tamamlandı" value={completedCount} />
        </section>

        {/* Create form */}
        {showForm && !subFormParentId ? formContent : null}

        {/* Table */}
        <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Yükleniyor...
            </div>
          ) : tree.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Gösterilecek aksiyon yok.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <th className="w-8 px-3 py-3"></th>
                  <th className="px-3 py-3">Başlık</th>
                  <th className="px-3 py-3">Hücre</th>
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
                    onDelete={handleDelete}
                    onAddSub={openSubForm}
                    isPending={isPending}
                    subFormParentId={subFormParentId}
                    formContent={formContent}
                  />
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}

function ActionRow({
  item,
  depth,
  expandedRows,
  toggleExpand,
  onStatusChange,
  onDelete,
  onAddSub,
  isPending,
  subFormParentId,
  formContent,
}: {
  item: ActionItem;
  depth: number;
  expandedRows: Set<string>;
  toggleExpand: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onAddSub: (parentId: string, parentCell: string) => void;
  isPending: boolean;
  subFormParentId: string | null;
  formContent: React.ReactNode;
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
              className="text-zinc-400 hover:text-zinc-700"
              onClick={() => toggleExpand(item.id)}
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
        <td className="px-3 py-3">
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
            {item.cell}
          </span>
        </td>
        <td className="px-3 py-3 text-zinc-700">{item.assignee}</td>
        <td className="px-3 py-3">
          <span className={isOverdue ? "font-medium text-rose-600" : "text-zinc-700"}>
            {formatDate(item.due_date)}
            {isOverdue ? " !" : ""}
          </span>
        </td>
        <td className="px-3 py-3">
          <span
            className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${priorityColor(item.priority)}`}
          >
            {item.priority}
          </span>
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
      {/* Sub-item creation form */}
      {subFormParentId === item.id ? (
        <tr>
          <td colSpan={8} className="px-3 py-3">
            {formContent}
          </td>
        </tr>
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
              onDelete={onDelete}
              onAddSub={onAddSub}
              isPending={isPending}
              subFormParentId={subFormParentId}
              formContent={formContent}
            />
          ))
        : null}
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
