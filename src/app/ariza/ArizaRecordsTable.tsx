"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type ArizaDetail, ETM_ARIZA_TURLER, ROB_ARIZA_TURLER, N_ARIZA_TURLER } from "@/lib/types";
import { markArizaResolved, updateArizaType } from "./actions";

type StatusFilter = "all" | "open" | "resolved";

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ArizaRecordsTable({ details }: { details: ArizaDetail[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [startDate, setStartDate] = useState("2026-06-13");
  const [endDate, setEndDate] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<ArizaDetail | null>(null);
  const [comment, setComment] = useState("");
  const [rows, setRows] = useState(details);
  const [isPending, startTransition] = useTransition();

  const departments = useMemo(
    () => Array.from(new Set(rows.map((detail) => detail.bolum))).sort(),
    [rows]
  );
  const types = useMemo(
    () => Array.from(new Set(rows.map((detail) => detail.tur))).sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    return rows.filter((detail) => {
      const statusMatch =
        status === "all" ||
        (status === "open" && !detail.giderildi) ||
        (status === "resolved" && detail.giderildi);
      const departmentMatch = department === "all" || detail.bolum === department;
      const typeMatch = type === "all" || detail.tur === type;
      const dateMatch =
        (!startDate || detail.tarih >= startDate) &&
        (!endDate || detail.tarih <= endDate);
      const text = [
        detail.tarih,
        detail.bolum,
        detail.sorumlu,
        detail.zamanDilimi,
        detail.tur,
        detail.aciklama,
        detail.giderilmeAciklama ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return (
        statusMatch &&
        departmentMatch &&
        typeMatch &&
        dateMatch &&
        (!normalizedSearch || text.includes(normalizedSearch))
      );
    });
  }, [department, rows, search, status, type, startDate, endDate]);

  const clearFilters = () => {
    setSearch("");
    setDepartment("all");
    setType("all");
    setStatus("all");
    setStartDate("2026-06-13");
    setEndDate("");
  };

  const openResolveDialog = (detail: ArizaDetail) => {
    setSelectedDetail(detail);
    setComment("");
  };

  const submitResolution = () => {
    if (!selectedDetail) return;

    const cleanComment = comment.trim();
    if (!cleanComment) {
      toast.error("Arızanın nasıl giderildiğini yazmak zorunludur.");
      return;
    }

    startTransition(async () => {
      const result = await markArizaResolved(selectedDetail.id, cleanComment);

      if (!result.success) {
        toast.error(`Kayıt güncellenemedi: ${result.error}`);
        return;
      }

      const resolvedAt = new Date().toISOString();
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === selectedDetail.id
            ? {
                ...row,
                giderildi: true,
                giderilmeAciklama: cleanComment,
                giderildiAt: resolvedAt,
              }
            : row
        )
      );
      setSelectedDetail(null);
      setComment("");
      toast.success("Arıza giderildi olarak işaretlendi.");
      router.refresh();
    });
  };

  const handleTypeChange = (rowId: string, newType: string) => {
    startTransition(async () => {
      const result = await updateArizaType(rowId, newType);
      if (!result.success) {
        toast.error(`Tür güncellenemedi: ${result.error}`);
        return;
      }
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                tur: newType,
              }
            : row
        )
      );
      toast.success("Arıza türü güncellendi.");
      router.refresh();
    });
  };

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Arıza kayıtları</h2>
          <p className="text-sm text-zinc-500">
            Zaman dilimi, tür, açıklama ve giderilme bilgileri
          </p>
        </div>
        <span className="rounded-md bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
          {formatNumber(filteredRows.length)} / {formatNumber(rows.length)} satır
        </span>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          placeholder="Bölüm, sorumlu, açıklama ara..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="h-8 rounded-lg border border-input bg-white px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="all">Tüm bölümler</option>
          {departments.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded-lg border border-input bg-white px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="all">Tüm türler</option>
          {types.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded-lg border border-input bg-white px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
        >
          <option value="all">Tüm durumlar</option>
          <option value="open">Giderilmedi</option>
          <option value="resolved">Giderildi</option>
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Başlangıç:</span>
          <Input
            type="date"
            className="h-8 w-40 text-xs"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Bitiş:</span>
          <Input
            type="date"
            className="h-8 w-40 text-xs"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={clearFilters} className="ml-auto h-8 text-xs">
          Temizle
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1220px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="py-2 pr-3 font-medium">Durum</th>
              <th className="px-3 py-2 font-medium">Tarih</th>
              <th className="px-3 py-2 font-medium">Bölüm</th>
              <th className="px-3 py-2 font-medium">Sorumlu</th>
              <th className="px-3 py-2 font-medium">Zaman</th>
              <th className="px-3 py-2 font-medium">Tür</th>
              <th className="px-3 py-2 text-right font-medium">Süre</th>
              <th className="px-3 py-2 font-medium">Açıklama</th>
              <th className="px-3 py-2 font-medium">Giderilme notu</th>
              <th className="py-2 pl-3 text-right font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((detail) => (
              <tr key={detail.id} className="border-b border-zinc-100 last:border-0">
                <td className="py-3 pr-3">
                  <span
                    className={
                      detail.giderildi
                        ? "rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800"
                        : "rounded-md bg-rose-100 px-2 py-1 text-xs font-medium text-rose-800"
                    }
                  >
                    {detail.giderildi ? "Giderildi" : "Açık"}
                  </span>
                </td>
                <td className="px-3 py-3 text-zinc-600">{formatDate(detail.tarih)}</td>
                <td className="px-3 py-3 font-medium">{detail.bolum}</td>
                <td className="px-3 py-3 text-zinc-600">{detail.sorumlu}</td>
                <td className="px-3 py-3 text-zinc-600">{detail.zamanDilimi}</td>
                <td className="px-3 py-3">
                  {detail.bolum === "Pres Hücresi" ? (
                    <select
                      value={detail.tur}
                      disabled={isPending}
                      onChange={(e) => handleTypeChange(detail.id, e.target.value)}
                      className="text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer disabled:opacity-50"
                    >
                      <option value="Pres Öncesi">Pres Öncesi</option>
                      <option value="Pres">Pres</option>
                      <option value="Pres Sonrası">Pres Sonrası</option>
                    </select>
                  ) : detail.bolum === "ETM Hücresi" ? (
                    <select
                      value={detail.tur}
                      disabled={isPending}
                      onChange={(e) => handleTypeChange(detail.id, e.target.value)}
                      className="text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer disabled:opacity-50"
                    >
                      {ETM_ARIZA_TURLER.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.code}
                        </option>
                      ))}
                    </select>
                  ) : ["ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(detail.bolum) ? (
                    <select
                      value={detail.tur}
                      disabled={isPending}
                      onChange={(e) => handleTypeChange(detail.id, e.target.value)}
                      className="text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer disabled:opacity-50"
                    >
                      {ROB_ARIZA_TURLER.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.code}
                        </option>
                      ))}
                    </select>
                  ) : ["N602 Hücresi", "N603 Hücresi"].includes(detail.bolum) ? (
                    <select
                      value={detail.tur}
                      disabled={isPending}
                      onChange={(e) => handleTypeChange(detail.id, e.target.value)}
                      className="text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer disabled:opacity-50"
                    >
                      {N_ARIZA_TURLER.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.code}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={detail.tur}
                      disabled={isPending}
                      onChange={(e) => handleTypeChange(detail.id, e.target.value)}
                      className="text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer disabled:opacity-50"
                    >
                      <option value="E">E</option>
                      <option value="A">A</option>
                      <option value="M">M</option>
                      <option value="O">O</option>
                      <option value="Kalite">Kalite</option>
                      <option value="Belirsiz">Belirsiz</option>
                    </select>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  {formatNumber(detail.dakika)} dk
                </td>
                <td className="max-w-72 px-3 py-3 text-zinc-700">{detail.aciklama}</td>
                <td className="max-w-80 px-3 py-3 text-zinc-700">
                  {detail.giderildi ? (
                    <span>
                      {detail.giderilmeAciklama}
                      {detail.giderildiAt ? (
                        <span className="mt-1 block text-xs text-zinc-500">
                          {formatDateTime(detail.giderildiAt)}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
                <td className="py-3 pl-3 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant={detail.giderildi ? "outline" : "default"}
                    disabled={detail.giderildi}
                    onClick={() => openResolveDialog(detail)}
                  >
                    {detail.giderildi ? "Tamamlandı" : "Arıza giderildi"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 ? (
        <p className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
          Filtrelere uygun arıza kaydı bulunmuyor.
        </p>
      ) : null}

      <Dialog
        open={selectedDetail !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setSelectedDetail(null);
            setComment("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Arıza giderildi</DialogTitle>
            <DialogDescription>
              {selectedDetail
                ? `${selectedDetail.bolum} · ${formatDate(selectedDetail.tarih)} · ${selectedDetail.zamanDilimi}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="ariza-giderilme-aciklama">
              Arıza nasıl giderildi? *
            </label>
            <Textarea
              id="ariza-giderilme-aciklama"
              rows={5}
              placeholder="Yapılan müdahaleyi ve sonucu yazınız..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setSelectedDetail(null);
                setComment("");
              }}
            >
              İptal
            </Button>
            <Button type="button" disabled={isPending} onClick={submitResolution}>
              {isPending ? "Kaydediliyor..." : "Tamam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
