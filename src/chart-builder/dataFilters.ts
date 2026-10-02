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

/** Unique sorted values for a dimension column (within optional date window). */
export function uniqueFieldValues(
  rows: Violation[],
  key: string,
  limit = 200,
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    set.add(cell(row, key));
    if (set.size > limit * 2) break;
  }
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b, "ru"))
    .slice(0, limit);
}

export function collectFilterOptions(rows: Violation[]) {
  return {
    units: uniqueFieldValues(rows, guiltyUnit),
    places: uniqueFieldValues(rows, place),
    categories: uniqueFieldValues(rows, failCategory),
    kinds: uniqueFieldValues(rows, failKind),
    reasons: uniqueFieldValues(rows, failReason),
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
    if (f.onlyWithDelays && !hasAnyDelay(row)) return false;
    if (f.minDelayHours > 0 && totalDelayHours(row) < f.minDelayHours)
      return false;
    return true;
  });
}
