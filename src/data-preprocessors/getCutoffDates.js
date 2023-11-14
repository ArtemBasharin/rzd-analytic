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
