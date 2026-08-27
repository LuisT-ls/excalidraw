import { cloneSceneElements } from "../editor/model/clone";
import type { LibraryItem } from "./types";

export const LIBRARY_STORAGE_KEY = "whiteboard-library";

function isLibraryItem(value: unknown): value is LibraryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.thumbnail === "string" &&
    Array.isArray(item.elements)
  );
}

export function cloneLibraryItem(item: LibraryItem): LibraryItem {
  return {
    id: item.id,
    name: item.name,
    thumbnail: item.thumbnail,
    elements: cloneSceneElements(item.elements),
  };
}

export function loadLibrary(): LibraryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("A biblioteca salva não é uma lista.");
    }

    return parsed.filter(isLibraryItem).map(cloneLibraryItem);
  } catch (error) {
    console.warn("Não foi possível carregar a biblioteca local.", error);
    return [];
  }
}

export function saveLibrary(items: LibraryItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      LIBRARY_STORAGE_KEY,
      JSON.stringify(items.map(cloneLibraryItem)),
    );
  } catch (error) {
    console.warn("Não foi possível salvar a biblioteca local.", error);
  }
}
