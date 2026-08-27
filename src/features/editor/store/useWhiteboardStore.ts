import { create } from "zustand";
import type {
  CornerStyle,
  ElementId,
  FillStyle,
  SceneElement,
  StrokeStyle,
  Tool,
  Viewport,
} from "../model/types";
import { cloneSceneElement, cloneSceneElements } from "../model/clone";
import {
  moveElementsByOneLayer,
  reorderElements,
} from "../interaction/elementActions";
import type { BoardMetadata } from "../persistence/boardStorage";

export interface EditorStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillColor: string | null;
  fillStyle: FillStyle;
  opacity: number;
  roughness: number;
  cornerStyle: CornerStyle;
}

export interface WhiteboardState {
  elements: SceneElement[];
  boards: BoardMetadata[];
  currentBoardId: string | null;
  selectedElementIds: ElementId[];
  activeTool: Tool;
  isReadOnly: boolean;
  toolLocked: boolean;
  style: EditorStyle;
  backgroundColor: string;
  viewport: Viewport;

  setElements: (elements: SceneElement[]) => void;
  setBoards: (boards: BoardMetadata[]) => void;
  setCurrentBoardId: (id: string | null) => void;
  addElement: (element: SceneElement) => void;
  updateElement: (id: ElementId, updates: Partial<SceneElement>) => void;
  removeElement: (id: ElementId) => void;
  setSelectedElementIds: (ids: ElementId[]) => void;
  setActiveTool: (tool: Tool) => void;
  setReadOnly: (readOnly: boolean) => void;
  setToolLocked: (locked: boolean) => void;
  toggleToolLocked: () => void;
  setStyle: (style: Partial<EditorStyle>) => void;
  setBackgroundColor: (backgroundColor: string) => void;
  moveElementToFront: (id: ElementId) => void;
  moveElementToBack: (id: ElementId) => void;
  moveElementsToFront: (ids: ElementId[]) => void;
  moveElementsToBack: (ids: ElementId[]) => void;
  moveElementsForward: (ids: ElementId[]) => void;
  moveElementsBackward: (ids: ElementId[]) => void;
  groupElements: (ids: ElementId[], groupId: string) => void;
  ungroupElements: (ids: ElementId[]) => void;
  setViewport: (
    viewport: Viewport | ((current: Viewport) => Viewport),
  ) => void;
  resetHistory: () => void;
  commitHistoryEntry: () => void;
  pastStates: SceneElement[][];
  futureStates: SceneElement[][];

  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY_SIZE = 50;

const initialStyle: EditorStyle = {
  strokeColor: "#1f2937",
  strokeWidth: 2.5,
  strokeStyle: "solid",
  fillColor: null,
  fillStyle: "none",
  opacity: 1,
  roughness: 1.4,
  cornerStyle: "sharp",
};

const initialViewport: Viewport = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

export const DEFAULT_BACKGROUND_COLOR = "#fafaf9";

export const useWhiteboardStore = create<WhiteboardState>((set) => ({
  elements: [],
  boards: [],
  currentBoardId: null,
  selectedElementIds: [],
  activeTool: "select",
  isReadOnly: false,
  toolLocked: false,
  style: initialStyle,
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
  viewport: initialViewport,
  pastStates: [],
  futureStates: [],

  setElements: (elements) => set({ elements: cloneSceneElements(elements) }),
  setBoards: (boards) => set({ boards: boards.map((board) => ({ ...board })) }),
  setCurrentBoardId: (currentBoardId) => set({ currentBoardId }),

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, cloneSceneElement(element)],
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((element) =>
        element.id === id
          ? cloneSceneElement({ ...element, ...updates } as SceneElement)
          : element,
      ),
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((element) => element.id !== id),
    })),

  setSelectedElementIds: (selectedElementIds) =>
    set({ selectedElementIds: [...selectedElementIds] }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setReadOnly: (isReadOnly) => set({ isReadOnly }),
  setToolLocked: (toolLocked) => set({ toolLocked }),
  toggleToolLocked: () => set((state) => ({ toolLocked: !state.toolLocked })),
  setStyle: (style) =>
    set((state) => ({ style: { ...state.style, ...style } })),
  setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
  moveElementToFront: (id) =>
    set((state) => {
      const elements = reorderElements(state.elements, id, "front");

      if (elements === state.elements) {
        return state;
      }

      return { elements };
    }),
  moveElementToBack: (id) =>
    set((state) => {
      const elements = reorderElements(state.elements, id, "back");

      if (elements === state.elements) {
        return state;
      }

      return { elements };
    }),
  moveElementsToFront: (ids) =>
    set((state) => {
      const elements = reorderElements(state.elements, ids, "front");

      if (elements === state.elements) {
        return state;
      }

      return { elements };
    }),
  moveElementsToBack: (ids) =>
    set((state) => {
      const elements = reorderElements(state.elements, ids, "back");

      if (elements === state.elements) {
        return state;
      }

      return { elements };
    }),
  moveElementsForward: (ids) =>
    set((state) => ({
      elements: moveElementsByOneLayer(state.elements, ids, "forward"),
    })),
  moveElementsBackward: (ids) =>
    set((state) => ({
      elements: moveElementsByOneLayer(state.elements, ids, "backward"),
    })),
  groupElements: (ids, groupId) =>
    set((state) => {
      const selectedIds = new Set(ids);

      return {
        elements: state.elements.map((element) =>
          selectedIds.has(element.id) ? { ...element, groupId } : element,
        ),
      };
    }),
  ungroupElements: (ids) =>
    set((state) => {
      const selectedIds = new Set(ids);
      const groupIds = new Set(
        state.elements
          .filter((element) => selectedIds.has(element.id) && element.groupId)
          .map((element) => element.groupId as string),
      );

      if (groupIds.size === 0) {
        return state;
      }

      return {
        elements: state.elements.map((element) =>
          element.groupId && groupIds.has(element.groupId)
            ? { ...element, groupId: null }
            : element,
        ),
      };
    }),
  setViewport: (viewport) =>
    set((state) => ({
      viewport:
        typeof viewport === "function" ? viewport(state.viewport) : viewport,
    })),

  resetHistory: () => set({ pastStates: [], futureStates: [] }),

  commitHistoryEntry: () =>
    set((state) => ({
      pastStates: [
        ...state.pastStates,
        cloneSceneElements(state.elements),
      ].slice(-MAX_HISTORY_SIZE),
      futureStates: [],
    })),

  undo: () =>
    set((state) => {
      if (state.pastStates.length === 0) {
        return state;
      }

      const previousElements = state.pastStates[state.pastStates.length - 1];

      return {
        elements: cloneSceneElements(previousElements),
        pastStates: state.pastStates.slice(0, -1),
        futureStates: [
          ...state.futureStates,
          cloneSceneElements(state.elements),
        ],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.futureStates.length === 0) {
        return state;
      }

      const nextElements = state.futureStates[state.futureStates.length - 1];

      return {
        elements: cloneSceneElements(nextElements),
        pastStates: [
          ...state.pastStates,
          cloneSceneElements(state.elements),
        ].slice(-MAX_HISTORY_SIZE),
        futureStates: state.futureStates.slice(0, -1),
      };
    }),
}));
