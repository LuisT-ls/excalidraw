import {
  localToWorldPoint,
  worldToLocalPoint,
} from "./hitTesting";
import type {
  ArrowElement,
  Bounds,
  FreehandElement,
  LineElement,
  Point,
  TextElement,
} from "../model/types";

export type ResizeHandle =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type EndpointHandle = "start" | "end";

const HANDLE_DIRECTIONS: Record<ResizeHandle, Point> = {
  "top-left": { x: -1, y: -1 },
  "top-right": { x: 1, y: -1 },
  "bottom-left": { x: -1, y: 1 },
  "bottom-right": { x: 1, y: 1 },
};

export function getResizeHandlePoint(
  bounds: Bounds,
  handle: ResizeHandle,
): Point {
  switch (handle) {
    case "top-left":
      return { x: bounds.x, y: bounds.y };
    case "top-right":
      return { x: bounds.x + bounds.width, y: bounds.y };
    case "bottom-left":
      return { x: bounds.x, y: bounds.y + bounds.height };
    case "bottom-right":
      return {
        x: bounds.x + bounds.width,
        y: bounds.y + bounds.height,
      };
  }
}

export function getOppositeResizeHandle(
  handle: ResizeHandle,
): ResizeHandle {
  switch (handle) {
    case "top-left":
      return "bottom-right";
    case "top-right":
      return "bottom-left";
    case "bottom-left":
      return "top-right";
    case "bottom-right":
      return "top-left";
  }
}

function resizeAxis(
  fixed: number,
  current: number,
  direction: number,
  minSize: number,
) {
  const delta = current - fixed;
  const sign = delta === 0 ? direction : Math.sign(delta);
  const size = Math.max(Math.abs(delta), minSize);
  const moving = fixed + sign * size;

  return {
    start: Math.min(fixed, moving),
    size,
  };
}

/**
 * Calcula o novo retângulo mantendo o canto oposto fixo. A rotação fica fora
 * desta etapa: os pontos recebidos são tratados no espaço alinhado aos eixos.
 */
export function resizeElement(
  handle: ResizeHandle,
  fixedCorner: Point,
  currentPoint: Point,
  minSize = 4,
): Bounds {
  const direction = HANDLE_DIRECTIONS[handle];
  const width = resizeAxis(
    fixedCorner.x,
    currentPoint.x,
    direction.x,
    minSize,
  );
  const height = resizeAxis(
    fixedCorner.y,
    currentPoint.y,
    direction.y,
    minSize,
  );

  return {
    x: width.start,
    y: height.start,
    width: width.size,
    height: height.size,
  };
}

function ensureMinimumDistance(
  anchor: Point,
  target: Point,
  fallbackDirection: Point,
  minDistance: number,
): Point {
  const deltaX = target.x - anchor.x;
  const deltaY = target.y - anchor.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance >= minDistance) {
    return target;
  }

  const directionLength = Math.hypot(
    fallbackDirection.x,
    fallbackDirection.y,
  );
  const unitX = directionLength > 0 ? fallbackDirection.x / directionLength : 1;
  const unitY = directionLength > 0 ? fallbackDirection.y / directionLength : 0;

  return {
    x: anchor.x + unitX * minDistance,
    y: anchor.y + unitY * minDistance,
  };
}

export function getEndpointHandlePoint(
  element: LineElement | ArrowElement,
  handle: EndpointHandle,
): Point {
  const point = handle === "start" ? element.points[0] : element.points.at(-1)!;
  return localToWorldPoint(element, point);
}

export function resizeLineElement(
  element: LineElement | ArrowElement,
  handle: EndpointHandle,
  currentWorldPoint: Point,
  minLength = 4,
): Pick<LineElement | ArrowElement, "x" | "y" | "points"> {
  const points = element.points.map((point) => ({ ...point })) as [
    Point,
    Point,
    ...Point[],
  ];
  const endpoint = element.points.at(-1)!;

  if (handle === "end") {
    const fixedStart = localToWorldPoint(element, element.points[0]);
    const currentEnd = ensureMinimumDistance(
      fixedStart,
      currentWorldPoint,
      {
        x: localToWorldPoint(element, endpoint).x - fixedStart.x,
        y: localToWorldPoint(element, endpoint).y - fixedStart.y,
      },
      minLength,
    );
    points[points.length - 1] = worldToLocalPoint(element, currentEnd);

    return { x: element.x, y: element.y, points };
  }

  const fixedEnd = localToWorldPoint(element, endpoint);
  const currentStart = ensureMinimumDistance(
    fixedEnd,
    currentWorldPoint,
    {
      x: localToWorldPoint(element, element.points[0]).x - fixedEnd.x,
      y: localToWorldPoint(element, element.points[0]).y - fixedEnd.y,
    },
    minLength,
  );
  points[0] = { x: 0, y: 0 };
  points[points.length - 1] = worldToLocalPoint(
    { ...element, x: currentStart.x, y: currentStart.y },
    fixedEnd,
  );

  return { x: currentStart.x, y: currentStart.y, points };
}

export function resizeFreehandPoints(
  element: FreehandElement,
  handle: ResizeHandle,
  fixedCorner: Point,
  currentLocalPoint: Point,
  minSize = 4,
): Point[] {
  const oldBounds = {
    x: Math.min(...element.points.map((point) => point.x)),
    y: Math.min(...element.points.map((point) => point.y)),
    width:
      Math.max(...element.points.map((point) => point.x)) -
      Math.min(...element.points.map((point) => point.x)),
    height:
      Math.max(...element.points.map((point) => point.y)) -
      Math.min(...element.points.map((point) => point.y)),
  };
  const nextBounds = resizeElement(
    handle,
    fixedCorner,
    currentLocalPoint,
    minSize,
  );
  const scaleX = oldBounds.width > 0 ? nextBounds.width / oldBounds.width : 1;
  const scaleY = oldBounds.height > 0 ? nextBounds.height / oldBounds.height : 1;

  return element.points.map((point) => ({
    x: fixedCorner.x + (point.x - fixedCorner.x) * scaleX,
    y: fixedCorner.y + (point.y - fixedCorner.y) * scaleY,
  }));
}

export function calculateTextResizeFontSize(
  element: TextElement,
  handle: ResizeHandle,
  fixedCorner: Point,
  currentLocalPoint: Point,
  minFontSize = 8,
  maxFontSize = 400,
): number {
  const originalMovingCorner = getResizeHandlePoint(
    { x: 0, y: 0, width: element.width, height: element.height },
    handle,
  );
  const originalDistance = Math.hypot(
    originalMovingCorner.x - fixedCorner.x,
    originalMovingCorner.y - fixedCorner.y,
  );
  const currentDistance = Math.hypot(
    currentLocalPoint.x - fixedCorner.x,
    currentLocalPoint.y - fixedCorner.y,
  );
  const scale = originalDistance > 0 ? currentDistance / originalDistance : 1;

  return Math.min(
    maxFontSize,
    Math.max(minFontSize, element.fontSize * scale),
  );
}
