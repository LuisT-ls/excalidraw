import { describe, expect, it } from "vitest";
import { createImageElement, getFittedImageSize } from "./image";

const style = {
  strokeColor: "#1f2937",
  strokeWidth: 2,
  strokeStyle: "solid" as const,
  fillColor: null,
  fillStyle: "none" as const,
  opacity: 1,
  roughness: 1.4,
  cornerStyle: "sharp" as const,
};

describe("image interaction", () => {
  it("limita o maior lado preservando a proporção", () => {
    expect(getFittedImageSize(1200, 600, 300)).toEqual({
      width: 300,
      height: 150,
    });
    expect(getFittedImageSize(100, 50, 300)).toEqual({
      width: 100,
      height: 50,
    });
  });

  it("cria a imagem centralizada no ponto indicado", () => {
    const element = createImageElement(
      {
        src: "data:image/png;base64,abc",
        naturalWidth: 400,
        naturalHeight: 200,
      },
      { x: 500, y: 300 },
      style,
      "image-1",
      123,
    );

    expect(element).toMatchObject({
      id: "image-1",
      type: "image",
      x: 350,
      y: 225,
      width: 300,
      height: 150,
      src: "data:image/png;base64,abc",
      seed: 123,
    });
  });
});
