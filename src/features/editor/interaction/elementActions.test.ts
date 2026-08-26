import { describe, expect, it } from "vitest";
import { exampleElements } from "../model/exampleScene";
import {
  duplicateSceneElement,
  moveElementsByOneLayer,
  reorderElements,
} from "./elementActions";

describe("element actions", () => {
  it("duplica um elemento com novos identificadores e deslocamento", () => {
    const original = exampleElements[1];
    const duplicate = duplicateSceneElement(original, "copy", 999, 20);

    expect(duplicate).toMatchObject({
      id: "copy",
      seed: 999,
      x: original.x + 20,
      y: original.y + 20,
    });
    expect(duplicate).not.toBe(original);
    expect(duplicate).not.toHaveProperty("id", original.id);
  });

  it("aceita deslocamento independente por eixo para colar numa posição", () => {
    const original = exampleElements[1];
    const duplicate = duplicateSceneElement(original, "paste", 1000, {
      x: 45,
      y: -12,
    });

    expect(duplicate).toMatchObject({
      x: original.x + 45,
      y: original.y - 12,
    });
  });

  it("reordena para frente e para trás sem mutar o array original", () => {
    const original = exampleElements.slice(0, 3);
    const front = reorderElements(original, original[0].id, "front");
    const back = reorderElements(original, original[2].id, "back");

    expect(front.map((element) => element.id)).toEqual([
      original[1].id,
      original[2].id,
      original[0].id,
    ]);
    expect(back.map((element) => element.id)).toEqual([
      original[2].id,
      original[0].id,
      original[1].id,
    ]);
    expect(original.map((element) => element.id)).toEqual([
      "example-text",
      "example-rectangle",
      "example-ellipse",
    ]);

    const multiple = reorderElements(
      original,
      [original[0].id, original[1].id],
      "front",
    );
    expect(multiple.map((element) => element.id)).toEqual([
      original[2].id,
      original[0].id,
      original[1].id,
    ]);
  });

  it("move um elemento exatamente uma camada por vez", () => {
    const original = exampleElements.slice(0, 4);
    const forward = moveElementsByOneLayer(
      original,
      [original[1].id],
      "forward",
    );
    const backward = moveElementsByOneLayer(
      original,
      [original[2].id],
      "backward",
    );

    expect(forward.map((element) => element.id)).toEqual([
      original[0].id,
      original[2].id,
      original[1].id,
      original[3].id,
    ]);
    expect(backward.map((element) => element.id)).toEqual([
      original[0].id,
      original[2].id,
      original[1].id,
      original[3].id,
    ]);
    expect(original.map((element) => element.id)).toEqual([
      "example-text",
      "example-rectangle",
      "example-ellipse",
      "example-line",
    ]);
  });

  it("move uma seleção contígua como bloco, sem alterar a ordem interna", () => {
    const original = exampleElements.slice(0, 4);
    const result = moveElementsByOneLayer(
      original,
      [original[1].id, original[2].id],
      "forward",
    );

    expect(result.map((element) => element.id)).toEqual([
      original[0].id,
      original[3].id,
      original[1].id,
      original[2].id,
    ]);
  });
});
