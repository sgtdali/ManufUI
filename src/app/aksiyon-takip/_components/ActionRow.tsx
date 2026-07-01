"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, CloudOff, RefreshCw, MessageSquare } from "lucide-react";
import type { ActionItem, Assignee } from "../actions";
import { PRIORITIES, STATUSES, statusColor } from "./helpers";
import { AssigneeAutocomplete } from "./AssigneeAutocomplete";
import { InlineActionCreateRow } from "./InlineActionCreateRow";
import { Select } from "./Select";

function PlannerSyncBadge({ item }: { item: ActionItem }) {
  if (!item.assignee_email) return null;

  if (item.planner_task_id) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20"
        title={`Planner senkron (ID: ${item.planner_task_id})`}
      >
        <RefreshCw className="size-2.5" />
        Planner
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-zinc-700 text-zinc-400 ring-1 ring-inset ring-zinc-600"
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
  onStartDateChange, onDueDateChange, onTitleChange, onDelete, onAddSub, onCreateSub, onCloseSub,
  isPending, subFormParentId, subTitle, onSubTitleChange,
  showCellColumn, isAuthorized, ensureAuthorized, titleWidth, onOpenDetail,
  canEditItem, ensureRowAuthorized,
}: {
  item: ActionItem;
  depth: number;
  expandedRows: Set<string>;
  toggleExpand: (id: string) => void;
  assignees: Assignee[];
  onStatusChange: (id: string, status: string) => void;
  onPriorityChange: (id: string, priority: string | null) => void;
  onAssigneeChange: (id: string, assignee: string, assignee_email: string | null) => void;
  onStartDateChange: (id: string, start_date: string) => void;
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
  onOpenDetail: (item: ActionItem) => void;
  canEditItem: (item: ActionItem) => boolean;
  ensureRowAuthorized: (item: ActionItem, cb: () => void) => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const rowEditable = canEditItem(item);
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

  const rowGuard = (e: React.MouseEvent) => {
    if (!rowEditable) {
      e.stopPropagation();
      e.preventDefault();
      ensureRowAuthorized(item, () => {});
    }
  };

  return (
    <>
      <tr className={`hover:bg-zinc-700/40 transition-colors ${depth > 0 ? "bg-zinc-800/30" : ""}`}>
        <td className="px-3 py-3">
          <div className="flex items-center" style={{ marginLeft: depth > 0 ? depth * 12 : 0 }}>
            {hasChildren ? (
              <button className="text-emerald-400 hover:text-emerald-300 mr-1" onClick={() => toggleExpand(item.id)}
                title="Alt maddeleri göster/gizle">
                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            ) : depth > 0 ? (
              <span className="inline-block text-zinc-600 w-5 mr-1 text-center">└</span>
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
              ensureRowAuthorized(item, () => {
                setTempTitle(item.title);
                setIsEditingTitle(true);
              });
            }}
          >
            {isEditingTitle ? (
              <input
                type="text"
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-0.5 text-xs text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                  className={`font-medium whitespace-normal break-words ${item.status === "Tamamlandı" ? "text-zinc-500 line-through" : "text-zinc-100"}`}
                >
                  {item.title}
                </span>
                <PlannerSyncBadge item={item} />
              </div>
            )}
          </div>
        </td>
        {showCellColumn ? (
          <td className="px-3 py-3">
            <span className="rounded-md bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-200">{item.cell}</span>
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
          <div onClickCapture={rowGuard}>
            <input type="date"
              className="h-8 w-32 rounded-md border border-zinc-600 bg-zinc-700/60 px-2 text-xs text-zinc-200 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark]"
              value={item.start_date || ""} onChange={(e) => onStartDateChange(item.id, e.target.value)}
              disabled={isPending || !rowEditable} />
          </div>
        </td>
        <td className="px-3 py-3">
          <div onClickCapture={rowGuard}>
            <input type="date"
              className={`h-8 w-32 rounded-md border px-2 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark] ${
                isOverdue ? "border-rose-500/40 bg-rose-500/10 font-medium text-rose-400" : "border-zinc-600 bg-zinc-700/60 text-zinc-200 focus:border-emerald-500"
              }`}
              value={item.due_date || ""} onChange={(e) => onDueDateChange(item.id, e.target.value)}
              disabled={isPending || !rowEditable} />
          </div>
        </td>
        <td className="px-3 py-3">
          <div onClickCapture={rowGuard}>
            <Select
              value={item.priority || ""} onChange={(v) => onPriorityChange(item.id, v || null)}
              disabled={isPending || !rowEditable} placeholder="Öncelik"
              options={[{ value: "", label: "Öncelik" }, ...PRIORITIES.map((p) => ({ value: p, label: p }))]}
              triggerClassName={`h-8 w-24 inline-flex items-center justify-between gap-1 rounded-md border border-zinc-600 bg-zinc-700/40 px-2 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                item.priority === "Yüksek" ? "text-rose-400 font-semibold" :
                item.priority === "Orta" ? "text-amber-400 font-medium" :
                item.priority === "Düşük" ? "text-blue-400 font-medium" : "text-zinc-400 font-medium"
              }`}
            />
          </div>
        </td>
        <td className="px-3 py-3">
          <div onClickCapture={rowGuard}>
            <Select
              value={item.status} onChange={(v) => onStatusChange(item.id, v)}
              disabled={isPending || !rowEditable}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
              triggerClassName={`inline-flex items-center justify-between gap-1 rounded-md px-2 py-1 text-xs font-medium outline-none disabled:cursor-not-allowed disabled:opacity-60 ${statusColor(item.status)}`}
            />
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-1">
            <button className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-emerald-400 transition-colors" title="Detay / Yorumlar"
              onClick={() => onOpenDetail(item)}>
              <MessageSquare className="size-4" />
            </button>
            <button className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-emerald-400 transition-colors" title="Alt madde ekle"
              onClick={() => onAddSub(item.id, item.cell)}>
              <Plus className="size-4" />
            </button>
            <button className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-rose-400 transition-colors" title="Sil"
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
              onAssigneeChange={onAssigneeChange} onStartDateChange={onStartDateChange} onDueDateChange={onDueDateChange}
              onTitleChange={onTitleChange}
              onDelete={onDelete} onAddSub={onAddSub} onCreateSub={onCreateSub} onCloseSub={onCloseSub}
              isPending={isPending} subFormParentId={subFormParentId} subTitle={subTitle}
              onSubTitleChange={onSubTitleChange} showCellColumn={showCellColumn}
              isAuthorized={isAuthorized} ensureAuthorized={ensureAuthorized}
              titleWidth={titleWidth} onOpenDetail={onOpenDetail}
              canEditItem={canEditItem} ensureRowAuthorized={ensureRowAuthorized} />
          ))
        : null}
    </>
  );
}
