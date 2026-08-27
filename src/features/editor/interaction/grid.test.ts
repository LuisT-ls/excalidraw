import { describe, expect, it } from "vitest";
import {
  getGridCoordinates,
  snapMoveDeltaToGrid,
  snapPointToGrid,
} from "./grid";

describe("grid helpers", () => {
  it("arredonda pontos para o múltiplo mais próximo", () => {
    expect(snapPointToGrid({ x: 31, y: 49 })).toEqual({ x: 40, y: 40 });
  });

  it("calcula um delta comum a partir da posição do elemento âncora", () => {
    expect(snapMoveDeltaToGrid({ x: 13, y: 37 }, { x: 8, y: 10 })).toEqual({
      x: 7,
      y: 3,
    });
  });

  it("gera coordenadas somente na área visível", () => {
    expect(
      getGridCoordinates({ x: 5, y: -25, width: 40, height: 50 }, 20),
    ).toEqual({
      vertical: [0, 20, 40],
      horizontal: [-40, -20, 0, 20],
    });
  });
});
