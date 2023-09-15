import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/datePicker-container.css";
import {
  Button,
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
// import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";

const DateRangePicker = () => {
  const dateStart = useSelector((state) => state.filters.dateStart);
  const dateEnd = useSelector((state) => state.filters.dateEnd);
  const daysInGroup = useSelector((state) => state.filters.daysInGroup);
  const dispatch = useDispatch();
  console.log("DateRangePicker");

  // const [dateStart, setDateStart] = useState(null);
  // const [dateEnd, setDateEnd] = useState(null);

  const handleDateChange = (date, isStart) => {
    if (isStart) {
      console.log("isStart");
      dispatch(setDateStart(date));
    } else {
      dispatch(setDateEnd(date));
    }
  };

  const handleSubmit = () => {
    const dateRange = { start: dateStart, end: dateEnd };
    dispatch(setCustomCalendar());
    dispatch(setSankeyArrState());
    console.log("dateRange", dateRange);
  };

  console.log("datepicker", dateStart, dateEnd);

  return (
    <div className="datePicker-container">
      <div className="datePicker">
        <label>От: </label>
        <DatePicker
          selected={dateStart}
          onChange={(date) => handleDateChange(date, true)}
          selectsStart
          startDate={dateStart}
          endDate={dateEnd}
          placeholderText="Начало периода"
          className="datePicker"
          isClearable={true}
          dateFormat="dd/MM/yy"
        />
      </div>

      <div className="datePicker">
        <label>До: </label>
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
        />
      </div>
      <FormControl sx={{ m: 1, width: "15ch" }} variant="outlined">
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
      <Button onClick={handleSubmit} color="inherit">
        Ok
      </Button>
    </div>
  );
};

export default DateRangePicker;