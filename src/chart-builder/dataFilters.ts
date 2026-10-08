import { Violation } from "../types/violation";
import {
  failCategory,
  failKind,
  failReason,
  freightDelayed,
  freightDuration,
  guiltyUnit,
  otherDelayed,
  otherDuration,
  passDelayed,
  passDuration,
  place,
  startTime as startTimeKey,
  subDelayed,
  subDuration,
} from "../utils/config";
import { ChartDataFilters, defaultDataFilters } from "./types";

const EMPTY = "не указано";

function cell(row: Violation, key: string): string {
  const raw = row[key];
  if (raw == null || raw === "") return EMPTY;
  return String(raw);
}

function totalDelayHours(row: Violation): number {
  const keys = [freightDuration, passDuration, subDuration, otherDuration];
  return keys.reduce((sum, k) => {
    const n = Number(row[k]);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function hasAnyDelay(row: Violation): boolean {
  const countKeys = [freightDelayed, passDelayed, subDelayed, otherDelayed];
  if (countKeys.some((k) => Number(row[k]) > 0)) return true;
  return totalDelayHours(row) > 0;
}

const LIST_FILTERS = [
  ["units", guiltyUnit],
  ["places", place],
  ["categories", failCategory],
  ["kinds", failKind],
  ["reasons", failReason],
] as const;

export type ListFilterKey = (typeof LIST_FILTERS)[number][0];

export interface DateWindow {
  dateFrom: number | null;
  dateTo: number | null;
}

export interface FilterOption {
  value: string;
  count: number;
}

export interface FilterFacetResult {
  options: Record<ListFilterKey, FilterOption[]>;
  /** Rows left after every filter, including delays. */
  matched: number;
  /** Rows inside the chart periods, before dimension and delay filters. */
  scoped: number;
}

function rowTimeMs(row: Violation): number | null {
  const raw = row[startTimeKey] ?? row.startTime;
  if (raw == null || raw === "") return null;
  const t = new Date(raw as string | number | Date).getTime();
  return Number.isFinite(t) ? t : null;
}

function inWindow(ms: number | null, window: DateWindow): boolean {
  if (window.dateFrom == null && window.dateTo == null) return true;
  if (ms == null) return false;
  if (window.dateFrom != null && ms < window.dateFrom) return false;
  if (window.dateTo != null && ms > window.dateTo) return false;
  return true;
}

/** A row is in scope when it falls into any chart period. Empty periods mean no date limit. */
function inPeriods(row: Violation, periods: DateWindow[]): boolean {
  if (periods.length === 0) return true;
  const ms = rowTimeMs(row);
  return periods.some((window) => inWindow(ms, window));
}

function passesDelay(row: Violation, filters: ChartDataFilters): boolean {
  if (filters.onlyWithDelays && !hasAnyDelay(row)) return false;
  if (filters.minDelayHours > 0 && totalDelayHours(row) < filters.minDelayHours)
    return false;
  return true;
}

function passesLists(
  row: Violation,
  filters: ChartDataFilters,
  skip?: ListFilterKey,
): boolean {
  for (const [key, field] of LIST_FILTERS) {
    if (key === skip) continue;
    if (!allows(filters[key], cell(row, field))) return false;
  }
  return true;
}

function sortOptions(options: FilterOption[], selected: string[]): FilterOption[] {
  const selectedSet = new Set(selected);
  return options.sort((a, b) => {
    const aSel = selectedSet.has(a.value) ? 0 : 1;
    const bSel = selectedSet.has(b.value) ? 0 : 1;
    if (aSel !== bSel) return aSel - bSel;
    if (b.count !== a.count) return b.count - a.count;
    return a.value.localeCompare(b.value, "ru");
  });
}

/**
 * Each list shows values left by every other list, the chart periods, and delay
 * limits. A list does not narrow itself. Selected values stay even at count 0.
 */
export function collectFilterOptions(
  rows: Violation[],
  filters?: Partial<ChartDataFilters> | null,
  periods: DateWindow[] = [],
): FilterFacetResult {
  const f = normalizeFilters(filters);
  const scopedRows = rows.filter((row) => inPeriods(row, periods));
  const base = scopedRows.filter((row) => passesDelay(row, f));

  const options: Record<ListFilterKey, FilterOption[]> = {
    units: [],
    places: [],
    categories: [],
    kinds: [],
    reasons: [],
  };

  for (const [key, field] of LIST_FILTERS) {
    const counts = new Map<string, number>();
    for (const row of base) {
      if (!passesLists(row, f, key)) continue;
      const value = cell(row, field);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    for (const value of f[key]) {
      if (!counts.has(value)) counts.set(value, 0);
    }
    options[key] = sortOptions(
      Array.from(counts, ([value, count]) => ({ value, count })),
      f[key],
    );
  }

  return {
    options,
    matched: applyDataFilters(scopedRows, f).length,
    scoped: scopedRows.length,
  };
}

export function normalizeFilters(
  filters?: Partial<ChartDataFilters> | null,
): ChartDataFilters {
  const base = defaultDataFilters();
  if (!filters) return base;
  return {
    units: Array.isArray(filters.units) ? filters.units : base.units,
    places: Array.isArray(filters.places) ? filters.places : base.places,
    categories: Array.isArray(filters.categories)
      ? filters.categories
      : base.categories,
    kinds: Array.isArray(filters.kinds) ? filters.kinds : base.kinds,
    reasons: Array.isArray(filters.reasons) ? filters.reasons : base.reasons,
    onlyWithDelays: Boolean(filters.onlyWithDelays),
    minDelayHours:
      typeof filters.minDelayHours === "number" && filters.minDelayHours > 0
        ? filters.minDelayHours
        : 0,
  };
}

function allows(selected: string[], value: string): boolean {
  return selected.length === 0 || selected.includes(value);
}

/** Apply dimension / delay filters (dates applied separately). */
export function applyDataFilters(
  rows: Violation[],
  filters: ChartDataFilters,
): Violation[] {
  const f = normalizeFilters(filters);
  const active =
    f.units.length ||
    f.places.length ||
    f.categories.length ||
    f.kinds.length ||
    f.reasons.length ||
    f.onlyWithDelays ||
    f.minDelayHours > 0;
  if (!active) return rows;

  return rows.filter((row) => {
    if (!allows(f.units, cell(row, guiltyUnit))) return false;
    if (!allows(f.places, cell(row, place))) return false;
    if (!allows(f.categories, cell(row, failCategory))) return false;
    if (!allows(f.kinds, cell(row, failKind))) return false;
    if (!allows(f.reasons, cell(row, failReason))) return false;
    return passesDelay(row, f);
  });
}
