import { describe, expect, it } from "vitest";
import { exampleElements } from "../model/exampleScene";
import { duplicateSceneElement, reorderElements } from "./elementActions";

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
});
