import { parseScene, type PersistedScene } from "./sceneStorage";

export const SHARE_HASH_PREFIX = "#data=";
export const SHARE_LINK_WARNING_LENGTH = 6000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function getCompressionStreams() {
  if (
    typeof CompressionStream === "undefined" ||
    typeof DecompressionStream === "undefined"
  ) {
    throw new Error("Este navegador não suporta compressão para links compartilháveis.");
  }

  return { CompressionStream, DecompressionStream };
}

export async function encodeSharedScene(scene: PersistedScene): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Links compartilháveis só podem ser gerados no navegador.");
  }

  const { CompressionStream: BrowserCompressionStream } =
    getCompressionStreams();
  const input = new TextEncoder().encode(JSON.stringify(scene));
  const compressedStream = new Blob([input])
    .stream()
    .pipeThrough(new BrowserCompressionStream("gzip"));
  const compressed = new Uint8Array(
    await new Response(compressedStream).arrayBuffer(),
  );

  return bytesToBase64Url(compressed);
}

export async function decodeSharedScene(encoded: string): Promise<PersistedScene | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const { DecompressionStream: BrowserDecompressionStream } =
      getCompressionStreams();
    const compressed = base64UrlToBytes(encoded);
    const decompressedStream = new Blob([compressed])
      .stream()
      .pipeThrough(new BrowserDecompressionStream("gzip"));
    const raw = await new Response(decompressedStream).text();
    return parseScene(raw);
  } catch (error) {
    console.warn("Não foi possível abrir o link compartilhado.", error);
    return null;
  }
}

export async function createShareLink(scene: PersistedScene): Promise<string> {
  const encoded = await encodeSharedScene(scene);
  const url = new URL(window.location.href);
  url.hash = `${SHARE_HASH_PREFIX.slice(1)}${encoded}`;
  return url.toString();
}

export function getSharedDataFromHash(hash: string): string | null {
  return hash.startsWith(SHARE_HASH_PREFIX)
    ? hash.slice(SHARE_HASH_PREFIX.length)
    : null;
}

export async function loadSharedSceneFromLocation(): Promise<{
  found: boolean;
  scene: PersistedScene | null;
}> {
  if (typeof window === "undefined") {
    return { found: false, scene: null };
  }

  const hasSharedFragment = window.location.hash.startsWith(SHARE_HASH_PREFIX);

  if (!hasSharedFragment) {
    return { found: false, scene: null };
  }

  const encoded = getSharedDataFromHash(window.location.hash) ?? "";

  return {
    found: true,
    scene: await decodeSharedScene(encoded),
  };
}
