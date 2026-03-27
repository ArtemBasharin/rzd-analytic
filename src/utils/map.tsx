import React, { useEffect, useImperativeHandle, useRef, useState } from "react";

type Props = {
  className?: string;
  segmentDurationByName?: Record<string, number>;
  stationDurationByName?: Record<string, number>;
};

const MAP_CIRCLE_BASE_R = "data-map-base-r";
const MAP_ELLIPSE_BASE_RX = "data-map-base-rx";
const MAP_ELLIPSE_BASE_RY = "data-map-base-ry";
const MAP_PATH_CX = "data-map-station-dot-cx";
const MAP_PATH_CY = "data-map-station-dot-cy";

/** Первый прямой дочерний <g> — страница Visio с контентом */
function firstDirectChildG(svg: Element): SVGGElement | null {
  for (let i = 0; i < svg.children.length; i++) {
    const el = svg.children[i];
    if (el.tagName.toLowerCase() === "g") {
      return el as SVGGElement;
    }
  }
  return null;
}

/** Метаданные страницы (масштаб, тень и т.д.) не влияют на геометрию — убираем из DOM */
function removeVisioPageProperties(pageGroup: Element) {
  for (let i = pageGroup.children.length - 1; i >= 0; i--) {
    const el = pageGroup.children[i];
    if (el.localName.toLowerCase() === "pageproperties") {
      el.remove();
    }
  }
}

/** Bounding box только отрисовываемого контента (без полей viewBox страницы) */
function measureVisioContentBBox(svg: SVGSVGElement): DOMRect | null {
  if (typeof document === "undefined") return null;

  const pageG = firstDirectChildG(svg);
  if (!pageG) return null;

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-3000px;top:0;width:1600px;height:1600px;opacity:0;pointer-events:none;visibility:hidden";
  document.body.appendChild(host);

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = svg.getAttribute("viewBox");
  const parts =
    vb
      ?.trim()
      .split(/[\s,]+/)
      .map(parseFloat) ?? [];
  const vw = parts.length === 4 && parts[2] > 0 ? parts[2] : 800;
  const vh = parts.length === 4 && parts[3] > 0 ? parts[3] : 400;
  clone.setAttribute("width", String(vw));
  clone.setAttribute("height", String(vh));
  host.appendChild(clone);

  const clonePage = firstDirectChildG(clone);
  let box: DOMRect | null = null;
  try {
    const b = clonePage?.getBBox();
    if (b && b.width > 0 && b.height > 0) {
      box = b;
    }
  } catch {
    box = null;
  }

  host.remove();
  return box;
}

/** Visio: сегмент — два path; видимая линия без завершающего Z, первый часто замкнутый контур */
function isOpenLinePath(path: SVGPathElement): boolean {
  const d = (path.getAttribute("d") || "").replace(/\s+/g, " ").trim();
  if (!d) return false;
  return !/Z\s*$/i.test(d);
}

function directChildLinePaths(group: Element): SVGPathElement[] {
  return Array.from(group.children)
    .filter((el): el is SVGPathElement => el.tagName.toLowerCase() === "path")
    .filter(isOpenLinePath);
}

function isSegmentLikeGroup(group: Element): boolean {
  return directChildLinePaths(group).length > 0;
}

function readCpVal(cp: Element): string {
  return (
    cp.getAttribute("v:val") ??
    cp.getAttribute("val") ??
    cp.getAttribute("v\\:val") ??
    ""
  );
}

function parseVt4Inner(rawValue: string): string | null {
  const match = rawValue.match(/VT4\((.*?)\)/);
  if (!match?.[1]) return null;
  return match[1].trim();
}

/** Имя станции только из custProps VT4 (не подпись rect+text на карте) */
function stationNameFromCustProps(group: Element): string | null {
  const cpNode = group.querySelector("v\\:cp, cp");
  if (!cpNode) return null;
  const parsed = parseVt4Inner(readCpVal(cpNode));
  if (!parsed || parsed.includes(" - ")) return null;
  return parsed.trim();
}

/** Круг Visio часто как замкнутый path с дугами A/a (в т.ч. «A1.5» без пробела после A) */
function isCircleLikeClosedPath(path: SVGPathElement): boolean {
  const d = (path.getAttribute("d") || "").replace(/\s+/g, " ").trim();
  if (!d || !/Z\s*$/i.test(d)) return false;
  return /[Aa]\s*[\d.-]/.test(d);
}

function findVisioStationCirclePath(group: Element): SVGPathElement | null {
  const candidates = Array.from(group.querySelectorAll("path")).filter(
    (p): p is SVGPathElement =>
      p.tagName.toLowerCase() === "path" && isCircleLikeClosedPath(p),
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  let best = candidates[0];
  let bestArea = Infinity;
  for (const p of candidates) {
    try {
      const bb = p.getBBox();
      const area = bb.width * bb.height;
      if (area < bestArea) {
        bestArea = area;
        best = p;
      }
    } catch {
      /* ignore */
    }
  }
  return best;
}

type HeatRgb = readonly [number, number, number];

/** Опорные точки: зелёный → светло-зелёный/лайм → жёлтый → оранжевый → красный (без прямого R↔G в одном шаге) */
const HEAT_GRADIENT_STOPS: ReadonlyArray<{ t: number; rgb: HeatRgb }> = [
  { t: 0, rgb: [28, 145, 72] },
  { t: 0.18, rgb: [72, 175, 78] },
  { t: 0.34, rgb: [130, 200, 70] },
  { t: 0.48, rgb: [200, 210, 55] },
  { t: 0.58, rgb: [255, 228, 88] },
  { t: 0.68, rgb: [255, 175, 55] },
  { t: 0.78, rgb: [255, 115, 42] },
  { t: 0.9, rgb: [240, 65, 38] },
  { t: 1, rgb: [215, 38, 42] },
];

function lerpByte(a: number, b: number, u: number): number {
  return Math.round(a + (b - a) * u);
}

/** Цвет «нагрузки» для линий перегонов и заливки точек станций */
function heatColorFromRatio(ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio));
  const stops = HEAT_GRADIENT_STOPS;
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1].t < t) {
    i += 1;
  }
  const a = stops[i];
  const b = stops[i + 1];
  const span = b.t - a.t;
  const u = span <= 1e-9 ? 0 : (t - a.t) / span;
  const r = lerpByte(a.rgb[0], b.rgb[0], u);
  const g = lerpByte(a.rgb[1], b.rgb[1], u);
  const bl = lerpByte(a.rgb[2], b.rgb[2], u);
  return `rgb(${r}, ${g}, ${bl})`;
}

const SvgMap = React.forwardRef<SVGSVGElement, Props>(
  (
    { className, segmentDurationByName = {}, stationDurationByName = {} },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgMarkup, setSvgMarkup] = useState("");

    const normalizeName = (value: string) =>
      value
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/[^\p{L}\p{N}]+/gu, "")
        .trim();

    const parseEdgeName = (rawValue: string) => parseVt4Inner(rawValue);

    const resolveSegmentDuration = (segmentName: string) => {
      const direct = segmentDurationByName[segmentName];
      if (typeof direct === "number") return direct;

      const normalizedTarget = normalizeName(segmentName);
      const foundKey = Object.keys(segmentDurationByName).find(
        (key) => normalizeName(key) === normalizedTarget,
      );
      return foundKey ? segmentDurationByName[foundKey] : undefined;
    };

    const resolveStationDuration = (stationName: string) => {
      const direct = stationDurationByName[stationName];
      if (typeof direct === "number") return direct;

      const normalizedTarget = normalizeName(stationName);
      const foundKey = Object.keys(stationDurationByName).find(
        (key) => normalizeName(key) === normalizedTarget,
      );
      return foundKey ? stationDurationByName[foundKey] : undefined;
    };

    useEffect(() => {
      let isMounted = true;

      fetch("/map.svg")
        .then((response) => response.text())
        .then((rawSvg) => {
          if (!isMounted) return;

          const parser = new DOMParser();
          const doc = parser.parseFromString(rawSvg, "image/svg+xml");
          const svg = doc.querySelector("svg");
          if (!svg) return;

          const svgEl = svg as SVGSVGElement;
          const pageG = firstDirectChildG(svgEl);
          if (pageG) removeVisioPageProperties(pageG);

          const contentBox = measureVisioContentBBox(svgEl);
          if (contentBox) {
            const pad = Math.max(contentBox.width, contentBox.height) * 0.015;
            const vx = contentBox.x - pad;
            const vy = contentBox.y - pad;
            const vw = contentBox.width + pad * 2;
            const vh = contentBox.height + pad * 2;
            svgEl.setAttribute("viewBox", `${vx} ${vy} ${vw} ${vh}`);
          }

          svg.setAttribute("width", "100%");
          svg.setAttribute("height", "100%");
          svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
          svg.classList.add("map-highorder");
          if (className) svg.classList.add(className);

          if (!isMounted) return;
          setSvgMarkup(svg.outerHTML);
        })
        .catch(() => {
          if (isMounted) setSvgMarkup("");
        });

      return () => {
        isMounted = false;
      };
    }, [className]);

    useEffect(() => {
      const svgRoot = containerRef.current?.querySelector("svg");
      if (!svgRoot) return;

      const edgesWithData: Array<{ paths: SVGPathElement[]; value: number }> =
        [];
      const groups = Array.from(svgRoot.querySelectorAll("g"));
      const minStrokeWidth = 1.3;
      const maxStrokeWidth = 10;
      const defaultGrayStroke = "#9ca3af";

      const maxSegmentValue = Math.max(
        0,
        ...Object.values(segmentDurationByName),
      );
      const maxStationValue = Math.max(
        0,
        ...Object.values(stationDurationByName),
      );

      const heatStyleFromRatio = (ratio: number) => {
        const strokeWidth =
          minStrokeWidth + ratio * (maxStrokeWidth - minStrokeWidth);
        const strokeColor = heatColorFromRatio(ratio);
        return { strokeWidth, strokeColor };
      };

      /**
       * Точки-станции: масштаб не от толщины линий перегонов (maxStrokeWidth).
       */
      const stationDotMinScale = 1.2;
      const stationDotMaxScale = 2.31;
      const stationDotScaleFromRatio = (ratio: number) =>
        stationDotMinScale + ratio * (stationDotMaxScale - stationDotMinScale);

      /** butt — толщина не удлиняет сегмент вдоль пути (в отличие от round/square) */
      const applySegmentStrokeCaps = (pathEl: SVGPathElement) => {
        pathEl.style.strokeLinecap = "butt";
        pathEl.style.strokeLinejoin = "miter";
      };

      const applyGray = (paths: SVGPathElement[]) => {
        paths.forEach((pathEl) => {
          pathEl.style.stroke = defaultGrayStroke;
          pathEl.style.strokeWidth = `${minStrokeWidth}`;
          applySegmentStrokeCaps(pathEl);
        });
      };

      groups.forEach((group) => {
        const linePaths = directChildLinePaths(group);
        if (linePaths.length === 0) return;

        const cpNode = group.querySelector("v\\:cp, cp");
        const routeRaw = cpNode
          ? (cpNode.getAttribute("v:val") ??
            cpNode.getAttribute("val") ??
            cpNode.getAttribute("v\\:val"))
          : null;

        const segmentName = routeRaw ? parseEdgeName(routeRaw) : null;

        if (!segmentName) {
          applyGray(linePaths);
          return;
        }

        const value = resolveSegmentDuration(segmentName);
        if (value === undefined) {
          applyGray(linePaths);
          return;
        }

        edgesWithData.push({ paths: linePaths, value });
      });

      edgesWithData.forEach(({ paths, value }) => {
        const segRatio = maxSegmentValue > 0 ? value / maxSegmentValue : 0;
        const lineStyle = heatStyleFromRatio(segRatio);

        paths.forEach((path) => {
          path.style.stroke = lineStyle.strokeColor;
          path.style.strokeWidth = `${lineStyle.strokeWidth}`;
          applySegmentStrokeCaps(path);
        });
      });

      /** Класс .st8 в map.svg задаёт fill — мешает заливке; обводку оставляем как в Visio */
      const paintStationMarkerFill = (el: SVGElement, fill: string) => {
        if (el.classList.contains("st8")) {
          el.classList.remove("st8");
          el.style.setProperty("stroke", "#000000");
          el.style.setProperty("stroke-width", "0.24");
          el.style.setProperty("stroke-linecap", "round");
          el.style.setProperty("stroke-linejoin", "round");
        }
        el.removeAttribute("fill");
        el.style.setProperty("fill", fill, "important");
      };

      /** Нет строки в отчёте: белая заливка как в Visio (.st8), исходный размер */
      const paintStationMarkerNoData = (el: SVGElement) => {
        el.style.setProperty("fill", "#ffffff", "important");
        if (!el.classList.contains("st8")) {
          el.style.setProperty("stroke", "#000000");
          el.style.setProperty("stroke-width", "0.24");
          el.style.setProperty("stroke-linecap", "round");
          el.style.setProperty("stroke-linejoin", "round");
        }
      };

      const applyStationMarkerStyle = (
        label: string,
        setGeom: (scale: number) => void,
        paintData: (fill: string) => void,
        paintNoData: () => void,
      ) => {
        const v = resolveStationDuration(label);
        if (v === undefined) {
          setGeom(1);
          paintNoData();
          return;
        }
        const ratio = maxStationValue > 0 ? v / maxStationValue : 0;
        setGeom(stationDotScaleFromRatio(ratio));
        paintData(heatColorFromRatio(ratio));
      };

      /**
       * Точки-станции: только группы с VT4(одна станция) в custProps и кругом как path (A…Z).
       * Рамки rect с текстом на слое подписей не трогаем.
       */
      groups.forEach((group) => {
        if (isSegmentLikeGroup(group)) return;

        const label = stationNameFromCustProps(group);
        if (!label) return;

        const dotPath = findVisioStationCirclePath(group);
        if (dotPath && !dotPath.closest("defs")) {
          if (!dotPath.getAttribute(MAP_PATH_CX)) {
            try {
              const b = dotPath.getBBox();
              dotPath.setAttribute(MAP_PATH_CX, String(b.x + b.width / 2));
              dotPath.setAttribute(MAP_PATH_CY, String(b.y + b.height / 2));
            } catch {
              dotPath.setAttribute(MAP_PATH_CX, "0");
              dotPath.setAttribute(MAP_PATH_CY, "0");
            }
          }
          const pcx = parseFloat(dotPath.getAttribute(MAP_PATH_CX) || "0");
          const pcy = parseFloat(dotPath.getAttribute(MAP_PATH_CY) || "0");

          applyStationMarkerStyle(
            label,
            (scale) => {
              if (scale === 1) {
                dotPath.removeAttribute("transform");
              } else {
                dotPath.setAttribute(
                  "transform",
                  `translate(${pcx},${pcy}) scale(${scale}) translate(${-pcx},${-pcy})`,
                );
              }
            },
            (fill) => paintStationMarkerFill(dotPath, fill),
            () => paintStationMarkerNoData(dotPath),
          );
          return;
        }

        const marker = group.querySelector("circle, ellipse");
        if (!marker || marker.closest("defs")) return;

        const tag = marker.tagName.toLowerCase();
        if (tag === "circle") {
          const circle = marker as SVGCircleElement;
          let baseR = circle.getAttribute(MAP_CIRCLE_BASE_R);
          if (!baseR) {
            baseR = circle.getAttribute("r")?.trim() || "2";
            circle.setAttribute(MAP_CIRCLE_BASE_R, baseR);
          }
          const baseNum = parseFloat(baseR) || 2;
          applyStationMarkerStyle(
            label,
            (scale) => circle.setAttribute("r", String(baseNum * scale)),
            (fill) => paintStationMarkerFill(circle, fill),
            () => paintStationMarkerNoData(circle),
          );
          return;
        }

        if (tag === "ellipse") {
          const ellipse = marker as SVGEllipseElement;
          let baseRx = ellipse.getAttribute(MAP_ELLIPSE_BASE_RX);
          let baseRy = ellipse.getAttribute(MAP_ELLIPSE_BASE_RY);
          if (!baseRx) {
            baseRx = ellipse.getAttribute("rx")?.trim() || "2";
            ellipse.setAttribute(MAP_ELLIPSE_BASE_RX, baseRx);
          }
          if (!baseRy) {
            baseRy = ellipse.getAttribute("ry")?.trim() || "2";
            ellipse.setAttribute(MAP_ELLIPSE_BASE_RY, baseRy);
          }
          const rxNum = parseFloat(baseRx) || 2;
          const ryNum = parseFloat(baseRy) || 2;
          applyStationMarkerStyle(
            label,
            (scale) => {
              ellipse.setAttribute("rx", String(rxNum * scale));
              ellipse.setAttribute("ry", String(ryNum * scale));
            },
            (fill) => paintStationMarkerFill(ellipse, fill),
            () => paintStationMarkerNoData(ellipse),
          );
        }
      });

      /** Подписи станций: обводка задаётся rect (.st1), не самим <text> */
      groups.forEach((group) => {
        const hasDirectText = Array.from(group.children).some(
          (ch) => ch.tagName.toLowerCase() === "text",
        );
        if (!hasDirectText) return;
        for (const ch of Array.from(group.children)) {
          if (ch.tagName.toLowerCase() === "rect") {
            (ch as SVGElement).style.setProperty("stroke", "none", "important");
            (ch as SVGElement).style.setProperty(
              "stroke-width",
              "0",
              "important",
            );
          }
        }
      });
    }, [svgMarkup, segmentDurationByName, stationDurationByName]);

    useImperativeHandle(ref, () => {
      const svg = containerRef.current?.querySelector("svg");
      if (svg) return svg as SVGSVGElement;
      return document.createElementNS("http://www.w3.org/2000/svg", "svg");
    });

    return (
      <div ref={containerRef} className="map-svg-root">
        <div
          className="map-svg-viewport"
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>
    );
  },
);

export default SvgMap;
