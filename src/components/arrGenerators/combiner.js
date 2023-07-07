import { startTime } from "../../config/config";
import { getArrFails } from "./getArrFails";
import { getArrDelays } from "./getArrDelays";
import { getArrDurations } from "./getArrDurations";
import { getArrGuilt } from "./getArrGuilt";
import { getArrGuiltDuration } from "./getArrGuiltDuration";
import { getArrReasons } from "./getArrReasons";
import {
  freightDelayed,
  freightDuration,
  passDelayed,
  passDuration,
  subDelayed,
  subDuration,
  otherDelayed,
  otherDuration,
} from "../../config/config";
// import { initialData } from "../DropZoneParser";
// import dummyArr from "./dummyArr"

export function getAnalyze(sourceArr, pastYear, currentYear, pattern) {
  console.time("getAnalyze");
  // console.log("dummyArr" ,dummyArr)
  const setUndefinedFactsToZero = (arr) => {
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

  const filterByMonth = (arr, regexpPattern) => {
    let regexp = new RegExp(`[-]${regexpPattern}[-]`, "g");
    let resultArray = [];
    for (let i = 0; i < arr.length; ++i) {
      if (arr[i][startTime].search(regexp) > -1) {
        resultArray.push(arr[i]);
      }
    }
    // console.log("resultArray", resultArray);
    return resultArray;
  };

  let filteredArr = setUndefinedFactsToZero(filterByMonth(sourceArr, pattern));

  console.timeEnd("getAnalyze");
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
