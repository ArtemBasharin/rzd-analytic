import React, { useState } from "react";
import * as d3 from "d3";
import { delaysSource } from "../../test/delaysSource";
import { store } from "../../redux/store";
import { useSelector, useDispatch } from "react-redux";
import { setDelaysArray } from "../../redux/filtersSlice";
import {
  startTime,
  failCategory,
  failKind,
  guiltyUnit,
  failReason,
  freightDelayed,
  freightDuration,
  passDelayed,
  passDuration,
  subDelayed,
  subDuration,
  otherDelayed,
  otherDuration,
} from "../../config/config";
import { testArr } from "../../test/test";
import { ContrastOutlined } from "@mui/icons-material";
import { yMax } from "./sourceFailsArray";

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

  let pastYear = store.getState().filters.pastYear;
  let currentYear = store.getState().filters.currentYear;

  //counting number of fails with conditions
  const delaysCounter = (src, name, chartname) => {
    let pastYearCount = 0;
    let currentYearCount = 0;

    src.forEach((element) => {
      if (element[name]) {
        //this check is necessary, the property may be missed
        if (element[startTime].includes(pastYear)) {
          pastYearCount = pastYearCount + Number(element[name]);
        }
        if (element[startTime].includes(currentYear)) {
          currentYearCount = currentYearCount + Number(element[name]);
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
  delaysArray.push(delaysCounter(srcArray, freightDelayed, "Грузовых"));
  delaysArray.push(delaysCounter(srcArray, passDelayed, "Пассажирских"));
  delaysArray.push(delaysCounter(srcArray, subDelayed, "Пригородных"));
  delaysArray.push(delaysCounter(srcArray, otherDelayed, "Прочих"));

  //counting number of total delays
  const totalDelaysCounter = (array) => {
    let pastYearCount = 0;
    let currentYearCount = 0;
    let tempArray = array.flat();
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

  return delaysArray;
}

export let delaysArray = ArrFunc();

console.log("delaysArray", delaysArray);

const yMaxV = () => {
  //create of array to find max value and export in d3.scales component
  let values = [];
  delaysArray.forEach((i) =>
    i.forEach((j) => {
      values.push(j.value);
    })
  );
  let yMaxDelays = d3.max(values);
  return yMaxDelays;
};
export let yMaxDelays = yMaxV();
