export function clampOpacityPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function opacityToPercent(opacity: number): number {
  return clampOpacityPercent(opacity * 100);
}

export function percentToOpacity(percent: number): number {
  return clampOpacityPercent(percent) / 100;
}
