import React from "react";
import DatePicker from "react-datepicker";

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
import { red } from "@mui/material/colors";

const DateRangePicker = () => {
  const dateStart = useSelector((state) => state.filters.dateStart);
  const dateEnd = useSelector((state) => state.filters.dateEnd);
  const daysInGroup = useSelector((state) => state.filters.daysInGroup);
  const toolPalette = useSelector((state) => state.filters.toolPalette);
  const dispatch = useDispatch();

  const handleDateChange = (date, isStart) => {
    if (isStart) {
      dispatch(setDateStart(date));
      dispatch(setCustomCalendar());
      dispatch(setSankeyArrState());
    } else {
      dispatch(setDateEnd(date));
      dispatch(setCustomCalendar());
      dispatch(setSankeyArrState());
    }
  };

  // const handleSubmit = () => {
  //   dispatch(setCustomCalendar());
  //   dispatch(setSankeyArrState());
  // };

  return (
    <>
      <div className="datePicker-container">
        <DatePicker
          selected={dateStart}
          onChange={(date) => handleDateChange(date, true)}
          selectsStart
          startDate={dateStart}
          endDate={dateEnd}
          placeholderText="Начало периода"
          // wrapperClassName="datePicker_input"
          isClearable={true}
          dateFormat="dd/MM/yy"
        />
        <label className="input-label">От: </label>
      </div>
      <div className="datePicker-container">
        <DatePicker
          selected={dateEnd}
          onChange={(date) => handleDateChange(date, false)}
          selectsEnd
          startDate={dateStart}
          endDate={dateEnd}
          minDate={dateStart}
          placeholderText="Начало периода"
          isClearable={true}
          dateFormat="dd/MM/yy"
          style={{ color: red }}
          // wrapperClassName="datePicker_input"
        />
        <label className="input-label">До: </label>
      </div>

      <FormControl
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
      </FormControl>
    </>
  );
};

export default DateRangePicker;
