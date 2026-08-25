import { describe, expect, it } from "vitest";
import { exampleElements } from "../model/exampleScene";
import type { FreehandElement, LineElement, TextElement } from "../model/types";
import {
  calculateTextResizeFontSize,
  resizeElement,
  resizeFreehandPoints,
  resizeLineElement,
} from "./resize";

describe("resizeElement", () => {
  it("calcula os quatro handles mantendo o canto oposto fixo", () => {
    expect(
      resizeElement(
        "top-left",
        { x: 300, y: 200 },
        { x: 80, y: 70 },
      ),
    ).toEqual({ x: 80, y: 70, width: 220, height: 130 });

    expect(
      resizeElement(
        "top-right",
        { x: 100, y: 200 },
        { x: 340, y: 60 },
      ),
    ).toEqual({ x: 100, y: 60, width: 240, height: 140 });

    expect(
      resizeElement(
        "bottom-left",
        { x: 300, y: 100 },
        { x: 50, y: 250 },
      ),
    ).toEqual({ x: 50, y: 100, width: 250, height: 150 });

    expect(
      resizeElement(
        "bottom-right",
        { x: 100, y: 100 },
        { x: 350, y: 240 },
      ),
    ).toEqual({ x: 100, y: 100, width: 250, height: 140 });
  });

  it("inverte a origem quando o handle passa do canto fixo", () => {
    expect(
      resizeElement(
        "bottom-right",
        { x: 100, y: 100 },
        { x: 50, y: 80 },
      ),
    ).toEqual({ x: 50, y: 80, width: 50, height: 20 });
  });

  it("aplica o tamanho mínimo sem dimensões negativas", () => {
    expect(
      resizeElement(
        "bottom-right",
        { x: 100, y: 100 },
        { x: 101, y: 102 },
        4,
      ),
    ).toEqual({ x: 100, y: 100, width: 4, height: 4 });
  });

  it("redimensiona a ponta final de linha mantendo a origem", () => {
    const line = exampleElements.find(
      (element): element is LineElement => element.type === "line",
    )!;

    expect(
      resizeLineElement(line, "end", { x: 300, y: 480 }),
    ).toMatchObject({
      x: line.x,
      y: line.y,
      points: [line.points[0], { x: 150, y: 130 }],
    });
  });

  it("redimensiona a ponta inicial mantendo a ponta final absoluta", () => {
    const line: LineElement = {
      ...exampleElements.find(
        (element): element is LineElement => element.type === "line",
      )!,
      x: 100,
      y: 100,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    };

    expect(resizeLineElement(line, "start", { x: 50, y: 50 })).toEqual({
      x: 50,
      y: 50,
      points: [
        { x: 0, y: 0 },
        { x: 150, y: 50 },
      ],
    });
  });

  it("escala todos os pontos de freehand em torno do canto fixo", () => {
    const freehand: FreehandElement = {
      ...exampleElements.find(
        (element): element is FreehandElement => element.type === "freehand",
      )!,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    };

    expect(
      resizeFreehandPoints(
        freehand,
        "bottom-right",
        { x: 0, y: 0 },
        { x: 40, y: 30 },
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 15 },
      { x: 40, y: 30 },
    ]);
  });

  it("calcula o fontSize proporcional do texto com limites", () => {
    const text = exampleElements.find(
      (element): element is TextElement => element.type === "text",
    )!;
    const fixedCorner = { x: 0, y: text.height };

    expect(
      calculateTextResizeFontSize(
        text,
        "top-right",
        fixedCorner,
        { x: text.width * 2, y: -text.height },
      ),
    ).toBeCloseTo(text.fontSize * 2);
    expect(
      calculateTextResizeFontSize(
        text,
        "top-right",
        fixedCorner,
        { x: 0, y: 0 },
      ),
    ).toBe(8);
  });
});
