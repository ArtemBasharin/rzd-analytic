import { guiltyUnit } from "../config/config";
export const getUnitsList = (arr) => {
  let result = new Set();
  let key = "";
  if (Object.keys(arr[0]).includes("guiltyUnit")) {
    key = "guiltyUnit";
  }
  if (Object.keys(arr[0]).includes(guiltyUnit)) {
    key = guiltyUnit;
  }
  arr.forEach((element) => {
    result.add(element[key]);
  });
  let result1 = Array.from(result);
  let result3 = [];
  result1.forEach((element) => {
    result3.push({
      guiltyUnit: element,
      stackedChecked: true,
      sankeyChecked: true,
      stackedIsDisabled: false,
      sankeyIsDisabled: false,
    });
  });
  console.log(result3);
  return result3;
};
