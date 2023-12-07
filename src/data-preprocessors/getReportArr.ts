import {
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
} from "../config/config";
import {
  getDaysBetweenDates,
  firstCharToLowerCase,
  cutDecimals,
} from "../config/functions";

export const getReportArr = (
  sourceArr: any[],
  dateStart: Date,
  dateEnd: Date,
  minValue?: number
) => {
    console.log("dateStart", dateStart);
    console.log("dateEnd", dateEnd);
  
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
      let daysBetweenDates: number = 0;
      daysBetweenDates = getDaysBetweenDates(dateStart, dateEnd);

      let [dateStartCurrentYear, dateEndCurrentYear] = [dateStart, dateEnd];

      let dateEndPastYear = new Date(dateEndCurrentYear.getTime());
      dateEndPastYear.setFullYear(dateEndPastYear.getFullYear() - 1);

      let dateStartPastYear = new Date(dateEndPastYear.getTime());
      dateStartPastYear.setDate(dateStartPastYear.getDate() - daysBetweenDates);

      sourceArr.forEach((el) => {
        if (
          (Date.parse(el[startTime]) >= dateStartCurrentYear.getTime() &&
            Date.parse(el[startTime]) <= dateEndCurrentYear.getTime()) ||
          (Date.parse(el[startTime]) >= dateStartPastYear.getTime() &&
            Date.parse(el[startTime]) <= dateEndPastYear.getTime())
        ) {
          srcArrayInDatesFrame.push({
            ID: el["ID отказа"],
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
          });
        }
      });
    }
    // console.log("srcArrayInDatesFrame", srcArrayInDatesFrame);
    return srcArrayInDatesFrame.map((el) => {
      if (el.failReason)
        return { ...el, failReason: firstCharToLowerCase(el.failReason) };
    });
  };
  console.log(getFilteredByPeriodArr())

  function aggregateData(inputArray: any[]) {
    const resultMap = new Map();

    // Итерируемся по исходному массиву и суммируем данные
    inputArray.forEach((item) => {
      // if (!item[freightDuration]) item[freightDuration] = 0;
      // if (!item[passDuration]) item[passDuration] = 0;
      // if (!item[subDuration]) item[subDuration] = 0;
      // if (!item[otherDuration]) item[otherDuration] = 0;
      // if (!item[freightDelayed]) item[freightDelayed] = 0;
      // if (!item[passDelayed]) item[passDelayed] = 0;
      // if (!item[subDelayed]) item[subDelayed] = 0;
      // if (!item[otherDelayed]) item[otherDelayed] = 0;

      const key = item.guiltyUnit;
      if (resultMap.has(key)) {
        resultMap.get(key)["count"]++;
        if (!resultMap.get(key).failReason.includes(item.failReason)) {
          resultMap.get(key).failReason += ", " + item.failReason;
        }
        resultMap.get(key).freightDelayed += item.freightDelayed;
        resultMap.get(key).freightDuration += item.freightDuration;
        resultMap.get(key).passDelayed += item.passDelayed;
        resultMap.get(key).passDuration += item.passDuration;
        resultMap.get(key).subDelayed += item.subDelayed;
        resultMap.get(key).subDuration += item.subDuration;
        resultMap.get(key).otherDelayed += item.otherDelayed;
        resultMap.get(key).otherDuration += item.otherDuration;
      } else {
        resultMap.set(key, { ...item, count: 1 });
      }
    });
    // console.log("resultMap",resultMap)
    resultMap.forEach((value) => {
      // delete value._id;
      // delete value["ID отказа"];
      delete value.startTime;
      // delete value["Категория отказа"];
      // delete value["Вид технологического нарушения"];
      // delete value["Место"];
      // delete value.__v;
      // delete value.timestamp;
    });

    const resultArray = Array.from(resultMap, ([key, value]) => value);
    resultArray.forEach((el) => {
      el.totalDelayed = cutDecimals(
        el.freightDelayed + el.passDelayed + el.subDelayed + el.otherDelayed
      );
      el.totalDuration = cutDecimals(
        el.freightDuration + el.passDuration + el.subDuration + el.otherDuration
      );
    });

    resultArray.sort((a, b) => b.count - a.count);
    // console.log("resultArray", resultArray);
    return resultArray;
  }

  const getSummaryReport = (arr: any[], dateStart: Date, dateEnd: Date) => {
    let [dateStartCurrentYear, dateEndCurrentYear] = [dateStart, dateEnd];
    let daysBetweenDates: number = 0;
    daysBetweenDates = getDaysBetweenDates(dateStart, dateEnd);

    let dateEndPastYear = new Date(dateEndCurrentYear.getTime());
    dateEndPastYear.setFullYear(dateEndPastYear.getFullYear() - 1);

    let dateStartPastYear = new Date(dateEndPastYear.getTime());
    dateStartPastYear.setDate(dateStartPastYear.getDate() - daysBetweenDates);

    let summary = arr.reduce(
      function (acc, curr) {
        if (
          Date.parse(curr.startTime) >= dateStartPastYear.getTime() &&
          Date.parse(curr.startTime) <= dateEndPastYear.getTime()
        ) {
          acc.pastYearTotalFails++;
          acc.pastYearTotalDelays = acc.pastYearTotalDelays + curr.totalDelayed;
          acc.pastYearTotalDurations =
            acc.pastYearTotalDurations + curr.totalDuration;
          curr.failKind === "Нарушение технического вида" &&
            acc.pastYearTotalTechnical++;
          curr.failKind === "Технологическое нарушение" &&
            acc.pastYearTotalTechnological++;
          curr.failKind === "Особая технологическая необходимость" &&
            acc.pastYearTotalSpecial++;
          curr.failKind === "Прочие причины" && acc.pastYearTotalExternal++;
        }

        if (
          Date.parse(curr.startTime) >= dateStartCurrentYear.getTime() &&
          Date.parse(curr.startTime) <= dateEndCurrentYear.getTime()
        ) {
          acc.currentYearTotalFails++;
          acc.currentYearTotalDelays =
            acc.currentYearTotalDelays + curr.totalDelayed;
          acc.currentYearTotalDurations =
            acc.currentYearTotalDurations + curr.totalDuration;
          curr.failKind === "Нарушение технического вида" &&
            acc.currentYearTotalTechnical++;
          curr.failKind === "Технологическое нарушение" &&
            acc.currentYearTotalTechnological++;
          curr.failKind === "Особая технологическая необходимость" &&
            acc.currentYearTotalSpecial++;
          curr.failKind === "Прочие причины" && acc.currentYearTotalExternal++;
        }

        return acc;
      },
      {
        pastYearTotalFails: 0,
        currentYearTotalFails: 0,
        pastYearTotalDelays: 0,
        currentYearTotalDelays: 0,
        pastYearTotalDurations: 0,
        currentYearTotalDurations: 0,
        pastYearTotalTechnical: 0,
        currentYearTotalTechnical: 0,
        pastYearTotalTechnological: 0,
        currentYearTotalTechnological: 0,
        pastYearTotalSpecial: 0,
        currentYearTotalSpecial: 0,
        pastYearTotalExternal: 0,
        currentYearTotalExternal: 0,
      }
    );
    return summary;
  };

  function aggregateDataWithYearAndReport(inputArray: any[]) {
    const resultArray: any[] = [];

    // console.log("inputArray", inputArray);
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
      item.report = aggregateData(item.report); // Используем функцию aggregateDataWithCount
    });

    let sum = getSummaryReport(inputArray, dateStart, dateEnd);
    resultArray[0].sum = {
      pastYearTotalFails: sum.pastYearTotalFails,
      pastYearTotalDelays: sum.pastYearTotalDelays,
      pastYearTotalDurations: cutDecimals(sum.pastYearTotalDurations),
      pastYearTotalTechnical: sum.pastYearTotalTechnical,
      pastYearTotalTechnological: sum.pastYearTotalTechnological,
      pastYearTotalSpecial: sum.pastYearTotalSpecial,
      pastYearTotalExternal: sum.pastYearTotalExternal,
    };
    resultArray[1].sum = {
      currentYearTotalFails: sum.currentYearTotalFails,
      currentYearTotalDelays: sum.currentYearTotalDelays,
      currentYearTotalDurations: cutDecimals(sum.currentYearTotalDurations),
      currentYearTotalTechnical: sum.currentYearTotalTechnical,
      currentYearTotalTechnological: sum.currentYearTotalTechnological,
      currentYearTotalSpecial: sum.currentYearTotalSpecial,
      currentYearTotalExternal: sum.currentYearTotalExternal,
    };

    return resultArray;
  }

  // console.log(aggregateDataWithYearAndReport(getFilteredByPeriodArr()));
  // console.log("getFilteredByPeriodArr", getFilteredByPeriodArr());
  // console.log(
  //   "getSummaryReport",
  //   getSummaryReport(getFilteredByPeriodArr(), dateStart, dateEnd)
  // );

  return aggregateDataWithYearAndReport(getFilteredByPeriodArr());
};
