export interface LaserTrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const LASER_TRAIL_DURATION_MS = 700;
const LASER_COLOR = "255, 72, 40";

export function appendLaserTrailPoint(
  points: LaserTrailPoint[],
  point: { x: number; y: number },
  timestamp: number,
): LaserTrailPoint[] {
  return [...points, { ...point, timestamp }];
}

export function pruneLaserTrail(
  points: LaserTrailPoint[],
  timestamp: number,
  durationMs = LASER_TRAIL_DURATION_MS,
): LaserTrailPoint[] {
  const oldestAllowedTimestamp = timestamp - durationMs;
  return points.filter((point) => point.timestamp >= oldestAllowedTimestamp);
}

/**
 * Draws in CSS-pixel coordinates. The caller may have the world transform
 * active, so the effect temporarily switches to DPR-only screen coordinates.
 */
export function drawLaserTrail(
  context: CanvasRenderingContext2D,
  points: LaserTrailPoint[],
  timestamp: number,
  devicePixelRatio: number,
  durationMs = LASER_TRAIL_DURATION_MS,
): void {
  if (points.length === 0) {
    return;
  }

  context.save();
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 3;
  context.shadowBlur = 10;
  context.shadowColor = `rgba(${LASER_COLOR}, 0.8)`;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const age = Math.max(0, timestamp - end.timestamp);
    const opacity = Math.max(0, 1 - age / durationMs);

    if (opacity === 0) {
      continue;
    }

    context.strokeStyle = `rgba(${LASER_COLOR}, ${opacity})`;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  const tip = points[points.length - 1];
  const tipAge = Math.max(0, timestamp - tip.timestamp);
  const tipOpacity = Math.max(0, 1 - tipAge / durationMs);

  if (tipOpacity > 0) {
    context.fillStyle = `rgba(${LASER_COLOR}, ${tipOpacity})`;
    context.beginPath();
    context.arc(tip.x, tip.y, 3, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}
