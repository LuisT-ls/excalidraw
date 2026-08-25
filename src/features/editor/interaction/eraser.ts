import { hitTestElement } from "./hitTesting";
import type { ElementId, Point, SceneElement } from "../model/types";

/**
 * Retorna todos os elementos tocados pelo cursor, não apenas o que está no topo.
 * O Set evita que um mesmo elemento seja processado novamente no mesmo gesto.
 */
export function getEraserHitIds(
  elements: SceneElement[],
  point: Point,
  alreadyRemovedIds: ReadonlySet<ElementId>,
): ElementId[] {
  return elements
    .filter(
      (element) =>
        !alreadyRemovedIds.has(element.id) && hitTestElement(element, point),
    )
    .map((element) => element.id);
}
