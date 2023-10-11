import { createSlice, current } from "@reduxjs/toolkit";
import { getAnalyze } from "../data-preprocessors/combiner";
import { getStackedArr } from "../data-preprocessors/getStackedArr";
// import { testArr } from "../test/test";
import testArr from "../data-preprocessors/dummyArr";
import { getCustomCalendar } from "../data-preprocessors/getCustomCalendar";
import { getSankeyArr } from "../data-preprocessors/getSankeyArr";
import { getUnitsList } from "../data-preprocessors/getUnitsList";
import cloneDeep from "lodash.clonedeep";

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

let initialCheckedUnits = getUnitsList(
  arrSource,
  initialStartDate,
  initialEndDate
);

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
    stackedCheckList: initialCheckedUnits,
    sankeyCheckList: initialCheckedUnits,
  },

  reducers: {
    setSourceState(state, action) {
      state.sourceState = action.payload;

      state.stackedCheckList = getUnitsList(
        action.payload,
        state.dateStart,
        state.dateEnd
      );
      state.sankeyCheckList = getUnitsList(
        action.payload,
        state.dateStart,
        state.dateEnd
      );
      console.log("state.sankeyCheckList", state.sankeyCheckList);

      state.analyzeState = getAnalyze(
        state.sourceState,
        state.pastYear,
        state.currentYear,
        state.regexpPattern
      );

      let stackedArr = getStackedArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
        cloneDeep(state.stackedCheckList)
      );

      let sankeyArr = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList
      );

      state.stackedArrState = stackedArr;
      state.stackedCheckList = stackedArr.unitsList;
      state.sankeyArrState = { nodes: sankeyArr.nodes, links: sankeyArr.links };
      state.sankeyCheckList = sankeyArr.unitsList;
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
      // console.log(current(state.minValue));
      state.minValue = state.minValue - 1;
      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue
      );
      // console.log(state.sankeyArrState);
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

      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd
      );

      state.stackedCheckList = getUnitsList(
        state.sourceState,
        state.dateStart,
        state.dateEnd
      );

      state.stackedArrState = getStackedArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
        state.stackedCheckList
      );

      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList
      );
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
        state.minValue,
        state.sankeyCheckList
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

    setStackedCheckList(state, action) {
      const updateCheckedProperty = (array, searchValue, newCheckedValue) => {
        let clonedArr = cloneDeep(array);
        let updatedArray = clonedArr.map((item) => {
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

      state.stackedCheckList = updateCheckedProperty(
        state.stackedCheckList,
        action.payload.guiltyUnit,
        action.payload.checked
      );

      state.stackedArrState = getStackedArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
        state.stackedCheckList
      );
    },

    setSankeyCheckList(state, action) {
      const updateCheckedProperty = (array, searchValue, newCheckedValue) => {
        let cloneArr = cloneDeep(array);
        const updatedArray = cloneArr.map((item) => {
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

      state.sankeyCheckList = updateCheckedProperty(
        state.sankeyCheckList,
        action.payload.guiltyUnit,
        action.payload.checked
      );

      console.log("state.sankeyCheckList", state.sankeyCheckList);

      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList
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
  setStackedCheckList,
  setSankeyCheckList,
} = filtersSlice.actions;
