import type {
  ArrowElement,
  EllipseElement,
  FillStyle,
  FreehandElement,
  LineElement,
  Point,
  RectangleElement,
} from "../model/types";

export type ShapeDrawingTool = "rectangle" | "ellipse" | "line" | "arrow";
export type DrawingTool = ShapeDrawingTool | "pencil";

export interface ElementCreationStyle {
  strokeColor: string;
  strokeWidth: number;
  fillColor: string | null;
  fillStyle: FillStyle;
}

type CreatedElement =
  | RectangleElement
  | EllipseElement
  | LineElement
  | ArrowElement;

const DEFAULT_ROUGHNESS = 1.4;

function normalizedBounds(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function createElementFromDrag(
  tool: ShapeDrawingTool,
  start: Point,
  end: Point,
  style: ElementCreationStyle,
  id: string,
  seed: number,
): CreatedElement {
  const base = {
    id,
    rotation: 0,
    strokeColor: style.strokeColor,
    strokeWidth: style.strokeWidth,
    fillColor: style.fillColor,
    fillStyle: style.fillStyle,
    opacity: 1,
    seed,
    roughness: DEFAULT_ROUGHNESS,
  };

  if (tool === "rectangle" || tool === "ellipse") {
    const bounds = normalizedBounds(start, end);

    return {
      ...base,
      type: tool,
      ...bounds,
    };
  }

  const points: [Point, Point] = [
    { x: 0, y: 0 },
    { x: end.x - start.x, y: end.y - start.y },
  ];

  return {
    ...base,
    type: tool,
    x: start.x,
    y: start.y,
    points,
  };
}

export function createFreehandElement(
  origin: Point,
  points: Point[],
  style: ElementCreationStyle,
  id: string,
  seed: number,
): FreehandElement {
  return {
    id,
    type: "freehand",
    x: origin.x,
    y: origin.y,
    rotation: 0,
    strokeColor: style.strokeColor,
    strokeWidth: style.strokeWidth,
    fillColor: null,
    fillStyle: "none",
    opacity: 1,
    seed,
    roughness: DEFAULT_ROUGHNESS,
    points: points.map((point) => ({ ...point })),
  };
}
