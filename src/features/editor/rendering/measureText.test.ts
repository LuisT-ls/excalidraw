import { afterEach, describe, expect, it, vi } from "vitest";
import { measureText } from "./measureText";

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
  vi.restoreAllMocks();
});

describe("measureText", () => {
  it("retorna uma estimativa segura quando executada em SSR", () => {
    expect(measureText("abc", 10, "Arial")).toEqual({
      width: 18,
      height: 12,
    });
  });

  it("mede a maior linha e soma a altura de todas as linhas", () => {
    expect(measureText("ab\ncde", 10, "Arial")).toEqual({
      width: 18,
      height: 24,
    });
  });

  it("preserva linhas vazias no cálculo da altura", () => {
    expect(measureText("top\n\nbottom", 10, "Arial")).toEqual({
      width: 36,
      height: 36,
    });
  });

  it("mede a maior linha usando as métricas do canvas no client", () => {
    const canvasContext = {
      font: "",
      measureText: (line: string) => ({ width: line.length * 7 }),
    };

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: vi.fn(() => ({
          getContext: vi.fn(() => canvasContext),
        })),
      },
    });

    expect(measureText("a\nlongest", 10, "Arial")).toEqual({
      width: 49,
      height: 24,
    });
  });
});
