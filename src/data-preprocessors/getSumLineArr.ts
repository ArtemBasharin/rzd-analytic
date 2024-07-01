import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  // otherDuration,
  guiltyUnit,
  freightDelayed,
  passDelayed,
  subDelayed,
  // otherDelayed,
  failCategory,
  failKind,
} from "../utils/config";

export const getSumLineArr = (
  srcArray: any[],
  customCalendar: number[],
  unitsList: any[]
) => {
  const filterCheckedUnits = (srcArr: any[], units: string[]) => {
    let result: any[] = [];
    srcArr.forEach((el) => units.includes(el[guiltyUnit]) && result.push(el));
    return result;
  };

  let checkedUnitsSimpleArray: string[] = [];
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
  //   console.log("filteredArrByUncheckedUnits", filteredArrByUncheckedUnits);

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
    // obj[otherDuration] ? (otherDur = obj[otherDuration]) : (otherDur = 0);
    let total = freightDur + passDur + subDur + otherDur;
    return total;
  };

  const calcTotalDelayed = (obj: any) => {
    let freightDel,
      passDel,
      subDel,
      otherDel = 0;
    obj[freightDelayed] ? (freightDel = obj[freightDelayed]) : (freightDel = 0);
    obj[passDelayed] ? (passDel = obj[passDelayed]) : (passDel = 0);
    obj[subDelayed] ? (subDel = obj[subDelayed]) : (subDel = 0);
    // obj[otherDelayed] ? (otherDel = obj[otherDelayed]) : (otherDel = 0);
    let total = freightDel + passDel + subDel + otherDel;
    return total;
  };

  let summedDurationsList: any[] = [];
  filteredArrByUncheckedUnits.forEach((el) =>
    summedDurationsList.push({
      //   guiltyUnit: el[guiltyUnit],
      date: new Date(el[startTime]).setHours(0, 0, 0),
      totalDuration: calcTotalDuration(el),
      totalDelayed: calcTotalDelayed(el),
      passDuration: el[passDuration] || 0,
      subDuration: el[subDuration] || 0,
      freightDuration: el[freightDuration] || 0,
      // otherDuration: el[otherDuration] || 0,
      passDelayed: el[passDelayed] || 0,
      subDelayed: el[subDelayed] || 0,
      freightDelayed: el[freightDelayed] || 0,
      // otherDelayed: el[otherDelayed] || 0,
      technicalKind: el[failKind] === "Нарушение технического вида" ? 1 : 0,
      technologicalKind: el[failKind] === "Технологическое нарушение" ? 1 : 0,
      specialKind:
        el[failKind] === "Особая технологическая необходимость" ? 1 : 0,
      otherKind: el[failKind] === "Прочие причины" ? 1 : 0,
      firstCat: el[failCategory] === "1 категория" ? 1 : 0,
      secondCat: el[failCategory] === "2 категория" ? 1 : 0,
    })
  );

  interface DurationSummary {
    date: number;
    [key: string]: number;
  }

  let summaries: { [key: string]: DurationSummary } = {};

  for (let obj of summedDurationsList) {
    const key = obj.date;
    if (!summaries[key]) {
      summaries[key] = { date: obj.date };
    }
    for (let property in obj) {
      if (property !== "date") {
        summaries[key][property] =
          (summaries[key][property] || 0) + obj[property];
      }
    }
  }

  let result: DurationSummary[] = Object.values(summaries);
  result.sort((a, b) => a.date - b.date);

  type CustomData = {
    date: number;
    totalDuration?: number;
    totalDelayed?: number;
    passDuration?: number;
    subDuration?: number;
    freightDuration?: number;
    // otherDuration?: number;
    passDelayed?: number;
    subDelayed?: number;
    freightDelayed?: number;
    // otherDelayed?: number;
    technicalKind?: number;
    technologicalKind?: number;
    specialKind?: number;
    // otherKind?: number;
    firstCat?: number;
    secondCat?: number;
  };

  let unitedDatesResult: CustomData[] = [];

  const uniqueDates: { [date: string]: boolean } = {};

  for (let i = 0; i < customCalendar.length - 1; i++) {
    const currentDate = customCalendar[i];
    const nextDate = customCalendar[i + 1];

    for (let el of result) {
      if (el.date >= currentDate && el.date < nextDate) {
        if (!uniqueDates[currentDate]) {
          const newData: CustomData = { date: currentDate };
          for (let key in el) {
            if (key !== "date") {
              if (key in newData) {
                newData[key as keyof CustomData] =
                  (newData[key as keyof CustomData] || 0) + el[key];
              } else {
                newData[key as keyof CustomData] = el[key];
              }
            }
          }
          unitedDatesResult.push(newData);
          uniqueDates[currentDate] = true;
        }
      }
    }
  }

  console.log("unitedDatesResult", unitedDatesResult);
  let deletedEmptyDatesArr = unitedDatesResult.filter(
    (el) => Object.keys(el).length > 1
  );

  function findMaxValues(arr: DurationSummary[]) {
    let maxValues: { [key: string]: number } = {};
    for (let obj of arr) {
      for (let key in obj) {
        if (typeof obj[key] === "number") {
          if (maxValues[key] === undefined || obj[key] > maxValues[key]) {
            maxValues[key] = obj[key];
          }
        }
      }
    }
    return maxValues;
  }

  let maxValues = findMaxValues(deletedEmptyDatesArr);
  console.log("sumLineRes", deletedEmptyDatesArr);

  return {
    arr: deletedEmptyDatesArr,
    yMax: maxValues,
  };
};
