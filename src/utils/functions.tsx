import React from "react";
import * as d3 from "d3";
import { startTime, varDelay, varTrains } from "./config";

export const getCutoffDates = (arr: any[]) => {
  let dates: number[] = arr.map((element: any) => {
    return new Date(element[startTime]).getTime();
  });
  if (dates.length !== 0) {
    const minValue = d3.min(dates);
    let minDate = new Date(minValue!).setHours(0, 0, 0);

    const maxValue = d3.max(dates);
    let maxDate = new Date(maxValue!).setHours(23, 59, 59);
    return { min: minDate, max: maxDate };
  }
};

export const getStartDate = (endDate: number) => {
  let previousMonthDate = new Date(new Date(endDate).setDate(1)).setHours(
    0,
    0,
    0
  );
  return previousMonthDate;
};

export const convertUnixToDate = (unixDate: number) => {
  const date = new Date(unixDate);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const formattedDay = day.toString().padStart(2, "0");
  const formattedMonth = month.toString().padStart(2, "0");
  return `${formattedDay}-${formattedMonth}-${year}`;
};

export const getPattern = (period: string) => {
  let pattern = "";
  if (period.length < 3) {
    pattern = `${period}`;
  } else {
    let arr = period.split("-").map((el) => Number(el));
    let resultArr = [];
    for (let i = arr[0]; i <= arr[1]; ++i) {
      i < 10 ? resultArr.push("0" + i) : resultArr.push(i);
    }
    pattern = resultArr.join("|");
  }
  return pattern;
};

export const updateCheckedProperty = (
  array: any[],
  searchValue: string,
  newCheckedValue: boolean
) => {
  const updatedArray = array.map((item) => {
    if (item.guiltyUnit === searchValue) {
      return {
        ...item,
        checked: newCheckedValue,
      };
    }
    return item;
  });

  return updatedArray;
};

export const updateChartProperty = (
  array: any[],
  searchValue: string,
  newCheckedValue: boolean
) => {
  const updatedArray = array.map((item) => {
    if (item.name === searchValue) {
      return {
        ...item,
        checked: newCheckedValue,
      };
    }
    return item;
  });

  return updatedArray;
};

export const getInitialPattern = (date: string) => {
  let period = new Date(date).getMonth() + 1;
  if (period < 10) {
    return "0" + period;
  } else {
    return period.toString();
  }
};

export const getCustomCalendar = (
  step: number,
  dateStart: number,
  dateEnd: number
) => {
  let result = [];
  let start = new Date(dateStart);
  let end = new Date(dateEnd);
  result.push(start.setDate(start.getDate()));
  if (start < end) {
    while (start <= end) {
      let val = start.setDate(start.getDate() + step);
      result.push(val);
    }
  }
  return result;
};

export const cutDecimals = (total: number) => {
  const decimals = () => {
    let res = 0;
    let val = Math.round(total);
    if (val < 1) {
      res = 2;
    }
    if (val >= 1 && val < 100) {
      res = 1;
    }
    if (val >= 100) {
      res = 0;
    }
    return res;
  };

  const toRound = (value: number) => {
    let dec = Math.pow(10, decimals());
    return Math.round(Number(value.toFixed(3)) * dec) / dec;
  };
  return toRound(total);
};

export const getComparisonText = (
  curVal: number,
  prevVal: number,
  brackets?: boolean
): React.ReactElement | null | undefined => {
  if (prevVal !== 0 && curVal > prevVal) {
    return (
      <span className="text_increase text_inner">
        {brackets && " ("}
        увеличилось на {cutDecimals((curVal / prevVal - 1) * 100)}%
        {brackets && ")"}
      </span>
    );
  } else if (curVal !== 0 && curVal < prevVal) {
    return (
      <span className="text_decrease text_inner">
        {brackets && " ("}
        уменьшилось на {cutDecimals((1 - curVal / prevVal) * 100)}%
        {brackets && ")"}
      </span>
    );
  } else if (curVal === prevVal) {
    return (
      <span className="text_decrease text_inner">
        {brackets && " ("}осталось без изменений{brackets && ")"}
      </span>
    );
  } else if (prevVal === 0) {
    return (
      <span className="text_increase text_inner">
        {brackets && " ("}
        увеличилось на {cutDecimals(curVal)}
        {brackets && ")"}
      </span>
    );
  } else if (curVal === 0) {
    return (
      <span className="text_decrease text_inner">уменьшилось на 100%</span>
    );
  }
  return undefined; // or undefined, based on your preference
};

export const getDaysBetweenDates = (
  date1: Date | string | number,
  date2: Date | string | number
) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1).getTime();
  const secondDate = new Date(date2).getTime();
  const diffDays = Math.round(Math.abs((firstDate - secondDate) / oneDay));
  return diffDays;
};

export const getOneUnitReport = (arr: any[], year: number, unit: string) => {
  const currentYearArr: any[] = arr.find((obj) => obj.year === year).report;
  const currentYearUnit: any = currentYearArr.find(
    (objUnit) => objUnit.guiltyUnit === unit
  );

  if (currentYearUnit)
    return (
      <span className="text_inner">
        {currentYearUnit.count} ТН.{" "}
        {getWordOnly(currentYearUnit.totalDelayed, varDelay, true)}{" "}
        {getNumberWithWord(currentYearUnit.totalDelayed, varTrains)} на{" "}
        {cutDecimals(currentYearUnit.totalDuration)} ч, в том числе,{" "}
        {currentYearUnit.freightDelayed > 0
          ? currentYearUnit.freightDelayed +
            " груз. на " +
            cutDecimals(currentYearUnit.freightDuration) +
            " ч"
          : ""}
        {currentYearUnit.freightDelayed > 0 &&
        (currentYearUnit.passDelayed > 0 ||
          currentYearUnit.subDelayed > 0 ||
          currentYearUnit.otherDelayed > 0)
          ? ", "
          : ""}
        {currentYearUnit.passDelayed > 0
          ? currentYearUnit.passDelayed +
            " пасс. на " +
            cutDecimals(currentYearUnit.passDuration) +
            " ч"
          : ""}
        {currentYearUnit.passDelayed > 0 &&
        (currentYearUnit.subDelayed > 0 || currentYearUnit.otherDelayed > 0)
          ? ", "
          : ""}
        {currentYearUnit.subDelayed > 0
          ? currentYearUnit.subDelayed +
            " приг. на " +
            cutDecimals(currentYearUnit.subDuration) +
            " ч"
          : ""}
        {currentYearUnit.subDelayed > 0 && currentYearUnit.otherDelayed > 0
          ? ", "
          : ""}
        {currentYearUnit.otherDelayed > 0
          ? currentYearUnit.otherDelayed +
            " проч. на " +
            cutDecimals(currentYearUnit.otherDuration) +
            " ч"
          : ""}
      </span>
    );
};

type repObj = { arr: any[]; currYear: number; pastYear: number; unit: string };

export const getOneUnitReportWithCompare = (prop: repObj) => {
  const currentYearArr: any[] = prop.arr.find(
    (obj) => obj.year === prop.currYear
  ).report;

  const currentYearUnit: any = currentYearArr.find(
    (objUnit) => objUnit.guiltyUnit === prop.unit
  );

  const pastYearArr: any[] = prop.arr.find(
    (obj) => obj.year === prop.pastYear
  ).report;
  const pastYearUnit: any =
    pastYearArr.find((objUnit) => objUnit.guiltyUnit === prop.unit) || null;

  if (currentYearUnit)
    return (
      <span className={`text_inner ${!pastYearUnit && "text_increase"}`}>
        {currentYearUnit.count} ТН
        {pastYearUnit &&
          getComparisonText(currentYearUnit.count, pastYearUnit.count, true)}
        . {getWordOnly(currentYearUnit.totalDelayed, varDelay, true)}{" "}
        {getNumberWithWord(currentYearUnit.totalDelayed, varTrains)}
        {pastYearUnit &&
          getComparisonText(
            currentYearUnit.totalDelayed,
            pastYearUnit.totalDelayed,
            true
          )}{" "}
        на {cutDecimals(currentYearUnit.totalDuration)} ч
        {pastYearUnit &&
          getComparisonText(
            currentYearUnit.totalDuration,
            pastYearUnit.totalDuration,
            true
          )}
        , в том числе,{" "}
        {currentYearUnit.freightDelayed > 0
          ? currentYearUnit.freightDelayed +
            " груз. на " +
            cutDecimals(currentYearUnit.freightDuration) +
            " ч"
          : ""}
        {currentYearUnit.freightDelayed > 0 &&
        (currentYearUnit.passDelayed > 0 ||
          currentYearUnit.subDelayed > 0 ||
          currentYearUnit.otherDelayed > 0)
          ? ", "
          : ""}
        {currentYearUnit.passDelayed > 0
          ? currentYearUnit.passDelayed +
            " пасс. на " +
            cutDecimals(currentYearUnit.passDuration) +
            " ч"
          : ""}
        {currentYearUnit.passDelayed > 0 &&
        (currentYearUnit.subDelayed > 0 || currentYearUnit.otherDelayed > 0)
          ? ", "
          : ""}
        {currentYearUnit.subDelayed > 0
          ? currentYearUnit.subDelayed +
            " приг. на " +
            cutDecimals(currentYearUnit.subDuration) +
            " ч"
          : ""}
        {currentYearUnit.subDelayed > 0 && currentYearUnit.otherDelayed > 0
          ? ", "
          : ""}
        {currentYearUnit.otherDelayed > 0
          ? currentYearUnit.otherDelayed +
            " проч. на " +
            cutDecimals(currentYearUnit.otherDuration) +
            " ч"
          : ""}
      </span>
    );
};

export const getNumberWithWord = (number: number, words_arr: string[]) => {
  number = Math.abs(number);
  if (Number.isInteger(number)) {
    let options = [2, 0, 1, 1, 1, 2];
    return (
      number +
      " " +
      words_arr[
        number % 100 > 4 && number % 100 < 20
          ? 2
          : options[number % 10 < 5 ? number % 10 : 5]
      ]
    );
  }
  return number + " " + words_arr[1];
};

export const getWordOnly = (
  number: number,
  words_arr: string[],
  isFirstWord?: boolean
) => {
  let editedArr = [];
  isFirstWord
    ? (editedArr = words_arr.map(
        (el) => el.charAt(0).toUpperCase() + el.slice(1)
      ))
    : (editedArr = words_arr);

  number = Math.abs(number);
  if (Number.isInteger(number)) {
    let options = [2, 0, 1, 1, 1, 2];
    return editedArr[
      number % 100 > 4 && number % 100 < 20
        ? 2
        : options[number % 10 < 5 ? number % 10 : 5]
    ];
  }
  return editedArr[1];
};

export const firstCharToLowerCase = (el: string) => {
  if (el) {
    let item = el.replace(/\(\d+\)/g, "");
    return item.charAt(0).toLowerCase() + item.slice(1).trim() + ";";
  }
};

export const cellComparingPercents = (
  pastYearUnitTotalDuration: number,
  currentYearUnitTotalDuration: number
) => {
  if (pastYearUnitTotalDuration && currentYearUnitTotalDuration) {
    let result = cutDecimals(
      (currentYearUnitTotalDuration / pastYearUnitTotalDuration - 1) * 100
    );
    return (
      <td
        className={`table_bold_right ${
          result > 0 ? "text_increase" : "text_decrease"
        }`}
      >
        {result > 0 && "+"}
        {result}%
      </td>
    );
  }
  if (!pastYearUnitTotalDuration && currentYearUnitTotalDuration) {
    let result = cutDecimals(currentYearUnitTotalDuration);
    return <td className={"table_bold_right text_increase "}>+{result} ч</td>;
  }
  if (pastYearUnitTotalDuration && !currentYearUnitTotalDuration) {
    // let result = cutDecimals(pastYearUnitTotalDuration);
    return <td className={"table_bold_right text_decrease"}>-100%</td>;
  }
};

export const defineСategory = (string: string) => {
  if (
    /^П$/gm.test(string) ||
    /ПЧ-/gm.test(string) ||
    string.includes("ИЧ КУЛУНДА П")
  )
    return "PCH";
  if (/ШЧ-/gm.test(string) || string.includes("ИЧ КУЛУНДА Ш")) return "SHCH";
  if (/ЭЧ-/gm.test(string)) return "ECH";
  if (
    /(?<!\S)ВЧД/gm.test(string) ||
    string.includes("З-СИБ, В") ||
    /^В$/gm.test(string)
  )
    return "VCHD";
  if (/ПМС-/gm.test(string)) return "PMS";
  if (/ТЧЭ-/gm.test(string) || /^Т$/gm.test(string)) return "TCH";
  if (string.includes("СЛД") || string.includes("ТМХ")) return "SLD";
  if (/ЛВЧ-/gm.test(string) || /ЛВЧД-?/gm.test(string)) return "FPC";
  if (
    /(?<!\S)ДС(?=\s)/gm.test(string) ||
    /ДЦС-/gm.test(string) ||
    /^Д$/gm.test(string) ||
    /^ДЦУП$/gm.test(string) ||
    string.includes("ДЦУП") ||
    string.includes("З-СИБ, Д")
  ) {
    return "D";
  }
  return "OTHER";
};

export const renameCategory = (string: string) => {
  if (string === "PCH") return "Итого по П";
  if (string === "SHCH") return "Итого по Ш";
  if (string === "ECH") return "Итого по НТЭ";
  if (string === "VCHD") return "Итого по В";
  if (string === "PMS") return "Итого по ДРП";
  if (string === "TCH") return "Итого по Т";
  if (string === "SLD") return "Итого по сервисным компаниям";
  if (string === "FPC") return "Итого по ФПК";
  if (string === "D") return "Итого по Д";
  if (string === "OTHER") return "Итого по прочим";
};

export const getDarkColors = (numColors: number) => {
  const colors = [];
  for (let i = 0; i < numColors; i++) {
    const r = Math.floor(Math.random() * 150);
    const g = Math.floor(Math.random() * 150);
    const b = Math.floor(Math.random() * 150);
    colors.push(`rgb(${r}, ${g}, ${b})`);
  }
  return colors;
};

export const getPeriodDatesFromRegex = (
  pattern: string,
  currentYear: number,
  previousYear: number
) => {
  const periodMonths = pattern.split("|").map((month) => parseInt(month, 10)); // Преобразуем значение периода в массив чисел
  const periodStart = new Date(currentYear, Math.min(...periodMonths) - 1, 1); // Начало периода в текущем году
  const periodEnd = new Date(
    new Date(currentYear, Math.max(...periodMonths), 0).setHours(23, 59, 59)
  ); // Конец периода в текущем году
  const previousYearStart = new Date(
    previousYear,
    Math.min(...periodMonths) - 1,
    1
  ); // Начало периода в прошлом году
  const previousYearEnd = new Date(
    new Date(previousYear, Math.max(...periodMonths), 0).setHours(23, 59, 59)
  ); // Конец периода в прошлом году

  return {
    previousYearStart: previousYearStart,
    previousYearEnd: previousYearEnd,
    periodStart: periodStart,
    periodEnd: periodEnd,
  };
};

export function sumValuesByKey(obj: any, key: string) {
  let results: number[] = [];

  // Рекурсивная функция для обхода объекта
  function traverse(currentObj: any) {
    for (let prop in currentObj) {
      if (currentObj.hasOwnProperty(prop)) {
        if (prop === key) {
          // Если текущий ключ совпадает с искомым, добавляем значение в результат
          results.push(currentObj[prop]);
        }
        // Если текущее свойство — объект (или массив), рекурсивно обходим его
        if (typeof currentObj[prop] === "object" && currentObj[prop] !== null) {
          traverse(currentObj[prop]);
        }
      }
    }
  }

  traverse(obj);

  const results2 = results.map((el: any) => {
    return (
      el.freightDuration + el.passDuration + el.subDuration + el.otherDuration
    );
  });

  const result = results2.reduce((acc, curr) => acc + curr, 0);
  return result;
}
