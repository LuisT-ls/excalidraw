import { describe, expect, it } from "vitest";
import { getEraserHitIds } from "./eraser";
import type { RectangleElement } from "../model/types";

const base = {
  rotation: 0,
  strokeColor: "#111827",
  strokeWidth: 2,
  fillColor: null,
  fillStyle: "none" as const,
  opacity: 1,
  roughness: 1.4,
};

function rectangle(
  id: string,
  x: number,
  y: number,
): RectangleElement {
  return {
    ...base,
    id,
    type: "rectangle",
    x,
    y,
    width: 80,
    height: 60,
    seed: 1,
  };
}

describe("getEraserHitIds", () => {
  it("encontra o elemento único tocado pelo cursor", () => {
    const elements = [rectangle("first", 100, 100)];

    expect(getEraserHitIds(elements, { x: 130, y: 120 }, new Set())).toEqual([
      "first",
    ]);
    expect(getEraserHitIds(elements, { x: 300, y: 300 }, new Set())).toEqual(
      [],
    );
  });

  it("retorna elementos sobrepostos e ignora IDs já removidos no gesto", () => {
    const elements = [
      rectangle("bottom", 100, 100),
      rectangle("top", 120, 110),
    ];

    expect(getEraserHitIds(elements, { x: 140, y: 130 }, new Set())).toEqual([
      "bottom",
      "top",
    ]);
    expect(
      getEraserHitIds(elements, { x: 140, y: 130 }, new Set(["bottom"])),
    ).toEqual(["top"]);
  });
});
