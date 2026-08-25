export type ElementId = string;

export type ElementType =
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "freehand";

export type Tool =
  | "select"
  | "hand"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "pencil"
  | "eraser";

export type FillStyle = "none" | "solid";

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface ElementBase {
  id: ElementId;
  type: ElementType;
  x: number;
  y: number;
  rotation: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string | null;
  fillStyle: FillStyle;
  opacity: number;
  seed: number;
  roughness: number;
}

export interface RectangleElement extends ElementBase {
  type: "rectangle";
  width: number;
  height: number;
}

export interface EllipseElement extends ElementBase {
  type: "ellipse";
  width: number;
  height: number;
}

export interface LineElement extends ElementBase {
  type: "line";
  points: [Point, Point, ...Point[]];
}

export interface ArrowElement extends ElementBase {
  type: "arrow";
  points: [Point, Point, ...Point[]];
}

export interface TextElement extends ElementBase {
  type: "text";
  text: string;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";
}

export interface FreehandElement extends ElementBase {
  type: "freehand";
  points: Point[];
}

export type SceneElement =
  | RectangleElement
  | EllipseElement
  | LineElement
  | ArrowElement
  | TextElement
  | FreehandElement;

export interface Scene {
  type: "whiteboard-scene";
  version: 1;
  elements: SceneElement[];
  backgroundColor: string;
}
