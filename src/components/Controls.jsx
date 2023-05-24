import React from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { useSelector, useDispatch } from "react-redux";
import { setPattern, setMinValue } from "../redux/filtersSlice";

export let periodValue = "01";
let period = "01";
export default function SelectAutoWidth() {
  const pattern = useSelector((state) => state.filters.regexpPattern);
  const minValue = useSelector((state) => state.filters.minValue);
  const dispatch = useDispatch();

  const handleChange = (event) => {
    period = event.target.value;
    periodValue = period;
    dispatch(setPattern(period));
  };
  console.log("pattern", pattern);

  const handleChangeMinValue = (event) => {
    dispatch(setMinValue(event.target.value));
  };
  console.log("minValue", minValue);

  return (
    <div style={{ display: "flex" }}>
      <FormControl
        sx={{ m: 2, minWidth: 100, color: "#fff", borderColor: "#fff" }}
      >
        <InputLabel
          id="select-minvalue-label"
          sx={{
            color: "#fff",
          }}
        >
          Минимум
        </InputLabel>
        <Select
          labelId="select-minvalue-label"
          id="select-minvalue"
          value={minValue}
          onChange={handleChangeMinValue}
          autoWidth
          label="Минимум"
          sx={{
            color: "#fff",
            minWidth: 50,
          }}
        >
          <MenuItem value="0">
            <em>Не выбрано</em>
          </MenuItem>
          <MenuItem value={0}>0</MenuItem>
          <MenuItem value={1}>1</MenuItem>
          <MenuItem value={2}>2</MenuItem>
          <MenuItem value={3}>3</MenuItem>
          <MenuItem value={4}>4</MenuItem>
          <MenuItem value={5}>5</MenuItem>
        </Select>
      </FormControl>
      <FormControl
        sx={{ m: 2, minWidth: 100, color: "#fff", borderColor: "#fff" }}
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
          onChange={handleChange}
          autoWidth
          label="Период"
          sx={{
            color: "#fff",
            minWidth: 120,
          }}
        >
          <MenuItem value="">
            <em>Не выбрано</em>
          </MenuItem>
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
    </div>
  );
}
