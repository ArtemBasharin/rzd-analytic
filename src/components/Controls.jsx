import React, { useState } from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";

import { useSelector, useDispatch } from "react-redux";
import { addTodo } from "../redux/toolkitSlice";

export let periodValue = "";
let period = "";
export default function SelectAutoWidth() {
  const todos = useSelector((state) => state.toolkit.todos);
  const dispatch = useDispatch();

  const handleChange = (event) => {
    period = event.target.value;

    if (period.length < 3) {
      periodValue = `${period}`;
    } else {
      let tempArr = period.split("-").map((el) => Number(el));
      let resultArr = [];
      for (let i = tempArr[0]; i <= tempArr[1]; ++i) {
        i < 10 ? resultArr.push("0" + i) : resultArr.push(i);
      }
      periodValue = resultArr.join("|");
    }
    dispatch(addTodo(periodValue));
  };

  console.log("var period", periodValue);

  return (
    <div>
      <FormControl
        sx={{ m: 2, minWidth: 100, color: "#fff", borderColor: "#fff" }}
      >
        <InputLabel
          id="demo-simple-select-autowidth-label"
          sx={{
            color: "#fff",
          }}
        >
          Период
        </InputLabel>
        <Select
          labelId="demo-simple-select-autowidth-label"
          id="demo-simple-select-autowidth"
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
