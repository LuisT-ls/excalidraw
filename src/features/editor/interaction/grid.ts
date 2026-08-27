import type { Bounds, Point } from "../model/types";

export const GRID_SIZE_WORLD = 20;

export function snapValueToGrid(value: number, gridSize = GRID_SIZE_WORLD): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPointToGrid(
  point: Point,
  gridSize = GRID_SIZE_WORLD,
): Point {
  return {
    x: snapValueToGrid(point.x, gridSize),
    y: snapValueToGrid(point.y, gridSize),
  };
}

/**
 * Snaps the anchor's final position and returns a shared delta. Applying one
 * delta to every selected element preserves their relative arrangement.
 */
export function snapMoveDeltaToGrid(
  anchorPosition: Point,
  rawDelta: Point,
  gridSize = GRID_SIZE_WORLD,
): Point {
  return {
    x: snapValueToGrid(anchorPosition.x + rawDelta.x, gridSize) - anchorPosition.x,
    y: snapValueToGrid(anchorPosition.y + rawDelta.y, gridSize) - anchorPosition.y,
  };
}

export function snapElementPositionToGrid<T extends Point>(
  element: T,
  enabled: boolean,
  gridSize = GRID_SIZE_WORLD,
): T {
  if (!enabled) {
    return element;
  }

  const position = snapPointToGrid(element, gridSize);
  return { ...element, ...position };
}

export function getGridCoordinates(
  bounds: Bounds,
  gridSize = GRID_SIZE_WORLD,
): { vertical: number[]; horizontal: number[] } {
  const vertical: number[] = [];
  const horizontal: number[] = [];
  const firstX = Math.floor(bounds.x / gridSize) * gridSize;
  const firstY = Math.floor(bounds.y / gridSize) * gridSize;
  const lastX = bounds.x + bounds.width;
  const lastY = bounds.y + bounds.height;

  for (let x = firstX; x <= lastX; x += gridSize) {
    vertical.push(x);
  }

  for (let y = firstY; y <= lastY; y += gridSize) {
    horizontal.push(y);
  }

  return { vertical, horizontal };
}

export function drawGrid(
  context: CanvasRenderingContext2D,
  bounds: Bounds,
  viewportZoom: number,
  gridSize = GRID_SIZE_WORLD,
): void {
  const coordinates = getGridCoordinates(bounds, gridSize);

  context.save();
  context.strokeStyle = "rgba(100, 116, 139, 0.18)";
  context.lineWidth = 1 / viewportZoom;
  context.setLineDash([]);
  context.beginPath();

  for (const x of coordinates.vertical) {
    context.moveTo(x, bounds.y);
    context.lineTo(x, bounds.y + bounds.height);
  }

  for (const y of coordinates.horizontal) {
    context.moveTo(bounds.x, y);
    context.lineTo(bounds.x + bounds.width, y);
  }

  context.stroke();
  context.restore();
}
