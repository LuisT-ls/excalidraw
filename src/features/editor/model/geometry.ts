import type { Point } from "./types";

/**
 * Retorna os vértices do diamante em coordenadas locais, começando pelo topo.
 * Canvas, SVG e hit-testing compartilham esta geometria para não divergirem.
 */
export function getDiamondPoints(
  width: number,
  height: number,
): [Point, Point, Point, Point] {
  const left = Math.min(0, width);
  const right = Math.max(0, width);
  const top = Math.min(0, height);
  const bottom = Math.max(0, height);
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  return [
    { x: centerX, y: top },
    { x: right, y: centerY },
    { x: centerX, y: bottom },
    { x: left, y: centerY },
  ];
}
