import React, { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { CSSTransition } from "react-transition-group";
import { useDispatch, useSelector as useReduxSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../redux/store";
import { setDateStart, setDateEnd } from "../redux/filtersSlice";

const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

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

const DateRangePicker = () => {
  const calendarStartRef = useRef<HTMLDivElement>(null);
  const calendarEndRef = useRef<HTMLDivElement>(null);
  const dropdownStartRef = useRef<HTMLDivElement>(null);
  const dropdownEndRef = useRef<HTMLDivElement>(null);

  const dateStartMs = useSelector((state) => state.filters.dateStart);
  const dateEndMs = useSelector((state) => state.filters.dateEnd);
  const minCutoffMs = useSelector((state) => state.filters.minCutoffDate);
  const maxCutoffMs = useSelector((state) => state.filters.maxCutoffDate);

  const dateStart = new Date(dateStartMs);
  const dateEnd = new Date(dateEndMs);
  const minDate = new Date(minCutoffMs);
  const maxDate = new Date(maxCutoffMs);

  const dispatch = useDispatch();

  const [isOpenStart, setIsOpenStart] = useState(false);
  const [isOpenEnd, setIsOpenEnd] = useState(false);

  const handleDateStart = (date: Date | undefined) => {
    if (date) {
      dispatch(setDateStart(startOfDay(date)));
    }
    setIsOpenStart(false);
  };

  const handleDateEnd = (date: Date | undefined) => {
    if (date) {
      dispatch(setDateEnd(endOfDay(date)));
    }
    setIsOpenEnd(false);
  };

  const handleToggleStart = () => {
    setIsOpenStart((open) => !open);
    setIsOpenEnd(false);
  };

  const handleToggleEnd = () => {
    setIsOpenEnd((open) => !open);
    setIsOpenStart(false);
  };

  useEffect(() => {
    if (!isOpenStart && !isOpenEnd) return;

    const handleClickOutside = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (isOpenStart && !calendarStartRef.current?.contains(target)) {
        setIsOpenStart(false);
      }
      if (isOpenEnd && !calendarEndRef.current?.contains(target)) {
        setIsOpenEnd(false);
      }
    };

    // capture: true — срабатывает даже если ниже по дереву зовут stopPropagation
    document.addEventListener("pointerdown", handleClickOutside, true);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside, true);
    };
  }, [isOpenStart, isOpenEnd]);

  return (
    <>
      <div className="list_container" ref={calendarStartRef}>
        <button
          type="button"
          id="datepicker-btn-start"
          onClick={handleToggleStart}
          className="tools tools_text-button list_element_year "
          aria-expanded={isOpenStart}
          aria-haspopup="dialog"
          aria-labelledby="datepicker-label-start datepicker-btn-start"
        >
          {format(dateStart, "dd/MM/yyyy")}
        </button>
        <span className="input-label" id="datepicker-label-start">
          От:
        </span>
        <CSSTransition
          in={isOpenStart}
          timeout={150}
          classNames="calendar-dropdown"
          nodeRef={dropdownStartRef}
          unmountOnExit
        >
          <div ref={dropdownStartRef} className="calendar_container">
            <DayPicker
              mode="single"
              selected={dateStart}
              onSelect={handleDateStart}
              locale={ru}
              defaultMonth={dateStart}
              fromDate={minDate}
              toDate={dateEnd}
            />
          </div>
        </CSSTransition>
      </div>

      <div className="list_container" ref={calendarEndRef}>
        <button
          type="button"
          id="datepicker-btn-end"
          onClick={handleToggleEnd}
          className="tools tools_text-button list_element_year "
          aria-expanded={isOpenEnd}
          aria-haspopup="dialog"
          aria-labelledby="datepicker-label-end datepicker-btn-end"
        >
          {format(dateEnd, "dd/MM/yyyy")}
        </button>
        <span className="input-label" id="datepicker-label-end">
          До:
        </span>
        <CSSTransition
          in={isOpenEnd}
          timeout={150}
          classNames="calendar-dropdown"
          nodeRef={dropdownEndRef}
          unmountOnExit
        >
          <div ref={dropdownEndRef} className="calendar_container">
            <DayPicker
              mode="single"
              selected={dateEnd}
              onSelect={handleDateEnd}
              locale={ru}
              defaultMonth={dateEnd}
              fromDate={dateStart}
              toDate={maxDate}
            />
          </div>
        </CSSTransition>
      </div>
    </>
  );
};

export default DateRangePicker;
