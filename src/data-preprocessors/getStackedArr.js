import * as d3 from "d3";

import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  guiltyUnit,
} from "../config/config";

export const getStackedArr = (srcArray, _, __, customCalendar, unitsList) => {
  // console.log("customCalendar", customCalendar);
  // console.log("dateEnd", dateEnd);
  // console.log("dateStart", dateStart);
  // console.log("srcArray", srcArray);
  console.log("unitsList", unitsList);

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
  // console.log("checkedUnits", checkedUnitsSimpleArray);

  let filteredArrByUncheckedUnits = [];
  if (unitsList)
    filteredArrByUncheckedUnits = filterCheckedUnits(
      srcArray,
      checkedUnitsSimpleArray
    );
  else filteredArrByUncheckedUnits = srcArray;
  // console.log("filteredArrByUncheckedUnits", filteredArrByUncheckedUnits);

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

  const setHHMMSStoZero = (date) => {
    var customDate = new Date(date); // произвольная переменная с датой и временем
    customDate.setSeconds(0); // обнуление секунд
    customDate.setMinutes(0); // обнуление минут
    customDate.setHours(0); // обнуление часов
    return Date.parse(customDate);
    // return customDate;
  };

  let summedDurationsList = [];
  filteredArrByUncheckedUnits.forEach((el) =>
    summedDurationsList.push({
      violationDate: setHHMMSStoZero(el[startTime]),
      totalDuration: calcTotalDuration(el),
      guiltyUnit: el[guiltyUnit],
    })
  );
  // console.log("summedDurationsList", summedDurationsList);

  let result = [];
  let units = new Set();
  let dates = new Set();

  // Collect unique units and dates
  for (let obj of summedDurationsList) {
    units.add(obj.guiltyUnit);
    dates.add(obj.violationDate);
  }

  // Initialize result array with objects having 0 values for each unit
  for (let date of dates) {
    let obj = { date };
    for (let guiltyUnit of units) {
      obj[guiltyUnit.toString()] = 0;
    }
    result.push(obj);
  }

  // Calculate totals for each unit and date
  for (let obj of summedDurationsList) {
    let date = obj.violationDate;
    let unit = obj.guiltyUnit;
    let total = obj.totalDuration;
    let targetObj = result.find((obj) => obj.date === date);
    targetObj[unit] += total;
  }

  result.sort((a, b) => a.date - b.date);
  // console.log("result2", result);

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
  // console.log("unitedDatesResult", unitedDatesResult);

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

  // console.log(Array.from(units));
  // console.log("filledByZeroValues", unitedDatesResult);

  return {
    arr: unitedDatesResult,
    yMax: yMax,
  };
};
