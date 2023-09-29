import React, { useEffect, useRef, useState } from "react";
import "react-modern-calendar-datepicker/lib/DatePicker.css";
import { Calendar } from "react-modern-calendar-datepicker";

import {
  // Button,
  FormControl,
  // FormHelperText,
  InputAdornment,
  OutlinedInput,
} from "@mui/material";

import { useDispatch, useSelector } from "react-redux";
import {
  setDateStart,
  setDateEnd,
  setCustomCalendar,
  setSankeyArrState,
} from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";

const DateRangePicker = () => {
  const itemRef = useRef(null);

  const dateStart = useSelector((state) => state.filters.dateStart);
  const dateEnd = useSelector((state) => state.filters.dateEnd);
  const daysInGroup = useSelector((state) => state.filters.daysInGroup);
  const toolPalette = useSelector((state) => state.filters.toolPalette);
  const dispatch = useDispatch();

  const handleDateStart = () => {
    dispatch(setDateStart(dateStart));
    dispatch(setCustomCalendar());
    dispatch(setSankeyArrState());
    console.log(dateStart);
  };

  const handleDateEnd = () => {
    // dispatch(setDateEnd(dateEnd));
    // dispatch(setCustomCalendar());
    // dispatch(setSankeyArrState());
    console.log(dateEnd);
  };
  // const [selectedDay, setSelectedDay] = useState(null);

  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (event) => {
    if (itemRef.current && !itemRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [selectedDay, setSelectedDay] = useState(null);

  return (
    <>
      <div className="datePicker-container">
        <button onClick={handleToggle} className="tools tools_text-button">
          Дата
        </button>
        <CSSTransition
          in={isOpen}
          timeout={100}
          classNames="dropdown"
          // nodeRef={itemRef}
          unmountOnExit
        >
          <div
            className="list"
            // ref={itemRef}
            key={"responsive-calendarFrom-cont"}
          >
            <Calendar
              value={selectedDay}
              onChange={setSelectedDay}
              calendarClassName="responsive-calendar" // added this
              key={"responsive-calendarFrom"}
              shouldHighlightWeekends
            />
          </div>
        </CSSTransition>

        <span className="input-label">От:</span>
      </div>
      {/* <div className="datePicker-container">
        <DatePicker
          value={dateEnd}
          onChange={handleDateEnd}
          formatInputText={"дата"}
          key={"datepickerend"} // format value
          // inputClassName="my-custom-input" // custom class
          // shouldHighlightWeekends
        />
        <label className="input-label">До: </label>
      </div> */}

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
