import { screenToWorld, worldToScreen } from "./coordinates";
import type { Point, Viewport } from "../model/types";

export function zoomAt(
  viewport: Viewport,
  screenPoint: Point,
  requestedZoom: number,
  minZoom: number,
  maxZoom: number,
): Viewport {
  const zoom = Math.min(maxZoom, Math.max(minZoom, requestedZoom));
  const worldPoint = screenToWorld(screenPoint, viewport);
  const nextScreenPoint = worldToScreen(worldPoint, { ...viewport, zoom });

  return {
    zoom,
    offsetX: viewport.offsetX + screenPoint.x - nextScreenPoint.x,
    offsetY: viewport.offsetY + screenPoint.y - nextScreenPoint.y,
  };
}

export function zoomByFactorAt(
  viewport: Viewport,
  screenPoint: Point,
  factor: number,
  minZoom: number,
  maxZoom: number,
): Viewport {
  return zoomAt(
    viewport,
    screenPoint,
    viewport.zoom * factor,
    minZoom,
    maxZoom,
  );
}
