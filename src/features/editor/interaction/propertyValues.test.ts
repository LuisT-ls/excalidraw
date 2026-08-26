import { describe, expect, it } from "vitest";
import {
  clampOpacityPercent,
  opacityToPercent,
  percentToOpacity,
} from "./propertyValues";

describe("property values", () => {
  it("converte opacidade entre a escala visual e a escala interna", () => {
    expect(opacityToPercent(0.5)).toBe(50);
    expect(percentToOpacity(25)).toBe(0.25);
  });

  it("limita valores de opacidade ao intervalo permitido", () => {
    expect(clampOpacityPercent(-10)).toBe(0);
    expect(clampOpacityPercent(130)).toBe(100);
    expect(percentToOpacity(150)).toBe(1);
  });
});
