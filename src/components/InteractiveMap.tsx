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
    return currentYearReport.reduce<Record<string, number>>((acc, item) => {
      if (typeof item.place === "string" && item.place.includes(" - ")) {
        acc[item.place] = Number(item.totalDuration) || 0;
      }
      return acc;
    }, {});
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
    const out: Record<string, MapPlaceTooltipDetails> = {};
    for (const item of currentYearReport) {
      const details = rowToTooltipDetails(item as Record<string, unknown>);
      if (!details) continue;
      out[details.placeLabel] = details;
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
