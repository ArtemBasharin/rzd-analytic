import axios from "axios";
import { createSlice } from "@reduxjs/toolkit";
import { getAnalyze } from "../components/arrGenerators/combiner";
import { testArr } from "../test/test";
let date = new Date();
let arrSource = testArr;

axios.defaults.baseURL = "http://localhost:3001";

axios
  .get("/violations", {
    params: {
      "fromYear": date.getFullYear() - 1,
      "toYear": date.getFullYear(),
    },
  })
  .then(function (res) {
    console.log("Violations.length is:", res.data);
    // if (res.data.length > 0) {
    //   arrSource = res.data;
    // }
  })
  .catch(function (error) {
    console.log("axios.get error:", error);
  })
  .finally(function () {});

const filtersSlice = createSlice({
  name: "filters",
  initialState: {
    minValue: 0,
    currentYear: date.getFullYear(),
    pastYear: date.getFullYear() - 1,
    regexpPattern: "01",
    analyzeState: getAnalyze(
      arrSource,
      date.getFullYear() - 1,
      date.getFullYear(),
      "01"
    ),
  },
  reducers: {
    increment(state) {
      state.minValue = state.minValue + 1;
    },

    decrement(state) {
      state.minValue = state.minValue - 1;
    },

    setPattern(state, action) {
      let period = action.payload;
      let pattern = "";
      if (period.length < 3) {
        pattern = `${period}`;
      } else {
        let arr = period.split("-").map((el) => Number(el));
        let resultArr = [];
        for (let i = arr[0]; i <= arr[1]; ++i) {
          i < 10 ? resultArr.push("0" + i) : resultArr.push(i);
        }
        pattern = resultArr.join("|");
      }
      state.regexpPattern = pattern;
      state.analyzeState = getAnalyze(
        arrSource,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
    },

    setMinValue(state, action) {
      state.minValue = action.payload;
      state.analyzeState = getAnalyze(
        arrSource,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
    },

    setPastYear(state, action) {
      state.pastYear = action.payload;
      state.analyzeState = getAnalyze(
        arrSource,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
    },

    setCurrentYear(state, action) {
      state.currentYear = action.payload;
      state.analyzeState = getAnalyze(
        arrSource,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
    },
  },
});

export default filtersSlice.reducer;
export const {
  increment,
  decrement,
  setPattern,
  setMinValue,
  setAnalyzeState,
  setPastYear,
  setCurrentYear,
} = filtersSlice.actions;
