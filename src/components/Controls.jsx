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
} from "../redux/filtersSlice";
// import { getViolationsArray } from "./requests";
import axios from "axios";
import DateRangePicker from "./DatePicker";

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
  const pattern = useSelector((state) => state.filters.regexpPattern);
  const minValue = useSelector((state) => state.filters.minValue);
  const pastYear = useSelector((state) => state.filters.pastYear);
  const currentYear = useSelector((state) => state.filters.currentYear);
  const sourceState = useSelector((state) => state.filters.sourceState);
  // const stackedArrState = useSelector((state) => state.filters.stackedArrState);
  const dispatch = useDispatch();

  useEffect(() => {
    let params = {
      "fromYear": date.getFullYear() - 1,
      "toYear": date.getFullYear(),
    };

    axios
      .get("/violations", { params })
      .then(function (res) {
        // console.log("controls", res.data);
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

  const handleChangeMinValue = (event) => {
    dispatch(setMinValue(event.target.value));
  };

  const handleChangeFromYear = (event) => {
    dispatch(setPastYear(event.target.value));
  };

  const handleChangeToYear = (event) => {
    dispatch(setCurrentYear(event.target.value));
  };

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <FormControl
        sx={{ m: 2, minWidth: 100, color: "#fff", borderColor: "#fff" }}
      >
        <InputLabel
          id="select-fromyear-label"
          sx={{
            color: "#fff",
          }}
        >
          c
        </InputLabel>
        <Select
          labelId="select-fromyear-label"
          id="select-fromyear"
          value={pastYear}
          onChange={handleChangeFromYear}
          autoWidth
          label="Минимум"
          sx={{
            color: "#fff",
            minWidth: 50,
          }}
        >
          <MenuItem value={pastYear}></MenuItem>
          <MenuItem value={2013}>2013</MenuItem>
          <MenuItem value={2014}>2014</MenuItem>
          <MenuItem value={2015}>2015</MenuItem>
          <MenuItem value={2016}>2016</MenuItem>
          <MenuItem value={2017}>2017</MenuItem>
          <MenuItem value={2018}>2018</MenuItem>
          <MenuItem value={2019}>2019</MenuItem>
          <MenuItem value={2020}>2020</MenuItem>
          <MenuItem value={2021}>2021</MenuItem>
          <MenuItem value={2022}>2022</MenuItem>
        </Select>
      </FormControl>

      <FormControl
        sx={{ m: 2, minWidth: 100, color: "#fff", borderColor: "#fff" }}
      >
        <InputLabel
          id="select-toyear-label"
          sx={{
            color: "#fff",
          }}
        >
          до
        </InputLabel>
        <Select
          labelId="select-toyear-label"
          id="select-toyear"
          value={currentYear}
          onChange={handleChangeToYear}
          autoWidth
          label="Минимум"
          sx={{
            color: "#fff",
            minWidth: 50,
          }}
        >
          <MenuItem value={currentYear}></MenuItem>
          <MenuItem value={2013}>2013</MenuItem>
          <MenuItem value={2014}>2014</MenuItem>
          <MenuItem value={2015}>2015</MenuItem>
          <MenuItem value={2016}>2016</MenuItem>
          <MenuItem value={2017}>2017</MenuItem>
          <MenuItem value={2018}>2018</MenuItem>
          <MenuItem value={2019}>2019</MenuItem>
          <MenuItem value={2020}>2020</MenuItem>
          <MenuItem value={2021}>2021</MenuItem>
          <MenuItem value={2022}>2022</MenuItem>
          <MenuItem value={2023}>2023</MenuItem>
        </Select>
      </FormControl>

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
          <MenuItem value={minValue}></MenuItem>
          <MenuItem value={0}>0</MenuItem>
          <MenuItem value={1}>1</MenuItem>
          <MenuItem value={2}>2</MenuItem>
          <MenuItem value={3}>3</MenuItem>
          <MenuItem value={4}>4</MenuItem>
          <MenuItem value={5}>5</MenuItem>
          <MenuItem value={6}>6</MenuItem>
          <MenuItem value={7}>7</MenuItem>
          <MenuItem value={8}>8</MenuItem>
          <MenuItem value={9}>9</MenuItem>
          <MenuItem value={10}>10</MenuItem>
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
      <DateRangePicker />
    </div>
  );
}
