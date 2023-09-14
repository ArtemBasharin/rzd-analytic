import { createSlice, current } from "@reduxjs/toolkit";
import { getAnalyze } from "../data-preprocessors/combiner";
import { getStackedArr } from "../data-preprocessors/getStackedArr";
// import { testArr } from "../test/test";
import testArr from "../data-preprocessors/dummyArr";
import { getCustomCalendar } from "../data-preprocessors/getCustomCalendar";
import { getSankeyArr } from "../data-preprocessors/getSankeyArr";

let date = new Date();
let arrSource = testArr;
let initialStartDate = new Date(date.getFullYear() - 1, 0, 1);
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
    pageWidth: window.innerWidth,
    pageHeight: window.innerHeight,
    sourceState: [],
    minValue: 1,
    daysInGroup: 5,
    currentYear: date.getFullYear(),
    pastYear: date.getFullYear() - 1,
    dateStart: initialStartDate,
    // dateEnd: new Date(`${date.getFullYear()}-${date.getMonth()}-00T23:59:59`),
    dateEnd: initialEndDate,
    customCalendar: initialCustomCalendar,
    regexpPattern: "01",
    analyzeState: getAnalyze(
      arrSource,
      date.getFullYear() - 1,
      date.getFullYear(),
      "01"
    ),
    stackedArrState: getStackedArr(
      arrSource,
      new Date(date.getFullYear() - 1, 0, 1),
      initialEndDate,
      initialCustomCalendar
    ),
    sankeyArrState: getSankeyArr(arrSource, initialStartDate, initialEndDate),
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
      // console.log("setSourceState", state.sourceState);
      state.analyzeState = getAnalyze(
        state.sourceState,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
      // console.log("customCalendar", state.customCalendar);
      state.stackedArrState = getStackedArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        current(state.customCalendar)
      );
      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd
      );
      console.log("current(state.sankeyArrState)", state.sankeyArrState);
    },

    setDateStart(state, action) {
      if (action.payload) state.dateStart = action.payload;
      // console.log("setDateStart", state.customCalendar);
      state.stackedArrState = getStackedArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.customCalendar
      );
    },

    setDateEnd(state, action) {
      if (action.payload) state.dateEnd = action.payload;
      // console.log("setDateEnd", state.customCalendar);
      state.stackedArrState = getStackedArr(
        state.sourceState,
        state.dateStart,
        action.payload,
        state.customCalendar
      );
    },

    setCustomCalendar(state) {
      // console.log("setCustomCalendar", state.customCalendar);
      // console.log("setCustomCalendar state.daysInGroup", state.daysInGroup);
      // console.log("setCustomCalendar state.dateStart", state.dateStart);
      // console.log("setCustomCalendar state.dateEnd", state.dateEnd);
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
      // console.log("setDaysInGroup", state.customCalendar);
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
  stackedArrState,
  setDateStart,
  setDateEnd,
  setDaysInGroup,
  setCustomCalendar,
} = filtersSlice.actions;
