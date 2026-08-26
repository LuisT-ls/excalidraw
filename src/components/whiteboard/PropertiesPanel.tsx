"use client";

import {
  BringToFront,
  Copy,
  SendToBack,
  Trash2,
} from "lucide-react";
import { duplicateSceneElement } from "@/features/editor/interaction/elementActions";
import { generateElementId, generateSeed } from "@/features/editor/model/ids";
import {
  COLOR_PRESETS,
  STROKE_WIDTHS,
} from "@/features/editor/model/stylePresets";
import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";

const panelButtonClass =
  "flex items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

export function PropertiesPanel() {
  const elements = useWhiteboardStore((state) => state.elements);
  const selectedElementIds = useWhiteboardStore(
    (state) => state.selectedElementIds,
  );
  const setStyle = useWhiteboardStore((state) => state.setStyle);
  const updateElement = useWhiteboardStore((state) => state.updateElement);
  const commitHistoryEntry = useWhiteboardStore(
    (state) => state.commitHistoryEntry,
  );
  const moveElementsToFront = useWhiteboardStore(
    (state) => state.moveElementsToFront,
  );
  const moveElementsToBack = useWhiteboardStore(
    (state) => state.moveElementsToBack,
  );
  const addElement = useWhiteboardStore((state) => state.addElement);
  const removeElement = useWhiteboardStore((state) => state.removeElement);
  const setSelectedElementIds = useWhiteboardStore(
    (state) => state.setSelectedElementIds,
  );

  if (selectedElementIds.length === 0) {
    return null;
  }

  const selectedElements = elements.filter((element) =>
    selectedElementIds.includes(element.id),
  );
  const selectedIndexes = selectedElements.map((element) =>
    elements.findIndex((candidate) => candidate.id === element.id),
  );
  const canMoveToFront =
    selectedIndexes.length > 0 &&
    Math.max(...selectedIndexes) < elements.length - 1;
  const canMoveToBack = selectedIndexes.length > 0 && Math.min(...selectedIndexes) > 0;

  const applyStyle = (patch: { strokeColor?: string; strokeWidth?: number }) => {
    const hasChanges = selectedElements.some(
      (element) =>
        (patch.strokeColor !== undefined &&
          element.strokeColor !== patch.strokeColor) ||
        (patch.strokeWidth !== undefined &&
          element.strokeWidth !== patch.strokeWidth),
    );

    setStyle(patch);

    if (!hasChanges) {
      return;
    }

    commitHistoryEntry();
    for (const element of selectedElements) {
      updateElement(element.id, patch);
    }
  };

  const moveLayer = (direction: "front" | "back") => {
    if (direction === "front" && !canMoveToFront) {
      return;
    }

    if (direction === "back" && !canMoveToBack) {
      return;
    }

    commitHistoryEntry();
    if (direction === "front") {
      moveElementsToFront(selectedElementIds);
    } else {
      moveElementsToBack(selectedElementIds);
    }
  };

  const duplicateSelected = () => {
    if (selectedElements.length === 0) {
      return;
    }

    const duplicates = selectedElements.map((element) =>
      duplicateSceneElement(element, generateElementId(), generateSeed()),
    );

    commitHistoryEntry();
    for (const duplicate of duplicates) {
      addElement(duplicate);
    }
    setSelectedElementIds(duplicates.map((element) => element.id));
  };

  const deleteSelected = () => {
    if (selectedElements.length === 0) {
      return;
    }

    commitHistoryEntry();
    for (const element of selectedElements) {
      removeElement(element.id);
    }
    setSelectedElementIds([]);
  };

  return (
    <aside
      aria-label="Propriedades da seleção"
      className="fixed left-4 top-24 z-20 w-64 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Propriedades
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {selectedElements.length} selecionado{selectedElements.length === 1 ? "" : "s"}
        </span>
      </div>

      <section aria-labelledby="properties-stroke-title">
        <h3
          id="properties-stroke-title"
          className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Contorno
        </h3>
        <div className="flex items-center gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color.value}
              type="button"
              aria-label={`Contorno ${color.label}`}
              title={color.label}
              onClick={() => applyStyle({ strokeColor: color.value })}
              className="h-6 w-6 rounded-full border-2 border-white shadow-sm ring-slate-300 transition-transform hover:scale-110 focus:outline-none focus:ring-2 dark:border-slate-700 dark:ring-slate-600"
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>
      </section>

      <section className="mt-4" aria-labelledby="properties-width-title">
        <h3
          id="properties-width-title"
          className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Espessura do traço
        </h3>
        <div className="grid grid-cols-3 gap-1">
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width.value}
              type="button"
              aria-label={`Traço ${width.label}`}
              aria-pressed={selectedElements.every(
                (element) => element.strokeWidth === width.value,
              )}
              onClick={() => applyStyle({ strokeWidth: width.value })}
              className={panelButtonClass}
            >
              {width.value}px
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4" aria-labelledby="properties-layer-title">
        <h3
          id="properties-layer-title"
          className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Camadas
        </h3>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            aria-label="Trazer para frente"
            title="Trazer para frente"
            disabled={!canMoveToFront}
            onClick={() => moveLayer("front")}
            className={panelButtonClass}
          >
            <BringToFront size={15} aria-hidden="true" />
            Frente
          </button>
          <button
            type="button"
            aria-label="Mandar para trás"
            title="Mandar para trás"
            disabled={!canMoveToBack}
            onClick={() => moveLayer("back")}
            className={panelButtonClass}
          >
            <SendToBack size={15} aria-hidden="true" />
            Trás
          </button>
        </div>
      </section>

      <section className="mt-4" aria-labelledby="properties-actions-title">
        <h3
          id="properties-actions-title"
          className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Ações
        </h3>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            aria-label="Duplicar seleção"
            onClick={duplicateSelected}
            className={panelButtonClass}
          >
            <Copy size={15} aria-hidden="true" />
            Duplicar
          </button>
          <button
            type="button"
            aria-label="Excluir seleção"
            onClick={deleteSelected}
            className="flex items-center justify-center gap-1.5 rounded-md border border-red-200 px-2 py-2 text-xs text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            <Trash2 size={15} aria-hidden="true" />
            Excluir
          </button>
        </div>
      </section>
    </aside>
  );
}
