// import * as d3 from "d3";

import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  guiltyUnit,
} from "../config/config";

export const getArrDurationsPerDay = (srcArray) => {
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
    var startDate = new Date(2023, 0, 1); // Начальная дата (1 января)
    var endDate = new Date(2023, 11, 31); // Конечная дата (31 декабря)
    // Цикл по дням от начальной до конечной даты с заданным шагом
    while (startDate <= endDate) {
      // Создаем объект даты в требуемом формате и добавляем в массив результатов
      result.push(
        new Date(`2023, ${startDate.getMonth() + 1}, ${startDate.getDate()}`)
      );

      startDate.setDate(startDate.getDate() + step); // Увеличиваем дату на заданный шаг дней
    }
    return result;
  };

  const setHHMMSStoZero = (date) => {
    var customDate = new Date(date); // произвольная переменная с датой и временем
    customDate.setSeconds(0); // обнуление секунд
    customDate.setMinutes(0); // обнуление минут
    customDate.setHours(0); // обнуление часов
    return Date.parse(customDate);
  };

  console.log("cal", makeCustomCalendar(7));

  let customCalendar = makeCustomCalendar(7);

  let summedDurationsList = [];
  //   for (let i = 0; i < customCalendar.length; i++) {
  //     const d = customCalendar[i];
  srcArray.forEach((el) =>
    summedDurationsList.push({
      // violationDate: Date.parse(el[startTime]),
      violationDate: setHHMMSStoZero(el[startTime]),
      totalDuration: calcTotalDuration(el),
      guiltyUnit: el[guiltyUnit],
    })
  );

  // let unitsList = [];
  // let map = new Map();
  // for (let obj of result) {
  //   let key = obj.guiltyUnit;
  //   let value = obj.totalDuration;
  //   if (map.has(key)) {
  //     let sum = map.get(key) + value;
  //     map.set(key, sum);
  //   } else {
  //     map.set(key, value);
  //   }
  // }
  // for (let [key, value] of map) {
  //   unitsList.push({ guiltyUnit: key, totalDuration: value });
  // }

  // unitsList.sort((a, b) => b.totalDuration - a.totalDuration);
  // let sortedList = [];
  // unitsList.forEach((element) => {
  //   sortedList.push(element.guiltyUnit);
  // });
  console.log("summedDurationsList", summedDurationsList);

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
  // let sortedList = [];
  // unitsList.forEach((element) => {
  //   sortedList.push(element.guiltyUnit);
  // });

  console.log("untidyList", result);
  return result;
};
