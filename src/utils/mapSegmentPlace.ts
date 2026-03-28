const DASH_SEP = " - ";

/** Временная метка: дефис внутри названия станции (не разделитель перегона). */
const INTERNAL_HYPHEN_SENTINEL = "\uE000";

/** Тире из Visio/Word (не U+002D) ломают split по « - » */
const UNICODE_DASHES =
  /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g;

/**
 * Приводит разделители участков маршрута к виду « - » (как в отчёте ASCII).
 * Дефисы внутри названия станции (КАМЕНЬ-НА-ОБИ, УСТЬ-ТАЛЬМ, РЕГ-4) не раздвигаются.
 */
export function normalizeDashesInRouteLabel(s: string): string {
  let t = s.trim();
  if (!t) return t;
  t = t.replace(UNICODE_DASHES, "-");
  for (;;) {
    const next = t.replace(
      /([\p{L}\p{N}])-([\p{L}\p{N}])/u,
      (m, a: string, b: string) => {
        if (/^\d$/.test(a) && /^\d$/.test(b)) return m;
        return `${a}${INTERNAL_HYPHEN_SENTINEL}${b}`;
      },
    );
    if (next === t) break;
    t = next;
  }
  t = t.replace(/\s*-\s*/g, " - ");
  t = t.replace(new RegExp(INTERNAL_HYPHEN_SENTINEL, "g"), "-");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/**
 * Сравнение названий станций на карте и в отчёте (как normalizeMapName в map.tsx).
 */
export function normalizeSegmentToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

/**
 * Нормализованные токены станций с дефисом в названии (не перегон «А - Б»).
 * Сопоставляются с хвостом place после последней запятой (как в отчёте).
 */
const KNOWN_HYPHEN_STATION_SUFFIX_TOKENS = new Set(
  [
    "КАМЕНЬ-НА-ОБИ",
    "УСТЬ-ТАЛЬМ",
    "УСТЬ-ТАЛЬМЕНСКАЯ",
    "ВОРОНЕЖ-МОЛ",
    "ЯЗЕВКА-СИБИР",
    "ЯЗЕВКА СИБИР",
  ].map((s) => normalizeSegmentToken(s)),
);

function reportPlaceSuffixToken(place: string): string {
  let t = place.trim().replace(UNICODE_DASHES, "-");
  const commaIdx = t.lastIndexOf(",");
  const suffix = (commaIdx >= 0 ? t.slice(commaIdx + 1) : t).trim();
  return normalizeSegmentToken(suffix);
}

/** Place — одна станция из списка с дефисом в имени (в данных не как перегон). */
function reportPlaceIsKnownHyphenatedStationOnly(place: string): boolean {
  return KNOWN_HYPHEN_STATION_SUFFIX_TOKENS.has(reportPlaceSuffixToken(place));
}

/**
 * Из поля места отчёта: «…, РЕГ-4, ПП 162 КМ - СРЕДНЕСИБ» → пара (ПП 162 КМ, СРЕДНЕСИБ).
 * Берётся последний « - »; слева от него — фрагмент после последней запятой (или вся строка).
 */
export function extractReportSegmentPair(place: string): [string, string] | null {
  if (reportPlaceIsKnownHyphenatedStationOnly(place)) return null;
  const trimmed = normalizeDashesInRouteLabel(place);
  const lastIdx = trimmed.lastIndexOf(DASH_SEP);
  if (lastIdx < 0) return null;
  const right = trimmed.slice(lastIdx + DASH_SEP.length).trim();
  if (!right) return null;
  let left = trimmed.slice(0, lastIdx).trim();
  const commaIdx = left.lastIndexOf(",");
  if (commaIdx >= 0) {
    left = left.slice(commaIdx + 1).trim();
  }
  if (!left) return null;
  return [left, right];
}

export function canonicalKeyFromPlace(place: string): string | null {
  const pair = extractReportSegmentPair(place);
  if (!pair) return null;
  const a = normalizeSegmentToken(pair[0]);
  const b = normalizeSegmentToken(pair[1]);
  if (!a || !b) return null;
  return [a, b].sort().join("\0");
}

/**
 * Канонический ключ пары только для подписи из двух станций (без префикса в отчёте).
 * Для строк из 3+ участков возвращает null — там не одна пара.
 */
export function canonicalPairFromPlainTwoStationLine(lineLabel: string): string | null {
  const norm = normalizeDashesInRouteLabel(lineLabel);
  const parts = norm
    .split(" - ")
    .map((p) => normalizeSegmentToken(p.trim()))
    .filter((s) => s.length > 0);
  if (parts.length !== 2) return null;
  return [...parts].sort().join("\0");
}

/** Не считать «общий префикс» для очень коротких обрезков названия */
const STATION_PREFIX_MIN = 8;

/** Леньки ↔ Ленки, опечатки в одну букву для длинных названий */
function stringsDifferByAtMostOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (a.length === b.length) {
      i++;
      j++;
    } else if (a.length > b.length) {
      i++;
    } else {
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * Одинаковый километраж поста: ПП 162 км, Путевой пост 162 км, пут.пост 162 км → после normalize.
 */
function bothPostKmBySameNumber(a: string, b: string): boolean {
  const digits = (s: string) => (s.match(/\d+/g) || []).join("");
  const da = digits(a);
  const db = digits(b);
  if (!da || da !== db || da.length < 2) return false;
  const postLike = (s: string) => /пп|пост|пут|км/.test(s);
  return postLike(a) && postLike(b);
}

/**
 * Совпадение токена станции на карте и в отчёте (разные сокращения и полные имена).
 */
export function stationTokensEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (bothPostKmBySameNumber(a, b)) return true;
  const [shorter, longer] =
    a.length <= b.length ? [a, b] : [b, a];
  if (
    shorter.length >= STATION_PREFIX_MIN &&
    longer.startsWith(shorter)
  ) {
    return true;
  }
  if (
    a.length >= 5 &&
    b.length >= 5 &&
    stringsDifferByAtMostOneEdit(a, b)
  ) {
    return true;
  }
  return false;
}

export function lineContainsStationToken(
  lineTokens: readonly string[],
  dataTok: string,
): boolean {
  return lineTokens.some((lt) => stationTokensEquivalent(lt, dataTok));
}
