import {
  getLocalBounds,
  localToWorldPoint,
} from "./hitTesting";
import type { Point, SceneElement } from "../model/types";

export interface RotationHandleGeometry {
  top: Point;
  handle: Point;
}

export function getRotationHandleGeometry(
  element: SceneElement,
  handleDistanceWorld: number,
): RotationHandleGeometry {
  const bounds = getLocalBounds(element);
  const top = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y,
  };
  const handle = {
    x: top.x,
    y: top.y - handleDistanceWorld,
  };

  return {
    top: localToWorldPoint(element, top),
    handle: localToWorldPoint(element, handle),
  };
}

export function calculateRotation(
  pivot: Point,
  initialHandlePoint: Point,
  currentPoint: Point,
  initialRotation = 0,
): number {
  const initialAngle = Math.atan2(
    initialHandlePoint.y - pivot.y,
    initialHandlePoint.x - pivot.x,
  );
  const currentAngle = Math.atan2(
    currentPoint.y - pivot.y,
    currentPoint.x - pivot.x,
  );

  return initialRotation + currentAngle - initialAngle;
}

export function snapRotation(rotation: number, incrementDegrees = 15): number {
  const increment = (incrementDegrees * Math.PI) / 180;
  return Math.round(rotation / increment) * increment;
}
