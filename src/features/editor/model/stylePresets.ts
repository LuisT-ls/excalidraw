export const COLOR_PRESETS = [
  { label: "Preto", value: "#1f2937" },
  { label: "Azul", value: "#2563eb" },
  { label: "Vermelho", value: "#dc2626" },
  { label: "Verde", value: "#059669" },
  { label: "Roxo", value: "#7c3aed" },
] as const;

export const STROKE_WIDTHS = [
  { label: "Fino", value: 1 },
  { label: "Médio", value: 2 },
  { label: "Grosso", value: 4 },
] as const;

export const FILL_PRESETS = [
  { label: "Transparente", value: null },
  { label: "Amarelo claro", value: "#fef3c7" },
  { label: "Azul claro", value: "#dbeafe" },
  { label: "Rosa claro", value: "#fce7f3" },
  { label: "Verde claro", value: "#dcfce7" },
] as const;

export const STROKE_STYLES = [
  { label: "Sólido", value: "solid" },
  { label: "Tracejado", value: "dashed" },
  { label: "Pontilhado", value: "dotted" },
] as const;

export const ROUGHNESS_PRESETS = [
  { label: "Preciso", value: 1 },
  { label: "Equilibrado", value: 1.4 },
  { label: "Expressivo", value: 2.4 },
] as const;
