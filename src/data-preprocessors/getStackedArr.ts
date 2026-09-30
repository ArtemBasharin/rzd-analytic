import * as d3 from "d3";

import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  guiltyUnit,
} from "../utils/config";
import { Violation } from "../types/violation";

type CheckedUnit = { checked?: boolean; guiltyUnit: string };

type DurationPoint = {
  violationDate: Date;
  totalDuration: number;
  guiltyUnit: string;
};

type DateRow = { date: Date | number; [key: string]: any };

export const getStackedArr = (
  srcArray: Violation[],
  _: unknown,
  __: unknown,
  customCalendar: number[],
  unitsList?: CheckedUnit[] | null,
) => {
  const filterCheckedUnits = (srcArr: Violation[], units: string[]) => {
    let result: Violation[] = [];
    srcArr.forEach((el) => units.includes(el[guiltyUnit]) && result.push(el));
    return result;
  };

  let checkedUnitsSimpleArray: string[] = [];
  if (unitsList)
    unitsList.forEach(
      (el) => el.checked === true && checkedUnitsSimpleArray.push(el.guiltyUnit)
    );

  let filteredArrByUncheckedUnits: Violation[] = [];
  if (unitsList)
    filteredArrByUncheckedUnits = filterCheckedUnits(
      srcArray,
      checkedUnitsSimpleArray
    );
  else filteredArrByUncheckedUnits = srcArray;

  const calcTotalDuration = (obj: Violation) => {
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

  let summedDurationsList: DurationPoint[] = [];
  filteredArrByUncheckedUnits.forEach((el) =>
    summedDurationsList.push({
      violationDate: new Date(new Date(el[startTime]).setHours(0, 0, 0)),
      totalDuration: calcTotalDuration(el),
      guiltyUnit: el[guiltyUnit],
    })
  );

  let result: DateRow[] = [];
  let units = new Set<string>();
  let dates = new Set<Date>();

  for (let obj of summedDurationsList) {
    units.add(obj.guiltyUnit);
    dates.add(obj.violationDate);
  }

  for (let date of dates) {
    let obj: DateRow = { date };
    for (let unitName of units) {
      obj[unitName] = 0;
    }
    result.push(obj);
  }

  for (let obj of summedDurationsList) {
    let date = obj.violationDate;
    let unit = obj.guiltyUnit;
    let total = obj.totalDuration;
    let targetObj = result.find((row) => row.date === date)!;
    targetObj[unit] += total;
  }

  result.sort((a, b) => +a.date - +b.date);

  let unitedDatesResult: DateRow[] = [];
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

  let yMaxArr: number[] = [];
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
