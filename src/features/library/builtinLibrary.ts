import type {
  ArrowElement,
  DiamondElement,
  EllipseElement,
  FreehandElement,
  LineElement,
  RectangleElement,
  SceneElement,
} from "../editor/model/types";
import type { LibraryItem } from "./types";

const common = (id: string, x: number, y: number, groupId: string | null) => ({
  id,
  groupId,
  x,
  y,
  rotation: 0,
  strokeColor: "#1f2937",
  strokeWidth: 2.5,
  strokeStyle: "solid" as const,
  fillColor: null,
  fillStyle: "none" as const,
  opacity: 1,
  seed: 7000 + id.length,
  roughness: 1.4,
});

function rectangle(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  groupId: string | null,
  fillColor: string | null = null,
): RectangleElement {
  return {
    ...common(id, x, y, groupId),
    type: "rectangle",
    cornerStyle: "round",
    width,
    height,
    fillColor,
    fillStyle: fillColor ? "solid" : "none",
  };
}

function ellipse(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  groupId: string | null,
): EllipseElement {
  return { ...common(id, x, y, groupId), type: "ellipse", width, height };
}

function diamond(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  groupId: string | null,
  fillColor: string | null = null,
): DiamondElement {
  return {
    ...common(id, x, y, groupId),
    type: "diamond",
    width,
    height,
    fillColor,
    fillStyle: fillColor ? "solid" : "none",
  };
}

function line(
  id: string,
  x: number,
  y: number,
  points: LineElement["points"],
  groupId: string | null,
): LineElement {
  return { ...common(id, x, y, groupId), type: "line", points };
}

function arrow(
  id: string,
  x: number,
  y: number,
  points: ArrowElement["points"],
  groupId: string | null,
): ArrowElement {
  return { ...common(id, x, y, groupId), type: "arrow", points };
}

function freehand(
  id: string,
  x: number,
  y: number,
  points: FreehandElement["points"],
  groupId: string | null,
): FreehandElement {
  return { ...common(id, x, y, groupId), type: "freehand", points };
}

function item(id: string, name: string, elements: SceneElement[]): LibraryItem {
  return { id, name, elements, thumbnail: "" };
}

const speechGroup = "builtin-speech";
const flowGroup = "builtin-flow";
const targetGroup = "builtin-target";
const highlightGroup = "builtin-highlight";
const arrowsGroup = "builtin-arrows";

export const BUILTIN_LIBRARY: LibraryItem[] = [
  item("builtin-speech", "Balão de fala", [
    rectangle("speech-box", 0, 0, 180, 90, speechGroup, "#fff7ed"),
    line("speech-tail", 28, 90, [{ x: 0, y: 0 }, { x: 22, y: 20 }], speechGroup),
  ]),
  item("builtin-flow", "Fluxograma", [
    rectangle("flow-start", 0, 0, 150, 70, flowGroup, "#eff6ff"),
    diamond("flow-decision", 210, 0, 130, 100, flowGroup, "#f0fdf4"),
    arrow("flow-arrow", 150, 35, [{ x: 0, y: 0 }, { x: 60, y: 0 }], flowGroup),
  ]),
  item("builtin-target", "Alvo", [
    ellipse("target-outer", 0, 0, 150, 110, targetGroup),
    ellipse("target-inner", 35, 25, 80, 60, targetGroup),
    ellipse("target-center", 66, 46, 18, 18, targetGroup),
  ]),
  item("builtin-check", "Check", [
    freehand(
      "check-mark",
      1.25,
      1.25,
      [{ x: 0, y: 35 }, { x: 28, y: 62 }, { x: 82, y: 0 }],
      null,
    ),
  ]),
  item("builtin-highlight", "Destaque", [
    diamond("highlight-diamond", 0, 22, 160, 100, highlightGroup, "#fef3c7"),
    line("highlight-ray-top", 80, 0, [{ x: 0, y: 22 }, { x: 0, y: 0 }], highlightGroup),
    line("highlight-ray-right", 182, 50, [{ x: 0, y: 0 }, { x: 22, y: 0 }], highlightGroup),
    line("highlight-ray-bottom", 80, 122, [{ x: 0, y: 0 }, { x: 0, y: 22 }], highlightGroup),
  ]),
  item("builtin-arrows", "Setas duplas", [
    arrow("double-arrow-forward", 0, 25, [{ x: 0, y: 0 }, { x: 150, y: 0 }], arrowsGroup),
    arrow("double-arrow-back", 150, 65, [{ x: 0, y: 0 }, { x: -150, y: 0 }], arrowsGroup),
  ]),
];
