import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exampleElements } from "../editor/model/exampleScene";
import {
  LIBRARY_STORAGE_KEY,
  loadLibrary,
  saveLibrary,
} from "./libraryStorage";
import type { LibraryItem } from "./types";

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
});

describe("libraryStorage", () => {
  it("salva e carrega itens da biblioteca pessoal", () => {
    const item: LibraryItem = {
      id: "library-1",
      name: "Meu item",
      elements: exampleElements.slice(0, 1),
      thumbnail: "data:image/png;base64,thumb",
    };

    saveLibrary([item]);

    expect(window.localStorage.getItem(LIBRARY_STORAGE_KEY)).toContain(
      "library-1",
    );
    expect(loadLibrary()).toEqual([item]);
  });

  it("ignora uma biblioteca corrompida sem lançar exceção", () => {
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, "{not-json");

    expect(loadLibrary()).toEqual([]);
  });

  it("descarta entradas que não têm o formato de LibraryItem", () => {
    window.localStorage.setItem(
      LIBRARY_STORAGE_KEY,
      JSON.stringify([
        { id: "ok", name: "Ok", elements: [], thumbnail: "thumb" },
        { id: "missing-elements", name: "Inválido", thumbnail: "thumb" },
      ]),
    );

    expect(loadLibrary()).toHaveLength(1);
    expect(loadLibrary()[0].id).toBe("ok");
  });
});
