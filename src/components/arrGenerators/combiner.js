import { startTime } from "../../config/config";
import { store } from "../../redux/store";
import { testArr } from "../../test/test";
import { getUnitedArrFails } from "./getUnitedArrFails";
import { getArrDelays } from "./getArrDelays";

let pastYear = store.getState().filters.pastYear;
let currentYear = store.getState().filters.currentYear;

export default function analyzeChapter() {
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
  let filteredArray = filterByMonth(
    testArr,
    store.getState().filters.regexpPattern
  );

  return {
    failsChartArray: getUnitedArrFails(filteredArray, pastYear, currentYear)
      .arr,
    failsChartYmax: getUnitedArrFails(filteredArray, pastYear, currentYear).y,
    delaysChartArray: getArrDelays(filteredArray, pastYear, currentYear).arr,
    delaysChartYmax: getArrDelays(filteredArray, pastYear, currentYear).y,
  };
}
