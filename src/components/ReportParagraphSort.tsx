import { useEffect, useRef, useState } from "react";
import { TiArrowSortedDown } from "react-icons/ti";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import { setReportUnitSort } from "../redux/filtersSlice";
import { writeReportUnitSort } from "../utils/reportUnitSort";

const OPTIONS = [
  { id: "count", label: "Количество ТН" },
  { id: "delayed", label: "Задержано поездов" },
  { id: "duration", label: "Продолжительность задержек" },
] as const;

export type ReportUnitSort = (typeof OPTIONS)[number]["id"];

export default function ReportParagraphSort() {
  const dispatch = useDispatch();
  const kind = useSelector((s: RootState) => s.filters.toolPalette?.kind);
  const value = useSelector((s: RootState) => s.filters.reportUnitSort);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = OPTIONS.find((option) => option.id === value) ?? OPTIONS[0];

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

  if (kind !== "report") return null;

  return (
    <div className="list_container navbar-place-filter" ref={rootRef}>
      <button
        type="button"
        className="tools tools_text-button navbar-place-btn navbar-report-sort"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Сортировка абзацев подразделений"
        title={selected.label}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="input-label">Сортировка</span>
        <span className="navbar-place-value">{selected.label}</span>
        <TiArrowSortedDown
          className={`tools_dropdown-icon${isOpen ? "_rotate" : ""}`}
        />
      </button>
      {isOpen && (
        <ul className="list navbar-place-menu" role="listbox">
          {OPTIONS.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className={
                  option.id === selected.id
                    ? "navbar-place-option is-selected"
                    : "navbar-place-option"
                }
                onClick={() => {
                  writeReportUnitSort(option.id);
                  dispatch(setReportUnitSort(option.id));
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
