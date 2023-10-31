import * as d3 from "d3";
import {
  guiltyUnit,
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  similarColors,
} from "../config/config";

export const getUnitsList = (arr, _, __, customCalendar) => {
  let result = new Set();
  console.log(customCalendar);
  let startDate = new Date(d3.min(customCalendar));
  let endDate = new Date(d3.max(customCalendar));
  let cutoffByDatesArr = [];
  console.log(arr);

  let key = "";
  if (Object.keys(arr[0]).includes("guiltyUnit")) {
    key = "guiltyUnit";
  }
  if (Object.keys(arr[0]).includes(guiltyUnit)) {
    key = guiltyUnit;
  }
  arr.forEach((element) => {
    let date = new Date(element[startTime]);
    if (date >= startDate && date <= endDate) {
      result.add(element[key]);
      cutoffByDatesArr.push(element);
    }
  });
  // console.log("cutoffByDatesArr", cutoffByDatesArr);

  const calcTotalDuration = (obj) => {
    let freightDur,
      passDur,
      subDur,
      otherDur = 0;
    obj[freightDuration]
      ? (freightDur = obj[freightDuration])
      : (freightDur = 0);
    obj[passDuration] ? (passDur = obj[passDuration]) : (passDur = 0);
    obj[subDuration] ? (subDur = obj[subDuration]) : (subDur = 0);
    obj[otherDuration] ? (otherDur = obj[otherDuration]) : (otherDur = 0);
    let total = freightDur + passDur + subDur + otherDur;
    return total;
  };

  let summedDurationsList = [];
  cutoffByDatesArr.forEach((el) =>
    summedDurationsList.push({
      violationDate: el[startTime],
      totalDuration: calcTotalDuration(el),
      guiltyUnit: el[guiltyUnit],
    })
  );
  // console.log("getUnitsList", summedDurationsList);

  let listItems = [];
  let uniqueNames = Array.from(result);
  for (let i = 0; i < uniqueNames.length; i++) {
    listItems.push({
      guiltyUnit: uniqueNames[i],
      checked: true,
      isDisabled: false,
      value: 0,
    });
  }

  // console.log(listItems);

  const cutDecimals = (total) => {
    const decimals = () => {
      let res = "";
      if (Math.round(total) < 0.1) {
        res = 2;
      } else {
        res = Math.floor(total).toString().length;
      }
      return res;
    };

    const toRound = (value) => {
      let dec = Math.pow(10, decimals());
      return Math.round(Number(value.toFixed(30)) * dec) / dec;
    };

    // console.log(Number(total.toFixed(2)));
    return toRound(total);
  };

  listItems
    .map((el) => {
      let res = summedDurationsList.reduce(function (
        currentSum,
        currentNumber
      ) {
        if (el.guiltyUnit === currentNumber.guiltyUnit)
          return currentSum + currentNumber.totalDuration;
        return currentSum;
      },
      0);
      return (el.value = cutDecimals(res));
    })
    .filter((el) => el.value !== 0);

  listItems.sort(function (a, b) {
    return b.value - a.value;
  });

  for (let i = 0; i < listItems.length; i++) {
    const color = (i) => {
      if (i < d3.schemeSet2.length) {
        return d3.schemeSet2[i];
      } else {
        return similarColors[i];
      }
    };
    listItems[i].checkboxColor = color(i);
  }

  ////////////////

  console.log("listItems", listItems);
  return listItems;
};
