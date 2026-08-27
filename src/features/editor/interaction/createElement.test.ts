import { describe, expect, it } from "vitest";
import {
  createElementFromDrag,
  createFreehandElement,
} from "./createElement";

const style = {
  strokeColor: "#ef4444",
  strokeWidth: 4,
  fillColor: null,
  fillStyle: "none" as const,
};

describe("createElementFromDrag", () => {
  it("normaliza a origem e o tamanho de um retângulo arrastado para trás", () => {
    const element = createElementFromDrag(
      "rectangle",
      { x: 200, y: 150 },
      { x: 80, y: 40 },
      style,
      "rectangle-1",
      10,
    );

    expect(element).toMatchObject({
      type: "rectangle",
      x: 80,
      y: 40,
      width: 120,
      height: 110,
      strokeColor: "#ef4444",
      strokeWidth: 4,
    });
  });

  it("cria um diamante com a mesma bounding box normalizada das formas", () => {
    const element = createElementFromDrag(
      "diamond",
      { x: 200, y: 150 },
      { x: 80, y: 40 },
      style,
      "diamond-1",
      15,
    );

    expect(element).toMatchObject({
      type: "diamond",
      x: 80,
      y: 40,
      width: 120,
      height: 110,
      strokeColor: "#ef4444",
      strokeWidth: 4,
    });
  });

  it("mantém linhas e setas na origem inicial com pontos locais", () => {
    const line = createElementFromDrag(
      "line",
      { x: 200, y: 150 },
      { x: 80, y: 40 },
      style,
      "line-1",
      20,
    );
    const arrow = createElementFromDrag(
      "arrow",
      { x: 10, y: 20 },
      { x: 60, y: 90 },
      style,
      "arrow-1",
      30,
    );

    expect(line).toMatchObject({
      type: "line",
      x: 200,
      y: 150,
      points: [
        { x: 0, y: 0 },
        { x: -120, y: -110 },
      ],
    });
    expect(arrow).toMatchObject({
      type: "arrow",
      x: 10,
      y: 20,
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 70 },
      ],
    });
  });

  it("cria freehand com origem mundial e pontos locais sem preenchimento", () => {
    const element = createFreehandElement(
      { x: 300, y: 200 },
      [
        { x: 0, y: 0 },
        { x: 12, y: 8 },
        { x: 24, y: 2 },
      ],
      style,
      "freehand-1",
      40,
    );

    expect(element).toMatchObject({
      type: "freehand",
      x: 300,
      y: 200,
      strokeColor: "#ef4444",
      strokeWidth: 4,
      fillColor: null,
      fillStyle: "none",
      points: [
        { x: 0, y: 0 },
        { x: 12, y: 8 },
        { x: 24, y: 2 },
      ],
    });
  });
});
