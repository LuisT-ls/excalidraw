import type { Viewport } from "../model/types";
import {
  loadScene as loadLegacyScene,
  parseScene,
  removeSavedScene,
  type PersistedScene,
} from "./sceneStorage";

export const BOARDS_INDEX_KEY = "whiteboard-boards-index";
export const CURRENT_BOARD_ID_KEY = "whiteboard-current-board-id";
export const BOARD_STORAGE_PREFIX = "whiteboard-board-";
export const DEFAULT_BOARD_NAME = "Quadro sem título";
export const MIGRATED_BOARD_NAME = "Meu quadro";
export const DEFAULT_BOARD_BACKGROUND = "#fafaf9";
export const DEFAULT_BOARD_VIEWPORT: Viewport = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

export interface BoardMetadata {
  id: string;
  name: string;
  updatedAt: number;
}

export interface InitializedBoards {
  boards: BoardMetadata[];
  currentBoardId: string;
  scene: PersistedScene;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function boardKey(id: string): string {
  return `${BOARD_STORAGE_PREFIX}${id}`;
}

function isBoardMetadata(value: unknown): value is BoardMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const metadata = value as Record<string, unknown>;
  return (
    typeof metadata.id === "string" &&
    metadata.id.length > 0 &&
    typeof metadata.name === "string" &&
    typeof metadata.updatedAt === "number" &&
    Number.isFinite(metadata.updatedAt)
  );
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `board-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createBoardMetadata(
  name = DEFAULT_BOARD_NAME,
  updatedAt = Date.now(),
  id = createId(),
): BoardMetadata {
  return {
    id,
    name: name.trim() || DEFAULT_BOARD_NAME,
    updatedAt,
  };
}

export function renameBoardInIndex(
  boards: BoardMetadata[],
  id: string,
  name: string,
  updatedAt = Date.now(),
): BoardMetadata[] {
  const nextName = name.trim() || DEFAULT_BOARD_NAME;

  return boards.map((board) =>
    board.id === id ? { ...board, name: nextName, updatedAt } : board,
  );
}

export function duplicateBoardMetadata(
  boards: BoardMetadata[],
  sourceId: string,
  name = "",
  updatedAt = Date.now(),
  id = createId(),
): BoardMetadata[] {
  const source = boards.find((board) => board.id === sourceId);

  if (!source) {
    return boards;
  }

  return [
    ...boards,
    createBoardMetadata(name || `${source.name} (cópia)`, updatedAt, id),
  ];
}

export function deleteBoardFromIndex(
  boards: BoardMetadata[],
  id: string,
): BoardMetadata[] {
  return boards.filter((board) => board.id !== id);
}

export function getMostRecentlyUpdatedBoard(
  boards: BoardMetadata[],
): BoardMetadata | null {
  return boards.reduce<BoardMetadata | null>(
    (mostRecent, board) =>
      !mostRecent || board.updatedAt > mostRecent.updatedAt
        ? board
        : mostRecent,
    null,
  );
}

function emptyScene(): PersistedScene {
  return {
    type: "whiteboard-scene",
    version: 1,
    elements: [],
    comments: [],
    viewport: { ...DEFAULT_BOARD_VIEWPORT },
    backgroundColor: DEFAULT_BOARD_BACKGROUND,
  };
}

function writeBoardScene(id: string, scene: PersistedScene): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(boardKey(id), JSON.stringify(scene));
  } catch (error) {
    console.warn("Não foi possível salvar o quadro no localStorage.", error);
  }
}

function writeIndex(boards: BoardMetadata[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(BOARDS_INDEX_KEY, JSON.stringify(boards));
  } catch (error) {
    console.warn("Não foi possível salvar o índice de quadros.", error);
  }
}

export function loadBoardsIndex(): BoardMetadata[] | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(BOARDS_INDEX_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isBoardMetadata)) {
      console.warn("Índice de quadros inválido; ele será recriado.");
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn("Não foi possível carregar o índice de quadros.", error);
    return null;
  }
}

export function saveBoardsIndex(boards: BoardMetadata[]): void {
  writeIndex(boards);
}

export function loadCurrentBoardId(): string | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(CURRENT_BOARD_ID_KEY);
  } catch (error) {
    console.warn("Não foi possível carregar o quadro atual.", error);
    return null;
  }
}

export function saveCurrentBoardId(id: string): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(CURRENT_BOARD_ID_KEY, id);
  } catch (error) {
    console.warn("Não foi possível salvar o quadro atual.", error);
  }
}

export function loadBoardScene(id: string): PersistedScene | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(boardKey(id));
    return raw ? parseScene(raw) : null;
  } catch (error) {
    console.warn("Não foi possível carregar o quadro.", error);
    return null;
  }
}

export function saveBoardScene(
  id: string,
  scene: PersistedScene,
  updatedAt = Date.now(),
): void {
  writeBoardScene(id, scene);

  const boards = loadBoardsIndex();
  if (!boards) {
    return;
  }

  const nextBoards = boards.map((board) =>
    board.id === id ? { ...board, updatedAt } : board,
  );
  writeIndex(nextBoards);
}

export function createBoard(
  name = DEFAULT_BOARD_NAME,
  scene: PersistedScene = emptyScene(),
): { metadata: BoardMetadata; scene: PersistedScene } {
  const metadata = createBoardMetadata(name);
  const boards = loadBoardsIndex() ?? [];
  writeBoardScene(metadata.id, scene);
  writeIndex([...boards, metadata]);

  return { metadata, scene };
}

export function duplicateBoard(
  sourceId: string,
  name = "",
): { metadata: BoardMetadata; scene: PersistedScene } | null {
  const boards = loadBoardsIndex() ?? [];
  const source = boards.find((board) => board.id === sourceId);
  if (!source) {
    return null;
  }

  const sourceScene = loadBoardScene(sourceId) ?? emptyScene();
  const metadata = createBoardMetadata(name || `${source.name} (cópia)`);
  writeBoardScene(metadata.id, sourceScene);
  writeIndex([...boards, metadata]);

  return { metadata, scene: sourceScene };
}

export function renameBoard(id: string, name: string): BoardMetadata[] {
  const boards = loadBoardsIndex() ?? [];
  const nextBoards = renameBoardInIndex(boards, id, name);
  writeIndex(nextBoards);
  return nextBoards;
}

export function deleteBoard(id: string): BoardMetadata[] {
  const storage = getStorage();
  const boards = loadBoardsIndex() ?? [];
  const nextBoards = deleteBoardFromIndex(boards, id);

  if (storage) {
    try {
      storage.removeItem(boardKey(id));
    } catch (error) {
      console.warn("Não foi possível remover o quadro.", error);
    }
  }

  writeIndex(nextBoards);
  return nextBoards;
}

export function initializeBoards(): InitializedBoards {
  let boards = loadBoardsIndex();

  if (boards === null) {
    const legacyScene = loadLegacyScene();
    const metadata = createBoardMetadata(
      legacyScene ? MIGRATED_BOARD_NAME : DEFAULT_BOARD_NAME,
    );
    const scene = legacyScene ?? emptyScene();

    writeBoardScene(metadata.id, scene);
    boards = [metadata];
    writeIndex(boards);
    saveCurrentBoardId(metadata.id);

    // The old key is intentionally removed after this one-time migration so
    // it cannot become a competing source of truth on later reloads.
    removeSavedScene();

    return {
      boards,
      currentBoardId: metadata.id,
      scene,
    };
  }

  if (boards.length === 0) {
    const created = createBoard();
    boards = [created.metadata];
    saveCurrentBoardId(created.metadata.id);
    return {
      boards,
      currentBoardId: created.metadata.id,
      scene: created.scene,
    };
  }

  let currentBoardId = loadCurrentBoardId();
  if (!currentBoardId || !boards.some((board) => board.id === currentBoardId)) {
    currentBoardId = getMostRecentlyUpdatedBoard(boards)!.id;
    saveCurrentBoardId(currentBoardId);
  }

  const loadedScene = loadBoardScene(currentBoardId);
  const scene = loadedScene ?? emptyScene();
  if (!loadedScene) {
    saveBoardScene(currentBoardId, scene);
  }

  return { boards, currentBoardId, scene };
}

export function getEmptyBoardScene(): PersistedScene {
  return emptyScene();
}

export function getBoardStorageKey(id: string): string {
  return boardKey(id);
}
