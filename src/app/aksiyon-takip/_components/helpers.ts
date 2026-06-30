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

export function formatDateTime(d: string | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export function filterBySearch(items: ActionItem[], query: string): ActionItem[] {
  const q = query.trim().toLocaleLowerCase("tr-TR");
  if (!q) return items;

  const matchIds = new Set(
    items
      .filter(
        (i) =>
          i.title.toLocaleLowerCase("tr-TR").includes(q) ||
          (i.description || "").toLocaleLowerCase("tr-TR").includes(q)
      )
      .map((i) => i.id)
  );
  if (matchIds.size === 0) return [];

  const byId = new Map(items.map((i) => [i.id, i]));
  const keep = new Set(matchIds);
  for (const id of matchIds) {
    let cur = byId.get(id);
    while (cur && cur.parent_id) {
      keep.add(cur.parent_id);
      cur = byId.get(cur.parent_id);
    }
  }

  return items.filter((i) => keep.has(i.id));
}

export function flattenTree(nodes: ActionItem[]): ActionItem[] {
  const result: ActionItem[] = [];
  const visit = (list: ActionItem[]) => {
    for (const node of list) {
      result.push(node);
      if (node.children && node.children.length > 0) visit(node.children);
    }
  };
  visit(nodes);
  return result;
}

export async function exportItemsToExcel(items: ActionItem[], filename: string) {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "ManufUI";
  wb.created = new Date();

  const ws = wb.addWorksheet("Aksiyon Takip");

  const columns = [
    { header: "Hücre", key: "cell", width: 20 },
    { header: "Başlık", key: "title", width: 40 },
    { header: "Açıklama", key: "description", width: 45 },
    { header: "Sorumlu", key: "assignee", width: 22 },
    { header: "Başlangıç", key: "start_date", width: 14 },
    { header: "Termin", key: "due_date", width: 14 },
    { header: "Öncelik", key: "priority", width: 12 },
    { header: "Durum", key: "status", width: 16 },
    { header: "Oluşturulma", key: "created_at", width: 18 },
    { header: "Güncellenme", key: "updated_at", width: 18 },
  ];
  ws.columns = columns;

  const headerRow = ws.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  });

  let rowIndex = 2;
  for (const item of items) {
    const dataRow = ws.addRow({
      cell: item.cell,
      title: "  ".repeat(depthOf(items, item)) + item.title,
      description: item.description || "",
      assignee: item.assignee,
      start_date: formatDate(item.start_date),
      due_date: formatDate(item.due_date),
      priority: item.priority || "",
      status: item.status,
      created_at: formatDateTime(item.created_at),
      updated_at: formatDateTime(item.updated_at),
    });

    const bgColor = rowIndex % 2 === 0 ? "FFF0FDF4" : "FFFFFFFF";
    dataRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "hair" }, bottom: { style: "hair" },
        left: { style: "hair" }, right: { style: "hair" },
      };
    });
    rowIndex++;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function depthOf(items: ActionItem[], item: ActionItem): number {
  const byId = new Map(items.map((i) => [i.id, i]));
  let depth = 0;
  let cur = item;
  while (cur.parent_id && byId.has(cur.parent_id)) {
    depth++;
    cur = byId.get(cur.parent_id)!;
  }
  return depth;
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
