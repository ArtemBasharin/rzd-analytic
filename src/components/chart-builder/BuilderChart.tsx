import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { findPalette } from "../../chart-builder/palettes";
import {
  formatParetoPct,
  PARETO_THRESHOLD,
  paretoOf,
  paretoSeries,
  ParetoResult,
  ParetoStep,
} from "../../chart-builder/pareto";
import {
  AggregatedPoint,
  ChartSeriesMeta,
  ChartStyle,
  ChartType,
  IndicatorSummary,
  SeriesLayout,
  defaultChartStyle,
} from "../../chart-builder/types";

const FONT = "Verdana, Geneva, sans-serif";
const GRID = "#D0D0D0";
const AXIS = "#1a1a1a";
const PARETO_COLOR = "#800000";
const SHADOW_FILTER_ID = "builder-bar-shadow";

interface BuilderChartProps {
  data: AggregatedPoint[];
  series?: ChartSeriesMeta[];
  chartType: ChartType;
  valueLabel: string;
  categoryLabel: string;
  style?: ChartStyle;
  layout?: SeriesLayout;
  indicator?: IndicatorSummary | null;
  /** Shown when the chart has no points but the axes are already chosen. */
  emptyMessage?: string;
}

const MARGIN = { top: 36, right: 28, bottom: 110, left: 64 };
/** Horizontal step between right axes when several line measures are shown. */
const LINE_AXIS_STEP = 58;

function formatValue(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

/** Fix mojibake ellipsis and normalize truncation marker. */
function cleanLabelText(text: string): string {
  return text
    .replace(/\u0432\u0402\u2026/g, "...") // "вЂ¦" mojibake
    .replace(/вЂ¦/g, "...")
    .replace(/\u2026/g, "...");
}

function seriesColor(style: ChartStyle, i: number): string {
  const palette = findPalette(style.paletteId || "traffic").colors;
  const base = style.fillColors?.length ? style.fillColors : palette;
  if (i < base.length) return base[i];
  const used = new Set(base.map((c) => c.toLowerCase()));
  const extra = palette.filter((c) => !used.has(c.toLowerCase()));
  const pool = extra.length ? base.concat(extra) : base;
  return pool[i % pool.length];
}

function seriesFill(
  style: ChartStyle,
  series: ChartSeriesMeta & { colorIndex?: number },
  index: number,
): string {
  return seriesColor(style, series.colorIndex ?? index);
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
  suffix = "",
): string {
  const rows = series
    .map(
      (s) =>
        `${s.label}: <strong>${formatValue(pointValue(d, s.id))}${suffix}</strong>`,
    )
    .join("<br/>");
  return `<strong>${d.label}</strong><br/><span style="opacity:.85">${valueLabel}</span><br/>${rows}`;
}

function axisSeries(series: ChartSeriesMeta[], axis: "y" | "y2"): ChartSeriesMeta[] {
  return series.filter((s) => (s.axis ?? "y") === axis);
}

function stackExtent(data: AggregatedPoint[], series: ChartSeriesMeta[]): number {
  let max = 0;
  for (const d of data) {
    let sum = 0;
    for (const s of series) sum += Math.max(0, pointValue(d, s.id));
    max = Math.max(max, sum);
  }
  return max;
}

function drawLegend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  series: ChartSeriesMeta[],
  style: ChartStyle,
  width: number,
  hidden: ReadonlySet<string>,
  onToggle: (id: string) => void,
) {
  if (series.length <= 1) return;
  const g = svg.append("g").attr("class", "builder-legend").attr("transform", `translate(${MARGIN.left}, 8)`);
  let x = 0;
  series.forEach((s, i) => {
    const item = g.append("g").attr("transform", `translate(${x}, 0)`);
    item
      .style("cursor", "pointer")
      .style("opacity", hidden.has(s.id) ? 0.35 : 1)
      .on("click", () => onToggle(s.id));
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

/** One font size for every value label on a chart. */
const VALUE_LABEL_MAX_PX = 16;
const VALUE_LABEL_MIN_PX = 8;
const VALUE_LABEL_PAD = 2;

/**
 * Bar label text.
 * (0.1, 10) → at most two digits (1.08 → 1,1).
 * (0, 0.1) → 0,XX.
 */
function formatBarLabel(n: number): string {
  if (!Number.isFinite(n)) return "";
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a === 0) return "0";
  if (a < 0.1) {
    return (
      sign +
      a.toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  if (a < 10) {
    const rounded = Math.round(a * 10) / 10;
    if (rounded >= 10) return sign + "10";
    if (rounded === 0) return "0";
    return (
      sign +
      rounded.toLocaleString("ru-RU", {
        maximumFractionDigits: 1,
      })
    );
  }
  if (a >= 1000) {
    return sign + a.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
  }
  return sign + a.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function labelOnFill(fill: string): string {
  const hex = fill.replace("#", "");
  if (hex.length < 6) return "#fff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma < 165 ? "#fff" : AXIS;
}

interface BarLabelLayout {
  fontPx: number;
  vertical: boolean;
}

function maxLabelWidth(probe: SVGTextElement, labels: string[], fontPx: number): number {
  const text = d3.select(probe);
  text.attr("font-size", `${fontPx}px`).attr("transform", null).attr("dy", null);
  let max = 0;
  for (const label of labels) {
    text.text(label);
    max = Math.max(max, probe.getComputedTextLength());
  }
  return max;
}

/**
 * Shared size for the chart. Horizontal while every label fits in the bar
 * at >= 8px. If any label does not, the whole chart switches to vertical
 * and the font stays at least 8px.
 */
function resolveBarLabelLayout(
  probe: SVGTextElement,
  labels: string[],
  barWidth: number,
): BarLabelLayout {
  const available = Math.max(0, barWidth - VALUE_LABEL_PAD * 2);
  const atMin = maxLabelWidth(probe, labels, VALUE_LABEL_MIN_PX);
  if (atMin > available) {
    return { fontPx: verticalLabelFont(probe, barWidth), vertical: true };
  }

  let fontPx = VALUE_LABEL_MAX_PX;
  const atMax = maxLabelWidth(probe, labels, VALUE_LABEL_MAX_PX);
  if (atMax > available && atMax > 0) {
    fontPx = VALUE_LABEL_MAX_PX * (available / atMax);
  }
  fontPx = Math.min(VALUE_LABEL_MAX_PX, Math.max(VALUE_LABEL_MIN_PX, fontPx));
  const fitted = maxLabelWidth(probe, labels, fontPx);
  if (fitted > available && fitted > 0) {
    const next = fontPx * (available / fitted);
    if (next < VALUE_LABEL_MIN_PX) {
      return { fontPx: verticalLabelFont(probe, barWidth), vertical: true };
    }
    fontPx = next;
  }
  d3.select(probe).text("").attr("transform", null).attr("dy", null);
  return { fontPx, vertical: false };
}

/** Largest vertical size that stays inside the column, never under 8px. */
function verticalLabelFont(probe: SVGTextElement, barWidth: number): number {
  const text = d3.select(probe);
  text.attr("dy", "0.35em").attr("transform", "rotate(-90)").text("8");
  let size = Math.min(VALUE_LABEL_MAX_PX, Math.max(VALUE_LABEL_MIN_PX, barWidth - 1));
  text.attr("font-size", `${size}px`);
  const ctm = probe.getScreenCTM();
  const scale = ctm ? Math.hypot(ctm.a, ctm.b) || 1 : 1;
  const limit = Math.max(1, barWidth * scale);
  const painted = probe.getBoundingClientRect().width;
  if (painted > limit && painted > 0) {
    size = Math.max(VALUE_LABEL_MIN_PX, size * (limit / painted));
  }
  text.text("").attr("transform", null).attr("dy", null);
  return size;
}

function appendBarValueLabel(
  parent: d3.Selection<d3.BaseType, unknown, null, undefined>,
  label: string,
  cx: number,
  barTop: number,
  barHeight: number,
  fill: string,
  layout: BarLabelLayout,
) {
  if (!label) return;
  const text = parent
    .append("text")
    .attr("class", "bar-value-label")
    .attr("pointer-events", "none")
    .attr("font-family", FONT)
    .attr("font-weight", "700")
    .attr("font-size", `${layout.fontPx}px`)
    .attr("fill", AXIS)
    .text(label);

  const numeric = Number(label.replace(/\s/g, "").replace(",", "."));
  if (!layout.vertical || numeric === 0) {
    text.attr("text-anchor", "middle").attr("x", cx).attr("y", barTop - 4);
    return;
  }

  const len = text.node()?.getComputedTextLength() ?? 0;
  const aboveRoom = Math.max(0, barTop - 2);
  const inside = len + 2 > aboveRoom && barHeight - 6 >= len + 2;
  if (inside) {
    text
      .attr("fill", labelOnFill(fill))
      .attr("text-anchor", "end")
      .attr("dy", "0.35em")
      .attr("transform", `translate(${cx}, ${barTop + 4}) rotate(-90)`);
  } else {
    text
      .attr("text-anchor", "start")
      .attr("dy", "0.35em")
      .attr("transform", `translate(${cx}, ${barTop - 3}) rotate(-90)`);
  }
}

/** Keep the tallest bar low enough that its value label stays inside the plot. */
function ensureLabelHeadroom(
  y: d3.ScaleLinear<number, number>,
  dataMax: number,
  innerH: number,
  reservePx: number,
) {
  if (dataMax <= 0 || innerH <= reservePx + 8) return;
  if (y(dataMax) >= reservePx) return;
  const frac = 1 - reservePx / innerH;
  if (frac <= 0.05) return;
  const needed = dataMax / frac;
  if (needed > y.domain()[1]) y.domain([0, needed]);
}

/** Unit of a series. Missing keys stay separate so unmarked series keep their own scale. */
function scaleGroupKey(seriesItem: ChartSeriesMeta): string {
  return seriesItem.scaleKey ?? seriesItem.id;
}

/** Series of one unit share a scale. Periods of one measure stay together. */
function lineScaleGroups(series: ChartSeriesMeta[]): ChartSeriesMeta[][] {
  const groups: ChartSeriesMeta[][] = [];
  const index = new Map<string, number>();
  for (const seriesItem of series) {
    const key = scaleGroupKey(seriesItem);
    const at = index.get(key);
    if (at == null) {
      index.set(key, groups.length);
      groups.push([seriesItem]);
    } else {
      groups[at].push(seriesItem);
    }
  }
  return groups;
}

/** Scale for one measure. A zero series stays on the baseline instead of collapsing to NaN. */
function valueScale(
  data: AggregatedPoint[],
  series: ChartSeriesMeta[],
  innerH: number,
  labelRoom: number,
): d3.ScaleLinear<number, number> {
  const max = maxPointValue(data, series);
  const plotH = Math.max(0, innerH);
  const y = d3
    .scaleLinear()
    .domain([0, max > 0 ? max : 1])
    .nice()
    .range([plotH, 0]);
  if (max > 0 && labelRoom > 0) ensureLabelHeadroom(y, max, plotH, labelRoom);
  return y;
}

/** Keep the longest strip short enough that its value label stays inside the plot. */
function ensureHBarLabelRoom(
  x: d3.ScaleLinear<number, number>,
  dataMax: number,
  innerW: number,
  reservePx: number,
) {
  if (dataMax <= 0 || innerW <= reservePx + 8) return;
  if (innerW - x(dataMax) >= reservePx) return;
  const frac = 1 - reservePx / innerW;
  if (frac <= 0.05) return;
  const needed = dataMax / frac;
  if (needed > x.domain()[1]) x.domain([0, needed]);
}

/**
 * Shared size for strip value labels.
 * Fitted to the strip thickness and to the series step so neighbors do not collide.
 */
function hbarValueFont(barHeight: number, step: number): number {
  const bySlot = Math.floor(Math.max(0, step) * 0.72);
  const byBar = Math.floor(Math.max(0, barHeight - 1));
  const fitted = Math.min(VALUE_LABEL_MAX_PX, bySlot || VALUE_LABEL_MAX_PX, byBar || VALUE_LABEL_MAX_PX);
  return Math.min(VALUE_LABEL_MAX_PX, Math.max(VALUE_LABEL_MIN_PX, fitted));
}

function maxFormattedLabelWidth(labels: string[], fontPx: number): number {
  let max = 0;
  for (const label of labels) {
    max = Math.max(max, measureTextWidth(label, `${fontPx}px`));
  }
  return max;
}

const HBAR_LABEL_GAP = 4;
const LINE_POINT_R = 4;
const LINE_LABEL_GAP = 4;

function lineLabelFont(labels: string[], slotWidth: number): number {
  const available = Math.max(8, slotWidth);
  let fontPx = VALUE_LABEL_MAX_PX;
  const atMax = maxFormattedLabelWidth(labels, fontPx);
  if (atMax > available && atMax > 0) {
    fontPx = fontPx * (available / atMax);
  }
  fontPx = Math.min(VALUE_LABEL_MAX_PX, Math.max(VALUE_LABEL_MIN_PX, fontPx));
  const fitted = maxFormattedLabelWidth(labels, fontPx);
  if (fitted > available && fitted > 0) {
    fontPx = Math.max(VALUE_LABEL_MIN_PX, fontPx * (available / fitted));
  }
  return fontPx;
}

interface LabelBox {
  l: number;
  r: number;
  t: number;
  b: number;
}

function lineLabelBox(
  cx: number,
  baseline: number,
  w: number,
  fontPx: number,
): LabelBox {
  const padX = 3;
  return {
    l: cx - w / 2 - padX,
    r: cx + w / 2 + padX,
    t: baseline - fontPx * 0.95,
    b: baseline + fontPx * 0.4,
  };
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.r > b.l + 0.5 && a.l < b.r - 0.5 && a.b > b.t + 0.5 && a.t < b.b - 0.5;
}

interface ValueLabelItem {
  text: string;
  value: number;
  cx: number;
  /** Mark position. The label prefers to sit just above it. */
  cy: number;
  w: number;
  fontPx: number;
  className: string;
}

function valueLabelItems(
  data: AggregatedPoint[],
  series: ChartSeriesMeta[],
  x: (label: string) => number | undefined,
  y: (seriesId: string, value: number) => number,
  fontPx: number,
  className: string,
): ValueLabelItem[] {
  const items: ValueLabelItem[] = [];
  for (const s of series) {
    for (const d of data) {
      const value = pointValue(d, s.id);
      if (!value) continue;
      const text = formatBarLabel(value);
      if (!text || text === "0") continue;
      items.push({
        text,
        value,
        cx: x(d.label) ?? 0,
        cy: y(s.id, value),
        w: measureTextWidth(text, `${fontPx}px`),
        fontPx,
        className,
      });
    }
  }
  return items;
}

/** Larger values keep the spot above the mark. A smaller one steps downward until it is clear. */
function reserveDownwardBaseline(item: ValueLabelItem, occupied: LabelBox[]): number {
  const step = item.fontPx * 1.35 + 4;
  const overlapsAt = (baseline: number) => {
    const box = lineLabelBox(item.cx, baseline, item.w, item.fontPx);
    return occupied.some((taken) => boxesOverlap(box, taken));
  };
  const claim = (baseline: number) => {
    occupied.push(lineLabelBox(item.cx, baseline, item.w, item.fontPx));
    return baseline;
  };
  let baseline = item.cy - LINE_POINT_R - LINE_LABEL_GAP;
  for (let i = 0; i < 48; i++) {
    if (!overlapsAt(baseline)) return claim(baseline);
    baseline += step;
  }
  return claim(baseline);
}

function paintValueLabels(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  items: ValueLabelItem[],
  occupied: LabelBox[],
) {
  const ordered = [...items].sort((a, b) => b.value - a.value || a.cx - b.cx);
  for (const item of ordered) {
    const baseline = reserveDownwardBaseline(item, occupied);
    const text = g
      .append("text")
      .attr("class", item.className)
      .attr("pointer-events", "none")
      .attr("font-family", FONT)
      .attr("font-weight", "700")
      .attr("font-size", `${item.fontPx}px`)
      .attr("fill", AXIS)
      .attr("text-anchor", "middle")
      .attr("x", item.cx)
      .attr("y", baseline)
      .text(item.text);
    if (item.className === "line-value-label") {
      text
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 3)
        .attr("paint-order", "stroke")
        .attr("stroke-linejoin", "round");
    }
  }
}

function drawLineValueLabels(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: AggregatedPoint[],
  series: ChartSeriesMeta[],
  x: (label: string) => number | undefined,
  y: (seriesId: string, value: number) => number,
  fontPx: number,
  occupied: LabelBox[] = [],
) {
  paintValueLabels(
    g,
    valueLabelItems(data, series, x, y, fontPx, "line-value-label"),
    occupied,
  );
}

function appendHBarValueLabel(
  parent: d3.Selection<d3.BaseType, unknown, null, undefined>,
  label: string,
  barEnd: number,
  barY: number,
  barHeight: number,
  fontPx: number,
) {
  if (!label) return;
  parent
    .append("text")
    .attr("class", "bar-value-label")
    .attr("pointer-events", "none")
    .attr("font-family", FONT)
    .attr("font-weight", "700")
    .attr("font-size", `${fontPx}px`)
    .attr("fill", AXIS)
    .attr("text-anchor", "start")
    .attr("x", barEnd + HBAR_LABEL_GAP)
    .attr("y", barY + barHeight / 2)
    .attr("dy", "0.35em")
    .text(label);
}

const DASH_ONLY = /^[-\u2013\u2014]$/;

const AXIS_LABEL_LINE_H = 13;
/** Gap between the horizontal axis line and the start of labels. */
const AXIS_LABEL_AXIS_GAP = 10;
/** Horizontal spacing of -45° label tracks (= one line height along the strip normal). */
const AXIS_LABEL_TRACK_GAP = AXIS_LABEL_LINE_H * Math.SQRT2;
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
 * Lines are packed left→right with a fixed track step and centered in the
 * band, leaving a blank-line gap on each side so neighbors stay separated.
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
  // Reserve half a blank line on each edge → one empty line between neighbors
  const edgePad = Math.min(half * 0.45, AXIS_LABEL_TRACK_GAP / 2);
  const usableLeft = -half + edgePad;
  const usableRight = half - edgePad;
  const blockW = (n - 1) * AXIS_LABEL_TRACK_GAP;
  // Center the packed block; clamp into the usable corridor
  let startX = n === 1 ? 0 : -blockW / 2;
  if (n > 1) {
    startX = Math.max(usableLeft, Math.min(startX, usableRight - blockW));
  }

  lines.forEach((line, i) => {
    const xOff = n === 1 ? 0 : startX + i * AXIS_LABEL_TRACK_GAP;
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
 * Lines are separate -45° tracks; one blank-line gap reserved for neighbors.
 */
function labelLayoutForCorridor(
  corridorWidth: number,
  fontSize = "11px",
  alongBudget?: number,
): { maxLineWidth: number; maxLines: number } {
  // Usable width excludes one blank-line gap split across both edges
  const usable = Math.max(
    AXIS_LABEL_TRACK_GAP,
    corridorWidth - AXIS_LABEL_TRACK_GAP,
  );
  let maxLines = Math.floor(usable / AXIS_LABEL_TRACK_GAP) + 1;
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
 * Adaptive bottom margin — fits actual label extent along the corridor,
 * with a small pad (no large empty field below the text).
 */
function estimateBottomMargin(
  labels: string[],
  chartHeight: number,
  fontSize: string,
  corridorWidth: number,
  alongBudget?: number,
): number {
  const minMargin = 48;
  const layout = labelLayoutForCorridor(corridorWidth, fontSize, alongBudget);
  // Axis gap already offsets labels; keep a thin pad under the lowest glyph
  const pad = 6 + AXIS_LABEL_AXIS_GAP;

  let needed = minMargin;
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
    // -45° line of length L extends ~L/√2 below the axis
    needed = Math.max(needed, Math.ceil(longest * Math.SQRT1_2 + pad));
  }

  const maxMargin = Math.max(minMargin, Math.floor(chartHeight * 0.55));
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

function IndicatorView({ summary }: { summary: IndicatorSummary | null }) {
  if (!summary) {
    return (
      <div className="builder-chart-empty">
        <p>Добавьте показатель — число появится здесь</p>
      </div>
    );
  }
  const delta =
    summary.compareValue != null ? summary.value - summary.compareValue : null;
  const pct =
    delta != null && summary.compareValue
      ? (delta / summary.compareValue) * 100
      : null;
  const sign = delta != null && delta > 0 ? "+" : "";
  return (
    <div className="builder-indicator">
      <div className="builder-indicator-label">{summary.label}</div>
      <div className="builder-indicator-value">{formatValue(summary.value)}</div>
      {delta != null && (
        <div className="builder-indicator-delta">
          {sign}
          {formatValue(delta)}
          {pct != null && Number.isFinite(pct)
            ? ` (${pct > 0 ? "+" : ""}${pct.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%)`
            : ""}
          {summary.compareLabel ? ` · ${summary.compareLabel}` : ""}
        </div>
      )}
    </div>
  );
}

const BuilderChart: React.FC<BuilderChartProps> = ({
  data,
  series: seriesProp,
  chartType,
  valueLabel,
  categoryLabel,
  style: styleProp,
  layout = "grouped",
  indicator = null,
  emptyMessage,
}) => {
  const style = styleProp ?? defaultChartStyle();
  const showLabels = style.showLabels !== false;
  const series = useMemo<ChartSeriesMeta[]>(
    () =>
      seriesProp && seriesProp.length > 0
        ? seriesProp
        : [{ id: "current", label: "Текущий период" }],
    [seriesProp],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [hidden, setHidden] = useState<string[]>([]);
  const seriesKey = series.map((s) => s.id).join("\n");
  const hasData = data.length > 0;

  useEffect(() => {
    setHidden([]);
  }, [seriesKey, chartType]);

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
  }, [hasData]);

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl || !data.length || chartType === "indicator") return;

    const hiddenSet = new Set(hidden);
    const visible = series
      .map((s, colorIndex) => ({ ...s, colorIndex }))
      .filter((s) => !hiddenSet.has(s.id));
    const toggle = (id: string) => {
      setHidden((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    };

    const { width, height } = size;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);
    paintBackground(svg, width, height);
    if (style.shadow) ensureShadowFilter(svg);

    const tooltip = d3
      .select(container)
      .selectAll<HTMLDivElement, unknown>(".builder-chart-tooltip")
      .data([null])
      .join("div")
      .attr("class", "builder-chart-tooltip")
      .style("opacity", "0");

    const suffix =
      (chartType === "bar" || chartType === "hbar") && layout === "normalized"
        ? "%"
        : "";
    const pareto =
      chartType === "bar" && style.showPareto !== false
        ? paretoOf(data, paretoSeries(series, layout))
        : null;
    const showTip = (event: MouseEvent, d: AggregatedPoint) => {
      const hitIndex = pareto?.steps.findIndex((step) => step.label === d.label) ?? -1;
      const hit = hitIndex >= 0 ? pareto?.steps[hitIndex] : undefined;
      const extra =
        hit && pareto && pareto.total > 0
          ? `<br/>Накопление: <strong>${formatParetoPct(hit.cumulative)}%</strong>${
              hitIndex === pareto.hitIndex ? " · здесь ≥ 80%" : ""
            }`
          : "";
      tooltip
        .style("opacity", "1")
        .html(tipHtml(d, visible, valueLabel, suffix) + extra)
        .style("left", `${event.offsetX + 12}px`)
        .style("top", `${event.offsetY + 12}px`);
    };
    const hideTip = () => tooltip.style("opacity", "0");
    const markOpts = { layout, showLabels };

    if (chartType === "pie") {
      drawPie(svg, data, width, height, showTip, hideTip, style, showLabels, hiddenSet, toggle);
      return;
    }
    drawLegend(svg, series, style, width, hiddenSet, toggle);
    if (!visible.length) return;
    if (chartType === "hbar") {
      drawHBar(svg, data, width, height, showTip, hideTip, style, visible, markOpts);
      return;
    }
    const mixedMarks =
      (chartType === "bar" || chartType === "line") &&
      visible.some((s) => s.mark === "bar") &&
      visible.some((s) => s.mark === "line");
    if (chartType === "line" && !mixedMarks) {
      drawLine(svg, data, width, height, showTip, hideTip, style, visible, markOpts);
      return;
    }
    drawBar(svg, data, width, height, showTip, hideTip, style, visible, markOpts, pareto);
  }, [data, series, chartType, valueLabel, categoryLabel, size, style, layout, showLabels, hidden]);

  if (chartType === "indicator") {
    return <IndicatorView summary={indicator ?? null} />;
  }

  if (!data.length) {
    return (
      <div className="builder-chart-empty" ref={containerRef}>
        <p>
          {emptyMessage ??
            "Выберите измерение (ось X) и показатель — график появится здесь"}
        </p>
      </div>
    );
  }

  return (
    <div className="builder-chart-wrap" ref={containerRef}>
      <svg ref={svgRef} role="img" aria-label="Превью диаграммы" />
    </div>
  );
};

type PlotGroup = d3.Selection<SVGGElement, unknown, null, undefined>;

function drawParetoShade(
  g: PlotGroup,
  data: AggregatedPoint[],
  hitIndex: number,
  x0: d3.ScaleBand<string>,
  innerH: number,
) {
  const label = data[hitIndex]?.label;
  if (label == null) return;
  const x = x0(label) ?? 0;
  g.append("rect")
    .attr("class", "pareto-zone")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", Math.max(0, x + x0.bandwidth()))
    .attr("height", innerH)
    .attr("fill", "rgba(128, 0, 0, 0.08)")
    .attr("pointer-events", "none");
}

function drawParetoOverlay(
  g: PlotGroup,
  pareto: ParetoResult,
  x0: d3.ScaleBand<string>,
  innerW: number,
  innerH: number,
  showPercentAxis: boolean,
  showScaleHint: boolean,
  /** Horizontal center of the rightmost bar inside a category band. */
  barCenter: number,
) {
  const yP = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);
  const xMid = (label: string) => (x0(label) ?? 0) + barCenter;
  const y80 = yP(PARETO_THRESHOLD);
  const hit = pareto.steps[pareto.hitIndex];
  const layer = g.append("g").attr("class", "pareto-layer").attr("pointer-events", "none");

  const line = d3
    .line<ParetoStep>()
    .x((d) => xMid(d.label))
    .y((d) => yP(d.cumulative));

  if (pareto.steps.length >= 2) {
    layer
      .append("path")
      .datum(pareto.steps)
      .attr("fill", "none")
      .attr("stroke", "#fff")
      .attr("stroke-width", 5)
      .attr("stroke-linejoin", "round")
      .attr("d", line);
    layer
      .append("path")
      .datum(pareto.steps)
      .attr("fill", "none")
      .attr("stroke", PARETO_COLOR)
      .attr("stroke-width", 2.25)
      .attr("stroke-linejoin", "round")
      .attr("d", line);
  }

  layer
    .append("line")
    .attr("class", "pareto-threshold")
    .attr("x1", 0)
    .attr("x2", innerW)
    .attr("y1", y80)
    .attr("y2", y80)
    .attr("stroke", PARETO_COLOR)
    .attr("stroke-opacity", 0.75)
    .attr("stroke-width", 1.25)
    .attr("stroke-dasharray", "6 4");

  layer
    .append("text")
    .attr("class", "pareto-threshold-label")
    .attr("x", innerW - 8)
    .attr("y", y80 < 16 ? y80 + 14 : y80 - 6)
    .attr("text-anchor", "end")
    .attr("font-family", FONT)
    .attr("font-size", "11px")
    .attr("font-weight", "700")
    .attr("fill", PARETO_COLOR)
    .attr("stroke", "#fff")
    .attr("stroke-width", 3)
    .attr("paint-order", "stroke")
    .text("порог 80%");

  const xEnd = (x0(hit.label) ?? 0) + x0.bandwidth();
  layer
    .append("line")
    .attr("class", "pareto-cutoff")
    .attr("x1", xEnd)
    .attr("x2", xEnd)
    .attr("y1", 0)
    .attr("y2", innerH)
    .attr("stroke", PARETO_COLOR)
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4 3");

  if (pareto.hitIndex > 0) {
    const prev = pareto.steps[pareto.hitIndex - 1];
    const span = hit.cumulative - prev.cumulative;
    const t = span <= 1e-6 ? 1 : (PARETO_THRESHOLD - prev.cumulative) / span;
    const clamped = Math.max(0, Math.min(1, t));
    const crossX = xMid(prev.label) + (xMid(hit.label) - xMid(prev.label)) * clamped;
    const r = 5.5;
    layer
      .append("path")
      .attr("class", "pareto-cross")
      .attr(
        "d",
        `M${crossX},${y80 - r} L${crossX + r},${y80} L${crossX},${y80 + r} L${crossX - r},${y80} Z`,
      )
      .attr("fill", "#fff")
      .attr("stroke", PARETO_COLOR)
      .attr("stroke-width", 2);
  }

  layer
    .selectAll("circle.pareto-dot")
    .data(pareto.steps)
    .join("circle")
    .attr("class", "pareto-dot")
    .attr("cx", (d) => xMid(d.label))
    .attr("cy", (d) => yP(d.cumulative))
    .attr("r", (_d, i) => (i === pareto.hitIndex ? 6 : 3.5))
    .attr("fill", (_d, i) => (i === pareto.hitIndex ? PARETO_COLOR : "#fff"))
    .attr("stroke", PARETO_COLOR)
    .attr("stroke-width", 2);

  if (pareto.steps.length <= 12) {
    pareto.steps.forEach((step, index) => {
      if (index === pareto.hitIndex) return;
      const x = xMid(step.label);
      const y = yP(step.cumulative);
      layer
        .append("text")
        .attr("x", x)
        .attr("y", y > 16 ? y - 8 : y + 14)
        .attr("text-anchor", "middle")
        .attr("font-family", FONT)
        .attr("font-size", "10px")
        .attr("font-weight", "700")
        .attr("fill", PARETO_COLOR)
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("paint-order", "stroke")
        .text(`${formatParetoPct(step.cumulative)}%`);
    });
  }

  if (showPercentAxis) {
    const axis = layer
      .append("g")
      .attr("class", "pareto-axis")
      .attr("transform", `translate(${innerW},0)`)
      .call(
        d3
          .axisRight(yP)
          .tickValues([0, 20, 40, 60, 80, 100])
          .tickFormat((d) => `${d}%`)
          .tickSize(0),
      );
    axis.select(".domain").attr("stroke", PARETO_COLOR).attr("stroke-opacity", 0.45);
    axis
      .selectAll("text")
      .attr("font-family", FONT)
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("fill", PARETO_COLOR);
    axis
      .selectAll(".tick")
      .filter((d) => Number(d) === PARETO_THRESHOLD)
      .select("text")
      .attr("font-weight", "900")
      .attr("font-size", "12px");
    layer
      .append("text")
      .attr("x", innerW)
      .attr("y", -8)
      .attr("text-anchor", "end")
      .attr("font-family", FONT)
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("fill", PARETO_COLOR)
      .text("накопление");
  } else if (showScaleHint) {
    layer
      .append("text")
      .attr("x", innerW - 4)
      .attr("y", 14)
      .attr("text-anchor", "end")
      .attr("font-family", FONT)
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("fill", PARETO_COLOR)
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke")
      .text("накопление, %");
  }
}

function drawValueLines(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: AggregatedPoint[],
  lineSeries: Array<ChartSeriesMeta & { colorIndex?: number }>,
  yFor: (seriesId: string) => d3.ScaleLinear<number, number>,
  xMid: (label: string) => number,
  style: ChartStyle,
  showTip: (e: MouseEvent, d: AggregatedPoint) => void,
  hideTip: () => void,
  showLabels: boolean,
  step: number,
  classPrefix: string,
  labelOut?: ValueLabelItem[],
) {
  lineSeries.forEach((s, si) => {
    const yScale = yFor(s.id);
    const color = seriesFill(style, s, si);
    const line = d3
      .line<AggregatedPoint>()
      .x((d) => xMid(d.label))
      .y((d) => yScale(pointValue(d, s.id)))
      .defined((d) => Number.isFinite(pointValue(d, s.id)));
    const width = Math.max(2.5, style.strokeWidth || 2.5);
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#fff")
      .attr("stroke-width", width + 3)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", line);
    g.append("path")
      .datum(data)
      .attr("class", "series-line")
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", width)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", line);
    g.selectAll(`.${classPrefix}-${si}`)
      .data(data)
      .join("circle")
      .attr("cx", (d) => xMid(d.label))
      .attr("cy", (d) => yScale(pointValue(d, s.id)))
      .attr("r", 5)
      .attr("fill", color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mousemove", function (event, d) {
        showTip(event as MouseEvent, d);
      })
      .on("mouseleave", hideTip);
  });
  if (!showLabels || !lineSeries.length) return;
  const fontPx = lineLabelFont(
    data.flatMap((d) => lineSeries.map((s) => formatBarLabel(pointValue(d, s.id)))),
    Math.max(16, step - 6),
  );
  const items = valueLabelItems(
    data,
    lineSeries,
    xMid,
    (seriesId, value) => yFor(seriesId)(value),
    fontPx,
    "line-value-label",
  );
  if (labelOut) {
    labelOut.push(...items);
    return;
  }
  paintValueLabels(g, items, []);
}

function drawBar(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: AggregatedPoint[],
  width: number,
  height: number,
  showTip: (e: MouseEvent, d: AggregatedPoint) => void,
  hideTip: () => void,
  style: ChartStyle,
  series: ChartSeriesMeta[],
  opts: { layout: SeriesLayout; showLabels: boolean },
  pareto: ParetoResult | null,
) {
  const explicitCombo =
    series.some((s) => s.mark === "bar") && series.some((s) => s.mark === "line");
  const ySeries = explicitCombo
    ? series.filter((s) => s.mark === "bar")
    : axisSeries(series, "y");
  const lineSeries = explicitCombo
    ? series.filter((s) => s.mark === "line")
    : axisSeries(series, "y2");
  const stacked =
    !explicitCombo && (opts.layout === "stacked" || opts.layout === "normalized");
  const normalized = !explicitCombo && opts.layout === "normalized";
  const primaryKey = ySeries[0] ? scaleGroupKey(ySeries[0]) : "";
  // Same unit as the columns: one scale, no extra axis for the line or the bars.
  const sharedLines = normalized
    ? []
    : lineSeries.filter((s) => primaryKey !== "" && scaleGroupKey(s) === primaryKey);
  const y2Series = lineSeries.filter((s) => !sharedLines.includes(s));
  const splitRightAxes =
    explicitCombo || y2Series.some((s) => s.scaleKey != null);
  const paretoActive = !!pareto && pareto.total > 0 && pareto.hitIndex >= 0;
  const paretoAxis =
    paretoActive &&
    y2Series.length === 0 &&
    sharedLines.length === 0 &&
    style.showYAxis;
  const lineGroups = splitRightAxes ? lineScaleGroups(y2Series) : [];
  const right = y2Series.length
    ? style.showYAxis
      ? splitRightAxes
        ? 18 + Math.max(lineGroups.length, 1) * LINE_AXIS_STEP
        : 72
      : MARGIN.right
    : paretoAxis
      ? 64
      : MARGIN.right;
  const labelFont = "11px";
  const topPad = series.length > 1 ? 28 : 0;
  const labels = data.map((d) => d.label);
  const barSeries = ySeries;

  // Refine left/bottom so layout matches the final category step (full slot)
  let left = MARGIN.left;
  let bottom = MARGIN.bottom;
  let corridorW = 80;
  for (let pass = 0; pass < 2; pass++) {
    const inner = Math.max(80, width - left - right);
    // Full category step — includes padding used as neighbor blank-line gap
    corridorW = inner / Math.max(data.length, 1);
    const along = Math.max(40, bottom - AXIS_LABEL_AXIS_GAP);
    left = estimateLeftMargin(labels, width, labelFont, corridorW, along);
    bottom = estimateBottomMargin(labels, height, labelFont, corridorW, along);
  }
  const margin = {
    ...MARGIN,
    left,
    right,
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
    .domain((stacked ? ["stack"] : barSeries.map((s) => s.id)))
    .range([0, x0.bandwidth()])
    .padding(stacked ? 0 : 0.12);

  const yMax = normalized
    ? 100
    : stacked
      ? Math.max(stackExtent(data, barSeries) || 0, maxPointValue(data, sharedLines) || 0)
      : maxPointValue(data, barSeries.concat(sharedLines)) || 0;
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);
  if (normalized) y.domain([0, 100]);
  if (opts.showLabels && !stacked) {
    ensureLabelHeadroom(
      y,
      yMax,
      innerH,
      VALUE_LABEL_MAX_PX + 6,
    );
  }

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
      x0.step(),
      labelFont,
      Math.max(40, bottom - AXIS_LABEL_AXIS_GAP),
    );
  });
  if (paretoActive && pareto) {
    const hitLabel = data[pareto.hitIndex]?.label;
    xAxis
      .selectAll(".tick")
      .filter((d) => d === hitLabel)
      .selectAll("text")
      .attr("fill", PARETO_COLOR);
  }

  if (style.showYAxis) {
    const yAxis = g.append("g").call(
      d3
        .axisLeft(y)
        .ticks(6)
        .tickSize(0)
        .tickFormat((d) => (normalized ? `${d}%` : formatValue(Number(d)))),
    );
    yAxis.select(".domain").attr("stroke", AXIS).attr("stroke-width", 2);
    styleAxisText(yAxis.selectAll("text"), "12px");
  }

  if (paretoActive && pareto) {
    drawParetoShade(g, data, pareto.hitIndex, x0, innerH);
  }

  const groups = g
    .selectAll(".bar-group")
    .data(data)
    .join("g")
    .attr("class", "bar-group")
    .attr("transform", (d) => `translate(${x0(d.label)},0)`);

  const bw = stacked ? x0.bandwidth() : x1.bandwidth();
  const barLabelTexts = data.flatMap((d) =>
    barSeries.map((s) => formatBarLabel(pointValue(d, s.id))),
  );
  const labelProbe = g
    .append("text")
    .attr("font-family", FONT)
    .attr("font-weight", "700")
    .attr("visibility", "hidden");
  const labelLayout = resolveBarLabelLayout(
    labelProbe.node()!,
    barLabelTexts,
    bw,
  );
  labelProbe.remove();

  const stackStart = new Map<string, Map<string, number>>();
  if (stacked) {
    for (const d of data) {
      let acc = 0;
      const starts = new Map<string, number>();
      for (const s of barSeries) {
        starts.set(s.id, acc);
        acc += Math.max(0, pointValue(d, s.id));
      }
      stackStart.set(d.label, starts);
    }
  }

  const labelOccupied: LabelBox[] = [];
  const pendingLabels: ValueLabelItem[] = [];

  barSeries.forEach((s, si) => {
    const rx = style.rounded && !stacked ? Math.min(5, bw / 4) : 0;
    const fill = seriesFill(style, s, si);
    groups
      .append("path")
      .attr("class", "bar")
      .attr("d", (d) => {
        const v = Math.max(0, pointValue(d, s.id));
        const start = stacked ? stackStart.get(d.label)?.get(s.id) ?? 0 : 0;
        const bx = stacked ? 0 : x1(s.id)!;
        const by = y(start + v);
        const bh = Math.max(0, y(start) - y(start + v));
        return barPathTopRounded(bx, by, bw, bh, rx);
      })
      .attr("fill", fill)
      .attr("fill-opacity", (_d, i) =>
        paretoActive && pareto && i > pareto.hitIndex ? 0.38 : 1,
      )
      .attr("stroke", (_d, i) => {
        if (paretoActive && pareto && i === pareto.hitIndex) return PARETO_COLOR;
        return style.strokeWidth > 0 ? style.strokeColor : "none";
      })
      .attr("stroke-width", (_d, i) => {
        if (paretoActive && pareto && i === pareto.hitIndex) {
          return Math.max(1.75, style.strokeWidth);
        }
        return style.strokeWidth;
      })
      .attr("filter", style.shadow ? `url(#${SHADOW_FILTER_ID})` : "none")
      .on("mousemove", function (event, d) {
        showTip(event as MouseEvent, d);
      })
      .on("mouseleave", hideTip);

    if (!opts.showLabels) return;
    groups.each(function (d) {
      const v = pointValue(d, s.id);
      if (stacked) {
        const start = stackStart.get(d.label)?.get(s.id) ?? 0;
        const top = start + Math.max(0, v);
        const segTop = y(top);
        const segH = Math.max(0, y(start) - y(top));
        if (segH < 12 || !v) return;
        d3.select(this)
          .append("text")
          .attr("class", "bar-value-label")
          .attr("pointer-events", "none")
          .attr("text-anchor", "middle")
          .attr("x", bw / 2)
          .attr("y", segTop + segH / 2)
          .attr("dy", "0.35em")
          .attr("font-family", FONT)
          .attr("font-weight", "700")
          .attr("font-size", "11px")
          .attr("fill", labelOnFill(fill))
          .text(formatBarLabel(v));
        return;
      }
      const barTop = y(v);
      const label = formatBarLabel(v);
      if (!v || !label || label === "0") return;
      const localCx = x1(s.id)! + bw / 2;
      const plotCx = (x0(d.label) ?? 0) + localCx;
      const barHeight = Math.max(0, innerH - barTop);
      const textLen = measureTextWidth(label, `${labelLayout.fontPx}px`);
      const aboveRoom = Math.max(0, barTop - 2);
      const inside =
        labelLayout.vertical &&
        textLen + 2 > aboveRoom &&
        barHeight - 6 >= textLen + 2;
      if (inside) {
        appendBarValueLabel(
          d3.select(this),
          label,
          localCx,
          barTop,
          barHeight,
          fill,
          labelLayout,
        );
        labelOccupied.push({
          l: plotCx - labelLayout.fontPx / 2,
          r: plotCx + labelLayout.fontPx / 2,
          t: barTop + 4,
          b: barTop + 4 + textLen,
        });
        return;
      }
      pendingLabels.push({
        text: label,
        value: v,
        cx: plotCx,
        cy: barTop,
        w: textLen,
        fontPx: labelLayout.fontPx,
        className: "bar-value-label",
      });
    });
  });

  const barCenter = (label: string) => {
    const band = x0(label) ?? 0;
    if (barSeries.length === 1) {
      const id = barSeries[0].id;
      return band + (x1(id) ?? 0) + x1.bandwidth() / 2;
    }
    return band + x0.bandwidth() / 2;
  };

  if (paretoActive && pareto) {
    const lastBar = barSeries[barSeries.length - 1];
    const paretoBarCenter =
      stacked || !lastBar
        ? x0.bandwidth() / 2
        : (x1(lastBar.id) ?? 0) + x1.bandwidth() / 2;
    drawParetoOverlay(
      g,
      pareto,
      x0,
      innerW,
      innerH,
      paretoAxis,
      !paretoAxis,
      paretoBarCenter,
    );
  }

  if (sharedLines.length) {
    drawValueLines(
      g,
      data,
      sharedLines,
      () => y,
      barCenter,
      style,
      showTip,
      hideTip,
      opts.showLabels,
      x0.step(),
      "y-shared",
      pendingLabels,
    );
  }

  if (y2Series.length) {
    const labelRoom = opts.showLabels ? 18 : 0;
    const scales = new Map<string, d3.ScaleLinear<number, number>>();
    const groups = splitRightAxes ? lineGroups : [y2Series];
    for (const group of groups) {
      const shared = valueScale(data, group, innerH, labelRoom);
      for (const s of group) scales.set(s.id, shared);
    }
    if (style.showYAxis) {
      groups.forEach((group, i) => {
        const y2 = scales.get(group[0].id)!;
        const color = splitRightAxes ? seriesFill(style, group[0], i) : AXIS;
        const y2Axis = g
          .append("g")
          .attr(
            "transform",
            `translate(${innerW + (splitRightAxes ? i * LINE_AXIS_STEP : 0)},0)`,
          )
          .call(
            d3
              .axisRight(y2)
              .ticks(splitRightAxes && groups.length > 1 ? 4 : 5)
              .tickSize(0)
              .tickFormat((d) => formatValue(Number(d))),
          );
        y2Axis.select(".domain").attr("stroke", color).attr("stroke-width", 2);
        styleAxisText(
          y2Axis.selectAll("text"),
          splitRightAxes && groups.length > 1 ? "11px" : "12px",
        );
        if (splitRightAxes) y2Axis.selectAll("text").attr("fill", color);
      });
    }
    drawValueLines(
      g,
      data,
      y2Series,
      (id) => scales.get(id) ?? valueScale(data, [], innerH, 0),
      barCenter,
      style,
      showTip,
      hideTip,
      opts.showLabels,
      x0.step(),
      "y2",
      pendingLabels,
    );
  }

  if (opts.showLabels && pendingLabels.length) {
    paintValueLabels(g, pendingLabels, labelOccupied);
  }
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
  opts: { layout: SeriesLayout; showLabels: boolean },
) {
  const stacked = opts.layout === "stacked" || opts.layout === "normalized";
  const normalized = opts.layout === "normalized";
  const left = 160;
  const topPad = series.length > 1 ? 24 : 0;
  const margin = { top: 20 + topPad, right: opts.showLabels && !stacked ? 72 : 48, bottom: 36, left };
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
    .padding(stacked ? 0 : 0.1);

  const xMax = normalized
    ? 100
    : stacked
      ? stackExtent(data, series) || 0
      : maxPointValue(data, series) || 0;
  const x = d3.scaleLinear().domain([0, xMax]).nice().range([0, innerW]);
  if (normalized) x.domain([0, 100]);

  const bh = stacked ? y0.bandwidth() : y1.bandwidth();
  const labelFontPx = hbarValueFont(bh, y1.step());
  const barLabelTexts = data.flatMap((d) =>
    series.map((s) => formatBarLabel(pointValue(d, s.id))),
  );
  const labelReserve =
    maxFormattedLabelWidth(barLabelTexts, labelFontPx) + HBAR_LABEL_GAP + 2;
  if (opts.showLabels && !stacked && !normalized) {
    ensureHBarLabelRoom(x, xMax, innerW, labelReserve);
  }

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
    .call(
      d3
        .axisBottom(x)
        .ticks(5)
        .tickSize(0)
        .tickFormat((d) => (normalized ? `${d}%` : formatValue(Number(d)))),
    );
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

  const stackStart = new Map<string, Map<string, number>>();
  if (stacked) {
    for (const d of data) {
      let acc = 0;
      const starts = new Map<string, number>();
      for (const s of series) {
        starts.set(s.id, acc);
        acc += Math.max(0, pointValue(d, s.id));
      }
      stackStart.set(d.label, starts);
    }
  }

  series.forEach((s, si) => {
    const rx = style.rounded && !stacked ? Math.min(5, bh / 2) : 0;
    const fill = seriesFill(style, s, si);
    groups
      .append("path")
      .attr("class", "bar")
      .attr("d", (d) => {
        const v = Math.max(0, pointValue(d, s.id));
        const start = stacked ? stackStart.get(d.label)?.get(s.id) ?? 0 : 0;
        const x0pos = x(start);
        const bw = Math.max(0, x(start + v) - x0pos);
        const by = stacked ? 0 : y1(s.id)!;
        return barPathEndRounded(x0pos, by, Math.max(bw, v > 0 ? 1 : 0), bh, rx);
      })
      .attr("fill", fill)
      .attr("stroke", style.strokeWidth > 0 ? style.strokeColor : "none")
      .attr("stroke-width", style.strokeWidth)
      .attr("filter", style.shadow ? `url(#${SHADOW_FILTER_ID})` : "none")
      .on("mousemove", function (event, d) {
        showTip(event as MouseEvent, d);
      })
      .on("mouseleave", hideTip);

    if (!opts.showLabels) return;
    groups.each(function (d) {
      const v = pointValue(d, s.id);
      if (stacked) {
        const start = stackStart.get(d.label)?.get(s.id) ?? 0;
        const segW = x(start + Math.max(0, v)) - x(start);
        if (segW < 18 || !v) return;
        d3.select(this)
          .append("text")
          .attr("class", "bar-value-label")
          .attr("pointer-events", "none")
          .attr("text-anchor", "middle")
          .attr("x", x(start) + segW / 2)
          .attr("y", bh / 2)
          .attr("dy", "0.35em")
          .attr("font-family", FONT)
          .attr("font-weight", "700")
          .attr("font-size", "11px")
          .attr("fill", labelOnFill(fill))
          .text(formatBarLabel(v));
        return;
      }
      appendHBarValueLabel(
        d3.select(this),
        formatBarLabel(v),
        Math.max(2, x(v)),
        y1(s.id)!,
        bh,
        labelFontPx,
      );
    });
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
  opts: { layout: SeriesLayout; showLabels: boolean },
) {
  const ySeries = axisSeries(series, "y");
  const primaryKey = (ySeries[0] ?? series[0]) ? scaleGroupKey(ySeries[0] ?? series[0]) : "";
  const onPrimary = (s: ChartSeriesMeta) =>
    primaryKey !== "" && s.scaleKey != null && scaleGroupKey(s) === primaryKey;
  const y2Series = axisSeries(series, "y2").filter((s) => !onPrimary(s));
  const leftSeries = series.filter((s) => (s.axis ?? "y") !== "y2" || onPrimary(s));
  const rightIds = new Set(y2Series.map((s) => s.id));
  const right = y2Series.length ? 72 : MARGIN.right;
  const labelFont = "11px";
  const topPad = series.length > 1 ? 28 : 0;
  const labels = data.map((d) => d.label);

  let left = MARGIN.left;
  let bottom = MARGIN.bottom;
  let corridorW = 80;
  for (let pass = 0; pass < 2; pass++) {
    const inner = Math.max(80, width - left - right);
    const stepApprox =
      data.length > 1 ? inner / Math.max(data.length - 1, 1) : inner;
    corridorW = Math.max(40, stepApprox);
    const along = Math.max(40, bottom - AXIS_LABEL_AXIS_GAP);
    left = estimateLeftMargin(labels, width, labelFont, corridorW, along);
    bottom = estimateBottomMargin(labels, height, labelFont, corridorW, along);
  }
  const margin = {
    ...MARGIN,
    left,
    right,
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

  const yMax = maxPointValue(data, leftSeries) || 0;
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);
  const y2Max = maxPointValue(data, y2Series) || 0;
  const y2 = d3.scaleLinear().domain([0, y2Max]).nice().range([innerH, 0]);
  const valueTexts = data.flatMap((d) =>
    series.map((s) => formatBarLabel(pointValue(d, s.id))),
  );
  const fontPx = lineLabelFont(valueTexts, Math.max(16, x.step() - 6));
  if (opts.showLabels) {
    ensureLabelHeadroom(
      y,
      yMax,
      innerH,
      fontPx + LINE_POINT_R + LINE_LABEL_GAP + 2,
    );
  }

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
  const lineCorridor = Math.max(40, step);
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
    if (y2Series.length) {
      const y2Axis = g
        .append("g")
        .attr("transform", `translate(${innerW},0)`)
        .call(d3.axisRight(y2).ticks(5).tickSize(0));
      y2Axis.select(".domain").attr("stroke", AXIS).attr("stroke-width", 2);
      styleAxisText(y2Axis.selectAll("text"), "12px");
    }
  }

  series.forEach((s, si) => {
    const scale = rightIds.has(s.id) ? y2 : y;
    const color = seriesFill(style, s, si);
    const line = d3
      .line<AggregatedPoint>()
      .x((d) => x(d.label)!)
      .y((d) => scale(pointValue(d, s.id)));

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", Math.max(2, style.strokeWidth || 2.5))
      .attr("filter", style.shadow ? `url(#${SHADOW_FILTER_ID})` : "none")
      .attr("d", line);

    g.selectAll(`.point-${si}`)
      .data(data)
      .join("circle")
      .attr("class", `point-${si}`)
      .attr("cx", (d) => x(d.label)!)
      .attr("cy", (d) => scale(pointValue(d, s.id)))
      .attr("r", 4)
      .attr("fill", color)
      .attr("stroke", style.strokeWidth > 0 ? style.strokeColor : "#fff")
      .attr("stroke-width", style.strokeWidth > 0 ? style.strokeWidth : 1.5)
      .on("mousemove", function (event, d) {
        showTip(event as MouseEvent, d);
      })
      .on("mouseleave", hideTip);
  });

  if (opts.showLabels) {
    const occupied: LabelBox[] = [];
    if (leftSeries.length) {
      drawLineValueLabels(g, data, leftSeries, (label) => x(label), (_id, v) => y(v), fontPx, occupied);
    }
    if (y2Series.length) {
      drawLineValueLabels(g, data, y2Series, (label) => x(label), (_id, v) => y2(v), fontPx, occupied);
    }
  }
}
/** Point on a d3 pie arc. Angle 0 is 12 o'clock, clockwise. */
function pieRim(angle: number, r: number): [number, number] {
  return [Math.sin(angle) * r, -Math.cos(angle) * r];
}

function formatPieShare(part: number, total: number): string {
  if (!(total > 0) || !(part > 0)) return "0%";
  const pct = (part / total) * 100;
  if (pct < 0.5) return "<1%";
  if (pct >= 10) return `${Math.round(pct).toLocaleString("ru-RU")}%`;
  return `${pct.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`;
}

/** Slice color as caption ink when it stays readable on white, otherwise the axis color. */
function pieMetaInk(fill: string): string {
  return labelOnFill(fill) === "#fff" ? fill : AXIS;
}

interface PieCallout {
  side: 1 | -1;
  y: number;
  h: number;
  mid: number;
  lines: string[];
  meta: string;
  color: string;
  metaColor: string;
}

function pieCalloutLines(
  name: string,
  maxWidth: number,
  fontPx: number,
  allowTwo: boolean,
): string[] {
  const font = `${fontPx}px`;
  const clean = cleanLabelText(name);
  if (!allowTwo || measureTextWidth(clean, font) <= maxWidth) {
    return [truncateToWidth(clean, maxWidth, font)];
  }
  const wrapped = wrapLabelBySpaces(clean, maxWidth, font, 2);
  return wrapped.length ? wrapped : [truncateToWidth(clean, maxWidth, font)];
}

function segmentHitsCircle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, -(x1 * dx + y1 * dy) / len2)) : 0;
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  return px * px + py * py < r * r;
}

/**
 * Callouts leave the pie on separate horizontal tracks, drop on a
 * private vertical lane, then run a parallel tail to the label.
 * Vertical lanes step outward from the pie so they stay side by side.
 */
const PIE_LANE_GAP = 8;
const PIE_LANE_TAIL = 16;

function spreadShelves(ys: number[], gap: number): number[] {
  const out = ys.slice();
  for (let i = 1; i < out.length; i++) {
    const min = out[i - 1] + gap;
    if (out[i] < min) out[i] = min;
  }
  return out;
}

function clearOfCircle(y: number, side: 1 | -1, radius: number): number {
  const limit = radius + 8;
  if (Math.abs(y) >= limit - 1) return side * 8;
  return side * Math.sqrt(Math.max(0, limit * limit - y * y));
}

function pieLeaderPath(
  mid: number,
  radius: number,
  side: 1 | -1,
  labelY: number,
  lane: number,
  laneCount: number,
  shelfY: number,
): { d: string; textX: number; dot: [number, number] } {
  const [rimX, rimY] = pieRim(mid, radius);
  const [stubX, stubY] = pieRim(mid, radius + 6);
  const band = Math.max(0, laneCount - 1) * PIE_LANE_GAP;
  const outer = radius + 16 + band;
  const gateX = clearOfCircle(shelfY, side, radius);
  const laneX =
    side *
    Math.min(outer, Math.max(radius + 16 + lane * PIE_LANE_GAP, Math.abs(gateX) + 6));
  const textX = side * (outer + PIE_LANE_TAIL);
  let toGate = `L${gateX},${shelfY}`;
  if (segmentHitsCircle(stubX, stubY, gateX, shelfY, radius + 1.5)) {
    const mx = (stubX + gateX) / 2;
    const my = (stubY + shelfY) / 2;
    const mag = Math.hypot(mx, my) || 1;
    const cMag = Math.max(radius + 22, mag + 14);
    toGate = `Q${(mx / mag) * cMag},${(my / mag) * cMag} ${gateX},${shelfY}`;
  }
  return {
    d: `M${rimX},${rimY} L${stubX},${stubY} ${toGate} L${laneX},${shelfY} L${laneX},${labelY} L${textX},${labelY}`,
    textX,
    dot: [rimX, rimY],
  };
}

function spreadPieCallouts(items: PieCallout[], minY: number, maxY: number) {
  if (!items.length) return;
  items.sort((a, b) => a.y - b.y);
  const gap = 8;
  const tops = items.map((it) => it.y - it.h / 2);
  tops[0] = Math.max(minY, tops[0]);
  for (let i = 1; i < items.length; i++) {
    const minTop = tops[i - 1] + items[i - 1].h + gap;
    if (tops[i] < minTop) tops[i] = minTop;
  }
  const last = items.length - 1;
  if (tops[last] + items[last].h > maxY) {
    tops[last] = maxY - items[last].h;
    for (let i = last - 1; i >= 0; i--) {
      const maxTop = tops[i + 1] - gap - items[i].h;
      if (tops[i] > maxTop) tops[i] = maxTop;
    }
  }
  if (tops[0] < minY) {
    const totalH = items.reduce((sum, it) => sum + it.h, 0);
    const room = Math.max(1, maxY - minY);
    const tight = Math.max(2, (room - totalH) / Math.max(1, items.length - 1));
    let y = minY;
    for (let i = 0; i < items.length; i++) {
      tops[i] = y;
      y += items[i].h + tight;
    }
  }
  items.forEach((it, i) => {
    it.y = tops[i] + it.h / 2;
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
  showLabels: boolean,
  hidden: ReadonlySet<string>,
  onToggle: (label: string) => void,
) {
  const hiddenLabels = data.filter((d) => hidden.has(d.label));
  if (hiddenLabels.length) {
    const chips = svg.append("g").attr("transform", "translate(12, 16)");
    let chipX = 0;
    hiddenLabels.forEach((d) => {
      const item = chips.append("g").attr("transform", `translate(${chipX}, 0)`);
      item.style("cursor", "pointer").style("opacity", 0.45).on("click", () => onToggle(d.label));
      const caption = d.label.length > 18 ? d.label.slice(0, 16) + "..." : d.label;
      item
        .append("text")
        .attr("font-family", FONT)
        .attr("font-size", "11px")
        .attr("font-weight", "700")
        .attr("fill", AXIS)
        .text(`вернуть: ${caption}`);
      chipX += (item.node()?.getBBox().width || 80) + 16;
    });
  }

  const labelCol = Math.min(210, Math.max(108, Math.floor(width * 0.22)));
  const slices = data.filter((d) => d.value > 0 && !hidden.has(d.label));
  const total = d3.sum(slices, (d) => d.value);
  const pie = d3
    .pie<AggregatedPoint>()
    .value((d) => d.value)
    .sort(null);
  const laid = pie(slices);
  const countSide = (side: 1 | -1) =>
    laid.filter((d) => {
      const mid = (d.startAngle + d.endAngle) / 2;
      return (Math.sin(mid) >= 0 ? 1 : -1) === side;
    }).length;
  const maxOnSide = Math.max(countSide(1), countSide(-1), 1);
  const leader =
    20 +
    Math.max(0, maxOnSide - 1) * PIE_LANE_GAP +
    PIE_LANE_TAIL +
    20;
  const radius = Math.max(
    36,
    Math.min(height / 2 - 28, width / 2 - labelCol - leader),
  );
  const cx = width / 2;
  const cy = height / 2;

  const arc = d3
    .arc<d3.PieArcDatum<AggregatedPoint>>()
    .innerRadius(0)
    .outerRadius(Math.max(radius, 10));

  const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  const color = d3
    .scaleOrdinal<string>()
    .domain(slices.map((d) => d.label))
    .range(slices.map((_d, i) => seriesColor(style, i)));

  const arcs = laid;

  g.selectAll("path")
    .data(arcs)
    .join("path")
    .attr("d", arc)
    .attr("fill", (d) => color(d.data.label) as string)
    .attr("stroke", style.strokeWidth > 0 ? style.strokeColor : "#fff")
    .attr("stroke-width", style.strokeWidth > 0 ? style.strokeWidth : 2)
    .attr("filter", style.shadow ? `url(#${SHADOW_FILTER_ID})` : "none")
    .style("cursor", "pointer")
    .on("mousemove", function (event, d) {
      showTip(event as MouseEvent, d.data);
    })
    .on("mouseleave", hideTip)
    .on("click", function (_event, d) {
      onToggle(d.data.label);
    });

  if (!showLabels || !arcs.length || radius < 20) return;

  const textWidth = Math.max(72, labelCol - 8);
  const minY = -height / 2 + 8;
  const maxY = height / 2 - 8;
  const shareBoxes: LabelBox[] = [];

  const drawShare = (
    d: d3.PieArcDatum<AggregatedPoint>,
    share: string,
    fill: string,
  ) => {
    const angle = d.endAngle - d.startAngle;
    const depth = angle > Math.PI ? radius * 0.46 : radius * 0.62;
    const [x, y] = pieRim((d.startAngle + d.endAngle) / 2, depth);
    const fontPx = Math.min(15, Math.max(11, Math.round(radius / 16)));
    const shareW = measureTextWidth(share, `${fontPx}px`);
    const arcRoom = angle * depth;
    if (angle < 0.38 || arcRoom < shareW + 8) return false;
    const box: LabelBox = {
      l: x - shareW / 2 - 2,
      r: x + shareW / 2 + 2,
      t: y - fontPx / 2 - 1,
      b: y + fontPx / 2 + 1,
    };
    if (shareBoxes.some((o) => boxesOverlap(box, o))) return false;
    shareBoxes.push(box);
    g.append("text")
      .attr("class", "pie-share-label")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("x", x)
      .attr("y", y)
      .attr("font-family", FONT)
      .attr("font-weight", "700")
      .attr("font-size", `${fontPx}px`)
      .attr("fill", labelOnFill(fill))
      .text(share);
    return true;
  };

  if (arcs.length === 1) {
    const only = arcs[0];
    const fill = color(only.data.label) as string;
    const share = formatPieShare(only.data.value, total);
    const shareFont = Math.min(18, Math.max(13, Math.round(radius / 10)));
    g.append("text")
      .attr("class", "pie-share-label")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("x", 0)
      .attr("y", 0)
      .attr("font-family", FONT)
      .attr("font-weight", "700")
      .attr("font-size", `${shareFont}px`)
      .attr("fill", labelOnFill(fill))
      .text(share);
    const fontPx = Math.min(15, Math.max(12, Math.round(radius / 14)));
    const valueFont = Math.max(11, fontPx - 1);
    const lines = pieCalloutLines(only.data.label, Math.min(textWidth * 1.6, width - 32), fontPx, true);
    const meta = `${formatBarLabel(only.data.value)} · ${share}`;
    const nameStep = fontPx + 2;
    let y = radius + 22 + fontPx;
    const anchorX = 0;
    const text = g
      .append("text")
      .attr("class", "pie-callout-label")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .attr("font-family", FONT)
      .attr("font-weight", "700");
    for (const line of lines) {
      if (y > height / 2 - 8) break;
      text
        .append("tspan")
        .attr("x", anchorX)
        .attr("y", y)
        .attr("font-size", `${fontPx}px`)
        .attr("fill", AXIS)
        .text(line);
      y += nameStep;
    }
    if (y <= height / 2 - 4) {
      text
        .append("tspan")
        .attr("x", anchorX)
        .attr("y", y)
        .attr("font-size", `${valueFont}px`)
        .attr("fill", pieMetaInk(fill))
        .text(meta);
    }
    return;
  }

  const sideCount = (side: 1 | -1) =>
    arcs.filter((d) => {
      const mid = (d.startAngle + d.endAngle) / 2;
      return (Math.sin(mid) >= 0 ? 1 : -1) === side;
    }).length;
  const heavier = Math.max(sideCount(1), sideCount(-1), 1);
  let fontPx = Math.round(Math.min(14, Math.max(11, radius / 16)));
  let valueFont = Math.max(10, fontPx - 1);
  let allowTwo = true;
  const blockGuess = (two: boolean) =>
    (two ? 2 : 1) * (fontPx + 2) + valueFont + 12;
  while (heavier * blockGuess(allowTwo) > height - 16 && (allowTwo || fontPx > 10)) {
    if (allowTwo) allowTwo = false;
    else {
      fontPx -= 1;
      valueFont = Math.max(9, fontPx - 1);
    }
  }

  const nameStep = fontPx + 2;
  const callouts: PieCallout[] = arcs.map((d) => {
    const mid = (d.startAngle + d.endAngle) / 2;
    const fill = color(d.data.label) as string;
    const share = formatPieShare(d.data.value, total);
    const inside = drawShare(d, share, fill);
    const lines = pieCalloutLines(d.data.label, textWidth, fontPx, allowTwo);
    const meta = inside
      ? formatBarLabel(d.data.value)
      : `${formatBarLabel(d.data.value)} · ${share}`;
    const [, naturalY] = pieRim(mid, radius + 12);
    return {
      side: Math.sin(mid) >= 0 ? 1 : -1,
      y: naturalY,
      h: lines.length * nameStep + valueFont + 4,
      mid,
      lines,
      meta,
      color: fill,
      metaColor: pieMetaInk(fill),
    };
  });

  spreadPieCallouts(
    callouts.filter((c) => c.side > 0),
    minY,
    maxY,
  );
  spreadPieCallouts(
    callouts.filter((c) => c.side < 0),
    minY,
    maxY,
  );

  for (const side of [1, -1] as const) {
    const group = callouts
      .filter((item) => item.side === side)
      .sort((a, b) => a.y - b.y);
    const shelves = spreadShelves(
      group.map((item) => pieRim(item.mid, radius + 6)[1]),
      PIE_LANE_GAP,
    );
    group.forEach((item, lane) => {
    const leader = pieLeaderPath(
      item.mid,
      radius,
      item.side,
      item.y,
      lane,
      group.length,
      shelves[lane],
    );
    const textX = leader.textX;
    g.append("path")
      .attr("class", "pie-callout-line")
      .attr("pointer-events", "none")
      .attr("fill", "none")
      .attr("stroke", item.color)
      .attr("stroke-width", 1.35)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("d", leader.d);
    g.append("circle")
      .attr("class", "pie-callout-dot")
      .attr("pointer-events", "none")
      .attr("cx", leader.dot[0])
      .attr("cy", leader.dot[1])
      .attr("r", 2.4)
      .attr("fill", item.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.3);

    const text = g
      .append("text")
      .attr("class", "pie-callout-label")
      .attr("pointer-events", "none")
      .attr("text-anchor", item.side > 0 ? "start" : "end")
      .attr("font-family", FONT)
      .attr("font-weight", "700");
    let ly = item.y - item.h / 2 + fontPx * 0.86;
    for (const line of item.lines) {
      text
        .append("tspan")
        .attr("x", textX)
        .attr("y", ly)
        .attr("font-size", `${fontPx}px`)
        .attr("fill", AXIS)
        .text(line);
      ly += nameStep;
    }
    text
      .append("tspan")
      .attr("x", textX)
      .attr("y", ly)
      .attr("font-size", `${valueFont}px`)
      .attr("fill", item.metaColor)
      .text(item.meta);
    });
  }
}

export default BuilderChart;
