import { getStroke } from "perfect-freehand";
import type rough from "roughjs/bin/rough";
import type { Options } from "roughjs/bin/core";
import type {
  ArrowElement,
  ElementBase,
  FreehandElement,
  LineElement,
  RectangleElement,
  EllipseElement,
  TextElement,
} from "../model/types";
import { getRoundedRectanglePath } from "./roundedRectangle";

type RoughCanvas = ReturnType<typeof rough.canvas>;

export function getStrokeLineDash(
  strokeStyle: "solid" | "dashed" | "dotted" = "solid",
): number[] | undefined {
  if (strokeStyle === "dashed") {
    return [12, 8];
  }

  if (strokeStyle === "dotted") {
    return [2, 6];
  }

  return undefined;
}

export function shouldDisableMultiStroke(
  strokeStyle: "solid" | "dashed" | "dotted" = "solid",
): boolean {
  return strokeStyle !== "solid";
}

export function getRoughOptions(element: ElementBase): Options {
  return {
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    strokeLineDash: getStrokeLineDash(element.strokeStyle),
    disableMultiStroke: shouldDisableMultiStroke(element.strokeStyle),
    fill: element.fillColor ?? undefined,
    fillStyle: element.fillStyle,
    roughness: element.roughness,
    seed: element.seed,
    bowing: 1,
  };
}

export interface ArrowHeadPoints {
  left: { x: number; y: number };
  right: { x: number; y: number };
}

export function getArrowHeadPoints(element: ArrowElement): ArrowHeadPoints {
  const start = element.points[element.points.length - 2];
  const end = element.points[element.points.length - 1];

  // A ponta usa o último segmento, permitindo que uma seta com vários pontos
  // no futuro mantenha a direção correta no trecho final.
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(12, element.strokeWidth * 4);
  const headAngle = Math.PI / 7;

  return {
    left: {
      x: end.x - headLength * Math.cos(angle - headAngle),
      y: end.y - headLength * Math.sin(angle - headAngle),
    },
    right: {
      x: end.x - headLength * Math.cos(angle + headAngle),
      y: end.y - headLength * Math.sin(angle + headAngle),
    },
  };
}

export function renderRectangle(
  roughCanvas: RoughCanvas,
  element: RectangleElement,
) {
  const options = getRoughOptions(element);

  if (element.cornerStyle === "round") {
    roughCanvas.path(
      getRoundedRectanglePath(
        element.width,
        element.height,
        Math.min(element.width, element.height) * 0.15,
      ),
      options,
    );
    return;
  }

  roughCanvas.rectangle(0, 0, element.width, element.height, options);
}

export function renderEllipse(
  roughCanvas: RoughCanvas,
  element: EllipseElement,
) {
  roughCanvas.ellipse(
    element.width / 2,
    element.height / 2,
    element.width,
    element.height,
    getRoughOptions(element),
  );
}

export function renderLine(roughCanvas: RoughCanvas, element: LineElement) {
  const options = getRoughOptions(element);

  for (let index = 1; index < element.points.length; index += 1) {
    const start = element.points[index - 1];
    const end = element.points[index];
    roughCanvas.line(start.x, start.y, end.x, end.y, options);
  }
}

export function renderArrow(roughCanvas: RoughCanvas, element: ArrowElement) {
  const options = getRoughOptions(element);

  for (let index = 1; index < element.points.length; index += 1) {
    const start = element.points[index - 1];
    const end = element.points[index];
    roughCanvas.line(start.x, start.y, end.x, end.y, options);
  }

  const end = element.points[element.points.length - 1];
  const { left, right } = getArrowHeadPoints(element);

  roughCanvas.line(end.x, end.y, left.x, left.y, options);
  roughCanvas.line(end.x, end.y, right.x, right.y, options);
}

export function renderText(
  context: CanvasRenderingContext2D,
  element: TextElement,
) {
  context.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
  context.textAlign = element.textAlign;
  context.textBaseline = "top";
  context.fillStyle = element.strokeColor;

  const lineHeight = element.fontSize * 1.2;
  for (const [index, line] of element.text.split("\n").entries()) {
    context.fillText(line, 0, index * lineHeight);
  }
}

function drawFreehandOutline(
  context: CanvasRenderingContext2D,
  outline: readonly number[][],
  element: FreehandElement,
) {
  if (outline.length === 0) {
    return;
  }

  context.beginPath();
  context.moveTo(outline[0][0], outline[0][1]);

  for (const [x, y] of outline.slice(1)) {
    context.lineTo(x, y);
  }

  context.closePath();
  context.fillStyle = element.strokeColor;
  context.fill();

  const dash = getStrokeLineDash(element.strokeStyle);
  if (dash) {
    context.setLineDash(dash);
    context.strokeStyle = element.strokeColor;
    context.lineWidth = element.strokeWidth;
    context.stroke();
    context.setLineDash([]);
  }
}

export function renderFreehand(
  context: CanvasRenderingContext2D,
  element: FreehandElement,
) {
  if (element.points.length === 1) {
    context.beginPath();
    context.arc(
      element.points[0].x,
      element.points[0].y,
      Math.max(1, element.strokeWidth / 2),
      0,
      Math.PI * 2,
    );
    context.fillStyle = element.strokeColor;
    context.fill();
    const dash = getStrokeLineDash(element.strokeStyle);
    if (dash) {
      context.setLineDash(dash);
      context.strokeStyle = element.strokeColor;
      context.lineWidth = element.strokeWidth;
      context.stroke();
      context.setLineDash([]);
    }
    return;
  }

  const inputPoints: [number, number][] = element.points.map(
    ({ x, y }): [number, number] => [x, y],
  );
  const outline = getStroke(inputPoints, {
      size: Math.max(1, element.strokeWidth * 2),
      thinning: 0.35,
      smoothing: 0.7,
      streamline: 0.5,
      easing: (value) => value,
      last: true,
    });

  drawFreehandOutline(context, outline, element);
}
