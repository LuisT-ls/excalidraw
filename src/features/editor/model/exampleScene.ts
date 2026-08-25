import type { SceneElement } from "./types";
import { measureText } from "../rendering/measureText";

const base = {
  rotation: 0,
  strokeColor: "#1f2937",
  strokeWidth: 2.5,
  fillColor: null,
  fillStyle: "none" as const,
  opacity: 1,
  roughness: 1.4,
};

export const DEFAULT_TEXT_STYLE = {
  fontSize: 26,
  fontFamily: "Arial, sans-serif",
  fontWeight: "bold" as const,
  textAlign: "left" as const,
};

const exampleText = "Canvas sketch";
const exampleTextMetrics = measureText(
  exampleText,
  DEFAULT_TEXT_STYLE.fontSize,
  DEFAULT_TEXT_STYLE.fontFamily,
);

export const exampleElements: SceneElement[] = [
  {
    ...base,
    id: "example-text",
    type: "text",
    x: 120,
    y: 42,
    text: exampleText,
    width: exampleTextMetrics.width,
    height: exampleTextMetrics.height,
    ...DEFAULT_TEXT_STYLE,
    strokeColor: "#111827",
    seed: 606,
  },
  {
    ...base,
    id: "example-rectangle",
    type: "rectangle",
    x: 120,
    y: 110,
    width: 230,
    height: 140,
    strokeColor: "#2563eb",
    seed: 101,
  },
  {
    ...base,
    id: "example-ellipse",
    type: "ellipse",
    x: 470,
    y: 105,
    width: 220,
    height: 145,
    strokeColor: "#db2777",
    fillColor: "#fce7f3",
    fillStyle: "solid",
    seed: 202,
  },
  {
    ...base,
    id: "example-line",
    type: "line",
    x: 150,
    y: 350,
    points: [
      { x: 0, y: 0 },
      { x: 230, y: 100 },
    ],
    strokeColor: "#059669",
    seed: 303,
  },
  {
    ...base,
    id: "example-arrow",
    type: "arrow",
    x: 470,
    y: 350,
    points: [
      { x: 0, y: 80 },
      { x: 250, y: 0 },
    ],
    strokeColor: "#ea580c",
    strokeWidth: 3,
    seed: 404,
  },
  {
    ...base,
    id: "example-freehand",
    type: "freehand",
    x: 180,
    y: 570,
    points: [
      { x: 0, y: 35 },
      { x: 24, y: 2 },
      { x: 50, y: 38 },
      { x: 78, y: 10 },
      { x: 106, y: 48 },
      { x: 136, y: 15 },
      { x: 165, y: 38 },
      { x: 195, y: 6 },
      { x: 225, y: 36 },
      { x: 260, y: 15 },
    ],
    strokeColor: "#7c3aed",
    strokeWidth: 5,
    seed: 505,
  },
];
