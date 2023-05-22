import React, { useState } from "react";
import * as d3 from "d3";
import { delaysSource } from "../../test/delaysSource";
import { store } from "../../redux/store";
import { useSelector, useDispatch } from "react-redux";
import { setDelaysArray } from "../../redux/toolkitSlice";
import {
  startTime,
  failCategory,
  failKind,
  guiltyUnit,
  failReason,
  freightTrainsDelayed,
  freightTrainsDuration,
  passTrainsDelayed,
  passTrainsDuration,
  subTrainsDelayed,
  subTrainsDuration,
  otherTrainsDelayed,
  otherTrainsDuration,
} from "../../config/config";
import { testArr } from "../../test/test";

export default function ArrFunc() {
  let regexp = new RegExp(
    `[-]${store.getState().filters.regexpPattern}[-]`,
    "g"
  ); // /\.01\./gm
  console.log("regexp", regexp);

  let srcArray = [];
  for (let i = 0; i < testArr.length; ++i) {
    if (regexp.test(testArr[i][startTime])) {
      srcArray.push(testArr[i]);
    }
  }

  // year-params will be reassigned in future versions
  let pastYear = store.getState().filters.pastYear;
  let currentYear = store.getState().filters.currentYear;

  //counting number of fails with conditions
  const delaysCounter = (src, name, chartname) => {
    const findYear = (year) => {
      let regexp = new RegExp(`${year}`, "g");
      return regexp;
    };
    let pastYearCount = 0;
    let currentYearCount = 0;

    src.forEach((element) => {
      if (element[name]) {
        //this check is necessary, the property may be missed
        if (findYear(pastYear).test(element[startTime])) {
          if (element[name]) {
            pastYearCount = pastYearCount + Number(element[name]);
          }
        }
        if (findYear(currentYear).test(element[startTime])) {
          if (element[name]) {
            currentYearCount = currentYearCount + Number(element[name]);
          }
        }
      }
    });
    return [
      {
        value: pastYearCount,
        label: pastYear,
        title: chartname,
      },
      {
        value: currentYearCount,
        label: currentYear,
        title: chartname,
      },
    ];
  };

  //creating array for
  let delaysArray = [];
  delaysArray.push(delaysCounter(srcArray, freightTrainsDelayed, "Грузовых"));
  delaysArray.push(delaysCounter(srcArray, passTrainsDelayed, "Пассажирских"));
  delaysArray.push(delaysCounter(srcArray, subTrainsDelayed, "Пригородных"));
  delaysArray.push(delaysCounter(srcArray, otherTrainsDelayed, "Прочих"));

  //counting number of total delays
  const totalDelaysCounter = (array) => {
    let pastYearCount = 0;
    let currentYearCount = 0;
    let tempArray = array.flat();
    // console.log("tempArray", tempArray);
    tempArray.forEach((element) => {
      if (element.label === pastYear) {
        pastYearCount = pastYearCount + element.value;
      }
      if (element.label === currentYear) {
        currentYearCount = currentYearCount + element.value;
      }
    });
    return [
      {
        value: pastYearCount,
        label: pastYear,
        title: "Всего",
      },
      {
        value: currentYearCount,
        label: currentYear,
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
  let yMaxDelays = d3.max(values);
  console.log("Arrfunc", delaysArray);

  return [delaysArray, yMaxDelays];
}

export let delaysArray = ArrFunc()[0];
console.log("delaysArray", delaysArray);
export let yMaxDelays = ArrFunc()[1];
