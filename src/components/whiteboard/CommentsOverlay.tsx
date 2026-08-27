"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Pencil, Trash2, X } from "lucide-react";
import { worldToScreen } from "@/features/editor/interaction/coordinates";
import { generateCommentId } from "@/features/editor/model/ids";
import type { Comment, Point, Viewport } from "@/features/editor/model/types";
import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";

interface CommentsOverlayProps {
  draftPoint: Point | null;
  onDraftFinished: () => void;
}

function getMarkerStyle(point: Point, viewport: Viewport) {
  const screenPoint = worldToScreen(point, viewport);

  return {
    left: screenPoint.x,
    top: screenPoint.y,
  };
}

export function CommentsOverlay({
  draftPoint,
  onDraftFinished,
}: CommentsOverlayProps) {
  const comments = useWhiteboardStore((state) => state.comments);
  const viewport = useWhiteboardStore((state) => state.viewport);
  const isReadOnly = useWhiteboardStore((state) => state.isReadOnly);
  const commitHistoryEntry = useWhiteboardStore(
    (state) => state.commitHistoryEntry,
  );
  const addComment = useWhiteboardStore((state) => state.addComment);
  const updateComment = useWhiteboardStore((state) => state.updateComment);
  const removeComment = useWhiteboardStore((state) => state.removeComment);
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const draftInputRef = useRef<HTMLInputElement>(null);
  const editingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!draftPoint) {
      return;
    }

    setDraftValue("");
    setOpenCommentId(null);
    setEditingCommentId(null);
  }, [draftPoint]);

  useEffect(() => {
    if (draftPoint) {
      draftInputRef.current?.focus();
    }
  }, [draftPoint]);

  useEffect(() => {
    if (editingCommentId) {
      editingInputRef.current?.focus();
    }
  }, [editingCommentId]);

  const finishDraft = (shouldCommit: boolean) => {
    if (!draftPoint) {
      return;
    }

    const text = draftValue.trim();

    if (shouldCommit && text && !isReadOnly) {
      commitHistoryEntry();
      addComment({
        id: generateCommentId(),
        x: draftPoint.x,
        y: draftPoint.y,
        text,
        createdAt: Date.now(),
      });
    }

    onDraftFinished();
  };

  const beginEditing = (comment: Comment) => {
    if (isReadOnly) {
      return;
    }

    setOpenCommentId(comment.id);
    setEditingCommentId(comment.id);
    setEditingValue(comment.text);
  };

  const finishEditing = (comment: Comment, shouldCommit: boolean) => {
    if (editingCommentId !== comment.id) {
      return;
    }

    const text = editingValue.trim();
    setEditingCommentId(null);

    if (!shouldCommit || !text || text === comment.text || isReadOnly) {
      setEditingValue(comment.text);
      return;
    }

    commitHistoryEntry();
    updateComment(comment.id, { text });
  };

  const deleteComment = (comment: Comment) => {
    if (isReadOnly) {
      return;
    }

    commitHistoryEntry();
    removeComment(comment.id);
    setOpenCommentId(null);
    setEditingCommentId(null);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      {comments.map((comment) => {
        const isOpen = openCommentId === comment.id;
        const isEditing = editingCommentId === comment.id;

        return (
          <div
            key={comment.id}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
            style={getMarkerStyle(comment, viewport)}
          >
            <button
              type="button"
              aria-label={`Abrir comentário: ${comment.text}`}
              aria-expanded={isOpen}
              title="Abrir comentário"
              onClick={(event) => {
                event.stopPropagation();
                setOpenCommentId((currentId) =>
                  currentId === comment.id ? null : comment.id,
                );
                setEditingCommentId(null);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-700 shadow-md transition-transform hover:scale-110 dark:border-amber-600 dark:bg-amber-900/80 dark:text-amber-200"
            >
              <MessageCircle size={15} strokeWidth={2} aria-hidden="true" />
            </button>

            {isOpen && (
              <div
                role="dialog"
                aria-label="Comentário"
                onClick={(event) => event.stopPropagation()}
                className="absolute left-5 top-5 z-30 w-56 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left shadow-xl transition-colors duration-200 dark:border-amber-700 dark:bg-amber-950/95"
              >
                {isEditing ? (
                  <input
                    ref={editingInputRef}
                    value={editingValue}
                    onChange={(event) => setEditingValue(event.target.value)}
                    onBlur={() => finishEditing(comment, true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        finishEditing(comment, true);
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        finishEditing(comment, false);
                      }
                    }}
                    className="w-full rounded-md border border-amber-300 bg-white/80 px-2 py-1.5 text-sm text-slate-800 outline-none ring-amber-400 focus:ring-2 dark:border-amber-700 dark:bg-slate-900/70 dark:text-slate-100"
                    aria-label="Editar comentário"
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">
                    {comment.text}
                  </p>
                )}

                {!isReadOnly && !isEditing && (
                  <div className="mt-2 flex items-center justify-end gap-1 border-t border-amber-200 pt-2 dark:border-amber-800">
                    <button
                      type="button"
                      aria-label="Editar comentário"
                      title="Editar"
                      onClick={() => beginEditing(comment)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-amber-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-amber-900/60 dark:hover:text-slate-100"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Excluir comentário"
                      title="Excluir"
                      onClick={() => deleteComment(comment)}
                      className="rounded-md p-1.5 text-red-600 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950/60"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Fechar comentário"
                      title="Fechar"
                      onClick={() => setOpenCommentId(null)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-amber-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-amber-900/60 dark:hover:text-slate-100"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {draftPoint && (
        <div
          className="pointer-events-auto absolute -translate-y-1/2"
          style={getMarkerStyle(draftPoint, viewport)}
        >
          <div className="w-60 rounded-xl border border-amber-300 bg-amber-50 p-3 shadow-xl transition-colors duration-200 dark:border-amber-700 dark:bg-amber-950/95">
            <input
              ref={draftInputRef}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onBlur={() => finishDraft(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  finishDraft(true);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  finishDraft(false);
                }
              }}
              placeholder="Escreva uma anotação…"
              className="w-full rounded-md border border-amber-300 bg-white/80 px-2 py-1.5 text-sm text-slate-800 outline-none ring-amber-400 focus:ring-2 dark:border-amber-700 dark:bg-slate-900/70 dark:text-slate-100"
              aria-label="Nova anotação"
            />
            <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
              Enter salva · Esc cancela
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
