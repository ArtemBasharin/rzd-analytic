import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import {
  AggregatedPoint,
  ChartSeriesMeta,
  ChartStyle,
  ChartType,
  defaultChartStyle,
} from "../../chart-builder/types";

const FONT = "Verdana, Geneva, sans-serif";
const GRID = "#D0D0D0";
const AXIS = "#1a1a1a";
const SHADOW_FILTER_ID = "builder-bar-shadow";

interface BuilderChartProps {
  data: AggregatedPoint[];
  series?: ChartSeriesMeta[];
  chartType: ChartType;
  valueLabel: string;
  categoryLabel: string;
  style?: ChartStyle;
}

const MARGIN = { top: 36, right: 28, bottom: 110, left: 64 };

function formatValue(n: number): string {
  if (Math.abs(n) >= 1000)
    return n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
  return String(n);
}

/** Fix mojibake ellipsis and normalize truncation marker. */
function cleanLabelText(text: string): string {
  return text
    .replace(/\u0432\u0402\u2026/g, "...") // "вЂ¦" mojibake
    .replace(/вЂ¦/g, "...")
    .replace(/\u2026/g, "...");
}

function seriesColor(style: ChartStyle, i: number): string {
  const colors = style.fillColors?.length
    ? style.fillColors
    : defaultChartStyle().fillColors;
  return colors[i % colors.length];
}

function pointValue(d: AggregatedPoint, seriesId: string): number {
  if (d.values && seriesId in d.values) return d.values[seriesId] ?? 0;
  return d.value;
}

function maxPointValue(data: AggregatedPoint[], series: ChartSeriesMeta[]): number {
  let m = 0;
  for (const d of data) {
    for (const s of series) {
      m = Math.max(m, pointValue(d, s.id));
    }
  }
  return m;
}

function tipHtml(
  d: AggregatedPoint,
  series: ChartSeriesMeta[],
  valueLabel: string,
): string {
  const rows = series
    .map(
      (s) =>
        `${s.label}: <strong>${formatValue(pointValue(d, s.id))}</strong>`,
    )
    .join("<br/>");
  return `<strong>${d.label}</strong><br/><span style="opacity:.85">${valueLabel}</span><br/>${rows}`;
}

function drawLegend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  series: ChartSeriesMeta[],
  style: ChartStyle,
  width: number,
) {
  if (series.length <= 1) return;
  const g = svg.append("g").attr("class", "builder-legend").attr("transform", `translate(${MARGIN.left}, 8)`);
  let x = 0;
  series.forEach((s, i) => {
    const item = g.append("g").attr("transform", `translate(${x}, 0)`);
    item
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .attr("fill", seriesColor(style, i));
    const t = item
      .append("text")
      .attr("x", 16)
      .attr("y", 10)
      .attr("font-family", FONT)
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("fill", AXIS)
      .text(s.label.length > 28 ? s.label.slice(0, 26) + "..." : s.label);
    x += 24 + (t.node()?.getComputedTextLength() || 80) + 14;
    if (x > width - MARGIN.right - 40) return;
  });
}

/** Vertical bar path with rounded top corners only. */
function barPathTopRounded(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  if (w <= 0 || h <= 0) return "";
  const radius = Math.max(0, Math.min(r, w / 2, h));
  if (radius <= 0) {
    return `M${x},${y}H${x + w}V${y + h}H${x}Z`;
  }
  return [
    `M${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `H${x + w - radius}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `V${y + h}`,
    `H${x}`,
    `Z`,
  ].join("");
}

/** Horizontal bar path with rounded right (end) corners only. */
function barPathEndRounded(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  if (w <= 0 || h <= 0) return "";
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  if (radius <= 0) {
    return `M${x},${y}H${x + w}V${y + h}H${x}Z`;
  }
  return [
    `M${x},${y}`,
    `H${x + w - radius}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `V${y + h - radius}`,
    `Q${x + w},${y + h} ${x + w - radius},${y + h}`,
    `H${x}`,
    `Z`,
  ].join("");
}

function ensureShadowFilter(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
) {
  let defs = svg.select<SVGDefsElement>("defs");
  if (defs.empty()) defs = svg.append("defs");
  if (!defs.select(`#${SHADOW_FILTER_ID}`).empty()) return;
  const filter = defs
    .append("filter")
    .attr("id", SHADOW_FILTER_ID)
    .attr("x", "-20%")
    .attr("y", "-20%")
    .attr("width", "140%")
    .attr("height", "140%");
  filter
    .append("feDropShadow")
    .attr("dx", 2)
    .attr("dy", 3)
    .attr("stdDeviation", 2.5)
    .attr("flood-color", "#000")
    .attr("flood-opacity", 0.28);
}

function paintBackground(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
) {
  svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#ffffff");
}

function styleAxisText(
  selection: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown>,
  size = "12px",
) {
  selection
    .attr("font-family", FONT)
    .attr("font-size", size)
    .attr("font-weight", "700")
    .attr("fill", AXIS);
}

/** Measure text width with the chart font (no mid-word / hyphen breaks). */
let measureCanvas: HTMLCanvasElement | null = null;

function measureTextWidth(text: string, fontSize = "12px"): number {
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return text.length * 8;
  ctx.font = `700 ${fontSize} ${FONT}`;
  return ctx.measureText(text).width;
}

const DASH_ONLY = /^[\-\u2013\u2014]$/;

const AXIS_LABEL_LINE_H = 13;
/** Gap between the horizontal axis line and the start of labels. */
const AXIS_LABEL_AXIS_GAP = 10;
/** Safety only — real limit comes from category step (no neighbor overlap). */
const AXIS_LABEL_HARD_MAX_LINES = 16;

/**
 * Prefer wrapping segment names at spaced hyphen ("A - B" -> "A -" / "B").
 * Long parts are still wrapped/truncated to maxWidth.
 */
function wrapSegmentLabel(
  label: string,
  maxWidth: number,
  fontSize = "12px",
  maxLines = 6,
): string[] {
  label = cleanLabelText(label);
  const spacedHyphen = /\s+[-\u2013\u2014]\s+/;
  if (spacedHyphen.test(label)) {
    const segments = label
      .split(spacedHyphen)
      .map((s) => s.trim())
      .filter(Boolean);
    const pieces = segments.map((seg, i) =>
      i < segments.length - 1 ? `${seg} -` : seg,
    );
    // Pack pieces into limited short lines
    const lines: string[] = [];
    let current = "";
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      // If a single piece is longer than maxWidth, wrap it by spaces first
      const pieceLines = wrapLabelBySpaces(piece, maxWidth, fontSize, maxLines);
      for (let p = 0; p < pieceLines.length; p++) {
        const part = pieceLines[p];
        const candidate = current ? `${current} ${part}` : part;
        if (!current || measureTextWidth(candidate, fontSize) <= maxWidth) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = part;
        }
        if (lines.length >= maxLines - 1 && p < pieceLines.length - 1) {
          // force remaining into last line with ellipsis via wrapLabelBySpaces logic
          const rest = [current, ...pieceLines.slice(p + 1)].join(" ");
          current =
            measureTextWidth(rest, fontSize) <= maxWidth
              ? rest
              : truncateToWidth(rest, maxWidth, fontSize);
          lines.push(current);
          return lines.slice(0, maxLines);
        }
      }
      if (lines.length >= maxLines) break;
    }
    if (current && lines.length < maxLines) lines.push(current);
    if (lines.length > maxLines) {
      const head = lines.slice(0, maxLines - 1);
      const last = truncateToWidth(lines.slice(maxLines - 1).join(" "), maxWidth, fontSize);
      return [...head, last];
    }
    return lines.length ? lines : [truncateToWidth(label, maxWidth, fontSize)];
  }
  return wrapLabelBySpaces(label, maxWidth, fontSize, maxLines);
}

function truncateToWidth(text: string, maxWidth: number, fontSize: string): string {
  const clean = cleanLabelText(text);
  if (measureTextWidth(clean, fontSize) <= maxWidth) return clean;
  const words = clean.split(/\s+/).filter(Boolean);
  let fitted = "";
  for (const w of words) {
    const next = fitted ? `${fitted} ${w}` : w;
    if (measureTextWidth(`${next}...`, fontSize) <= maxWidth) fitted = next;
    else break;
  }
  if (fitted) return `${fitted}...`;
  // Single long token: cut by characters
  let cut = clean;
  while (cut.length > 1 && measureTextWidth(`${cut}...`, fontSize) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}...`;
}

/**
 * Wrap at spaces. A hyphen surrounded by spaces (" - ") is a valid break point,
 * but the hyphen stays on the previous line with the preceding word.
 * Compounds without spaces are never split.
 */
function wrapLabelBySpaces(
  label: string,
  maxWidth: number,
  fontSize = "12px",
  maxLines = 6,
): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  const joinToken = (line: string, token: string) =>
    line ? `${line} ${token}` : token;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (DASH_ONLY.test(word) && current) {
      current = joinToken(current, word);
      continue;
    }

    const candidate = joinToken(current, word);
    if (!current || measureTextWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;

    if (lines.length >= maxLines - 1) {
      const rest = words.slice(i);
      let fitted = "";
      for (let j = 0; j < rest.length; j++) {
        const w = rest[j];
        if (DASH_ONLY.test(w) && fitted) {
          fitted = joinToken(fitted, w);
          continue;
        }
        const next = joinToken(fitted, w);
        const isLast = j === rest.length - 1;
        if (
          !fitted ||
          measureTextWidth(isLast ? next : `${next}...`, fontSize) <= maxWidth
        ) {
          fitted = next;
        } else {
          fitted = fitted ? `${fitted}...` : rest[0];
          break;
        }
      }
      current = fitted || rest[0];
      break;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [label];
}

/**
 * Place wrapped axis label inside the category corridor.
 * Tracks run right→left across the band; each line hangs from the axis
 * at -45° (readable, not upside-down).
 */
function setCorridorAxisLabel(
  tickG: SVGGElement,
  label: string,
  corridorWidth: number,
  fontSize = "11px",
  alongBudget?: number,
) {
  const layout = labelLayoutForCorridor(corridorWidth, fontSize, alongBudget);
  const lines = wrapSegmentLabel(
    cleanLabelText(label),
    layout.maxLineWidth,
    fontSize,
    layout.maxLines,
  );
  const tick = d3.select(tickG);
  tick.selectAll("text").remove();

  const n = Math.max(1, lines.length);
  const half = corridorWidth / 2;
  const edgePad = Math.min(half * 0.06, 4);
  const left = -half + edgePad;
  const right = half - edgePad;

  lines.forEach((line, i) => {
    // Left → right: first wrap line on the left edge of the corridor
    const t = n === 1 ? 0.5 : i / (n - 1);
    const xOff = left + t * (right - left);
    tick
      .append("text")
      .attr(
        "transform",
        `translate(${xOff},${AXIS_LABEL_AXIS_GAP}) rotate(-45)`,
      )
      .attr("text-anchor", "end")
      .attr("dx", "-0.1em")
      .attr("dy", "0.35em")
      .attr("font-family", FONT)
      .attr("font-size", fontSize)
      .attr("font-weight", "700")
      .attr("fill", AXIS)
      .text(line);
  });
}

/**
 * Corridor under a category: width = band (bar group) width.
 * Lines are separate -45° tracks anchored on the axis across that width.
 */
function labelLayoutForCorridor(
  corridorWidth: number,
  fontSize = "11px",
  alongBudget?: number,
): { maxLineWidth: number; maxLines: number } {
  // Horizontal spacing of axis anchors so baselines are ~1 line apart
  const trackSpacing = AXIS_LABEL_LINE_H * Math.SQRT2;
  const usable = Math.max(trackSpacing, corridorWidth - 4);
  let maxLines = Math.floor(usable / trackSpacing) + 1;
  maxLines = Math.max(1, Math.min(AXIS_LABEL_HARD_MAX_LINES, maxLines));

  // Along-corridor length; with extra bottom space allow longer lines
  const preferredW = measureTextWidth("Ж".repeat(12), fontSize);
  const fromHeight =
    alongBudget != null
      ? Math.max(48, alongBudget * Math.SQRT2 - 8)
      : preferredW;
  const maxLineWidth = Math.max(
    48,
    Math.min(alongBudget != null ? 220 : 130, Math.max(preferredW, fromHeight)),
  );

  return { maxLineWidth, maxLines };
}

function estimateLeftMargin(
  labels: string[],
  chartWidth: number,
  fontSize: string,
  corridorWidth: number,
  alongBudget?: number,
): number {
  const minL = 64;
  const maxL = Math.max(minL, Math.floor(chartWidth * 0.34));
  const layout = labelLayoutForCorridor(corridorWidth, fontSize, alongBudget);
  let needed = minL;
  for (const label of labels) {
    const lines = wrapSegmentLabel(
      label,
      layout.maxLineWidth,
      fontSize,
      layout.maxLines,
    );
    const longest = Math.max(
      0,
      ...lines.map((l) => measureTextWidth(l, fontSize)),
    );
    // Leftmost anchor ≈ tick - corridor/2; line extends √½ * length further left
    needed = Math.max(
      needed,
      Math.ceil(corridorWidth / 2 + longest * Math.SQRT1_2 + 14),
    );
  }
  return Math.min(maxL, needed);
}

/**
 * Adaptive bottom margin — grows with label length along the corridor.
 * Long labels get +70% extra height.
 */
function estimateBottomMargin(
  labels: string[],
  chartHeight: number,
  fontSize: string,
  corridorWidth: number,
  alongBudget?: number,
): number {
  const minMargin = 64;
  const layout = labelLayoutForCorridor(corridorWidth, fontSize, alongBudget);
  const pad = 12 + AXIS_LABEL_AXIS_GAP;

  let needed = minMargin;
  let longLabels = false;
  for (const label of labels) {
    const lines = wrapSegmentLabel(
      label,
      layout.maxLineWidth,
      fontSize,
      layout.maxLines,
    );
    if (lines.length > 1 || label.length > 36) longLabels = true;
    const longest = Math.max(
      0,
      ...lines.map((l) => measureTextWidth(l, fontSize)),
    );
    needed = Math.max(needed, Math.ceil(longest * Math.SQRT1_2 + pad));
  }

  if (longLabels) {
    needed = Math.ceil(needed * 1.7);
  }

  const maxMargin = Math.max(
    minMargin,
    Math.floor(chartHeight * (longLabels ? 0.85 : 0.72)),
  );
  return Math.min(maxMargin, Math.max(minMargin, needed));
}

function setMultilineLabel(
  textEl: SVGTextElement,
  label: string,
  maxWidth: number,
  options: {
    fontSize?: string;
    lineHeight?: number;
    anchor?: "start" | "middle" | "end";
    maxLines?: number;
    firstDy?: string;
  } = {},
) {
  const fontSize = options.fontSize ?? "12px";
  const lineHeight = options.lineHeight ?? 15;
  const anchor = options.anchor ?? "middle";
  const lines = wrapSegmentLabel(
    label,
    maxWidth,
    fontSize,
    options.maxLines ?? 3,
  );
  const sel = d3.select(textEl);
  const x = sel.attr("x") || "0";
  sel.text(null);
  sel
    .attr("text-anchor", anchor)
    .attr("font-family", FONT)
    .attr("font-size", fontSize)
    .attr("font-weight", "700")
    .attr("fill", AXIS);

  lines.forEach((line, i) => {
    const tspan = sel.append("tspan").attr("x", x).text(line);
    if (i === 0) {
      tspan.attr("dy", options.firstDy ?? "0.9em");
    } else {
      tspan.attr("dy", `${lineHeight}px`);
    }
  });
}

const BuilderChart: React.FC<BuilderChartProps> = ({
  data,
  series: seriesProp,
  chartType,
  valueLabel,
  categoryLabel,
  style: styleProp,
}) => {
  const style = styleProp ?? defaultChartStyle();
  const series: ChartSeriesMeta[] =
    seriesProp && seriesProp.length > 0
      ? seriesProp
      : [{ id: "current", label: "Текущий период" }];
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      setSize({
        width: container.clientWidth || 600,
        height: container.clientHeight || 400,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [data.length > 0]);

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl || !data.length) return;

    const { width, height } = size;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);
    paintBackground(svg, width, height);
    if (style.shadow) ensureShadowFilter(svg);
    drawLegend(svg, series, style, width);

    const tooltip = d3
      .select(container)
      .selectAll<HTMLDivElement, unknown>(".builder-chart-tooltip")
      .data([null])
      .join("div")
      .attr("class", "builder-chart-tooltip")
      .style("opacity", "0");

    const showTip = (event: MouseEvent, d: AggregatedPoint) => {
      tooltip
        .style("opacity", "1")
        .html(tipHtml(d, series, valueLabel))
        .style("left", `${event.offsetX + 12}px`)
        .style("top", `${event.offsetY + 12}px`);
    };
    const hideTip = () => tooltip.style("opacity", "0");

    if (chartType === "pie") {
      drawPie(svg, data, width, height, showTip, hideTip, style);
      return;
    }
    if (chartType === "hbar") {
      drawHBar(svg, data, width, height, showTip, hideTip, style, series);
      return;
    }
    if (chartType === "line") {
      drawLine(svg, data, width, height, showTip, hideTip, style, series);
      return;
    }
    drawBar(svg, data, width, height, showTip, hideTip, style, series);
  }, [data, series, chartType, valueLabel, categoryLabel, size, style]);

  if (!data.length) {
    return (
      <div className="builder-chart-empty" ref={containerRef}>
        <p>Выберите измерение (ось X) и показатель — график появится здесь</p>
      </div>
    );
  }

  return (
    <div className="builder-chart-wrap" ref={containerRef}>
      <svg ref={svgRef} role="img" aria-label="Превью диаграммы" />
    </div>
  );
};

function drawBar(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: AggregatedPoint[],
  width: number,
  height: number,
  showTip: (e: MouseEvent, d: AggregatedPoint) => void,
  hideTip: () => void,
  style: ChartStyle,
  series: ChartSeriesMeta[],
) {
  const labelFont = "11px";
  const topPad = series.length > 1 ? 28 : 0;
  const labels = data.map((d) => d.label);

  // Refine left/bottom so layout matches the final category band width
  let left = MARGIN.left;
  let bottom = MARGIN.bottom;
  let corridorW = 80;
  for (let pass = 0; pass < 2; pass++) {
    const inner = Math.max(80, width - left - MARGIN.right);
    // Approximate band width with same padding as the scale below
    corridorW = (inner / Math.max(data.length, 1)) * (1 - 0.28);
    const along = Math.max(40, bottom - AXIS_LABEL_AXIS_GAP);
    left = estimateLeftMargin(labels, width, labelFont, corridorW, along);
    bottom = estimateBottomMargin(labels, height, labelFont, corridorW, along);
  }
  const margin = {
    ...MARGIN,
    left,
    top: MARGIN.top + topPad,
    bottom,
  };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x0 = d3
    .scaleBand()
    .domain(labels)
    .range([0, innerW])
    .padding(0.28);

  const x1 = d3
    .scaleBand()
    .domain(series.map((s) => s.id))
    .range([0, x0.bandwidth()])
    .padding(0.12);

  const yMax = maxPointValue(data, series) || 0;
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

  if (style.showGrid) {
    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickSize(-innerW)
          .tickFormat(() => ""),
      )
      .call((sel) => sel.select(".domain").remove())
      .selectAll("line")
      .attr("stroke", GRID)
      .attr("stroke-width", 1);
  }

  const xAxis = g
    .append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x0).tickSize(0));
  xAxis.select(".domain").attr("stroke", AXIS).attr("stroke-width", 2);
  xAxis.selectAll(".tick").each(function (d) {
    setCorridorAxisLabel(
      this as SVGGElement,
      String(d),
      x0.bandwidth(),
      labelFont,
      Math.max(40, bottom - AXIS_LABEL_AXIS_GAP),
    );
  });

  if (style.showYAxis) {
    const yAxis = g.append("g").call(d3.axisLeft(y).ticks(6).tickSize(0));
    yAxis.select(".domain").attr("stroke", AXIS).attr("stroke-width", 2);
    styleAxisText(yAxis.selectAll("text"), "12px");
  }

  const groups = g
    .selectAll(".bar-group")
    .data(data)
    .join("g")
    .attr("class", "bar-group")
    .attr("transform", (d) => `translate(${x0(d.label)},0)`);

  series.forEach((s, si) => {
    const bw = x1.bandwidth();
    const rx = style.rounded ? Math.min(5, bw / 4) : 0;
    groups
      .append("path")
      .attr("class", "bar")
      .attr("d", (d) => {
        const v = pointValue(d, s.id);
        const bx = x1(s.id)!;
        const by = y(v);
        const bh = Math.max(0, innerH - y(v));
        return barPathTopRounded(bx, by, bw, bh, rx);
      })
      .attr("fill", seriesColor(style, si))
      .attr("stroke", style.strokeWidth > 0 ? style.strokeColor : "none")
      .attr("stroke-width", style.strokeWidth)
      .attr("filter", style.shadow ? `url(#${SHADOW_FILTER_ID})` : "none")
      .on("mousemove", function (event, d) {
        showTip(event as MouseEvent, d);
      })
      .on("mouseleave", hideTip);

    if (series.length === 1) {
      groups
        .append("text")
        .attr("class", "bar-value-label")
        .attr("x", x1(s.id)! + bw / 2)
        .attr("y", (d) => y(pointValue(d, s.id)) - 8)
        .attr("text-anchor", "middle")
        .attr("font-family", FONT)
        .attr("font-size", "14px")
        .attr("font-weight", "700")
        .attr("fill", AXIS)
        .text((d) => formatValue(pointValue(d, s.id)));
    }
  });
}

function drawHBar(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: AggregatedPoint[],
  width: number,
  height: number,
  showTip: (e: MouseEvent, d: AggregatedPoint) => void,
  hideTip: () => void,
  style: ChartStyle,
  series: ChartSeriesMeta[],
) {
  const left = 160;
  const topPad = series.length > 1 ? 24 : 0;
  const margin = { top: 20 + topPad, right: 48, bottom: 36, left };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const y0 = d3
    .scaleBand()
    .domain(data.map((d) => d.label))
    .range([0, innerH])
    .padding(0.35);

  const y1 = d3
    .scaleBand()
    .domain(series.map((s) => s.id))
    .range([0, y0.bandwidth()])
    .padding(0.1);

  const x = d3
    .scaleLinear()
    .domain([0, maxPointValue(data, series) || 0])
    .nice()
    .range([0, innerW]);

  if (style.showGrid) {
    g.append("g")
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickSize(innerH)
          .tickFormat(() => ""),
      )
      .call((sel) => sel.select(".domain").remove())
      .selectAll("line")
      .attr("stroke", GRID)
      .attr("stroke-width", 1);
  }

  const xAxis = g
    .append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(5).tickSize(0));
  xAxis.select(".domain").attr("stroke", AXIS).attr("stroke-width", 2);
  styleAxisText(xAxis.selectAll("text"), "12px");

  if (style.showYAxis) {
    const yAxis = g.append("g").call(d3.axisLeft(y0).tickSize(0));
    yAxis.select(".domain").attr("stroke", AXIS).attr("stroke-width", 2);
    yAxis.selectAll("text").each(function (d) {
      const label = String(d);
      d3.select(this).attr("x", -8).attr("dy", null);
      setMultilineLabel(this as SVGTextElement, label, left - 16, {
        fontSize: "12px",
        lineHeight: 14,
        anchor: "end",
        maxLines: 3,
        firstDy: "0.35em",
      });
    });
  }

  const groups = g
    .selectAll(".bar-group")
    .data(data)
    .join("g")
    .attr("class", "bar-group")
    .attr("transform", (d) => `translate(0,${y0(d.label)})`);

  series.forEach((s, si) => {
    const bh = y1.bandwidth();
    const rx = style.rounded ? Math.min(5, bh / 2) : 0;
    groups
      .append("path")
      .attr("class", "bar")
      .attr("d", (d) => {
        const bw = Math.max(2, x(pointValue(d, s.id)));
        return barPathEndRounded(0, y1(s.id)!, bw, bh, rx);
      })
      .attr("fill", seriesColor(style, si))
      .attr("stroke", style.strokeWidth > 0 ? style.strokeColor : "none")
      .attr("stroke-width", style.strokeWidth)
      .attr("filter", style.shadow ? `url(#${SHADOW_FILTER_ID})` : "none")
      .on("mousemove", function (event, d) {
        showTip(event as MouseEvent, d);
      })
      .on("mouseleave", hideTip);
  });
}

function drawLine(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: AggregatedPoint[],
  width: number,
  height: number,
  showTip: (e: MouseEvent, d: AggregatedPoint) => void,
  hideTip: () => void,
  style: ChartStyle,
  series: ChartSeriesMeta[],
) {
  const labelFont = "11px";
  const topPad = series.length > 1 ? 28 : 0;
  const labels = data.map((d) => d.label);

  let left = MARGIN.left;
  let bottom = MARGIN.bottom;
  let corridorW = 80;
  for (let pass = 0; pass < 2; pass++) {
    const inner = Math.max(80, width - left - MARGIN.right);
    const stepApprox =
      data.length > 1 ? inner / Math.max(data.length - 1, 1) : inner;
    // Point scale has no band; use ~80% of step as the corridor
    corridorW = Math.max(40, stepApprox * 0.8);
    const along = Math.max(40, bottom - AXIS_LABEL_AXIS_GAP);
    left = estimateLeftMargin(labels, width, labelFont, corridorW, along);
    bottom = estimateBottomMargin(labels, height, labelFont, corridorW, along);
  }
  const margin = {
    ...MARGIN,
    left,
    top: MARGIN.top + topPad,
    bottom,
  };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scalePoint()
    .domain(labels)
    .range([0, innerW])
    .padding(0.5);

  const y = d3
    .scaleLinear()
    .domain([0, maxPointValue(data, series) || 0])
    .nice()
    .range([innerH, 0]);

  if (style.showGrid) {
    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickSize(-innerW)
          .tickFormat(() => ""),
      )
      .call((sel) => sel.select(".domain").remove())
      .selectAll("line")
      .attr("stroke", GRID)
      .attr("stroke-width", 1);
  }

  const xAxis = g
    .append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickSize(0));
  xAxis.select(".domain").attr("stroke", AXIS).attr("stroke-width", 2);
  const step =
    data.length > 1 ? innerW / Math.max(data.length - 1, 1) : innerW;
  const lineCorridor = Math.max(40, step * 0.8);
  xAxis.selectAll(".tick").each(function (d) {
    setCorridorAxisLabel(
      this as SVGGElement,
      String(d),
      lineCorridor,
      labelFont,
      Math.max(40, bottom - AXIS_LABEL_AXIS_GAP),
    );
  });

  if (style.showYAxis) {
    const yAxis = g.append("g").call(d3.axisLeft(y).ticks(6).tickSize(0));
    yAxis.select(".domain").attr("stroke", AXIS).attr("stroke-width", 2);
    styleAxisText(yAxis.selectAll("text"), "12px");
  }

  series.forEach((s, si) => {
    const line = d3
      .line<AggregatedPoint>()
      .x((d) => x(d.label)!)
      .y((d) => y(pointValue(d, s.id)));

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", seriesColor(style, si))
      .attr("stroke-width", Math.max(2, style.strokeWidth || 2.5))
      .attr("filter", style.shadow ? `url(#${SHADOW_FILTER_ID})` : "none")
      .attr("d", line);

    g.selectAll(`.point-${s.id}`)
      .data(data)
      .join("circle")
      .attr("class", `point-${s.id}`)
      .attr("cx", (d) => x(d.label)!)
      .attr("cy", (d) => y(pointValue(d, s.id)))
      .attr("r", 4)
      .attr("fill", seriesColor(style, si))
      .attr("stroke", style.strokeWidth > 0 ? style.strokeColor : "#fff")
      .attr("stroke-width", style.strokeWidth > 0 ? style.strokeWidth : 1.5)
      .on("mousemove", function (event, d) {
        showTip(event as MouseEvent, d);
      })
      .on("mouseleave", hideTip);
  });
}
function drawPie(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: AggregatedPoint[],
  width: number,
  height: number,
  showTip: (e: MouseEvent, d: AggregatedPoint) => void,
  hideTip: () => void,
  style: ChartStyle,
) {
  const legendW = Math.min(240, width * 0.35);
  const radius = Math.min(width - legendW, height) / 2 - 20;
  const cx = (width - legendW) / 2;
  const cy = height / 2;

  const pie = d3
    .pie<AggregatedPoint>()
    .value((d) => d.value)
    .sort(null);

  const arc = d3
    .arc<d3.PieArcDatum<AggregatedPoint>>()
    .innerRadius(0)
    .outerRadius(Math.max(radius, 10));

  const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  const color = d3
    .scaleOrdinal<string>()
    .domain(data.map((d) => d.label))
    .range(data.map((_d, i) => seriesColor(style, i)));

  g.selectAll("path")
    .data(pie(data))
    .join("path")
    .attr("d", arc)
    .attr("fill", (d) => color(d.data.label) as string)
    .attr("stroke", style.strokeWidth > 0 ? style.strokeColor : "#fff")
    .attr("stroke-width", style.strokeWidth > 0 ? style.strokeWidth : 2)
    .attr("filter", style.shadow ? `url(#${SHADOW_FILTER_ID})` : "none")
    .on("mousemove", function (event, d) {
      showTip(event as MouseEvent, d.data);
    })
    .on("mouseleave", hideTip);

  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - legendW + 8}, 28)`);

  const items = legend
    .selectAll("g")
    .data(data.slice(0, 12))
    .join("g")
    .attr("transform", (_d, i) => `translate(0, ${i * 22})`);

  items
    .append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("rx", style.rounded ? 3 : 0)
    .attr("fill", (d) => color(d.label) as string);

  items
    .append("text")
    .attr("x", 20)
    .attr("y", 11)
    .attr("font-family", FONT)
    .attr("font-size", "12px")
    .attr("font-weight", "700")
    .attr("fill", AXIS)
    .text((d) => {
      const name = d.label.length > 22 ? d.label.slice(0, 20) + "..." : d.label;
      return `${name}  ${formatValue(d.value)}`;
    });
}

export default BuilderChart;
