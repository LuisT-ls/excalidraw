const MAX_SEED = 2_147_483_647;

export function generateElementId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `element-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function generateGroupId(): string {
  return `group-${generateElementId()}`;
}

export function generateSeed(): number {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return (values[0] % MAX_SEED) || 1;
  }

  return Math.floor(Math.random() * MAX_SEED) + 1;
}
