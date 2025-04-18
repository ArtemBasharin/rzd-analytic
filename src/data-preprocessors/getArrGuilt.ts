import * as d3 from "d3";
import { startTime, guiltyUnit } from "../utils/config";

export const getArrGuilt = (srcArray: any[]) => {
  const maxYearKey = (arr: any[]) => {
    let maxKeyArr: any[] = [];
    Object.keys(arr[0]).forEach((el2: any) => {
      if (!isNaN(el2)) maxKeyArr.push(el2);
    });
    return d3.max(maxKeyArr);
  };

  function byField(field: number) {
    return (a: string, b: string) => (a[field] < b[field] ? 1 : -1);
  }

  const yearFilter = (el: any) => {
    return Number(el[startTime].slice(0, 4));
  };

  const createGuiltsArray = (src: any[]) => {
    //accumulate values from source
    const subUnitsAsMap = new Map();
    let uniqueYearLabelsArr: number[] = [];
    for (let i = 0; i < src.length; i += 1) {
      const unit = src[i][guiltyUnit];
      const year = yearFilter(src[i]);
      if (!uniqueYearLabelsArr.includes(year)) uniqueYearLabelsArr.push(year);
      const currentItem = {
        yearLabel: year,
        label: unit,
        value: 1,
      };
      if (subUnitsAsMap.has(year + "-" + unit)) {
        let existedItem = subUnitsAsMap.get(year + "-" + unit);
        existedItem.value += 1;
      } else {
        subUnitsAsMap.set(year + "-" + unit, currentItem);
      }
    }

    //unite items with same key [subUnit]
    let transitArr = Array.from(subUnitsAsMap.values());
    const subResult = new Map();
    for (let i = 0; i < transitArr.length; i += 1) {
      const currentItem = transitArr[i].label;
      const currentItemYearLabel = transitArr[i].yearLabel.toString();
      if (!subResult.has("_" + currentItem)) {
        subResult.set("_" + currentItem, {
          label: currentItem,
          [currentItemYearLabel]: transitArr[i].value,
        });
      } else {
        let existedItem = subResult.get("_" + currentItem);
        existedItem[currentItemYearLabel] = transitArr[i].value;
      }
    }

    //find items with not nonexistent yearLabel and assign zero-value to it
    let result = Array.from(subResult.values());
    uniqueYearLabelsArr.sort();
    for (let i = 0; i < uniqueYearLabelsArr.length; i++) {
      // eslint-disable-next-line array-callback-return
      result.map(function (el) {
        if (!el[uniqueYearLabelsArr[i]]) {
          return (el[uniqueYearLabelsArr[i]] = 0);
        }
      });
    }

    return result.sort(byField(maxYearKey(result)));
  };

  let sourceGuiltyArray = createGuiltsArray(srcArray);
  // let maxYear = maxYearKey(sourceGuiltyArray);

  let yMaxGroupsArr: number[] = [];
  sourceGuiltyArray.forEach((el: any) => {
    Object.values(el).forEach((el2: any) => {
      if (!isNaN(el2)) yMaxGroupsArr.push(el2);
    });
  });

  let yMaxGroups = d3.max(yMaxGroupsArr);

  const arrayByField = (src: any[]) => {
    let result: number[] = [];
    src.forEach((el) => result.push(el[maxYearKey(src)]));
    return result;
  };

  const paretoArrayGen = (src: any[]) => {
    let result = [];
    let totalSum = arrayByField(src).reduce((sum, current) => {
      result.push(sum);
      return sum + current;
    });
    result.push(totalSum);
    return result.map((el) => Math.round((el / totalSum) * 1000) / 10);
  };

  let paretoArray = paretoArrayGen(sourceGuiltyArray);
  for (let i = 0; i < sourceGuiltyArray.length; i += 1) {
    sourceGuiltyArray[i].valueP = paretoArray[i];
  }

  return { arr: sourceGuiltyArray, y: yMaxGroups };
};
