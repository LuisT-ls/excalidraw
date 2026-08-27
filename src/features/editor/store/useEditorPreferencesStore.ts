import { create } from "zustand";
import type { MarqueeSelectionMode } from "../interaction/selection";

export const EDITOR_PREFERENCES_STORAGE_KEY = "whiteboard-editor-preferences";

interface EditorPreferencesState {
  marqueeSelectionMode: MarqueeSelectionMode;
  setMarqueeSelectionMode: (mode: MarqueeSelectionMode) => void;
  hydrate: () => void;
}

export const useEditorPreferencesStore = create<EditorPreferencesState>(
  (set) => ({
    marqueeSelectionMode: "overlap",

    setMarqueeSelectionMode: (marqueeSelectionMode) => {
      set({ marqueeSelectionMode });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          EDITOR_PREFERENCES_STORAGE_KEY,
          marqueeSelectionMode,
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
    },
  }),
);
