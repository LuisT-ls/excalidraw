import { parseScene, type PersistedScene } from "./sceneStorage";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type {
  ArrowElement,
  CornerStyle,
  DiamondElement,
  EllipseElement,
  ElementType,
  FillStyle,
  FreehandElement,
  ImageElement,
  LineElement,
  RectangleElement,
  SceneElement,
  StrokeStyle,
  TextElement,
} from "../model/types";

export const SHARE_HASH_PREFIX = "#data=";
export const SHARE_LINK_WARNING_LENGTH = 6000;
const COMPACT_SHARE_PREFIX = "v2.";
const LZ_SHARE_PREFIX = "v3l.";
const RAW_DEFLATE_SHARE_PREFIX = "v3d.";
const GZIP_SHARE_PREFIX = "v3g.";
const SHARE_NUMBER_PRECISION = 2;

type CompactElement = unknown[];

interface CompactScenePayload {
  e: CompactElement[];
  b?: string;
}

const ELEMENT_TYPE_CODES: Record<ElementType, string> = {
  rectangle: "r",
  diamond: "d",
  ellipse: "e",
  line: "l",
  arrow: "a",
  text: "t",
  freehand: "f",
  image: "i",
};

const ELEMENT_TYPES_BY_CODE: Record<string, ElementType> = Object.fromEntries(
  Object.entries(ELEMENT_TYPE_CODES).map(([type, code]) => [code, type]),
) as Record<string, ElementType>;

const STROKE_STYLE_CODES: Record<StrokeStyle, number> = {
  solid: 0,
  dashed: 1,
  dotted: 2,
};

const STROKE_STYLES_BY_CODE: Record<number, StrokeStyle> = {
  0: "solid",
  1: "dashed",
  2: "dotted",
};

const FILL_STYLE_CODES: Record<FillStyle, number> = {
  none: 0,
  solid: 1,
};

const FILL_STYLES_BY_CODE: Record<number, FillStyle> = {
  0: "none",
  1: "solid",
};

const CORNER_STYLE_CODES: Record<CornerStyle, number> = {
  sharp: 0,
  round: 1,
};

const CORNER_STYLES_BY_CODE: Record<number, CornerStyle> = {
  0: "sharp",
  1: "round",
};

const FONT_WEIGHT_CODES: Record<TextElement["fontWeight"], number> = {
  normal: 0,
  bold: 1,
};

const FONT_WEIGHTS_BY_CODE: Record<number, TextElement["fontWeight"]> = {
  0: "normal",
  1: "bold",
};

const TEXT_ALIGN_CODES: Record<TextElement["textAlign"], number> = {
  left: 0,
  center: 1,
  right: 2,
};

const TEXT_ALIGNS_BY_CODE: Record<number, TextElement["textAlign"]> = {
  0: "left",
  1: "center",
  2: "right",
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPointArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length % 2 === 0 &&
    value.every(isFiniteNumber)
  );
}

function roundShareNumber(value: number): number {
  const factor = 10 ** SHARE_NUMBER_PRECISION;
  return Math.round(value * factor) / factor;
}

function packPoints(
  points: Array<{ x: number; y: number }>,
  roundNumbers: boolean,
): number[] {
  return points.flatMap((point) => [
    roundNumbers ? roundShareNumber(point.x) : point.x,
    roundNumbers ? roundShareNumber(point.y) : point.y,
  ]);
}

function unpackPoints(value: unknown): Array<{ x: number; y: number }> | null {
  if (!isPointArray(value)) {
    return null;
  }

  const points = [];
  for (let index = 0; index < value.length; index += 2) {
    points.push({ x: value[index], y: value[index + 1] });
  }

  return points;
}

/**
 * Shares use a compact transport representation, while the decoded result is
 * still the regular PersistedScene. Short keys, enum codes and flat point
 * arrays remove a substantial amount of repeated JSON overhead. Exported JSON
 * files keep their readable canonical format.
 */
function packElement(
  element: SceneElement,
  roundNumbers: boolean,
): CompactElement {
  const number = (value: number) =>
    roundNumbers ? roundShareNumber(value) : value;
  const base = [
    ELEMENT_TYPE_CODES[element.type],
    element.id,
    number(element.x),
    number(element.y),
    number(element.rotation),
    element.strokeColor,
    number(element.strokeWidth),
    STROKE_STYLE_CODES[element.strokeStyle],
    element.fillColor,
    FILL_STYLE_CODES[element.fillStyle],
    number(element.opacity),
    element.seed,
    number(element.roughness),
  ];

  switch (element.type) {
    case "rectangle":
      return [
        ...base,
        CORNER_STYLE_CODES[element.cornerStyle],
        number(element.width),
        number(element.height),
      ];
    case "diamond":
      return [...base, number(element.width), number(element.height)];
    case "ellipse":
      return [...base, number(element.width), number(element.height)];
    case "image":
      return [
        ...base,
        number(element.width),
        number(element.height),
        element.src,
      ];
    case "line":
    case "arrow":
    case "freehand":
      return [...base, packPoints(element.points, roundNumbers)];
    case "text":
      return [
        ...base,
        element.text,
        number(element.width),
        number(element.height),
        number(element.fontSize),
        element.fontFamily,
        FONT_WEIGHT_CODES[element.fontWeight],
        TEXT_ALIGN_CODES[element.textAlign],
      ];
  }
}

function unpackElement(value: unknown): SceneElement | null {
  if (!Array.isArray(value) || value.length < 14) {
    return null;
  }

  const [
    typeCode,
    id,
    x,
    y,
    rotation,
    strokeColor,
    strokeWidth,
    strokeStyleCode,
    fillColor,
    fillStyleCode,
    opacity,
    seed,
    roughness,
  ] = value;
  const type = typeof typeCode === "string" ? ELEMENT_TYPES_BY_CODE[typeCode] : undefined;
  const strokeStyle =
    isFiniteNumber(strokeStyleCode) ? STROKE_STYLES_BY_CODE[strokeStyleCode] : undefined;
  const fillStyle =
    isFiniteNumber(fillStyleCode) ? FILL_STYLES_BY_CODE[fillStyleCode] : undefined;

  if (
    !type ||
    typeof id !== "string" ||
    !isFiniteNumber(x) ||
    !isFiniteNumber(y) ||
    !isFiniteNumber(rotation) ||
    typeof strokeColor !== "string" ||
    !isFiniteNumber(strokeWidth) ||
    !strokeStyle ||
    (fillColor !== null && typeof fillColor !== "string") ||
    !fillStyle ||
    !isFiniteNumber(opacity) ||
    !isFiniteNumber(seed) ||
    !isFiniteNumber(roughness)
  ) {
    return null;
  }

  const base = {
    id,
    type,
    x,
    y,
    rotation,
    strokeColor,
    strokeWidth,
    strokeStyle,
    fillColor,
    fillStyle,
    opacity,
    seed,
    roughness,
  };

  if (type === "rectangle") {
    const [cornerStyleCode, width, height] = value.slice(13);
    const cornerStyle =
      isFiniteNumber(cornerStyleCode)
        ? CORNER_STYLES_BY_CODE[cornerStyleCode]
        : undefined;

    return cornerStyle && isFiniteNumber(width) && isFiniteNumber(height)
      ? ({ ...base, type, cornerStyle, width, height } as RectangleElement)
      : null;
  }

  if (type === "ellipse") {
    const [width, height] = value.slice(13);
    return isFiniteNumber(width) && isFiniteNumber(height)
      ? ({ ...base, type, width, height } as EllipseElement)
      : null;
  }

  if (type === "diamond") {
    const [width, height] = value.slice(13);
    return isFiniteNumber(width) && isFiniteNumber(height)
      ? ({ ...base, type, width, height } as DiamondElement)
      : null;
  }

  if (type === "image") {
    const [width, height, src] = value.slice(13);
    return isFiniteNumber(width) &&
      isFiniteNumber(height) &&
      typeof src === "string"
      ? ({ ...base, type, width, height, src } as ImageElement)
      : null;
  }

  if (type === "line" || type === "arrow" || type === "freehand") {
    const points = unpackPoints(value[13]);
    if (!points || (type !== "freehand" && points.length < 2)) {
      return null;
    }

    return {
      ...base,
      type,
      points,
    } as LineElement | ArrowElement | FreehandElement;
  }

  const [text, width, height, fontSize, fontFamily, fontWeightCode, textAlignCode] =
    value.slice(13);
  const fontWeight =
    isFiniteNumber(fontWeightCode) ? FONT_WEIGHTS_BY_CODE[fontWeightCode] : undefined;
  const textAlign =
    isFiniteNumber(textAlignCode) ? TEXT_ALIGNS_BY_CODE[textAlignCode] : undefined;

  return typeof text === "string" &&
    isFiniteNumber(width) &&
    isFiniteNumber(height) &&
    isFiniteNumber(fontSize) &&
    typeof fontFamily === "string" &&
    fontWeight &&
    textAlign
    ? ({
        ...base,
        type,
        text,
        width,
        height,
        fontSize,
        fontFamily,
        fontWeight,
        textAlign,
      } as TextElement)
    : null;
}

function packScene(
  scene: PersistedScene,
  roundNumbers = false,
): CompactScenePayload {
  const packed: CompactScenePayload = {
    e: scene.elements.map((element) => packElement(element, roundNumbers)),
  };

  if (scene.backgroundColor !== undefined) {
    packed.b = scene.backgroundColor;
  }

  return packed;
}

function unpackScene(value: unknown): PersistedScene | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<CompactScenePayload>;
  if (!Array.isArray(payload.e)) {
    return null;
  }

  const elements = payload.e.map(unpackElement);
  if (elements.some((element) => element === null)) {
    return null;
  }

  if (payload.b !== undefined && typeof payload.b !== "string") {
    return null;
  }

  const scene: PersistedScene = {
    type: "whiteboard-scene",
    version: 1,
    elements: elements as SceneElement[],
  };

  if (payload.b !== undefined) {
    scene.backgroundColor = payload.b;
  }

  return parseScene(JSON.stringify(scene));
}

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

type StreamCompressionFormat = "gzip" | "deflate-raw";

async function compressText(
  raw: string,
  format: StreamCompressionFormat,
): Promise<string> {
  const { CompressionStream: BrowserCompressionStream } =
    getCompressionStreams();
  const input = new TextEncoder().encode(raw);
  const compressedStream = new Blob([input])
    .stream()
    .pipeThrough(new BrowserCompressionStream(format));
  const compressed = new Uint8Array(
    await new Response(compressedStream).arrayBuffer(),
  );

  return bytesToBase64Url(compressed);
}

async function decompressText(
  encoded: string,
  format: StreamCompressionFormat,
): Promise<string> {
  const { DecompressionStream: BrowserDecompressionStream } =
    getCompressionStreams();
  const compressed = base64UrlToBytes(encoded);
  const decompressedStream = new Blob([compressed])
    .stream()
    .pipeThrough(new BrowserDecompressionStream(format));

  return new Response(decompressedStream).text();
}

export async function encodeSharedScene(scene: PersistedScene): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Links compartilháveis só podem ser gerados no navegador.");
  }

  const raw = JSON.stringify(packScene(scene, true));
  const candidates = [
    `${LZ_SHARE_PREFIX}${compressToEncodedURIComponent(raw)}`,
  ];

  for (const candidate of [
    { format: "deflate-raw" as const, prefix: RAW_DEFLATE_SHARE_PREFIX },
    { format: "gzip" as const, prefix: GZIP_SHARE_PREFIX },
  ]) {
    try {
      candidates.push(
        `${candidate.prefix}${await compressText(raw, candidate.format)}`,
      );
    } catch {
      // LZ-string remains available when a browser lacks a stream format.
    }
  }

  return candidates.reduce((shortest, candidate) =>
    candidate.length < shortest.length ? candidate : shortest,
  );
}

export async function decodeSharedScene(encoded: string): Promise<PersistedScene | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    if (encoded.startsWith(LZ_SHARE_PREFIX)) {
      const raw = decompressFromEncodedURIComponent(
        encoded.slice(LZ_SHARE_PREFIX.length),
      );

      return raw ? unpackScene(JSON.parse(raw)) : null;
    }

    const isCompact = encoded.startsWith(COMPACT_SHARE_PREFIX);
    const isRawDeflate = encoded.startsWith(RAW_DEFLATE_SHARE_PREFIX);
    const isRoundedCompact = encoded.startsWith(GZIP_SHARE_PREFIX);
    const prefix = isRawDeflate
      ? RAW_DEFLATE_SHARE_PREFIX
      : isRoundedCompact
        ? GZIP_SHARE_PREFIX
        : isCompact
          ? COMPACT_SHARE_PREFIX
          : "";
    const payload = encoded.slice(prefix.length);
    const raw = await decompressText(
      payload,
      isRawDeflate ? "deflate-raw" : "gzip",
    );

    if (isCompact || isRawDeflate || isRoundedCompact) {
      return unpackScene(JSON.parse(raw));
    }

    // Links generated before the compact format remain readable.
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
