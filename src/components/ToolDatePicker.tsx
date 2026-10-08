import React, { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { CSSTransition } from "react-transition-group";
import { TiArrowSortedDown } from "react-icons/ti";
import { useDispatch, useSelector as useReduxSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../redux/store";
import {
  setCurrentYear,
  setDateRange,
  setPattern,
} from "../redux/filtersSlice";

const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

const JANUARY_TO_OCTOBER = "01|02|03|04|05|06|07|08|09|10";

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next.getTime();
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59);
  return next.getTime();
};

function listDataYears(minMs: number, maxMs: number, currentYear: number) {
  const minYear = new Date(minMs).getFullYear();
  const maxYear = new Date(maxMs).getFullYear();
  const from = Number.isFinite(minYear) ? Math.min(minYear, currentYear) : currentYear;
  const to = Number.isFinite(maxYear) ? Math.max(maxYear, currentYear) : currentYear;
  const years: number[] = [];
  for (let year = from; year <= to; year += 1) years.push(year);
  return years.length > 0 ? years : [currentYear];
}

function isJanuaryThroughOctober(start: Date, end: Date, year: number) {
  return (
    start.getFullYear() === year &&
    end.getFullYear() === year &&
    start.getMonth() === 0 &&
    start.getDate() === 1 &&
    end.getMonth() === 9 &&
    end.getDate() === 31
  );
}

function CalendarIcon() {
  return (
    <svg className="date-range__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2zm13 8H4v10h16V10zM8 14h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"
      />
    </svg>
  );
}

const DateRangePicker = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dateStartMs = useSelector((state) => state.filters.dateStart);
  const dateEndMs = useSelector((state) => state.filters.dateEnd);
  const minCutoffMs = useSelector((state) => state.filters.minCutoffDate);
  const maxCutoffMs = useSelector((state) => state.filters.maxCutoffDate);
  const currentYear = useSelector((state) => state.filters.currentYear);

  const dateStart = new Date(dateStartMs);
  const dateEnd = new Date(dateEndMs);

  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const [month, setMonth] = useState(() => new Date(dateStartMs));

  const years = useMemo(
    () => listDataYears(minCutoffMs, maxCutoffMs, currentYear),
    [minCutoffMs, maxCutoffMs, currentYear],
  );
  const fromYear = years[0];
  const toYear = years[years.length - 1];
  const bounds = useMemo(
    () => ({
      fromDate: new Date(fromYear, 0, 1),
      toDate: new Date(toYear, 11, 31),
    }),
    [fromYear, toYear],
  );

  const canGoPrev = years.includes(currentYear - 1);
  const canGoNext = years.includes(currentYear + 1);
  const januaryOctoberActive = isJanuaryThroughOctober(
    dateStart,
    dateEnd,
    currentYear,
  );

  const close = () => {
    setIsOpen(false);
    setDraft(undefined);
  };

  const shiftYear = (year: number) => {
    setDraft(undefined);
    dispatch(setCurrentYear(year));
  };

  const handleToggle = () => {
    setDraft(undefined);
    setMonth(new Date(dateStartMs));
    setIsOpen((open) => !open);
  };

  const handleSelect = (_range: DateRange | undefined, selectedDay: Date) => {
    if (!draft?.from || draft.to) {
      setDraft({ from: selectedDay, to: undefined });
      return;
    }
    const from =
      draft.from.getTime() <= selectedDay.getTime() ? draft.from : selectedDay;
    const to =
      draft.from.getTime() <= selectedDay.getTime() ? selectedDay : draft.from;
    dispatch(setDateRange({ start: startOfDay(from), end: endOfDay(to) }));
    close();
  };

  const applyJanuaryToOctober = () => {
    dispatch(setPattern(JANUARY_TO_OCTOBER));
    close();
  };

  useEffect(() => {
    setMonth(new Date(dateStartMs));
  }, [dateStartMs]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: Event) => {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target)) return;
      close();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", handleClickOutside, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const popup = dropdownRef.current;
    if (!popup) return;
    popup.style.left = "0px";
    const rect = popup.getBoundingClientRect();
    const margin = 12;
    let shift = 0;
    if (rect.right > window.innerWidth - margin) {
      shift = window.innerWidth - margin - rect.right;
    }
    popup.style.left = `${shift}px`;
    const next = popup.getBoundingClientRect();
    if (next.left < margin) {
      popup.style.left = `${shift + (margin - next.left)}px`;
    }

    const row = popup.querySelector<HTMLElement>(".calendar-years");
    const chip = popup.querySelector<HTMLElement>(".calendar-years .is-selected");
    if (row && chip) {
      row.scrollLeft = chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2;
    }
  }, [isOpen, currentYear, years]);

  const shownRange: DateRange = draft?.from
    ? draft
    : { from: dateStart, to: dateEnd };

  return (
    <>
      <div className="year-switch" role="group" aria-label="Год">
        <button
          type="button"
          className="year-switch__btn"
          aria-label="Предыдущий год"
          disabled={!canGoPrev}
          onClick={() => shiftYear(currentYear - 1)}
        >
          ‹
        </button>
        <span className="year-switch__value">{currentYear}</span>
        <button
          type="button"
          className="year-switch__btn"
          aria-label="Следующий год"
          disabled={!canGoNext}
          onClick={() => shiftYear(currentYear + 1)}
        >
          ›
        </button>
      </div>

      <div className="list_container" ref={rootRef}>
        <button
          type="button"
          id="datepicker-btn"
          onClick={handleToggle}
          className="tools tools_text-button date-range__trigger"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-controls="date-range-popup"
        >
          <CalendarIcon />
          <span className="date-range__value">
            {format(dateStart, "dd.MM.yyyy")} — {format(dateEnd, "dd.MM.yyyy")}
          </span>
          <TiArrowSortedDown
            className={`date-range__chevron${isOpen ? " tools_dropdown-icon_rotate" : ""}`}
          />
        </button>
        <span className="input-label" id="datepicker-label">
          Даты
        </span>
        <CSSTransition
          in={isOpen}
          timeout={150}
          classNames="calendar-dropdown"
          nodeRef={dropdownRef}
          unmountOnExit
        >
          <div
            ref={dropdownRef}
            id="date-range-popup"
            className="calendar_container"
            role="dialog"
            aria-label="Выбор дат"
          >
            <button
              type="button"
              className={
                januaryOctoberActive
                  ? "calendar-preset is-active"
                  : "calendar-preset"
              }
              aria-pressed={januaryOctoberActive}
              onClick={applyJanuaryToOctober}
            >
              1 января — 31 октября
            </button>
            <div className="calendar-years" role="listbox" aria-label="Годы">
              {years.map((year) => (
                <button
                  type="button"
                  key={year}
                  role="option"
                  aria-selected={year === currentYear}
                  className={year === currentYear ? "is-selected" : undefined}
                  onClick={() => shiftYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
            {draft?.from && !draft.to && (
              <p className="calendar-hint">Выберите дату окончания</p>
            )}
            <DayPicker
              mode="range"
              selected={shownRange}
              onSelect={handleSelect}
              locale={ru}
              month={month}
              onMonthChange={setMonth}
              numberOfMonths={2}
              captionLayout="dropdown"
              fromYear={fromYear}
              toYear={toYear}
              fromDate={bounds.fromDate}
              toDate={bounds.toDate}
            />
          </div>
        </CSSTransition>
      </div>
    </>
  );
};

export default DateRangePicker;
