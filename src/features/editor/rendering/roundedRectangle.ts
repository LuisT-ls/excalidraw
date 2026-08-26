export function getRoundedRectanglePath(
  width: number,
  height: number,
  radius: number,
): string {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const safeRadius = Math.min(
    Math.max(0, radius),
    safeWidth / 2,
    safeHeight / 2,
  );

  return [
    `M ${safeRadius} 0`,
    `L ${safeWidth - safeRadius} 0`,
    `Q ${safeWidth} 0 ${safeWidth} ${safeRadius}`,
    `L ${safeWidth} ${safeHeight - safeRadius}`,
    `Q ${safeWidth} ${safeHeight} ${safeWidth - safeRadius} ${safeHeight}`,
    `L ${safeRadius} ${safeHeight}`,
    `Q 0 ${safeHeight} 0 ${safeHeight - safeRadius}`,
    `L 0 ${safeRadius}`,
    `Q 0 0 ${safeRadius} 0`,
    "Z",
  ].join(" ");
}
