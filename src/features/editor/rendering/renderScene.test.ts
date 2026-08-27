import { describe, expect, it, vi } from "vitest";
import { exampleElements } from "../model/exampleScene";
import type { DiamondElement } from "../model/types";

const { renderEvents } = vi.hoisted(() => ({
  renderEvents: [] as string[],
}));

vi.mock("roughjs/bin/rough", () => ({
  default: {
    canvas: () => ({
      rectangle: () => renderEvents.push("element"),
      polygon: () => renderEvents.push("diamond"),
      ellipse: () => renderEvents.push("element"),
      line: () => renderEvents.push("element"),
      path: () => renderEvents.push("element"),
    }),
  },
}));

import { renderScene } from "./renderScene";

function createContext() {
  return {
    canvas: {},
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
    strokeRect: vi.fn(() => renderEvents.push("selection")),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(() => renderEvents.push("element")),
    stroke: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(() => renderEvents.push("element")),
  } as unknown as CanvasRenderingContext2D;
}

describe("renderScene", () => {
  it("despacha diamantes para o renderer de polígonos", () => {
    renderEvents.length = 0;
    const context = createContext();
    const diamond: DiamondElement = {
      id: "diamond-render",
      type: "diamond",
      x: 20,
      y: 30,
      width: 100,
      height: 60,
      rotation: 0,
      strokeColor: "#111827",
      strokeWidth: 2,
      strokeStyle: "solid",
      fillColor: null,
      fillStyle: "none",
      opacity: 1,
      seed: 1,
      roughness: 1,
    };

    renderScene(context, [diamond], []);

    expect(renderEvents).toContain("diamond");
  });

  it("pinta todos os contornos selecionados depois dos elementos", () => {
    renderEvents.length = 0;
    const context = createContext();
    const selectedIds = exampleElements.map((element) => element.id);

    renderScene(context, exampleElements, selectedIds);

    const firstSelection = renderEvents.indexOf("selection");
    const lastElement = renderEvents.lastIndexOf("element");

    expect(renderEvents.filter((event) => event === "selection")).toHaveLength(
      exampleElements.length,
    );
    expect(firstSelection).toBeGreaterThan(lastElement);
  });
});
