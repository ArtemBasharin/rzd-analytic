import { useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import SvgMap, { MapPlaceTooltipDetails } from "../utils/map";
import { cutDecimals } from "../utils/functions";
import {
  canonicalKeyFromPlace,
  extractReportSegmentPair,
} from "../utils/mapSegmentPlace";

interface RootState {
  filters: {
    reportStations: Array<{
      year: number;
      report: Array<Record<string, unknown>>;
    }>;
  };
}

const PLACE_ROW_BASE_KEYS = new Set([
  "place",
  "count",
  "freightDelayed",
  "freightDuration",
  "passDelayed",
  "passDuration",
  "subDelayed",
  "subDuration",
  "otherDelayed",
  "otherDuration",
  "totalDelayed",
  "totalDuration",
]);

function extractUnitsFromPlaceRow(row: Record<string, unknown>) {
  const units: { name: string; delayed: number; duration: number }[] = [];
  for (const [k, v] of Object.entries(row)) {
    if (PLACE_ROW_BASE_KEYS.has(k)) continue;
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const o = v as Record<string, number>;
    if (typeof o.count !== "number") continue;
    const delayed =
      (o.freightDelayed || 0) +
      (o.passDelayed || 0) +
      (o.subDelayed || 0) +
      (o.otherDelayed || 0);
    const duration =
      (o.freightDuration || 0) +
      (o.passDuration || 0) +
      (o.subDuration || 0) +
      (o.otherDuration || 0);
    units.push({
      name: k,
      delayed: cutDecimals(delayed),
      duration: cutDecimals(duration),
    });
  }
  return units.sort((a, b) => b.delayed - a.delayed);
}

function rowToTooltipDetails(
  row: Record<string, unknown>,
): MapPlaceTooltipDetails | null {
  const place = row.place;
  if (typeof place !== "string" || !place.trim()) return null;
  const totalDelayed = Number(row.totalDelayed);
  const totalDuration = Number(row.totalDuration);
  return {
    placeLabel: place.trim(),
    totalDelayed: Number.isFinite(totalDelayed) ? cutDecimals(totalDelayed) : 0,
    totalDuration: Number.isFinite(totalDuration)
      ? cutDecimals(totalDuration)
      : 0,
    units: extractUnitsFromPlaceRow(row),
  };
}

/** Обратный порядок пары станций в подписи (как в отчёте / на карте). */
function reverseSegmentPlace(place: string): string | null {
  const p = extractReportSegmentPair(place);
  if (!p) return null;
  return `${p[1].trim()} - ${p[0].trim()}`;
}

function mergeUnitLists(
  u1: MapPlaceTooltipDetails["units"],
  u2: MapPlaceTooltipDetails["units"],
): MapPlaceTooltipDetails["units"] {
  const map = new Map<string, { delayed: number; duration: number }>();
  for (const u of u1) {
    map.set(u.name, { delayed: u.delayed, duration: u.duration });
  }
  for (const u of u2) {
    const ex = map.get(u.name);
    if (ex) {
      map.set(u.name, {
        delayed: cutDecimals(ex.delayed + u.delayed),
        duration: cutDecimals(ex.duration + u.duration),
      });
    } else {
      map.set(u.name, { delayed: u.delayed, duration: u.duration });
    }
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, delayed: v.delayed, duration: v.duration }))
    .sort((a, b) => b.delayed - a.delayed);
}

function mergeSegmentTooltipDetails(
  placeLabel: string,
  a: MapPlaceTooltipDetails,
  b: MapPlaceTooltipDetails,
): MapPlaceTooltipDetails {
  return {
    placeLabel,
    totalDelayed: cutDecimals(a.totalDelayed + b.totalDelayed),
    totalDuration: cutDecimals(a.totalDuration + b.totalDuration),
    units: mergeUnitLists(a.units, b.units),
  };
}

/** Несколько строк отчёта с одним и тем же `place` — суммируем итоги и подразделения. */
function mergeRowsToTooltipDetails(
  placeLabel: string,
  rows: ReadonlyArray<Record<string, unknown>>,
): MapPlaceTooltipDetails | undefined {
  let acc: MapPlaceTooltipDetails | undefined;
  for (const row of rows) {
    const d = rowToTooltipDetails(row);
    if (!d) continue;
    acc = acc
      ? mergeSegmentTooltipDetails(placeLabel, acc, d)
      : { ...d, placeLabel };
  }
  return acc;
}

const InteractiveMap = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const stationsReport = useSelector(
    (state: RootState) => state.filters.reportStations,
  );

  const currentYearReport = useMemo(() => {
    if (!stationsReport?.length) return [];
    const currentYear = Math.max(...stationsReport.map((item) => item.year));
    return (
      stationsReport.find((item) => item.year === currentYear)?.report ?? []
    );
  }, [stationsReport]);

  const segmentDurationByName = useMemo(() => {
    const raw: Record<string, number> = {};
    for (const item of currentYearReport) {
      const p = item.place;
      if (typeof p !== "string" || !p.trim()) continue;
      const k = p.trim();
      if (!extractReportSegmentPair(k)) continue;
      const v = Number(item.totalDuration) || 0;
      raw[k] = (raw[k] ?? 0) + v;
    }

    const canonSums = new Map<string, number>();
    for (const k of Object.keys(raw)) {
      const ck = canonicalKeyFromPlace(k);
      if (!ck) continue;
      canonSums.set(ck, (canonSums.get(ck) || 0) + raw[k]);
    }

    const out: Record<string, number> = {};
    for (const k of Object.keys(raw)) {
      const ck = canonicalKeyFromPlace(k);
      if (!ck) continue;
      const sum = canonSums.get(ck) ?? 0;
      out[k] = sum;
      const pr = extractReportSegmentPair(k);
      if (pr) {
        const revLabel = `${pr[1].trim()} - ${pr[0].trim()}`;
        out[revLabel] = sum;
      }
    }
    return out;
  }, [currentYearReport]);

  const stationDurationByName = useMemo(() => {
    return currentYearReport.reduce<Record<string, number>>((acc, item) => {
      const p = item.place;
      if (
        typeof p === "string" &&
        p.trim() !== "" &&
        !extractReportSegmentPair(p.trim())
      ) {
        const k = p.trim();
        const v = Number(item.totalDuration) || 0;
        acc[k] = (acc[k] ?? 0) + v;
      }
      return acc;
    }, {});
  }, [currentYearReport]);

  const placeDetailsByName = useMemo(() => {
    const rowsByPlace = new Map<string, Record<string, unknown>[]>();
    for (const item of currentYearReport) {
      const p = item.place;
      if (typeof p !== "string" || !p.trim()) continue;
      const k = p.trim();
      const list = rowsByPlace.get(k);
      if (list) list.push(item as Record<string, unknown>);
      else rowsByPlace.set(k, [item as Record<string, unknown>]);
    }

    const out: Record<string, MapPlaceTooltipDetails> = {};

    for (const [k, rows] of rowsByPlace) {
      if (extractReportSegmentPair(k)) continue;
      const merged = mergeRowsToTooltipDetails(k, rows);
      if (merged) out[k] = merged;
    }

    const segmentKeys = [...rowsByPlace.keys()].filter((k) =>
      extractReportSegmentPair(k),
    );
    const doneSeg = new Set<string>();

    for (const k of segmentKeys) {
      if (doneSeg.has(k)) continue;
      const rowsK = rowsByPlace.get(k);
      if (!rowsK?.length) continue;
      const dK = mergeRowsToTooltipDetails(k, rowsK);
      if (!dK) continue;

      const rev = reverseSegmentPlace(k);
      const rowsR = rev ? rowsByPlace.get(rev) : undefined;
      const dR =
        rev && rowsR?.length
          ? mergeRowsToTooltipDetails(rev, rowsR)
          : null;

      if (rev && dR) {
        out[k] = mergeSegmentTooltipDetails(k, dK, dR);
        out[rev] = mergeSegmentTooltipDetails(rev, dK, dR);
        doneSeg.add(k);
        doneSeg.add(rev);
      } else {
        out[k] = { ...dK, placeLabel: k };
        doneSeg.add(k);
        if (rev) {
          out[rev] = { ...dK, placeLabel: rev };
          doneSeg.add(rev);
        }
      }
    }

    return out;
  }, [currentYearReport]);

  return (
    <SvgMap
      ref={svgRef}
      segmentDurationByName={segmentDurationByName}
      stationDurationByName={stationDurationByName}
      placeDetailsByName={placeDetailsByName}
    />
  );
};

export default InteractiveMap;
