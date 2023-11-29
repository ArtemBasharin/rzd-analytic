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
} from "../config/config";
import { getDaysBetweenDates, firstCharToLowerCase } from "../config/functions";

export const getReportArr = (
  sourceArr: any[],
  pattern?: string,
  dateStart?: Date,
  dateEnd?: Date,
  minValue?: number
) => {
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
          srcArrayInDatesFrame.push(el);
        }
      });
    } else {
      let regexp = new RegExp(`[-](${pattern})[-]`, "g");
      for (let i = 0; i < sourceArr.length; ++i) {
        if (sourceArr[i][startTime].search(regexp) > -1) {
          srcArrayInDatesFrame.push(sourceArr[i]);
        }
      }
    }

    return srcArrayInDatesFrame.map((el) => {
      return { ...el, [failReason]: firstCharToLowerCase(el[failReason]) };
    });
  };

  function aggregateData(inputArray: any[]) {
    const resultMap = new Map();

    // Итерируемся по исходному массиву и суммируем данные
    inputArray.forEach((item) => {
      if (!item[freightDuration]) item[freightDuration] = 0;
      if (!item[passDuration]) item[passDuration] = 0;
      if (!item[subDuration]) item[subDuration] = 0;
      if (!item[otherDuration]) item[otherDuration] = 0;
      if (!item[freightDelayed]) item[freightDelayed] = 0;
      if (!item[passDelayed]) item[passDelayed] = 0;
      if (!item[subDelayed]) item[subDelayed] = 0;
      if (!item[otherDelayed]) item[otherDelayed] = 0;

      const key = item[guiltyUnit];
      if (resultMap.has(key)) {
        resultMap.get(key)["count"]++;
        if (!resultMap.get(key)[failReason].includes(item[failReason])) {
          resultMap.get(key)[failReason] += ", " + item[failReason];
        }
        resultMap.get(key)[freightDelayed] += item[freightDelayed];
        resultMap.get(key)[freightDuration] += item[freightDuration];
        resultMap.get(key)[passDelayed] += item[passDelayed];
        resultMap.get(key)[passDuration] += item[passDuration];
        resultMap.get(key)[subDelayed] += item[subDelayed];
        resultMap.get(key)[subDuration] += item[subDuration];
        resultMap.get(key)[otherDelayed] += item[otherDelayed];
        resultMap.get(key)[otherDuration] += item[otherDuration];
      } else {
        resultMap.set(key, { ...item, count: 1 });
      }
    });

    resultMap.forEach((value) => {
      delete value._id;
      delete value["ID отказа"];
      delete value["Начало отказа"];
      delete value["Категория отказа"];
      delete value["Вид технологического нарушения"];
      delete value["Место"];
      delete value.__v;
      delete value.timestamp;
    });

    const resultArray = Array.from(resultMap, ([key, value]) => value);
    resultArray.forEach((el) => {
      el.totalDelayed =
        el[freightDelayed] +
        el[passDelayed] +
        el[subDelayed] +
        el[otherDelayed];
      el.totalDuration =
        el[freightDuration] +
        el[passDuration] +
        el[subDuration] +
        el[otherDuration];
    });

    resultArray.sort((a, b) => b.count - a.count);
    return resultArray;
  }

  function aggregateDataWithYearAndReport(inputArray: any[]) {
    const resultArray: any[] = [];

    inputArray.forEach((item: any) => {
      const year = new Date(item["Начало отказа"]).getFullYear();
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

    return resultArray;
  }

  console.log(aggregateDataWithYearAndReport(getFilteredByPeriodArr()));

  return aggregateDataWithYearAndReport(getFilteredByPeriodArr());
};
