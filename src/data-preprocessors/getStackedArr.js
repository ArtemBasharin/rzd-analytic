import * as d3 from "d3";

import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  guiltyUnit,
} from "../utils/config";

export const getStackedArr = (srcArray, _, __, customCalendar, unitsList) => {
  const filterCheckedUnits = (srcArr, units) => {
    let result = [];
    srcArr.forEach((el) => units.includes(el[guiltyUnit]) && result.push(el));
    return result;
  };

  let checkedUnitsSimpleArray = [];
  if (unitsList)
    unitsList.forEach(
      (el) => el.checked === true && checkedUnitsSimpleArray.push(el.guiltyUnit)
    );

  let filteredArrByUncheckedUnits = [];
  if (unitsList)
    filteredArrByUncheckedUnits = filterCheckedUnits(
      srcArray,
      checkedUnitsSimpleArray
    );
  else filteredArrByUncheckedUnits = srcArray;

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
  filteredArrByUncheckedUnits.forEach((el) =>
    summedDurationsList.push({
      violationDate: new Date(new Date(el[startTime]).setHours(0, 0, 0)),
      totalDuration: calcTotalDuration(el),
      guiltyUnit: el[guiltyUnit],
    })
  );

  let result = [];
  let units = new Set();
  let dates = new Set();

  for (let obj of summedDurationsList) {
    units.add(obj.guiltyUnit);
    dates.add(obj.violationDate);
  }

  for (let date of dates) {
    let obj = { date };
    for (let guiltyUnit of units) {
      obj[guiltyUnit] = 0;
    }
    result.push(obj);
  }

  for (let obj of summedDurationsList) {
    let date = obj.violationDate;
    let unit = obj.guiltyUnit;
    let total = obj.totalDuration;
    let targetObj = result.find((obj) => obj.date === date);
    targetObj[unit] += total;
  }

  result.sort((a, b) => a.date - b.date);

  let unitedDatesResult = [];
  for (let i = 0; i < customCalendar.length - 1; i++) {
    const currentDate = customCalendar[i];
    const nextDate = customCalendar[i + 1];
    unitedDatesResult.push({ date: currentDate });
    result.forEach((el) => {
      if (el.date >= currentDate && el.date < nextDate) {
        for (let key in el) {
          if (unitedDatesResult[i].hasOwnProperty(key) && key !== "date") {
            unitedDatesResult[i][key] = unitedDatesResult[i][key] + el[key];
          } else {
            unitedDatesResult[i][key] = el[key];
          }
        }
      }
    });
  }

  let yMaxArr = [];
  unitedDatesResult.forEach((el) => {
    let acc = 0;
    for (const key in el) {
      if (key !== "date") {
        acc = acc + el[key];
      }
    }
    yMaxArr.push(acc);
  });

  let yMax = d3.max(yMaxArr);

  let unitsAsArr = Array.from(units);
  unitedDatesResult.map((el) =>
    Object.keys(el).length === 1
      ? unitsAsArr.forEach((unit) => (el[unit] = 0))
      : el
  );

  return {
    arr: unitedDatesResult,
    yMax: yMax,
  };
};
