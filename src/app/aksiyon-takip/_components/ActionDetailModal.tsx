"use client";

import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import type { ActionItem, ActionComment } from "../actions";
import { formatDateTime } from "./helpers";

export function ActionDetailModal({
  item,
  comments,
  commentsLoading,
  commenterName,
  onCommenterNameChange,
  onClose,
  onDescriptionChange,
  onAddComment,
  isAuthorized,
  ensureAuthorized,
}: {
  item: ActionItem;
  comments: ActionComment[];
  commentsLoading: boolean;
  commenterName: string;
  onCommenterNameChange: (name: string) => void;
  onClose: () => void;
  onDescriptionChange: (id: string, description: string) => void;
  onAddComment: (id: string, author: string, comment: string) => void;
  isAuthorized: boolean;
  ensureAuthorized: (cb: () => void) => void;
}) {
  const [description, setDescription] = useState(item.description || "");
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    setDescription(item.description || "");
  }, [item.id, item.description]);

  const handleSaveDescription = () => {
    if (description.trim() !== (item.description || "")) {
      onDescriptionChange(item.id, description.trim());
    }
  };

  const handleSubmitComment = () => {
    const text = newComment.trim();
    const author = commenterName.trim();
    if (!text || !author) return;
    onAddComment(item.id, author, text);
    setNewComment("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-zinc-200 bg-white shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{item.cell}</p>
            <h3 className="mt-0.5 text-base font-semibold text-zinc-900 break-words">{item.title}</h3>
            <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-zinc-400">
              <span>Oluşturulma: {formatDateTime(item.created_at)}</span>
              <span>Güncellenme: {formatDateTime(item.updated_at)}</span>
            </div>
          </div>
          <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <label className="text-xs font-medium text-zinc-600">Açıklama</label>
            <textarea
              className="mt-1 w-full min-h-24 resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:bg-zinc-50"
              value={description}
              placeholder="Bu aksiyon için detaylı açıklama girin..."
              disabled={!isAuthorized}
              onClick={() => { if (!isAuthorized) ensureAuthorized(() => {}); }}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveDescription}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600">Yorumlar / Aktivite</label>
            <div className="mt-2 space-y-2">
              {commentsLoading ? (
                <p className="text-xs text-zinc-400">Yükleniyor...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-zinc-400">Henüz yorum yok.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-800">{c.author}</span>
                      <span className="text-[11px] text-zinc-400">{formatDateTime(c.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-700 whitespace-pre-wrap break-words">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 space-y-2 rounded-md border border-zinc-200 p-2">
              <input
                className="h-8 w-full rounded-md border border-zinc-200 px-2 text-xs outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                placeholder="Adınız"
                value={commenterName}
                onChange={(e) => onCommenterNameChange(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className="h-9 flex-1 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20"
                  placeholder="Yorum yazın..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmitComment(); }}
                />
                <button
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || !commenterName.trim()}
                >
                  <Send className="size-3.5" /> Gönder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
