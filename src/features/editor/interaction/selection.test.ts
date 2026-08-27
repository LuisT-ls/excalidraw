import { describe, expect, it } from "vitest";
import { exampleElements } from "../model/exampleScene";
import {
  getElementsIntersectingBounds,
  getGroupMemberIds,
  normalizeSelectionBounds,
  toggleSelectedElement,
  toggleSelectedElements,
} from "./selection";
import type { SceneElement } from "../model/types";

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

  it("expande o clique para todos os membros de um grupo", () => {
    const groupedElements = [
      { ...exampleElements[0], id: "group-a", groupId: "group-1" },
      { ...exampleElements[1], id: "group-b", groupId: "group-1" },
      { ...exampleElements[2], id: "solo", groupId: null },
    ];

    expect(getGroupMemberIds(groupedElements, "group-a")).toEqual([
      "group-a",
      "group-b",
    ]);
    expect(getGroupMemberIds(groupedElements, "solo")).toEqual(["solo"]);
    expect(toggleSelectedElements(["solo"], ["group-a", "group-b"])).toEqual([
      "solo",
      "group-a",
      "group-b",
    ]);
    expect(toggleSelectedElements(
      ["solo", "group-a", "group-b"],
      ["group-a", "group-b"],
    )).toEqual(["solo"]);
  });

  it("suporta Wrap exigindo que o bbox fique inteiro dentro da área", () => {
    const elements: SceneElement[] = [
      {
        id: "inside",
        type: "rectangle",
        groupId: null,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        rotation: 0,
        strokeColor: "#000",
        strokeWidth: 2,
        strokeStyle: "solid",
        fillColor: null,
        fillStyle: "none",
        opacity: 1,
        seed: 1,
        roughness: 1,
        cornerStyle: "sharp",
      },
      {
        id: "partial",
        type: "rectangle",
        groupId: null,
        x: 8,
        y: 8,
        width: 10,
        height: 10,
        rotation: 0,
        strokeColor: "#000",
        strokeWidth: 2,
        strokeStyle: "solid",
        fillColor: null,
        fillStyle: "none",
        opacity: 1,
        seed: 2,
        roughness: 1,
        cornerStyle: "sharp",
      },
    ];
    const bounds = normalizeSelectionBounds({ x: -2, y: -2 }, { x: 15, y: 15 });

    expect(getElementsIntersectingBounds(elements, bounds, "overlap")).toEqual([
      "inside",
      "partial",
    ]);
    expect(getElementsIntersectingBounds(elements, bounds, "wrap")).toEqual([
      "inside",
    ]);
  });
});
