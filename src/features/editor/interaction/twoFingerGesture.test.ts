import { describe, expect, it } from "vitest";
import {
  getTwoFingerFrame,
  updateViewportForTwoFingerGesture,
} from "./twoFingerGesture";

describe("twoFingerGesture", () => {
  it("calcula o ponto médio e a distância entre os toques", () => {
    expect(getTwoFingerFrame({ x: 10, y: 20 }, { x: 30, y: 60 })).toEqual({
      midpoint: { x: 20, y: 40 },
      distance: Math.hypot(20, 40),
    });
  });

  it("mantém o ponto do mundo sob o midpoint durante o zoom", () => {
    const viewport = { offsetX: 100, offsetY: 50, zoom: 1 };
    const previousFrame = {
      midpoint: { x: 200, y: 150 },
      distance: 100,
    };
    const currentFrame = {
      midpoint: { x: 200, y: 150 },
      distance: 200,
    };

    expect(
      updateViewportForTwoFingerGesture(
        viewport,
        previousFrame,
        currentFrame,
        0.1,
        8,
      ),
    ).toEqual({
      zoom: 2,
      offsetX: 0,
      offsetY: -50,
    });
  });

  it("translada o viewport quando o midpoint se desloca sem mudar o zoom", () => {
    const viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
    const previousFrame = {
      midpoint: { x: 100, y: 100 },
      distance: 80,
    };
    const currentFrame = {
      midpoint: { x: 130, y: 115 },
      distance: 80,
    };

    expect(
      updateViewportForTwoFingerGesture(
        viewport,
        previousFrame,
        currentFrame,
        0.1,
        8,
      ),
    ).toEqual({
      zoom: 1,
      offsetX: 30,
      offsetY: 15,
    });
  });

  it("respeita os limites de zoom", () => {
    const viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
    const previousFrame = {
      midpoint: { x: 100, y: 100 },
      distance: 100,
    };

    expect(
      updateViewportForTwoFingerGesture(
        viewport,
        previousFrame,
        { midpoint: { x: 100, y: 100 }, distance: 1_000 },
        0.5,
        2,
      ).zoom,
    ).toBe(2);

    expect(
      updateViewportForTwoFingerGesture(
        viewport,
        previousFrame,
        { midpoint: { x: 100, y: 100 }, distance: 1 },
        0.5,
        2,
      ).zoom,
    ).toBe(1);
  });
});
