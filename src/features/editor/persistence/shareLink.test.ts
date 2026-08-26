import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleElements } from "../model/exampleScene";
import {
  decodeSharedScene,
  encodeSharedScene,
  getSharedDataFromHash,
} from "./shareLink";

async function encodeLegacyScene(scene: object): Promise<string> {
  const input = new TextEncoder().encode(JSON.stringify(scene));
  const compressedStream = new Blob([input])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const compressed = new Uint8Array(
    await new Response(compressedStream).arrayBuffer(),
  );
  let binary = "";

  for (const byte of compressed) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

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
      elements: exampleElements,
      backgroundColor: "#ffffff",
    };

    const encoded = await encodeSharedScene(scene);
    const legacyEncoded = await encodeLegacyScene(scene);
    const decoded = await decodeSharedScene(encoded);

    expect(encoded.startsWith("v2.")).toBe(true);
    expect(encoded.length).toBeLessThan(legacyEncoded.length);
    expect(encoded.length).toBeLessThan(JSON.stringify(scene).length);
    expect(decoded).toEqual(scene);
  });

  it("continua abrindo links gzip do formato anterior", async () => {
    vi.stubGlobal("window", { location: { hash: "" } });
    const scene = {
      type: "whiteboard-scene" as const,
      version: 1 as const,
      elements: [exampleElements[0]],
      backgroundColor: "#ffffff",
    };

    const legacyEncoded = await encodeLegacyScene(scene);

    expect(await decodeSharedScene(legacyEncoded)).toEqual(scene);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
