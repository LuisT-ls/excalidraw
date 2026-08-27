import { generateElementId, generateSeed } from "../model/ids";
import type { ElementId, ImageElement, Point } from "../model/types";
import type { EditorStyle } from "../store/useWhiteboardStore";

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION_WORLD = 300;

export interface ImageAsset {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface ImageSize {
  width: number;
  height: number;
}

export function getFittedImageSize(
  naturalWidth: number,
  naturalHeight: number,
  maxDimension = MAX_IMAGE_DIMENSION_WORLD,
): ImageSize {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxDimension, height: maxDimension };
  }

  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  return {
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  };
}

export function createImageElement(
  asset: ImageAsset,
  center: Point,
  style: EditorStyle,
  id: ElementId = generateElementId(),
  seed = generateSeed(),
): ImageElement {
  const size = getFittedImageSize(asset.naturalWidth, asset.naturalHeight);

  return {
    id,
    type: "image",
    x: center.x - size.width / 2,
    y: center.y - size.height / 2,
    rotation: 0,
    strokeColor: style.strokeColor,
    strokeWidth: style.strokeWidth,
    strokeStyle: style.strokeStyle,
    fillColor: null,
    fillStyle: "none",
    opacity: style.opacity,
    seed,
    roughness: style.roughness,
    width: size.width,
    height: size.height,
    src: asset.src,
  };
}

export function readImageFile(file: File): Promise<ImageAsset> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("O arquivo selecionado não é uma imagem."));
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return Promise.reject(new Error("A imagem deve ter no máximo 10 MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Não foi possível obter os dados da imagem."));
        return;
      }

      const image = new window.Image();
      image.onerror = () => reject(new Error("Não foi possível decodificar a imagem."));
      image.onload = () => {
        resolve({
          src: reader.result as string,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        });
      };
      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
