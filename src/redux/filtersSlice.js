import { createSlice, current } from "@reduxjs/toolkit";
import { getAnalyze } from "../data-preprocessors/combiner";
import { getStackedArr } from "../data-preprocessors/getStackedArr";
// import { testArr } from "../test/test";
import testArr from "../data-preprocessors/dummyArr";
import { getCustomCalendar } from "../data-preprocessors/getCustomCalendar";
import { getSankeyArr } from "../data-preprocessors/getSankeyArr";

const filterUnits = (arr, actionPayload) => {
  let tempArr = new Set();
  console.log(actionPayload);
  arr.forEach((el) => tempArr.add(el));
  if (actionPayload.checked) {
    console.log("checked", actionPayload.value);
    tempArr.add(actionPayload.value);
  } else {
    console.log("not checked", actionPayload.value);
    tempArr.delete(actionPayload.value);
  }
  console.log("state.sankeyCheckedUnits", tempArr);
  return Array.from(tempArr);
};

let date = new Date();
let arrSource = testArr;
let initialStartDate = new Date(date.getFullYear(), 7, 1);

let initialEndDate = new Date(
  new Date(date.getFullYear(), date.getMonth(), 1) - 1
);

let initialCustomCalendar = getCustomCalendar(
  5,
  initialStartDate,
  initialEndDate
);

let initialToolPalette = {
  kind: "analyze",
  yearVisibility: "block",
  minValueVisibility: "none",
  periodVisibility: "block",
  datePickerVisibility: "none",
  unitsListVisibility: "none",
};

let originToolPalette = {
  kind: "",
  yearVisibility: "block",
  minValueVisibility: "block",
  periodVisibility: "block",
  datePickerVisibility: "block",
  daysInGroupVisibility: "block",
  unitsListVisibility: "block",
};

let initialPattern = () => {
  let period = date.getMonth();
  if (period < 10) {
    return "0" + period;
  } else {
    return period.toString();
  }
};

let initialMinvalue = 0;

let initialSankeyState = getSankeyArr(
  arrSource,
  initialStartDate,
  initialEndDate,
  initialMinvalue
);

const filtersSlice = createSlice({
  name: "filters",
  initialState: {
    pageWidth: window.innerWidth,
    pageHeight: window.innerHeight,
    sourceState: [],
    minValue: initialMinvalue,
    daysInGroup: 5,
    currentYear: date.getFullYear(),
    pastYear: date.getFullYear() - 1,
    dateStart: initialStartDate,
    // dateEnd: new Date(`${date.getFullYear()}-${date.getMonth()}-00T23:59:59`),
    dateEnd: initialEndDate,
    customCalendar: initialCustomCalendar,
    regexpPattern: initialPattern(),
    analyzeState: getAnalyze(
      arrSource,
      date.getFullYear() - 1,
      date.getFullYear(),
      initialPattern()
    ),
    stackedArrState: getStackedArr(
      arrSource,
      new Date(date.getFullYear() - 1, 0, 1),
      initialEndDate,
      initialCustomCalendar
    ),
    sankeyArrState: initialSankeyState,
    toolPalette: initialToolPalette,
    checkedUnits: initialSankeyState.uniqueUnitsToolPanel,
  },

  reducers: {
    setSourceState(state, action) {
      state.sourceState = action.payload;
      state.analyzeState = getAnalyze(
        state.sourceState,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );
      state.stackedArrState = getStackedArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        current(state.customCalendar)
      );
      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue
      );
      state.checkedUnits = state.sankeyArrState.uniqueUnitsToolPanel;
    },

    increment(state) {
      state.minValue = state.minValue + 1;
      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue
      );
    },

    decrement(state) {
      state.minValue = state.minValue - 1;
      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue
      );
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

    setDateStart(state, action) {
      if (action.payload) state.dateStart = action.payload;
    },

    setDateEnd(state, action) {
      if (action.payload) state.dateEnd = action.payload;
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

    setSankeyArrState(state) {
      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue
      );
    },

    setToolPalette(state, action) {
      state.toolPalette = originToolPalette;
      if (action.payload === "analyze") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.datePickerVisibility = "none";
        state.toolPalette.minValueVisibility = "none";
        state.toolPalette.daysInGroupVisibility = "none";
        state.toolPalette.unitsList = "none";
        state.toolPalette.unitsListVisibility = "none";
      }
      if (action.payload === "groupedChart") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.datePickerVisibility = "none";
        state.toolPalette.daysInGroupVisibility = "none";
        state.toolPalette.unitsListVisibility = "none";
      }
      if (action.payload === "stacked") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = "none";
        state.toolPalette.minValueVisibility = "none";
        state.toolPalette.periodVisibility = "none";
      }
      if (action.payload === "sankey") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = "none";
        state.toolPalette.periodVisibility = "none";
        state.toolPalette.daysInGroupVisibility = "none";
      }
    },

    setCheckedUnits(state, action) {
      console.log(action);
      state.checkedUnits = filterUnits([...state.checkedUnits], action.payload);
      console.log("state.checkedUnits", state.checkedUnits);
      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.checkedUnits
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
  stackedArrState,
  setDateStart,
  setDateEnd,
  setDaysInGroup,
  setCustomCalendar,
  setSankeyArrState,
  setToolPalette,
  setCheckedUnits,
} = filtersSlice.actions;
