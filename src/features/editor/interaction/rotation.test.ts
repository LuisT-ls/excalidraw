import { describe, expect, it } from "vitest";
import { calculateRotation, snapRotation } from "./rotation";

describe("rotation helpers", () => {
  it("calcula a rotação relativa ao handle inicial sem salto", () => {
    const quarterTurn = calculateRotation(
      { x: 0, y: 0 },
      { x: 0, y: -10 },
      { x: 10, y: 0 },
    );

    expect(quarterTurn).toBeCloseTo(Math.PI / 2);
    expect(
      calculateRotation({ x: 0, y: 0 }, { x: 0, y: -10 }, { x: 0, y: -10 }),
    ).toBeCloseTo(0);
  });

  it("arredonda para incrementos de 15 graus", () => {
    expect(snapRotation((22 * Math.PI) / 180)).toBeCloseTo((15 * Math.PI) / 180);
    expect(snapRotation((38 * Math.PI) / 180)).toBeCloseTo((45 * Math.PI) / 180);
  });
});
