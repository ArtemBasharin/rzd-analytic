import * as d3 from "d3";
import { testSource } from "../../test/testSource";
import { store } from "../../redux/store";

let regexp = new RegExp(`[-]${store.getState().toolkit.todos}[-]`, "g"); // /\.01\./gm

let srcArray = [];
for (let i = 0; i < testSource.length; ++i) {
  if (regexp.test(testSource[i]["Дата нарушения"])) {
    srcArray.push(testSource[i]);
  }
}
console.log(srcArray);
// year-params will be reassigned in future versions
let pastYear = 2022;
let currentYear = 2023;

// const kindsOfFails = [
//   "Всего",
//   "1 категории",
//   "2 категории",
//   "Технического характера",
//   "Технологического характера",
//   "Особая технологическая необходимость",
//   "Внешние",
// ];

//counting number of total fails
const totalFailsCounter = (src) => {
  let pastYearCount = 0;
  let currentYearCount = 0;
  src.forEach((element) => {
    if (element["Дата нарушения"]) {
      element["Дата нарушения"].includes(pastYear) && pastYearCount++;
      element["Дата нарушения"].includes(currentYear) && currentYearCount++;
    }
  });
  return [
    { value: pastYearCount, label: pastYear, title: "Всего" },
    { value: currentYearCount, label: currentYear, title: "Всего" },
  ];
};

//counting number of fails with conditions
const failsCounter = (src, name, prop, chartname) => {
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
failsArray.push(totalFailsCounter(srcArray));
failsArray.push(failsCounter(srcArray, "Номер / кат.", "/ 1", "1 категории"));
failsArray.push(failsCounter(srcArray, "Номер / кат.", "/ 2", "2 категории"));
failsArray.push(
  failsCounter(srcArray, "Тип", "Технического характера", "Техн. хар-ра")
);
failsArray.push(
  failsCounter(srcArray, "Тип", "Технологического характера", "Технол. хар-ра")
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

//create of array to find max value and export in d3.scales component
const yMaxFind = (array) => {
  let values = [];
  array.flat().forEach((e) => values.push(e.value));
  return d3.max(values); //extra multiplier for extra margin-top in histogram
};

export let yMax = yMaxFind(failsArray);

export default failsArray;
