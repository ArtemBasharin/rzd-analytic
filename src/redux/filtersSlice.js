import { createSlice, current } from "@reduxjs/toolkit";
import { getAnalyze } from "../data-preprocessors/combiner";
import { getStackedArr } from "../data-preprocessors/getStackedArr";
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
  getPeriodDatesFromRegex,
  updateChartProperty,
} from "../utils/functions";
import { getReportArr } from "../data-preprocessors/getReportArr";
import { getSumLineArr } from "../data-preprocessors/getSumLineArr";
import { initialChartCheckList } from "../utils/initialChartCheckList";
// import { getRaceArr } from "../data-preprocessors/getRaceArr";

let date = new Date();
let arrSource = dummyArr(date.getFullYear() - 1, date.getFullYear());
let initialMinvalue = 0;
let initialDaysInGroup = 1;
let cutoffDates = getCutoffDates(arrSource);
let initialEndDate = new Date(cutoffDates.max).setHours(23, 59, 59);
let initialStartDate = getStartDate(initialEndDate);

// console.log(new Date(initialEndDate), new Date(initialStartDate));

let initialToolPalette = {
  kind: "analyze",
  yearVisibility: true,
  minValueVisibility: false,
  periodVisibility: true,
  datePickerVisibility: true,
  unitsListVisibility: false,
  sumLineVisibility: false,
};

let originToolPalette = {
  kind: "",
  yearVisibility: true,
  minValueVisibility: true,
  periodVisibility: true,
  datePickerVisibility: true,
  daysInGroupVisibility: true,
  unitsListVisibility: true,
  sumLineVisibility: true,
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
  initialPattern,
  initialStartDate,
  initialEndDate
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

let initialSumLineArrState = [];
// getSumLineArr(arrSource, initialCustomCalendar, initialCheckedUnits);

// let initialraceArrState = getRaceArr(
//   arrSource,
//   initialStartDate,
//   initialEndDate,
//   initialCheckedUnits
// );

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
    currentYear: new Date(initialEndDate).getFullYear(),
    pastYear: new Date(initialEndDate).getFullYear() - 1,
    dateStart: initialStartDate,
    dateEnd: initialEndDate,
    customCalendar: initialCustomCalendar,
    regexpPattern: initialPattern,
    analyzeState: initialAnalyzeState,
    stackedArrState: initialStackedState,
    sankeyArrState: initialSankeyState,
    ridgelineArrState: initialRidgelineArrState,
    sumLineArrState: initialSumLineArrState,
    // raceArrState: initialraceArrState,
    toolPalette: initialToolPalette,
    stackedCheckList: initialCheckedUnits,
    sankeyCheckList: initialCheckedUnits,
    ridgelineCheckList: initialCheckedUnits,
    sumLineCheckList: initialCheckedUnits,
    chartCheckList: initialChartCheckList(),
    loaderShow: initialLoaderShow,
    minCutoffDate: cutoffDates.min,
    maxCutoffDate: cutoffDates.max,
    popup: {
      isOpened: false,
      status: "",
      message: "",
    },
    allCheckedCheckList: {
      stacked: true,
      sankey: true,
      ridgeline: true,
      sumline: true,
      charts: true,
    },
    reportSrcState: [],
  },

  reducers: {
    setSourceState(state, action) {
      state.sourceState = action.payload;
      // .map((el) => {
      //   let date = new Date(el["Начало отказа"]);
      //   date.setHours(date.getHours());
      //   el["Начало отказа"] = date.toISOString();
      //   return el;
      // });
      console.log("state.sourceState", action.payload);
      let cutoffDates = getCutoffDates(state.sourceState);
      state.minCutoffDate = cutoffDates.min;
      state.maxCutoffDate = cutoffDates.max;
      console.log(new Date(cutoffDates.min), new Date(cutoffDates.max));
      state.dateStart = getStartDate(cutoffDates.max);
      state.dateEnd = cutoffDates.max;
      state.currentYear = new Date(state.dateEnd).getFullYear();
      state.pastYear = state.currentYear - 1;

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
      state.sumLineCheckList = unitsList;

      state.analyzeState = getAnalyze(
        state.sourceState,
        state.pastYear,
        state.currentYear,
        state.regexpPattern,
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

      state.reportSrcState = getReportArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.regexpPattern,
        state.minValue
      );

      state.sumLineArrState = getSumLineArr(
        state.sourceState,
        state.customCalendar,
        state.sumLineCheckList
      );

      // state.raceArrState = getRaceArr(
      //   state.sourceState,
      //   state.dateStart,
      //   state.dateEnd
      // );
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
      state.sumLineArrState = getSumLineArr(
        state.sourceState,
        state.customCalendar,
        state.sumLineCheckList
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
      state.sumLineArrState = getSumLineArr(
        state.sourceState,
        state.customCalendar,
        state.sumLineCheckList
      );
    },

    setPattern(state, action) {
      state.regexpPattern = action.payload;
      let periodDatesFromRegex = getPeriodDatesFromRegex(
        state.regexpPattern,
        state.currentYear,
        state.pastYear
      );

      console.log(
        periodDatesFromRegex.periodStart,
        periodDatesFromRegex.periodEnd
      );
      state.dateStart = periodDatesFromRegex.periodStart;
      state.dateEnd = periodDatesFromRegex.periodEnd;

      state.analyzeState = getAnalyze(
        state.sourceState,
        state.pastYear,
        state.currentYear,
        state.regexpPattern,
        state.dateStart,
        state.dateEnd
      );

      state.reportSrcState = getReportArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
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
      state.currentYear = state.pastYear + 1;
    },

    setCurrentYear(state, action) {
      state.currentYear = action.payload;
      state.pastYear = state.currentYear - 1;
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

        state.analyzeState = getAnalyze(
          state.sourceState,
          state.pastYear,
          state.currentYear,
          state.regexpPattern,
          state.dateStart,
          state.dateEnd
        );

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
        state.sumLineCheckList = unitsList;
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

      state.reportSrcState = getReportArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.regexpPattern,
        state.minValue
      );

      state.sumLineArrState = getSumLineArr(
        state.sourceState,
        state.customCalendar,
        state.sumLineCheckList
      );
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

        state.analyzeState = getAnalyze(
          state.sourceState,
          state.pastYear,
          state.currentYear,
          state.regexpPattern,
          state.dateStart,
          state.dateEnd
        );

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
        state.sumLineCheckList = unitsList;
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

      state.reportSrcState = getReportArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.regexpPattern,
        state.minValue
      );

      state.sumLineArrState = getSumLineArr(
        state.sourceState,
        state.customCalendar,
        state.sumLineCheckList
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
        state.toolPalette.minValueVisibility = false;
        state.toolPalette.daysInGroupVisibility = false;
        state.toolPalette.unitsListVisibility = false;
        state.toolPalette.sumLineVisibility = false;
      }
      if (action.payload === "groupedChart") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.datePickerVisibility = false;
        state.toolPalette.daysInGroupVisibility = false;
        state.toolPalette.unitsListVisibility = false;
        state.toolPalette.sumLineVisibility = false;
      }
      if (action.payload === "stacked") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = false;
        state.toolPalette.minValueVisibility = false;
        state.toolPalette.periodVisibility = false;
        state.toolPalette.sumLineVisibility = false;
      }
      if (action.payload === "sankey") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = false;
        state.toolPalette.periodVisibility = false;
        state.toolPalette.daysInGroupVisibility = false;
        state.toolPalette.sumLineVisibility = false;
      }
      if (action.payload === "ridgeline") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = false;
        state.toolPalette.periodVisibility = false;
        state.toolPalette.sumLineVisibility = false;
      }
      if (action.payload === "report") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = false;
        state.toolPalette.daysInGroupVisibility = false;
        state.toolPalette.unitsListVisibility = false;
        state.toolPalette.minValueVisibility = false;
        state.toolPalette.sumLineVisibility = false;
      }
      if (action.payload === "sumline") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = false;
        state.toolPalette.periodVisibility = false;
        state.toolPalette.minValueVisibility = false;
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

    setSumLineCheckList(state, action) {
      state.sumLineCheckList = updateCheckedProperty(
        state.sumLineCheckList,
        action.payload.guiltyUnit,
        action.payload.checked
      );

      if (
        state.sumLineCheckList.findIndex((el) => el.checked === true) === -1
      ) {
        state.loaderShow = {
          ...state.loaderShow,
          sumline: true,
        };
      } else {
        state.loaderShow = {
          ...state.loaderShow,
          sumline: false,
        };

        state.sumLineArrState = getSumLineArr(
          state.sourceState,
          state.customCalendar,
          state.sumLineCheckList
        );
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

      if (action.payload === "sumline") {
        state.sumLineCheckList.map((el) =>
          el.checked ? (el.checked = false) : (el.checked = true)
        );

        if (
          state.sumLineCheckList.findIndex((el) => el.checked === true) === -1
        ) {
          state.loaderShow = {
            ...state.loaderShow,
            sumline: true,
          };
        } else {
          state.loaderShow = {
            ...state.loaderShow,
            sumline: false,
          };
        }
        state.sumLineArrState = getSumLineArr(
          state.sourceState,
          state.customCalendar,
          state.sumLineCheckList
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

      if (action.payload === "sumline") {
        state.sumLineCheckList.map((el) =>
          state.allCheckedCheckList.sumline
            ? (el.checked = false)
            : (el.checked = true)
        );
        state.allCheckedCheckList.sumline
          ? (state.allCheckedCheckList.sumline = false)
          : (state.allCheckedCheckList.sumline = true);

        if (
          state.sumLineCheckList.findIndex((el) => el.checked === true) === -1
        ) {
          state.loaderShow = {
            ...state.loaderShow,
            sumline: true,
          };
        } else {
          state.loaderShow = {
            ...state.loaderShow,
            sumline: false,
          };
        }

        // state.sumLineArrState = getSumLineArr(
        //   state.sourceState,
        //   state.customCalendar,
        //   state.sumLineCheckList
        // );
      }

      if (action.payload === "sumlineCharts") {
        state.chartCheckList.map((el) =>
          state.allCheckedCheckList.charts
            ? (el.checked = false)
            : (el.checked = true)
        );
        state.allCheckedCheckList.charts
          ? (state.allCheckedCheckList.charts = false)
          : (state.allCheckedCheckList.charts = true);

        if (
          state.chartCheckList.findIndex((el) => el.checked === true) === -1
        ) {
          state.loaderShow = {
            ...state.loaderShow,
            sumline: true,
          };
        } else {
          state.loaderShow = {
            ...state.loaderShow,
            sumline: false,
          };
        }

        // state.sumLineArrState = getSumLineArr(
        //   state.sourceState,
        //   state.customCalendar,
        //   state.sumLineCheckList
        // );
      }
    },

    setPopup(state, action) {
      state.popup.isOpened = action.payload;
    },

    setChartCheckList(state, action) {
      state.chartCheckList = updateChartProperty(
        state.chartCheckList,
        action.payload.name,
        action.payload.checked
      );

      state.sumLineArrState = getSumLineArr(
        state.sourceState,
        state.customCalendar,
        state.sumLineCheckList
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
  setRidgelineCheckList,
  setSumLineCheckList,
  setChartCheckList,
  setPopup,
  checkAllCheckList,
  invertCheckList,
} = filtersSlice.actions;
