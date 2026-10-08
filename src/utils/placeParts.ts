import { Violation } from "../types/violation";
import { place } from "./config";

/** Второй фрагмент «Место»: «Западно-Сибирская, РЕГ-2, ИНСКАЯ». */
const REGION_RE = /^РЕГ-\d+$/i;

export interface PlaceOption {
  value: string;
  count: number;
}

export interface PlaceParts {
  railway: string;
  region: string;
}

/**
 * «Западно-Сибирская, РЕГ-2, ИНСКАЯ» → дорога и регион.
 * Строка без пары «дорога, РЕГ-N» (только станция или перегон) не даёт ни того, ни другого.
 */
export function parsePlaceParts(placeValue: unknown): PlaceParts {
  const text = placeValue == null ? "" : String(placeValue).trim();
  if (!text) return { railway: "", region: "" };
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2 && REGION_RE.test(parts[1])) {
    return { railway: parts[0], region: parts[1].toUpperCase() };
  }
  return { railway: "", region: "" };
}

function byName(a: PlaceOption, b: PlaceOption) {
  return a.value.localeCompare(b.value, "ru");
}

/** Списки для navbar. Регионы сужаются выбранной дорогой. */
export function collectPlaceOptions(rows: Violation[], railway: string) {
  const railwayFilter = railway.trim();
  const railways = new Map<string, number>();
  const regions = new Map<string, number>();

  for (const row of rows) {
    const parts = parsePlaceParts(row[place]);
    if (parts.railway) {
      railways.set(parts.railway, (railways.get(parts.railway) || 0) + 1);
    }
    if (!parts.region) continue;
    if (railwayFilter && parts.railway !== railwayFilter) continue;
    regions.set(parts.region, (regions.get(parts.region) || 0) + 1);
  }

  return {
    railways: [...railways.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort(byName),
    regions: [...regions.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort(byName),
  };
}

/** Пустые фильтры оставляют исходный массив. */
export function filterViolationsByPlace(
  rows: Violation[],
  railway: string,
  region: string,
): Violation[] {
  const railwayFilter = (railway || "").trim();
  const regionFilter = (region || "").trim().toUpperCase();
  if (!railwayFilter && !regionFilter) return rows;
  return rows.filter((row) => {
    const parts = parsePlaceParts(row[place]);
    if (railwayFilter && parts.railway !== railwayFilter) return false;
    if (regionFilter && parts.region !== regionFilter) return false;
    return true;
  });
}
