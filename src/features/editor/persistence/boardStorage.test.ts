import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exampleElements } from "../model/exampleScene";
import {
  BOARDS_INDEX_KEY,
  CURRENT_BOARD_ID_KEY,
  createBoard,
  createBoardMetadata,
  deleteBoardFromIndex,
  duplicateBoard,
  duplicateBoardMetadata,
  getBoardStorageKey,
  getMostRecentlyUpdatedBoard,
  initializeBoards,
  loadBoardScene,
  loadBoardsIndex,
  renameBoardInIndex,
  saveCurrentBoardId,
} from "./boardStorage";
import { SCENE_STORAGE_KEY } from "./sceneStorage";

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

describe("boardStorage", () => {
  it("migra a cena antiga para o primeiro quadro uma única vez", () => {
    const legacyScene = {
      type: "whiteboard-scene" as const,
      version: 1 as const,
      elements: exampleElements.slice(0, 1),
      viewport: { offsetX: 12, offsetY: -8, zoom: 1.4 },
      backgroundColor: "#dbeafe",
    };
    window.localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(legacyScene));

    const initialized = initializeBoards();

    expect(initialized.boards).toHaveLength(1);
    expect(initialized.boards[0].name).toBe("Meu quadro");
    expect(initialized.scene).toEqual(legacyScene);
    expect(window.localStorage.getItem(SCENE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(BOARDS_INDEX_KEY)).toContain(
      initialized.boards[0].id,
    );
    expect(window.localStorage.getItem(CURRENT_BOARD_ID_KEY)).toBe(
      initialized.currentBoardId,
    );

    const secondLoad = initializeBoards();
    expect(secondLoad.currentBoardId).toBe(initialized.currentBoardId);
    expect(secondLoad.scene).toEqual(legacyScene);
  });

  it("cria um quadro vazio quando não há cena antiga nem índice", () => {
    const initialized = initializeBoards();

    expect(initialized.boards).toHaveLength(1);
    expect(initialized.boards[0].name).toBe("Quadro sem título");
    expect(initialized.scene.elements).toEqual([]);
    expect(loadBoardScene(initialized.currentBoardId)).toEqual(initialized.scene);
  });

  it("carrega o quadro atual existente pelo índice", () => {
    const first = createBoard("Primeiro");
    const second = createBoard("Segundo", {
      type: "whiteboard-scene",
      version: 1,
      elements: exampleElements.slice(0, 2),
      viewport: { offsetX: 30, offsetY: 40, zoom: 2 },
      backgroundColor: "#fef3c7",
    });
    saveCurrentBoardId(second.metadata.id);

    const initialized = initializeBoards();

    expect(initialized.currentBoardId).toBe(second.metadata.id);
    expect(initialized.scene.elements).toHaveLength(2);
    expect(first.metadata.id).not.toBe(second.metadata.id);
  });

  it("cria, duplica e remove conteúdo de quadros separados", () => {
    const original = createBoard("Projeto");
    const duplicated = duplicateBoard(original.metadata.id);

    expect(duplicated?.metadata.name).toBe("Projeto (cópia)");
    expect(duplicated?.metadata.id).not.toBe(original.metadata.id);
    expect(loadBoardScene(duplicated!.metadata.id)).toEqual(original.scene);

    const index = loadBoardsIndex()!;
    expect(index.map((board) => board.name)).toEqual([
      "Projeto",
      "Projeto (cópia)",
    ]);
    expect(window.localStorage.getItem(getBoardStorageKey(original.metadata.id))).not.toBeNull();
    deleteBoardFromIndex(index, original.metadata.id);
    expect(loadBoardsIndex()).toEqual(index);
  });

  it("renomeia e encontra o quadro mais recentemente atualizado", () => {
    const boards = [
      createBoardMetadata("A", 10, "a"),
      createBoardMetadata("B", 20, "b"),
    ];

    expect(renameBoardInIndex(boards, "a", "  Renomeado  ", 30)).toEqual([
      { id: "a", name: "Renomeado", updatedAt: 30 },
      { id: "b", name: "B", updatedAt: 20 },
    ]);
    expect(duplicateBoardMetadata(boards, "a", "Cópia", 40, "c")).toEqual([
      ...boards,
      { id: "c", name: "Cópia", updatedAt: 40 },
    ]);
    expect(deleteBoardFromIndex(boards, "a")).toEqual([boards[1]]);
    expect(getMostRecentlyUpdatedBoard(boards)?.id).toBe("b");
  });
});
