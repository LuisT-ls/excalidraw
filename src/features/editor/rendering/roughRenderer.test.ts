import { describe, expect, it, vi } from "vitest";
import { getStrokeLineDash, renderText } from "./roughRenderer";
import type { TextElement } from "../model/types";

describe("renderText", () => {
  it("desenha cada linha na posição vertical correspondente", () => {
    const fillText = vi.fn();
    const context = {
      fillText,
    } as unknown as CanvasRenderingContext2D;
    const element: TextElement = {
      id: "multiline-text",
      type: "text",
      x: 0,
      y: 0,
      rotation: 0,
      strokeColor: "#111827",
      strokeWidth: 2,
      strokeStyle: "solid",
      fillColor: null,
      fillStyle: "none",
      opacity: 1,
      seed: 1,
      roughness: 1,
      text: "primeira\nsegunda\nterceira",
      width: 100,
      height: 86.4,
      fontSize: 24,
      fontFamily: "Arial",
      fontWeight: "normal",
      textAlign: "center",
    };

    renderText(context, element);

    expect(fillText).toHaveBeenNthCalledWith(1, "primeira", 0, 0);
    expect(fillText.mock.calls[1][0]).toBe("segunda");
    expect(fillText.mock.calls[1][1]).toBe(0);
    expect(fillText.mock.calls[1][2]).toBeCloseTo(28.8);
    expect(fillText.mock.calls[2][0]).toBe("terceira");
    expect(fillText.mock.calls[2][1]).toBe(0);
    expect(fillText.mock.calls[2][2]).toBeCloseTo(57.6);
  });
});

describe("stroke styles", () => {
  it("mapeia sólido, tracejado e pontilhado para os padrões de traço", () => {
    expect(getStrokeLineDash("solid")).toBeUndefined();
    expect(getStrokeLineDash("dashed")).toEqual([12, 8]);
    expect(getStrokeLineDash("dotted")).toEqual([2, 6]);
  });
});
