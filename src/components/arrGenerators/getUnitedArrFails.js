import * as d3 from "d3";
import { startTime, failCategory, failKind } from "../../config/config";

export const getUnitedArrFails = (srcArray, pastYear, currentYear) => {
  const totalFailsCounter = (src) => {
    let pastYearCount = 0;
    let currentYearCount = 0;
    src.forEach((el) => {
      if (el[startTime]) {
        el[startTime].includes(pastYear) && pastYearCount++;
        el[startTime].includes(currentYear) && currentYearCount++;
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
          element[startTime].includes(pastYear)
        )
          pastYearCount++;
        if (
          element[name].includes(prop) &&
          element[startTime].includes(currentYear)
        )
          currentYearCount++;
      }
    });
    return [
      { value: pastYearCount, label: pastYear, title: chartname },
      { value: currentYearCount, label: currentYear, title: chartname },
    ];
  };

  // create array for chart section with some kinds fails
  let failsArray = [];
  failsArray.push(totalFailsCounter(srcArray));
  failsArray.push(
    failsCounter(srcArray, failCategory, "1 категория", "1 категории")
  );
  failsArray.push(
    failsCounter(srcArray, failCategory, "2 категория", "2 категории")
  );
  failsArray.push(
    failsCounter(srcArray, failKind, "Технического характера", "Техн. хар-ра")
  );
  failsArray.push(
    failsCounter(
      srcArray,
      failKind,
      "Технологического характера",
      "Технол. хар-ра"
    )
  );
  failsArray.push(
    failsCounter(
      srcArray,
      failKind,
      "Особая технологическая необходимость",
      "Особая технол. необх."
    )
  );
  failsArray.push(failsCounter(srcArray, failKind, "Внешние", "Внешние"));

  //find max value for d3.scales element
  const findMaxValue = (array) => {
    let values = [];
    array.flat().forEach((e) => values.push(e.value));
    return d3.max(values);
  };
  return { arr: failsArray, y: findMaxValue(failsArray) };
};
