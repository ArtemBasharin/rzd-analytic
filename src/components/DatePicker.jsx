import React, { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ru } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { CSSTransition } from "react-transition-group";

import { useDispatch, useSelector } from "react-redux";
import { setDateStart, setDateEnd } from "../redux/filtersSlice";
// import cloneDeep from "lodash.clonedeep";

const DateRangePicker = () => {
  const calendarEndRef = useRef(null);
  const calendarStartRef = useRef(null);

  const dateStart = useSelector((state) => state.filters.dateStart);
  const dateEnd = useSelector((state) => state.filters.dateEnd);
  const minDate = new Date(useSelector((state) => state.filters.minCutoffDate));
  const maxDate = new Date(useSelector((state) => state.filters.maxCutoffDate));
  const dispatch = useDispatch();

  console.log(minDate);
  console.log(dateStart);
  console.log(maxDate);

  const handleDateStart = (e) => {
    console.log(e);
    dispatch(setDateStart(e));
    // dispatch(setCustomCalendar());
    // dispatch(setSankeyArrState());
    console.log(dateStart);
    setIsOpenStart(false);
  };

  const handleDateEnd = (e) => {
    console.log(e);
    dispatch(setDateEnd(e));
    // dispatch(setCustomCalendar());
    // dispatch(setSankeyArrState());
    console.log(dateEnd);
    setIsOpenEnd(false);
  };

  const [isOpenStart, setIsOpenStart] = useState(false);
  const handleToggleStart = () => {
    setIsOpenStart(!isOpenStart);
  };

  const [isOpenEnd, setIsOpenEnd] = useState(false);
  const handleToggleEnd = () => {
    setIsOpenEnd(!isOpenEnd);
  };

  const handleClickOutsideStart = (event) => {
    if (
      calendarStartRef.current &&
      !calendarStartRef.current.contains(event.target)
    ) {
      setIsOpenStart(false);
    }
  };

  const handleClickOutsideEnd = (event) => {
    if (
      calendarEndRef.current &&
      !calendarEndRef.current.contains(event.target)
    ) {
      setIsOpenEnd(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutsideStart);
    document.addEventListener("mousedown", handleClickOutsideEnd);

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideStart);
      document.removeEventListener("mousedown", handleClickOutsideEnd);
    };
  }, []);

  return (
    <>
      <div className="list_container" ref={calendarStartRef}>
        <button
          onClick={handleToggleStart}
          className="tools tools_text-button list_element_year "
        >
          {`${dateStart.getDate()}/${
            dateStart.getMonth() + 1
          }/${dateStart.getFullYear()}`}
        </button>
        <span className="input-label">От:</span>
        <CSSTransition
          in={isOpenStart}
          timeout={300}
          classNames="dropdown"
          // nodeRef={calendarStartRef}
          unmountOnExit
        >
          <DayPicker
            mode="single"
            selected={dateStart}
            onSelect={handleDateStart}
            key={"datepickerstart"}
            className="calendar_container"
            locale={ru}
            defaultMonth={dateStart}
            fromDate={minDate}
            toDate={maxDate}
          />
        </CSSTransition>
      </div>

      <div className="list_container" ref={calendarEndRef}>
        <button
          onClick={handleToggleEnd}
          className="tools tools_text-button list_element_year "
        >
          {`${dateEnd.getDate()}/${
            dateEnd.getMonth() + 1
          }/${dateEnd.getFullYear()}`}
        </button>
        <span className="input-label">До:</span>
        <CSSTransition
          in={isOpenEnd}
          timeout={300}
          classNames="dropdown"
          // nodeRef={calendarEndRef}
          unmountOnExit
        >
          <DayPicker
            mode="single"
            selected={dateEnd}
            onSelect={handleDateEnd}
            key={"datepickerend"}
            className="calendar_container"
            locale={ru}
            defaultMonth={dateEnd}
            fromDate={minDate}
            toDate={maxDate}
          />
        </CSSTransition>
      </div>

      {/* <FormControl
        sx={{
          m: 1,
          width: "15ch",
          display: `${toolPalette.daysInGroupVisibility}`,
        }}
        variant="outlined"
      >
        <OutlinedInput
          id="outlined-adornment-weight"
          value={daysInGroup}
          endAdornment={<InputAdornment position="end">сут</InputAdornment>}
          aria-describedby="outlined-weight-helper-text"
          inputProps={{
            "aria-label": "weight",
          }}
        />
      </FormControl> */}
    </>
  );
};

export default DateRangePicker;
