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

export const getSankeyArr = (srcArray, dateStart, dateEnd, minValue) => {
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

  console.log(result);

  const keys = ["guiltyUnit", "failReason", "failCategory", "failKind"];
  let index = -1;
  const nodes = [];
  const nodeByKey = new d3.InternMap([], JSON.stringify);
  const indexByKey = new d3.InternMap([], JSON.stringify);
  const links = [];

  for (const k of keys) {
    for (const d of result) {
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
    console.log("result", result);
    for (const d of result) {
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
  return { nodes, links };
};
