import { describe, expect, it } from "vitest";
import {
  convertExcalidrawScene,
  getExcalidrawBackgroundColor,
} from "./excalidrawImport";

describe("convertExcalidrawScene", () => {
  it("converte os tipos suportados e normaliza os campos do Excalidraw", () => {
    const result = convertExcalidrawScene({
      type: "excalidraw",
      elements: [
        {
          id: "rectangle-id",
          type: "rectangle",
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          angle: Math.PI / 4,
          strokeColor: "#2563eb",
          strokeWidth: 3,
          roughness: 2,
          seed: 101,
          opacity: 25,
          backgroundColor: "transparent",
        },
        {
          id: "ellipse-id",
          type: "ellipse",
          x: 140,
          y: 20,
          width: 80,
          height: 60,
          backgroundColor: "#fce7f3",
          opacity: 100,
        },
        {
          id: "line-id",
          type: "line",
          x: 10,
          y: 100,
          points: [[0, 0], [100, 40]],
        },
        {
          id: "arrow-id",
          type: "arrow",
          x: 140,
          y: 100,
          points: [[0, 0], [80, 20]],
          endArrowhead: "triangle",
        },
        {
          id: "draw-id",
          type: "draw",
          x: 10,
          y: 180,
          points: [[0, 0], [12, 4], [24, 0]],
        },
        {
          id: "freedraw-id",
          type: "freedraw",
          x: 80,
          y: 180,
          points: [[0, 0], [10, 8]],
        },
        {
          id: "text-id",
          type: "text",
          x: 140,
          y: 180,
          text: "Imported",
          fontSize: 20,
          textAlign: "center",
          fontFamily: 2,
          opacity: 50,
        },
      ],
    });

    expect(result.elements.map((element) => element.type)).toEqual([
      "rectangle",
      "ellipse",
      "line",
      "arrow",
      "freehand",
      "freehand",
      "text",
    ]);

    expect(result.elements[0]).toMatchObject({
      x: 10,
      y: 20,
      rotation: Math.PI / 4,
      strokeColor: "#2563eb",
      strokeWidth: 3,
      roughness: 2,
      seed: 101,
      opacity: 0.25,
      fillColor: null,
      fillStyle: "none",
    });

    expect(result.elements[2]).toMatchObject({
      type: "line",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 40 },
      ],
    });
    expect(result.elements[3]).toMatchObject({
      type: "arrow",
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 20 },
      ],
    });
    expect(result.elements[4]).toMatchObject({
      type: "freehand",
      points: [
        { x: 0, y: 0 },
        { x: 12, y: 4 },
        { x: 24, y: 0 },
      ],
    });
    expect(result.elements[6]).toMatchObject({
      type: "text",
      text: "Imported",
      fontSize: 20,
      fontFamily: "Arial, sans-serif",
      textAlign: "center",
      opacity: 0.5,
    });

    expect(result.elements.every((element) => element.id !== "rectangle-id")).toBe(
      true,
    );
    expect(result.skipped).toEqual([]);
  });

  it("contabiliza tipos não suportados sem criar elementos", () => {
    const result = convertExcalidrawScene({
      type: "excalidraw",
      elements: [
        { type: "image" },
        { type: "frame" },
        { type: "embeddable" },
      ],
    });

    expect(result.elements).toEqual([]);
    expect(result.skipped).toEqual([
      { type: "image", count: 1 },
      { type: "frame", count: 1 },
      { type: "embeddable", count: 1 },
    ]);
  });

  it("converte diamond do Excalidraw para a forma local", () => {
    const result = convertExcalidrawScene({
      type: "excalidraw",
      elements: [
        {
          type: "diamond",
          x: 30,
          y: 40,
          width: 120,
          height: 80,
          angle: Math.PI / 6,
          strokeColor: "#7c3aed",
          strokeWidth: 4,
          backgroundColor: "#ede9fe",
          opacity: 75,
          seed: 42,
          roughness: 2,
        },
      ],
    });

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]).toMatchObject({
      type: "diamond",
      x: 30,
      y: 40,
      width: 120,
      height: 80,
      rotation: Math.PI / 6,
      strokeColor: "#7c3aed",
      strokeWidth: 4,
      fillColor: "#ede9fe",
      fillStyle: "solid",
      opacity: 0.75,
      seed: 42,
      roughness: 2,
    });
    expect(result.skipped).toEqual([]);
  });

  it("ignora elementos de desenho malformados e elementos deletados", () => {
    const result = convertExcalidrawScene({
      type: "excalidraw",
      elements: [
        { type: "line", points: [[0, 0]] },
        { type: "draw", points: [[0, "invalid"]] },
        { type: "rectangle", isDeleted: true, width: 10, height: 10 },
      ],
    });

    expect(result.elements).toEqual([]);
    expect(result.skipped).toEqual([
      { type: "line", count: 1 },
      { type: "draw", count: 1 },
    ]);
  });
});

describe("getExcalidrawBackgroundColor", () => {
  it("lê a cor de fundo do appState", () => {
    expect(
      getExcalidrawBackgroundColor({
        type: "excalidraw",
        appState: { viewBackgroundColor: "#dbeafe" },
      }),
    ).toBe("#dbeafe");
  });

  it("retorna undefined quando não há cor de fundo válida", () => {
    expect(getExcalidrawBackgroundColor({ type: "excalidraw" })).toBeUndefined();
  });
});
