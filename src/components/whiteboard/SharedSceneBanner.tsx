"use client";

import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";
import { saveBoardScene } from "@/features/editor/persistence/boardStorage";

export function SharedSceneBanner() {
  const isReadOnly = useWhiteboardStore((state) => state.isReadOnly);
  const elements = useWhiteboardStore((state) => state.elements);
  const backgroundColor = useWhiteboardStore((state) => state.backgroundColor);
  const viewport = useWhiteboardStore((state) => state.viewport);
  const currentBoardId = useWhiteboardStore((state) => state.currentBoardId);
  const setReadOnly = useWhiteboardStore((state) => state.setReadOnly);
  const setActiveTool = useWhiteboardStore((state) => state.setActiveTool);

  if (!isReadOnly) {
    return null;
  }

  const duplicateToMyBoard = () => {
    if (currentBoardId) {
      saveBoardScene(currentBoardId, {
        type: "whiteboard-scene",
        version: 1,
        elements,
        backgroundColor,
        viewport,
      });
    }
    setReadOnly(false);
    setActiveTool("select");

    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div className="pointer-events-auto fixed inset-x-0 top-16 z-50 flex justify-center px-4 py-2">
      <div className="flex max-w-full items-center gap-3 rounded-full border border-blue-200 bg-blue-50/95 px-4 py-2 text-xs text-blue-900 shadow-lg backdrop-blur transition-colors duration-300 dark:border-blue-800 dark:bg-blue-950/95 dark:text-blue-100">
        <span>Você está vendo um link compartilhado, somente leitura.</span>
        <button
          type="button"
          onClick={duplicateToMyBoard}
          className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          Duplicar para o meu quadro
        </button>
      </div>
    </div>
  );
}
