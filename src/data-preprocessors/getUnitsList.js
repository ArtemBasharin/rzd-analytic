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
