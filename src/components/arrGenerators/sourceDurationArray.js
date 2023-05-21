import * as d3 from "d3";
import { store } from "../../redux/store";
import { delaysSource } from "../../test/delaysSource";

let regexp = new RegExp(`[.]${store.getState().filters.regexpPattern}[.]`, "g"); // /\.01\./gm

let srcArray = [];
for (let i = 0; i < delaysSource.length; ++i) {
  if (regexp.test(delaysSource[i]["Начало"])) {
    srcArray.push(delaysSource[i]);
  }
}
// year-params will be reassigned in future versions
let pastYear = 22;
let currentYear = 23;

//counting number of fails with conditions
const durationCounter = (src, name, chartname) => {
  const findYear = (year) => {
    let regexp = new RegExp(`[0-9]{2}.[0-9]{2}.${year}`, "g");
    return regexp;
  };
  let pastYearCount = 0;
  let currentYearCount = 0;

  src.forEach((element) => {
    if (element[name]) {
      //this check is necessary, the property may be missed
      if (findYear(pastYear).test(element["Начало"])) {
        if (element[name].split("\r\n")[1].includes("к учету")) {
          pastYearCount =
            pastYearCount +
            Number(
              element[name]
                .split("\r\n")[1]
                .split("к учету")[1]
                .replace(/ /g, "")
                .replace(/,/g, ".")
                .slice(0, -2)
            );
        } else {
          pastYearCount =
            pastYearCount +
            Number(
              element[name]
                .split("\r\n")[1]
                .replace(/ /g, "")
                .replace(/,/g, ".")
                .slice(0, -1)
            );
        }
      }
      if (findYear(currentYear).test(element["Начало"])) {
        if (element[name].split("\r\n")[1].includes("к учету")) {
          currentYearCount =
            currentYearCount +
            Number(
              element[name]
                .split("\r\n")[1]
                .split("к учету")[1]
                .replace(/ /g, "")
                .replace(/,/g, ".")
                .slice(0, -2)
            );
        } else {
          currentYearCount =
            currentYearCount +
            Number(
              element[name]
                .split("\r\n")[1]
                .replace(/ /g, "")
                .replace(/,/g, ".")
                .slice(0, -1)
            );
        }
      }
    }
  });
  return [
    {
      value: Math.round(pastYearCount * 10) / 10,
      label: pastYear + 2000,
      title: chartname,
    },
    {
      value: Math.round(currentYearCount * 10) / 10,
      label: currentYear + 2000,
      title: chartname,
    },
  ];
};

//creating array for
let durationsArray = [];
durationsArray.push(durationCounter(srcArray, "Грузовой", "Грузовых"));
durationsArray.push(durationCounter(srcArray, "Пассажирский", "Пассажирских"));
durationsArray.push(durationCounter(srcArray, "Пригородный", "Пригородных"));

//counting number of total durations
const totalDurationCounter = (array) => {
  let pastYearCount = 0;
  let currentYearCount = 0;
  let tempArray = array.flat();
  // console.log("tempArray", tempArray);
  tempArray.forEach((element) => {
    if (element.label === pastYear + 2000) {
      pastYearCount = pastYearCount + element.value;
    }
    if (element.label === currentYear + 2000) {
      currentYearCount = currentYearCount + element.value;
    }
  });
  return [
    {
      value: Math.round(pastYearCount * 10) / 10,
      label: pastYear + 2000,
      title: "Всего",
    },
    {
      value: Math.round(currentYearCount * 10) / 10,
      label: currentYear + 2000,
      title: "Всего",
    },
  ];
};

durationsArray.push(totalDurationCounter(durationsArray));

//create of array to find max value and export in d3.scales component
const yMaxFind = (array) => {
  let values = [];
  array.flat().forEach((e) => values.push(e.value));
  return d3.max(values); //extra multiplier for extra margin-top in histogram
};

export let yMaxDurations = yMaxFind(durationsArray);

export default durationsArray;