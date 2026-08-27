import type { Bounds, ElementId, Point, SceneElement } from "../model/types";
import { getBoundingBox } from "./hitTesting";

export const SMART_GUIDE_TOLERANCE_PX = 8;
const GUIDE_PADDING_WORLD = 16;

export interface SmartGuide {
  orientation: "vertical" | "horizontal";
  position: number;
  start: number;
  end: number;
}

export interface SmartGuideResult {
  delta: Point;
  guides: SmartGuide[];
}

interface AxisPoint {
  value: number;
  start: number;
  end: number;
}

interface AxisCandidate {
  correction: number;
  distancePx: number;
  guide: SmartGuide;
}

function boundsOverlap(first: Bounds, second: Bounds): boolean {
  return (
    first.x <= second.x + second.width &&
    first.x + first.width >= second.x &&
    first.y <= second.y + second.height &&
    first.y + first.height >= second.y
  );
}

function translatedBounds(bounds: Bounds, delta: Point): Bounds {
  return {
    ...bounds,
    x: bounds.x + delta.x,
    y: bounds.y + delta.y,
  };
}

function getHorizontalAxisPoints(bounds: Bounds): AxisPoint[] {
  return [
    { value: bounds.x, start: bounds.y, end: bounds.y + bounds.height },
    {
      value: bounds.x + bounds.width,
      start: bounds.y,
      end: bounds.y + bounds.height,
    },
    {
      value: bounds.x + bounds.width / 2,
      start: bounds.y,
      end: bounds.y + bounds.height,
    },
  ];
}

function getVerticalAxisPoints(bounds: Bounds): AxisPoint[] {
  return [
    { value: bounds.y, start: bounds.x, end: bounds.x + bounds.width },
    {
      value: bounds.y + bounds.height,
      start: bounds.x,
      end: bounds.x + bounds.width,
    },
    {
      value: bounds.y + bounds.height / 2,
      start: bounds.x,
      end: bounds.x + bounds.width,
    },
  ];
}

function findBestHorizontalGuide(
  movingBounds: Bounds[],
  stationaryBounds: Bounds[],
  rawDelta: Point,
  zoom: number,
  tolerancePx: number,
): AxisCandidate | null {
  let best: AxisCandidate | null = null;

  for (const moving of movingBounds) {
    const moved = translatedBounds(moving, rawDelta);

    for (const stationary of stationaryBounds) {
      for (const current of getHorizontalAxisPoints(moved)) {
        for (const target of getHorizontalAxisPoints(stationary)) {
          const correction = target.value - current.value;
          const distancePx = Math.abs(correction * zoom);

          if (distancePx > tolerancePx) {
            continue;
          }

          const candidate: AxisCandidate = {
            correction,
            distancePx,
            guide: {
              orientation: "vertical",
              position: target.value,
              start:
                Math.min(current.start, target.start) - GUIDE_PADDING_WORLD,
              end: Math.max(current.end, target.end) + GUIDE_PADDING_WORLD,
            },
          };

          if (!best || candidate.distancePx < best.distancePx) {
            best = candidate;
          }
        }
      }
    }
  }

  return best;
}

function findBestVerticalGuide(
  movingBounds: Bounds[],
  stationaryBounds: Bounds[],
  rawDelta: Point,
  zoom: number,
  tolerancePx: number,
): AxisCandidate | null {
  let best: AxisCandidate | null = null;

  for (const moving of movingBounds) {
    const moved = translatedBounds(moving, rawDelta);

    for (const stationary of stationaryBounds) {
      for (const current of getVerticalAxisPoints(moved)) {
        for (const target of getVerticalAxisPoints(stationary)) {
          const correction = target.value - current.value;
          const distancePx = Math.abs(correction * zoom);

          if (distancePx > tolerancePx) {
            continue;
          }

          const candidate: AxisCandidate = {
            correction,
            distancePx,
            guide: {
              orientation: "horizontal",
              position: target.value,
              start:
                Math.min(current.start, target.start) - GUIDE_PADDING_WORLD,
              end: Math.max(current.end, target.end) + GUIDE_PADDING_WORLD,
            },
          };

          if (!best || candidate.distancePx < best.distancePx) {
            best = candidate;
          }
        }
      }
    }
  }

  return best;
}

/**
 * Finds edge/center alignments for a moving selection. The returned delta is
 * the original delta plus the smallest correction within the screen-space
 * tolerance. Bboxes are used intentionally: this keeps guides predictable
 * for rotated and freehand elements without making their geometry expensive.
 */
export function calculateSmartGuides(
  elements: SceneElement[],
  movingIds: ElementId[],
  rawDelta: Point,
  viewportZoom: number,
  visibleBounds?: Bounds,
  tolerancePx = SMART_GUIDE_TOLERANCE_PX,
): SmartGuideResult {
  const movingIdSet = new Set(movingIds);
  const movingBounds = elements
    .filter((element) => movingIdSet.has(element.id))
    .map(getBoundingBox);

  if (movingBounds.length === 0) {
    return { delta: rawDelta, guides: [] };
  }

  const stationaryBounds = elements
    .filter((element) => !movingIdSet.has(element.id))
    .map(getBoundingBox)
    .filter((bounds) => !visibleBounds || boundsOverlap(bounds, visibleBounds));

  if (stationaryBounds.length === 0) {
    return { delta: rawDelta, guides: [] };
  }

  const horizontal = findBestHorizontalGuide(
    movingBounds,
    stationaryBounds,
    rawDelta,
    viewportZoom,
    tolerancePx,
  );
  const vertical = findBestVerticalGuide(
    movingBounds,
    stationaryBounds,
    rawDelta,
    viewportZoom,
    tolerancePx,
  );

  return {
    delta: {
      x: rawDelta.x + (horizontal?.correction ?? 0),
      y: rawDelta.y + (vertical?.correction ?? 0),
    },
    guides: [horizontal?.guide, vertical?.guide].filter(
      (guide): guide is SmartGuide => guide !== undefined,
    ),
  };
}
