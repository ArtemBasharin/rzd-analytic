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

/**
 * Подпись места с учётом фильтра.
 * Дорога выбрана — без дороги: «РЕГ-2, ИНСКАЯ».
 * РЕГ выбран — без дороги и РЕГ: «ИНСКАЯ».
 * Снимается только совпавший префикс. Строка без пары «дорога, РЕГ-N» не меняется.
 */
export function displayPlaceName(
  placeValue: unknown,
  railway: string,
  region: string,
): string {
  const text = placeValue == null ? "" : String(placeValue).trim();
  if (!text) return text;
  const railwayFilter = (railway || "").trim();
  const regionFilter = (region || "").trim().toUpperCase();
  if (!railwayFilter && !regionFilter) return text;

  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2 || !REGION_RE.test(parts[1])) return text;

  const placeRailway = parts[0];
  const placeRegion = parts[1].toUpperCase();

  if (regionFilter) {
    if (placeRegion !== regionFilter) return text;
    if (railwayFilter && placeRailway !== railwayFilter) return text;
    const rest = parts.slice(2).join(", ");
    return rest || text;
  }

  if (placeRailway !== railwayFilter) return text;
  return parts.slice(1).join(", ");
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
