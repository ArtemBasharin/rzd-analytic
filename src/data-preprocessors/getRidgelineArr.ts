import * as d3 from "d3";

import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  guiltyUnit,
} from "../utils/config";

export const getRidgelineArr = (
  srcArray: any,
  dateStart: Date,
  dateEnd: Date,
  _: string[],
  unitsList: any[]
) => {
  const filterUnits = (srcArr: any[], units: any[]) => {
    let result: any[] = [];
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

  let checkedUnitsSimpleArray: string[] = [];
  if (unitsList)
    unitsList.forEach(
      (el) => el.checked === true && checkedUnitsSimpleArray.push(el.guiltyUnit)
    );

  let filteredArrByUncheckedUnits = [];
  if (unitsList)
    filteredArrByUncheckedUnits = filterUnits(
      srcArray,
      checkedUnitsSimpleArray
    );
  else filteredArrByUncheckedUnits = srcArray;

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

  const setHHMMSStoZero = (date: string) => {
    var customDate = new Date(date);
    customDate.setSeconds(0);
    customDate.setMinutes(0);
    customDate.setHours(0);
    return customDate;
  };

  let summedDurationsList: any[] = [];
  filteredArrByUncheckedUnits.forEach((el: any) =>
    summedDurationsList.push({
      date: setHHMMSStoZero(el[startTime]),
      value: calcTotalDuration(el),
      name: el[guiltyUnit],
    })
  );

  function combineData(arr: any[]) {
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

  let unitedByEqualDatesArr: any[] = combineData(summedDurationsList);

  unitedByEqualDatesArr.sort((a: any, b: any) => a.date - b.date);

  const transformArrayWithDates = (
    arr: any[],
    startDate: Date,
    endDate: Date
  ) => {
    const result: any[] = [];
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

  let sortByCheckListArr: any[] = [];
  checkedUnitsSimpleArray.forEach((unit) =>
    addedEmptyValuesByDate.forEach(
      (el) => el.name === unit && sortByCheckListArr.push(el)
    )
  );

  let values: number[] = [];
  unitedByEqualDatesArr.forEach((el) => values.push(el.value));
  let yMax = d3.max(values);

  return {
    arr: sortByCheckListArr,
    yMax: yMax,
  };
};
