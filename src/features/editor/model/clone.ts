import type { Point, SceneElement } from "./types";

/**
 * Clones an element deeply enough that point arrays cannot be mutated through
 * a history snapshot or an internal clipboard reference.
 */
export function cloneSceneElement(element: SceneElement): SceneElement {
  if (element.type === "line" || element.type === "arrow") {
    return {
      ...element,
      points: element.points.map((point) => ({ ...point })) as [
        Point,
        Point,
        ...Point[],
      ],
    };
  }

  if (element.type === "freehand") {
    return {
      ...element,
      points: element.points.map((point) => ({ ...point })),
    };
  }

  return { ...element };
}

export function cloneSceneElements(elements: SceneElement[]): SceneElement[] {
  return elements.map(cloneSceneElement);
}
