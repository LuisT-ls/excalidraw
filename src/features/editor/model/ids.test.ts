import { describe, expect, it } from "vitest";
import { generateElementId, generateSeed } from "./ids";

describe("element identity helpers", () => {
  it("gera IDs não vazios", () => {
    expect(generateElementId()).toEqual(expect.any(String));
    expect(generateElementId()).not.toHaveLength(0);
  });

  it("gera seeds inteiros positivos aceitos pelo rough.js", () => {
    const seed = generateSeed();

    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThan(0);
    expect(seed).toBeLessThanOrEqual(2_147_483_647);
  });
});
