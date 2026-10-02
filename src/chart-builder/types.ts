export type ChartType = "bar" | "hbar" | "line" | "pie";
export type Aggregation = "sum" | "count" | "avg";
export type FieldKind = "dimension" | "measure";
export type CompareMode = "none" | "yoy" | "custom";

export interface FieldDef {
  id: string;
  key: string;
  label: string;
  kind: FieldKind;
  /** Special derived dimensions: month / day of start time */
  derived?: "month" | "day";
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

export interface ChartSpec {
  chartType: ChartType;
  categoryField: string | null;
  valueField: string | null;
  aggregation: Aggregation;
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
}

export interface ChartSeriesMeta {
  id: string;
  label: string;
}

export interface AggregatedPoint {
  label: string;
  /** Primary / first series value (pie, single-series charts) */
  value: number;
  /** All series values keyed by series id */
  values: Record<string, number>;
}

export interface AggregateResult {
  points: AggregatedPoint[];
  series: ChartSeriesMeta[];
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

export const defaultChartSpec = (): ChartSpec => ({
  chartType: "bar",
  categoryField: null,
  valueField: COUNT_FIELD_ID,
  aggregation: "count",
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
});
