import type { SceneElement, Viewport } from "../model/types";

export const SCENE_STORAGE_KEY = "whiteboard-scene-v1";

export interface PersistedScene {
  type: "whiteboard-scene";
  version: 1;
  elements: SceneElement[];
  viewport?: Viewport;
  backgroundColor?: string;
}

function isPersistedScene(value: unknown): value is PersistedScene {
  if (!value || typeof value !== "object") {
    return false;
  }

  const scene = value as Record<string, unknown>;
  if (
    scene.type === "whiteboard-scene" &&
    scene.version === 1 &&
    Array.isArray(scene.elements)
  ) {
    if (scene.viewport !== undefined) {
      const viewport = scene.viewport;

      if (!viewport || typeof viewport !== "object") {
        return false;
      }

      const viewportRecord = viewport as Record<string, unknown>;

      if (
        typeof viewportRecord.offsetX !== "number" ||
        typeof viewportRecord.offsetY !== "number" ||
        typeof viewportRecord.zoom !== "number"
      ) {
        return false;
      }
    }

    return (
      scene.backgroundColor === undefined ||
      typeof scene.backgroundColor === "string"
    );
  }

  return false;
}

export function parseScene(raw: string): PersistedScene | null {
  try {
    const parsedScene: unknown = JSON.parse(raw);

    if (!isPersistedScene(parsedScene)) {
      console.warn("Cena inválida; ela será ignorada.");
      return null;
    }

    return parsedScene;
  } catch (error) {
    console.warn("Não foi possível interpretar o JSON da cena.", error);
    return null;
  }
}

export function saveScene(scene: PersistedScene): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(scene));
  } catch (error) {
    console.warn("Não foi possível salvar a cena no localStorage.", error);
  }
}

export function loadScene(): PersistedScene | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const serializedScene = window.localStorage.getItem(SCENE_STORAGE_KEY);

    if (!serializedScene) {
      return null;
    }

    return parseScene(serializedScene);
  } catch (error) {
    console.warn("Não foi possível carregar a cena do localStorage.", error);
    return null;
  }
}

export function removeSavedScene(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(SCENE_STORAGE_KEY);
  } catch (error) {
    console.warn("Não foi possível remover a cena do localStorage.", error);
  }
}
