import * as d3 from "d3";

import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  guiltyUnit,
} from "../config/config";

export const getStackedArr = (srcArray, startDate, endDate) => {
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

  const makeCustomCalendar = (step) => {
    var result = [];
    // var startDate = new Date(2022, 0, 1);
    // var endDate = new Date(2023, 6, 31);
    while (startDate <= endDate) {
      result.push(Date.parse(startDate));
      startDate.setDate(startDate.getDate() + step);
    }
    return result;
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
  // console.log("dates", dates);
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

  let customCalendar = makeCustomCalendar(20);
  // console.log("cal", makeCustomCalendar(3));

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

  // console.log("untidyList", unitedDatesResult, yMax);
  return { unitedDatesResult: unitedDatesResult, yMax: yMax };
};
