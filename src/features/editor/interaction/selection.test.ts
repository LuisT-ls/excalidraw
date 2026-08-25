import { describe, expect, it } from "vitest";
import { exampleElements } from "../model/exampleScene";
import {
  getElementsIntersectingBounds,
  normalizeSelectionBounds,
  toggleSelectedElement,
} from "./selection";

describe("selection helpers", () => {
  it("seleciona elementos com qualquer interseção com o marquee", () => {
    const bounds = normalizeSelectionBounds({ x: 300, y: 90 }, { x: 500, y: 180 });

    expect(getElementsIntersectingBounds(exampleElements, bounds)).toEqual([
      "example-rectangle",
      "example-ellipse",
    ]);
  });

  it("normaliza um marquee arrastado em qualquer direção", () => {
    expect(normalizeSelectionBounds({ x: 20, y: 80 }, { x: 5, y: 30 })).toEqual({
      x: 5,
      y: 30,
      width: 15,
      height: 50,
    });
  });

  it("alterna um elemento sem perder os demais selecionados", () => {
    expect(toggleSelectedElement(["a", "b"], "c")).toEqual(["a", "b", "c"]);
    expect(toggleSelectedElement(["a", "b"], "a")).toEqual(["b"]);
  });
});
