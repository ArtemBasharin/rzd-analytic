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

  // function aggregateData(inputArray: any[]) {
  //   console.log("inputArray", inputArray);
  //   const resultMap = new Map();

  //   inputArray.forEach((item) => {
  //     const keyPlace = item.place; // keyPlace — это строка
  //     const keyGuiltyUnit = item.guiltyUnit;

  //     // Если keyPlace уже есть в resultMap
  //     if (resultMap.has(keyPlace)) {
  //       const existingPlace = resultMap.get(keyPlace);
  //       existingPlace.count++;
  //       existingPlace.freightDelayed += item.freightDelayed;
  //       existingPlace.freightDuration += item.freightDuration;
  //       existingPlace.passDelayed += item.passDelayed;
  //       existingPlace.passDuration += item.passDuration;
  //       existingPlace.subDelayed += item.subDelayed;
  //       existingPlace.subDuration += item.subDuration;
  //       existingPlace.otherDelayed += item.otherDelayed;
  //       existingPlace.otherDuration += item.otherDuration;

  //       // Обновляем свойство keyGuiltyUnit
  //       if (existingPlace[keyGuiltyUnit]) {
  //         const existingUnit = existingPlace[keyGuiltyUnit];
  //         existingUnit.count++;
  //         existingUnit.freightDelayed += item.freightDelayed;
  //         existingUnit.freightDuration += item.freightDuration;
  //         existingUnit.passDelayed += item.passDelayed;
  //         existingUnit.passDuration += item.passDuration;
  //         existingUnit.subDelayed += item.subDelayed;
  //         existingUnit.subDuration += item.subDuration;
  //         existingUnit.otherDelayed += item.otherDelayed;
  //         existingUnit.otherDuration += item.otherDuration;
  //       } else {
  //         existingPlace[keyGuiltyUnit] = {
  //           count: 1,
  //           freightDelayed: item.freightDelayed,
  //           freightDuration: item.freightDuration,
  //           passDelayed: item.passDelayed,
  //           passDuration: item.passDuration,
  //           subDelayed: item.subDelayed,
  //           subDuration: item.subDuration,
  //           otherDelayed: item.otherDelayed,
  //           otherDuration: item.otherDuration,
  //         };
  //       }
  //     } else {
  //       // Если keyPlace отсутствует в resultMap
  //       const newPlace = {
  //         ...item,
  //         count: 1,
  //       };

  //       // Добавляем свойство keyGuiltyUnit в keyPlace
  //       newPlace[keyGuiltyUnit] = {
  //         count: 1,
  //         freightDelayed: item.freightDelayed,
  //         freightDuration: item.freightDuration,
  //         passDelayed: item.passDelayed,
  //         passDuration: item.passDuration,
  //         subDelayed: item.subDelayed,
  //         subDuration: item.subDuration,
  //         otherDelayed: item.otherDelayed,
  //         otherDuration: item.otherDuration,
  //       };

  //       resultMap.set(keyPlace, newPlace);
  //     }
  //   });

  //   resultMap.forEach((value) => {
  //     delete value.startTime;
  //     delete value.guiltyUnit;
  //     delete value.failReason;
  //     delete value.failKind;
  //   });

  //   console.log(resultMap);

  //   const resultArray = Array.from(resultMap, ([key, value]) => value);
  //   resultArray.forEach((el) => {
  //     el.place = el.place.split(",").slice(-1).join("");
  //     el.totalDelayed = cutDecimals(
  //       el.freightDelayed + el.passDelayed + el.subDelayed + el.otherDelayed
  //     );
  //     el.totalDuration = cutDecimals(
  //       el.freightDuration + el.passDuration + el.subDuration + el.otherDuration
  //     );
  //   });

  //   resultArray.sort((a, b) => b.count - a.count);
  //   return resultArray;
  // }

  type InputItem = {
    place: string;
    guiltyUnit: string;
    failReason: string;
    freightDelayed: number;
    freightDuration: number;
    passDelayed: number;
    passDuration: number;
    subDelayed: number;
    subDuration: number;
    otherDelayed: number;
    otherDuration: number;
    startTime?: string;
    failKind?: string;
  };

  type GuiltyUnitData = {
    count: number;
    freightDelayed: number;
    freightDuration: number;
    passDelayed: number;
    passDuration: number;
    subDelayed: number;
    subDuration: number;
    otherDelayed: number;
    otherDuration: number;
  };

  type AggregatedPlace = {
    place: string;
    count: number;
    freightDelayed: number;
    freightDuration: number;
    passDelayed: number;
    passDuration: number;
    subDelayed: number;
    subDuration: number;
    otherDelayed: number;
    otherDuration: number;
    [guiltyUnit: string]: GuiltyUnitData | string | number;
  };

  function aggregateData(inputArray: InputItem[]): AggregatedPlace[] {
    const resultArray: AggregatedPlace[] = [];

    inputArray.forEach((item) => {
      // Найти существующую запись для места
      const existingPlace = resultArray.find(
        (entry) => entry.place === item.place
      );

      if (existingPlace) {
        existingPlace.count++;
        if (!Array.isArray(existingPlace.failReason)) {
          existingPlace.failReason = "";
        }

        existingPlace.freightDelayed += item.freightDelayed || 0;
        existingPlace.freightDuration += item.freightDuration || 0;
        existingPlace.passDelayed += item.passDelayed || 0;
        existingPlace.passDuration += item.passDuration || 0;
        existingPlace.subDelayed += item.subDelayed || 0;
        existingPlace.subDuration += item.subDuration || 0;
        existingPlace.otherDelayed += item.otherDelayed || 0;
        existingPlace.otherDuration += item.otherDuration || 0;

        // Обновляем данные для guiltyUnit
        if (existingPlace[item.guiltyUnit]) {
          const existingUnit = existingPlace[item.guiltyUnit] as GuiltyUnitData;
          existingUnit.count++;
          existingUnit.freightDelayed += item.freightDelayed || 0;
          existingUnit.freightDuration += item.freightDuration || 0;
          existingUnit.passDelayed += item.passDelayed || 0;
          existingUnit.passDuration += item.passDuration || 0;
          existingUnit.subDelayed += item.subDelayed || 0;
          existingUnit.subDuration += item.subDuration || 0;
          existingUnit.otherDelayed += item.otherDelayed || 0;
          existingUnit.otherDuration += item.otherDuration || 0;
        } else {
          existingPlace[item.guiltyUnit] = {
            count: 1,
            freightDelayed: item.freightDelayed || 0,
            freightDuration: item.freightDuration || 0,
            passDelayed: item.passDelayed || 0,
            passDuration: item.passDuration || 0,
            subDelayed: item.subDelayed || 0,
            subDuration: item.subDuration || 0,
            otherDelayed: item.otherDelayed || 0,
            otherDuration: item.otherDuration || 0,
          };
        }
      } else {
        const newPlace: AggregatedPlace = {
          place: item.place,
          count: 1,
          freightDelayed: item.freightDelayed || 0,
          freightDuration: item.freightDuration || 0,
          passDelayed: item.passDelayed || 0,
          passDuration: item.passDuration || 0,
          subDelayed: item.subDelayed || 0,
          subDuration: item.subDuration || 0,
          otherDelayed: item.otherDelayed || 0,
          otherDuration: item.otherDuration || 0,
          [item.guiltyUnit]: {
            count: 1,
            freightDelayed: item.freightDelayed || 0,
            freightDuration: item.freightDuration || 0,
            passDelayed: item.passDelayed || 0,
            passDuration: item.passDuration || 0,
            subDelayed: item.subDelayed || 0,
            subDuration: item.subDuration || 0,
            otherDelayed: item.otherDelayed || 0,
            otherDuration: item.otherDuration || 0,
          },
        };
        resultArray.push(newPlace);
      }
    });

    resultArray.forEach((el) => {
      delete el.startTime;
      delete el.guiltyUnit;
      delete el.failReason;
      delete el.failKind;
     
      if (el.place) el.place = el.place.split(",").slice(-1).join("").trim();
      el["totalDelayed"] = cutDecimals(
        el.freightDelayed + el.passDelayed + el.subDelayed + el.otherDelayed
      );
      el["totalDuration"] = cutDecimals(
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

    return resultArray;
  }

  return aggregateDataWithYearAndReport(getFilteredByPeriodArr());
};

export {};
