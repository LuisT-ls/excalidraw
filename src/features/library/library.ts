import { cloneSceneElements } from "../editor/model/clone";
import { generateElementId, generateGroupId, generateSeed } from "../editor/model/ids";
import type { Point, SceneElement } from "../editor/model/types";
import { duplicateSceneElement } from "../editor/interaction/elementActions";
import { getSceneBounds } from "../editor/interaction/sceneBounds";
import type { LibraryItem } from "./types";

export function normalizeLibraryElements(
  elements: SceneElement[],
): SceneElement[] {
  const bounds = getSceneBounds(elements);

  if (!bounds) {
    return [];
  }

  return cloneSceneElements(elements).map((element) => ({
    ...element,
    x: element.x - bounds.x,
    y: element.y - bounds.y,
  }));
}

export function getNextLibraryItemName(items: LibraryItem[]): string {
  const names = new Set(items.map((item) => item.name));
  let index = 1;

  while (names.has(`Item ${index}`)) {
    index += 1;
  }

  return `Item ${index}`;
}

export function createLibraryItem(
  elements: SceneElement[],
  name: string,
  thumbnail: string,
): LibraryItem {
  return {
    id: generateElementId(),
    name,
    elements: normalizeLibraryElements(elements),
    thumbnail,
  };
}

/**
 * Clones an item for insertion and centers its complete bounding box at the
 * requested world point. Group ids are remapped so two inserted copies never
 * become members of the same group by accident.
 */
export function cloneLibraryElementsForInsertion(
  item: LibraryItem | Pick<LibraryItem, "elements">,
  center: Point,
): SceneElement[] {
  const elements = normalizeLibraryElements(item.elements);
  const bounds = getSceneBounds(elements);

  if (!bounds) {
    return [];
  }

  const offset = {
    x: center.x - (bounds.x + bounds.width / 2),
    y: center.y - (bounds.y + bounds.height / 2),
  };
  const groupIds = new Map<string, string>();

  return elements.map((element) => {
    let groupId: string | null = null;

    if (element.groupId) {
      const existingGroupId = groupIds.get(element.groupId);
      groupId = existingGroupId ?? generateGroupId();
      groupIds.set(element.groupId, groupId);
    }

    return {
      ...duplicateSceneElement(
        element,
        generateElementId(),
        generateSeed(),
        offset,
      ),
      groupId,
    };
  });
}
