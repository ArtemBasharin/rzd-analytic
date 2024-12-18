import moment from "moment-timezone";
import {
  ID,
  startTime,
  freightDelayed,
  passDelayed,
  subDelayed,
  otherDelayed,
  guiltyUnit,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  failReason,
  failKind,
  place,
} from "../utils/config";
import {
  getDaysBetweenDates,
  firstCharToLowerCase,
  cutDecimals,
} from "../utils/functions";

export const getReportStationsArr = (
  sourceArr: any[],
  dateStart: number,
  dateEnd: number,
  minValue?: number
) => {
  moment().tz("Europe/London").format();

  const calcTotalDuration = (obj: any) => {
    let freightDur = obj[freightDuration] || 0;
    let passDur = obj[passDuration] || 0;
    let subDur = obj[subDuration] || 0;
    let otherDur = obj[otherDuration] || 0;
    let total = freightDur + passDur + subDur + otherDur;
    return total;
  };

  const calcTotalDelayed = (obj: any) => {
    let freightDel = obj[freightDelayed] || 0;
    let passDel = obj[passDelayed] || 0;
    let subDel = obj[subDelayed] || 0;
    let otherDel = obj[otherDelayed] || 0;
    let total = freightDel + passDel + subDel + otherDel;
    return total;
  };

  const getFilteredByPeriodArr = () => {
    let srcArrayInDatesFrame: any[] = [];

    if (dateStart && dateEnd) {
      let daysBetweenDates: number = getDaysBetweenDates(dateStart, dateEnd);
      let [dateStartCurrentYear, dateEndCurrentYear] = [dateStart, dateEnd];
      let dateEndPastYear = new Date(dateEndCurrentYear);
      dateEndPastYear.setFullYear(dateEndPastYear.getFullYear() - 1);

      let dateStartPastYear =
        dateEndPastYear.getTime() -
        daysBetweenDates * 24 * 60 * 60 * 1000 +
        1000;

      sourceArr.forEach((el) => {
        if (
          (Date.parse(el[startTime]) >= dateStartCurrentYear &&
            Date.parse(el[startTime]) <= dateEndCurrentYear) ||
          (Date.parse(el[startTime]) >= dateStartPastYear &&
            Date.parse(el[startTime]) <= dateEndPastYear.getTime())
        ) {
          srcArrayInDatesFrame.push({
            ID: el[ID],
            guiltyUnit: el[guiltyUnit],
            startTime: el[startTime],
            failReason: el[failReason],
            failKind: el[failKind],
            freightDuration: el[freightDuration] || 0,
            passDuration: el[passDuration] || 0,
            subDuration: el[subDuration] || 0,
            otherDuration: el[otherDuration] || 0,
            freightDelayed: el[freightDelayed] || 0,
            passDelayed: el[passDelayed] || 0,
            subDelayed: el[subDelayed] || 0,
            otherDelayed: el[otherDelayed] || 0,
            totalDelayed: calcTotalDelayed(el),
            totalDuration: calcTotalDuration(el),
            place: el[place],
          });
        }
      });
    }
    return srcArrayInDatesFrame.map((el) => {
      if (el.failReason)
        return { ...el, failReason: firstCharToLowerCase(el.failReason) };
      return el;
    });
  };

  function aggregateData(inputArray: any[]) {
    const resultMap = new Map();

    inputArray.forEach((item) => {
      const keyPlace = item.place; // keyPlace — это объект
      const keyGuiltyUnit = item.guiltyUnit;

      // Если keyPlace уже есть в resultMap
      if (resultMap.has(keyPlace)) {
        const existingPlace = resultMap.get(keyPlace);
        existingPlace.count++;
        if (!existingPlace.failReason.includes(item.failReason)) {
          existingPlace.failReason.push(item.failReason);
        }
        existingPlace.freightDelayed += item.freightDelayed;
        existingPlace.freightDuration += item.freightDuration;
        existingPlace.passDelayed += item.passDelayed;
        existingPlace.passDuration += item.passDuration;
        existingPlace.subDelayed += item.subDelayed;
        existingPlace.subDuration += item.subDuration;
        existingPlace.otherDelayed += item.otherDelayed;
        existingPlace.otherDuration += item.otherDuration;

        // Обновляем свойство keyGuiltyUnit
        if (existingPlace[keyGuiltyUnit]) {
          const existingUnit = existingPlace[keyGuiltyUnit];
          existingUnit.count++;
          existingUnit.freightDelayed += item.freightDelayed;
          existingUnit.freightDuration += item.freightDuration;
          existingUnit.passDelayed += item.passDelayed;
          existingUnit.passDuration += item.passDuration;
          existingUnit.subDelayed += item.subDelayed;
          existingUnit.subDuration += item.subDuration;
          existingUnit.otherDelayed += item.otherDelayed;
          existingUnit.otherDuration += item.otherDuration;
        } else {
          existingPlace[keyGuiltyUnit] = {
            count: 1,
            freightDelayed: item.freightDelayed,
            freightDuration: item.freightDuration,
            passDelayed: item.passDelayed,
            passDuration: item.passDuration,
            subDelayed: item.subDelayed,
            subDuration: item.subDuration,
            otherDelayed: item.otherDelayed,
            otherDuration: item.otherDuration,
          };
        }
      } else {
        // Если keyPlace отсутствует в resultMap
        const newPlace = {
          ...item,
          count: 1,
          failReason: [item.failReason], // Используем массив для хранения причин
        };

        // Добавляем свойство keyGuiltyUnit в keyPlace
        newPlace[keyGuiltyUnit] = {
          count: 1,
          freightDelayed: item.freightDelayed,
          freightDuration: item.freightDuration,
          passDelayed: item.passDelayed,
          passDuration: item.passDuration,
          subDelayed: item.subDelayed,
          subDuration: item.subDuration,
          otherDelayed: item.otherDelayed,
          otherDuration: item.otherDuration,
        };

        resultMap.set(keyPlace, newPlace);
      }
    });

    resultMap.forEach((value) => {
      delete value.startTime;
      delete value.guiltyUnit;
      delete value.failReason;
      delete value.failKind;
    });

    const resultArray = Array.from(resultMap, ([key, value]) => value);
    resultArray.forEach((el) => {
      el.place = el.place.split(",").slice(-1).join("");
      el.totalDelayed = cutDecimals(
        el.freightDelayed + el.passDelayed + el.subDelayed + el.otherDelayed
      );
      el.totalDuration = cutDecimals(
        el.freightDuration + el.passDuration + el.subDuration + el.otherDuration
      );
    });

    resultArray.sort((a, b) => b.count - a.count);
    return resultArray;
  }

  function aggregateDataWithYearAndReport(inputArray: any[]) {
    const resultArray: any[] = [];

    inputArray.forEach((item: any) => {
      const year = new Date(item.startTime).getFullYear();
      const existingItem = resultArray.find((element) => element.year === year);

      if (existingItem) {
        existingItem.report.push(item);
      } else {
        resultArray.push({ year, report: [item] });
      }
    });
    resultArray.forEach((item) => {
      item.report = aggregateData(item.report);
    });
    console.log(resultArray);
    return resultArray;
  }

  return aggregateDataWithYearAndReport(getFilteredByPeriodArr());
};

export {};
