import { getBoundingBox } from "./hitTesting";
import type { Bounds, ElementId, Point, SceneElement } from "../model/types";

export type MarqueeSelectionMode = "overlap" | "wrap";

export function normalizeSelectionBounds(start: Point, end: Point): Bounds {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function boundsIntersect(first: Bounds, second: Bounds): boolean {
  return (
    first.x <= second.x + second.width &&
    first.x + first.width >= second.x &&
    first.y <= second.y + second.height &&
    first.y + first.height >= second.y
  );
}

export function boundsContainedIn(inner: Bounds, outer: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function getElementsIntersectingBounds(
  elements: SceneElement[],
  bounds: Bounds,
  mode: MarqueeSelectionMode = "overlap",
): ElementId[] {
  return elements
    .filter((element) => {
      const elementBounds = getBoundingBox(element);

      return mode === "wrap"
        ? boundsContainedIn(elementBounds, bounds)
        : boundsIntersect(elementBounds, bounds);
    })
    .map((element) => element.id);
}

export function toggleSelectedElement(
  selectedIds: ElementId[],
  id: ElementId,
): ElementId[] {
  return selectedIds.includes(id)
    ? selectedIds.filter((selectedId) => selectedId !== id)
    : [...selectedIds, id];
}
