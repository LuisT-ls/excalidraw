import { describe, expect, it } from "vitest";
import { getRoundedRectanglePath } from "./roundedRectangle";

describe("getRoundedRectanglePath", () => {
  it("gera um path fechado com quatro cantos arredondados", () => {
    const path = getRoundedRectanglePath(100, 50, 10);

    expect(path).toContain("M 10 0");
    expect(path).toContain("Q 100 0 100 10");
    expect(path).toContain("Q 0 0 10 0");
    expect(path.endsWith("Z")).toBe(true);
  });

  it("limita o raio à metade da menor dimensão", () => {
    expect(getRoundedRectanglePath(20, 10, 100)).toContain("M 5 0");
  });
});
