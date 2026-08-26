import { cloneSceneElement } from "../model/clone";
import type { ElementId, Point, SceneElement } from "../model/types";

export type LayerDirection = "front" | "back";
export type LayerStepDirection = "forward" | "backward";

export function duplicateSceneElement(
  element: SceneElement,
  id: ElementId,
  seed: number,
  offset: number | Point = 20,
): SceneElement {
  const duplicate = cloneSceneElement(element);
  const offsetX = typeof offset === "number" ? offset : offset.x;
  const offsetY = typeof offset === "number" ? offset : offset.y;

  return {
    ...duplicate,
    id,
    seed,
    x: duplicate.x + offsetX,
    y: duplicate.y + offsetY,
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

/**
 * Moves the selected elements by exactly one slot, preserving their relative
 * order and leaving the input array untouched. A selected block moves as a
 * unit when adjacent selected elements are encountered.
 */
export function moveElementsByOneLayer(
  elements: SceneElement[],
  ids: ElementId[],
  direction: LayerStepDirection,
): SceneElement[] {
  const selectedIds = new Set(ids);
  const result = [...elements];

  if (direction === "forward") {
    for (let index = result.length - 2; index >= 0; index -= 1) {
      if (
        selectedIds.has(result[index].id) &&
        !selectedIds.has(result[index + 1].id)
      ) {
        [result[index], result[index + 1]] = [result[index + 1], result[index]];
      }
    }
  } else {
    for (let index = 1; index < result.length; index += 1) {
      if (
        selectedIds.has(result[index].id) &&
        !selectedIds.has(result[index - 1].id)
      ) {
        [result[index], result[index - 1]] = [result[index - 1], result[index]];
      }
    }
  }

  return result;
}
