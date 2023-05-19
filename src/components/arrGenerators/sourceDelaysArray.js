import React, { useState } from "react";
import * as d3 from "d3";
import { delaysSource } from "../../test/delaysSource";
import { store } from "../../redux/store";
import { useSelector, useDispatch } from "react-redux";
import { setDelaysArray } from "../../redux/toolkitSlice";

export default function ArrFunc() {
  let regexp = new RegExp(
    `[.]${store.getState().filters.regexpPattern}[.]`,
    "g"
  ); // /\.01\./gm
  console.log("regexp", regexp);

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
  const delaysCounter = (src, name, chartname) => {
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
          if (element[name].split("\r\n")[0].includes("к учету")) {
            pastYearCount =
              pastYearCount +
              Number(
                element[name]
                  .split("\r\n")[0]
                  .split("(к учету")[1]
                  .replace(/ /g, "")
                  .slice(0, -1)
              );
          } else {
            pastYearCount =
              pastYearCount +
              Number(
                element[name]
                  .split("\r\n")[0]
                  .replace(/шт/g, "")
                  .replace(/ /g, "")
              );
          }
        }
        if (findYear(currentYear).test(element["Начало"])) {
          if (element[name].split("\r\n")[0].includes("к учету")) {
            currentYearCount =
              currentYearCount +
              Number(
                element[name]
                  .split("\r\n")[0]
                  .split("(к учету")[1]
                  .replace(/ /g, "")
                  .slice(0, -1)
              );
          } else {
            currentYearCount =
              currentYearCount +
              Number(
                element[name]
                  .split("\r\n")[0]
                  .replace(/шт/g, "")
                  .replace(/ /g, "")
              );
          }
        }
      }
    });
    return [
      {
        value: pastYearCount,
        label: pastYear + 2000,
        title: chartname,
      },
      {
        value: currentYearCount,
        label: currentYear + 2000,
        title: chartname,
      },
    ];
  };

  //creating array for
  let delaysArray = [];
  delaysArray.push(delaysCounter(srcArray, "Грузовой", "Грузовых"));
  delaysArray.push(delaysCounter(srcArray, "Пассажирский", "Пассажирских"));
  delaysArray.push(delaysCounter(srcArray, "Пригородный", "Пригородных"));

  //counting number of total delays
  const totalDelaysCounter = (array) => {
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
        value: pastYearCount,
        label: pastYear + 2000,
        title: "Всего",
      },
      {
        value: currentYearCount,
        label: currentYear + 2000,
        title: "Всего",
      },
    ];
  };

  delaysArray.push(totalDelaysCounter(delaysArray));

  //create of array to find max value and export in d3.scales component
  let values = [];
  delaysArray.forEach((i) =>
    i.forEach((j) => {
      values.push(j.value);
    })
  );
  let yMaxDelays = d3.max(values); //extra multiplier for extra margin-top in histogram
  console.log("Arrfunc", delaysArray);

  // here is invalid hook call https://reactjs.org/link/invalid-hook-call
  // dispatch(setDelaysArray(delaysArray));
  return [delaysArray, yMaxDelays];
}

export let delaysArray = ArrFunc()[0];
console.log("delaysArray", delaysArray);
export let yMaxDelays = ArrFunc()[1];
