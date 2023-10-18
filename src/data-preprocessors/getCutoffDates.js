import * as d3 from "d3";
import { startTime } from "../config/config";

export const getCutoffDates = (arr) => {
  let dates = [];
  arr.forEach((element) => {
    dates.push(element[startTime]);
  });
  return { min: d3.min(dates), max: d3.max(dates) };
};
