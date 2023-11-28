import { createSlice } from "@reduxjs/toolkit";
// import { current } from "@reduxjs/toolkit";
// import cloneDeep from "lodash.clonedeep";
import { getAnalyze } from "../data-preprocessors/combiner";
import { getStackedArr } from "../data-preprocessors/getStackedArr";
// import { getCustomCalendar } from "../data-preprocessors/getCustomCalendar";
import dummyArr from "../data-preprocessors/dummyArr";
import { getSankeyArr } from "../data-preprocessors/getSankeyArr";
import { getRidgelineArr } from "../data-preprocessors/getRidgelineArr";
import { getUnitsList } from "../data-preprocessors/getUnitsList";
import {
  getCutoffDates,
  getStartDate,
  updateCheckedProperty,
  getInitialPattern,
  getCustomCalendar,
} from "../config/functions";

let date = new Date();
let arrSource = dummyArr;
let initialMinvalue = 0;
let initialDaysInGroup = 1;
let cutoffDates = getCutoffDates(arrSource);
let initialEndDate = new Date(cutoffDates.max).setHours(23, 59, 59);
let initialStartDate = getStartDate(initialEndDate);
// console.log(initialEndDate, initialStartDate);

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

let initialPattern = getInitialPattern(initialEndDate);

let initialCheckedUnits = getUnitsList(
  arrSource,
  initialStartDate,
  initialEndDate,
  initialCustomCalendar
);

let initialAnalyzeState = getAnalyze(
  arrSource,
  date.getFullYear() - 1,
  date.getFullYear(),
  initialPattern
);

let initialStackedState = getStackedArr(
  arrSource,
  initialStartDate,
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

let initialRidgelineArrState = getRidgelineArr(
  arrSource,
  initialStartDate,
  initialEndDate,
  initialCustomCalendar,
  initialCheckedUnits
);

let initialLoaderShow = {
  analyze: false,
  grouped: false,
  stacked: false,
  sankey: false,
  ridgeline: false,
};

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
    dateEnd: initialEndDate,
    customCalendar: initialCustomCalendar,
    regexpPattern: initialPattern,
    analyzeState: initialAnalyzeState,
    stackedArrState: initialStackedState,
    sankeyArrState: initialSankeyState,
    ridgelineArrState: initialRidgelineArrState,
    toolPalette: initialToolPalette,
    stackedCheckList: initialCheckedUnits,
    sankeyCheckList: initialCheckedUnits,
    ridgelineCheckList: initialCheckedUnits,
    loaderShow: initialLoaderShow,
    minCutoffDate: cutoffDates.min,
    maxCutoffDate: cutoffDates.max,
    popup: {
      isOpened: false,
      status: "",
      message: "",
    },
    allCheckedCheckList: { stacked: true, sankey: true, ridgeline: true },
  },

  reducers: {
    setSourceState(state, action) {
      state.sourceState = action.payload;
      // console.log("state.sourceState", state.sourceState);
      let cutoffDates = getCutoffDates(state.sourceState);
      state.minCutoffDate = cutoffDates.min;
      state.maxCutoffDate = cutoffDates.max;
      state.dateStart = getStartDate(cutoffDates.max);
      state.dateEnd = cutoffDates.max;
      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd
      );

      state.regexpPattern = getInitialPattern(state.dateEnd);

      let unitsList = getUnitsList(
        action.payload,
        state.dateStart,
        state.dateEnd,
        state.customCalendar
      );
      // console.log(unitsList);
      state.stackedCheckList = unitsList;
      state.sankeyCheckList = unitsList;
      state.ridgelineCheckList = unitsList;

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
        state.stackedCheckList
      );

      let sankeyArr = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList
      );

      state.sankeyArrState = { nodes: sankeyArr.nodes, links: sankeyArr.links };
      // state.sankeyCheckList = sankeyArr.unitsList;

      state.ridgelineArrState = getRidgelineArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
        state.ridgelineCheckList
      );
      // console.log(state.ridgelineArrState);
    },

    increment(state) {
      state.minValue = state.minValue + 1;

      let sankeyArr = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList
      );

      state.sankeyArrState = { nodes: sankeyArr.nodes, links: sankeyArr.links };
      state.sankeyCheckList = sankeyArr.unitsList;
    },

    decrement(state) {
      if (state.minValue > 0) state.minValue = state.minValue - 1;

      let sankeyArr = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList
      );

      state.sankeyArrState = { nodes: sankeyArr.nodes, links: sankeyArr.links };
      state.sankeyCheckList = sankeyArr.unitsList;
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
        state.customCalendar,
        state.stackedCheckList
      );
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
        state.customCalendar,
        state.stackedCheckList
      );
    },

    setPattern(state, action) {
      state.regexpPattern = action.payload;
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
      if (action.payload >= state.dateEnd) {
        state.popup.isOpened = true;
        state.popup.message = "Начальная дата равна или больше конечной";
        state.popup.status = "fail";
        state.loaderShow = {
          ...state.loaderShow,
          stacked: true,
          sankey: true,
        };
      } else {
        state.loaderShow = initialLoaderShow;
        state.dateStart = action.payload;

        state.customCalendar = getCustomCalendar(
          state.daysInGroup,
          state.dateStart,
          state.dateEnd
        );

        let unitsList = getUnitsList(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.customCalendar
        );
        // console.log("unitsList", unitsList);
        state.stackedCheckList = unitsList;
        state.sankeyCheckList = unitsList;
        state.ridgelineCheckList = unitsList;
      }

      if (state.stackedCheckList.length > 0) {
        state.loaderShow = initialLoaderShow;
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

        state.ridgelineArrState = getRidgelineArr(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
          state.stackedCheckList
        );
      } else {
        state.loaderShow = {
          ...state.loaderShow,
          stacked: true,
          sankey: true,
        };
      }
    },

    setDateEnd(state, action) {
      if (action.payload <= state.dateStart) {
        state.popup.isOpened = true;
        state.popup.message = "Конечная дата равна или меньше начальной";
        state.popup.status = "fail";
        state.loaderShow = {
          ...state.loaderShow,
          stacked: true,
          sankey: true,
        };
      } else {
        state.loaderShow = initialLoaderShow;
        state.dateEnd = action.payload;

        state.customCalendar = getCustomCalendar(
          state.daysInGroup,
          state.dateStart,
          state.dateEnd
        );

        let unitsList = getUnitsList(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.customCalendar
        );
        // console.log("unitsList", unitsList);
        state.stackedCheckList = unitsList;
        state.sankeyCheckList = unitsList;
        state.ridgelineCheckList = unitsList;
      }

      if (state.stackedCheckList.length > 0) {
        state.loaderShow = initialLoaderShow;
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

        state.ridgelineArrState = getRidgelineArr(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
          state.stackedCheckList
        );
      } else {
        state.loaderShow = {
          ...state.loaderShow,
          stacked: true,
          sankey: true,
        };
      }
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
      if (action.payload === "ridgeline") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = false;
        state.toolPalette.periodVisibility = false;
      }
      if (action.payload === "report") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.daysInGroupVisibility = false;
      }
    },

    setStackedCheckList(state, action) {
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
      state.sankeyCheckList = updateCheckedProperty(
        state.sankeyCheckList,
        action.payload.guiltyUnit,
        action.payload.checked
      );

      if (state.sankeyCheckList.findIndex((el) => el.checked === true) === -1) {
        state.loaderShow = {
          ...state.loaderShow,
          sankey: true,
        };
      } else {
        state.loaderShow = {
          ...state.loaderShow,
          sankey: false,
        };

        state.sankeyArrState = getSankeyArr(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.sankeyCheckList
        );
        console.log(state.sankeyArrState);
      }
    },

    setRidgelineCheckList(state, action) {
      state.ridgelineCheckList = updateCheckedProperty(
        state.ridgelineCheckList,
        action.payload.guiltyUnit,
        action.payload.checked
      );

      if (
        state.ridgelineCheckList.findIndex((el) => el.checked === true) === -1
      ) {
        state.loaderShow = {
          ...state.loaderShow,
          ridgeline: true,
        };
      } else {
        state.loaderShow = {
          ...state.loaderShow,
          ridgeline: false,
        };

        state.ridgelineArrState = getRidgelineArr(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.ridgelineCheckList
        );
        // console.log(state.ridgelineArrState);
      }
    },

    invertCheckList(state, action) {
      if (action.payload === "stacked") {
        state.stackedCheckList.map((el) =>
          el.checked ? (el.checked = false) : (el.checked = true)
        );
        state.stackedArrState = getStackedArr(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
          state.stackedCheckList
        );
      }

      if (action.payload === "sankey") {
        state.sankeyCheckList.map((el) =>
          el.checked ? (el.checked = false) : (el.checked = true)
        );

        if (
          state.sankeyCheckList.findIndex((el) => el.checked === true) === -1
        ) {
          state.loaderShow = {
            ...state.loaderShow,
            sankey: true,
          };
        } else {
          state.loaderShow = {
            ...state.loaderShow,
            sankey: false,
          };
        }
        state.sankeyArrState = getSankeyArr(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.sankeyCheckList
        );
      }
    },

    checkAllCheckList(state, action) {
      if (action.payload === "stacked") {
        state.stackedCheckList.map((el) =>
          state.allCheckedCheckList.stacked
            ? (el.checked = false)
            : (el.checked = true)
        );
        state.allCheckedCheckList.stacked
          ? (state.allCheckedCheckList.stacked = false)
          : (state.allCheckedCheckList.stacked = true);

        state.stackedArrState = getStackedArr(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
          state.stackedCheckList
        );
      }

      if (action.payload === "sankey") {
        state.sankeyCheckList.map((el) =>
          state.allCheckedCheckList.sankey
            ? (el.checked = false)
            : (el.checked = true)
        );
        state.allCheckedCheckList.sankey
          ? (state.allCheckedCheckList.sankey = false)
          : (state.allCheckedCheckList.sankey = true);

        if (
          state.sankeyCheckList.findIndex((el) => el.checked === true) === -1
        ) {
          state.loaderShow = {
            ...state.loaderShow,
            sankey: true,
          };
        } else {
          state.loaderShow = {
            ...state.loaderShow,
            sankey: false,
          };
        }

        state.sankeyArrState = getSankeyArr(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.sankeyCheckList
        );
      }

      if (action.payload === "ridgeline") {
        state.ridgelineCheckList.map((el) =>
          state.allCheckedCheckList.ridgeline
            ? (el.checked = false)
            : (el.checked = true)
        );
        state.allCheckedCheckList.ridgeline
          ? (state.allCheckedCheckList.ridgeline = false)
          : (state.allCheckedCheckList.ridgeline = true);

        if (
          state.ridgelineCheckList.findIndex((el) => el.checked === true) === -1
        ) {
          state.loaderShow = {
            ...state.loaderShow,
            ridgeline: true,
          };
        } else {
          state.loaderShow = {
            ...state.loaderShow,
            ridgeline: false,
          };
        }

        state.ridgelineArrState = getRidgelineArr(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.ridgelineCheckList
        );
      }
    },

    setPopup(state, action) {
      state.popup.isOpened = action.payload;
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
  setRidgelineCheckList,
  setPopup,
  checkAllCheckList,
  invertCheckList,
} = filtersSlice.actions;
