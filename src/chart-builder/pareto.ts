import { AggregatedPoint, ChartSeriesMeta, SeriesLayout } from "./types";

export const PARETO_THRESHOLD = 80;

export interface ParetoStep {
  label: string;
  amount: number;
  /** Running share of the shown categories, 0–100. */
  cumulative: number;
}

export interface ParetoResult {
  steps: ParetoStep[];
  /** First category whose cumulative share reaches the threshold, or -1. */
  hitIndex: number;
  total: number;
}

/**
 * Series that make up one category's contribution.
 * Stacked and color splits are summed. Grouped periods and extra measures
 * follow the leading series so different units are not added together.
 */
export function paretoSeries(
  series: ChartSeriesMeta[],
  layout: SeriesLayout,
): ChartSeriesMeta[] {
  const bars = series.filter((s) => s.mark === "bar");
  const lines = series.filter((s) => s.mark === "line");
  if (bars.length && lines.length) {
    if (bars.length === 1) return bars;
    const current = bars.find((s) => s.id === "current");
    return [current ?? bars[0]];
  }
  const y = series.filter((s) => (s.axis ?? "y") !== "y2");
  if (y.length <= 1) return y;
  if (layout === "stacked" || layout === "normalized") return y;
  if (y.every((s) => s.id.startsWith("color:"))) return y;
  const current = y.find((s) => s.id === "current");
  return [current ?? y[0]];
}

/** Absolute category contribution, stored before share-normalization. */
export function assignParetoWeights(
  points: AggregatedPoint[],
  series: ChartSeriesMeta[],
  layout: SeriesLayout,
) {
  const used = paretoSeries(series, layout);
  for (const point of points) {
    let weight = 0;
    for (const s of used) {
      const raw = point.values?.[s.id];
      if (typeof raw === "number" && Number.isFinite(raw)) weight += Math.max(0, raw);
    }
    point.weight = weight;
  }
}

function seriesAmount(point: AggregatedPoint, series: ChartSeriesMeta[]): number {
  if (typeof point.weight === "number" && Number.isFinite(point.weight)) {
    return Math.max(0, point.weight);
  }
  return series.reduce((sum, s) => {
    const raw = point.values?.[s.id];
    const n = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    return sum + Math.max(0, n);
  }, 0);
}

export function paretoOf(
  points: AggregatedPoint[],
  series: ChartSeriesMeta[],
): ParetoResult {
  const amounts = points.map((point) => seriesAmount(point, series));
  const total = amounts.reduce((sum, n) => sum + n, 0);
  let acc = 0;
  let hitIndex = -1;
  const steps = points.map((point, index) => {
    acc += amounts[index];
    const cumulative = total === 0 ? 0 : (acc / total) * 100;
    if (hitIndex < 0 && cumulative >= PARETO_THRESHOLD - 0.05) hitIndex = index;
    return { label: point.label, amount: amounts[index], cumulative };
  });
  return { steps, hitIndex, total };
}

export function formatParetoPct(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10) / 10;
  return rounded.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

export function paretoCaption(result: ParetoResult): string | null {
  if (result.total <= 0 || result.hitIndex < 0) return null;
  const step = result.steps[result.hitIndex];
  const pct = formatParetoPct(step.cumulative);
  const name = step.label?.trim() || "без названия";
  if (result.hitIndex === 0) {
    return `Порог 80% уже на 1-й категории «${name}»: накоплено ${pct}%`;
  }
  return `80% накопления — «${name}», ${result.hitIndex + 1}-я из ${result.steps.length} (${pct}%)`;
}
