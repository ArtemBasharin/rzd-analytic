import * as d3 from "d3";
import { cutDecimals, startTime } from "./config";

export const getCutoffDates = (arr) => {
  let dates = [];
  arr.forEach((element) => {
    dates.push(element[startTime]);
  });
  return { min: new Date(d3.min(dates)), max: new Date(d3.max(dates)) };
};

export const getStartDate = (endDate) => {
  let previousMonthDate = new Date(endDate);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  return new Date(previousMonthDate.setHours(0, 0, 0));
};

export const convertUnixToDate = (unixDate) => {
  const date = new Date(unixDate); // Умножаем на 1000, т.к. в Unix время указывается в миллисекундах
  const day = date.getDate(); // Получаем день месяца
  const month = date.getMonth() + 1; // Получаем номер месяца (начиная с 0)
  const year = date.getFullYear(); // Получаем год

  // Форматируем день и месяц, добавляя ноль если число состоит из одной цифры
  const formattedDay = day.toString().padStart(2, "0");
  const formattedMonth = month.toString().padStart(2, "0");
  // console.log("unix", `${formattedDay}-${formattedMonth}-${year}`);
  return `${formattedDay}-${formattedMonth}-${year}`;
};

export const getPattern = (period) => {
  console.log(period);
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
  console.log(pattern);
  return pattern;
};

export const updateCheckedProperty = (array, searchValue, newCheckedValue) => {
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

export const getInitialPattern = (date) => {
  let period = new Date(date).getMonth() + 1;
  if (period < 10) {
    return "0" + period;
  } else {
    return period.toString();
  }
};

export const getCustomCalendar = (step, dateStart, dateEnd) => {
  let result = [];
  let start = new Date(...[dateStart]);
  let end = new Date(...[dateEnd]);
  if (start < end) {
    while (start <= end) {
      // console.log("календарь", start, dateStart);
      let val = start.setDate(start.getDate() + step);
      result.push(val);
    }
  }
  // if (start > end) result.slice(-1);
  // console.log("resultCal", result);
  return result;
};

export const getComparisonText = (curVal, prevVal) => {
  if (curVal > prevVal) {
    return (
      <span className="text_increase text_inner">
        увеличилось на {cutDecimals((curVal / prevVal - 1) * 100)}%
      </span>
    );
  } else {
    if (curVal < prevVal)
      return (
        <span className="text_decrease text_inner">
          уменьшилось на {cutDecimals((prevVal / curVal - 1) * 100)}%
        </span>
      );
    else
      return (
        <span className="text_decrease text_inner">осталось без изменений</span>
      );
  }
};

export const getDaysBetweenDates = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  const diffDays = Math.round(Math.abs((firstDate - secondDate) / oneDay));
  return diffDays;
};

export const getNumberWithWord = (number, words_arr) => {
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

export const getWordOnly = (number, words_arr, isFirstWord) => {
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

export const firstCharToLowerCase = (el) => {
  if (el) return el.charAt(0).toLowerCase() + el.slice(1);
};

export const cellComparingPercents = (
  pastYearUnitTotalDuration,
  currentYearUnitTotalDuration
) => {
  if (pastYearUnitTotalDuration && currentYearUnitTotalDuration) {
    let result = cutDecimals(
      (currentYearUnitTotalDuration / pastYearUnitTotalDuration - 1) * 100
    );
    return (
      <td className={result > 0 ? "text_increase" : "text_decrease"}>
        {result > 0 && "+"}
        {result}%
      </td>
    );
  }
  if (!pastYearUnitTotalDuration && currentYearUnitTotalDuration) {
    let result = cutDecimals(currentYearUnitTotalDuration);
    return <td className={"text_increase"}>+{result} ч</td>;
  }
  if (pastYearUnitTotalDuration && !currentYearUnitTotalDuration) {
    let result = cutDecimals(pastYearUnitTotalDuration);
    return <td className={"text_decrease"}>-{result} ч</td>;
  }
};
