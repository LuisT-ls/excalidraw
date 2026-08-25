import { getBoundingBox } from "./hitTesting";
import type { Bounds, ElementId, Point, SceneElement } from "../model/types";

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

export function getElementsIntersectingBounds(
  elements: SceneElement[],
  bounds: Bounds,
): ElementId[] {
  return elements
    .filter((element) => boundsIntersect(getBoundingBox(element), bounds))
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
