import { useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import SvgMap from "../utils/map";

interface RootState {
  filters: {
    reportStations: Array<{
      year: number;
      report: Array<{ place: string; totalDuration: number }>;
    }>;
  };
}

const InteractiveMap = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const stationsReport = useSelector(
    (state: RootState) => state.filters.reportStations
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

  return (
    <SvgMap
      ref={svgRef}
      segmentDurationByName={segmentDurationByName}
      stationDurationByName={stationDurationByName}
    />
  );
};

export default InteractiveMap;
