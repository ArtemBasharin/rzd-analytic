import * as d3 from "d3";
import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
} from "../../config/config";

export const getArrDurations = (srcArray, pastYear, currentYear) => {
  //counting number of fails with conditions
  const delaysCounter = (src, name, chartname) => {
    let pastYearCount = 0;
    let currentYearCount = 0;

    src.forEach((element) => {
      if (element[name]) {
        //this check is necessary, the property may be missed
        if (element[startTime].includes(pastYear)) {
          pastYearCount = pastYearCount + element[name];
        }
        if (element[startTime].includes(currentYear)) {
          currentYearCount = currentYearCount + element[name];
        }
      }
    });
    return [
      {
        value: Math.round(pastYearCount * 10) / 10,
        label: pastYear,
        title: chartname,
      },
      {
        value: Math.round(currentYearCount * 10) / 10,
        label: currentYear,
        title: chartname,
      },
    ];
  };

  //creating array for
  let delaysArray = [];
  delaysArray.push(delaysCounter(srcArray, freightDuration, "Грузовых"));
  delaysArray.push(delaysCounter(srcArray, passDuration, "Пассажирских"));
  delaysArray.push(delaysCounter(srcArray, subDuration, "Пригородных"));
  delaysArray.push(delaysCounter(srcArray, otherDuration, "Прочих"));

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
  //find max value for d3.scales element
  const findMaxValue = (array) => {
    let values = [];
    array.flat().forEach((e) => values.push(e.value));
    return d3.max(values);
  };
  return { arr: delaysArray, y: findMaxValue(delaysArray) };
};
