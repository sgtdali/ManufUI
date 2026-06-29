"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, CloudOff, RefreshCw, Pencil } from "lucide-react";
import type { ActionItem, Assignee } from "../actions";
import { PRIORITIES, STATUSES, statusColor } from "./helpers";
import { AssigneeAutocomplete } from "./AssigneeAutocomplete";
import { InlineActionCreateRow } from "./InlineActionCreateRow";

function PlannerSyncBadge({ item }: { item: ActionItem }) {
  if (!item.assignee_email) return null;

  if (item.planner_task_id) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200"
        title={`Planner senkron (ID: ${item.planner_task_id})`}
      >
        <RefreshCw className="size-2.5" />
        Planner
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-zinc-50 text-zinc-400 border border-zinc-200"
      title="Planner görevi henüz oluşturulmadı"
    >
      <CloudOff className="size-2.5" />
      Bekliyor
    </span>
  );
}

export function ActionRow({
  item, depth, expandedRows, toggleExpand, assignees,
  onStatusChange, onPriorityChange, onAssigneeChange,
  onDueDateChange, onTitleChange, onDelete, onAddSub, onCreateSub, onCloseSub,
  isPending, subFormParentId, subTitle, onSubTitleChange,
  showCellColumn, isAuthorized, ensureAuthorized, titleWidth,
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
  onTitleChange: (id: string, title: string) => void;
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
  titleWidth: number;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedRows.has(item.id);
  const isOverdue =
    item.due_date &&
    item.status !== "Tamamlandı" &&
    new Date(item.due_date) < new Date(new Date().toISOString().split("T")[0]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(item.title);

  useEffect(() => {
    setTempTitle(item.title);
  }, [item.title]);

  const handleSaveTitle = () => {
    const trimmed = tempTitle.trim();
    if (!trimmed) {
      setTempTitle(item.title);
      setIsEditingTitle(false);
      return;
    }
    if (trimmed !== item.title) {
      onTitleChange(item.id, trimmed);
    }
    setIsEditingTitle(false);
  };

  const authGuard = (e: React.MouseEvent) => {
    if (!isAuthorized) {
      e.stopPropagation();
      e.preventDefault();
      ensureAuthorized(() => {});
    }
  };

  return (
    <>
      <tr className={`hover:bg-zinc-50 ${depth > 0 ? "bg-zinc-25" : ""}`}>
        <td className="px-3 py-3">
          <div className="flex items-center" style={{ marginLeft: depth > 0 ? depth * 12 : 0 }}>
            {hasChildren ? (
              <button className="text-emerald-700 hover:text-emerald-900 mr-1" onClick={() => toggleExpand(item.id)}
                title="Alt maddeleri göster/gizle">
                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            ) : depth > 0 ? (
              <span className="inline-block text-zinc-300 w-5 mr-1 text-center">└</span>
            ) : (
              <span className="inline-block w-5 mr-1" />
            )}
          </div>
        </td>
        <td className="px-3 py-3" style={{ width: titleWidth, minWidth: titleWidth, maxWidth: titleWidth }}>
          <div
            className="flex items-start gap-1.5 group cursor-pointer"
            style={{ paddingLeft: depth > 0 ? depth * 12 : 0 }}
            onClick={() => {
              if (isEditingTitle) return;
              ensureAuthorized(() => {
                setTempTitle(item.title);
                setIsEditingTitle(true);
              });
            }}
          >
            {isEditingTitle ? (
              <input
                type="text"
                className="w-full rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={() => handleSaveTitle()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveTitle();
                  } else if (e.key === "Escape") {
                    setTempTitle(item.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex items-start min-w-0 flex-wrap gap-1.5 whitespace-normal break-words w-full">
                <span
                  className={`font-medium whitespace-normal break-words ${item.status === "Tamamlandı" ? "text-zinc-400 line-through" : "text-zinc-900"}`}
                >
                  {item.title}
                </span>
                <PlannerSyncBadge item={item} />
                <button
                  className="text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-zinc-100 shrink-0 inline-flex items-center justify-center"
                  title="Başlığı Düzenle"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </td>
        {showCellColumn ? (
          <td className="px-3 py-3">
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">{item.cell}</span>
          </td>
        ) : null}
        <td className="px-3 py-3">
          <div onClickCapture={authGuard}>
            <AssigneeAutocomplete
              value={item.assignee} assignees={assignees}
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
          <div onClickCapture={authGuard}>
            <input type="date"
              className={`h-8 w-32 rounded-md border px-2 text-xs outline-none ${
                isOverdue ? "border-rose-300 bg-rose-50 font-medium text-rose-600" : "border-zinc-200 bg-transparent text-zinc-700"
              }`}
              value={item.due_date || ""} onChange={(e) => onDueDateChange(item.id, e.target.value)}
              disabled={isPending || !isAuthorized} />
          </div>
        </td>
        <td className="px-3 py-3">
          <div onClickCapture={authGuard}>
            <select
              className={`h-8 w-24 rounded-md border border-zinc-200 bg-transparent px-2 text-xs text-zinc-700 outline-none disabled:cursor-not-allowed ${
                item.priority === "Yüksek" ? "text-rose-600 font-semibold" :
                item.priority === "Orta" ? "text-amber-600 font-medium" :
                item.priority === "Düşük" ? "text-blue-600 font-medium" : "text-zinc-400"
              }`}
              value={item.priority || ""} onChange={(e) => onPriorityChange(item.id, e.target.value || null)}
              disabled={isPending || !isAuthorized}>
              <option value="">Öncelik</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </td>
        <td className="px-3 py-3">
          <div onClickCapture={authGuard}>
            <select
              className={`rounded-md px-2 py-1 text-xs font-medium outline-none disabled:cursor-not-allowed ${statusColor(item.status)}`}
              value={item.status} onChange={(e) => onStatusChange(item.id, e.target.value)}
              disabled={isPending || !isAuthorized}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-1">
            <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-emerald-700" title="Alt madde ekle"
              onClick={() => onAddSub(item.id, item.cell)}>
              <Plus className="size-4" />
            </button>
            <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600" title="Sil"
              onClick={() => onDelete(item.id)}>
              <Trash2 className="size-4" />
            </button>
          </div>
        </td>
      </tr>
      {subFormParentId === item.id ? (
        <InlineActionCreateRow
          selectedCell={item.cell} title={subTitle} isPending={isPending}
          onTitleChange={onSubTitleChange} onCreate={() => onCreateSub(item.id, item.cell)}
          onEmptyBlur={onCloseSub} depth={depth + 1} placeholder="Alt madde yazın, Enter ile ekleyin"
          showCellColumn={showCellColumn} isAuthorized={isAuthorized} ensureAuthorized={ensureAuthorized}
          titleWidth={titleWidth}
        />
      ) : null}
      {isExpanded && hasChildren
        ? item.children!.map((child) => (
            <ActionRow key={child.id} item={child} depth={depth + 1}
              expandedRows={expandedRows} toggleExpand={toggleExpand} assignees={assignees}
              onStatusChange={onStatusChange} onPriorityChange={onPriorityChange}
              onAssigneeChange={onAssigneeChange} onDueDateChange={onDueDateChange}
              onTitleChange={onTitleChange}
              onDelete={onDelete} onAddSub={onAddSub} onCreateSub={onCreateSub} onCloseSub={onCloseSub}
              isPending={isPending} subFormParentId={subFormParentId} subTitle={subTitle}
              onSubTitleChange={onSubTitleChange} showCellColumn={showCellColumn}
              isAuthorized={isAuthorized} ensureAuthorized={ensureAuthorized}
              titleWidth={titleWidth} />
          ))
        : null}
    </>
  );
}
