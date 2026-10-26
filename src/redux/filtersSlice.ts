import { createSlice, current, isDraft } from "@reduxjs/toolkit";
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
  cutDecimals,
} from "../utils/functions";
import { getReportArr } from "../data-preprocessors/getReportArr";
import { getSumLineArr } from "../data-preprocessors/getSumLineArr";
import { getRaceArr } from "../data-preprocessors/getRaceArr";
import { initialChartCheckList } from "../utils/initialChartCheckList";
import { getReportStationsArr } from "../data-preprocessors/getReportStationsArr";
import { startTime as violationStartKey } from "../utils/config";
import { Violation } from "../types/violation";
import { readRaceTiming } from "../utils/raceTiming";
import {
  collectPlaceOptions,
  filterViolationsByPlace,
} from "../utils/placeParts";
import { readReportUnitSort } from "../utils/reportUnitSort";

let date = new Date();
let arrSource = dummyArr(date.getFullYear() - 1, date.getFullYear());
let initialMinvalue = 0;
let initialDaysInGroup = 1;
let cutoffDates = getCutoffDates(arrSource)!;
let initialEndDate = new Date(cutoffDates.max).setHours(23, 59, 59);
let initialStartDate = getStartDate(initialEndDate);

let initialToolPalette = {
  kind: "analyze",
  yearVisibility: true,
  minValueVisibility: false,
  periodVisibility: true,
  datePickerVisibility: true,
  unitsListVisibility: false,
  sumLineVisibility: false,
  raceTimingVisibility: false,
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
  raceTimingVisibility: false,
};

let initialCustomCalendar = getCustomCalendar(
  initialDaysInGroup,
  initialStartDate,
  initialEndDate,
);

let initialPattern = getInitialPattern(initialEndDate);

let initialCheckedUnits = getUnitsList(
  arrSource,
  initialStartDate,
  initialEndDate,
  initialCustomCalendar,
);

let initialAnalyzeState = getAnalyze(
  arrSource,
  date.getFullYear() - 1,
  date.getFullYear(),
  initialPattern,
  initialStartDate,
  initialEndDate,
);

let initialStackedState = getStackedArr(
  arrSource,
  initialStartDate,
  initialEndDate,
  initialCustomCalendar,
  initialCheckedUnits,
);

let initialSankeyState = getSankeyArr(
  arrSource,
  initialStartDate,
  initialEndDate,
  initialMinvalue,
  initialCheckedUnits,
);

let initialRidgelineArrState = getRidgelineArr(
  arrSource,
  initialStartDate,
  initialEndDate,
  initialCustomCalendar,
  initialCheckedUnits,
);

let initialSumLineArrState: any = [];
// getSumLineArr(arrSource, initialCustomCalendar, initialCheckedUnits);

let initialraceArrState = getRaceArr(
  arrSource,
  initialStartDate,
  initialEndDate,
);

let initialLoaderShow = {
  analyze: false,
  grouped: false,
  stacked: false,
  sankey: false,
  ridgeline: false,
};

function sourceRows(state: { sourceState: Violation[] }): Violation[] {
  const rows = state.sourceState;
  // Неизменённый массив Immer отдаёт как есть. Если его уже меняли
  // в этом редюсере, current снимает прокси — иначе каждое поле строки
  // читается через Proxy и выбор даты занимает секунды.
  if (isDraft(rows)) return current(rows) as Violation[];
  return rows;
}

function chartRows(state: {
  sourceState: Violation[];
  railwayFilter?: string;
  regionFilter?: string;
}) {
  return filterViolationsByPlace(
    sourceRows(state),
    state.railwayFilter || "",
    state.regionFilter || "",
  );
}

function prunePlaceFilters(state: {
  sourceState: Violation[];
  railwayFilter: string;
  regionFilter: string;
}) {
  const allRows = state.sourceState;
  const railways = new Set(
    collectPlaceOptions(allRows, "").railways.map((item) => item.value),
  );
  if (state.railwayFilter && !railways.has(state.railwayFilter)) {
    state.railwayFilter = "";
  }
  const regions = new Set(
    collectPlaceOptions(allRows, state.railwayFilter).regions.map(
      (item) => item.value,
    ),
  );
  if (state.regionFilter && !regions.has(state.regionFilter)) {
    state.regionFilter = "";
  }
}

const timeIndex = new WeakMap<Violation[], Float64Array>();

function indexRowTimes(rows: Violation[]) {
  if (timeIndex.has(rows)) return;
  const times = new Float64Array(rows.length);
  for (let i = 0; i < rows.length; i += 1) {
    const ts = Date.parse(rows[i]?.[violationStartKey]);
    times[i] = Number.isFinite(ts) ? ts : Number.NaN;
  }
  timeIndex.set(rows, times);
}

/**
 * Строки текущего диапазона и такого же диапазона год назад.
 * Остальные предпроцессоры всё равно фильтруют точнее, но не должны
 * заново разбирать все 100+ тысяч записей базы.
 */
function rowsInSelectedYears(rows: any[], dateStart: number, dateEnd: number) {
  const start = Number(dateStart);
  const end = Number(dateEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || rows.length === 0) {
    return rows;
  }
  const pastStart = new Date(start);
  pastStart.setFullYear(pastStart.getFullYear() - 1);
  const pastEnd = new Date(end);
  pastEnd.setFullYear(pastEnd.getFullYear() - 1);
  const pad = 3 * 24 * 60 * 60 * 1000;
  const from = Math.min(start, pastStart.getTime()) - pad;
  const to = Math.max(end, pastEnd.getTime()) + pad;
  indexRowTimes(rows);
  const times = timeIndex.get(rows)!;
  const scoped: any[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const ts = times[i];
    // Копия: getAnalyze дописывает нули в объект строки, а исходные
    // записи в сторе заморожены Immer.
    if (ts >= from && ts <= to) scoped.push({ ...rows[i] });
  }
  return scoped;
}

/** Пересчёт графиков и отчёта по строкам с учётом дороги и региона. Даты не трогает. */
function refreshDerived(state: any) {
  const rows = rowsInSelectedYears(
    chartRows(state),
    state.dateStart,
    state.dateEnd,
  );

  state.analyzeState = getAnalyze(
    rows,
    state.pastYear,
    state.currentYear,
    state.regexpPattern,
    state.dateStart,
    state.dateEnd,
  );

  const unitsList =
    rows.length > 0
      ? getUnitsList(rows, state.dateStart, state.dateEnd, state.customCalendar)
      : [];
  state.stackedCheckList = unitsList;
  state.sankeyCheckList = unitsList;
  state.ridgelineCheckList = unitsList;
  state.sumLineCheckList = unitsList;

  if (unitsList.length > 0) {
    state.loaderShow = initialLoaderShow;
    state.stackedArrState = getStackedArr(
      rows,
      state.dateStart,
      state.dateEnd,
      state.customCalendar,
      state.stackedCheckList,
    );
    state.sankeyArrState = getSankeyArr(
      rows,
      state.dateStart,
      state.dateEnd,
      state.minValue,
      state.sankeyCheckList,
    );
    state.ridgelineArrState = getRidgelineArr(
      rows,
      state.dateStart,
      state.dateEnd,
      state.customCalendar,
      state.ridgelineCheckList,
    );
  } else {
    state.loaderShow = {
      ...state.loaderShow,
      stacked: true,
      sankey: true,
      ridgeline: true,
    };
    state.stackedArrState = [];
    state.sankeyArrState = { nodes: [], links: [] };
    state.ridgelineArrState = [];
  }

  state.reportSrcState = getReportArr(
    rows,
    state.dateStart,
    state.dateEnd,
    state.regexpPattern,
    state.minValue,
  );

  state.reportStations = getReportStationsArr(
    rows,
    state.dateStart,
    state.dateEnd,
    state.regexpPattern,
    state.minValue,
  );

  state.sumLineArrState = getSumLineArr(
    rows,
    state.customCalendar,
    state.sumLineCheckList,
  );

  state.raceArrState = getRaceArr(rows, state.dateStart, state.dateEnd);
}

function commitRange(state: any, start: number, end: number) {
  state.dateStart = start;
  state.dateEnd = end;
  state.customCalendar = getCustomCalendar(
    state.daysInGroup,
    state.dateStart,
    state.dateEnd,
  );
  state.loaderShow = initialLoaderShow;
  refreshDerived(state);
}

function toMs(value: number | Date) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** Тот же месяц, день и время в другом году. 29 февраля сдвигается на последний день месяца. */
function shiftToYear(value: number | Date, year: number) {
  const date = new Date(value);
  const month = date.getMonth();
  const day = date.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const next = new Date(date.getTime());
  next.setFullYear(year, month, Math.min(day, lastDay));
  return next.getTime();
}

////////////////////////////////////////////////////////////////////////////////
const filtersSlice = createSlice({
  name: "filters",
  initialState: {
    pageWidth: window.innerWidth,
    pageHeight: window.innerHeight,
    sourceState: [] as Violation[],
    /** true после первого успешного setSourceState, в том числе пустого. */
    sourceReady: false,
    minValue: initialMinvalue,
    daysInGroup: initialDaysInGroup,
    currentYear: new Date(initialEndDate).getFullYear(),
    pastYear: new Date(initialEndDate).getFullYear() - 1,
    dateStart: initialStartDate as any,
    dateEnd: initialEndDate as any,
    customCalendar: initialCustomCalendar,
    regexpPattern: initialPattern,
    analyzeState: initialAnalyzeState,
    stackedArrState: initialStackedState,
    sankeyArrState: initialSankeyState as any,
    ridgelineArrState: initialRidgelineArrState,
    sumLineArrState: initialSumLineArrState,
    raceArrState: initialraceArrState,
    raceStepSec: readRaceTiming().stepSec,
    raceDurationSec: readRaceTiming().durationSec,
    toolPalette: initialToolPalette as any,
    stackedCheckList: initialCheckedUnits,
    sankeyCheckList: initialCheckedUnits,
    ridgelineCheckList: initialCheckedUnits,
    sumLineCheckList: initialCheckedUnits,
    chartCheckList: initialChartCheckList(),
    loaderShow: initialLoaderShow as any,
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
    reportSrcState: [] as any[],
    reportStations: [] as any[],
    /** Показывать блоки Sankey в текстовом отчёте (переключатель у кнопок DOC/XLS). */
    reportSankeyBlocksVisible: false,
    /** Сортировка абзацев подразделений. Живёт до закрытия вкладки. */
    reportUnitSort: readReportUnitSort(),
    /** Пустая строка — все дороги. Значение — первый фрагмент поля «Место». */
    railwayFilter: "",
    /** Пустая строка — все регионы. Значение вида РЕГ-2. */
    regionFilter: "",
  },

  reducers: {
    setSourceState(state, action) {
      const rows = Array.isArray(action.payload) ? action.payload : [];
      const normalized = rows.map((row) => {
        const hasRu =
          row[violationStartKey] != null && row[violationStartKey] !== "";
        if (!hasRu && row.startTime != null && row.startTime !== "") {
          return { ...row, [violationStartKey]: row.startTime };
        }
        return row;
      });
      let cutoffDates = getCutoffDates(normalized);
      if (!cutoffDates) {
        if (normalized.length === 0) {
          state.sourceState = [];
          state.sourceReady = true;
          prunePlaceFilters(state);
          refreshDerived(state);
        }
        return;
      }
      indexRowTimes(normalized);
      state.sourceState = normalized;
      state.sourceReady = true;
      state.minCutoffDate = cutoffDates.min;
      state.maxCutoffDate = cutoffDates.max;
      state.dateStart = getStartDate(cutoffDates.max);
      state.dateEnd = cutoffDates.max;
      state.currentYear = new Date(state.dateEnd).getFullYear();
      state.pastYear = state.currentYear - 1;

      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd,
      );

      state.regexpPattern = getInitialPattern(state.dateEnd);
      prunePlaceFilters(state);

      let unitsList = getUnitsList(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
      );
      state.stackedCheckList = unitsList;
      state.sankeyCheckList = unitsList;
      state.ridgelineCheckList = unitsList;
      state.sumLineCheckList = unitsList;

      state.analyzeState = getAnalyze(
        chartRows(state),
        state.pastYear,
        state.currentYear,
        state.regexpPattern,
        state.dateStart,
        state.dateEnd,
      );

      state.stackedArrState = getStackedArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
        state.stackedCheckList,
      );

      let sankeyArr = getSankeyArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList,
      );

      state.sankeyArrState = { nodes: sankeyArr.nodes, links: sankeyArr.links };
      // state.sankeyCheckList = sankeyArr.unitsList;

      state.ridgelineArrState = getRidgelineArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
        state.ridgelineCheckList,
      );

      state.reportSrcState = getReportArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.regexpPattern,
        state.minValue,
      );

      state.reportStations = getReportStationsArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.regexpPattern,
        state.minValue,
      );

      state.sumLineArrState = getSumLineArr(
        chartRows(state),
        state.customCalendar,
        state.sumLineCheckList,
      );

      state.raceArrState = getRaceArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
      );
    },

    /** Границы по /violations/meta до прихода полного массива (datepicker). */
    setCutoffDatesFromMeta(state, action) {
      const { minDate, maxDate } = action.payload || {};
      if (minDate == null || maxDate == null) return;
      const minMs = new Date(minDate).setHours(0, 0, 0);
      const maxMs = new Date(maxDate).setHours(23, 59, 59);
      if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) return;
      state.minCutoffDate = minMs;
      state.maxCutoffDate = maxMs;
      state.dateStart = getStartDate(maxMs);
      state.dateEnd = maxMs;
      const y = new Date(maxMs).getFullYear();
      state.currentYear = y;
      state.pastYear = y - 1;
      state.regexpPattern = getInitialPattern(maxMs);
      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd,
      );
    },

    increment(state) {
      if (state.minValue < 1) {
        state.minValue = cutDecimals(state.minValue + 0.1);
      } else {
        state.minValue = state.minValue + 1;
      }

      let sankeyArr = getSankeyArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList,
      );

      state.sankeyArrState = { nodes: sankeyArr.nodes, links: sankeyArr.links };
      state.sankeyCheckList = sankeyArr.unitsList;
    },

    decrement(state) {
      if (state.minValue > 0 && state.minValue <= 1)
        state.minValue = cutDecimals(state.minValue - 0.1);
      if (state.minValue > 0 && state.minValue > 1)
        state.minValue = cutDecimals(state.minValue - 1);

      let sankeyArr = getSankeyArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList,
      );

      state.sankeyArrState = { nodes: sankeyArr.nodes, links: sankeyArr.links };
      state.sankeyCheckList = sankeyArr.unitsList;
    },

    incrementDaysIngroup(state) {
      state.daysInGroup = state.daysInGroup + 1;
      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd,
      );
      state.stackedArrState = getStackedArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
        state.stackedCheckList,
      );
      state.sumLineArrState = getSumLineArr(
        chartRows(state),
        state.customCalendar,
        state.sumLineCheckList,
      );
    },

    decrementDaysIngroup(state) {
      state.daysInGroup = state.daysInGroup - 1;
      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd,
      );
      state.stackedArrState = getStackedArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
        state.stackedCheckList,
      );
      state.sumLineArrState = getSumLineArr(
        chartRows(state),
        state.customCalendar,
        state.sumLineCheckList,
      );
    },

    setPattern(state, action) {
      state.regexpPattern = action.payload;
      const periodDatesFromRegex = getPeriodDatesFromRegex(
        state.regexpPattern,
        state.currentYear,
        state.pastYear,
      );
      const start = new Date(periodDatesFromRegex.periodStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(periodDatesFromRegex.periodEnd);
      end.setHours(23, 59, 59, 0);
      commitRange(state, start.getTime(), end.getTime());
    },

    setMinValue(state, action) {
      state.minValue = action.payload;
      state.analyzeState = getAnalyze(
        chartRows(state),
        state.pastYear,
        state.currentYear,
        state.regexpPattern,
      );
    },

    setPastYear(state, action) {
      state.pastYear = action.payload;
      // state.currentYear = state.pastYear + 1;
    },

    setCurrentYear(state, action) {
      const year = Number(action.payload);
      if (!Number.isFinite(year)) return;
      const start = shiftToYear(state.dateStart, year);
      let end = shiftToYear(state.dateEnd, year);
      const sameSelection =
        state.currentYear === year &&
        state.pastYear === year - 1 &&
        toMs(state.dateStart) === start &&
        toMs(state.dateEnd) === end;
      state.currentYear = year;
      state.pastYear = year - 1;
      if (sameSelection) return;
      if (start >= end) {
        const endDate = new Date(start);
        endDate.setHours(23, 59, 59, 0);
        end = endDate.getTime();
      }
      commitRange(state, start, end);
    },

    setDateRange(state, action) {
      const start = Number(action.payload?.start);
      const end = Number(action.payload?.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        state.popup.isOpened = true;
        state.popup.message = "Начальная дата равна или больше конечной";
        state.popup.status = "fail";
        return;
      }
      commitRange(state, start, end);
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
          chartRows(state),
          state.pastYear,
          state.currentYear,
          state.regexpPattern,
          state.dateStart,
          state.dateEnd,
        );

        state.customCalendar = getCustomCalendar(
          state.daysInGroup,
          state.dateStart,
          state.dateEnd,
        );

        let unitsList = getUnitsList(
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
        );
        state.stackedCheckList = unitsList;
        state.sankeyCheckList = unitsList;
        state.ridgelineCheckList = unitsList;
        state.sumLineCheckList = unitsList;
      }

      if (state.stackedCheckList.length > 0) {
        state.loaderShow = initialLoaderShow;
        state.stackedArrState = getStackedArr(
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
          state.stackedCheckList,
        );

        state.sankeyArrState = getSankeyArr(
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.sankeyCheckList,
        );

        state.ridgelineArrState = getRidgelineArr(
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
          state.stackedCheckList,
        );
      } else {
        state.loaderShow = {
          ...state.loaderShow,
          stacked: true,
          sankey: true,
        };
      }

      state.reportSrcState = getReportArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.regexpPattern,
        state.minValue,
      );

      state.reportStations = getReportStationsArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.regexpPattern,
        state.minValue,
      );

      state.sumLineArrState = getSumLineArr(
        chartRows(state),
        state.customCalendar,
        state.sumLineCheckList,
      );

      state.raceArrState = getRaceArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
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
          chartRows(state),
          state.pastYear,
          state.currentYear,
          state.regexpPattern,
          state.dateStart,
          state.dateEnd,
        );

        state.customCalendar = getCustomCalendar(
          state.daysInGroup,
          state.dateStart,
          state.dateEnd,
        );

        let unitsList = getUnitsList(
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
        );
        state.stackedCheckList = unitsList;
        state.sankeyCheckList = unitsList;
        state.ridgelineCheckList = unitsList;
        state.sumLineCheckList = unitsList;
      }

      if (state.stackedCheckList.length > 0) {
        state.loaderShow = initialLoaderShow;
        state.stackedArrState = getStackedArr(
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
          state.stackedCheckList,
        );

        state.sankeyArrState = getSankeyArr(
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.sankeyCheckList,
        );

        state.ridgelineArrState = getRidgelineArr(
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
          state.stackedCheckList,
        );
      } else {
        state.loaderShow = {
          ...state.loaderShow,
          stacked: true,
          sankey: true,
        };
      }

      state.reportSrcState = getReportArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.regexpPattern,
        state.minValue,
      );

      state.reportStations = getReportStationsArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.regexpPattern,
        state.minValue,
      );

      state.sumLineArrState = getSumLineArr(
        chartRows(state),
        state.customCalendar,
        state.sumLineCheckList,
      );

      state.raceArrState = getRaceArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
      );
    },

    setCustomCalendar(state) {
      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd,
      );
    },

    setDaysInGroup(state, action) {
      state.daysInGroup = action.payload;
      state.customCalendar = getCustomCalendar(
        state.daysInGroup,
        state.dateStart,
        state.dateEnd,
      );
    },

    setSankeyArrState(state) {
      state.sankeyArrState = getSankeyArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.minValue,
        state.sankeyCheckList,
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
      if (action.payload === "insights") {
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
      if (action.payload === "map") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = false;
        state.toolPalette.periodVisibility = false;
        state.toolPalette.daysInGroupVisibility = false;
        state.toolPalette.sumLineVisibility = false;
        state.toolPalette.minValueVisibility = false;
        state.toolPalette.unitsListVisibility = true;
      }
      if (action.payload === "race") {
        state.toolPalette = { ...state.toolPalette, kind: action.payload };
        state.toolPalette.yearVisibility = false;
        state.toolPalette.daysInGroupVisibility = false;
        state.toolPalette.unitsListVisibility = false;
        state.toolPalette.minValueVisibility = false;
        state.toolPalette.sumLineVisibility = false;
        state.toolPalette.raceTimingVisibility = true;
      }
    },

    setRaceStepSec(state, action) {
      state.raceStepSec = action.payload;
    },

    setRaceDurationSec(state, action) {
      state.raceDurationSec = action.payload;
    },

    setStackedCheckList(state, action) {
      state.stackedCheckList = updateCheckedProperty(
        state.stackedCheckList,
        action.payload.guiltyUnit,
        action.payload.checked,
      );

      state.stackedArrState = getStackedArr(
        chartRows(state),
        state.dateStart,
        state.dateEnd,
        state.customCalendar,
        state.stackedCheckList,
      );
    },

    setSankeyCheckList(state, action) {
      state.sankeyCheckList = updateCheckedProperty(
        state.sankeyCheckList,
        action.payload.guiltyUnit,
        action.payload.checked,
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
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.sankeyCheckList,
        );
      }
    },

    setRidgelineCheckList(state, action) {
      state.ridgelineCheckList = updateCheckedProperty(
        state.ridgelineCheckList,
        action.payload.guiltyUnit,
        action.payload.checked,
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
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.ridgelineCheckList,
        );
      }
    },

    setSumLineCheckList(state, action) {
      state.sumLineCheckList = updateCheckedProperty(
        state.sumLineCheckList,
        action.payload.guiltyUnit,
        action.payload.checked,
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
          chartRows(state),
          state.customCalendar,
          state.sumLineCheckList,
        );
      }
    },

    invertCheckList(state, action) {
      if (action.payload === "stacked") {
        state.stackedCheckList.map((el) =>
          el.checked ? (el.checked = false) : (el.checked = true),
        );
        state.stackedArrState = getStackedArr(
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
          state.stackedCheckList,
        );
      }

      if (action.payload === "sankey" || action.payload === "map") {
        state.sankeyCheckList.map((el) =>
          el.checked ? (el.checked = false) : (el.checked = true),
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
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.sankeyCheckList,
        );
      }

      if (action.payload === "sumline") {
        state.sumLineCheckList.map((el) =>
          el.checked ? (el.checked = false) : (el.checked = true),
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
          chartRows(state),
          state.customCalendar,
          state.sumLineCheckList,
        );
      }
    },

    checkAllCheckList(state, action) {
      if (action.payload === "stacked") {
        state.stackedCheckList.map((el) =>
          state.allCheckedCheckList.stacked
            ? (el.checked = false)
            : (el.checked = true),
        );
        state.allCheckedCheckList.stacked
          ? (state.allCheckedCheckList.stacked = false)
          : (state.allCheckedCheckList.stacked = true);

        state.stackedArrState = getStackedArr(
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.customCalendar,
          state.stackedCheckList,
        );
      }

      if (action.payload === "sankey" || action.payload === "map") {
        state.sankeyCheckList.map((el) =>
          state.allCheckedCheckList.sankey
            ? (el.checked = false)
            : (el.checked = true),
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
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.sankeyCheckList,
        );
      }

      if (action.payload === "ridgeline") {
        state.ridgelineCheckList.map((el) =>
          state.allCheckedCheckList.ridgeline
            ? (el.checked = false)
            : (el.checked = true),
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
          chartRows(state),
          state.dateStart,
          state.dateEnd,
          state.minValue,
          state.ridgelineCheckList,
        );
      }

      if (action.payload === "sumline") {
        state.sumLineCheckList.map((el) =>
          state.allCheckedCheckList.sumline
            ? (el.checked = false)
            : (el.checked = true),
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
        //   chartRows(state),
        //   state.customCalendar,
        //   state.sumLineCheckList
        // );
      }

      if (action.payload === "sumlineCharts") {
        state.chartCheckList.map((el) =>
          state.allCheckedCheckList.charts
            ? (el.checked = false)
            : (el.checked = true),
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
        //   chartRows(state),
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
        action.payload.checked,
      );

      state.sumLineArrState = getSumLineArr(
        chartRows(state),
        state.customCalendar,
        state.sumLineCheckList,
      );
    },

    setReportSankeyBlocksVisible(state, action) {
      state.reportSankeyBlocksVisible = Boolean(action.payload);
    },

    setReportUnitSort(state, action) {
      const next = action.payload;
      state.reportUnitSort =
        next === "delayed" || next === "duration" || next === "count"
          ? next
          : "count";
    },

    setRailwayFilter(state, action) {
      state.railwayFilter = String(action.payload ?? "").trim();
      const regions = new Set(
        collectPlaceOptions(state.sourceState, state.railwayFilter).regions.map(
          (item) => item.value,
        ),
      );
      if (state.regionFilter && !regions.has(state.regionFilter)) {
        state.regionFilter = "";
      }
      refreshDerived(state);
    },

    setRegionFilter(state, action) {
      const next = String(action.payload ?? "").trim().toUpperCase();
      state.regionFilter = next;
      refreshDerived(state);
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
  setPastYear,
  setCurrentYear,
  setDateRange,
  setSourceState,
  setCutoffDatesFromMeta,
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
  setReportSankeyBlocksVisible,
  setReportUnitSort,
  setRaceStepSec,
  setRaceDurationSec,
  setRailwayFilter,
  setRegionFilter,
} = filtersSlice.actions;
