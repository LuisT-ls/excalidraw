import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleElements } from "../model/exampleScene";
import {
  decodeSharedScene,
  encodeSharedScene,
  getSharedDataFromHash,
} from "./shareLink";

describe("share link", () => {
  it("extrai somente o payload do fragmento data", () => {
    expect(getSharedDataFromHash("#data=abc123")).toBe("abc123");
    expect(getSharedDataFromHash("#other=abc123")).toBeNull();
  });

  it("comprime e descomprime uma cena mantendo o formato validado", async () => {
    vi.stubGlobal("window", { location: { hash: "" } });
    const scene = {
      type: "whiteboard-scene" as const,
      version: 1 as const,
      elements: [exampleElements[0]],
      backgroundColor: "#ffffff",
    };

    const encoded = await encodeSharedScene(scene);
    const decoded = await decodeSharedScene(encoded);

    expect(encoded).not.toContain("{");
    expect(decoded).toEqual(scene);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
