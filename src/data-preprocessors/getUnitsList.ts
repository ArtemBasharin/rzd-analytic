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
import { cutDecimals } from "../config/functions";

export const getUnitsList = (
  arr: any[],
  startDate: Date,
  endDate: Date,
  customCalendar?: number[]
) => {
  let result = new Set();
  // console.log(customCalendar);
  // let startDate = new Date(d3.min(customCalendar));
  // let endDate = new Date(d3.max(customCalendar));
  // let startDate = new Date(d3.min(customCalendar));
  // let endDate = new Date(d3.max(customCalendar));
  let cutoffByDatesArr: any[] = [];
  // console.log(arr);

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

  const calcTotalDuration = (obj: any) => {
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

  let summedDurationsList: any[] = [];
  cutoffByDatesArr.forEach((el) =>
    summedDurationsList.push({
      violationDate: el[startTime],
      totalDuration: calcTotalDuration(el),
      guiltyUnit: el[guiltyUnit],
    })
  );
  // console.log("getUnitsList", summedDurationsList);

  let listItems: any[] = [];
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
      return (el.value = res);
    })
    .filter((el) => el.value !== 0);

  listItems.map((el) => (el.value = cutDecimals(el.value)));

  listItems.sort(function (a, b) {
    return b.value - a.value;
  });

  for (let i = 0; i < listItems.length; i++) {
    const color = (i: number) => {
      if (i < d3.schemeSet2.length) {
        return d3.schemeSet2[i];
      } else {
        return similarColors[i];
      }
    };
    listItems[i].checkboxColor = color(i);
  }

  ////////////////

  // console.log("listItems", listItems);
  return listItems;
};
