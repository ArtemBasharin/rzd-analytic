import * as d3 from "d3";

import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  guiltyUnit,
} from "../config/config";

export const getRidgelineArr = (srcArray, dateStart, dateEnd, _, unitsList) => {
  // console.log("dateEnd", dateEnd);
  // console.log("dateStart", dateStart);
  // console.log("srcArray", srcArray);
  // console.log("unitsList", unitsList);

  const filterUnits = (srcArr, units) => {
    let result = [];
    srcArr.forEach((el) => {
      if (
        units.includes(el[guiltyUnit]) &&
        new Date(el[startTime]) >= dateStart &&
        new Date(el[startTime]) < dateEnd
      )
        result.push(el);
    });
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
    filteredArrByUncheckedUnits = filterUnits(
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
    // return Date.parse(customDate);
    return customDate;
  };

  let summedDurationsList = [];
  filteredArrByUncheckedUnits.forEach((el) =>
    summedDurationsList.push({
      date: setHHMMSStoZero(el[startTime]),
      value: calcTotalDuration(el),
      name: el[guiltyUnit],
    })
  );

  function combineData(arr) {
    const combinedData = arr.reduce((acc, curr) => {
      const key = curr.date + curr.name;
      if (acc[key]) {
        acc[key].value += curr.value;
      } else {
        acc[key] = {
          date: curr.date,
          value: curr.value,
          name: curr.name,
        };
      }
      return acc;
    }, {});

    const result = Object.values(combinedData);
    return result;
  }

  let unitedByEqualDatesArr = combineData(summedDurationsList);

  unitedByEqualDatesArr.sort((a, b) => a.date - b.date);
  // console.log("unitedByEqualDatesArr", unitedByEqualDatesArr);

  const transformArrayWithDates = (arr, startDate, endDate) => {
    const result = [];
    const uniqueNames = new Set(arr.map((item) => item.name));

    uniqueNames.forEach((name) => {
      const nameEntries = arr.filter((item) => item.name === name);
      const currentDate = new Date(startDate);

      while (currentDate <= new Date(endDate)) {
        const existingEntry = nameEntries.find(
          (item) =>
            new Date(item.date).toDateString() === currentDate.toDateString()
        );
        if (existingEntry) {
          result.push(existingEntry);
        } else {
          result.push({
            date: new Date(currentDate.toISOString()),
            value: 0,
            name: name,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return result;
  };

  let addedEmptyValuesByDate = transformArrayWithDates(
    unitedByEqualDatesArr,
    dateStart,
    dateEnd
  );
  console.log("addedEmptyValuesByDate", addedEmptyValuesByDate);

  let sortByCheckListArr = [];
  checkedUnitsSimpleArray.forEach((unit) =>
    addedEmptyValuesByDate.forEach(
      (el) => el.name === unit && sortByCheckListArr.push(el)
    )
  );

  let values = [];
  unitedByEqualDatesArr.forEach((el) => values.push(el.value));
  // console.log("values", values);
  let yMax = d3.max(values);

  // console.log(Array.from(units));
  // console.log("summedDurationsList", {
  //   arr: summedDurationsList,
  //   yMax: yMax,
  // });
  // console.log("unitedByEqualDatesArr", unitedByEqualDatesArr);

  return {
    arr: sortByCheckListArr,
    yMax: yMax,
  };
};
