import { useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import SvgMap, { MapPlaceTooltipDetails } from "../utils/map";
import { cutDecimals } from "../utils/functions";

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

/** «Станция А - Станция Б» → «Станция Б - Станция А» */
function reverseSegmentPlace(place: string): string | null {
  const t = place.trim();
  const parts = t.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  return `${parts[1]} - ${parts[0]}`;
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
      if (typeof item.place === "string" && item.place.includes(" - ")) {
        const k = item.place.trim();
        raw[k] = Number(item.totalDuration) || 0;
      }
    }
    const out: Record<string, number> = {};
    for (const k of Object.keys(raw)) {
      const rev = reverseSegmentPlace(k);
      const back = rev && Object.prototype.hasOwnProperty.call(raw, rev)
        ? raw[rev]
        : 0;
      const sum = raw[k] + back;
      out[k] = sum;
      if (rev) out[rev] = sum;
    }
    return out;
  }, [currentYearReport]);

  const stationDurationByName = useMemo(() => {
    return currentYearReport.reduce<Record<string, number>>((acc, item) => {
      if (
        typeof item.place === "string" &&
        item.place.trim() !== "" &&
        !item.place.includes(" - ")
      ) {
        acc[item.place] = Number(item.totalDuration) || 0;
      }
      return acc;
    }, {});
  }, [currentYearReport]);

  const placeDetailsByName = useMemo(() => {
    const rawRows = new Map<string, Record<string, unknown>>();
    for (const item of currentYearReport) {
      const p = item.place;
      if (typeof p === "string" && p.trim()) {
        rawRows.set(p.trim(), item as Record<string, unknown>);
      }
    }

    const out: Record<string, MapPlaceTooltipDetails> = {};

    for (const [k, row] of rawRows) {
      if (k.includes(" - ")) continue;
      const details = rowToTooltipDetails(row);
      if (details) out[k] = details;
    }

    const segmentKeys = [...rawRows.keys()].filter((k) => k.includes(" - "));
    const doneSeg = new Set<string>();

    for (const k of segmentKeys) {
      if (doneSeg.has(k)) continue;
      const rowK = rawRows.get(k);
      if (!rowK) continue;
      const dK = rowToTooltipDetails(rowK);
      if (!dK) continue;

      const rev = reverseSegmentPlace(k);
      const rowR = rev ? rawRows.get(rev) : undefined;
      const dR = rowR ? rowToTooltipDetails(rowR) : null;

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
