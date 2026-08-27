import { screenToWorld } from "./coordinates";
import type { Point, Viewport } from "../model/types";

export interface TwoFingerFrame {
  midpoint: Point;
  distance: number;
}

/**
 * Derives the two values that drive a pinch gesture from the two screen points.
 * The points are expected to use the same CSS-pixel coordinate space as the
 * canvas, so the result can be applied directly to the editor viewport.
 */
export function getTwoFingerFrame(
  first: Point,
  second: Point,
): TwoFingerFrame {
  return {
    midpoint: {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    },
    distance: Math.hypot(second.x - first.x, second.y - first.y),
  };
}

/**
 * Applies one two-finger frame to a viewport.
 *
 * The world point under the previous midpoint is used as the zoom anchor.
 * Recomputing the offset from that anchor also includes the midpoint delta,
 * which makes a pinch and a two-finger pan work together without two competing
 * viewport updates.
 */
export function updateViewportForTwoFingerGesture(
  viewport: Viewport,
  previousFrame: TwoFingerFrame,
  currentFrame: TwoFingerFrame,
  minZoom: number,
  maxZoom: number,
): Viewport {
  const previousMidpointWorld = screenToWorld(
    previousFrame.midpoint,
    viewport,
  );
  const canZoom = previousFrame.distance > 1 && currentFrame.distance > 1;
  const zoomRatio = canZoom
    ? currentFrame.distance / previousFrame.distance
    : 1;
  const zoom = Math.min(
    maxZoom,
    Math.max(minZoom, viewport.zoom * zoomRatio),
  );

  return {
    zoom,
    offsetX: currentFrame.midpoint.x - previousMidpointWorld.x * zoom,
    offsetY: currentFrame.midpoint.y - previousMidpointWorld.y * zoom,
  };
}
