import type { Bounds, Point, SceneElement } from "../model/types";
import { getDiamondPoints } from "../model/geometry";

const MIN_LINE_HIT_DISTANCE = 6;

export function rotatePoint(point: Point, rotation: number): Point {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

function boundsFromPoints(points: Point[]): Bounds {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function transformedBounds(
  element: SceneElement,
  localPoints: Point[],
): Bounds {
  const worldPoints = localPoints.map((point) => {
    const rotated = rotatePoint(point, element.rotation);

    return {
      x: rotated.x + element.x,
      y: rotated.y + element.y,
    };
  });

  return boundsFromPoints(worldPoints);
}

export function inverseRotatePoint(point: Point, rotation: number): Point {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return {
    x: point.x * cosine + point.y * sine,
    y: -point.x * sine + point.y * cosine,
  };
}

export function worldToLocalPoint(element: SceneElement, point: Point): Point {
  return inverseRotatePoint(
    { x: point.x - element.x, y: point.y - element.y },
    element.rotation,
  );
}

export function localToWorldPoint(element: SceneElement, point: Point): Point {
  const rotated = rotatePoint(point, element.rotation);

  return {
    x: rotated.x + element.x,
    y: rotated.y + element.y,
  };
}

export function getLocalBounds(element: SceneElement): Bounds {
  switch (element.type) {
    case "rectangle":
    case "diamond":
    case "ellipse":
      return {
        x: Math.min(0, element.width),
        y: Math.min(0, element.height),
        width: Math.abs(element.width),
        height: Math.abs(element.height),
      };

    case "line":
    case "arrow":
    case "freehand":
      return boundsFromPoints(element.points);

    case "image":
    case "text":
      return { x: 0, y: 0, width: element.width, height: element.height };
  }
}

function pointInBounds(point: Point, bounds: Bounds, padding = 0): boolean {
  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  );
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
        lengthSquared,
    ),
  );
  const closestPoint = {
    x: start.x + projection * deltaX,
    y: start.y + projection * deltaY,
  };

  return Math.hypot(
    point.x - closestPoint.x,
    point.y - closestPoint.y,
  );
}

function pointNearSegments(
  point: Point,
  points: Point[],
  maxDistance: number,
): boolean {
  for (let index = 1; index < points.length; index += 1) {
    if (
      distanceToSegment(point, points[index - 1], points[index]) <=
      maxDistance
    ) {
      return true;
    }
  }

  return false;
}

function pointInConvexPolygon(point: Point, polygon: Point[]): boolean {
  let hasPositiveCrossProduct = false;
  let hasNegativeCrossProduct = false;

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const crossProduct =
      (next.x - current.x) * (point.y - current.y) -
      (next.y - current.y) * (point.x - current.x);

    if (crossProduct > 0) {
      hasPositiveCrossProduct = true;
    } else if (crossProduct < 0) {
      hasNegativeCrossProduct = true;
    }

    if (hasPositiveCrossProduct && hasNegativeCrossProduct) {
      return false;
    }
  }

  return true;
}

export function getBoundingBox(element: SceneElement): Bounds {
  switch (element.type) {
    case "rectangle":
    case "diamond":
    case "ellipse": {
      const left = Math.min(0, element.width);
      const right = Math.max(0, element.width);
      const top = Math.min(0, element.height);
      const bottom = Math.max(0, element.height);

      return transformedBounds(element, [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ]);
    }

    case "line":
    case "arrow":
      return transformedBounds(element, element.points);

    case "freehand":
      return expandBounds(
        transformedBounds(element, element.points),
        element.strokeWidth / 2,
      );

    case "text":
    case "image":
      return transformedBounds(element, [
        { x: 0, y: 0 },
        { x: element.width, y: 0 },
        { x: element.width, y: element.height },
        { x: 0, y: element.height },
      ]);
  }
}

export function hitTestElement(element: SceneElement, point: Point): boolean {
  const bounds = getBoundingBox(element);

  if (element.type === "text") {
    return pointInBounds(point, bounds);
  }

  if (element.type === "image") {
    return pointInBounds(point, bounds) && pointInBounds(
      worldToLocalPoint(element, point),
      { x: 0, y: 0, width: element.width, height: element.height },
    );
  }

  if (
    element.type === "line" ||
    element.type === "arrow" ||
    element.type === "freehand"
  ) {
    const hitDistance = Math.max(element.strokeWidth / 2, MIN_LINE_HIT_DISTANCE);

    if (!pointInBounds(point, bounds, hitDistance)) {
      return false;
    }

    return pointNearSegments(
      worldToLocalPoint(element, point),
      element.points,
      hitDistance,
    );
  }

  if (!pointInBounds(point, bounds)) {
    return false;
  }

  const localPoint = worldToLocalPoint(element, point);

  if (element.type === "rectangle") {
    const left = Math.min(0, element.width);
    const right = Math.max(0, element.width);
    const top = Math.min(0, element.height);
    const bottom = Math.max(0, element.height);

    return (
      localPoint.x >= left &&
      localPoint.x <= right &&
      localPoint.y >= top &&
      localPoint.y <= bottom
    );
  }

  if (element.type === "diamond") {
    return pointInConvexPolygon(
      localPoint,
      getDiamondPoints(element.width, element.height),
    );
  }

  const radiusX = Math.abs(element.width) / 2;
  const radiusY = Math.abs(element.height) / 2;

  if (radiusX === 0 || radiusY === 0) {
    return false;
  }

  const normalizedX = (localPoint.x - element.width / 2) / radiusX;
  const normalizedY = (localPoint.y - element.height / 2) / radiusY;

  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}
