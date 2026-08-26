import { describe, expect, it } from "vitest";
import {
  easeOutCubic,
  getElementPopScale,
  interpolateViewport,
} from "./animation";

describe("render animations", () => {
  it("faz o pop começar menor e terminar em escala normal", () => {
    expect(getElementPopScale(0)).toBe(0.85);
    expect(getElementPopScale(90)).toBeGreaterThan(0.85);
    expect(getElementPopScale(180)).toBe(1);
  });

  it("interpola o viewport e limita o progresso", () => {
    const result = interpolateViewport(
      { offsetX: 0, offsetY: 10, zoom: 1 },
      { offsetX: 100, offsetY: 30, zoom: 2 },
      0.5,
    );

    expect(result).toEqual({ offsetX: 50, offsetY: 20, zoom: 1.5 });
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });
});
