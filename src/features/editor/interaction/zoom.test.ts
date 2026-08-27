import { describe, expect, it } from "vitest";
import { screenToWorld } from "./coordinates";
import { zoomAt, zoomByFactorAt } from "./zoom";

describe("zoom helpers", () => {
  it("mantém o mesmo ponto do mundo sob o cursor", () => {
    const viewport = { offsetX: 100, offsetY: 50, zoom: 1 };
    const cursor = { x: 250, y: 200 };
    const next = zoomByFactorAt(viewport, cursor, 1.1, 0.1, 8);

    expect(screenToWorld(cursor, next)).toEqual(
      screenToWorld(cursor, viewport),
    );
  });

  it("mantém o centro ao redefinir o zoom para 100%", () => {
    const viewport = { offsetX: -40, offsetY: 80, zoom: 2 };
    const center = { x: 400, y: 300 };
    const next = zoomAt(viewport, center, 1, 0.1, 8);

    expect(next.zoom).toBe(1);
    expect(screenToWorld(center, next)).toEqual(
      screenToWorld(center, viewport),
    );
  });
});
