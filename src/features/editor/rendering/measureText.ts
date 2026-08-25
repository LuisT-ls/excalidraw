import type { TextElement } from "../model/types";

export interface MeasuredText {
  width: number;
  height: number;
}

export function measureText(
  text: string,
  fontSize: number,
  fontFamily: string,
): MeasuredText {
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.2;

  if (typeof window === "undefined" || typeof document === "undefined") {
    // No SSR não existe canvas para medir a fonte. Retornamos uma estimativa
    // determinística para permitir criar/serializar a cena sem lançar erro;
    // no client a medição usa as métricas reais do navegador.
    const longestLineLength = Math.max(
      ...lines.map((line) => line.length),
    );

    return {
      width: longestLineLength * fontSize * 0.6,
      height: lines.length * lineHeight,
    };
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível criar o contexto 2D para medir o texto");
  }

  context.font = `${fontSize}px ${fontFamily}`;
  const width = Math.max(
    ...lines.map((line) => context.measureText(line).width),
  );

  return {
    width,
    height: lines.length * lineHeight,
  };
}

export function updateTextMetrics(element: TextElement): TextElement {
  const metrics = measureText(
    element.text,
    element.fontSize,
    element.fontFamily,
  );

  return {
    ...element,
    width: metrics.width,
    height: metrics.height,
  };
}
