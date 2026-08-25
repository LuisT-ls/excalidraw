import { cloneSceneElement } from "../model/clone";
import type { ElementId, SceneElement } from "../model/types";

export type LayerDirection = "front" | "back";

export function duplicateSceneElement(
  element: SceneElement,
  id: ElementId,
  seed: number,
  offset = 20,
): SceneElement {
  const duplicate = cloneSceneElement(element);

  return {
    ...duplicate,
    id,
    seed,
    x: duplicate.x + offset,
    y: duplicate.y + offset,
  };
}

export function reorderElements(
  elements: SceneElement[],
  ids: ElementId | ElementId[],
  direction: LayerDirection,
): SceneElement[] {
  const selectedIds = new Set(Array.isArray(ids) ? ids : [ids]);
  const selectedElements = elements.filter((element) => selectedIds.has(element.id));
  const remainingElements = elements.filter((element) => !selectedIds.has(element.id));

  if (selectedElements.length === 0) {
    return elements;
  }

  const edgeElements =
    direction === "front"
      ? elements.slice(-selectedElements.length)
      : elements.slice(0, selectedElements.length);
  const alreadyAtEdge = edgeElements.every((element) => selectedIds.has(element.id));

  if (alreadyAtEdge) {
    return elements;
  }

  return direction === "front"
    ? [...remainingElements, ...selectedElements]
    : [...selectedElements, ...remainingElements];
}
