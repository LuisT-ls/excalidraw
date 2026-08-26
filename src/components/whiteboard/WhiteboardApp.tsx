"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";
import { Canvas } from "@/components/whiteboard/Canvas";
import { Menu } from "@/components/whiteboard/Menu";
import { PropertiesPanel } from "@/components/whiteboard/PropertiesPanel";
import { SharedSceneBanner } from "@/components/whiteboard/SharedSceneBanner";
import { Toolbar } from "@/components/whiteboard/Toolbar";

export function WhiteboardApp() {
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const isReadOnly = useWhiteboardStore((state) => state.isReadOnly);
  const setReadOnly = useWhiteboardStore((state) => state.setReadOnly);
  const previousReadOnlyRef = useRef<boolean | null>(null);

  const restoreReadOnlyState = useCallback(() => {
    const previousReadOnly = previousReadOnlyRef.current;

    if (previousReadOnly !== null) {
      setReadOnly(previousReadOnly);
      previousReadOnlyRef.current = null;
    }
  }, [setReadOnly]);

  const exitPresentation = useCallback(() => {
    setIsPresentationMode(false);
    restoreReadOnlyState();

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // Sair da tela cheia pode ser bloqueado pelo navegador; a UI já foi restaurada.
      });
    }
  }, [restoreReadOnlyState]);

  const enterPresentation = useCallback(() => {
    if (isPresentationMode) {
      return;
    }

    previousReadOnlyRef.current = isReadOnly;
    setReadOnly(true);
    setIsPresentationMode(true);

    if (typeof document.documentElement.requestFullscreen === "function") {
      void document.documentElement.requestFullscreen().catch(() => {
        // O modo sem bordas continua funcionando quando fullscreen não é permitido.
      });
    }
  }, [isPresentationMode, isReadOnly, setReadOnly]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (isPresentationMode && !document.fullscreenElement) {
        setIsPresentationMode(false);
        restoreReadOnlyState();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isPresentationMode, restoreReadOnlyState]);

  useEffect(() => {
    if (!isPresentationMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        exitPresentation();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exitPresentation, isPresentationMode]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#fafaf9] dark:bg-slate-950">
      <Canvas />

      {!isPresentationMode && (
        <>
          <SharedSceneBanner />
          <div className="absolute left-4 top-4 z-20">
            <Menu onEnterPresentation={enterPresentation} />
          </div>
          <PropertiesPanel />
          <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
            <div className="pointer-events-auto">
              <Toolbar />
            </div>
          </div>
        </>
      )}

      {isPresentationMode && (
        <button
          type="button"
          aria-label="Sair do modo apresentação"
          title="Sair do modo apresentação (Escape)"
          onClick={exitPresentation}
          className="fixed right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/10 text-slate-700/60 transition-colors hover:bg-slate-900/20 hover:text-slate-900 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20 dark:hover:text-white"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </main>
  );
}
