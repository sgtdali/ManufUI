import type { ActionItem } from "../actions";

export const PRIORITIES = ["Yüksek", "Orta", "Düşük"] as const;
export const STATUSES = ["Açık", "Devam Ediyor", "Tamamlandı"] as const;

export function priorityColor(p: string) {
  if (p === "Yüksek") return "bg-rose-100 text-rose-800";
  if (p === "Düşük") return "bg-zinc-100 text-zinc-600";
  return "bg-amber-100 text-amber-800";
}

export function statusColor(s: string) {
  if (s === "Tamamlandı") return "bg-emerald-100 text-emerald-800";
  if (s === "Devam Ediyor") return "bg-blue-100 text-blue-800";
  return "bg-zinc-100 text-zinc-700";
}

export function formatDate(d: string | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));
}

export function buildTree(items: ActionItem[]): ActionItem[] {
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

export function sortTree(
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

export function removeItemBranch(items: ActionItem[], id: string) {
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
