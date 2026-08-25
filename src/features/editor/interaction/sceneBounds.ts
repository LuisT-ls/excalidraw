import type { Bounds, SceneElement } from "../model/types";
import { getBoundingBox } from "./hitTesting";

export function getSceneBounds(elements: SceneElement[]): Bounds | null {
  if (elements.length === 0) {
    return null;
  }

  return elements.slice(1).reduce((combined, element) => {
    const next = getBoundingBox(element);
    const minX = Math.min(combined.x, next.x);
    const minY = Math.min(combined.y, next.y);
    const maxX = Math.max(
      combined.x + combined.width,
      next.x + next.width,
    );
    const maxY = Math.max(
      combined.y + combined.height,
      next.y + next.height,
    );

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, getBoundingBox(elements[0]));
}

export function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}
