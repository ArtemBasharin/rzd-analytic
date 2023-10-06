import { createSlice, current } from "@reduxjs/toolkit";
import { getAnalyze } from "../data-preprocessors/combiner";
import { getStackedArr } from "../data-preprocessors/getStackedArr";
// import { testArr } from "../test/test";
import testArr from "../data-preprocessors/dummyArr";
import { getCustomCalendar } from "../data-preprocessors/getCustomCalendar";
import { getSankeyArr } from "../data-preprocessors/getSankeyArr";
import { getUnitsList } from "../data-preprocessors/getUnitsList";

// const filterUnits = (arr, actionPayload) => {
//   let tempArr = new Set();
//   console.log(actionPayload);
//   arr.forEach((el) => tempArr.add(el));
//   if (actionPayload.checked) {
//     console.log("checked", actionPayload.value);
//     tempArr.add(actionPayload.value);
//   } else {
//     console.log("not checked", actionPayload.value);
//     tempArr.delete(actionPayload.value);
//   }
//   console.log("state.sankeyCheckedUnits", tempArr);
//   return Array.from(tempArr);
// };

let date = new Date();
let arrSource = testArr;
let initialMinvalue = 1;
let initialDaysInGroup = 1;
let initialStartDate = new Date(date.getFullYear(), 7, 1);
let initialEndDate = new Date(
  new Date(date.getFullYear(), date.getMonth(), 1) - 1
);

let initialToolPalette = {
  kind: "analyze",
  yearVisibility: true,
  minValueVisibility: false,
  periodVisibility: true,
  datePickerVisibility: false,
  unitsListVisibility: false,
};

let originToolPalette = {
  kind: "",
  yearVisibility: true,
  minValueVisibility: true,
  periodVisibility: true,
  datePickerVisibility: true,
  daysInGroupVisibility: true,
  unitsListVisibility: true,
};

let initialCustomCalendar = getCustomCalendar(
  initialDaysInGroup,
  initialStartDate,
  initialEndDate
);

let initialPattern = () => {
  let period = date.getMonth();
  if (period < 10) {
    return "0" + period;
  } else {
    return period.toString();
  }
};

let initialCheckedUnits = getUnitsList(arrSource);

let initialAnalyzeState = getAnalyze(
  arrSource,
  date.getFullYear() - 1,
  date.getFullYear(),
  initialPattern()
);

let initialStackedState = getStackedArr(
  arrSource,
  new Date(date.getFullYear() - 1, 0, 1),
  initialEndDate,
  initialCustomCalendar,
  initialCheckedUnits
);

let initialSankeyState = getSankeyArr(
  arrSource,
  initialStartDate,
  initialEndDate,
  initialMinvalue,
  initialCheckedUnits
);

////////////////////////////////////////////////////////////////////////////////
const filtersSlice = createSlice({
  name: "filters",
  initialState: {
    pageWidth: window.innerWidth,
    pageHeight: window.innerHeight,
    sourceState: [],
    minValue: initialMinvalue,
    daysInGroup: initialDaysInGroup,
    currentYear: date.getFullYear(),
    pastYear: date.getFullYear() - 1,
    dateStart: initialStartDate,
    // dateEnd: new Date(`${date.getFullYear()}-${date.getMonth()}-00T23:59:59`),
    dateEnd: initialEndDate,
    customCalendar: initialCustomCalendar,
    regexpPattern: initialPattern(),
    analyzeState: initialAnalyzeState,
    stackedArrState: initialStackedState,
    sankeyArrState: initialSankeyState,
    toolPalette: initialToolPalette,
    checkedUnits: initialCheckedUnits,
  },

  reducers: {
    setSourceState(state, action) {
      state.sourceState = action.payload;
      state.checkedUnits = getUnitsList(action.payload);
      console.log("state.sourceState", state.sourceState);
      console.log("state.checkedUnits", state.checkedUnits);

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
        state.customCalendar,
        state.checkedUnits
      );

      let sankeyArr = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.checkedUnits
      );

      state.sankeyArrState = { nodes: sankeyArr.nodes, links: sankeyArr.links };
      state.checkedUnits = sankeyArr.unitsList;
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
      console.log(state.minValue);
      state.minValue = state.minValue - 1;
      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue
      );
      console.log(state.sankeyArrState);
    },

    incrementDaysIngroup(state) {
      state.daysInGroup = state.daysInGroup + 1;
      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd
      );
      state.stackedArrState = getStackedArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.customCalendar
      );
      console.log("state.customCalendar", state.stackedArrState);
    },

    decrementDaysIngroup(state) {
      state.daysInGroup = state.daysInGroup - 1;
      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd
      );
      state.stackedArrState = getStackedArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.customCalendar
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
      console.log(pattern);
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
        state.toolPalette.datePickerVisibility = false;
        state.toolPalette.minValueVisibility = false;
        state.toolPalette.daysInGroupVisibility = false;
        state.toolPalette.unitsList = false;
        state.toolPalette.unitsListVisibility = false;
      }
      if (action.payload === "groupedChart") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.datePickerVisibility = false;
        state.toolPalette.daysInGroupVisibility = false;
        state.toolPalette.unitsListVisibility = false;
      }
      if (action.payload === "stacked") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = false;
        state.toolPalette.minValueVisibility = false;
        state.toolPalette.periodVisibility = false;
      }
      if (action.payload === "sankey") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = false;
        state.toolPalette.periodVisibility = false;
        state.toolPalette.daysInGroupVisibility = false;
      }
    },

    setCheckedUnits(state, action) {
      console.log(action.payload);

      const updateCheckedProperty = (array, searchValue, newCheckedValue) => {
        console.log(current(searchValue), newCheckedValue);
        const updatedArray = array.map((item) => {
          if (item.guiltyUnit === searchValue) {
            return {
              ...item,
              checked: newCheckedValue,
            };
          }
          return item;
        });

        return updatedArray;
      };

      state.checkedUnits = updateCheckedProperty(
        ...state.checkedUnits,
        action.payload.guiltyUnit,
        action.payload.checked
      );

      console.log("state.checkedUnits", state.checkedUnits);
      state.stackedArrState = getStackedArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
        current(state.checkedUnits)
      );
      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        current(state.checkedUnits)
      );
    },
  },
});

export default filtersSlice.reducer;
export const {
  increment,
  decrement,
  incrementDaysIngroup,
  decrementDaysIngroup,
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
