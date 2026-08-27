"use client";

import { useEffect, useRef, useState } from "react";
import {
  BringToFront,
  ChevronDown,
  ChevronUp,
  Copy,
  LibraryBig,
  SendToBack,
  Trash2,
} from "lucide-react";
import { duplicateSceneElement } from "@/features/editor/interaction/elementActions";
import {
  opacityToPercent,
  percentToOpacity,
} from "@/features/editor/interaction/propertyValues";
import { generateElementId, generateSeed } from "@/features/editor/model/ids";
import {
  COLOR_PRESETS,
  FILL_PRESETS,
  ROUGHNESS_PRESETS,
  STROKE_STYLES,
  STROKE_WIDTHS,
} from "@/features/editor/model/stylePresets";
import type { SceneElement } from "@/features/editor/model/types";
import type { EditorStyle } from "@/features/editor/store/useWhiteboardStore";
import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";
import {
  createLibraryItem,
  getNextLibraryItemName,
} from "@/features/library/library";
import { generateLibraryThumbnail } from "@/features/library/thumbnail";
import { useLibraryStore } from "@/features/library/store/useLibraryStore";

const panelButtonClass =
  "flex items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";
const activePanelButtonClass =
  "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900";
const activeColorButtonClass =
  "scale-110 ring-2 ring-blue-500 ring-offset-1 dark:ring-blue-400 dark:ring-offset-slate-900";

type ElementPatch = Partial<SceneElement>;

function isFillElement(element: SceneElement): boolean {
  return (
    element.type === "rectangle" ||
    element.type === "diamond" ||
    element.type === "ellipse"
  );
}

function supportsStrokeControls(element: SceneElement): boolean {
  return element.type !== "text" && element.type !== "image";
}

function optionButtonClass(active: boolean): string {
  return `${panelButtonClass}${active ? ` ${activePanelButtonClass}` : ""}`;
}

function hasUniformValue<T>(
  elements: SceneElement[],
  value: T,
  read: (element: SceneElement) => T,
): boolean {
  return elements.length > 0 && elements.every((element) => read(element) === value);
}

export function PropertiesPanel() {
  const elements = useWhiteboardStore((state) => state.elements);
  const isReadOnly = useWhiteboardStore((state) => state.isReadOnly);
  const selectedElementIds = useWhiteboardStore(
    (state) => state.selectedElementIds,
  );
  const style = useWhiteboardStore((state) => state.style);
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
  const moveElementsForward = useWhiteboardStore(
    (state) => state.moveElementsForward,
  );
  const moveElementsBackward = useWhiteboardStore(
    (state) => state.moveElementsBackward,
  );
  const addElement = useWhiteboardStore((state) => state.addElement);
  const removeElement = useWhiteboardStore((state) => state.removeElement);
  const setSelectedElementIds = useWhiteboardStore(
    (state) => state.setSelectedElementIds,
  );
  const personalItems = useLibraryStore((state) => state.personalItems);
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const addPersonalItem = useLibraryStore((state) => state.addPersonalItem);

  useEffect(() => {
    hydrateLibrary();
  }, [hydrateLibrary]);

  const selectedElements = elements.filter((element) =>
    selectedElementIds.includes(element.id),
  );
  const selectedIdsKey = selectedElementIds.join("|");
  const firstOpacity = selectedElements[0]?.opacity ?? style.opacity;
  const [opacityPercent, setOpacityPercent] = useState(() =>
    opacityToPercent(firstOpacity),
  );
  const opacityGestureRef = useRef(false);

  useEffect(() => {
    setOpacityPercent(opacityToPercent(firstOpacity));
  }, [firstOpacity, selectedIdsKey]);

  if (isReadOnly || selectedElements.length === 0) {
    return null;
  }

  const allSupportFill = selectedElements.every(isFillElement);
  const hasStrokeControls = selectedElements.some(supportsStrokeControls);
  const allAreRectangles = selectedElements.every(
    (element) => element.type === "rectangle",
  );
  const selectedIndexes = selectedElements.map((element) =>
    elements.findIndex((candidate) => candidate.id === element.id),
  );
  const canMoveToFront = Math.max(...selectedIndexes) < elements.length - 1;
  const canMoveToBack = Math.min(...selectedIndexes) > 0;

  const applyElementPatch = (
    patch: ElementPatch,
    defaultPatch: Partial<EditorStyle>,
    supports: (element: SceneElement) => boolean = () => true,
  ) => {
    const targets = selectedElements.filter(supports);
    const hasChanges = targets.some((element) =>
      Object.entries(patch).some(
        ([key, value]) => element[key as keyof SceneElement] !== value,
      ),
    );

    setStyle(defaultPatch);

    if (!hasChanges) {
      return;
    }

    commitHistoryEntry();
    for (const element of targets) {
      updateElement(element.id, patch);
    }
  };

  const applyStrokeColor = (color: string) =>
    applyElementPatch(
      { strokeColor: color },
      { strokeColor: color },
      supportsStrokeControls,
    );

  const applyStrokeWidth = (width: number) =>
    applyElementPatch(
      { strokeWidth: width },
      { strokeWidth: width },
      supportsStrokeControls,
    );

  const applyFill = (fillColor: string | null) =>
    applyElementPatch(
      {
        fillColor,
        fillStyle: fillColor === null ? "none" : "solid",
      },
      {
        fillColor,
        fillStyle: fillColor === null ? "none" : "solid",
      },
      isFillElement,
    );

  const applyOpacity = (nextPercent: number) => {
    const opacity = percentToOpacity(nextPercent);
    const hasChanges = selectedElements.some(
      (element) => element.opacity !== opacity,
    );

    setOpacityPercent(opacityToPercent(opacity));
    setStyle({ opacity });

    if (!hasChanges) {
      return;
    }

    if (!opacityGestureRef.current) {
      commitHistoryEntry();
      opacityGestureRef.current = true;
    }

    for (const element of selectedElements) {
      updateElement(element.id, { opacity });
    }
  };

  const finishOpacityGesture = () => {
    opacityGestureRef.current = false;
  };

  const moveLayer = (direction: "front" | "back" | "forward" | "backward") => {
    if (
      (direction === "front" || direction === "forward") &&
      !canMoveToFront
    ) {
      return;
    }
    if (
      (direction === "back" || direction === "backward") &&
      !canMoveToBack
    ) {
      return;
    }

    commitHistoryEntry();
    if (direction === "front") {
      moveElementsToFront(selectedElementIds);
    } else if (direction === "back") {
      moveElementsToBack(selectedElementIds);
    } else if (direction === "forward") {
      moveElementsForward(selectedElementIds);
    } else {
      moveElementsBackward(selectedElementIds);
    }
  };

  const duplicateSelected = () => {
    const duplicates = selectedElements.map((element) =>
      duplicateSceneElement(element, generateElementId(), generateSeed()),
    );

    if (duplicates.length === 0) {
      return;
    }

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

  const saveSelectedToLibrary = () => {
    if (selectedElements.length === 0) {
      return;
    }

    const name = getNextLibraryItemName(personalItems);
    const thumbnail = generateLibraryThumbnail(selectedElements);
    addPersonalItem(createLibraryItem(selectedElements, name, thumbnail));
  };

  return (
    <aside
      aria-label="Propriedades da seleção"
      className="fixed bottom-4 left-4 right-4 top-auto z-20 max-h-[45vh] w-auto overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/95 sm:bottom-auto sm:left-4 sm:right-auto sm:top-24 sm:max-h-[calc(100vh-7rem)] sm:w-64"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Propriedades
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {selectedElements.length} selecionado
          {selectedElements.length === 1 ? "" : "s"}
        </span>
      </div>

      {hasStrokeControls && (
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
              aria-pressed={hasUniformValue(
                selectedElements,
                color.value,
                (element) => element.strokeColor,
              )}
              title={color.label}
              onClick={() => applyStrokeColor(color.value)}
              className={`h-6 w-6 rounded-full border-2 border-white shadow-sm ring-slate-300 transition-transform hover:scale-110 focus:outline-none focus:ring-2 dark:border-slate-700 dark:ring-slate-600 ${hasUniformValue(
                selectedElements,
                color.value,
                (element) => element.strokeColor,
              ) ? activeColorButtonClass : ""}`}
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>
      </section>
      )}

      {allSupportFill && (
        <section className="mt-4" aria-labelledby="properties-fill-title">
          <h3
            id="properties-fill-title"
            className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
          >
            Fundo
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {FILL_PRESETS.map((fill) => (
              <button
                key={fill.label}
                type="button"
                aria-label={`Fundo ${fill.label}`}
                aria-pressed={hasUniformValue(
                  selectedElements,
                  fill.value,
                  (element) => element.fillColor,
                )}
                title={fill.label}
                onClick={() => applyFill(fill.value)}
                className={`h-6 w-6 rounded-md border border-slate-300 shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-600 ${hasUniformValue(
                  selectedElements,
                  fill.value,
                  (element) => element.fillColor,
                ) ? activeColorButtonClass : ""}`}
                style={{
                  backgroundColor: fill.value ?? "transparent",
                  backgroundImage:
                    fill.value === null
                      ? "linear-gradient(135deg, transparent 45%, #ef4444 46%, #ef4444 54%, transparent 55%)"
                      : undefined,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {hasStrokeControls && (
        <>
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
                  aria-pressed={hasUniformValue(
                    selectedElements,
                    width.value,
                    (element) => element.strokeWidth,
                  )}
                  onClick={() => applyStrokeWidth(width.value)}
                  className={optionButtonClass(
                    hasUniformValue(
                      selectedElements,
                      width.value,
                      (element) => element.strokeWidth,
                    ),
                  )}
                >
                  {width.value}px
                </button>
              ))}
            </div>
          </section>

          <section className="mt-4" aria-labelledby="properties-style-title">
            <h3
              id="properties-style-title"
              className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Estilo do traço
            </h3>
            <div className="grid grid-cols-3 gap-1">
              {STROKE_STYLES.map((strokeStyle) => (
                <button
                  key={strokeStyle.value}
                  type="button"
                  aria-label={strokeStyle.label}
                  aria-pressed={hasUniformValue(
                    selectedElements,
                    strokeStyle.value,
                    (element) => element.strokeStyle,
                  )}
                  onClick={() =>
                    applyElementPatch(
                      { strokeStyle: strokeStyle.value },
                      { strokeStyle: strokeStyle.value },
                      supportsStrokeControls,
                    )
                  }
                  className={optionButtonClass(
                    hasUniformValue(
                      selectedElements,
                      strokeStyle.value,
                      (element) => element.strokeStyle,
                    ),
                  )}
                >
                  {strokeStyle.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-4" aria-labelledby="properties-roughness-title">
            <h3
              id="properties-roughness-title"
              className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Precisão do traço
            </h3>
            <div className="grid grid-cols-3 gap-1">
              {ROUGHNESS_PRESETS.map((roughness) => (
                <button
                  key={roughness.value}
                  type="button"
                  aria-label={roughness.label}
                  aria-pressed={hasUniformValue(
                    selectedElements,
                    roughness.value,
                    (element) => element.roughness,
                  )}
                  onClick={() =>
                    applyElementPatch(
                      { roughness: roughness.value },
                      { roughness: roughness.value },
                      supportsStrokeControls,
                    )
                  }
                  className={optionButtonClass(
                    hasUniformValue(
                      selectedElements,
                      roughness.value,
                      (element) => element.roughness,
                    ),
                  )}
                >
                  {roughness.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {allAreRectangles && (
        <section className="mt-4" aria-labelledby="properties-corners-title">
          <h3
            id="properties-corners-title"
            className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
          >
            Arestas
          </h3>
          <div className="grid grid-cols-2 gap-1">
            {(["sharp", "round"] as const).map((cornerStyle) => (
              <button
                key={cornerStyle}
                type="button"
                aria-label={cornerStyle === "sharp" ? "Retas" : "Arredondadas"}
                aria-pressed={hasUniformValue(
                  selectedElements,
                  cornerStyle,
                  (element) =>
                    element.type === "rectangle"
                      ? element.cornerStyle
                      : undefined,
                )}
                onClick={() =>
                  applyElementPatch(
                    { cornerStyle },
                    { cornerStyle },
                    (element) => element.type === "rectangle",
                  )
                }
                className={optionButtonClass(
                  hasUniformValue(
                    selectedElements,
                    cornerStyle,
                    (element) =>
                      element.type === "rectangle"
                        ? element.cornerStyle
                        : undefined,
                  ),
                )}
              >
                {cornerStyle === "sharp" ? "Retas" : "Arredondadas"}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4" aria-labelledby="properties-opacity-title">
        <div className="mb-2 flex items-center justify-between">
          <h3
            id="properties-opacity-title"
            className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
          >
            Opacidade
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {opacityPercent}%
          </span>
        </div>
        <input
          aria-label="Opacidade"
          type="range"
          min="0"
          max="100"
          value={opacityPercent}
          onChange={(event) => applyOpacity(Number(event.target.value))}
          onPointerDown={() => {
            opacityGestureRef.current = false;
          }}
          onPointerUp={finishOpacityGesture}
          onPointerCancel={finishOpacityGesture}
          className="w-full accent-blue-600"
        />
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
            aria-label="Avançar uma camada"
            title="Avançar uma camada"
            disabled={!canMoveToFront}
            onClick={() => moveLayer("forward")}
            className={panelButtonClass}
          >
            <ChevronUp size={15} aria-hidden="true" />
            Avançar
          </button>
          <button
            type="button"
            aria-label="Recuar uma camada"
            title="Recuar uma camada"
            disabled={!canMoveToBack}
            onClick={() => moveLayer("backward")}
            className={panelButtonClass}
          >
            <ChevronDown size={15} aria-hidden="true" />
            Recuar
          </button>
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
          <button
            type="button"
            aria-label="Salvar seleção na biblioteca"
            title="Salvar seleção na biblioteca"
            onClick={saveSelectedToLibrary}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-md border border-blue-200 px-2 py-2 text-xs text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
          >
            <LibraryBig size={15} aria-hidden="true" />
            Salvar na biblioteca
          </button>
        </div>
      </section>
    </aside>
  );
}
