"use client";

import {
  useState,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  renderScene,
  type CursorIndicator,
} from "@/features/editor/rendering/renderScene";
import {
  ELEMENT_POP_DURATION_MS,
  FIT_VIEWPORT_DURATION_MS,
  easeOutCubic,
  interpolateViewport,
} from "@/features/editor/rendering/animation";
import { measureText } from "@/features/editor/rendering/measureText";
import {
  screenToWorld,
  worldToScreen,
} from "@/features/editor/interaction/coordinates";
import {
  createElementFromDrag,
  createFreehandElement,
  type DrawingTool,
  type ShapeDrawingTool,
} from "@/features/editor/interaction/createElement";
import { getEraserHitIds } from "@/features/editor/interaction/eraser";
import {
  drawEraseParticles,
  spawnEraseParticles,
  updateEraseParticles,
  type EraseParticle,
} from "@/features/editor/interaction/eraseParticles";
import {
  getLocalBounds,
  hitTestElement,
  localToWorldPoint,
  rotatePoint,
  worldToLocalPoint,
} from "@/features/editor/interaction/hitTesting";
import {
  calculateTextResizeFontSize,
  getEndpointHandlePoint,
  getOppositeResizeHandle,
  getResizeHandlePoint,
  resizeElement,
  resizeFreehandPoints,
  resizeLineElement,
  type EndpointHandle,
  type ResizeHandle,
} from "@/features/editor/interaction/resize";
import {
  calculateRotation,
  getRotationHandleGeometry,
  snapRotation,
} from "@/features/editor/interaction/rotation";
import {
  useWhiteboardStore,
  DEFAULT_BACKGROUND_COLOR,
  type EditorStyle,
} from "@/features/editor/store/useWhiteboardStore";
import {
  loadScene,
  removeSavedScene,
  saveScene,
} from "@/features/editor/persistence/sceneStorage";
import { loadSharedSceneFromLocation } from "@/features/editor/persistence/shareLink";
import { getSceneBounds } from "@/features/editor/interaction/sceneBounds";
import {
  generateElementId,
  generateSeed,
} from "@/features/editor/model/ids";
import { cloneSceneElement } from "@/features/editor/model/clone";
import { duplicateSceneElement } from "@/features/editor/interaction/elementActions";
import { ContextMenu } from "@/components/whiteboard/ContextMenu";
import {
  ActionMenuDivider,
  ActionMenuItem,
} from "@/components/ui/ActionMenu";
import {
  getElementsIntersectingBounds,
  normalizeSelectionBounds,
  toggleSelectedElement,
} from "@/features/editor/interaction/selection";
import {
  isDeletionKey,
  isTextInputTarget,
} from "@/features/editor/interaction/keyboard";
import { DEFAULT_TEXT_STYLE } from "@/features/editor/model/exampleScene";
import type {
  ElementId,
  Point,
  SceneElement,
  TextElement,
  Tool,
  Viewport,
} from "@/features/editor/model/types";

interface CanvasProps {
  backgroundColor?: string;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const DRAG_THRESHOLD_PX = 3;
const FREEHAND_SAMPLE_DISTANCE_WORLD = 2;
const RESIZE_HANDLE_HIT_RADIUS_PX = 10;
const DUPLICATE_OFFSET_WORLD = 20;
const FIT_PADDING_RATIO = 0.1;
const DOUBLE_POINTER_WINDOW_MS = 300;
const DOUBLE_POINTER_DISTANCE_PX = 10;

let clipboardElements: SceneElement[] = [];

function isDrawingTool(tool: Tool): tool is ShapeDrawingTool {
  return (
    tool === "rectangle" ||
    tool === "ellipse" ||
    tool === "line" ||
    tool === "arrow"
  );
}

interface DrawingInteraction {
  pointerId: number;
  startScreenX: number;
  startScreenY: number;
  startWorld: Point;
  tool: DrawingTool;
  style: EditorStyle;
  previewSeed: number;
  points: Point[];
  lastWorldPoint: Point;
}

interface TextEditingState {
  elementId: ElementId | null;
  worldPoint: Point;
  screenPoint: Point;
  viewportZoom: number;
  value: string;
  style: EditorStyle;
}

interface ResizeInteraction {
  pointerId: number;
  elementId: ElementId;
  handle: ResizeHandle | EndpointHandle;
  fixedCorner: Point | null;
}

type InteractionHandle = ResizeHandle | EndpointHandle | "rotate";

interface RotationInteraction {
  pointerId: number;
  elementId: ElementId;
  pivot: Point;
  initialHandlePoint: Point;
  initialRotation: number;
}

interface MarqueeInteraction {
  pointerId: number;
  startWorld: Point;
  currentWorld: Point;
  startScreen: Point;
  currentScreen: Point;
  shiftKey: boolean;
}

interface MoveInteraction {
  pointerId: number;
  startScreenX: number;
  startScreenY: number;
  startWorld: Point;
  hitElementId: ElementId | null;
  targetIds: ElementId[];
  initialPositions: Record<ElementId, Point>;
  selectionBefore: ElementId[];
  shiftKey: boolean;
  didDrag: boolean;
  historyCommitted: boolean;
}

interface LastSelectPointerDown {
  timestamp: number;
  screenPoint: Point;
  elementId: ElementId | null;
}

interface ContextMenuState {
  kind: "element" | "empty";
  position: Point;
  worldPoint: Point;
}

const RESIZE_HANDLES: ResizeHandle[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

function appendFreehandPoint(
  drawing: DrawingInteraction,
  point: Point,
  force = false,
) {
  const distance = Math.hypot(
    point.x - drawing.lastWorldPoint.x,
    point.y - drawing.lastWorldPoint.y,
  );

  if (distance === 0 || (!force && distance < FREEHAND_SAMPLE_DISTANCE_WORLD)) {
    return;
  }

  drawing.points.push({
    x: point.x - drawing.startWorld.x,
    y: point.y - drawing.startWorld.y,
  });
  drawing.lastWorldPoint = point;
}

function freehandExtent(points: Point[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export function Canvas({
  backgroundColor: backgroundColorProp,
}: CanvasProps) {
  const elements = useWhiteboardStore((state) => state.elements);
  const selectedElementIds = useWhiteboardStore(
    (state) => state.selectedElementIds,
  );
  const activeTool = useWhiteboardStore((state) => state.activeTool);
  const toolLocked = useWhiteboardStore((state) => state.toolLocked);
  const isReadOnly = useWhiteboardStore((state) => state.isReadOnly);
  const style = useWhiteboardStore((state) => state.style);
  const storeBackgroundColor = useWhiteboardStore(
    (state) => state.backgroundColor,
  );
  const viewport = useWhiteboardStore((state) => state.viewport);
  const setSelectedElementIds = useWhiteboardStore(
    (state) => state.setSelectedElementIds,
  );
  const setViewport = useWhiteboardStore((state) => state.setViewport);
  const setElements = useWhiteboardStore((state) => state.setElements);
  const setBackgroundColor = useWhiteboardStore(
    (state) => state.setBackgroundColor,
  );
  const setActiveTool = useWhiteboardStore((state) => state.setActiveTool);
  const setReadOnly = useWhiteboardStore((state) => state.setReadOnly);
  const updateElement = useWhiteboardStore((state) => state.updateElement);
  const addElement = useWhiteboardStore((state) => state.addElement);
  const removeElement = useWhiteboardStore((state) => state.removeElement);
  const moveElementsToFront = useWhiteboardStore(
    (state) => state.moveElementsToFront,
  );
  const moveElementsToBack = useWhiteboardStore(
    (state) => state.moveElementsToBack,
  );
  const moveElementsForward = useWhiteboardStore(
    (state) => state.moveElementsForward,
  );
  const moveElementsBackward = useWhiteboardStore(
    (state) => state.moveElementsBackward,
  );
  const commitHistoryEntry = useWhiteboardStore(
    (state) => state.commitHistoryEntry,
  );
  const undo = useWhiteboardStore((state) => state.undo);
  const redo = useWhiteboardStore((state) => state.redo);
  const backgroundColor =
    backgroundColorProp ?? storeBackgroundColor ?? DEFAULT_BACKGROUND_COLOR;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elementsRef = useRef(elements);
  const selectedElementIdsRef = useRef<ElementId[]>(selectedElementIds);
  const backgroundColorRef = useRef(backgroundColor);
  const viewportRef = useRef<Viewport>(viewport);
  const activeToolRef = useRef<Tool>(activeTool);
  const isReadOnlyRef = useRef(isReadOnly);
  const styleRef = useRef(style);
  const recentlyCreatedElementsRef = useRef<Map<ElementId, number>>(new Map());
  const cursorWorldPointRef = useRef<Point | null>(null);
  const viewportTransitionRef = useRef<number | null>(null);
  const spacePressedRef = useRef(false);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const interactionRef = useRef<MoveInteraction | null>(null);
  const marqueeRef = useRef<MarqueeInteraction | null>(null);
  const drawingRef = useRef<DrawingInteraction | null>(null);
  const draftElementRef = useRef<SceneElement | null>(null);
  const eraserRef = useRef<{
    pointerId: number;
    removedIds: Set<ElementId>;
    historyCommitted: boolean;
  } | null>(null);
  const eraseParticlesRef = useRef<EraseParticle[]>([]);
  const [textEditing, setTextEditing] = useState<TextEditingState | null>(
    null,
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
    null,
  );
  const textEditingRef = useRef<TextEditingState | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [hoveredResizeHandle, setHoveredResizeHandle] =
    useState<InteractionHandle | null>(null);
  const resizeRef = useRef<ResizeInteraction | null>(null);
  const rotationRef = useRef<RotationInteraction | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const lastSelectPointerDownRef = useRef<LastSelectPointerDown | null>(
    null,
  );

  elementsRef.current = elements;
  selectedElementIdsRef.current = selectedElementIds;
  backgroundColorRef.current = backgroundColor;
  activeToolRef.current = activeTool;
  isReadOnlyRef.current = isReadOnly;
  styleRef.current = style;

  const registerCreatedElement = (id: ElementId) => {
    recentlyCreatedElementsRef.current.set(id, performance.now());
  };

  useEffect(() => {
    if (!panRef.current) {
      viewportRef.current = viewport;
    }
  }, [viewport]);

  useEffect(() => {
    let disposed = false;

    const loadInitialScene = async () => {
      const shared = await loadSharedSceneFromLocation();

      if (disposed) {
        return;
      }

      if (shared.found && shared.scene) {
        setElements(shared.scene.elements);
        setSelectedElementIds([]);
        setBackgroundColor(
          shared.scene.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
        );
        setReadOnly(true);
      } else {
        if (shared.found) {
          window.alert("O link compartilhado é inválido ou está corrompido.");
        }

        const persistedScene = loadScene();

        if (persistedScene) {
          setElements(persistedScene.elements);
          if (persistedScene.viewport) {
            setViewport(persistedScene.viewport);
          }
          if (persistedScene.backgroundColor) {
            setBackgroundColor(persistedScene.backgroundColor);
          }
        }
      }
    };

    void loadInitialScene();

    let saveTimeout: number | null = null;

    const scheduleSave = () => {
      if (saveTimeout !== null) {
        window.clearTimeout(saveTimeout);
      }

      saveTimeout = window.setTimeout(() => {
        const state = useWhiteboardStore.getState();

        if (state.isReadOnly) {
          saveTimeout = null;
          return;
        }

        if (
          state.elements.length === 0 &&
          state.backgroundColor === DEFAULT_BACKGROUND_COLOR
        ) {
          removeSavedScene();
        } else {
          saveScene({
            type: "whiteboard-scene",
            version: 1,
            elements: state.elements,
            viewport: state.viewport,
            backgroundColor: state.backgroundColor,
          });
        }

        saveTimeout = null;
      }, 500);
    };

    const unsubscribe = useWhiteboardStore.subscribe((state, previousState) => {
      if (
        state.elements !== previousState.elements ||
        state.viewport !== previousState.viewport ||
        state.backgroundColor !== previousState.backgroundColor
      ) {
        scheduleSave();
      }
    });

    return () => {
      unsubscribe();
      if (saveTimeout !== null) {
        window.clearTimeout(saveTimeout);
      }
    };
  }, [
    setBackgroundColor,
    setElements,
    setReadOnly,
    setSelectedElementIds,
    setViewport,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const devicePixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    let animationFrameId = 0;

    let previousFrameTime: number | null = null;

    const draw = (timestamp: number) => {
      const context = canvas.getContext("2d");
      const elapsedMs =
        previousFrameTime === null ? 0 : timestamp - previousFrameTime;
      previousFrameTime = timestamp;
      eraseParticlesRef.current = updateEraseParticles(
        eraseParticlesRef.current,
        elapsedMs,
      );

      for (const [id, createdAt] of recentlyCreatedElementsRef.current) {
        if (timestamp - createdAt >= ELEMENT_POP_DURATION_MS) {
          recentlyCreatedElementsRef.current.delete(id);
        }
      }

      if (context) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const viewport = viewportRef.current;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = backgroundColorRef.current;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // As dimensões do canvas estão em pixels físicos, mas o scene graph
        // usa pixels CSS no espaço do mundo. Esta transformação combina DPR,
        // zoom e pan antes que qualquer elemento seja renderizado.
        context.setTransform(
          devicePixelRatio * viewport.zoom,
          0,
          0,
          devicePixelRatio * viewport.zoom,
          devicePixelRatio * viewport.offsetX,
          devicePixelRatio * viewport.offsetY,
        );
        renderScene(
          context,
          elementsRef.current,
          selectedElementIdsRef.current,
          draftElementRef.current,
          viewport.zoom,
          marqueeRef.current
            ? {
                start: marqueeRef.current.startWorld,
                end: marqueeRef.current.currentWorld,
              }
            : null,
          {
            currentTime: timestamp,
            recentlyCreatedAt: recentlyCreatedElementsRef.current,
            cursorIndicator:
              cursorWorldPointRef.current &&
              (activeToolRef.current === "pencil" ||
                activeToolRef.current === "eraser")
                ? ({
                    point: cursorWorldPointRef.current,
                    radius:
                      activeToolRef.current === "eraser"
                        ? Math.max(styleRef.current.strokeWidth / 2, 6)
                        : Math.max(styleRef.current.strokeWidth / 2, 1),
                    color:
                      activeToolRef.current === "eraser"
                        ? "#64748b"
                        : styleRef.current.strokeColor,
                    pulsing: activeToolRef.current === "eraser",
                  } satisfies CursorIndicator)
                : undefined,
          },
        );
        drawEraseParticles(context, eraseParticlesRef.current);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (viewportTransitionRef.current !== null) {
        cancelAnimationFrame(viewportTransitionRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const handleZoomToFit = () => {
      if (textEditingRef.current || !canvasRef.current) {
        return;
      }

      const currentElements = elementsRef.current;

      if (currentElements.length === 0) {
        return;
      }

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const bounds = getSceneBounds(currentElements);

      if (!bounds) {
        return;
      }

      const usableWidth = Math.max(1, canvasRect.width * (1 - FIT_PADDING_RATIO * 2));
      const usableHeight = Math.max(1, canvasRect.height * (1 - FIT_PADDING_RATIO * 2));
      const contentWidth = Math.max(bounds.width, 1);
      const contentHeight = Math.max(bounds.height, 1);
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          Math.min(usableWidth / contentWidth, usableHeight / contentHeight),
        ),
      );
      const nextViewport = {
        zoom: nextZoom,
        offsetX: canvasRect.width / 2 - (bounds.x + bounds.width / 2) * nextZoom,
        offsetY: canvasRect.height / 2 - (bounds.y + bounds.height / 2) * nextZoom,
      };

      if (viewportTransitionRef.current !== null) {
        cancelAnimationFrame(viewportTransitionRef.current);
      }

      const startViewport = { ...viewportRef.current };
      const startedAt = performance.now();
      const animateViewport = (timestamp: number) => {
        const progress = Math.min(
          1,
          (timestamp - startedAt) / FIT_VIEWPORT_DURATION_MS,
        );
        const easedProgress = easeOutCubic(progress);
        const interpolated = interpolateViewport(
          startViewport,
          nextViewport,
          easedProgress,
        );

        viewportRef.current = interpolated;
        setViewport(interpolated);

        if (progress < 1) {
          viewportTransitionRef.current = requestAnimationFrame(animateViewport);
        } else {
          viewportTransitionRef.current = null;
        }
      };

      viewportTransitionRef.current = requestAnimationFrame(animateViewport);
    };

    window.addEventListener("whiteboard:zoom-to-fit", handleZoomToFit);

    return () => {
      window.removeEventListener("whiteboard:zoom-to-fit", handleZoomToFit);
    };
  }, [setViewport]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) {
        return;
      }

      const isModifierPressed = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (isReadOnlyRef.current) {
        if (!isModifierPressed && !event.altKey && key === "h") {
          event.preventDefault();
          setActiveTool("hand");
        }

        if (event.code === "Space") {
          spacePressedRef.current = true;
        }

        return;
      }

      if (isModifierPressed && key === "z") {
        event.preventDefault();

        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }

        return;
      }

      if (isModifierPressed && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (isDeletionKey(event.key)) {
        const selectedIds = selectedElementIdsRef.current.filter((id) =>
          elementsRef.current.some((element) => element.id === id),
        );

        if (selectedIds.length > 0) {
          event.preventDefault();
          commitHistoryEntry();
          for (const id of selectedIds) {
            removeElement(id);
          }
          selectedElementIdsRef.current = [];
          setSelectedElementIds([]);
        }

        return;
      }

      if (isModifierPressed && key === "d") {
        event.preventDefault();
        const selected = elementsRef.current.filter((element) =>
          selectedElementIdsRef.current.includes(element.id),
        );

        if (selected.length > 0) {
          const duplicates = selected.map((element) =>
            duplicateSceneElement(
              element,
              generateElementId(),
              generateSeed(),
              DUPLICATE_OFFSET_WORLD,
            ),
          );

          commitHistoryEntry();
          for (const duplicate of duplicates) {
            addElement(duplicate);
          }
          setSelectedElementIds(duplicates.map((element) => element.id));
        }

        return;
      }

      if (isModifierPressed && key === "c") {
        event.preventDefault();
        clipboardElements = elementsRef.current
          .filter((element) => selectedElementIdsRef.current.includes(element.id))
          .map((element) => cloneSceneElement(element));
        return;
      }

      if (isModifierPressed && key === "v") {
        event.preventDefault();

        if (clipboardElements.length > 0) {
          const pasted = clipboardElements.map((element) =>
            duplicateSceneElement(
              element,
              generateElementId(),
              generateSeed(),
              DUPLICATE_OFFSET_WORLD,
            ),
          );

          commitHistoryEntry();
          for (const element of pasted) {
            addElement(element);
          }
          setSelectedElementIds(pasted.map((element) => element.id));
        }

        return;
      }

      if (isModifierPressed && key === "a") {
        event.preventDefault();
        const ids = elementsRef.current.map((element) => element.id);
        selectedElementIdsRef.current = ids;
        setSelectedElementIds(ids);
        return;
      }

      if (
        isModifierPressed &&
        event.shiftKey &&
        (event.code === "BracketRight" || event.code === "BracketLeft")
      ) {
        const selectedIds = selectedElementIdsRef.current;
        const selectedIndexes = elementsRef.current
          .map((element, index) =>
            selectedIds.includes(element.id) ? index : -1,
          )
          .filter((index) => index >= 0);
        const isMovingFront = event.code === "BracketRight";
        const canMove = isMovingFront
          ? selectedIndexes.length > 0 &&
            selectedIndexes[selectedIndexes.length - 1] <
              elementsRef.current.length - 1
          : selectedIndexes.length > 0 && selectedIndexes[0] > 0;

        if (selectedIds.length > 0 && canMove) {
          event.preventDefault();
          commitHistoryEntry();
          if (isMovingFront) {
            moveElementsToFront(selectedIds);
          } else {
            moveElementsToBack(selectedIds);
          }
        }

        return;
      }

      if (!isModifierPressed && !event.altKey) {
        const toolByKey: Record<string, Tool> = {
          v: "select",
          "1": "select",
          r: "rectangle",
          o: "ellipse",
          l: "line",
          a: "arrow",
          t: "text",
          p: "pencil",
          e: "eraser",
          h: "hand",
        };
        const nextTool = toolByKey[key];

        if (nextTool) {
          event.preventDefault();
          setActiveTool(nextTool);
          return;
        }
      }

      if (event.code === "Space") {
        spacePressedRef.current = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spacePressedRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    addElement,
    commitHistoryEntry,
    moveElementsToBack,
    moveElementsToFront,
    redo,
    setActiveTool,
    setSelectedElementIds,
    undo,
  ]);

  const getCanvasPoint = (event: {
    clientX: number;
    clientY: number;
    currentTarget: HTMLCanvasElement;
  }): Point => {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const findElementAtPoint = (point: Point) => {
    const currentElements = elementsRef.current;

    for (let index = currentElements.length - 1; index >= 0; index -= 1) {
      const element = currentElements[index];

      if (hitTestElement(element, point)) {
        return element;
      }
    }

    return null;
  };

  const duplicateSelectedFromContext = () => {
    const selected = elementsRef.current.filter((element) =>
      selectedElementIdsRef.current.includes(element.id),
    );

    if (selected.length === 0) {
      return;
    }

    const duplicates = selected.map((element) =>
      duplicateSceneElement(
        element,
        generateElementId(),
        generateSeed(),
        DUPLICATE_OFFSET_WORLD,
      ),
    );

    commitHistoryEntry();
    for (const duplicate of duplicates) {
      addElement(duplicate);
    }
    setSelectedElementIds(duplicates.map((element) => element.id));
  };

  const copySelectedFromContext = () => {
    clipboardElements = elementsRef.current
      .filter((element) => selectedElementIdsRef.current.includes(element.id))
      .map((element) => cloneSceneElement(element));
  };

  const pasteFromContext = (worldPoint: Point) => {
    if (clipboardElements.length === 0) {
      return;
    }

    const clipboardBounds = getSceneBounds(clipboardElements);
    const offset: Point = clipboardBounds
      ? {
          x: worldPoint.x - clipboardBounds.x,
          y: worldPoint.y - clipboardBounds.y,
        }
      : { x: DUPLICATE_OFFSET_WORLD, y: DUPLICATE_OFFSET_WORLD };
    const pasted = clipboardElements.map((element) =>
      duplicateSceneElement(
        element,
        generateElementId(),
        generateSeed(),
        offset,
      ),
    );

    commitHistoryEntry();
    for (const element of pasted) {
      addElement(element);
    }
    setSelectedElementIds(pasted.map((element) => element.id));
  };

  const deleteSelectedFromContext = () => {
    const selectedIds = selectedElementIdsRef.current.filter((id) =>
      elementsRef.current.some((element) => element.id === id),
    );

    if (selectedIds.length === 0) {
      return;
    }

    commitHistoryEntry();
    for (const id of selectedIds) {
      removeElement(id);
    }
    setSelectedElementIds([]);
  };

  const reorderSelectedFromContext = (
    direction: "front" | "back" | "forward" | "backward",
  ) => {
    const selectedIds = selectedElementIdsRef.current;

    if (selectedIds.length === 0) {
      return;
    }

    commitHistoryEntry();
    if (direction === "front") {
      moveElementsToFront(selectedIds);
    } else if (direction === "back") {
      moveElementsToBack(selectedIds);
    } else if (direction === "forward") {
      moveElementsForward(selectedIds);
    } else {
      moveElementsBackward(selectedIds);
    }
  };

  const selectAllFromContext = () => {
    setSelectedElementIds(elementsRef.current.map((element) => element.id));
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (
      isReadOnlyRef.current ||
      activeToolRef.current !== "select" ||
      textEditingRef.current
    ) {
      return;
    }

    event.preventDefault();

    const screenPoint = getCanvasPoint(event);
    const worldPoint = screenToWorld(screenPoint, viewportRef.current);
    const hitElement = findElementAtPoint(worldPoint);

    if (hitElement) {
      if (!selectedElementIdsRef.current.includes(hitElement.id)) {
        selectedElementIdsRef.current = [hitElement.id];
        setSelectedElementIds([hitElement.id]);
      }
      setContextMenu({ kind: "element", position: screenPoint, worldPoint });
      return;
    }

    selectedElementIdsRef.current = [];
    setSelectedElementIds([]);
    setContextMenu({ kind: "empty", position: screenPoint, worldPoint });
  };

  const findSelectedSingleElement = () => {
    if (selectedElementIdsRef.current.length !== 1) {
      return null;
    }

    return elementsRef.current.find(
      (element) => element.id === selectedElementIdsRef.current[0],
    );
  };

  const isCornerResizeElement = (element: SceneElement) =>
    element.type === "rectangle" ||
    element.type === "ellipse" ||
    element.type === "freehand" ||
    element.type === "text";

  const findInteractionHandleAtScreenPoint = (
    screenPoint: Point,
  ): InteractionHandle | null => {
    const selected = findSelectedSingleElement();

    if (!selected) {
      return null;
    }

    const isNearScreenPoint = (worldPoint: Point, radius = RESIZE_HANDLE_HIT_RADIUS_PX) => {
      const handleScreenPoint = worldToScreen(worldPoint, viewportRef.current);

      return (
        Math.abs(screenPoint.x - handleScreenPoint.x) <= radius &&
        Math.abs(screenPoint.y - handleScreenPoint.y) <= radius
      );
    };

    const rotationHandle = getRotationHandleGeometry(
      selected,
      30 / viewportRef.current.zoom,
    );

    if (isNearScreenPoint(rotationHandle.handle)) {
      return "rotate";
    }

    if (selected.type === "line" || selected.type === "arrow") {
      if (isNearScreenPoint(getEndpointHandlePoint(selected, "start"))) {
        return "start";
      }
      if (isNearScreenPoint(getEndpointHandlePoint(selected, "end"))) {
        return "end";
      }
      return null;
    }

    if (!isCornerResizeElement(selected)) {
      return null;
    }

    const localBounds = getLocalBounds(selected);

    for (const handle of RESIZE_HANDLES) {
      if (
        isNearScreenPoint(
          localToWorldPoint(
            selected,
            getResizeHandlePoint(localBounds, handle),
          ),
        )
      ) {
        return handle;
      }
    }

    return null;
  };

  const updateHoveredResizeHandle = (screenPoint: Point) => {
    const nextHandle =
      useWhiteboardStore.getState().activeTool === "select"
        ? findInteractionHandleAtScreenPoint(screenPoint)
        : null;

    setHoveredResizeHandle((currentHandle) =>
      currentHandle === nextHandle ? currentHandle : nextHandle,
    );
  };

  const eraseAtPoint = (point: Point) => {
    const eraser = eraserRef.current;

    if (!eraser) {
      return;
    }

    const hitIds = getEraserHitIds(
      elementsRef.current,
      point,
      eraser.removedIds,
    );

    if (hitIds.length === 0) {
      return;
    }

    if (!eraser.historyCommitted) {
      commitHistoryEntry();
      eraser.historyCommitted = true;
    }

    for (const id of hitIds) {
      const element = elementsRef.current.find((candidate) => candidate.id === id);

      if (element) {
        eraseParticlesRef.current = spawnEraseParticles(
          eraseParticlesRef.current,
          element,
        );
      }

      eraser.removedIds.add(id);
      removeElement(id);

      if (selectedElementIdsRef.current.includes(id)) {
        const nextSelectedIds = selectedElementIdsRef.current.filter(
          (selectedId) => selectedId !== id,
        );
        selectedElementIdsRef.current = nextSelectedIds;
        setSelectedElementIds(nextSelectedIds);
      }
    }
  };

  const finishTextEditing = (shouldCommit: boolean) => {
    const editing = textEditingRef.current;

    if (!editing) {
      return;
    }

    textEditingRef.current = null;
    setTextEditing(null);

    if (!shouldCommit || editing.value.trim().length === 0) {
      setActiveTool("select");
      return;
    }

    const textStyle = editing.elementId
      ? elementsRef.current.find((element) => element.id === editing.elementId)
      : null;
    const fontSize =
      textStyle?.type === "text"
        ? textStyle.fontSize
        : DEFAULT_TEXT_STYLE.fontSize;
    const fontFamily =
      textStyle?.type === "text"
        ? textStyle.fontFamily
        : DEFAULT_TEXT_STYLE.fontFamily;
    const metrics = measureText(editing.value, fontSize, fontFamily);

    if (editing.elementId && textStyle?.type !== "text") {
      setActiveTool("select");
      return;
    }

    commitHistoryEntry();

    if (editing.elementId && textStyle?.type === "text") {
      updateElement(editing.elementId, {
        text: editing.value,
        width: metrics.width,
        height: metrics.height,
      });
      setSelectedElementIds([editing.elementId]);
    } else if (!editing.elementId) {
      const element: TextElement = {
        id: generateElementId(),
        type: "text",
        x: editing.worldPoint.x,
        y: editing.worldPoint.y,
        rotation: 0,
        strokeColor: editing.style.strokeColor,
        strokeWidth: editing.style.strokeWidth,
        strokeStyle: editing.style.strokeStyle,
        fillColor: null,
        fillStyle: "none",
        opacity: editing.style.opacity,
        seed: generateSeed(),
        roughness: editing.style.roughness,
        text: editing.value,
        width: metrics.width,
        height: metrics.height,
        ...DEFAULT_TEXT_STYLE,
      };

      addElement(element);
      registerCreatedElement(element.id);
      setSelectedElementIds([element.id]);
    }

    if (editing.elementId || !toolLocked) {
      setActiveTool("select");
    }
  };

  const beginTextEditing = (
    worldPoint: Point,
    screenPoint: Point,
    value = "",
    elementId: ElementId | null = null,
    editingStyle = style,
  ) => {
    const editing: TextEditingState = {
      elementId,
      worldPoint,
      screenPoint,
      viewportZoom: viewportRef.current.zoom,
      value,
      style: editingStyle,
    };

    textEditingRef.current = editing;
    setTextEditing(editing);

    if (!elementId) {
      setSelectedElementIds([]);
    }
  };

  const handleTextChange = (value: string) => {
    const editing = textEditingRef.current;

    if (!editing) {
      return;
    }

    const nextEditing = { ...editing, value };
    textEditingRef.current = nextEditing;
    setTextEditing(nextEditing);
  };

  useEffect(() => {
    if (textEditing) {
      textInputRef.current?.focus();
    }
  }, [textEditing]);

  const openTextElementForEditing = (element: TextElement) => {
    selectedElementIdsRef.current = [element.id];
    setSelectedElementIds([element.id]);
    beginTextEditing(
      { x: element.x, y: element.y },
      worldToScreen({ x: element.x, y: element.y }, viewportRef.current),
      element.text,
      element.id,
      {
        ...style,
        strokeColor: element.strokeColor,
        strokeWidth: element.strokeWidth,
      },
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (
      activePointerIdRef.current !== null &&
      activePointerIdRef.current !== event.pointerId
    ) {
      event.preventDefault();
      return;
    }

    if (textEditingRef.current) {
      // O textarea fica sobre o canvas e pode manter o foco durante o próximo
      // gesto. Forçamos o blur antes de processar o pointerdown para que um
      // editor vazio seja cancelado e o clique atual possa iniciar outro gesto.
      textInputRef.current?.blur();

      if (textEditingRef.current) {
        event.preventDefault();
        return;
      }
    }

    const capturePointer = () => {
      activePointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    };

    const currentTool = useWhiteboardStore.getState().activeTool;

    if (currentTool !== "select") {
      lastSelectPointerDownRef.current = null;
    }

    const shouldPan =
      event.button === 1 ||
      (event.button === 0 &&
        (spacePressedRef.current || currentTool === "hand"));

    if (shouldPan) {
      event.preventDefault();
      if (viewportTransitionRef.current !== null) {
        cancelAnimationFrame(viewportTransitionRef.current);
        viewportTransitionRef.current = null;
      }
      lastSelectPointerDownRef.current = null;
      interactionRef.current = null;
      marqueeRef.current = null;
      rotationRef.current = null;
      drawingRef.current = null;
      draftElementRef.current = null;
      eraserRef.current = null;
      resizeRef.current = null;
      const point = getCanvasPoint(event);
      const viewport = viewportRef.current;

      panRef.current = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        offsetX: viewport.offsetX,
        offsetY: viewport.offsetY,
      };
      capturePointer();
      return;
    }

    if (isReadOnlyRef.current) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    const screenPoint = getCanvasPoint(event);
    const worldPoint = screenToWorld(screenPoint, viewportRef.current);
    if (currentTool === "pencil" || currentTool === "eraser") {
      cursorWorldPointRef.current = worldPoint;
    }
    const hitElement = findElementAtPoint(worldPoint);

    if (currentTool === "select") {
      const selected = findSelectedSingleElement();
      const handle = findInteractionHandleAtScreenPoint(screenPoint);

      if (selected && handle) {
        lastSelectPointerDownRef.current = null;
        interactionRef.current = null;
        drawingRef.current = null;
        draftElementRef.current = null;
        eraserRef.current = null;
        marqueeRef.current = null;

        if (handle === "rotate") {
          rotationRef.current = {
            pointerId: event.pointerId,
            elementId: selected.id,
            pivot: { x: selected.x, y: selected.y },
            initialHandlePoint: getRotationHandleGeometry(
              selected,
              30 / viewportRef.current.zoom,
            ).handle,
            initialRotation: selected.rotation,
          };
          resizeRef.current = null;
        } else {
          rotationRef.current = null;
          const fixedCorner = isCornerResizeElement(selected)
            ? getResizeHandlePoint(
                getLocalBounds(selected),
                getOppositeResizeHandle(handle as ResizeHandle),
              )
            : null;
          resizeRef.current = {
            pointerId: event.pointerId,
            elementId: selected.id,
            handle,
            fixedCorner,
          };
        }
        setHoveredResizeHandle(handle);
        commitHistoryEntry();
        capturePointer();
        return;
      }

      const now = Date.now();
      const previousPointerDown = lastSelectPointerDownRef.current;
      const isDoublePointerDown =
        previousPointerDown !== null &&
        now - previousPointerDown.timestamp <= DOUBLE_POINTER_WINDOW_MS &&
        Math.hypot(
          screenPoint.x - previousPointerDown.screenPoint.x,
          screenPoint.y - previousPointerDown.screenPoint.y,
        ) <= DOUBLE_POINTER_DISTANCE_PX &&
        previousPointerDown.elementId === (hitElement?.id ?? null);

      lastSelectPointerDownRef.current = isDoublePointerDown
        ? null
        : {
            timestamp: now,
            screenPoint,
            elementId: hitElement?.id ?? null,
          };

      if (isDoublePointerDown) {
        if (hitElement?.type === "text") {
          openTextElementForEditing(hitElement);
          return;
        }

        if (!hitElement) {
          beginTextEditing(worldPoint, screenPoint);
          return;
        }
      }
    }

    if (currentTool === "text") {
      resizeRef.current = null;
      rotationRef.current = null;
      marqueeRef.current = null;
      beginTextEditing(worldPoint, screenPoint);
      return;
    }

    if (currentTool === "eraser") {
      interactionRef.current = null;
      drawingRef.current = null;
      draftElementRef.current = null;
      resizeRef.current = null;
      rotationRef.current = null;
      marqueeRef.current = null;
      eraserRef.current = {
        pointerId: event.pointerId,
        removedIds: new Set(),
        historyCommitted: false,
      };
      eraseAtPoint(worldPoint);
      capturePointer();
      return;
    }

    if (isDrawingTool(currentTool) || currentTool === "pencil") {
      eraserRef.current = null;
      resizeRef.current = null;
      rotationRef.current = null;
      marqueeRef.current = null;
      const previewSeed = generateSeed();
      const points: Point[] = [{ x: 0, y: 0 }];

      interactionRef.current = null;
      drawingRef.current = {
        pointerId: event.pointerId,
        startScreenX: screenPoint.x,
        startScreenY: screenPoint.y,
        startWorld: worldPoint,
        tool: currentTool,
        style,
        previewSeed,
        points: currentTool === "pencil" ? points : [],
        lastWorldPoint: worldPoint,
      };
      draftElementRef.current =
        currentTool === "pencil"
          ? createFreehandElement(
              worldPoint,
              points,
              style,
              "draft-preview",
              previewSeed,
            )
          : createElementFromDrag(
              currentTool,
              worldPoint,
              worldPoint,
              style,
              "draft-preview",
              previewSeed,
            );
      setSelectedElementIds([]);
      capturePointer();
      return;
    }

    eraserRef.current = null;
    resizeRef.current = null;
    setHoveredResizeHandle(null);

    if (hitElement) {
      const selectionBefore = [...selectedElementIdsRef.current];
      const targetIds = selectionBefore.includes(hitElement.id)
        ? selectionBefore
        : [hitElement.id];
      const initialPositions = Object.fromEntries(
        elementsRef.current
          .filter((element) => targetIds.includes(element.id))
          .map((element) => [element.id, { x: element.x, y: element.y }]),
      ) as Record<ElementId, Point>;

      marqueeRef.current = null;
      interactionRef.current = {
        pointerId: event.pointerId,
        startScreenX: screenPoint.x,
        startScreenY: screenPoint.y,
        startWorld: worldPoint,
        hitElementId: hitElement.id,
        targetIds,
        initialPositions,
        selectionBefore,
        shiftKey: event.shiftKey,
        didDrag: false,
        historyCommitted: false,
      };
    } else {
      interactionRef.current = null;
      marqueeRef.current = {
        pointerId: event.pointerId,
        startWorld: worldPoint,
        currentWorld: worldPoint,
        startScreen: screenPoint,
        currentScreen: screenPoint,
        shiftKey: event.shiftKey,
      };
    }
    capturePointer();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (
      activePointerIdRef.current !== null &&
      activePointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    if (textEditingRef.current) {
      return;
    }

    const pointerScreenPoint = getCanvasPoint(event);
    cursorWorldPointRef.current = screenToWorld(
      pointerScreenPoint,
      viewportRef.current,
    );

    if (activePointerIdRef.current === event.pointerId) {
      event.preventDefault();
    }

    const pan = panRef.current;

    if (pan && pan.pointerId === event.pointerId) {
      const point = getCanvasPoint(event);
      viewportRef.current = {
        ...viewportRef.current,
        offsetX: pan.offsetX + point.x - pan.startX,
        offsetY: pan.offsetY + point.y - pan.startY,
      };
      return;
    }

    const rotation = rotationRef.current;

    if (rotation && rotation.pointerId === event.pointerId) {
      const screenPoint = getCanvasPoint(event);
      const currentWorldPoint = screenToWorld(
        screenPoint,
        viewportRef.current,
      );
      let nextRotation = calculateRotation(
        rotation.pivot,
        rotation.initialHandlePoint,
        currentWorldPoint,
        rotation.initialRotation,
      );

      if (event.shiftKey) {
        nextRotation = snapRotation(nextRotation);
      }

      updateElement(rotation.elementId, { rotation: nextRotation });
      return;
    }

    const resize = resizeRef.current;

    if (resize && resize.pointerId === event.pointerId) {
      const screenPoint = getCanvasPoint(event);
      const currentWorldPoint = screenToWorld(
        screenPoint,
        viewportRef.current,
      );
      const selected = elementsRef.current.find(
        (element) => element.id === resize.elementId,
      );

      if (!selected) {
        return;
      }

      if (
        (selected.type === "line" || selected.type === "arrow") &&
        (resize.handle === "start" || resize.handle === "end")
      ) {
        updateElement(
          resize.elementId,
          resizeLineElement(selected, resize.handle, currentWorldPoint),
        );
        return;
      }

      if (
        !resize.fixedCorner ||
        !isCornerResizeElement(selected) ||
        (resize.handle === "start" || resize.handle === "end")
      ) {
        return;
      }

      const currentLocalPoint = worldToLocalPoint(selected, currentWorldPoint);
      const nextBounds = resizeElement(
        resize.handle,
        resize.fixedCorner,
        currentLocalPoint,
      );

      if (selected.type === "freehand") {
        updateElement(resize.elementId, {
          points: resizeFreehandPoints(
            selected,
            resize.handle,
            resize.fixedCorner,
            currentLocalPoint,
          ),
        });
        return;
      }

      if (selected.type === "text") {
        const fontSize = calculateTextResizeFontSize(
          selected,
          resize.handle,
          resize.fixedCorner,
          currentLocalPoint,
        );
        const metrics = measureText(
          selected.text,
          fontSize,
          selected.fontFamily,
        );
        const fixedWorldPoint = localToWorldPoint(
          selected,
          resize.fixedCorner,
        );
        const newFixedLocalPoint = getResizeHandlePoint(
          { x: 0, y: 0, width: metrics.width, height: metrics.height },
          getOppositeResizeHandle(resize.handle),
        );
        const rotatedFixed = rotatePoint(
          newFixedLocalPoint,
          selected.rotation,
        );

        updateElement(resize.elementId, {
          x: fixedWorldPoint.x - rotatedFixed.x,
          y: fixedWorldPoint.y - rotatedFixed.y,
          fontSize,
          width: metrics.width,
          height: metrics.height,
        });
        return;
      }

      const fixedWorldPoint = localToWorldPoint(selected, resize.fixedCorner);
      const newFixedLocalPoint = getResizeHandlePoint(
        nextBounds,
        getOppositeResizeHandle(resize.handle),
      );
      const rotatedFixed = rotatePoint(newFixedLocalPoint, selected.rotation);

      updateElement(resize.elementId, {
        x: fixedWorldPoint.x - rotatedFixed.x,
        y: fixedWorldPoint.y - rotatedFixed.y,
        width: nextBounds.width,
        height: nextBounds.height,
      });
      return;
    }

    const eraser = eraserRef.current;

    if (eraser && eraser.pointerId === event.pointerId) {
      const screenPoint = getCanvasPoint(event);
      eraseAtPoint(screenToWorld(screenPoint, viewportRef.current));
      return;
    }

    const drawing = drawingRef.current;

    if (drawing && drawing.pointerId === event.pointerId) {
      const screenPoint = getCanvasPoint(event);
      const currentWorldPoint = screenToWorld(
        screenPoint,
        viewportRef.current,
      );

      if (drawing.tool === "pencil") {
        appendFreehandPoint(drawing, currentWorldPoint);
        draftElementRef.current = createFreehandElement(
          drawing.startWorld,
          drawing.points,
          drawing.style,
          "draft-preview",
          drawing.previewSeed,
        );
      } else {
        draftElementRef.current = createElementFromDrag(
          drawing.tool,
          drawing.startWorld,
          currentWorldPoint,
          drawing.style,
          "draft-preview",
          drawing.previewSeed,
        );
      }
      return;
    }

    const marquee = marqueeRef.current;

    if (marquee && marquee.pointerId === event.pointerId) {
      const screenPoint = getCanvasPoint(event);
      const screenDistance = Math.hypot(
        screenPoint.x - marquee.startScreen.x,
        screenPoint.y - marquee.startScreen.y,
      );

      if (screenDistance >= DRAG_THRESHOLD_PX) {
        lastSelectPointerDownRef.current = null;
      }

      marquee.currentScreen = screenPoint;
      marquee.currentWorld = screenToWorld(
        screenPoint,
        viewportRef.current,
      );
      return;
    }

    const interaction = interactionRef.current;

    if (!interaction || interaction.pointerId !== event.pointerId) {
      updateHoveredResizeHandle(getCanvasPoint(event));
      return;
    }

    const screenPoint = getCanvasPoint(event);
    const screenDistance = Math.hypot(
      screenPoint.x - interaction.startScreenX,
      screenPoint.y - interaction.startScreenY,
    );

    if (!interaction.didDrag) {
      if (screenDistance < DRAG_THRESHOLD_PX) {
        return;
      }

      interaction.didDrag = true;
      lastSelectPointerDownRef.current = null;
    }

    if (interaction.targetIds.length > 0) {
      if (!interaction.historyCommitted) {
        commitHistoryEntry();
        interaction.historyCommitted = true;
      }

      if (!interaction.selectionBefore.includes(interaction.hitElementId ?? "")) {
        selectedElementIdsRef.current = [interaction.hitElementId as ElementId];
        setSelectedElementIds(selectedElementIdsRef.current);
      }

      const currentWorldPoint = screenToWorld(
        screenPoint,
        viewportRef.current,
      );
      const deltaX = currentWorldPoint.x - interaction.startWorld.x;
      const deltaY = currentWorldPoint.y - interaction.startWorld.y;

      for (const id of interaction.targetIds) {
        const initialPosition = interaction.initialPositions[id];

        if (initialPosition) {
          updateElement(id, {
            x: initialPosition.x + deltaX,
            y: initialPosition.y + deltaY,
          });
        }
      }
    }
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    cancelled = false,
  ) => {
    if (
      activePointerIdRef.current !== null &&
      activePointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    if (cancelled) {
      event.preventDefault();
    }

    if (panRef.current?.pointerId === event.pointerId) {
      const finalViewport = viewportRef.current;
      panRef.current = null;
      setViewport(finalViewport);
    }

    if (resizeRef.current?.pointerId === event.pointerId) {
      resizeRef.current = null;
    }

    if (rotationRef.current?.pointerId === event.pointerId) {
      rotationRef.current = null;
    }

    if (eraserRef.current?.pointerId === event.pointerId) {
      eraserRef.current = null;
    }

    if (drawingRef.current?.pointerId === event.pointerId) {
      const drawing = drawingRef.current;
      const screenPoint = getCanvasPoint(event);
      const screenDistance = Math.hypot(
        screenPoint.x - drawing.startScreenX,
        screenPoint.y - drawing.startScreenY,
      );
      const finalWorldPoint = screenToWorld(
        screenPoint,
        viewportRef.current,
      );

      let element: SceneElement | null = null;

      if (!cancelled) {
        if (drawing.tool === "pencil") {
          // Retém o ponto final mesmo que ele esteja a menos de 2px do último
          // ponto amostrado, para que o traço termine exatamente no cursor.
          appendFreehandPoint(drawing, finalWorldPoint, true);
          const extent = freehandExtent(drawing.points);
          const visibleSize =
            Math.max(extent.width, extent.height) * viewportRef.current.zoom;

          if (
            drawing.points.length >= 2 &&
            visibleSize >= DRAG_THRESHOLD_PX
          ) {
            element = createFreehandElement(
              drawing.startWorld,
              drawing.points,
              drawing.style,
              generateElementId(),
              generateSeed(),
            );
          }
        } else if (screenDistance >= DRAG_THRESHOLD_PX) {
          element = createElementFromDrag(
            drawing.tool,
            drawing.startWorld,
            finalWorldPoint,
            drawing.style,
            generateElementId(),
            generateSeed(),
          );
        }
      }

    if (element) {
        // A criação inteira é uma entrada: o preview nunca entra na store.
        commitHistoryEntry();
        addElement(element);
        registerCreatedElement(element.id);
        setSelectedElementIds([element.id]);
        if (!toolLocked) {
          setActiveTool("select");
        }
      }

      drawingRef.current = null;
      draftElementRef.current = null;
    }

    if (marqueeRef.current?.pointerId === event.pointerId) {
      const marquee = marqueeRef.current;
      marqueeRef.current = null;

      if (!cancelled) {
        const screenDistance = Math.hypot(
          marquee.currentScreen.x - marquee.startScreen.x,
          marquee.currentScreen.y - marquee.startScreen.y,
        );

        if (screenDistance >= DRAG_THRESHOLD_PX) {
          const bounds = normalizeSelectionBounds(
            marquee.startWorld,
            marquee.currentWorld,
          );
          const marqueeIds = getElementsIntersectingBounds(
            elementsRef.current,
            bounds,
          );
          const nextSelectedIds = marquee.shiftKey
            ? Array.from(new Set([
                ...selectedElementIdsRef.current,
                ...marqueeIds,
              ]))
            : marqueeIds;

          selectedElementIdsRef.current = nextSelectedIds;
          setSelectedElementIds(nextSelectedIds);
        } else if (!marquee.shiftKey) {
          selectedElementIdsRef.current = [];
          setSelectedElementIds([]);
        }
      }
    }

    if (interactionRef.current?.pointerId === event.pointerId) {
      const interaction = interactionRef.current;
      interactionRef.current = null;

      if (!interaction.didDrag) {
        const nextSelectedIds = interaction.hitElementId
          ? interaction.shiftKey
            ? toggleSelectedElement(
                interaction.selectionBefore,
                interaction.hitElementId,
              )
            : [interaction.hitElementId]
          : interaction.shiftKey
            ? interaction.selectionBefore
            : [];

        selectedElementIdsRef.current = nextSelectedIds;
        setSelectedElementIds(nextSelectedIds);
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (activePointerIdRef.current === event.pointerId) {
      activePointerIdRef.current = null;
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    if (textEditingRef.current) {
      return;
    }

    const cursor = getCanvasPoint(event);
    if (viewportTransitionRef.current !== null) {
      cancelAnimationFrame(viewportTransitionRef.current);
      viewportTransitionRef.current = null;
    }

    const currentViewport = viewportRef.current;
    const worldPoint = screenToWorld(cursor, currentViewport);
    const zoomFactor = Math.exp(-event.deltaY * 0.001);
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, currentViewport.zoom * zoomFactor),
    );
    const nextCursorPosition = worldToScreen(worldPoint, {
      ...currentViewport,
      zoom: nextZoom,
    });

    const nextViewport = {
      zoom: nextZoom,
      offsetX: currentViewport.offsetX + cursor.x - nextCursorPosition.x,
      offsetY: currentViewport.offsetY + cursor.y - nextCursorPosition.y,
    };
    viewportRef.current = nextViewport;
    setViewport(nextViewport);
  };

  const editingTextElement = textEditing?.elementId
    ? elements.find((element) => element.id === textEditing.elementId)
    : null;
  const textInputFontSize =
    editingTextElement?.type === "text"
      ? editingTextElement.fontSize
      : DEFAULT_TEXT_STYLE.fontSize;
  const textInputFontFamily =
    editingTextElement?.type === "text"
      ? editingTextElement.fontFamily
      : DEFAULT_TEXT_STYLE.fontFamily;
  const textInputFontWeight =
    editingTextElement?.type === "text"
      ? editingTextElement.fontWeight
      : DEFAULT_TEXT_STYLE.fontWeight;
  const textInputMetrics = textEditing
    ? measureText(
        textEditing.value || " ",
        textInputFontSize,
        textInputFontFamily,
      )
    : null;
  const textInputWidth = textEditing && textInputMetrics
    ? Math.max(
        16,
        textInputMetrics.width * textEditing.viewportZoom + 8,
      )
    : undefined;
  const textInputHeight = textEditing && textInputMetrics
    ? Math.max(
        28,
        textInputMetrics.height * textEditing.viewportZoom + 8,
    )
    : undefined;

  const contextSelectedIndexes = selectedElementIds
    .map((id) => elements.findIndex((element) => element.id === id))
    .filter((index) => index >= 0);
  const canMoveContextForward =
    contextSelectedIndexes.length > 0 &&
    contextSelectedIndexes[contextSelectedIndexes.length - 1] <
      elements.length - 1;
  const canMoveContextBackward =
    contextSelectedIndexes.length > 0 && contextSelectedIndexes[0] > 0;

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className={`block h-full w-full touch-none select-none ${
          activeTool === "eraser"
            ? "cursor-cell"
          : activeTool === "text"
              ? "cursor-text"
              : activeTool === "select" &&
                  (hoveredResizeHandle === "rotate" ||
                    hoveredResizeHandle === "start" ||
                    hoveredResizeHandle === "end")
                ? "cursor-crosshair"
              : activeTool === "select" &&
                  (hoveredResizeHandle === "top-left" ||
                    hoveredResizeHandle === "bottom-right")
                ? "cursor-nwse-resize"
                : activeTool === "select" &&
                    (hoveredResizeHandle === "top-right" ||
                      hoveredResizeHandle === "bottom-left")
                  ? "cursor-nesw-resize"
              : "cursor-grab active:cursor-grabbing"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={(event) => handlePointerUp(event, true)}
        onPointerLeave={() => {
          setHoveredResizeHandle(null);
          cursorWorldPointRef.current = null;
        }}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        aria-label="Quadro branco"
      />

      {contextMenu && (
        <ContextMenu
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        >
          {contextMenu.kind === "element" ? (
            <>
              <ActionMenuItem
                onClick={() => {
                  duplicateSelectedFromContext();
                  setContextMenu(null);
                }}
              >
                Duplicar
              </ActionMenuItem>
              <ActionMenuItem
                onClick={() => {
                  copySelectedFromContext();
                  setContextMenu(null);
                }}
              >
                Copiar
              </ActionMenuItem>
              <ActionMenuItem
                destructive
                onClick={() => {
                  deleteSelectedFromContext();
                  setContextMenu(null);
                }}
              >
                Deletar
              </ActionMenuItem>
              <ActionMenuDivider />
              <ActionMenuItem
                disabled={!canMoveContextForward}
                onClick={() => {
                  reorderSelectedFromContext("front");
                  setContextMenu(null);
                }}
              >
                Trazer para frente
              </ActionMenuItem>
              <ActionMenuItem
                disabled={!canMoveContextForward}
                onClick={() => {
                  reorderSelectedFromContext("forward");
                  setContextMenu(null);
                }}
              >
                Avançar uma camada
              </ActionMenuItem>
              <ActionMenuItem
                disabled={!canMoveContextBackward}
                onClick={() => {
                  reorderSelectedFromContext("backward");
                  setContextMenu(null);
                }}
              >
                Recuar uma camada
              </ActionMenuItem>
              <ActionMenuItem
                disabled={!canMoveContextBackward}
                onClick={() => {
                  reorderSelectedFromContext("back");
                  setContextMenu(null);
                }}
              >
                Mandar para trás
              </ActionMenuItem>
            </>
          ) : (
            <>
              <ActionMenuItem
                disabled={clipboardElements.length === 0}
                onClick={() => {
                  pasteFromContext(contextMenu.worldPoint);
                  setContextMenu(null);
                }}
              >
                Colar aqui
              </ActionMenuItem>
              <ActionMenuItem
                disabled={elements.length === 0}
                onClick={() => {
                  selectAllFromContext();
                  setContextMenu(null);
                }}
              >
                Selecionar tudo
              </ActionMenuItem>
              <ActionMenuDivider />
              <ActionMenuItem
                disabled={elements.length === 0}
                onClick={() => {
                  window.dispatchEvent(new Event("whiteboard:zoom-to-fit"));
                  setContextMenu(null);
                }}
              >
                Ajustar
              </ActionMenuItem>
              <ActionMenuItem
                destructive
                onClick={() => {
                  setContextMenu(null);
                  window.dispatchEvent(new Event("whiteboard:clear-scene"));
                }}
              >
                Limpar a tela
              </ActionMenuItem>
            </>
          )}
        </ContextMenu>
      )}

      {textEditing && (
        <textarea
          ref={textInputRef}
          rows={1}
          value={textEditing.value}
          aria-label="Texto do elemento"
          autoComplete="off"
          autoFocus
          spellCheck={false}
          onChange={(event) => handleTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              finishTextEditing(true);
            } else if (event.key === "Escape") {
              event.preventDefault();
              finishTextEditing(false);
            }
          }}
          onBlur={() => finishTextEditing(true)}
          className="pointer-events-none absolute z-20 box-border resize-none overflow-hidden whitespace-pre border-0 bg-transparent p-0 outline-none shadow-none transition-[width,height,background-color,color] duration-300 focus:border-0 focus:bg-transparent focus:ring-0 dark:bg-transparent dark:focus:bg-transparent"
          style={{
            left: textEditing.screenPoint.x,
            top: textEditing.screenPoint.y,
            width: textInputWidth,
            height: textInputHeight,
            color: textEditing.style.strokeColor,
            fontFamily: textInputFontFamily,
            fontSize: textInputFontSize * textEditing.viewportZoom,
            fontWeight: textInputFontWeight,
            lineHeight: `${textInputFontSize * 1.2 * textEditing.viewportZoom}px`,
          }}
        />
      )}
    </div>
  );
}
