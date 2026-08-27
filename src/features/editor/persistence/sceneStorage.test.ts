import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exampleElements } from "../model/exampleScene";
import {
  SCENE_STORAGE_KEY,
  loadScene,
  parseScene,
  saveScene,
  type PersistedScene,
} from "./sceneStorage";

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: createMemoryStorage() },
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  vi.restoreAllMocks();
});

describe("sceneStorage", () => {
  const scene: PersistedScene = {
    type: "whiteboard-scene",
    version: 1,
    elements: exampleElements.slice(0, 1),
    comments: [
      {
        id: "comment-1",
        x: 84,
        y: 116,
        text: "Revisar esta área",
        createdAt: 1700000000000,
      },
    ],
    viewport: { offsetX: 42, offsetY: -18, zoom: 1.5 },
    backgroundColor: "#dbeafe",
  };

  it("salva e carrega uma cena preservando elementos e viewport", () => {
    saveScene(scene);

    expect(window.localStorage.getItem(SCENE_STORAGE_KEY)).toContain(
      "whiteboard-scene",
    );
    expect(loadScene()).toEqual(scene);
  });

  it("trata JSON inválido sem deixar a exceção subir", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    window.localStorage.setItem(SCENE_STORAGE_KEY, "{not-json");

    expect(loadScene()).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it.each([
    { type: "other", version: 1 },
    { type: "whiteboard-scene", version: 2 },
  ])("rejeita tipo ou versão inválidos: $type/$version", (metadata) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    window.localStorage.setItem(
      SCENE_STORAGE_KEY,
      JSON.stringify({
        ...metadata,
        elements: [],
        viewport: { offsetX: 0, offsetY: 0, zoom: 1 },
      }),
    );

    expect(loadScene()).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("faz parse de JSON de compartilhamento sem viewport", () => {
    const sharedScene = {
      type: "whiteboard-scene",
      version: 1,
      elements: exampleElements.slice(0, 1),
      backgroundColor: "#ffffff",
    };

    expect(parseScene(JSON.stringify(sharedScene))).toEqual(sharedScene);
  });

  it("rejeita JSON inválido no parser compartilhado", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(parseScene("{invalid-json")).toBeNull();
    expect(parseScene(JSON.stringify({ type: "whiteboard-scene", version: 1 }))).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("rejeita comentários com estrutura inválida", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(
      parseScene(
        JSON.stringify({
          type: "whiteboard-scene",
          version: 1,
          elements: [],
          comments: [{ id: "comment-1", x: "not-a-number" }],
        }),
      ),
    ).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
