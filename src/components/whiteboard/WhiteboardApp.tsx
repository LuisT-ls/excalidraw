"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";
import { Canvas } from "@/components/whiteboard/Canvas";
import { Menu } from "@/components/whiteboard/Menu";
import { LibraryPanel } from "@/components/whiteboard/LibraryPanel";
import { PropertiesPanel } from "@/components/whiteboard/PropertiesPanel";
import { SharedSceneBanner } from "@/components/whiteboard/SharedSceneBanner";
import { StatsPanel } from "@/components/whiteboard/StatsPanel";
import { Toolbar } from "@/components/whiteboard/Toolbar";
import { useEditorPreferencesStore } from "@/features/editor/store/useEditorPreferencesStore";

export function WhiteboardApp() {
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const isReadOnly = useWhiteboardStore((state) => state.isReadOnly);
  const setReadOnly = useWhiteboardStore((state) => state.setReadOnly);
  const hydrateEditorPreferences = useEditorPreferencesStore(
    (state) => state.hydrate,
  );
  const previousPresentationUiHiddenRef = useRef<boolean | null>(null);
  const previousPresentationReadOnlyRef = useRef<boolean | null>(null);
  const previousViewReadOnlyRef = useRef<boolean | null>(null);
  const isPresentationMode = isFullscreenMode;

  useEffect(() => {
    hydrateEditorPreferences();
  }, [hydrateEditorPreferences]);

  const restorePresentationState = useCallback(() => {
    const previousReadOnly = previousPresentationReadOnlyRef.current;
    const previousUiHidden = previousPresentationUiHiddenRef.current;

    if (previousReadOnly !== null) {
      setReadOnly(previousReadOnly);
      previousPresentationReadOnlyRef.current = null;
    }

    if (previousUiHidden !== null) {
      setIsUiHidden(previousUiHidden);
      previousPresentationUiHiddenRef.current = null;
    }
  }, [setReadOnly]);

  const exitPresentation = useCallback(() => {
    setIsFullscreenMode(false);
    restorePresentationState();

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // Sair da tela cheia pode ser bloqueado pelo navegador; a UI já foi restaurada.
      });
    }
  }, [restorePresentationState]);

  const enterPresentation = useCallback(() => {
    if (isPresentationMode) {
      return;
    }

    previousPresentationUiHiddenRef.current = isUiHidden;
    previousPresentationReadOnlyRef.current = isReadOnly;
    setIsUiHidden(true);
    setReadOnly(true);
    setIsFullscreenMode(true);

    if (typeof document.documentElement.requestFullscreen === "function") {
      void document.documentElement.requestFullscreen().catch(() => {
        // O modo sem bordas continua funcionando quando fullscreen não é permitido.
      });
    }
  }, [isFullscreenMode, isUiHidden, isReadOnly, setReadOnly]);

  const enterViewMode = useCallback(() => {
    if (isViewMode) {
      return;
    }

    previousViewReadOnlyRef.current = isReadOnly;
    setIsViewMode(true);
    setReadOnly(true);
  }, [isReadOnly, isViewMode, setReadOnly]);

  const exitViewMode = useCallback(() => {
    setIsViewMode(false);

    if (previousViewReadOnlyRef.current !== null) {
      setReadOnly(previousViewReadOnlyRef.current);
      previousViewReadOnlyRef.current = null;
    }
  }, [setReadOnly]);

  const toggleViewMode = useCallback(() => {
    if (isViewMode) {
      exitViewMode();
    } else {
      enterViewMode();
    }
  }, [enterViewMode, exitViewMode, isViewMode]);

  const toggleZenMode = useCallback(() => {
    if (!isFullscreenMode) {
      setIsUiHidden((hidden) => !hidden);
    }
  }, [isFullscreenMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (isPresentationMode && !document.fullscreenElement) {
        setIsFullscreenMode(false);
        restorePresentationState();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isPresentationMode, restorePresentationState]);

  useEffect(() => {
    if (!isPresentationMode && !isUiHidden && !isViewMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();

        if (isPresentationMode) {
          exitPresentation();
        } else if (isUiHidden) {
          setIsUiHidden(false);
        } else if (isViewMode) {
          exitViewMode();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    exitPresentation,
    exitViewMode,
    isPresentationMode,
    isUiHidden,
    isViewMode,
  ]);

  const hideUi = isUiHidden || isPresentationMode;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#fafaf9] dark:bg-slate-950">
      <Canvas isPresentationMode={isPresentationMode} />

      {!hideUi && (
        <>
          <SharedSceneBanner />
          <div className="absolute left-4 top-4 z-20">
            <Menu
              isViewMode={isViewMode}
              isZenMode={isUiHidden}
              onEnterPresentation={enterPresentation}
              onToggleStats={() => setShowStats((visible) => !visible)}
              onToggleViewMode={toggleViewMode}
              onToggleZen={toggleZenMode}
              showStats={showStats}
            />
          </div>
          <PropertiesPanel />
          {isLibraryOpen && (
            <LibraryPanel onClose={() => setIsLibraryOpen(false)} />
          )}
          {showStats && <StatsPanel />}
          <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
            <div className="pointer-events-auto">
              <Toolbar
                isLibraryOpen={isLibraryOpen}
                onToggleLibrary={() => setIsLibraryOpen((open) => !open)}
              />
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
