import * as d3 from "d3";
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
import {  firstCharToLowerCase } from "../config/functions";

export const getReportArr = (
  sourceArr: any[],
  pattern: string,
  pastYear?: number,
  currentYear?: number
) => {
  const getFilteredByPeriodArr = () => {
    let regexp = new RegExp(`[-](${pattern})[-]`, "g");
    // console.log(regexp);
    // console.log(arr[0][startTime], arr[0][startTime].search(regexp));
    let unitsArray = [];
    for (let i = 0; i < sourceArr.length; ++i) {
      if (sourceArr[i][startTime].search(regexp) > -1) {
        unitsArray.push(sourceArr[i]);
      }
    }
    let lowerLetterReason = unitsArray.map(el=> {return {...el, [failReason] : firstCharToLowerCase(el[failReason])}})
    return lowerLetterReason;
  };


  function aggregateData(inputArray: any[]) {
    const resultMap = new Map();

    // Итерируемся по исходному массиву и суммируем данные
    inputArray.forEach((item) => {
      const key = item[guiltyUnit];
      if (resultMap.has(key)) {
        resultMap.get(key)["count"]++;
        if (!resultMap.get(key)[failReason].includes(item[failReason])) {
          resultMap.get(key)[failReason] += ", " + (item[failReason]);
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

    // Преобразуем Map обратно в массив объектов
    const resultArray = Array.from(resultMap, ([key, value]) => value);
    resultArray.map((el) => {
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

  function aggregateDataWithYearAndReportUpdated(inputArray: any[]) {
    const currentYear = new Date().getFullYear();
    const pastYear = currentYear - 1;

    const resultArray = [];

    // Группируем данные по годам
    const groupByYear = inputArray.reduce((acc, item) => {
      const year = new Date(item["Начало отказа"]).getFullYear();
      acc[year] = acc[year] || [];
      acc[year].push(item);
      return acc;
    }, {});

    // Обрабатываем данные для каждого года
    for (const year in groupByYear) {
      const aggregatedData = groupByYear[year].reduce((acc: any, item: any) => {
        acc["report"] = acc["report"] || [];
        acc["Количество грузовых поездов(по месту)"] =
          acc["Количество грузовых поездов(по месту)"] || {};
        acc["Время грузовых поездов(по месту)"] =
          acc["Время грузовых поездов(по месту)"] || {};

        acc["report"].push(item);
        acc["Количество грузовых поездов(по месту)"][year] =
          item["Количество грузовых поездов(по месту)"];
        acc["Время грузовых поездов(по месту)"][year] =
          item["Время грузовых поездов(по месту)"];

        return acc;
      }, {});

      resultArray.push({ year, ...aggregatedData });
    }

    return resultArray;
  }

  console.log(aggregateDataWithYearAndReport(getFilteredByPeriodArr()));

  return aggregateDataWithYearAndReport(getFilteredByPeriodArr());
};
