import type { Viewport } from "../model/types";

export const ELEMENT_POP_DURATION_MS = 180;
export const FIT_VIEWPORT_DURATION_MS = 350;

export function easeOutCubic(progress: number): number {
  const normalized = Math.min(1, Math.max(0, progress));
  return 1 - (1 - normalized) ** 3;
}

export function easeOutBack(progress: number): number {
  const normalized = Math.min(1, Math.max(0, progress));
  const overshoot = 1.70158;
  const coefficient = overshoot + 1;
  const offset = normalized - 1;

  return 1 + coefficient * offset ** 3 + overshoot * offset ** 2;
}

export function getElementPopScale(
  ageMs: number,
  durationMs = ELEMENT_POP_DURATION_MS,
): number {
  if (ageMs <= 0) {
    return 0.85;
  }

  if (ageMs >= durationMs) {
    return 1;
  }

  return 0.85 + 0.15 * easeOutBack(ageMs / durationMs);
}

export function interpolateViewport(
  from: Viewport,
  to: Viewport,
  progress: number,
): Viewport {
  const normalized = Math.min(1, Math.max(0, progress));

  return {
    offsetX: from.offsetX + (to.offsetX - from.offsetX) * normalized,
    offsetY: from.offsetY + (to.offsetY - from.offsetY) * normalized,
    zoom: from.zoom + (to.zoom - from.zoom) * normalized,
  };
}
