import React, { useEffect } from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { useSelector, useDispatch } from "react-redux";
import {
  setPattern,
  setMinValue,
  setPastYear,
  setCurrentYear,
  setSourceState,
  increment,
  decrement,
} from "../redux/filtersSlice";
import axios from "axios";
import DateRangePicker from "./DatePicker";
import DropdownUnits from "./DropdownUnits";
import DropdownPastYear from "./DropdownPastYear";
import DropdownCurrentYear from "./DropdownCurrentYear";

let date = new Date();

const getPastMonth = () => {
  let monthCode = date.getMonth().toString();
  if (monthCode.length < 2) {
    return "0" + monthCode;
  } else {
    return monthCode;
  }
};

let period = getPastMonth();

export default function SelectAutoWidth() {
  const minValue = useSelector((state) => state.filters.minValue);
  const toolPalette = useSelector((state) => state.filters.toolPalette);

  const dispatch = useDispatch();

  useEffect(() => {
    let params = {
      "fromYear": date.getFullYear() - 1,
      "toYear": date.getFullYear(),
    };

    axios
      .get("/violations", { params })
      .then(function (res) {
        dispatch(setSourceState(res.data));
      })
      .catch(function (error) {
        console.log("axios.get error:", error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangePeriod = (event) => {
    period = event.target.value;
    dispatch(setPattern(period));
  };

  const handleIncrement = () => {
    dispatch(increment());
  };

  const handleDecrement = () => {
    dispatch(decrement());
  };

  return (
    <div className="controls-container">
      <DropdownUnits key={"dropdown-menu"} />

      {toolPalette.minValueVisibility === "block" && (
        <div className="tools divider">
          <button
            className="tools tools_square tools_minus"
            onClick={handleDecrement}
          ></button>
          <input
            className="tools_square "
            type="text"
            value={minValue}
            onChange={(e) => dispatch(setMinValue(Number(e.target.value)))}
          />
          <button
            className="tools tools_square tools_plus"
            onClick={handleIncrement}
          ></button>
          <span className="input-label">Скрыть менее</span>
        </div>
      )}

      {toolPalette.yearVisibility === "block" && <DropdownPastYear />}
      {toolPalette.yearVisibility === "block" && <DropdownCurrentYear />}

      <FormControl
        sx={{
          m: 0,
          minWidth: 100,
          color: "#fff",
          borderColor: "#fff",
          display: `${toolPalette.periodVisibility}`,
        }}
      >
        <InputLabel
          id="select-period-label"
          sx={{
            color: "#fff",
          }}
        >
          Период
        </InputLabel>
        <Select
          labelId="select-period-label"
          id="select-period"
          value={period}
          onChange={handleChangePeriod}
          autoWidth
          label="Период"
          sx={{
            color: "#fff",
            minWidth: 180,
          }}
        >
          <MenuItem value={period}>Прошлый месяц</MenuItem>
          <MenuItem value={"01"}>Январь</MenuItem>
          <MenuItem value={"02"}>Февраль</MenuItem>
          <MenuItem value={"1-2"}>2 месяца</MenuItem>
          <MenuItem value={"03"}>Март</MenuItem>
          <MenuItem value={"1-3"}>I квартал</MenuItem>
          <MenuItem value={"04"}>Апрель</MenuItem>
          <MenuItem value={"1-4"}>4 месяца</MenuItem>
          <MenuItem value={"05"}>Май</MenuItem>
          <MenuItem value={"1-5"}>5 месяцев</MenuItem>
          <MenuItem value={"06"}>Июнь</MenuItem>
          <MenuItem value={"1-6"}>6 месяцев</MenuItem>
          <MenuItem value={"4-6"}>II квартал</MenuItem>
          <MenuItem value={"07"}>Июль</MenuItem>
          <MenuItem value={"1-7"}>7 месяцев</MenuItem>
          <MenuItem value={"08"}>Август</MenuItem>
          <MenuItem value={"1-8"}>8 месяцев</MenuItem>
          <MenuItem value={"09"}>Сентябрь</MenuItem>
          <MenuItem value={"1-9"}>9 месяцев</MenuItem>
          <MenuItem value={"7-9"}>III квартал</MenuItem>
          <MenuItem value={"10"}>Октябрь</MenuItem>
          <MenuItem value={"1-10"}>10 месяцев</MenuItem>
          <MenuItem value={"11"}>Ноябрь</MenuItem>
          <MenuItem value={"1-11"}>11 месяцев</MenuItem>
          <MenuItem value={"12"}>Декабрь</MenuItem>
          <MenuItem value={"1-12"}>12 месяцев</MenuItem>
          <MenuItem value={"10-12"}>IV квартал</MenuItem>
        </Select>
      </FormControl>
      {toolPalette.datePickerVisibility !== "none" ? <DateRangePicker /> : ""}
    </div>
  );
}
