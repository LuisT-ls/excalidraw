"use client";

import { getSceneBounds } from "@/features/editor/interaction/sceneBounds";
import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";

function formatValue(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatDegrees(value: number): string {
  return `${formatValue((value * 180) / Math.PI)}°`;
}

export function StatsPanel() {
  const elements = useWhiteboardStore((state) => state.elements);
  const selectedElementIds = useWhiteboardStore(
    (state) => state.selectedElementIds,
  );
  const viewport = useWhiteboardStore((state) => state.viewport);
  const selectedElements = elements.filter((element) =>
    selectedElementIds.includes(element.id),
  );

  if (selectedElements.length === 0) {
    return (
      <aside
        aria-label="Estatísticas do quadro"
        className="fixed right-4 top-24 z-20 w-52 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs text-slate-700 shadow-xl backdrop-blur transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 sm:bottom-4 sm:top-auto"
      >
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Estatísticas
        </h2>
        <dl className="space-y-1">
          <div className="flex justify-between gap-3">
            <dt>Zoom</dt>
            <dd className="font-mono">{formatValue(viewport.zoom * 100)}%</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Elementos</dt>
            <dd className="font-mono">{elements.length}</dd>
          </div>
        </dl>
      </aside>
    );
  }

  const bounds = getSceneBounds(selectedElements);
  const selectedElement = selectedElements.length === 1
    ? selectedElements[0]
    : null;

  return (
    <aside
      aria-label="Estatísticas da seleção"
      className="fixed right-4 top-24 z-20 w-56 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs text-slate-700 shadow-xl backdrop-blur transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 sm:bottom-4 sm:top-auto"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Estatísticas
        </h2>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {selectedElements.length} selecionado{selectedElements.length === 1 ? "" : "s"}
        </span>
      </div>
      {bounds && (
        <dl className="space-y-1">
          <div className="flex justify-between gap-3">
            <dt>{selectedElement ? "X" : "X conjunto"}</dt>
            <dd className="font-mono">{formatValue(bounds.x)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>{selectedElement ? "Y" : "Y conjunto"}</dt>
            <dd className="font-mono">{formatValue(bounds.y)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Largura</dt>
            <dd className="font-mono">{formatValue(bounds.width)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Altura</dt>
            <dd className="font-mono">{formatValue(bounds.height)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Rotação</dt>
            <dd className="font-mono">
              {selectedElement ? formatDegrees(selectedElement.rotation) : "—"}
            </dd>
          </div>
        </dl>
      )}
    </aside>
  );
}
