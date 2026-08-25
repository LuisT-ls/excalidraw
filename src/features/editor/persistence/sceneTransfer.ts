import { renderScene } from "../rendering/renderScene";
import type { SceneElement } from "../model/types";
import { expandBounds, getSceneBounds } from "../interaction/sceneBounds";
import type { PersistedScene } from "./sceneStorage";

const EXPORT_PADDING = 20;

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function exportSceneAsJson(
  elements: SceneElement[],
  backgroundColor: string,
): void {
  if (typeof window === "undefined" || elements.length === 0) {
    return;
  }

  const scene: PersistedScene = {
    type: "whiteboard-scene",
    version: 1,
    elements,
    backgroundColor,
  };
  const blob = new Blob([JSON.stringify(scene, null, 2)], {
    type: "application/json",
  });

  downloadBlob(blob, `whiteboard-${Date.now()}.json`);
}

export function exportSceneAsPng(
  elements: SceneElement[],
  backgroundColor: string,
): Promise<void> {
  if (typeof window === "undefined" || elements.length === 0) {
    return Promise.resolve();
  }

  const bounds = getSceneBounds(elements);

  if (!bounds) {
    return Promise.resolve();
  }

  const exportBounds = expandBounds(bounds, EXPORT_PADDING);
  const devicePixelRatio = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.ceil(exportBounds.width));
  const height = Math.max(1, Math.ceil(exportBounds.height));
  canvas.width = Math.ceil(width * devicePixelRatio);
  canvas.height = Math.ceil(height * devicePixelRatio);

  const context = canvas.getContext("2d");

  if (!context) {
    return Promise.reject(new Error("Não foi possível criar o canvas de exportação."));
  }

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context.fillStyle = backgroundColor || "#ffffff";
  context.fillRect(0, 0, width, height);
  context.setTransform(
    devicePixelRatio,
    0,
    0,
    devicePixelRatio,
    -exportBounds.x * devicePixelRatio,
    -exportBounds.y * devicePixelRatio,
  );
  renderScene(context, elements, [], null, 1, null, { showSelection: false });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Não foi possível gerar o PNG da cena."));
        return;
      }

      downloadBlob(blob, `whiteboard-${Date.now()}.png`);
      resolve();
    }, "image/png");
  });
}
