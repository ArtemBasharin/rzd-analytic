import { createSlice, current } from "@reduxjs/toolkit";
import { getAnalyze } from "../data-preprocessors/combiner";
import { getStackedArr } from "../data-preprocessors/getStackedArr";
import testArr from "../data-preprocessors/dummyArr";
import { getCustomCalendar } from "../data-preprocessors/getCustomCalendar";
import { getSankeyArr } from "../data-preprocessors/getSankeyArr";
import { getUnitsList } from "../data-preprocessors/getUnitsList";
import { getCutoffDates } from "../data-preprocessors/getCutoffDates";
// import cloneDeep from "lodash.clonedeep";

const updateCheckedProperty = (array, searchValue, newCheckedValue) => {
  const updatedArray = array.map((item) => {
    console.log(item.guiltyUnit === searchValue);
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

let date = new Date();
let arrSource = testArr;
let initialMinvalue = 0;
let initialDaysInGroup = 1;
let initialEndDate = new Date(getCutoffDates(arrSource).max);
let initialStartDate = () => {
  let previousMonthDate = new Date(initialEndDate);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  return previousMonthDate;
};

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
  initialStartDate().setHours(0, 0, 0),
  initialEndDate.setHours(0, 0, 0)
);

let initialPattern = () => {
  let period = initialStartDate().getMonth();
  if (period < 10) {
    return "0" + period;
  } else {
    return period.toString();
  }
};

let initialCheckedUnits = getUnitsList(
  arrSource,
  initialStartDate(),
  initialEndDate,
  initialCustomCalendar
);

let initialAnalyzeState = getAnalyze(
  arrSource,
  date.getFullYear() - 1,
  date.getFullYear(),
  initialPattern()
);

let initialStackedState = getStackedArr(
  arrSource,
  initialStartDate(),
  initialEndDate,
  initialCustomCalendar,
  initialCheckedUnits
);

let initialSankeyState = getSankeyArr(
  arrSource,
  initialStartDate(),
  initialEndDate,
  initialMinvalue,
  initialCheckedUnits
);

let initialLoaderShow = {
  analyze: false,
  grouped: false,
  stacked: false,
  sankey: false,
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
    dateStart: initialStartDate(),
    dateEnd: initialEndDate,
    customCalendar: initialCustomCalendar,
    regexpPattern: initialPattern(),
    analyzeState: initialAnalyzeState,
    stackedArrState: initialStackedState,
    sankeyArrState: initialSankeyState,
    toolPalette: initialToolPalette,
    stackedCheckList: initialCheckedUnits,
    sankeyCheckList: initialCheckedUnits,
    loaderShow: initialLoaderShow,
    minCutoffDate: getCutoffDates(arrSource).min,
    maxCutoffDate: getCutoffDates(arrSource).max,
    popup: {
      isOpened: false,
      status: "",
      message: "",
    },
  },

  reducers: {
    setSourceState(state, action) {
      state.sourceState = action.payload;

      state.stackedCheckList = getUnitsList(
        action.payload,
        state.dateStart,
        state.dateEnd,
        state.customCalendar
      );

      state.sankeyCheckList = getUnitsList(
        action.payload,
        state.dateStart,
        state.dateEnd,
        state.customCalendar
      );

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
        state.stackedCheckList
      );

      let sankeyArr = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList
      );

      state.stackedArrState = stackedArr;
      state.sankeyArrState = { nodes: sankeyArr.nodes, links: sankeyArr.links };
      // state.sankeyCheckList = sankeyArr.unitsList;
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
      state.sankeyCheckList = sankeyArr.disabledUnitsList;
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
      state.sankeyCheckList = sankeyArr.disabledUnitsList;
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
      console.log(action.payload);
      console.log(state.dateEnd);

      if (action.payload >= state.dateEnd) {
        state.popup.isOpened = true;
        state.popup.message = "Начальная дата равна или больше конечной";
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

        state.stackedCheckList = getUnitsList(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.customCalendar
        );

        state.sankeyCheckList = getUnitsList(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.customCalendar
        );

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
        } else {
          state.loaderShow = {
            ...state.loaderShow,
            stacked: true,
            sankey: true,
          };
        }
      }
    },

    setDateEnd(state, action) {
      if (action.payload <= state.dateStart) {
        state.popup.isOpened = true;
        state.popup.message = "Конечная дата равна или меньше начальной";
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

        state.stackedCheckList = getUnitsList(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.customCalendar
        );

        state.sankeyCheckList = getUnitsList(
          state.sourceState,
          state.dateStart,
          state.dateEnd,
          state.customCalendar
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

      state.sankeyArrState = getSankeyArr(
        state.sourceState,
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList
      );
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
  setPopup,
} = filtersSlice.actions;
