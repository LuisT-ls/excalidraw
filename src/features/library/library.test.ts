import { describe, expect, it } from "vitest";
import { exampleElements } from "../editor/model/exampleScene";
import { getSceneBounds } from "../editor/interaction/sceneBounds";
import {
  cloneLibraryElementsForInsertion,
  createLibraryItem,
  getNextLibraryItemName,
  normalizeLibraryElements,
} from "./library";
import type { LibraryItem } from "./types";

describe("library helpers", () => {
  it("normaliza a seleção pelo canto superior esquerdo da bbox conjunta", () => {
    const selected = exampleElements.slice(0, 3);
    const normalized = normalizeLibraryElements(selected);
    const bounds = getSceneBounds(normalized);

    expect(bounds?.x).toBeCloseTo(0);
    expect(bounds?.y).toBeCloseTo(0);
    expect(normalized).not.toBe(selected);
    expect(normalized[0]).not.toBe(selected[0]);
  });

  it("cria um item com elementos independentes da seleção original", () => {
    const item = createLibraryItem(exampleElements.slice(0, 2), "Item 1", "data:image/png;base64,thumb");

    expect(item).toMatchObject({
      name: "Item 1",
      thumbnail: "data:image/png;base64,thumb",
    });
    expect(item.id).toEqual(expect.any(String));
    expect(item.elements).not.toBe(exampleElements);
  });

  it("encontra o próximo nome livre para um item pessoal", () => {
    const items = [
      { id: "1", name: "Item 1", elements: [], thumbnail: "" },
      { id: "2", name: "Item 3", elements: [], thumbnail: "" },
    ] satisfies LibraryItem[];

    expect(getNextLibraryItemName(items)).toBe("Item 2");
  });

  it("insere uma cópia centralizada com novos ids, seeds e grupos", () => {
    const source: LibraryItem = {
      id: "source",
      name: "Grupo",
      thumbnail: "",
      elements: exampleElements.slice(1, 3).map((element) => ({
        ...element,
        groupId: "source-group",
        x: element.x - 200,
        y: element.y - 100,
      })),
    };
    const inserted = cloneLibraryElementsForInsertion(source, { x: 400, y: 250 });
    const bounds = getSceneBounds(inserted);

    expect(bounds?.x).toBeCloseTo(400 - (bounds?.width ?? 0) / 2);
    expect(bounds?.y).toBeCloseTo(250 - (bounds?.height ?? 0) / 2);
    expect(inserted.map((element) => element.id)).not.toEqual(
      source.elements.map((element) => element.id),
    );
    expect(new Set(inserted.map((element) => element.groupId)).size).toBe(1);
    expect(inserted[0].groupId).not.toBe("source-group");
  });
});
