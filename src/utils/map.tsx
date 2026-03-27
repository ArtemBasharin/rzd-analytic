import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cutDecimals } from "./functions";

export type MapPlaceTooltipDetails = {
  placeLabel: string;
  totalDelayed: number;
  totalDuration: number;
  units: ReadonlyArray<{ name: string; delayed: number; duration: number }>;
};

type Props = {
  className?: string;
  segmentDurationByName?: Record<string, number>;
  stationDurationByName?: Record<string, number>;
  /** Агрегат по месту из отчёта станций (ключ — как в segment/station maps) */
  placeDetailsByName?: Record<string, MapPlaceTooltipDetails>;
};

const MAP_CIRCLE_BASE_R = "data-map-base-r";
const MAP_ELLIPSE_BASE_RX = "data-map-base-rx";
const MAP_ELLIPSE_BASE_RY = "data-map-base-ry";
const MAP_PATH_CX = "data-map-station-dot-cx";
const MAP_PATH_CY = "data-map-station-dot-cy";
const MAP_OPEN_LINE_D_ORIG = "data-map-open-line-d-orig";
const MAP_TOOLTIP_HIT = "data-map-tooltip-hit";
const MAP_PLACE_KEY = "data-map-place-key";

/**
 * round-cap удлиняет штрих на stroke/2 с каждого конца; укорачиваем M…L… на эту величину
 * (как в Visio: один сегмент), чтобы внешние концы остались на месте.
 */
function applySegmentOpenLineStrokeGeometry(
  path: SVGPathElement,
  strokeWidth: number,
): void {
  if (!path.getAttribute(MAP_OPEN_LINE_D_ORIG)) {
    path.setAttribute(
      MAP_OPEN_LINE_D_ORIG,
      path.getAttribute("d")?.replace(/\s+/g, " ").trim() ?? "",
    );
  }
  const dOrig = path.getAttribute(MAP_OPEN_LINE_D_ORIG) ?? "";
  const m = dOrig.match(
    /^M\s*([\d.-]+)\s+([\d.-]+)\s+L\s*([\d.-]+)\s+([\d.-]+)\s*$/i,
  );
  if (!m) {
    path.setAttribute("d", dOrig);
    path.style.strokeLinecap = "butt";
    path.style.strokeLinejoin = "miter";
    return;
  }
  const sx = parseFloat(m[1]);
  const sy = parseFloat(m[2]);
  const ex = parseFloat(m[3]);
  const ey = parseFloat(m[4]);
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    path.setAttribute("d", dOrig);
    path.style.strokeLinecap = "butt";
    path.style.strokeLinejoin = "miter";
    return;
  }
  const trim = Math.min(strokeWidth / 2, len / 2 - 1e-4);
  if (trim <= 0) {
    path.setAttribute("d", dOrig);
    path.style.strokeLinecap = "butt";
    path.style.strokeLinejoin = "miter";
    return;
  }
  const ux = dx / len;
  const uy = dy / len;
  const nx1 = sx + ux * trim;
  const ny1 = sy + uy * trim;
  const nx2 = ex - ux * trim;
  const ny2 = ey - uy * trim;
  const fmt = (n: number) => String(+n.toFixed(5));
  path.setAttribute("d", `M${fmt(nx1)} ${fmt(ny1)} L${fmt(nx2)} ${fmt(ny2)}`);
  path.style.strokeLinecap = "round";
  path.style.strokeLinejoin = "round";
}

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

/** Visio вставляет <title>Лист.NNN</title> — иначе браузер показывает второй (нативный) тултип */
function removeVisioSvgTitles(svgRoot: SVGSVGElement) {
  svgRoot.querySelectorAll("title").forEach((n) => n.remove());
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

/** Нормализация в [0,1] по log1p(min)…log1p(max), чтобы большой разброс по модулю слабее отражался в толщине/цвете */
function valueToVisualRatio(value: number, minV: number, maxV: number): number {
  if (!Number.isFinite(value) || maxV <= 0) return 0;
  const v = Math.max(0, value);
  const lo = (x: number) => Math.log1p(Math.max(0, x));
  const tMin = lo(minV);
  const tMax = lo(maxV);
  const denom = tMax - tMin;
  if (denom <= 1e-15) {
    return v >= maxV ? 1 : 0;
  }
  const ratio = (lo(v) - tMin) / denom;
  return Math.max(0, Math.min(1, ratio));
}

function nonNegativeNumericValues(record: Record<string, number>): number[] {
  return Object.values(record).filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0,
  );
}

function normalizeMapName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function resolveRecordKey(
  name: string,
  record: Record<string, number>,
): string | undefined {
  if (Object.prototype.hasOwnProperty.call(record, name)) return name;
  const normalizedTarget = normalizeMapName(name);
  const foundKey = Object.keys(record).find(
    (key) => normalizeMapName(key) === normalizedTarget,
  );
  return foundKey;
}

function fmtTooltipNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const rounded = cutDecimals(n);
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
    return String(Math.round(rounded));
  }
  return String(rounded);
}

const MAP_TOOLTIP_GAP = 10;
const MAP_TOOLTIP_VIEW_PAD = 8;
/** Сдвиг тултипа выше относительно прежней вертикали (px) */
const MAP_TOOLTIP_RAISE = 60;
/** Дополнительный сдвиг тултипа левее от указателя (px) */
const MAP_TOOLTIP_SHIFT_LEFT = 15;
const MAP_TOOLTIP_SHOW_DELAY_MS = 500;
const MAP_TOOLTIP_HIDE_DELAY_MS = 300;

/** По умолчанию — ниже и левее курсора на GAP; у краёв экрана — выше и/или правее */
function computeMapTooltipPosition(
  cx: number,
  cy: number,
  tw: number,
  th: number,
  vw: number,
  vh: number,
): { left: number; top: number } {
  const gap = MAP_TOOLTIP_GAP;
  const pad = MAP_TOOLTIP_VIEW_PAD;
  const raise = MAP_TOOLTIP_RAISE;
  const thEff = Math.max(th, 1);
  const twEff = Math.max(tw, 1);

  const hx = MAP_TOOLTIP_SHIFT_LEFT;
  let left = cx - twEff - gap - hx;
  if (left < pad) {
    left = cx + gap - hx;
  }
  if (left + twEff > vw - pad) {
    left = Math.max(pad, vw - pad - twEff);
  }

  // Ниже курсора (raise — сдвиг вверх только для этого варианта)
  let top = cy + gap - raise;
  if (top + thEff > vh - pad) {
    // Не помещается снизу — над указателем, нижний край у cy - gap (без raise)
    top = cy - thEff - gap;
  }
  if (top + thEff > vh - pad) {
    top = vh - pad - thEff;
  }
  if (top < pad) {
    top = pad;
  }
  return { left, top };
}

function formatMapTooltipLines(d: MapPlaceTooltipDetails): string[] {
  const lines = [
    `Задержки поездов (всего): ${fmtTooltipNumber(d.totalDelayed)}`,
    `Время по вине (всего): ${fmtTooltipNumber(d.totalDuration)} ч`,
  ];
  if (d.units.length > 0) {
    lines.push("По подразделениям:");
    const maxUnits = 14;
    d.units.slice(0, maxUnits).forEach((u) => {
      lines.push(
        `  ${u.name}: задержки ${fmtTooltipNumber(u.delayed)}, время ${fmtTooltipNumber(u.duration)} ч`,
      );
    });
    if (d.units.length > maxUnits) {
      lines.push(`  … ещё ${d.units.length - maxUnits}`);
    }
  }
  return lines;
}

const SvgMap = React.forwardRef<SVGSVGElement, Props>(
  (
    {
      className,
      segmentDurationByName = {},
      stationDurationByName = {},
      placeDetailsByName = {},
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const [svgMarkup, setSvgMarkup] = useState("");
    const [mapTooltip, setMapTooltip] = useState<{
      x: number;
      y: number;
      title: string;
      lines: string[];
    } | null>(null);
    const [mapTooltipPos, setMapTooltipPos] = useState({ left: 0, top: 0 });

    useLayoutEffect(() => {
      if (!mapTooltip || !tooltipRef.current) return;
      const el = tooltipRef.current;
      const { width, height } = el.getBoundingClientRect();
      setMapTooltipPos(
        computeMapTooltipPosition(
          mapTooltip.x,
          mapTooltip.y,
          width,
          height,
          window.innerWidth,
          window.innerHeight,
        ),
      );
    }, [mapTooltip]);

    const parseEdgeName = (rawValue: string) => parseVt4Inner(rawValue);

    const resolveSegmentDuration = useCallback(
      (segmentName: string) => {
        const direct = segmentDurationByName[segmentName];
        if (typeof direct === "number") return direct;

        const key = resolveRecordKey(segmentName, segmentDurationByName);
        return key !== undefined ? segmentDurationByName[key] : undefined;
      },
      [segmentDurationByName],
    );

    const resolveStationDuration = useCallback(
      (stationName: string) => {
        const direct = stationDurationByName[stationName];
        if (typeof direct === "number") return direct;

        const key = resolveRecordKey(stationName, stationDurationByName);
        return key !== undefined ? stationDurationByName[key] : undefined;
      },
      [stationDurationByName],
    );

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
          removeVisioSvgTitles(svgEl);

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

      svgRoot
        .querySelectorAll(`[${MAP_TOOLTIP_HIT}]`)
        .forEach((n) => n.remove());
      svgRoot.querySelectorAll(`[${MAP_PLACE_KEY}]`).forEach((el) => {
        el.removeAttribute(MAP_PLACE_KEY);
        (el as SVGElement).style.removeProperty("cursor");
      });

      const edgesWithData: Array<{
        paths: SVGPathElement[];
        value: number;
        reportKey: string;
      }> = [];
      const groups = Array.from(svgRoot.querySelectorAll("g"));
      const minStrokeWidth = 1.3;
      const maxStrokeWidth = 7;
      const defaultGrayStroke = "#9ca3af";

      const segmentNums = nonNegativeNumericValues(segmentDurationByName);
      const maxSegmentValue = segmentNums.length ? Math.max(...segmentNums) : 0;
      const minSegmentValue = segmentNums.length ? Math.min(...segmentNums) : 0;

      const stationNums = nonNegativeNumericValues(stationDurationByName);
      const maxStationValue = stationNums.length ? Math.max(...stationNums) : 0;
      const minStationValue = stationNums.length ? Math.min(...stationNums) : 0;

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

      const applyGray = (paths: SVGPathElement[]) => {
        paths.forEach((pathEl) => {
          pathEl.style.stroke = defaultGrayStroke;
          pathEl.style.strokeWidth = `${minStrokeWidth}`;
          applySegmentOpenLineStrokeGeometry(pathEl, minStrokeWidth);
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

        const reportKey = resolveRecordKey(segmentName, segmentDurationByName);
        if (!reportKey) {
          applyGray(linePaths);
          return;
        }

        edgesWithData.push({ paths: linePaths, value, reportKey });
      });

      edgesWithData.forEach(({ paths, value, reportKey }) => {
        const segRatio = valueToVisualRatio(
          value,
          minSegmentValue,
          maxSegmentValue,
        );
        const lineStyle = heatStyleFromRatio(segRatio);
        const tip = placeDetailsByName[reportKey];

        paths.forEach((path) => {
          path.style.stroke = lineStyle.strokeColor;
          path.style.strokeWidth = `${lineStyle.strokeWidth}`;
          applySegmentOpenLineStrokeGeometry(path, lineStyle.strokeWidth);
          if (tip) {
            const hit = path.cloneNode(true) as SVGPathElement;
            hit.setAttribute(MAP_PLACE_KEY, reportKey);
            hit.setAttribute(MAP_TOOLTIP_HIT, "1");
            hit.style.stroke = "transparent";
            hit.style.fill = "none";
            hit.style.pointerEvents = "stroke";
            const w = Math.max(12, lineStyle.strokeWidth * 4);
            hit.style.strokeWidth = `${w}`;
            hit.style.cursor = "pointer";
            path.parentNode?.insertBefore(hit, path.nextSibling);
          }
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
        const ratio = valueToVisualRatio(v, minStationValue, maxStationValue);
        setGeom(stationDotScaleFromRatio(ratio));
        paintData(heatColorFromRatio(ratio));
      };

      const bindStationTooltipTarget = (el: SVGElement, label: string) => {
        const rk = resolveRecordKey(label, stationDurationByName);
        if (!rk || !placeDetailsByName[rk]) return;
        el.setAttribute(MAP_PLACE_KEY, rk);
        el.style.cursor = "pointer";
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
          bindStationTooltipTarget(dotPath, label);
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
          bindStationTooltipTarget(circle, label);
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
          bindStationTooltipTarget(ellipse, label);
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
    }, [
      svgMarkup,
      segmentDurationByName,
      stationDurationByName,
      placeDetailsByName,
      resolveSegmentDuration,
      resolveStationDuration,
    ]);

    useEffect(() => {
      const root = containerRef.current;
      if (!root) return;
      const svg = root.querySelector("svg");
      if (!svg) return;

      let showTimer: ReturnType<typeof setTimeout> | null = null;
      let hideTimer: ReturnType<typeof setTimeout> | null = null;
      let pending: {
        x: number;
        y: number;
        title: string;
        lines: string[];
      } | null = null;

      const clearShowTimer = () => {
        if (showTimer !== null) {
          clearTimeout(showTimer);
          showTimer = null;
        }
      };

      const clearHideTimer = () => {
        if (hideTimer !== null) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
      };

      const onOver = (e: PointerEvent) => {
        const el = (e.target as Element).closest(`[${MAP_PLACE_KEY}]`);
        if (!el || !svg.contains(el)) return;
        const key = el.getAttribute(MAP_PLACE_KEY);
        if (!key) return;
        const details = placeDetailsByName[key];
        if (!details) return;

        clearHideTimer();
        clearShowTimer();

        pending = {
          x: e.clientX,
          y: e.clientY,
          title: details.placeLabel,
          lines: formatMapTooltipLines(details),
        };

        showTimer = setTimeout(() => {
          showTimer = null;
          if (!pending) return;
          const p = pending;
          setMapTooltipPos(
            computeMapTooltipPosition(
              p.x,
              p.y,
              300,
              120,
              window.innerWidth,
              window.innerHeight,
            ),
          );
          setMapTooltip({
            x: p.x,
            y: p.y,
            title: p.title,
            lines: p.lines,
          });
        }, MAP_TOOLTIP_SHOW_DELAY_MS);
      };

      const onOut = (e: PointerEvent) => {
        const related = e.relatedTarget as Element | null;
        if (
          related &&
          svg.contains(related) &&
          related.closest(`[${MAP_PLACE_KEY}]`)
        ) {
          return;
        }

        clearShowTimer();
        pending = null;

        clearHideTimer();
        hideTimer = setTimeout(() => {
          hideTimer = null;
          setMapTooltip(null);
        }, MAP_TOOLTIP_HIDE_DELAY_MS);
      };

      const onMove = (e: PointerEvent) => {
        if (showTimer !== null && pending) {
          pending.x = e.clientX;
          pending.y = e.clientY;
        }
        setMapTooltip((prev) =>
          prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
        );
      };

      svg.addEventListener("pointerover", onOver);
      svg.addEventListener("pointerout", onOut);
      svg.addEventListener("pointermove", onMove);
      return () => {
        clearShowTimer();
        clearHideTimer();
        pending = null;
        svg.removeEventListener("pointerover", onOver);
        svg.removeEventListener("pointerout", onOut);
        svg.removeEventListener("pointermove", onMove);
        setMapTooltip(null);
      };
    }, [svgMarkup, placeDetailsByName]);

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
        {mapTooltip && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={tooltipRef}
                className="map-hover-tooltip"
                role="tooltip"
                style={{
                  position: "fixed",
                  left: mapTooltipPos.left,
                  top: mapTooltipPos.top,
                  zIndex: 10000,
                  pointerEvents: "none",
                }}
              >
                <div className="map-hover-tooltip__title">{mapTooltip.title}</div>
                {mapTooltip.lines.map((line, i) => (
                  <div key={i} className="map-hover-tooltip__line">
                    {line}
                  </div>
                ))}
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  },
);

export default SvgMap;
