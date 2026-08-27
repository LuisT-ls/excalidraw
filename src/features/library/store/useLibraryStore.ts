import { create } from "zustand";
import { cloneLibraryItem, loadLibrary, saveLibrary } from "../libraryStorage";
import type { LibraryItem } from "../types";

interface LibraryState {
  personalItems: LibraryItem[];
  hydrated: boolean;
  hydrate: () => void;
  addPersonalItem: (item: LibraryItem) => void;
  removePersonalItem: (id: string) => void;
  renamePersonalItem: (id: string, name: string) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  personalItems: [],
  hydrated: false,

  hydrate: () =>
    set((state) =>
      state.hydrated
        ? state
        : { personalItems: loadLibrary(), hydrated: true },
    ),

  addPersonalItem: (item) =>
    set((state) => {
      const personalItems = [...state.personalItems, cloneLibraryItem(item)];
      saveLibrary(personalItems);
      return { personalItems, hydrated: true };
    }),

  removePersonalItem: (id) =>
    set((state) => {
      const personalItems = state.personalItems.filter((item) => item.id !== id);
      saveLibrary(personalItems);
      return { personalItems };
    }),

  renamePersonalItem: (id, name) =>
    set((state) => {
      const personalItems = state.personalItems.map((item) =>
        item.id === id ? { ...item, name } : item,
      );
      saveLibrary(personalItems);
      return { personalItems };
    }),
}));
