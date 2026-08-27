import { create } from "zustand";
import type { MarqueeSelectionMode } from "../interaction/selection";

export const EDITOR_PREFERENCES_STORAGE_KEY = "whiteboard-editor-preferences";
export const SHOW_GRID_STORAGE_KEY = "whiteboard-show-grid";
export const SNAP_TO_GRID_STORAGE_KEY = "whiteboard-snap-to-grid";

interface EditorPreferencesState {
  marqueeSelectionMode: MarqueeSelectionMode;
  showGrid: boolean;
  snapToGrid: boolean;
  setMarqueeSelectionMode: (mode: MarqueeSelectionMode) => void;
  setShowGrid: (showGrid: boolean) => void;
  setSnapToGrid: (snapToGrid: boolean) => void;
  hydrate: () => void;
}

export const useEditorPreferencesStore = create<EditorPreferencesState>(
  (set) => ({
    marqueeSelectionMode: "overlap",
    showGrid: false,
    snapToGrid: false,

    setMarqueeSelectionMode: (marqueeSelectionMode) => {
      set({ marqueeSelectionMode });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          EDITOR_PREFERENCES_STORAGE_KEY,
          marqueeSelectionMode,
        );
      }
    },

    setShowGrid: (showGrid) => {
      set({ showGrid });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(SHOW_GRID_STORAGE_KEY, String(showGrid));
      }
    },

    setSnapToGrid: (snapToGrid) => {
      set({ snapToGrid });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          SNAP_TO_GRID_STORAGE_KEY,
          String(snapToGrid),
        );
      }
    },

    hydrate: () => {
      if (typeof window === "undefined") {
        return;
      }

      const storedMode = window.localStorage.getItem(
        EDITOR_PREFERENCES_STORAGE_KEY,
      );

      if (storedMode === "overlap" || storedMode === "wrap") {
        set({ marqueeSelectionMode: storedMode });
      }

      set({
        showGrid: window.localStorage.getItem(SHOW_GRID_STORAGE_KEY) === "true",
        snapToGrid:
          window.localStorage.getItem(SNAP_TO_GRID_STORAGE_KEY) === "true",
      });
    },
  }),
);
