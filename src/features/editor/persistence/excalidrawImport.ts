import { DEFAULT_TEXT_STYLE } from "../model/exampleScene";
import { generateElementId, generateSeed } from "../model/ids";
import type {
  ArrowElement,
  EllipseElement,
  ElementBase,
  FreehandElement,
  LineElement,
  Point,
  RectangleElement,
  SceneElement,
  TextElement,
} from "../model/types";
import { measureText } from "../rendering/measureText";

export interface SkippedExcalidrawElementType {
  type: string;
  count: number;
}

export interface ConvertedExcalidrawScene {
  elements: SceneElement[];
  skipped: SkippedExcalidrawElementType[];
}

interface RawExcalidrawElement {
  type?: unknown;
  x?: unknown;
  y?: unknown;
  angle?: unknown;
  strokeColor?: unknown;
  strokeWidth?: unknown;
  roughness?: unknown;
  seed?: unknown;
  opacity?: unknown;
  backgroundColor?: unknown;
  width?: unknown;
  height?: unknown;
  points?: unknown;
  text?: unknown;
  fontSize?: unknown;
  fontFamily?: unknown;
  fontWeight?: unknown;
  textAlign?: unknown;
  isDeleted?: unknown;
}

const DEFAULT_STROKE_COLOR = "#1f2937";
const DEFAULT_STROKE_WIDTH = 2.5;
const DEFAULT_ROUGHNESS = 1.4;

function asRecord(value: unknown): RawExcalidrawElement | null {
  return value && typeof value === "object"
    ? (value as RawExcalidrawElement)
    : null;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function positiveNumberOr(value: unknown, fallback: number): number {
  const number = numberOr(value, fallback);
  return number > 0 ? number : fallback;
}

function opacityFromExcalidraw(value: unknown): number {
  return Math.min(100, Math.max(0, numberOr(value, 100))) / 100;
}

function pointsFromExcalidraw(value: unknown): Point[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const points: Point[] = [];

  for (const point of value) {
    if (
      !Array.isArray(point) ||
      typeof point[0] !== "number" ||
      typeof point[1] !== "number" ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1])
    ) {
      return null;
    }

    points.push({ x: point[0], y: point[1] });
  }

  return points;
}

function fillFromExcalidraw(value: unknown): Pick<
  ElementBase,
  "fillColor" | "fillStyle"
> {
  if (typeof value !== "string" || value === "transparent") {
    return { fillColor: null, fillStyle: "none" };
  }

  return { fillColor: value, fillStyle: "solid" };
}

function createBase(element: RawExcalidrawElement): ElementBase {
  return {
    id: generateElementId(),
    type: "rectangle",
    x: numberOr(element.x, 0),
    y: numberOr(element.y, 0),
    rotation: numberOr(element.angle, 0),
    strokeColor:
      typeof element.strokeColor === "string"
        ? element.strokeColor
        : DEFAULT_STROKE_COLOR,
    strokeWidth: positiveNumberOr(element.strokeWidth, DEFAULT_STROKE_WIDTH),
    ...fillFromExcalidraw(element.backgroundColor),
    opacity: opacityFromExcalidraw(element.opacity),
    seed: numberOr(element.seed, generateSeed()),
    roughness: numberOr(element.roughness, DEFAULT_ROUGHNESS),
  };
}

function convertRectangle(
  element: RawExcalidrawElement,
): RectangleElement {
  return {
    ...createBase(element),
    type: "rectangle",
    width: numberOr(element.width, 0),
    height: numberOr(element.height, 0),
  };
}

function convertEllipse(element: RawExcalidrawElement): EllipseElement {
  return {
    ...createBase(element),
    type: "ellipse",
    width: numberOr(element.width, 0),
    height: numberOr(element.height, 0),
  };
}

function convertLine(
  element: RawExcalidrawElement,
  type: "line" | "arrow",
): LineElement | ArrowElement | null {
  const points = pointsFromExcalidraw(element.points);

  if (!points || points.length < 2) {
    return null;
  }

  return {
    ...createBase(element),
    type,
    points: points as [Point, Point, ...Point[]],
  };
}

function convertFreehand(
  element: RawExcalidrawElement,
): FreehandElement | null {
  const points = pointsFromExcalidraw(element.points);

  if (!points || points.length === 0) {
    return null;
  }

  return {
    ...createBase(element),
    type: "freehand",
    points,
  };
}

function convertText(element: RawExcalidrawElement): TextElement {
  const text = typeof element.text === "string" ? element.text : "";
  const fontSize = positiveNumberOr(
    element.fontSize,
    DEFAULT_TEXT_STYLE.fontSize,
  );
  const fontFamily = DEFAULT_TEXT_STYLE.fontFamily;
  const measured = measureText(text, fontSize, fontFamily);
  const textAlign =
    element.textAlign === "center" || element.textAlign === "right"
      ? element.textAlign
      : "left";
  const fontWeight =
    element.fontWeight === "bold" ||
    (typeof element.fontWeight === "number" && element.fontWeight >= 600)
      ? "bold"
      : DEFAULT_TEXT_STYLE.fontWeight;

  return {
    ...createBase(element),
    type: "text",
    text,
    width: positiveNumberOr(element.width, measured.width),
    height: positiveNumberOr(element.height, measured.height),
    fontSize,
    fontFamily,
    fontWeight,
    textAlign,
  };
}

function addSkipped(
  skipped: Map<string, number>,
  type: string,
): void {
  skipped.set(type, (skipped.get(type) ?? 0) + 1);
}

export function convertExcalidrawScene(
  value: unknown,
): ConvertedExcalidrawScene {
  const skipped = new Map<string, number>();
  const elements: SceneElement[] = [];

  if (!value || typeof value !== "object") {
    return { elements, skipped: [] };
  }

  const scene = value as { type?: unknown; elements?: unknown };

  if (scene.type !== "excalidraw" || !Array.isArray(scene.elements)) {
    return { elements, skipped: [] };
  }

  for (const rawValue of scene.elements) {
    const rawElement = asRecord(rawValue);

    if (!rawElement || rawElement.isDeleted === true) {
      continue;
    }

    const type = typeof rawElement.type === "string" ? rawElement.type : "unknown";
    let converted: SceneElement | null = null;

    switch (type) {
      case "rectangle":
        converted = convertRectangle(rawElement);
        break;
      case "ellipse":
        converted = convertEllipse(rawElement);
        break;
      case "line":
        converted = convertLine(rawElement, "line");
        break;
      case "arrow":
        converted = convertLine(rawElement, "arrow");
        break;
      case "draw":
      case "freedraw":
        converted = convertFreehand(rawElement);
        break;
      case "text":
        converted = convertText(rawElement);
        break;
      default:
        addSkipped(skipped, type);
    }

    if (converted) {
      elements.push(converted);
    } else if (
      type === "line" ||
      type === "arrow" ||
      type === "draw" ||
      type === "freedraw"
    ) {
      addSkipped(skipped, type);
    }
  }

  return {
    elements,
    skipped: Array.from(skipped, ([type, count]) => ({ type, count })),
  };
}

export function getExcalidrawBackgroundColor(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const appState = (value as { appState?: unknown }).appState;

  if (!appState || typeof appState !== "object") {
    return undefined;
  }

  const backgroundColor = (appState as { viewBackgroundColor?: unknown })
    .viewBackgroundColor;

  return typeof backgroundColor === "string" ? backgroundColor : undefined;
}
