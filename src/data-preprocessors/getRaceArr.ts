import {
  startTime,
  guiltyUnit,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
} from "../utils/config";
// import { cutDecimals } from "../config/functions";

export const getRaceArr = (
  srcArray: any[],
  dateStart: string,
  dateEnd: string
  // unitsList: any[]
) => {
  const calcTotalDurationValue = (obj: any) => {
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
    let total = (freightDur + passDur + subDur + otherDur) / 60;
    return total;
  };

  let srcArrayInDatesFrame: any[] = [];
  srcArray.forEach((el) => {
    if (
      Date.parse(el[startTime]) >= new Date(dateStart).getTime() &&
      Date.parse(el[startTime]) <= new Date(dateEnd).getTime()
    ) {
      srcArrayInDatesFrame.push({
        date: new Date(new Date(el[startTime]).setHours(0, 0, 0)),
        name: el[guiltyUnit],
        totalDuration: calcTotalDurationValue(el),
        freightDuration: el[freightDuration] / 60 || 0,
        passDuration: el[passDuration] / 60 || 0,
        subDuration: el[subDuration] / 60 || 0,
        otherDuration: el[otherDuration] / 60 || 0,
      });
    }
  });

  interface SourceObj {
    date: Date;
    name: string;
    totalDuration: number;
    freightDuration: number;
    passDuration: number;
    subDuration: number;
    otherDuration: number;
  }

  function mergeObjects(arr: SourceObj[]): SourceObj[] {
    const result: Map<string, SourceObj> = new Map();

    for (const obj of arr) {
      const key = `${obj.date.toISOString()}_${obj.name}`;

      if (result.has(key)) {
        const existing = result.get(key)!;
        existing.totalDuration += obj.totalDuration;
        existing.freightDuration += obj.freightDuration;
        existing.passDuration += obj.passDuration;
        existing.subDuration += obj.subDuration;
        existing.otherDuration += obj.otherDuration;
      } else {
        const clone = { ...obj };
        result.set(key, clone);
      }
    }

    return Array.from(result.values());
  }

  console.log("mergeObjects", mergeObjects(srcArrayInDatesFrame));
  return mergeObjects(srcArrayInDatesFrame);
};
