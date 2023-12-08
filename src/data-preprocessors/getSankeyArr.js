import * as d3 from "d3";
import cloneDeep from "lodash.clonedeep";

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
} from "../utils/config";

export const getSankeyArr = (
  srcArray,
  dateStart,
  dateEnd,
  minValue,
  unitsList
) => {
  // console.log(dateStart, dateEnd);
  const calcTotalDurationValue = (obj) => {
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

  let srcArrayInDatesFrame = [];
  srcArray.forEach((el) => {
    if (
      Date.parse(el[startTime]) >= dateStart &&
      Date.parse(el[startTime]) <= dateEnd
    ) {
      srcArrayInDatesFrame.push({
        guiltyUnit: el[guiltyUnit],
        failReason: el[failReason],
        totalDuration: calcTotalDurationValue(el),
        freightDuration: el[freightDuration] || 0,
        passDuration: el[passDuration] || 0,
        subDuration: el[subDuration] || 0,
        otherDuration: el[otherDuration] || 0,
        failCategory: el[failCategory],
        failKind: el[failKind],
      });
    }
  });
  // console.log("srcArrayInDatesFrame", srcArrayInDatesFrame);

  let srcArrayMergedByUniqueUnits = [];
  srcArrayInDatesFrame.forEach((obj) => {
    const index = srcArrayMergedByUniqueUnits.findIndex(
      (item) => item.guiltyUnit === obj.guiltyUnit
    );
    if (index === -1) {
      srcArrayMergedByUniqueUnits.push({ ...obj });
    } else {
      srcArrayMergedByUniqueUnits[index].totalDuration += obj.totalDuration;
      srcArrayMergedByUniqueUnits[index].freightDuration += obj.freightDuration;
      srcArrayMergedByUniqueUnits[index].passDuration += obj.passDuration;
      srcArrayMergedByUniqueUnits[index].subDuration += obj.subDuration;
      srcArrayMergedByUniqueUnits[index].otherDuration += obj.otherDuration;
    }
  });
  // console.log("srcArrayMergedByUniqueUnits", srcArrayMergedByUniqueUnits);

  let unitsArrFilteredByMinValueTool = [];
  srcArrayMergedByUniqueUnits.forEach((el) => {
    el.totalDuration >= minValue &&
      unitsArrFilteredByMinValueTool.push(el.guiltyUnit);
  });

  let srcArrayMergedDurations = [];
  srcArrayInDatesFrame.forEach((obj) => {
    const index = srcArrayMergedDurations.findIndex(
      (item) =>
        item.guiltyUnit === obj.guiltyUnit &&
        item.failReason === obj.failReason &&
        item.failCategory === obj.failCategory &&
        item.failKind === obj.failKind
    );
    if (index === -1) {
      srcArrayMergedDurations.push({ ...obj });
    } else {
      srcArrayMergedDurations[index].totalDuration += obj.totalDuration;
      srcArrayMergedDurations[index].freightDuration += obj.freightDuration;
      srcArrayMergedDurations[index].passDuration += obj.passDuration;
      srcArrayMergedDurations[index].subDuration += obj.subDuration;
      srcArrayMergedDurations[index].otherDuration += obj.otherDuration;
    }
  });
  // console.log("srcArrayMergedDurations", srcArrayMergedDurations);

  let srcArrayFilteredByMinValueTool = [];
  srcArrayMergedDurations.forEach((el) => {
    unitsArrFilteredByMinValueTool.includes(el.guiltyUnit) &&
      srcArrayFilteredByMinValueTool.push(el);
  });

  // console.log("srcArrayFilteredByMinValueTool", srcArrayFilteredByMinValueTool);

  let checkedUnitsSimpleArray = [];
  if (unitsList)
    unitsList.forEach(
      (el) => el.checked === true && checkedUnitsSimpleArray.push(el.guiltyUnit)
    );
  // console.log("checkedUnitsSimpleArray", checkedUnitsSimpleArray);

  let srcArrayFilteredByCheckedUnits = [];
  if (unitsList)
    srcArrayFilteredByMinValueTool.forEach(
      (el) =>
        checkedUnitsSimpleArray.includes(el.guiltyUnit) &&
        srcArrayFilteredByCheckedUnits.push(el)
    );
  else srcArrayFilteredByCheckedUnits = srcArrayFilteredByMinValueTool;
  // console.log("srcArrayFilteredByCheckedUnits", srcArrayFilteredByCheckedUnits);

  const keys = ["guiltyUnit", "failReason", "failCategory", "failKind"];
  let index = -1;
  const nodes = [];
  const nodeByKey = new d3.InternMap([], JSON.stringify);
  const indexByKey = new d3.InternMap([], JSON.stringify);
  const links = [];

  for (const k of keys) {
    for (const d of srcArrayFilteredByCheckedUnits) {
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
    for (const d of srcArrayFilteredByCheckedUnits) {
      const names = prefix.map((k) => d[k]);
      const value = d.totalDuration || 0; /////////// here need to use selector for choose quantity, duration,
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

  ////////// sankey checklist section (need to mark disabled elements)////////////

  let unitsListAsSet = new Set();
  srcArrayFilteredByMinValueTool.forEach((el) =>
    unitsListAsSet.add(el.guiltyUnit)
  );
  let unitsListAsArr = Array.from(unitsListAsSet);
  let unitsListNew = cloneDeep(unitsList);
  unitsListNew.forEach((el) =>
    unitsListAsArr.includes(el.guiltyUnit)
      ? (el.isDisabled = false)
      : (el.isDisabled = true)
  );
  // console.log("gets", {
  //   nodes: nodes,
  //   links: links,
  //   unitsList: unitsListNew,
  // });

  return {
    nodes: nodes,
    links: links,
    unitsList: unitsListNew,
  };
};
