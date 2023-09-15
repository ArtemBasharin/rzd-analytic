import * as d3 from "d3";

import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  guiltyUnit,
} from "../config/config";

export const getStackedArr = (srcArray, dateStart, dateEnd, customCalendar) => {
  // console.log("customCalendar", customCalendar);
  // console.log("dateEnd", dateEnd);
  // console.log("dateStart", dateStart);

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
  srcArray.forEach((el) =>
    summedDurationsList.push({
      // violationDate: Date.parse(el[startTime]),
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

  // console.log("result0", result);
  result.sort((a, b) => a.date - b.date);
  // console.log("result1", result);

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

  let deletedEmptyDatesArr = unitedDatesResult.filter(
    (el) => Object.keys(el).length !== 1
  );

  // console.log("untidyList", deletedEmptyDatesArr, yMax);
  return { unitedDatesResult: deletedEmptyDatesArr, yMax: yMax };
};