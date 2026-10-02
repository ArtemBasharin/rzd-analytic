import { Violation } from "../types/violation";
import { startTime as startTimeKey } from "../utils/config";
import { applyDataFilters, normalizeFilters } from "./dataFilters";
import { findField } from "./fieldCatalog";
import {
  AggregateResult,
  AggregatedPoint,
  Aggregation,
  ChartSeriesMeta,
  ChartSpec,
  ComparePeriod,
  COUNT_FIELD_ID,
  defaultDataFilters,
} from "./types";

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

/** Resolve series definitions for the current compare mode. */
export function resolveCompareSeries(spec: ChartSpec): ComparePeriod[] {
  const current: ComparePeriod = {
    id: "current",
    label: `Текущий (${formatPeriodShort(spec.dateFrom, spec.dateTo)})`,
    dateFrom: spec.dateFrom,
    dateTo: spec.dateTo,
  };

  if (spec.compareMode === "yoy") {
    const yFrom = spec.dateFrom != null ? shiftYear(spec.dateFrom, -1) : null;
    const yTo = spec.dateTo != null ? shiftYear(spec.dateTo, -1) : null;
    return [
      current,
      {
        id: "yoy",
        label: `Прошлый год (${formatPeriodShort(yFrom, yTo)})`,
        dateFrom: yFrom,
        dateTo: yTo,
      },
    ];
  }

  if (spec.compareMode === "custom") {
    const periods = (spec.comparePeriods || []).filter(
      (p) => p && (p.dateFrom != null || p.dateTo != null),
    );
    if (periods.length === 0) return [current];
    return periods.map((p, i) => ({
      id: p.id || `period-${i}`,
      label: p.label?.trim() || `Период ${i + 1}`,
      dateFrom: p.dateFrom,
      dateTo: p.dateTo,
    }));
  }

  return [current];
}

function categoryLabel(
  row: Violation,
  fieldId: string,
  alignAcrossYears: boolean,
): string {
  const field = findField(fieldId);
  if (!field) return "—";

  if (field.derived === "month") {
    const ms = violationTimeMs(row);
    if (ms == null) return "без даты";
    const d = new Date(ms);
    if (alignAcrossYears) return MONTH_RU[d.getMonth()];
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  }

  if (field.derived === "day") {
    const ms = violationTimeMs(row);
    if (ms == null) return "без даты";
    const d = new Date(ms);
    if (alignAcrossYears) return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  const raw = row[field.key];
  if (raw == null || raw === "") return "не указано";
  return String(raw);
}

function numericValue(row: Violation, valueFieldId: string): number {
  if (valueFieldId === COUNT_FIELD_ID) return 1;
  const field = findField(valueFieldId);
  if (!field) return 0;
  const raw = row[field.key];
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
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

function reduceValues(values: number[], aggregation: Aggregation): number {
  if (values.length === 0) return 0;
  if (aggregation === "count") return values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  if (aggregation === "avg") return sum / values.length;
  return sum;
}

function cutDecimals(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function aggregateOneSeries(
  rows: Violation[],
  categoryField: string,
  valueField: string,
  aggregation: Aggregation,
  alignAcrossYears: boolean,
): Map<string, number> {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const label = categoryLabel(row, categoryField, alignAcrossYears);
    const value = numericValue(row, valueField);
    const list = buckets.get(label);
    if (list) list.push(value);
    else buckets.set(label, [value]);
  }
  const result = new Map<string, number>();
  for (const [label, values] of buckets) {
    result.set(label, cutDecimals(reduceValues(values, aggregation)));
  }
  return result;
}

/** Aggregate Violation rows; supports YoY / multi-period comparison series. */
export function aggregateViolations(
  source: Violation[],
  spec: ChartSpec,
): AggregateResult {
  if (!spec.categoryField || !spec.valueField) {
    return { points: [], series: [] };
  }

  const filters = normalizeFilters(spec.filters ?? defaultDataFilters());
  const periods = resolveCompareSeries(spec);
  const alignAcrossYears = periods.length > 1;
  const field = findField(spec.categoryField);
  const isTimeAxis = field?.derived === "month" || field?.derived === "day";

  const seriesMaps: { meta: ChartSeriesMeta; map: Map<string, number> }[] = [];

  for (const period of periods) {
    const byDate = filterByDates(source, period.dateFrom, period.dateTo);
    const filtered = applyDataFilters(byDate, filters);
    const map = aggregateOneSeries(
      filtered,
      spec.categoryField,
      spec.valueField,
      spec.aggregation,
      alignAcrossYears && isTimeAxis,
    );
    seriesMaps.push({
      meta: { id: period.id, label: period.label },
      map,
    });
  }

  const series = seriesMaps.map((s) => s.meta);
  const primaryId = series[0]?.id;

  // Union of labels; order by primary series magnitude or time
  const labelSet = new Set<string>();
  for (const s of seriesMaps) {
    for (const k of s.map.keys()) labelSet.add(k);
  }

  let labels = Array.from(labelSet);
  if (isTimeAxis && alignAcrossYears) {
    // month names in calendar order; day keys MM-DD
    if (field?.derived === "month") {
      labels.sort(
        (a, b) => MONTH_RU.indexOf(a) - MONTH_RU.indexOf(b) || a.localeCompare(b),
      );
    } else {
      labels.sort((a, b) => a.localeCompare(b));
    }
  } else if (isTimeAxis) {
    labels.sort((a, b) => a.localeCompare(b));
  } else {
    labels.sort((a, b) => {
      const va = seriesMaps[0]?.map.get(a) ?? 0;
      const vb = seriesMaps[0]?.map.get(b) ?? 0;
      return vb - va;
    });
  }

  const topN = spec.topN > 0 ? spec.topN : 20;
  if (labels.length > topN) {
    if (isTimeAxis) labels = labels.slice(-topN);
    else labels = labels.slice(0, topN);
  }

  const points: AggregatedPoint[] = labels.map((label) => {
    const values: Record<string, number> = {};
    for (const s of seriesMaps) {
      values[s.meta.id] = s.map.get(label) ?? 0;
    }
    return {
      label,
      value: primaryId != null ? values[primaryId] ?? 0 : 0,
      values,
    };
  });

  return { points, series };
}
