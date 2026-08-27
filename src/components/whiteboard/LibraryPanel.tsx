"use client";

import { useEffect, useState } from "react";
import { LibraryBig, Pencil, Trash2, X } from "lucide-react";
import { screenToWorld } from "@/features/editor/interaction/coordinates";
import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";
import { BUILTIN_LIBRARY } from "@/features/library/builtinLibrary";
import { cloneLibraryElementsForInsertion } from "@/features/library/library";
import { generateLibraryThumbnail } from "@/features/library/thumbnail";
import { useLibraryStore } from "@/features/library/store/useLibraryStore";
import type { LibraryItem } from "@/features/library/types";

interface LibraryPanelProps {
  onClose: () => void;
}

const builtinThumbnailCache = new Map<string, string>();

function LibraryCard({
  item,
  canInsert,
  onInsert,
  onDelete,
  onRename,
}: {
  item: LibraryItem;
  canInsert: boolean;
  onInsert: () => void;
  onDelete?: () => void;
  onRename?: (name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.name);

  useEffect(() => {
    setDraftName(item.name);
  }, [item.name]);

  const finishRename = () => {
    const nextName = draftName.trim();

    if (nextName && nextName !== item.name) {
      onRename?.(nextName);
    } else {
      setDraftName(item.name);
    }
    setIsEditing(false);
  };

  return (
    <div className="group rounded-lg border border-slate-200 bg-white/70 p-1.5 transition-colors hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-700">
      <button
        type="button"
        disabled={!canInsert}
        onClick={onInsert}
        className="block w-full rounded-md text-left disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Inserir ${item.name}`}
      >
        <div className="flex h-20 items-center justify-center overflow-hidden rounded-md bg-slate-50 dark:bg-slate-900">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-slate-400">Gerando prévia…</span>
          )}
        </div>
      </button>

      <div className="mt-1 flex min-w-0 items-center gap-1">
        {isEditing && onRename ? (
          <input
            autoFocus
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={finishRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                finishRename();
              }
              if (event.key === "Escape") {
                setDraftName(item.name);
                setIsEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded border border-blue-300 bg-transparent px-1 text-xs text-slate-700 outline-none dark:border-blue-700 dark:text-slate-200"
            aria-label={`Renomear ${item.name}`}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate px-1 text-xs text-slate-700 dark:text-slate-200">
            {item.name}
          </span>
        )}

        {onRename && !isEditing && (
          <button
            type="button"
            aria-label={`Renomear ${item.name}`}
            title="Renomear"
            onClick={() => setIsEditing(true)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <Pencil size={13} aria-hidden="true" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            aria-label={`Excluir ${item.name} da biblioteca`}
            title="Excluir da biblioteca"
            onClick={onDelete}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export function LibraryPanel({ onClose }: LibraryPanelProps) {
  const personalItems = useLibraryStore((state) => state.personalItems);
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const removePersonalItem = useLibraryStore(
    (state) => state.removePersonalItem,
  );
  const renamePersonalItem = useLibraryStore(
    (state) => state.renamePersonalItem,
  );
  const isReadOnly = useWhiteboardStore((state) => state.isReadOnly);
  const viewport = useWhiteboardStore((state) => state.viewport);
  const commitHistoryEntry = useWhiteboardStore(
    (state) => state.commitHistoryEntry,
  );
  const addElement = useWhiteboardStore((state) => state.addElement);
  const setSelectedElementIds = useWhiteboardStore(
    (state) => state.setSelectedElementIds,
  );
  const setActiveTool = useWhiteboardStore((state) => state.setActiveTool);
  const [builtinThumbnails, setBuiltinThumbnails] = useState(
    () => new Map<string, string>(),
  );

  useEffect(() => {
    hydrateLibrary();
  }, [hydrateLibrary]);

  useEffect(() => {
    const thumbnails = new Map<string, string>();

    for (const item of BUILTIN_LIBRARY) {
      const cached = builtinThumbnailCache.get(item.id);
      const thumbnail = cached ?? generateLibraryThumbnail(item.elements);

      if (thumbnail) {
        builtinThumbnailCache.set(item.id, thumbnail);
      }
      thumbnails.set(item.id, thumbnail);
    }

    setBuiltinThumbnails(thumbnails);
  }, []);

  const insertItem = (item: LibraryItem) => {
    if (isReadOnly) {
      return;
    }

    const canvas = document.querySelector<HTMLCanvasElement>("canvas");
    const bounds = canvas?.getBoundingClientRect();
    const centerScreen = {
      x: (bounds?.width ?? window.innerWidth) / 2,
      y: (bounds?.height ?? window.innerHeight) / 2,
    };
    const centerWorld = screenToWorld(centerScreen, viewport);
    const insertedElements = cloneLibraryElementsForInsertion(item, centerWorld);

    if (insertedElements.length === 0) {
      return;
    }

    commitHistoryEntry();
    for (const element of insertedElements) {
      addElement(element);
    }
    setSelectedElementIds(insertedElements.map((element) => element.id));
    setActiveTool("select");
  };

  const itemsWithThumbnails = BUILTIN_LIBRARY.map((item) => ({
    ...item,
    thumbnail: item.thumbnail || builtinThumbnails.get(item.id) || "",
  }));

  return (
    <aside
      aria-label="Biblioteca de formas"
      className="fixed bottom-4 left-4 right-4 top-auto z-30 max-h-[62vh] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/95 sm:bottom-4 sm:left-auto sm:right-4 sm:top-24 sm:max-h-[calc(100vh-7rem)] sm:w-80"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LibraryBig size={17} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Biblioteca
          </h2>
        </div>
        <button
          type="button"
          aria-label="Fechar biblioteca"
          title="Fechar"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <section aria-labelledby="personal-library-title">
        <h3
          id="personal-library-title"
          className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Minha biblioteca
        </h3>
        {personalItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {personalItems.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                canInsert={!isReadOnly}
                onInsert={() => insertItem(item)}
                onDelete={() => removePersonalItem(item.id)}
                onRename={(name) => renamePersonalItem(item.id, name)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-md bg-slate-50 px-2 py-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            Selecione elementos e salve-os pelo painel de propriedades.
          </p>
        )}
      </section>

      <section className="mt-4" aria-labelledby="builtin-library-title">
        <h3
          id="builtin-library-title"
          className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Formas prontas
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {itemsWithThumbnails.map((item) => (
            <LibraryCard
              key={item.id}
              item={item}
              canInsert={!isReadOnly}
              onInsert={() => insertItem(item)}
            />
          ))}
        </div>
      </section>
    </aside>
  );
}
