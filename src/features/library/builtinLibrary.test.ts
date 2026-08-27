import { describe, expect, it } from "vitest";
import { getSceneBounds } from "../editor/interaction/sceneBounds";
import { BUILTIN_LIBRARY } from "./builtinLibrary";

describe("builtinLibrary", () => {
  it("fornece um conjunto de itens com bounding boxes normalizadas", () => {
    expect(BUILTIN_LIBRARY.length).toBeGreaterThanOrEqual(6);

    for (const item of BUILTIN_LIBRARY) {
      const bounds = getSceneBounds(item.elements);

      expect(bounds).not.toBeNull();
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      expect(bounds?.y).toBeGreaterThanOrEqual(0);
    }
  });
});
