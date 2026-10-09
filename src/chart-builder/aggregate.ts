import { Violation } from "../types/violation";
import { startTime as startTimeKey } from "../utils/config";
import { applyDataFilters, normalizeFilters } from "./dataFilters";
import { findField } from "./fieldCatalog";
import { assignParetoWeights } from "./pareto";
import {
  AggregateResult,
  AggregatedPoint,
  Aggregation,
  ChartSeriesMeta,
  ChartSpec,
  ComparePeriod,
  COUNT_FIELD_ID,
  DateGrain,
  IndicatorSummary,
  MeasureSlot,
  defaultDataFilters,
  y2Measures,
  yMeasures,
} from "./types";

export const OTHERS_LABEL = "Другие";

function violationTimeMs(row: Violation): number | null {
  const raw = row?.[startTimeKey] ?? row?.startTime;
  if (raw == null || raw === "") return null;
  const t = new Date(raw as string | number | Date).getTime();
  return Number.isFinite(t) ? t : null;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const MONTH_RU = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function shiftYear(ms: number, deltaYears: number): number {
  const d = new Date(ms);
  d.setFullYear(d.getFullYear() + deltaYears);
  return d.getTime();
}

function formatPeriodShort(from: number | null, to: number | null): string {
  const fmt = (ms: number) => {
    const d = new Date(ms);
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
  };
  if (from != null && to != null) return `${fmt(from)}–${fmt(to)}`;
  if (from != null) return `с ${fmt(from)}`;
  if (to != null) return `до ${fmt(to)}`;
  return "весь период";
}

/** Resolve series definitions for the current compare mode.
 *  Bars within a group are left→right by earliest period.
 */
export function resolveCompareSeries(spec: ChartSpec): ComparePeriod[] {
  const current: ComparePeriod = {
    id: "current",
    label: `Текущий (${formatPeriodShort(spec.dateFrom, spec.dateTo)})`,
    dateFrom: spec.dateFrom,
    dateTo: spec.dateTo,
  };

  let periods: ComparePeriod[];

  if (spec.compareMode === "yoy") {
    const yFrom = spec.dateFrom != null ? shiftYear(spec.dateFrom, -1) : null;
    const yTo = spec.dateTo != null ? shiftYear(spec.dateTo, -1) : null;
    periods = [
      current,
      {
        id: "yoy",
        label: `Прошлый год (${formatPeriodShort(yFrom, yTo)})`,
        dateFrom: yFrom,
        dateTo: yTo,
      },
    ];
  } else if (spec.compareMode === "custom") {
    const custom = (spec.comparePeriods || []).filter(
      (p) => p && (p.dateFrom != null || p.dateTo != null),
    );
    if (custom.length === 0) return [current];
    periods = custom.map((p, i) => ({
      id: p.id || `period-${i}`,
      label: p.label?.trim() || `Период ${i + 1}`,
      dateFrom: p.dateFrom,
      dateTo: p.dateTo,
    }));
  } else {
    return [current];
  }

  return periods.sort((a, b) => {
    const aStart = a.dateFrom ?? a.dateTo ?? Number.POSITIVE_INFINITY;
    const bStart = b.dateFrom ?? b.dateTo ?? Number.POSITIVE_INFINITY;
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = a.dateTo ?? a.dateFrom ?? Number.POSITIVE_INFINITY;
    const bEnd = b.dateTo ?? b.dateFrom ?? Number.POSITIVE_INFINITY;
    return aEnd - bEnd;
  });
}

function isoWeekParts(d: Date): { year: number; week: number } {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const year = date.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year, week };
}

function isTimeGrain(grain: DateGrain | undefined): grain is DateGrain {
  return (
    grain === "month" ||
    grain === "day" ||
    grain === "week" ||
    grain === "quarter" ||
    grain === "year"
  );
}

function categoryLabel(
  row: Violation,
  fieldId: string,
  alignAcrossYears: boolean,
): string {
  const field = findField(fieldId);
  if (!field) return "—";

  if (field.derived) {
    const ms = violationTimeMs(row);
    if (ms == null) return "без даты";
    const d = new Date(ms);
    if (field.derived === "month") {
      if (alignAcrossYears) return MONTH_RU[d.getMonth()];
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    }
    if (field.derived === "day") {
      if (alignAcrossYears) return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
    if (field.derived === "week") {
      const { year, week } = isoWeekParts(d);
      if (alignAcrossYears) return `W${pad2(week)}`;
      return `${year}-W${pad2(week)}`;
    }
    if (field.derived === "quarter") {
      const q = Math.floor(d.getMonth() / 3) + 1;
      if (alignAcrossYears) return `Q${q}`;
      return `${d.getFullYear()}-Q${q}`;
    }
    return String(d.getFullYear());
  }

  const raw = row[field.key];
  if (raw == null || raw === "") return "не указано";
  return String(raw);
}

function numericValue(row: Violation, valueFieldId: string): number {
  if (valueFieldId === COUNT_FIELD_ID) return 1;
  const field = findField(valueFieldId);
  if (!field) return 0;
  if (field.composeKeys?.length) {
    return field.composeKeys.reduce((sum, key) => {
      const n = Number(row[key]);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }
  const raw = row[field.key];
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function rowIdentity(row: Violation, fieldId: string, index: number): string {
  if (fieldId === COUNT_FIELD_ID) {
    const id = row["ID отказа"] ?? row._id;
    if (id != null && String(id) !== "") return String(id);
    return `__row_${index}`;
  }
  const n = numericValue(row, fieldId);
  return Number.isFinite(n) ? String(n) : `__nan_${index}`;
}

function filterByDates(
  rows: Violation[],
  dateFrom: number | null,
  dateTo: number | null,
): Violation[] {
  if (dateFrom == null && dateTo == null) return rows;
  return rows.filter((row) => {
    const ms = violationTimeMs(row);
    if (ms == null) return false;
    if (dateFrom != null && ms < dateFrom) return false;
    if (dateTo != null && ms > dateTo) return false;
    return true;
  });
}

function cutDecimals(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function reduceRows(
  rows: Violation[],
  fieldId: string,
  aggregation: Aggregation,
): number {
  if (rows.length === 0) return 0;
  if (aggregation === "count") return rows.length;
  if (aggregation === "countUnique") {
    const seen = new Set<string>();
    rows.forEach((row, index) => seen.add(rowIdentity(row, fieldId, index)));
    return seen.size;
  }
  const nums = rows.map((row) => numericValue(row, fieldId));
  if (aggregation === "min") return cutDecimals(Math.min(...nums));
  if (aggregation === "max") return cutDecimals(Math.max(...nums));
  const sum = nums.reduce((a, b) => a + b, 0);
  if (aggregation === "avg") return cutDecimals(sum / nums.length);
  return cutDecimals(sum);
}

function aggregateOneSeries(
  rows: Violation[],
  categoryField: string,
  measure: MeasureSlot,
  alignAcrossYears: boolean,
): Map<string, number> {
  const buckets = new Map<string, Violation[]>();
  for (const row of rows) {
    const label = categoryLabel(row, categoryField, alignAcrossYears);
    const list = buckets.get(label);
    if (list) list.push(row);
    else buckets.set(label, [row]);
  }
  const result = new Map<string, number>();
  for (const [label, group] of buckets) {
    result.set(label, reduceRows(group, measure.fieldId, measure.aggregation));
  }
  return result;
}

function measureSeriesId(measure: MeasureSlot, index: number): string {
  return `${measure.axis}:${measure.fieldId}:${index}`;
}

function measureSeriesLabel(measure: MeasureSlot): string {
  const name = findField(measure.fieldId)?.label ?? measure.fieldId;
  const agg =
    measure.aggregation === "sum"
      ? "сумма"
      : measure.aggregation === "avg"
        ? "среднее"
        : measure.aggregation === "min"
          ? "мин"
          : measure.aggregation === "max"
            ? "макс"
            : measure.aggregation === "countUnique"
              ? "уник."
              : "кол-во";
  if (measure.fieldId === COUNT_FIELD_ID && measure.aggregation === "count") return name;
  return `${name} (${agg})`;
}

function compareTimeLabels(a: string, b: string, grain: DateGrain): number {
  if (grain === "month") {
    const ia = MONTH_RU.indexOf(a);
    const ib = MONTH_RU.indexOf(b);
    if (ia >= 0 && ib >= 0 && ia !== ib) return ia - ib;
  }
  return a.localeCompare(b);
}

interface SeriesMap {
  meta: ChartSeriesMeta;
  map: Map<string, number>;
}

/** Bar series that form the column. Lines and the second axis are not the column height. */
function columnSeries(seriesMaps: SeriesMap[]): SeriesMap[] {
  const bars = seriesMaps.filter((s) => s.meta.axis !== "y2" && s.meta.mark !== "line");
  return bars.length ? bars : seriesMaps;
}

/**
 * Height used to rank categories.
 * Grouped columns: the tallest bar. Stacked, shares and pie: the total.
 */
function columnMagnitude(label: string, spec: ChartSpec, seriesMaps: SeriesMap[]): number {
  const pool = columnSeries(seriesMaps);
  const stacked =
    spec.chartType === "pie" ||
    spec.seriesLayout === "stacked" ||
    spec.seriesLayout === "normalized";
  if (stacked) {
    return pool.reduce((sum, s) => sum + (s.map.get(label) ?? 0), 0);
  }
  let max = 0;
  for (const s of pool) {
    const v = s.map.get(label) ?? 0;
    if (v > max) max = v;
  }
  return max;
}

function sortLabels(
  labels: string[],
  spec: ChartSpec,
  grain: DateGrain | undefined,
  seriesMaps: SeriesMap[],
): string[] {
  const time = isTimeGrain(grain);
  const out = [...labels];
  const valueDir = spec.sortDir === "asc" ? 1 : -1;
  const byValue = (a: string, b: string) => {
    const va = columnMagnitude(a, spec, seriesMaps);
    const vb = columnMagnitude(b, spec, seriesMaps);
    if (va !== vb) return (va - vb) * valueDir;
    return a.localeCompare(b, "ru");
  };

  if (spec.sortBy === "value") {
    out.sort(byValue);
    return out;
  }
  if (spec.sortBy === "category") {
    const dir = spec.sortDir === "desc" ? -1 : 1;
    out.sort((a, b) =>
      time && grain ? compareTimeLabels(a, b, grain) * dir : a.localeCompare(b, "ru") * dir,
    );
    return out;
  }
  if (time && grain) {
    out.sort((a, b) => compareTimeLabels(a, b, grain));
    return out;
  }
  out.sort(byValue);
  return out;
}

function applyTopN(
  labels: string[],
  spec: ChartSpec,
  time: boolean,
): { head: string[]; tail: string[] } {
  const topN = spec.topN > 0 ? spec.topN : 20;
  if (labels.length <= topN) return { head: labels, tail: [] };
  const keepRecent =
    time && spec.sortBy !== "value" && !(spec.sortBy === "category" && spec.sortDir === "desc");
  if (keepRecent) {
    return { head: labels.slice(-topN), tail: labels.slice(0, labels.length - topN) };
  }
  return { head: labels.slice(0, topN), tail: labels.slice(topN) };
}

function pointsFromLabels(
  labels: string[],
  seriesMaps: SeriesMap[],
  primaryId: string | undefined,
  asSum: boolean,
): AggregatedPoint[] {
  return labels.map((label) => {
    const values: Record<string, number> = {};
    let sum = 0;
    for (const s of seriesMaps) {
      const v = s.map.get(label) ?? 0;
      values[s.meta.id] = v;
      sum += v;
    }
    return {
      label,
      value: asSum ? cutDecimals(sum) : primaryId != null ? values[primaryId] ?? 0 : 0,
      values,
    };
  });
}

function othersPoint(
  tail: string[],
  seriesMaps: SeriesMap[],
  primaryId: string | undefined,
  asSum: boolean,
): AggregatedPoint | null {
  if (!tail.length) return null;
  const values: Record<string, number> = {};
  let sum = 0;
  for (const s of seriesMaps) {
    const total = tail.reduce((acc, label) => acc + (s.map.get(label) ?? 0), 0);
    const v = cutDecimals(total);
    values[s.meta.id] = v;
    sum += v;
  }
  return {
    label: OTHERS_LABEL,
    value: asSum ? cutDecimals(sum) : primaryId != null ? values[primaryId] ?? 0 : 0,
    values,
  };
}

function normalizeShares(points: AggregatedPoint[], series: ChartSeriesMeta[]) {
  for (const point of points) {
    const total = series.reduce((sum, s) => sum + (point.values[s.id] ?? 0), 0);
    for (const s of series) {
      const raw = point.values[s.id] ?? 0;
      point.values[s.id] = total === 0 ? 0 : cutDecimals((raw / total) * 100);
    }
    point.value = series[0] ? point.values[series[0].id] ?? 0 : 0;
  }
}

function filteredRows(
  source: Violation[],
  spec: ChartSpec,
  from: number | null,
  to: number | null,
): Violation[] {
  const filters = normalizeFilters(spec.filters ?? defaultDataFilters());
  return applyDataFilters(filterByDates(source, from, to), filters);
}

function buildIndicator(source: Violation[], spec: ChartSpec): IndicatorSummary | null {
  const measure = yMeasures(spec)[0];
  if (!measure) return null;
  const label = findField(measure.fieldId)?.label ?? "Значение";
  const periods = resolveCompareSeries(spec);

  if (spec.compareMode === "none") {
    const rows = filteredRows(source, spec, spec.dateFrom, spec.dateTo);
    return {
      value: reduceRows(rows, measure.fieldId, measure.aggregation),
      label,
    };
  }

  if (spec.compareMode === "yoy") {
    const current = periods.find((p) => p.id === "current") ?? periods[periods.length - 1];
    const previous = periods.find((p) => p.id === "yoy");
    const rows = filteredRows(source, spec, current.dateFrom, current.dateTo);
    const summary: IndicatorSummary = {
      value: reduceRows(rows, measure.fieldId, measure.aggregation),
      label,
    };
    if (previous) {
      const prevRows = filteredRows(source, spec, previous.dateFrom, previous.dateTo);
      summary.compareValue = reduceRows(prevRows, measure.fieldId, measure.aggregation);
      summary.compareLabel = previous.label;
    }
    return summary;
  }

  const latest = periods[periods.length - 1];
  const previous = periods.length > 1 ? periods[periods.length - 2] : undefined;
  const rows = filteredRows(source, spec, latest?.dateFrom ?? null, latest?.dateTo ?? null);
  const summary: IndicatorSummary = {
    value: reduceRows(rows, measure.fieldId, measure.aggregation),
    label,
  };
  if (previous) {
    const prevRows = filteredRows(source, spec, previous.dateFrom, previous.dateTo);
    summary.compareValue = reduceRows(prevRows, measure.fieldId, measure.aggregation);
    summary.compareLabel = previous.label;
  }
  return summary;
}

function emptyResult(indicator: IndicatorSummary | null = null): AggregateResult {
  return { points: [], series: [], indicator };
}

/** Aggregate Violation rows into chart points and series. */
export function aggregateViolations(
  source: Violation[],
  spec: ChartSpec,
): AggregateResult {
  if (spec.chartType === "indicator") {
    return emptyResult(buildIndicator(source, spec));
  }

  const measuresY = yMeasures(spec);
  if (!spec.categoryField || measuresY.length === 0) return emptyResult();

  const filters = normalizeFilters(spec.filters ?? defaultDataFilters());
  const comparing = spec.compareMode === "yoy" || spec.compareMode === "custom";
  const periods = resolveCompareSeries(spec);
  const alignAcrossYears = comparing && periods.length > 1;
  const field = findField(spec.categoryField);
  const grain = field?.derived;
  const time = isTimeGrain(grain);
  const useColor =
    !comparing &&
    !!spec.colorField &&
    spec.colorField !== spec.categoryField &&
    measuresY.length === 1 &&
    y2Measures(spec).length === 0;

  const seriesMaps: SeriesMap[] = [];

  if (comparing) {
    const combo =
      (spec.chartType === "bar" || spec.chartType === "line") && measuresY.length > 1;
    const barMeasure = measuresY.find((m) => m.mark !== "line") ?? measuresY[0];
    const drawn = combo ? [barMeasure, ...measuresY.filter((m) => m !== barMeasure)] : [measuresY[0]];
    for (const measure of drawn) {
      const asLine = combo && measure !== barMeasure;
      for (const period of periods) {
        const rows = applyDataFilters(
          filterByDates(source, period.dateFrom, period.dateTo),
          filters,
        );
        seriesMaps.push({
          meta: {
            id: asLine ? `${period.id}:${measure.fieldId}` : period.id,
            label: asLine
              ? `${measureSeriesLabel(measure)} · ${period.label}`
              : period.label,
            axis: "y",
            mark: combo ? (asLine ? "line" : "bar") : undefined,
            scaleKey: asLine ? measure.fieldId : undefined,
          },
          map: aggregateOneSeries(
            rows,
            spec.categoryField,
            measure,
            alignAcrossYears && time,
          ),
        });
      }
    }
  } else if (useColor && spec.colorField) {
    const measure = measuresY[0];
    const rows = applyDataFilters(
      filterByDates(source, spec.dateFrom, spec.dateTo),
      filters,
    );
    const colorOrder: string[] = [];
    const byColor = new Map<string, Violation[]>();
    for (const row of rows) {
      const color = categoryLabel(row, spec.colorField, false);
      const list = byColor.get(color);
      if (list) list.push(row);
      else {
        colorOrder.push(color);
        byColor.set(color, [row]);
      }
    }
    colorOrder.sort((a, b) => a.localeCompare(b, "ru"));
    colorOrder.forEach((color, index) => {
      seriesMaps.push({
        meta: { id: `color:${index}:${color}`, label: color, axis: "y" },
        map: aggregateOneSeries(byColor.get(color) || [], spec.categoryField!, measure, false),
      });
    });
  } else {
    const rows = applyDataFilters(
      filterByDates(source, spec.dateFrom, spec.dateTo),
      filters,
    );
    const slots = [
      ...measuresY.map((m) => ({ ...m, axis: "y" as const })),
      ...(spec.chartType === "bar" || spec.chartType === "line"
        ? y2Measures(spec)
        : []),
    ];
    slots.forEach((measure, index) => {
      seriesMaps.push({
        meta: {
          id: measureSeriesId(measure, index),
          label: measureSeriesLabel(measure),
          axis: measure.axis,
          mark: measure.mark === "line" ? "line" : "bar",
        },
        map: aggregateOneSeries(rows, spec.categoryField!, measure, false),
      });
    });
  }

  if (!seriesMaps.length) return emptyResult();

  const series = seriesMaps.map((s) => s.meta);
  const currentIdx = seriesMaps.findIndex((s) => s.meta.id === "current");
  const yIdx = seriesMaps.findIndex((s) => s.meta.axis !== "y2");
  const rankIdx = currentIdx >= 0 ? currentIdx : yIdx >= 0 ? yIdx : 0;
  const primaryId = seriesMaps[rankIdx]?.meta.id ?? series[0]?.id;
  const labelSet = new Set<string>();
  for (const s of seriesMaps) {
    for (const key of s.map.keys()) labelSet.add(key);
  }

  const sorted = sortLabels(Array.from(labelSet), spec, grain, seriesMaps);
  const { head, tail } = applyTopN(sorted, spec, time);
  const asSum = spec.chartType === "pie";
  const points = pointsFromLabels(head, seriesMaps, primaryId, asSum);
  if (spec.chartType === "pie") {
    const extra = othersPoint(tail, seriesMaps, primaryId, true);
    if (extra) points.push(extra);
  }

  assignParetoWeights(points, series, spec.seriesLayout ?? "grouped");

  const mixedMarks =
    series.some((s) => s.mark === "line") && series.some((s) => s.mark === "bar");
  const canNormalize =
    !mixedMarks &&
    spec.seriesLayout === "normalized" &&
    (spec.chartType === "bar" || spec.chartType === "hbar") &&
    series.every((s) => s.axis !== "y2");
  if (canNormalize) normalizeShares(points, series);

  return { points, series, indicator: null };
}
