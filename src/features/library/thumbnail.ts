import { expandBounds, getSceneBounds } from "../editor/interaction/sceneBounds";
import type { SceneElement } from "../editor/model/types";
import { renderScene } from "../editor/rendering/renderScene";

const THUMBNAIL_WIDTH = 180;
const THUMBNAIL_HEIGHT = 120;
const THUMBNAIL_PADDING = 12;

export function generateLibraryThumbnail(elements: SceneElement[]): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "";
  }

  const bounds = getSceneBounds(elements);

  if (!bounds) {
    return "";
  }

  const paddedBounds = expandBounds(bounds, THUMBNAIL_PADDING);
  const scale = Math.min(
    THUMBNAIL_WIDTH / Math.max(paddedBounds.width, 1),
    THUMBNAIL_HEIGHT / Math.max(paddedBounds.height, 1),
  );
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(THUMBNAIL_WIDTH * devicePixelRatio);
  canvas.height = Math.ceil(THUMBNAIL_HEIGHT * devicePixelRatio);

  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  const drawingWidth = paddedBounds.width * scale;
  const drawingHeight = paddedBounds.height * scale;
  const offsetX = (THUMBNAIL_WIDTH - drawingWidth) / 2 - paddedBounds.x * scale;
  const offsetY = (THUMBNAIL_HEIGHT - drawingHeight) / 2 - paddedBounds.y * scale;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.setTransform(
    devicePixelRatio * scale,
    0,
    0,
    devicePixelRatio * scale,
    devicePixelRatio * offsetX,
    devicePixelRatio * offsetY,
  );
  renderScene(context, elements, [], null, scale, null, {
    showSelection: false,
  });

  return canvas.toDataURL("image/png");
}
