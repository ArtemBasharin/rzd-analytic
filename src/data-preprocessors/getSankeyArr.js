import * as d3 from "d3";

import {
  startTime,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  guiltyUnit,
  failCategory,
  failKind,
  failReason,
} from "../config/config";

export const getSankeyArr = (
  srcArray,
  dateStart,
  dateEnd,
  minValue,
  uncheckedUnits
) => {
  // console.log("dateEnd", dateEnd);
  // console.log("dateStart", dateStart);
  console.log("srcArray", srcArray);

  const calcTotalDuration = (obj) => {
    let freightDur,
      passDur,
      subDur,
      otherDur = 0;
    obj[freightDuration]
      ? (freightDur = obj[freightDuration])
      : (freightDur = 0);
    obj[passDuration] ? (passDur = obj[passDuration]) : (passDur = 0);
    obj[subDuration] ? (subDur = obj[subDuration]) : (subDur = 0);
    obj[otherDuration] ? (otherDur = obj[otherDuration]) : (otherDur = 0);
    let total = freightDur + passDur + subDur + otherDur;
    return total;
  };

  let result = [];
  srcArray.forEach((el) => {
    if (
      Date.parse(el[startTime]) >= dateStart &&
      Date.parse(el[startTime]) <= dateEnd
    ) {
      result.push({
        guiltyUnit: el[guiltyUnit],
        failReason: el[failReason],
        totalDuration: calcTotalDuration(el),
        freightDuration: el[freightDuration] || 0,
        passDuration: el[passDuration] || 0,
        subDuration: el[subDuration] || 0,
        otherDuration: el[otherDuration] || 0,
        failCategory: el[failCategory],
        failKind: el[failKind],
      });
    }
  });

  console.log("result", result);

  const uniqueUnits = [];

  result.forEach((obj) => {
    const index = uniqueUnits.findIndex(
      (item) => item.guiltyUnit === obj.guiltyUnit
    );

    if (index === -1) {
      uniqueUnits.push({ ...obj });
    } else {
      uniqueUnits[index].totalDuration += obj.totalDuration;
      uniqueUnits[index].freightDuration += obj.freightDuration;
      uniqueUnits[index].passDuration += obj.passDuration;
      uniqueUnits[index].subDuration += obj.subDuration;
      uniqueUnits[index].otherDuration += obj.otherDuration;
    }
  });

  let unnecessaryUnits = [];
  uniqueUnits.forEach((el) => {
    el.totalDuration > minValue && unnecessaryUnits.push(el.guiltyUnit);
  });

  console.log("unnecessaryUnits", unnecessaryUnits);
  const filteredArr = result.filter((element) =>
    unnecessaryUnits.length === 0
      ? true
      : unnecessaryUnits.includes(element.guiltyUnit)
  );
  console.log("filteredArr", filteredArr);

  let tempSet = new Set();
  filteredArr.forEach((el) => tempSet.add(el.guiltyUnit));
  let uniqueUnitsToolPanel = Array.from(tempSet);
  console.log("uniqueUnitsKeys", uniqueUnitsToolPanel);

  const filterUncheckedUnits = (srcArr, uncheckedArr) => {
    let result = [];
    srcArr.forEach((el) => {
      uncheckedArr.includes(el.guiltyUnit) && result.push(el);
    });
    return result;
  };

  let filteredArrByUncheckedUnits = [];
  uncheckedUnits !== undefined
    ? (filteredArrByUncheckedUnits = filterUncheckedUnits(
        filteredArr,
        uncheckedUnits
      ))
    : (filteredArrByUncheckedUnits = filteredArr);

  const keys = ["guiltyUnit", "failReason", "failCategory", "failKind"];
  let index = -1;
  const nodes = [];
  const nodeByKey = new d3.InternMap([], JSON.stringify);
  const indexByKey = new d3.InternMap([], JSON.stringify);
  const links = [];

  for (const k of keys) {
    for (const d of filteredArrByUncheckedUnits) {
      const key = [k, d[k]];
      if (nodeByKey.has(key)) continue;
      const node = { name: d[k] };
      nodes.push(node);
      nodeByKey.set(key, node);
      indexByKey.set(key, ++index);
    }
  }

  for (let i = 1; i < keys.length; ++i) {
    const a = keys[i - 1];
    const b = keys[i];
    const prefix = keys.slice(0, i + 1);
    const linkByKey = new d3.InternMap([], JSON.stringify);
    for (const d of filteredArrByUncheckedUnits) {
      const names = prefix.map((k) => d[k]);
      const value = d.totalDuration || 1; /////////// here need to use selector for choose quantity, duration,
      let link = linkByKey.get(names);
      if (link) {
        link.value += value;
        continue;
      }
      link = {
        source: indexByKey.get([a, d[a]]),
        target: indexByKey.get([b, d[b]]),
        names,
        value,
      };
      links.push(link);
      linkByKey.set(names, link);
    }
  }
  return { nodes, links, uniqueUnitsToolPanel };
};
