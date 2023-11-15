import * as d3 from "d3";
import { startTime } from "../config/config";

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
