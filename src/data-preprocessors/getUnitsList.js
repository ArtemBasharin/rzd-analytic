import { guiltyUnit, startTime } from "../config/config";
export const getUnitsList = (arr, start, end) => {
  let result = new Set();
  let startDate = new Date(start);
  let endDate = new Date(end);

  let key = "";
  if (Object.keys(arr[0]).includes("guiltyUnit")) {
    key = "guiltyUnit";
  }
  if (Object.keys(arr[0]).includes(guiltyUnit)) {
    key = guiltyUnit;
  }
  console.log(typeof startDate, endDate);
  arr.forEach((element) => {
    let date = new Date(element[startTime]);
    // console.log(date);
    if (date >= startDate && date <= endDate) result.add(element[key]);
  });
  let result2 = Array.from(result);
  let result3 = [];
  result2.forEach((element) => {
    result3.push({
      guiltyUnit: element,
      checked: true,
      isDisabled: false,
    });
  });
  console.log(result3);
  return result3;
};
