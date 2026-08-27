"use client";

import {
  ArrowRight,
  Circle,
  Eraser,
  Hand,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Maximize2,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Type,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";
import type { Tool } from "@/features/editor/model/types";
import {
  COLOR_PRESETS,
  STROKE_WIDTHS,
} from "@/features/editor/model/stylePresets";

const TOOL_OPTIONS: Array<{
  tool: Tool;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}> = [
  { tool: "select", label: "Selecionar", shortcut: "V/1", icon: MousePointer2 },
  { tool: "rectangle", label: "Retângulo", shortcut: "R", icon: Square },
  { tool: "ellipse", label: "Elipse", shortcut: "O", icon: Circle },
  { tool: "line", label: "Linha", shortcut: "L", icon: Minus },
  { tool: "arrow", label: "Seta", shortcut: "A", icon: ArrowRight },
  { tool: "text", label: "Texto", shortcut: "T", icon: Type },
  { tool: "pencil", label: "Lápis", shortcut: "P", icon: Pencil },
  { tool: "eraser", label: "Borracha", shortcut: "E", icon: Eraser },
  { tool: "hand", label: "Mão", shortcut: "H", icon: Hand },
];

const toolButtonClass =
  "relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
const activeToolClass =
  "bg-slate-900 text-white shadow-sm hover:bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100";

export function Toolbar() {
  const activeTool = useWhiteboardStore((state) => state.activeTool);
  const isReadOnly = useWhiteboardStore((state) => state.isReadOnly);
  const toolLocked = useWhiteboardStore((state) => state.toolLocked);
  const style = useWhiteboardStore((state) => state.style);
  const selectedElementIds = useWhiteboardStore(
    (state) => state.selectedElementIds,
  );
  const elements = useWhiteboardStore((state) => state.elements);
  const setActiveTool = useWhiteboardStore((state) => state.setActiveTool);
  const toggleToolLocked = useWhiteboardStore(
    (state) => state.toggleToolLocked,
  );
  const setStyle = useWhiteboardStore((state) => state.setStyle);
  const updateElement = useWhiteboardStore((state) => state.updateElement);
  const commitHistoryEntry = useWhiteboardStore(
    (state) => state.commitHistoryEntry,
  );
  const undo = useWhiteboardStore((state) => state.undo);
  const redo = useWhiteboardStore((state) => state.redo);
  const canUndo = useWhiteboardStore((state) => state.pastStates.length > 0);
  const canRedo = useWhiteboardStore(
    (state) => state.futureStates.length > 0,
  );

  const applyStyle = (patch: { strokeColor?: string; strokeWidth?: number }) => {
    setStyle(patch);

    const selectedElements = elements.filter((element) =>
      selectedElementIds.includes(element.id),
    );

    if (selectedElements.length === 0) {
      return;
    }

    const hasChanges = selectedElements.some(
      (element) =>
        (patch.strokeColor !== undefined &&
          element.strokeColor !== patch.strokeColor) ||
        (patch.strokeWidth !== undefined &&
          element.strokeWidth !== patch.strokeWidth),
    );

    if (hasChanges) {
      commitHistoryEntry();
      for (const element of selectedElements) {
        updateElement(element.id, patch);
      }
    }
  };

  const requestZoomToFit = () => {
    window.dispatchEvent(new Event("whiteboard:zoom-to-fit"));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <section
        aria-label="Ferramentas do quadro branco"
        className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/95"
      >
        <div className="flex flex-wrap items-center gap-0.5 border-r border-slate-200 pr-2 dark:border-slate-700">
          {TOOL_OPTIONS.map(({ tool, label, shortcut, icon: Icon }) => (
            <button
              key={tool}
              type="button"
              disabled={isReadOnly && tool !== "hand"}
              aria-label={label}
              aria-pressed={activeTool === tool}
              title={`${label} (${shortcut})`}
              onClick={() => setActiveTool(tool)}
              className={`${toolButtonClass} disabled:cursor-not-allowed disabled:opacity-40 ${
                activeTool === tool ? activeToolClass : ""
              }`}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span
                aria-hidden="true"
                className={`absolute bottom-0.5 right-0.5 rounded px-0.5 text-[8px] font-semibold leading-none ${
                  activeTool === tool
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {shortcut}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={isReadOnly}
          aria-label="Imagem"
          title="Inserir imagem"
          onClick={() => window.dispatchEvent(new Event("whiteboard:insert-image"))}
          className={`${toolButtonClass} border-r border-slate-200 pr-2 dark:border-slate-700 disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <ImageIcon size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>

        <button
          type="button"
          disabled={isReadOnly}
          aria-label={toolLocked ? "Desbloquear ferramenta" : "Bloquear ferramenta"}
          aria-pressed={toolLocked}
          title={toolLocked ? "Desbloquear ferramenta" : "Bloquear ferramenta"}
          onClick={toggleToolLocked}
          className={`${toolButtonClass} border-r border-slate-200 pr-2 dark:border-slate-700 disabled:cursor-not-allowed disabled:opacity-40 ${
            toolLocked ? "text-slate-900 dark:text-white" : ""
          }`}
        >
          {toolLocked ? (
            <Lock size={17} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <LockOpen size={17} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>

        <div className="flex items-center gap-1 border-r border-slate-200 pr-2 dark:border-slate-700">
          <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Cor
          </span>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color.value}
              type="button"
              disabled={isReadOnly}
              aria-label={`Cor ${color.label}`}
              aria-pressed={style.strokeColor === color.value}
              title={color.label}
              onClick={() => applyStyle({ strokeColor: color.value })}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40 ${
                style.strokeColor === color.value
                    ? "border-slate-900 ring-2 ring-slate-300 dark:border-white dark:ring-slate-600"
                    : "border-white shadow-sm dark:border-slate-700"
              }`}
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 border-r border-slate-200 pr-2 dark:border-slate-700">
          <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Traço
          </span>
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width.value}
              type="button"
              disabled={isReadOnly}
              aria-label={`Traço ${width.label}`}
              aria-pressed={style.strokeWidth === width.value}
              title={width.label}
              onClick={() => applyStyle({ strokeWidth: width.value })}
              className={`rounded-md px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                style.strokeWidth === width.value
                  ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {width.value}px
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Ajustar zoom ao conteúdo"
            title="Ajustar zoom ao conteúdo"
            onClick={requestZoomToFit}
            className={toolButtonClass}
          >
            <Maximize2 size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Desfazer"
            title="Desfazer (Ctrl/Cmd+Z)"
            disabled={isReadOnly || !canUndo}
            onClick={undo}
            className={`${toolButtonClass} disabled:cursor-not-allowed disabled:text-slate-300 dark:disabled:text-slate-600`}
          >
            <Undo2 size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Refazer"
            title="Refazer (Ctrl/Cmd+Shift+Z)"
            disabled={isReadOnly || !canRedo}
            onClick={redo}
            className={`${toolButtonClass} disabled:cursor-not-allowed disabled:text-slate-300`}
          >
            <Redo2 size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </section>

      {elements.length === 0 && (
        <p className="pointer-events-none text-center text-xs text-slate-500 drop-shadow-sm transition-colors duration-300 dark:text-slate-400">
          Para mover a tela, segure a roda do mouse ou a barra de espaço enquanto
          arrasta, ou use a ferramenta de mão.
        </p>
      )}
    </div>
  );
}
