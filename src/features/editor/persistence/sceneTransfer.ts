import { renderScene } from "../rendering/renderScene";
import { preloadSceneImages } from "../rendering/imageCache";
import {
  renderSvgScene,
  SVG_NAMESPACE,
} from "../rendering/renderSvgScene";
import type { Bounds, SceneElement } from "../model/types";
import { expandBounds, getSceneBounds } from "../interaction/sceneBounds";
import type { PersistedScene } from "./sceneStorage";

export const EXPORT_PADDING = 20;

interface ExportRaster {
  blob: Blob;
}

interface ExportSvg {
  element: SVGSVGElement;
}

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

  const exportBounds = getSceneExportBounds(elements);
  if (!exportBounds) {
    return Promise.resolve();
  }

  // A renderização principal pode desenhar um placeholder enquanto a imagem
  // carrega; no export, aguardamos os recursos para que o arquivo não saia
  // incompleto.
  return preloadSceneImages(elements).then(() => {
    return createScenePngAfterImages(elements, backgroundColor, exportBounds);
  }).then((raster) => {
    downloadBlob(raster.blob, `whiteboard-${Date.now()}.png`);
  });
}

function getSceneExportBounds(elements: SceneElement[]): Bounds | null {
  const bounds = getSceneBounds(elements);
  return bounds ? expandBounds(bounds, EXPORT_PADDING) : null;
}

function createScenePngAfterImages(
  elements: SceneElement[],
  backgroundColor: string,
  exportBounds: Bounds,
): Promise<ExportRaster> {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.ceil(exportBounds.width));
  const height = Math.max(1, Math.ceil(exportBounds.height));
  canvas.width = Math.ceil(width * devicePixelRatio);
  canvas.height = Math.ceil(height * devicePixelRatio);

  const context = canvas.getContext("2d");

  if (!context) {
    return Promise.reject(
      new Error("Não foi possível criar o canvas de exportação."),
    );
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

      resolve({ blob });
    }, "image/png");
  });
}

function createSceneSvg(
  elements: SceneElement[],
  backgroundColor: string,
  exportBounds: Bounds,
): ExportSvg {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("xmlns", SVG_NAMESPACE);
  svg.setAttribute("version", "1.1");
  svg.setAttribute(
    "viewBox",
    `${exportBounds.x} ${exportBounds.y} ${exportBounds.width} ${exportBounds.height}`,
  );
  svg.setAttribute("width", String(Math.ceil(exportBounds.width)));
  svg.setAttribute("height", String(Math.ceil(exportBounds.height)));

  renderSvgScene(svg, elements, backgroundColor);

  return { element: svg };
}

function prepareSvgForPdf(svg: SVGSVGElement): void {
  // O SVG puro usa dominant-baseline, que é entendido pelos navegadores.
  // svg2pdf.js, porém, lê alignment-baseline e assume "alphabetic" quando
  // esse atributo não existe. Repetimos a mesma baseline hanging apenas na
  // cópia que será convertida, sem alterar o SVG baixado pelo usuário.
  for (const text of svg.querySelectorAll("text")) {
    text.setAttribute("alignment-baseline", "hanging");
  }
}

export function exportSceneAsSvg(
  elements: SceneElement[],
  backgroundColor: string,
): void {
  if (typeof window === "undefined" || elements.length === 0) {
    return;
  }

  const exportBounds = getSceneExportBounds(elements);
  if (!exportBounds) {
    return;
  }

  const { element: svg } = createSceneSvg(
    elements,
    backgroundColor,
    exportBounds,
  );

  const serialized = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([serialized], {
    type: "image/svg+xml;charset=utf-8",
  });
  downloadBlob(blob, `whiteboard-${Date.now()}.svg`);
}

function createPdfDocument(
  JsPDF: typeof import("jspdf").jsPDF,
  bounds: Bounds,
) {
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);

  return new JsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "pt",
    format: [width, height],
    compress: true,
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Não foi possível preparar a imagem para exportação."));
      }
    };
    reader.onerror = () => {
      reject(new Error("Não foi possível preparar a imagem para exportação."));
    };
    reader.readAsDataURL(blob);
  });
}

function outputToBlob(
  output: string | ArrayBuffer | Blob | Uint8Array,
  type: string,
): Blob {
  if (output instanceof Blob) {
    return output;
  }

  if (typeof output === "string") {
    return new Blob([output], { type });
  }

  if (output instanceof ArrayBuffer) {
    return new Blob([output], { type });
  }

  const arrayBuffer = output.buffer.slice(
    output.byteOffset,
    output.byteOffset + output.byteLength,
  ) as ArrayBuffer;
  return new Blob([arrayBuffer], { type });
}

export async function exportSceneAsPdf(
  elements: SceneElement[],
  backgroundColor: string,
): Promise<void> {
  if (typeof window === "undefined" || elements.length === 0) {
    return;
  }

  const exportBounds = getSceneExportBounds(elements);
  if (!exportBounds) {
    return;
  }

  // As imagens são pré-carregadas uma vez para que tanto o SVG vetorial
  // quanto o fallback rasterizado representem a cena completa.
  await preloadSceneImages(elements);

  const { jsPDF } = await import("jspdf");

  try {
    const { svg2pdf } = await import("svg2pdf.js");
    const { element: svg } = createSceneSvg(
      elements,
      backgroundColor,
      exportBounds,
    );
    prepareSvgForPdf(svg);
    const pdf = createPdfDocument(jsPDF, exportBounds);

    await svg2pdf(svg, pdf, {
      x: 0,
      y: 0,
      width: exportBounds.width,
      height: exportBounds.height,
    });

    downloadBlob(pdf.output("blob"), `whiteboard-${Date.now()}.pdf`);
  } catch (error) {
    // rough.js e alguns recursos SVG podem não ser aceitos por todas as
    // versões do conversor. Nesse caso, mantém-se a exportação disponível
    // usando exatamente o mesmo raster que o exportador PNG produziria.
    console.warn(
      "Não foi possível converter o SVG para PDF vetorial; usando PNG como fallback.",
      error,
    );
    const raster = await createScenePngAfterImages(
      elements,
      backgroundColor,
      exportBounds,
    );
    const pdf = createPdfDocument(jsPDF, exportBounds);
    pdf.addImage(
      await blobToDataUrl(raster.blob),
      "PNG",
      0,
      0,
      exportBounds.width,
      exportBounds.height,
    );
    downloadBlob(pdf.output("blob"), `whiteboard-${Date.now()}.pdf`);
  }
}

export async function exportSceneAsPptx(
  elements: SceneElement[],
  backgroundColor: string,
): Promise<void> {
  if (typeof window === "undefined" || elements.length === 0) {
    return;
  }

  const exportBounds = getSceneExportBounds(elements);
  if (!exportBounds) {
    return;
  }

  await preloadSceneImages(elements);
  const raster = await createScenePngAfterImages(
    elements,
    backgroundColor,
    exportBounds,
  );
  const imageData = await blobToDataUrl(raster.blob);
  const { default: PptxGenJS } = await import("pptxgenjs");

  // O PowerPoint trabalha em polegadas. Fixamos a largura e preservamos a
  // proporção do conteúdo para evitar barras ou cortes no slide.
  const slideWidth = 10;
  const slideHeight = Math.max(
    0.1,
    slideWidth * (exportBounds.height / exportBounds.width),
  );
  const pptx = new PptxGenJS();
  pptx.defineLayout({
    name: "GARRANCHOS_CONTENT",
    width: slideWidth,
    height: slideHeight,
  });
  pptx.layout = "GARRANCHOS_CONTENT";

  const slide = pptx.addSlide();
  slide.addImage({
    data: imageData,
    x: 0,
    y: 0,
    w: slideWidth,
    h: slideHeight,
  });

  const output = await pptx.write({ outputType: "blob", compression: true });
  downloadBlob(
    outputToBlob(output, "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    `whiteboard-${Date.now()}.pptx`,
  );
}
