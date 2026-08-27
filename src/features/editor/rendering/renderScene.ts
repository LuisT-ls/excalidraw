import rough from "roughjs/bin/rough";
import {
  getBoundingBox,
  getLocalBounds,
  localToWorldPoint,
} from "../interaction/hitTesting";
import {
  getEndpointHandlePoint,
  getResizeHandlePoint,
  type ResizeHandle,
} from "../interaction/resize";
import { getRotationHandleGeometry } from "../interaction/rotation";
import type { Point, SceneElement } from "../model/types";
import { getElementPopScale } from "./animation";
import {
  renderArrow,
  renderEllipse,
  renderFreehand,
  renderImage,
  renderLine,
  renderRectangle,
  renderText,
} from "./roughRenderer";
import { getCachedImage } from "./imageCache";

type RoughCanvas = ReturnType<typeof rough.canvas>;

export interface SelectionMarquee {
  start: Point;
  end: Point;
}

export interface RenderSceneOptions {
  showSelection?: boolean;
  currentTime?: number;
  recentlyCreatedAt?: ReadonlyMap<string, number>;
  cursorIndicator?: CursorIndicator;
}

export interface CursorIndicator {
  point: Point;
  radius: number;
  color: string;
  pulsing?: boolean;
}

// A instância de RoughCanvas fica associada ao elemento HTML e é reutilizada
// entre frames. O WeakMap também libera a entrada quando o canvas é descartado.
const roughCanvasCache = new WeakMap<HTMLCanvasElement, RoughCanvas>();

function getRoughCanvas(canvas: HTMLCanvasElement): RoughCanvas {
  const cached = roughCanvasCache.get(canvas);

  if (cached) {
    return cached;
  }

  const created = rough.canvas(canvas);
  roughCanvasCache.set(canvas, created);
  return created;
}

export function renderScene(
  context: CanvasRenderingContext2D,
  elements: SceneElement[],
  selectedElementIds: string[] = [],
  draftElement: SceneElement | null = null,
  viewportZoom = 1,
  selectionMarquee: SelectionMarquee | null = null,
  options: RenderSceneOptions = {},
) {
  const roughCanvas = getRoughCanvas(context.canvas);
  const selectedIds = new Set(selectedElementIds);
  const showSelection = options.showSelection ?? true;

  const renderElement = (element: SceneElement) => {
    context.save();
    context.globalAlpha = element.opacity;

    const createdAt = options.recentlyCreatedAt?.get(element.id);
    if (createdAt !== undefined && options.currentTime !== undefined) {
      const scale = getElementPopScale(options.currentTime - createdAt);

      if (scale !== 1) {
        const bounds = getBoundingBox(element);
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        context.translate(centerX, centerY);
        context.scale(scale, scale);
        context.translate(-centerX, -centerY);
      }
    }

    context.translate(element.x, element.y);
    context.rotate(element.rotation);

    switch (element.type) {
      case "rectangle":
        renderRectangle(roughCanvas, element);
        break;
      case "ellipse":
        renderEllipse(roughCanvas, element);
        break;
      case "line":
        renderLine(roughCanvas, element);
        break;
      case "arrow":
        renderArrow(roughCanvas, element);
        break;
      case "text":
        renderText(context, element);
        break;
      case "freehand":
        renderFreehand(context, element);
        break;
      case "image":
        renderImage(context, element, getCachedImage(element.src));
        break;
    }

    context.restore();
  };

  const renderSelectionOverlay = (element: SceneElement) => {
    const bounds = getBoundingBox(element);
    context.save();
    context.strokeStyle = "#2563eb";
    context.lineWidth = 1.5;
    context.setLineDash([6, 4]);
    context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    const isSingleSelection = selectedElementIds.length === 1;
    const localBounds = getLocalBounds(element);
    const cornerHandles: ResizeHandle[] = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ];

    if (
      isSingleSelection &&
      (element.type === "rectangle" ||
        element.type === "ellipse" ||
        element.type === "freehand" ||
        element.type === "text" ||
        element.type === "image")
    ) {
      const handleSize = 8 / viewportZoom;
      const halfHandleSize = handleSize / 2;
      const handleStrokeWidth = 1.5 / viewportZoom;

      context.setLineDash([]);
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#2563eb";
      context.lineWidth = handleStrokeWidth;

      for (const handle of cornerHandles) {
        const point = localToWorldPoint(
          element,
          getResizeHandlePoint(localBounds, handle),
        );
        context.fillRect(
          point.x - halfHandleSize,
          point.y - halfHandleSize,
          handleSize,
          handleSize,
        );
        context.strokeRect(
          point.x - halfHandleSize,
          point.y - halfHandleSize,
          handleSize,
          handleSize,
        );
      }
    }

    if (isSingleSelection && (element.type === "line" || element.type === "arrow")) {
      const endpointRadius = 5 / viewportZoom;
      context.setLineDash([]);
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#2563eb";
      context.lineWidth = 1.5 / viewportZoom;

      for (const point of [
        getEndpointHandlePoint(element, "start"),
        getEndpointHandlePoint(element, "end"),
      ]) {
        context.beginPath();
        context.arc(point.x, point.y, endpointRadius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
    }

    if (isSingleSelection) {
      const rotationHandle = getRotationHandleGeometry(
        element,
        30 / viewportZoom,
      );
      const rotationRadius = 5 / viewportZoom;

      context.setLineDash([]);
      context.strokeStyle = "#2563eb";
      context.lineWidth = 1 / viewportZoom;
      context.beginPath();
      context.moveTo(rotationHandle.top.x, rotationHandle.top.y);
      context.lineTo(rotationHandle.handle.x, rotationHandle.handle.y);
      context.stroke();
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(
        rotationHandle.handle.x,
        rotationHandle.handle.y,
        rotationRadius,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }

    context.restore();
  };

  for (const element of elements) {
    renderElement(element);
  }

  if (draftElement) {
    renderElement(draftElement);
  }

  if (showSelection) {
    for (const element of elements) {
      if (selectedIds.has(element.id)) {
        renderSelectionOverlay(element);
      }
    }
  }

  if (showSelection && selectionMarquee) {
    const x = Math.min(selectionMarquee.start.x, selectionMarquee.end.x);
    const y = Math.min(selectionMarquee.start.y, selectionMarquee.end.y);
    const width = Math.abs(selectionMarquee.end.x - selectionMarquee.start.x);
    const height = Math.abs(selectionMarquee.end.y - selectionMarquee.start.y);

    context.save();
    context.fillStyle = "rgba(37, 99, 235, 0.10)";
    context.strokeStyle = "#2563eb";
    context.lineWidth = 1.5 / viewportZoom;
    context.setLineDash([6 / viewportZoom, 4 / viewportZoom]);
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
    context.restore();
  }

  if (options.cursorIndicator) {
    const indicator = options.cursorIndicator;
    const pulse = indicator.pulsing
      ? 1 + 0.12 * Math.sin((options.currentTime ?? 0) / 100)
      : 1;

    context.save();
    context.globalAlpha = 0.65;
    context.strokeStyle = indicator.color;
    context.lineWidth = 1.5 / viewportZoom;
    context.setLineDash([]);
    context.beginPath();
    context.arc(
      indicator.point.x,
      indicator.point.y,
      indicator.radius * pulse,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
  }
}
