import * as d3 from "d3";

export const filterByMonth = (arr, regexpPattern) => {
  let regexp = new RegExp(`[-]${regexpPattern}[-]`, "g");
  let resultArray = [];
  for (let i = 0; i < arr.length; ++i) {
    if (regexp.test(arr[i]["Начало отказа"])) {
      resultArray.push(arr[i]);
    }
  }
  return resultArray;
};

export const totalFailsCounter = (src, pastYear, currentYear) => {
  let pastYearCount = 0;
  let currentYearCount = 0;
  src.forEach((el) => {
    if (el["Начало отказа"]) {
      el["Начало отказа"].includes(pastYear) && pastYearCount++;
      el["Начало отказа"].includes(currentYear) && currentYearCount++;
    }
  });
  return [
    { value: pastYearCount, label: pastYear, title: "Всего" },
    { value: currentYearCount, label: currentYear, title: "Всего" },
  ];
};

//counting number of fails with conditions
const failsCounter = (src, name, prop, chartname, currentYear, pastYear) => {
  let pastYearCount = 0;
  let currentYearCount = 0;
  src.forEach((element) => {
    if (element[name]) {
      if (
        element[name].includes(prop) &&
        element["Дата нарушения"].includes(pastYear)
      )
        pastYearCount++;
      if (
        element[name].includes(prop) &&
        element["Дата нарушения"].includes(currentYear)
      )
        currentYearCount++;
    }
  });
  return [
    { value: pastYearCount, label: pastYear, title: chartname },
    { value: currentYearCount, label: currentYear, title: chartname },
  ];
};

//creating array for

let failsArray = [];
const unitedArrGenerate = (srcArray) => {
  failsArray.push(totalFailsCounter(srcArray));
  failsArray.push(failsCounter(srcArray, "Номер / кат.", "/ 1", "1 категории"));
  failsArray.push(failsCounter(srcArray, "Номер / кат.", "/ 2", "2 категории"));
  failsArray.push(
    failsCounter(srcArray, "Тип", "Технического характера", "Техн. хар-ра")
  );
  failsArray.push(
    failsCounter(
      srcArray,
      "Тип",
      "Технологического характера",
      "Технол. хар-ра"
    )
  );
  failsArray.push(
    failsCounter(
      srcArray,
      "Тип",
      "Особая технологическая необходимость",
      "Особая технол. необх."
    )
  );
  failsArray.push(failsCounter(srcArray, "Тип", "Внешние", "Внешние"));
};
//create of array to find max value and export in d3.scales component
const maxYFind = (array) => {
  let values = [];
  array.flat().forEach((e) => values.push(e.value));
  return d3.max(values); //extra multiplier for extra margin-top in histogram
};

export let yMax = maxYFind(failsArray);
