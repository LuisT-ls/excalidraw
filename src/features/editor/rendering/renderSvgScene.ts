import { getStroke } from "perfect-freehand";
import rough from "roughjs/bin/rough";
import type { RoughSVG } from "roughjs/bin/svg";
import { getArrowHeadPoints, getRoughOptions, getStrokeLineDash } from "./roughRenderer";
import { getRoundedRectanglePath } from "./roundedRectangle";
import type {
  FreehandElement,
  ImageElement,
  SceneElement,
  TextElement,
} from "../model/types";

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

type SvgRoughRenderer = RoughSVG;

function setAttribute(
  element: SVGElement,
  name: string,
  value: number | string,
) {
  element.setAttribute(name, String(value));
}

function renderFreehand(parent: SVGGElement, element: FreehandElement) {
  if (element.points.length === 0) {
    return;
  }

  const outline = getStroke(
    element.points.map(({ x, y }): [number, number] => [x, y]),
    {
      size: Math.max(1, element.strokeWidth * 2),
      thinning: 0.35,
      smoothing: 0.7,
      streamline: 0.5,
      easing: (value) => value,
      last: true,
    },
  );

  if (outline.length === 0) {
    return;
  }

  const path = document.createElementNS(SVG_NAMESPACE, "path");
  const pathData = outline
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
    .join(" ");

  setAttribute(path, "d", `${pathData} Z`);
  setAttribute(path, "fill", element.strokeColor);

  const dash = getStrokeLineDash(element.strokeStyle);
  if (dash) {
    setAttribute(path, "stroke", element.strokeColor);
    setAttribute(path, "stroke-width", element.strokeWidth);
    setAttribute(path, "stroke-dasharray", dash.join(" "));
  }

  parent.appendChild(path);
}

function renderText(parent: SVGGElement, element: TextElement) {
  const text = document.createElementNS(SVG_NAMESPACE, "text");
  const textAnchor = {
    left: "start",
    center: "middle",
    right: "end",
  }[element.textAlign];

  setAttribute(text, "x", 0);
  setAttribute(text, "y", 0);
  setAttribute(text, "fill", element.strokeColor);
  setAttribute(text, "font-family", element.fontFamily);
  setAttribute(text, "font-size", element.fontSize);
  setAttribute(text, "font-weight", element.fontWeight);
  setAttribute(text, "text-anchor", textAnchor);
  setAttribute(text, "dominant-baseline", "hanging");

  const lineHeight = element.fontSize * 1.2;
  for (const [index, line] of element.text.split("\n").entries()) {
    const tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
    setAttribute(tspan, "x", 0);
    setAttribute(tspan, "dy", index === 0 ? 0 : lineHeight);
    tspan.textContent = line;
    text.appendChild(tspan);
  }

  parent.appendChild(text);
}

function renderImage(parent: SVGGElement, element: ImageElement) {
  const image = document.createElementNS(SVG_NAMESPACE, "image");
  setAttribute(image, "x", 0);
  setAttribute(image, "y", 0);
  setAttribute(image, "width", element.width);
  setAttribute(image, "height", element.height);
  image.setAttribute("href", element.src);
  parent.appendChild(image);
}

function renderRoughElement(
  roughRenderer: SvgRoughRenderer,
  parent: SVGGElement,
  element: SceneElement,
) {
  const options = getRoughOptions(element);

  switch (element.type) {
    case "rectangle": {
      const drawing =
        element.cornerStyle === "round"
          ? roughRenderer.path(
              getRoundedRectanglePath(
                element.width,
                element.height,
                Math.min(element.width, element.height) * 0.15,
              ),
              options,
            )
          : roughRenderer.rectangle(
              0,
              0,
              element.width,
              element.height,
              options,
            );
      parent.appendChild(drawing);
      return;
    }
    case "ellipse":
      parent.appendChild(
        roughRenderer.ellipse(
          element.width / 2,
          element.height / 2,
          element.width,
          element.height,
          options,
        ),
      );
      return;
    case "line":
      for (let index = 1; index < element.points.length; index += 1) {
        const start = element.points[index - 1];
        const end = element.points[index];
        parent.appendChild(
          roughRenderer.line(start.x, start.y, end.x, end.y, options),
        );
      }
      return;
    case "arrow": {
      for (let index = 1; index < element.points.length; index += 1) {
        const start = element.points[index - 1];
        const end = element.points[index];
        parent.appendChild(
          roughRenderer.line(start.x, start.y, end.x, end.y, options),
        );
      }

      const end = element.points[element.points.length - 1];
      const { left, right } = getArrowHeadPoints(element);
      parent.appendChild(
        roughRenderer.line(end.x, end.y, left.x, left.y, options),
      );
      parent.appendChild(
        roughRenderer.line(end.x, end.y, right.x, right.y, options),
      );
      return;
    }
    case "freehand":
      renderFreehand(parent, element);
      return;
    case "text":
      renderText(parent, element);
      return;
    case "image":
      renderImage(parent, element);
  }
}

function renderElement(
  svg: SVGSVGElement,
  roughRenderer: SvgRoughRenderer,
  element: SceneElement,
) {
  const group = document.createElementNS(SVG_NAMESPACE, "g");
  const rotation = (element.rotation * 180) / Math.PI;

  setAttribute(group, "transform", `translate(${element.x} ${element.y}) rotate(${rotation})`);
  setAttribute(group, "opacity", element.opacity);
  renderRoughElement(roughRenderer, group, element);
  svg.appendChild(group);
}

export function renderSvgScene(
  svg: SVGSVGElement,
  elements: SceneElement[],
  backgroundColor: string,
) {
  const background = document.createElementNS(SVG_NAMESPACE, "rect");
  setAttribute(background, "x", svg.viewBox.baseVal.x);
  setAttribute(background, "y", svg.viewBox.baseVal.y);
  setAttribute(background, "width", svg.viewBox.baseVal.width);
  setAttribute(background, "height", svg.viewBox.baseVal.height);
  setAttribute(background, "fill", backgroundColor || "#ffffff");
  svg.appendChild(background);

  const roughRenderer = rough.svg(svg);
  for (const element of elements) {
    renderElement(svg, roughRenderer, element);
  }

  svg.insertBefore(background, svg.firstChild);
}
