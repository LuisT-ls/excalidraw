import type { SceneElement } from "../model/types";

interface CachedImage {
  image: HTMLImageElement;
  promise: Promise<HTMLImageElement>;
}

const imageCache = new Map<string, CachedImage>();

function loadImage(src: string): CachedImage | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cached = imageCache.get(src);
  if (cached) {
    return cached;
  }

  const image = new window.Image();
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
  });
  // O canvas não aguarda esse Promise; a rejeição é tratada explicitamente
  // para uma fonte inválida não gerar unhandled rejection durante o loop.
  void promise.catch(() => image);
  image.src = src;

  const entry = { image, promise };
  imageCache.set(src, entry);
  return entry;
}

/** Retorna apenas imagens prontas; o renderizador tenta novamente no próximo frame. */
export function getCachedImage(src: string): HTMLImageElement | null {
  const entry = loadImage(src);

  if (!entry || !entry.image.complete || entry.image.naturalWidth === 0) {
    return null;
  }

  return entry.image;
}

export function preloadSceneImages(elements: SceneElement[]): Promise<void> {
  const promises = elements
    .filter((element) => element.type === "image")
    .map((element) => loadImage(element.src)?.promise ?? Promise.resolve());

  return Promise.all(promises).then(() => undefined);
}

export function clearImageCache(): void {
  imageCache.clear();
}
