import * as d3 from "d3";
import { startTime, failReason } from "../../config/config";

export const getArrReasons = (srcArray) => {
  const yearFilter = (el) => {
    return Number(20 + el[startTime].slice(0, 4));
  };

  const maxYearKey = (arr) => {
    let maxKeyArr = [];
    Object.keys(arr[0]).forEach((el2) => {
      if (!isNaN(el2)) maxKeyArr.push(el2);
    });
    return d3.max(maxKeyArr);
  };

  function byField(field) {
    return (a, b) => (a[field] < b[field] ? 1 : -1);
  }

  const createReasonsArray = (src) => {
    //accumulate values from source
    const reasonsAsMap = new Map();
    let uniqueYearLabelsArr = [];
    for (let i = 0; i < src.length; i += 1) {
      const reason = src[i][failReason];
      const year = yearFilter(src[i]);
      if (!uniqueYearLabelsArr.includes(year)) uniqueYearLabelsArr.push(year);
      const currentItem = {
        yearLabel: year,
        label: reason,
        value: 1,
      };
      if (reasonsAsMap.has(year + "-" + reason)) {
        let existedItem = reasonsAsMap.get(year + "-" + reason);
        existedItem.value += 1;
      } else {
        reasonsAsMap.set(year + "-" + reason, currentItem);
      }
    }

    //unite items with same key [reason]
    let transitArr = [...reasonsAsMap.values()];
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
    let result = [...subResult.values()];
    uniqueYearLabelsArr.sort();
    for (let i = 0; i < uniqueYearLabelsArr.length; i++) {
      result.map(function (el) {
        if (!el[uniqueYearLabelsArr[i]])
          return (el[uniqueYearLabelsArr[i]] = 0);
      });
    }

    return result.sort(byField(maxYearKey(result)));
  };

  let sourceReasonsArray = createReasonsArray(srcArray);
  //   let maxYearReasons = maxYearKey(sourceReasonsArray);

  let yMaxGroupsArr = [];
  sourceReasonsArray.forEach((el) => {
    Object.values(el).forEach((el2) => {
      if (!isNaN(el2)) yMaxGroupsArr.push(el2);
    });
  });

  let yMaxReasons = d3.max(yMaxGroupsArr);

  const arrayByField = (src) => {
    let result = [];
    src.forEach((el) => result.push(el[maxYearKey(src)]));
    return result;
  };

  const paretoArrayGen = (src) => {
    let result = [];
    let totalSum = arrayByField(src).reduce((sum, current) => {
      result.push(sum);
      return sum + current;
    });
    result.push(totalSum);
    return result.map((el) => Math.round((el / totalSum) * 1000) / 10);
  };

  let paretoArray = paretoArrayGen(sourceReasonsArray);
  for (let i = 0; i < sourceReasonsArray.length; i += 1) {
    sourceReasonsArray[i].valuePareto = paretoArray[i];
  }
  console.log("paretoArrayResultReasons", sourceReasonsArray);
  return { arr: sourceReasonsArray, y: yMaxReasons };
};
