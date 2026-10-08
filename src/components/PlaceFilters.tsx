import { useEffect, useMemo, useRef, useState } from "react";
import { TiArrowSortedDown } from "react-icons/ti";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import { setRailwayFilter, setRegionFilter } from "../redux/filtersSlice";
import { collectPlaceOptions, filterViolationsByPlace, PlaceOption } from "../utils/placeParts";
import { startTime } from "../utils/config";

function PlaceSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: PlaceOption[];
  onChange: (next: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const choose = (next: string) => {
    onChange(next);
    setIsOpen(false);
  };

  return (
    <div className="list_container navbar-place-filter" ref={rootRef}>
      <button
        type="button"
        className="tools tools_text-button navbar-place-btn"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
        title={value || "Все"}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="input-label">{label}</span>
        <span className="navbar-place-value">{value || "Все"}</span>
        <TiArrowSortedDown
          className={`tools_dropdown-icon${isOpen ? "_rotate" : ""}`}
        />
      </button>
      {isOpen && (
        <ul className="list navbar-place-menu" role="listbox">
          <li>
            <button
              type="button"
              className={
                value
                  ? "navbar-place-option"
                  : "navbar-place-option is-selected"
              }
              onClick={() => choose("")}
            >
              Все
            </button>
          </li>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={
                  option.value === value
                    ? "navbar-place-option is-selected"
                    : "navbar-place-option"
                }
                onClick={() => choose(option.value)}
              >
                <span>{option.value}</span>
                <span className="navbar-place-count">{option.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PlaceFilters() {
  const dispatch = useDispatch();
  const sourceState = useSelector((s: RootState) => s.filters.sourceState);
  const railwayFilter = useSelector((s: RootState) => s.filters.railwayFilter);
  const regionFilter = useSelector((s: RootState) => s.filters.regionFilter);
  const dateStart = useSelector((s: RootState) => s.filters.dateStart);
  const dateEnd = useSelector((s: RootState) => s.filters.dateEnd);
  const options = useMemo(
    () => collectPlaceOptions(sourceState || [], railwayFilter),
    [sourceState, railwayFilter],
  );
  const periodIsEmpty = useMemo(() => {
    if (!railwayFilter && !regionFilter) return false;
    const filtered = filterViolationsByPlace(
      sourceState || [],
      railwayFilter,
      regionFilter,
    );
    return !filtered.some((row) => {
      const raw = row[startTime] ?? row.startTime;
      const time = new Date(raw as string).getTime();
      return time >= Number(dateStart) && time <= Number(dateEnd);
    });
  }, [sourceState, railwayFilter, regionFilter, dateStart, dateEnd]);

  return (
    <>
      <div className="navbar-place-filters">
        <PlaceSelect
          label="Железная дорога"
          value={railwayFilter}
          options={options.railways}
          onChange={(next) => dispatch(setRailwayFilter(next))}
        />
        <PlaceSelect
          label="Регион"
          value={regionFilter}
          options={options.regions}
          onChange={(next) => dispatch(setRegionFilter(next))}
        />
      </div>
      {periodIsEmpty && (
        <div className="place-filter-notice" role="status">
          В выбранном периоде нет нарушений с такой дорогой и регионом
        </div>
      )}
    </>
  );
}
