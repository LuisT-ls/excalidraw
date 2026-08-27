import { describe, expect, it } from "vitest";
import {
  appendLaserTrailPoint,
  LASER_TRAIL_DURATION_MS,
  pruneLaserTrail,
} from "./laserTrail";

describe("laserTrail", () => {
  it("adiciona pontos com timestamp sem alterar a lista anterior", () => {
    const previous = [{ x: 10, y: 20, timestamp: 100 }];

    const next = appendLaserTrailPoint(previous, { x: 30, y: 40 }, 120);

    expect(previous).toHaveLength(1);
    expect(next).toEqual([
      { x: 10, y: 20, timestamp: 100 },
      { x: 30, y: 40, timestamp: 120 },
    ]);
  });

  it("mantém apenas os pontos dentro da janela de visibilidade", () => {
    const points = [
      { x: 0, y: 0, timestamp: 99 },
      { x: 10, y: 10, timestamp: 400 },
      { x: 20, y: 20, timestamp: 800 },
    ];

    expect(pruneLaserTrail(points, 800)).toEqual([
      { x: 10, y: 10, timestamp: 400 },
      { x: 20, y: 20, timestamp: 800 },
    ]);
    expect(
      pruneLaserTrail(points, 800, LASER_TRAIL_DURATION_MS),
    ).toHaveLength(2);
  });
});
