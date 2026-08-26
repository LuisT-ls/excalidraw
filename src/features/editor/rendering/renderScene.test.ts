import { describe, expect, it, vi } from "vitest";
import { exampleElements } from "../model/exampleScene";

const { renderEvents } = vi.hoisted(() => ({
  renderEvents: [] as string[],
}));

vi.mock("roughjs/bin/rough", () => ({
  default: {
    canvas: () => ({
      rectangle: () => renderEvents.push("element"),
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
