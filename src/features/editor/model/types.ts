export type ElementId = string;

export type ElementType =
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "freehand"
  | "image";

export type Tool =
  | "select"
  | "hand"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "pencil"
  | "eraser";

export type FillStyle = "none" | "solid";
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type CornerStyle = "sharp" | "round";

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

export interface Comment {
  id: string;
  x: number;
  y: number;
  text: string;
  createdAt: number;
}

export interface ElementBase {
  id: ElementId;
  type: ElementType;
  groupId: string | null;
  x: number;
  y: number;
  rotation: number;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillColor: string | null;
  fillStyle: FillStyle;
  opacity: number;
  seed: number;
  roughness: number;
}

export interface RectangleElement extends ElementBase {
  type: "rectangle";
  cornerStyle: CornerStyle;
  width: number;
  height: number;
}

export interface DiamondElement extends ElementBase {
  type: "diamond";
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

export interface ImageElement extends ElementBase {
  type: "image";
  width: number;
  height: number;
  /** Imagem embutida para manter a persistência local simples nesta etapa. */
  src: string;
}

export type SceneElement =
  | RectangleElement
  | DiamondElement
  | EllipseElement
  | LineElement
  | ArrowElement
  | TextElement
  | FreehandElement
  | ImageElement;

export interface Scene {
  type: "whiteboard-scene";
  version: 1;
  elements: SceneElement[];
  comments: Comment[];
  backgroundColor: string;
}
