import { describe, expect, it } from "vitest";
import { getBoundingBox, hitTestElement } from "./hitTesting";
import type {
  ArrowElement,
  EllipseElement,
  FreehandElement,
  LineElement,
  RectangleElement,
  TextElement,
} from "../model/types";

const base = {
  rotation: 0,
  strokeColor: "#000",
  strokeWidth: 2,
  strokeStyle: "solid" as const,
  fillColor: null,
  fillStyle: "none" as const,
  opacity: 1,
  roughness: 1,
  cornerStyle: "sharp" as const,
  seed: 1,
};

describe("getBoundingBox", () => {
  it("calcula a caixa de um retângulo sem rotação", () => {
    const rectangle: RectangleElement = {
      ...base,
      id: "rectangle",
      type: "rectangle",
      x: 20,
      y: 30,
      width: 100,
      height: 50,
    };

    expect(getBoundingBox(rectangle)).toEqual({
      x: 20,
      y: 30,
      width: 100,
      height: 50,
    });
  });

  it("usa min/max dos pontos do freehand", () => {
    const freehand: FreehandElement = {
      ...base,
      id: "freehand",
      type: "freehand",
      x: 100,
      y: 50,
      strokeWidth: 20,
      points: [
        { x: 30, y: 20 },
        { x: -10, y: 60 },
        { x: 15, y: -5 },
      ],
    };

    expect(getBoundingBox(freehand)).toEqual({
      x: 80,
      y: 35,
      width: 60,
      height: 85,
    });
  });

  it("considera rotação ao gerar a AABB", () => {
    const rectangle: RectangleElement = {
      ...base,
      id: "rotated-rectangle",
      type: "rectangle",
      x: 10,
      y: 20,
      width: 20,
      height: 10,
      rotation: Math.PI / 2,
    };

    const bounds = getBoundingBox(rectangle);

    expect(bounds.x).toBeCloseTo(0);
    expect(bounds.y).toBeCloseTo(20);
    expect(bounds.width).toBeCloseTo(10);
    expect(bounds.height).toBeCloseTo(20);
  });
});

describe("hitTestElement", () => {
  it("testa retângulo no espaço local", () => {
    const rectangle: RectangleElement = {
      ...base,
      id: "rectangle-hit",
      type: "rectangle",
      x: 20,
      y: 30,
      width: 100,
      height: 50,
    };

    expect(hitTestElement(rectangle, { x: 70, y: 50 })).toBe(true);
    expect(hitTestElement(rectangle, { x: 130, y: 90 })).toBe(false);
  });

  it("testa elipse pela equação normalizada", () => {
    const ellipse: EllipseElement = {
      ...base,
      id: "ellipse-hit",
      type: "ellipse",
      x: 20,
      y: 30,
      width: 100,
      height: 60,
    };

    expect(hitTestElement(ellipse, { x: 70, y: 60 })).toBe(true);
    expect(hitTestElement(ellipse, { x: 20, y: 30 })).toBe(false);
  });

  it("acerta linha e seta perto do segmento, mas rejeita distância maior", () => {
    const line: LineElement = {
      ...base,
      id: "line-hit",
      type: "line",
      x: 0,
      y: 0,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    };
    const arrow: ArrowElement = {
      ...base,
      id: "arrow-hit",
      type: "arrow",
      x: 0,
      y: 0,
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 20 },
      ],
    };

    expect(hitTestElement(line, { x: 50, y: 5 })).toBe(true);
    expect(hitTestElement(line, { x: 50, y: 7 })).toBe(false);
    expect(hitTestElement(arrow, { x: 75, y: 10 })).toBe(true);
    expect(hitTestElement(arrow, { x: 75, y: 25 })).toBe(false);
  });

  it("usa a distância até os segmentos do freehand", () => {
    const freehand: FreehandElement = {
      ...base,
      id: "freehand-hit",
      type: "freehand",
      x: 10,
      y: 10,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    };

    expect(hitTestElement(freehand, { x: 60, y: 15 })).toBe(true);
    expect(hitTestElement(freehand, { x: 60, y: 17 })).toBe(false);
  });

  it("usa a bounding box para texto", () => {
    const text: TextElement = {
      ...base,
      id: "text-hit",
      type: "text",
      x: 20,
      y: 30,
      text: "Canvas",
      width: 100,
      height: 30,
      fontSize: 24,
      fontFamily: "Arial",
      fontWeight: "normal",
      textAlign: "left",
    };

    expect(hitTestElement(text, { x: 80, y: 45 })).toBe(true);
    expect(hitTestElement(text, { x: 130, y: 70 })).toBe(false);
  });
});
