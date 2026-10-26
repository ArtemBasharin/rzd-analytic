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

type DateRow = { date: Date | number; [key: string]: any };

export const getStackedArr = (
  srcArray: Violation[],
  _: unknown,
  __: unknown,
  customCalendar: number[],
  unitsList?: CheckedUnit[] | null,
) => {
  const checked = unitsList
    ? new Set(
        unitsList.filter((el) => el.checked).map((el) => el.guiltyUnit),
      )
    : null;

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

  const rangeStart = customCalendar[0];
  const rangeEnd = customCalendar[customCalendar.length - 1];
  const byDay = new Map<number, DateRow>();
  const units = new Set<string>();

  for (const el of srcArray) {
    const unit = el[guiltyUnit];
    if (checked && !checked.has(unit)) continue;
    const ts = new Date(el[startTime]).setHours(0, 0, 0);
    if (
      customCalendar.length >= 2 &&
      (ts < rangeStart || ts >= rangeEnd)
    ) {
      continue;
    }
    units.add(unit);
    const row = byDay.get(ts);
    if (row) {
      row[unit] = (row[unit] || 0) + calcTotalDuration(el);
    } else {
      byDay.set(ts, { date: ts, [unit]: calcTotalDuration(el) });
    }
  }

  const result = Array.from(byDay.values()).sort((a, b) => +a.date - +b.date);

  const unitedDatesResult: DateRow[] = [];
  let eventIndex = 0;
  for (let i = 0; i < customCalendar.length - 1; i++) {
    const currentDate = customCalendar[i];
    const nextDate = customCalendar[i + 1];
    const bucket: DateRow = { date: currentDate };
    while (
      eventIndex < result.length &&
      Number(result[eventIndex].date) < currentDate
    ) {
      eventIndex += 1;
    }
    let cursor = eventIndex;
    let lastDate: number | undefined;
    while (cursor < result.length && Number(result[cursor].date) < nextDate) {
      const el = result[cursor];
      lastDate = Number(el.date);
      for (const key in el) {
        if (key === "date") continue;
        bucket[key] = (bucket[key] || 0) + el[key];
      }
      cursor += 1;
    }
    if (lastDate !== undefined) bucket.date = lastDate;
    unitedDatesResult.push(bucket);
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

  const unitsAsArr = Array.from(units);
  for (const el of unitedDatesResult) {
    for (const unit of unitsAsArr) {
      if (el[unit] == null) el[unit] = 0;
    }
  }

  return {
    arr: unitedDatesResult,
    yMax: yMax,
  };
};
