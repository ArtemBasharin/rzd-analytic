import { createSlice } from "@reduxjs/toolkit";
import { getAnalyze } from "../data-preprocessors/combiner";
import { getArrDurationsPerDay } from "../data-preprocessors/getStackedArr";
// import { testArr } from "../test/test";
import testArr from "../data-preprocessors/dummyArr";
import { getCustomCalendar } from "../data-preprocessors/getCustomCalendar";

let date = new Date();
let arrSource = testArr;
let initialStartDate = new Date(date.getFullYear(), 0, 1);
let initialEndDate = new Date(
  new Date(date.getFullYear(), date.getMonth(), 1) - 1
);
let initialCustomCalendar = getCustomCalendar(
  5,
  initialStartDate,
  initialEndDate
);

const filtersSlice = createSlice({
  name: "filters",
  initialState: {
    pageWidth: 1600,
    pageHeight: window.height,
    sourceState: [],
    minValue: 1,
    currentYear: date.getFullYear(),
    pastYear: date.getFullYear() - 1,
    dateStart: initialStartDate,
    // dateEnd: new Date(`${date.getFullYear()}-${date.getMonth()}-00T23:59:59`),
    dateEnd: initialEndDate,
    regexpPattern: "01",
    analyzeState: getAnalyze(
      arrSource,
      date.getFullYear() - 1,
      date.getFullYear(),
      "01"
    ),
    customCalendar: initialCustomCalendar,
    originSrcState: getArrDurationsPerDay(
      arrSource,
      new Date(date.getFullYear() - 1, 0, 1),
      initialEndDate,
      initialCustomCalendar
    ),
    daysInGroup: 5,
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
        state.sourceState,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
    },

    setMinValue(state, action) {
      state.minValue = action.payload;
      state.analyzeState = getAnalyze(
        state.sourceState,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
    },

    setPastYear(state, action) {
      state.pastYear = action.payload;
      state.analyzeState = getAnalyze(
        state.sourceState,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
    },

    setCurrentYear(state, action) {
      state.currentYear = action.payload;
      state.analyzeState = getAnalyze(
        state.sourceState,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
    },

    setSourceState(state, action) {
      state.sourceState = action.payload;
      state.analyzeState = getAnalyze(
        state.sourceState,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
      // console.log("state.dateStart", state.dateStart);
      state.originSrcState = getArrDurationsPerDay(
        state.sourceState,
        state.dateStart,
        state.dateEnd
      );
    },

    setDateStart(state, action) {
      if (action.payload) state.dateStart = action.payload;
      // console.log("setDateStart action.payload", action.payload);
      state.originSrcState = getArrDurationsPerDay(
        state.sourceState,
        state.dateStart,
        state.dateEnd
      );
    },

    setDateEnd(state, action) {
      state.dateEnd = action.payload;
      // console.log(action.payload);
      state.originSrcState = getArrDurationsPerDay(
        state.sourceState,
        state.dateStart,
        action.payload
      );
    },

    setCustomCalendar(state) {
      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd
      );
    },

    setDaysInGroup(state, action) {
      state.daysInGroup = action.payload;
      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd
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
  setSourceState,
  originSrcState,
  setDateStart,
  setDateEnd,
  setDaysInGroup,
  setCustomCalendar,
} = filtersSlice.actions;
