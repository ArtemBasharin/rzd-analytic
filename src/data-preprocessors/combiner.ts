import { getArrFails } from "./getArrFails";
import { getArrDelays } from "./getArrDelays";
import { getArrDurations } from "./getArrDurations";
import { getArrGuilt } from "./getArrGuilt";
import { getArrGuiltDuration } from "./getArrGuiltDuration";
import { getArrReasons } from "./getArrReasons";
import {
  startTime,
  freightDelayed,
  freightDuration,
  passDelayed,
  passDuration,
  subDelayed,
  subDuration,
  otherDelayed,
  otherDuration,
} from "../utils/config";
import { getPeriodDatesFromRegex } from "../utils/functions";
// import { initialData } from "../DropZoneParser";
// import dummyArr from "./dummyArr"

export function getAnalyze(
  sourceArr: any[],
  pastYear: number,
  currentYear: number,
  pattern: string,
  dateStart?: string,
  dateEnd?: string
) {
  // console.time("getAnalyze");
  // console.log("dummyArr" ,dummyArr)
  const setUndefinedFactsToZero = (arr: any[]) => {
    // eslint-disable-next-line
    arr.map((el) => {
      if (!el[freightDelayed]) el[freightDelayed] = 0;
      if (!el[freightDuration]) el[freightDuration] = 0;
      if (!el[passDelayed]) el[passDelayed] = 0;
      if (!el[passDuration]) el[passDuration] = 0;
      if (!el[subDelayed]) el[subDelayed] = 0;
      if (!el[subDuration]) el[subDuration] = 0;
      if (!el[otherDelayed]) el[otherDelayed] = 0;
      if (!el[otherDuration]) el[otherDuration] = 0;
    });
    return arr;
  };

  const filterByMonth = (arr: any[], regexpPattern: string) => {
    let regexp = new RegExp(`[-](${regexpPattern})[-]`, "g");
    // console.log(regexp);
    // console.log(arr[0][startTime], arr[0][startTime].search(regexp));
    let resultArray = [];
    for (let i = 0; i < arr.length; ++i) {
      if (arr[i][startTime].search(regexp) > -1) {
        resultArray.push(arr[i]);
      }
    }
    return resultArray;
  };

  console.log(getPeriodDatesFromRegex(pattern, currentYear, currentYear - 1));

  const filterByDates = (arr: any, dateStart: string, dateEnd: string) => {
    console.log(dateStart, dateEnd);
    let srcArrayInDatesFrame: any[] = [];
    let currentDateStart = new Date(dateStart);
    let currentDateEnd = new Date(dateEnd);
    let pastDateStart = new Date(
      currentDateStart.getFullYear() - 1,
      currentDateStart.getMonth(),
      currentDateStart.getDate()
    );
    let pastDateEnd = new Date(
      currentDateEnd.getFullYear() - 1,
      currentDateEnd.getMonth(),
      currentDateEnd.getDate()
    );
    arr.forEach((el: any) => {
      if (
        (Date.parse(el[startTime]) >= currentDateStart.getTime() &&
          Date.parse(el[startTime]) <= currentDateEnd.getTime()) ||
        (Date.parse(el[startTime]) >= pastDateStart.getTime() &&
          Date.parse(el[startTime]) <= pastDateEnd.getTime())
      ) {
        srcArrayInDatesFrame.push(el);
      }
    });
    return srcArrayInDatesFrame;
  };
  console.log(filterByDates(sourceArr, dateStart!, dateEnd!));

  let filteredArr = setUndefinedFactsToZero(
    filterByDates(sourceArr, dateStart!, dateEnd!)
  );
  let filteredArr2 = setUndefinedFactsToZero(filterByMonth(sourceArr, pattern));
  console.log(filteredArr2);
  console.log(filteredArr);

  // console.timeEnd("getAnalyze");
  return {
    failsArray: getArrFails(filteredArr, currentYear - 1, currentYear).arr,
    failsYmax: getArrFails(filteredArr, currentYear - 1, currentYear).y,
    delaysArray: getArrDelays(filteredArr, currentYear - 1, currentYear).arr,
    delaysYmax: getArrDelays(filteredArr, currentYear - 1, currentYear).y,
    durationsArray: getArrDurations(filteredArr, currentYear - 1, currentYear)
      .arr,
    durationsYmax: getArrDurations(filteredArr, currentYear - 1, currentYear).y,
    guiltsArray: getArrGuilt(filteredArr).arr,
    guiltsYmax: getArrGuilt(filteredArr).y,
    guiltsDurationsArray: getArrGuiltDuration(filteredArr).arr,
    guiltsDurationsYmax: getArrGuiltDuration(filteredArr).y,
    reasonsArray: getArrReasons(filteredArr).arr,
    reasonsYmax: getArrReasons(filteredArr).y,
  };
}
