import { describe, expect, it } from "vitest";
import { calculateSmartGuides } from "./smartGuides";
import type { SceneElement } from "../model/types";

const base = {
  groupId: null,
  rotation: 0,
  strokeColor: "#111827",
  strokeWidth: 2,
  strokeStyle: "solid" as const,
  fillColor: null,
  fillStyle: "none" as const,
  opacity: 1,
  seed: 1,
  roughness: 1,
  cornerStyle: "sharp" as const,
};

function rectangle(id: string, x: number, y: number): SceneElement {
  return {
    ...base,
    id,
    type: "rectangle",
    x,
    y,
    width: 100,
    height: 60,
  };
}

describe("smart guides", () => {
  it("encaixa bordas próximas e retorna uma guia vertical", () => {
    const result = calculateSmartGuides(
      [rectangle("moving", 90, 40), rectangle("stationary", 200, 120)],
      ["moving"],
      { x: 9, y: 0 },
      1,
    );

    expect(result.delta.x).toBe(10);
    expect(result.delta.y).toBe(0);
    expect(result.guides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orientation: "vertical",
          position: 200,
        }),
      ]),
    );
  });

  it("compara somente contra elementos fora da seleção e rejeita distância grande", () => {
    const result = calculateSmartGuides(
      [
        rectangle("moving", 0, 0),
        rectangle("also-moving", 200, 0),
        rectangle("far-away", 500, 500),
      ],
      ["moving", "also-moving"],
      { x: 7, y: 7 },
      1,
    );

    expect(result.delta).toEqual({ x: 7, y: 7 });
    expect(result.guides).toEqual([]);
  });

  it("interpreta a tolerância em pixels de tela quando há zoom", () => {
    const result = calculateSmartGuides(
      [rectangle("moving", 90, 0), rectangle("stationary", 200, 100)],
      ["moving"],
      { x: 6, y: 0 },
      2,
    );

    expect(result.delta.x).toBe(10);
  });
});
