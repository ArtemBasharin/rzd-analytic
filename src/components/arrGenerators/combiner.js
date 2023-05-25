import { startTime } from "../../config/config";
import { testArr } from "../../test/test";
import { getArrFails } from "./getArrFails";
import { getArrDelays } from "./getArrDelays";
import { getArrDurations } from "./getArrDurations";
import { getArrGuilt } from "./getArrGuilt";
import { getArrGuiltDuration } from "./getArrGuiltDuration";
import { getArrReasons } from "./getArrReasons";

export function getAnalyze(pastYear, currentYear, pattern) {
  const filterByMonth = (arr, regexpPattern) => {
    let regexp = new RegExp(`[-]${regexpPattern}[-]`, "g");
    let resultArray = [];
    for (let i = 0; i < arr.length; ++i) {
      if (regexp.test(arr[i][startTime])) {
        resultArray.push(arr[i]);
      }
    }
    return resultArray;
  };
  let filteredArr = filterByMonth(testArr, pattern);

  return {
    failsArray: getArrFails(filteredArr, pastYear, currentYear).arr,
    failsYmax: getArrFails(filteredArr, pastYear, currentYear).y,
    delaysArray: getArrDelays(filteredArr, pastYear, currentYear).arr,
    delaysYmax: getArrDelays(filteredArr, pastYear, currentYear).y,
    durationsArray: getArrDurations(filteredArr, pastYear, currentYear).arr,
    durationsYmax: getArrDurations(filteredArr, pastYear, currentYear).y,
    guiltsArray: getArrGuilt(filteredArr).arr,
    guiltsYmax: getArrGuilt(filteredArr).y,
    guiltsDurationsArray: getArrGuiltDuration(filteredArr).arr,
    guiltsDurationsYmax: getArrGuiltDuration(filteredArr).y,
    reasonsArray: getArrReasons(filteredArr).arr,
    reasonsYmax: getArrReasons(filteredArr).y,
  };
}
