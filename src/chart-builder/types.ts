export type ChartType = "bar" | "hbar" | "line" | "pie" | "indicator";
export type Aggregation = "sum" | "count" | "avg" | "min" | "max" | "countUnique";
export type FieldKind = "dimension" | "measure";
export type CompareMode = "none" | "yoy" | "custom";
export type MeasureAxis = "y" | "y2";
/** Column chart or line when several measures are shown together. */
export type MeasureMark = "bar" | "line";
export type SeriesLayout = "grouped" | "stacked" | "normalized";
export type SortBy = "auto" | "category" | "value";
export type SortDir = "asc" | "desc";
export type DateGrain = "month" | "day" | "week" | "quarter" | "year";

export interface FieldDef {
  id: string;
  key: string;
  label: string;
  kind: FieldKind;
  /** Derived date grain of the refusal start time */
  derived?: DateGrain;
  /** Composite measure: sum of these source row keys */
  composeKeys?: string[];
}

export interface ChartDataFilters {
  /** Empty = all values allowed */
  units: string[];
  places: string[];
  categories: string[];
  kinds: string[];
  reasons: string[];
  /** Only rows with any train delay count/duration > 0 */
  onlyWithDelays: boolean;
  /** Minimum total delay hours (sum of duration fields); 0 = off */
  minDelayHours: number;
}

export interface ComparePeriod {
  id: string;
  label: string;
  dateFrom: number | null;
  dateTo: number | null;
}

export interface MeasureSlot {
  fieldId: string;
  aggregation: Aggregation;
  axis: MeasureAxis;
  /**
   * With two or more measures, exactly one slot is "bar" (columns).
   * The rest are lines. A single measure keeps "bar" and follows the chart type.
   */
  mark?: MeasureMark;
}

export interface ChartSpec {
  chartType: ChartType;
  categoryField: string | null;
  /** First Y measure; kept in sync for stored specs written before multi-measure support */
  valueField: string | null;
  /** Aggregation of the first Y measure */
  aggregation: Aggregation;
  measures: MeasureSlot[];
  /** Dimension used as series color. Ignored while a period comparison is on. */
  colorField: string | null;
  seriesLayout: SeriesLayout;
  sortBy: SortBy;
  sortDir: SortDir;
  dateFrom: number | null;
  dateTo: number | null;
  topN: number;
  filters: ChartDataFilters;
  compareMode: CompareMode;
  /** Used when compareMode === "custom" */
  comparePeriods: ComparePeriod[];
}

export interface ChartStyle {
  /** Preset palette id */
  paletteId: string;
  /** Series / bar fill colors (from palette or custom) */
  fillColors: string[];
  strokeColor: string;
  strokeWidth: number;
  shadow: boolean;
  rounded: boolean;
  showGrid: boolean;
  showYAxis: boolean;
  /** Value labels drawn on marks */
  showLabels: boolean;
  /** Cumulative Pareto line and 80% threshold on column charts */
  showPareto: boolean;
}

export interface ChartSeriesMeta {
  id: string;
  label: string;
  /** Right axis when "y2". Omitted series stay on the left axis. */
  axis?: MeasureAxis;
  /** Columns or line. Set for measure series; omitted for period and color splits. */
  mark?: MeasureMark;
  /**
   * Unit of measurement. Series with the same key share one scale,
   * whether they are columns or lines. Periods of one measure stay comparable.
   */
  scaleKey?: string;
}

export interface AggregatedPoint {
  label: string;
  /** Primary / first series value (pie, single-series charts) */
  value: number;
  /** All series values keyed by series id */
  values: Record<string, number>;
  /** Absolute category contribution used by the Pareto line. Set before share normalization. */
  weight?: number;
}

export interface IndicatorSummary {
  value: number;
  label: string;
  compareValue?: number;
  compareLabel?: string;
}

export interface AggregateResult {
  points: AggregatedPoint[];
  series: ChartSeriesMeta[];
  indicator: IndicatorSummary | null;
}

export const COUNT_FIELD_ID = "__count__";

export const STORAGE_KEY = "rzd-chart-builder-spec";
export const STYLE_STORAGE_KEY = "rzd-chart-builder-style";

export const defaultDataFilters = (): ChartDataFilters => ({
  units: [],
  places: [],
  categories: [],
  kinds: [],
  reasons: [],
  onlyWithDelays: false,
  minDelayHours: 0,
});

export const defaultMeasure = (): MeasureSlot => ({
  fieldId: COUNT_FIELD_ID,
  aggregation: "count",
  axis: "y",
  mark: "bar",
});

/** Keep a single column measure: the first "bar", or the earliest slot if none is set. */
export function normalizeMeasureMarks(measures: MeasureSlot[]): void {
  if (!measures.length) return;
  const marked = measures.findIndex((m) => m.mark === "bar");
  const barIndex = marked >= 0 ? marked : 0;
  measures.forEach((measure, index) => {
    measure.mark = index === barIndex ? "bar" : "line";
  });
}

export function defaultAggregationFor(fieldId: string): Aggregation {
  return fieldId === COUNT_FIELD_ID ? "count" : "sum";
}

const AGGREGATION_SET: ReadonlySet<string> = new Set([
  "sum",
  "count",
  "avg",
  "min",
  "max",
  "countUnique",
]);

export function sanitizeAggregation(
  value: unknown,
  fieldId: string,
): Aggregation {
  const fallback = defaultAggregationFor(fieldId);
  if (typeof value !== "string" || !AGGREGATION_SET.has(value)) return fallback;
  const agg = value as Aggregation;
  if (fieldId === COUNT_FIELD_ID && (agg === "min" || agg === "max")) return "count";
  return agg;
}

export function yMeasures(spec: Pick<ChartSpec, "measures" | "valueField" | "aggregation">): MeasureSlot[] {
  const fromList = (spec.measures || []).filter((m) => m && m.fieldId && m.axis !== "y2");
  if (fromList.length) return fromList;
  if (spec.valueField) {
    return [
      {
        fieldId: spec.valueField,
        aggregation: sanitizeAggregation(spec.aggregation, spec.valueField),
        axis: "y",
      },
    ];
  }
  return [];
}

export function y2Measures(spec: Pick<ChartSpec, "measures">): MeasureSlot[] {
  return (spec.measures || []).filter((m) => m && m.fieldId && m.axis === "y2");
}

function sanitizeMeasures(raw: unknown, fallback: MeasureSlot): MeasureSlot[] {
  if (!Array.isArray(raw)) {
    const single = [{ ...fallback }];
    normalizeMeasureMarks(single);
    return single;
  }
  const out: MeasureSlot[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const fieldId = (item as MeasureSlot).fieldId;
    if (typeof fieldId !== "string" || !fieldId) continue;
    const rawMark = (item as MeasureSlot).mark;
    out.push({
      fieldId,
      axis: (item as MeasureSlot).axis === "y2" ? "y2" : "y",
      aggregation: sanitizeAggregation((item as MeasureSlot).aggregation, fieldId),
      mark: rawMark === "line" || rawMark === "bar" ? rawMark : undefined,
    });
    if (out.length >= 8) break;
  }
  if (!out.length) {
    const single = [{ ...fallback }];
    normalizeMeasureMarks(single);
    return single;
  }
  if (!out.some((m) => m.axis === "y")) out[0] = { ...out[0], axis: "y" };
  normalizeMeasureMarks(out);
  return out;
}

const CHART_TYPES: ReadonlySet<string> = new Set([
  "bar",
  "hbar",
  "line",
  "pie",
  "indicator",
]);

/** Restore a spec from localStorage, including specs saved before multi-measure support. */
export function normalizeChartSpec(raw: Partial<ChartSpec> | null | undefined): ChartSpec {
  const base = defaultChartSpec();
  if (!raw || typeof raw !== "object") return base;
  const legacyField =
    typeof raw.valueField === "string" && raw.valueField ? raw.valueField : COUNT_FIELD_ID;
  const fallback = {
    fieldId: legacyField,
    aggregation: sanitizeAggregation(raw.aggregation, legacyField),
    axis: "y" as const,
  };
  let measures = sanitizeMeasures(raw.measures, fallback);
  const storedType = CHART_TYPES.has(String(raw.chartType))
    ? (raw.chartType as ChartType)
    : base.chartType;
  const chartType = storedType === "indicator" ? "bar" : storedType;
  if (storedType === "hbar" || storedType === "pie" || storedType === "indicator") {
    measures = measures.map((m) => ({ ...m, axis: "y" as const }));
  }
  const firstY = measures.find((m) => m.axis === "y") ?? measures[0];
  const mode = raw.compareMode;
  return {
    ...base,
    chartType,
    categoryField: typeof raw.categoryField === "string" ? raw.categoryField : null,
    measures,
    valueField: firstY.fieldId,
    aggregation: firstY.aggregation,
    colorField: typeof raw.colorField === "string" && raw.colorField ? raw.colorField : null,
    seriesLayout:
      raw.seriesLayout === "stacked" || raw.seriesLayout === "normalized"
        ? raw.seriesLayout
        : "grouped",
    sortBy:
      raw.sortBy === "category" || raw.sortBy === "value" || raw.sortBy === "auto"
        ? raw.sortBy
        : "auto",
    sortDir: raw.sortDir === "asc" ? "asc" : "desc",
    dateFrom: typeof raw.dateFrom === "number" ? raw.dateFrom : null,
    dateTo: typeof raw.dateTo === "number" ? raw.dateTo : null,
    topN: typeof raw.topN === "number" ? raw.topN : base.topN,
    filters: raw.filters ?? base.filters,
    compareMode: mode === "yoy" || mode === "custom" || mode === "none" ? mode : "none",
    comparePeriods: Array.isArray(raw.comparePeriods) ? raw.comparePeriods : [],
  };
}

export function syncLegacyMeasureFields(spec: ChartSpec) {
  const first = yMeasures(spec)[0];
  spec.valueField = first?.fieldId ?? null;
  spec.aggregation = first?.aggregation ?? "count";
}

export const defaultChartSpec = (): ChartSpec => ({
  chartType: "bar",
  categoryField: null,
  valueField: COUNT_FIELD_ID,
  aggregation: "count",
  measures: [defaultMeasure()],
  colorField: null,
  seriesLayout: "grouped",
  sortBy: "auto",
  sortDir: "desc",
  dateFrom: null,
  dateTo: null,
  topN: 20,
  filters: defaultDataFilters(),
  compareMode: "none",
  comparePeriods: [],
});

export const defaultChartStyle = (): ChartStyle => ({
  paletteId: "traffic",
  fillColors: ["#E53935", "#FB8C00", "#43A047"],
  strokeColor: "#1a1a1a",
  strokeWidth: 0,
  shadow: false,
  rounded: true,
  showGrid: true,
  showYAxis: true,
  showLabels: true,
  showPareto: true,
});
