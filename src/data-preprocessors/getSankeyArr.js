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
  place,
} from "../utils/config";

export const getSankeyArr = (
  srcArray,
  dateStart,
  dateEnd,
  minValue,
  unitsList
) => {
  const calcTotalDurationValue = (obj) => {
    return (
      (obj[freightDuration] || 0) +
      (obj[passDuration] || 0) +
      (obj[subDuration] || 0) +
      (obj[otherDuration] || 0)
    );
  };

  // 1. Отфильтровать по дате
  const srcArrayInDatesFrame = srcArray
    .filter(
      (el) =>
        Date.parse(el[startTime]) >= dateStart &&
        Date.parse(el[startTime]) <= dateEnd
    )
    .map((el) => ({
      guiltyUnit: el[guiltyUnit],
      failReason: el[failReason],
      totalDuration: calcTotalDurationValue(el),
      freightDuration: el[freightDuration] || 0,
      passDuration: el[passDuration] || 0,
      subDuration: el[subDuration] || 0,
      otherDuration: el[otherDuration] || 0,
      failCategory: el[failCategory],
      failKind: el[failKind],
      place: el[place],
    }));

  // 2. Сумма totalDuration по уникальным guiltyUnit
  const mergedByUnit = new Map();
  srcArrayInDatesFrame.forEach((obj) => {
    const key = obj.guiltyUnit;
    if (!mergedByUnit.has(key)) {
      mergedByUnit.set(key, { ...obj });
    } else {
      const item = mergedByUnit.get(key);
      item.totalDuration += obj.totalDuration;
      item.freightDuration += obj.freightDuration;
      item.passDuration += obj.passDuration;
      item.subDuration += obj.subDuration;
      item.otherDuration += obj.otherDuration;
    }
  });

  // 3. Оставить guiltyUnit, у которых totalDuration >= minValue
  const unitsAboveThreshold = new Set();
  mergedByUnit.forEach((val, key) => {
    if (val.totalDuration >= minValue) {
      unitsAboveThreshold.add(key);
    }
  });

  // 4. Сгруппировать по уникальной комбинации полей
  const mergedDetailed = new Map();
  srcArrayInDatesFrame.forEach((obj) => {
    if (!unitsAboveThreshold.has(obj.guiltyUnit)) return;
    const key = JSON.stringify([
      obj.guiltyUnit,
      obj.failReason,
      obj.failCategory,
      obj.failKind,
      obj.place,
    ]);
    if (!mergedDetailed.has(key)) {
      mergedDetailed.set(key, { ...obj });
    } else {
      const item = mergedDetailed.get(key);
      item.totalDuration += obj.totalDuration;
      item.freightDuration += obj.freightDuration;
      item.passDuration += obj.passDuration;
      item.subDuration += obj.subDuration;
      item.otherDuration += obj.otherDuration;
    }
  });

  let dataFiltered = Array.from(mergedDetailed.values());

  // 5. Применить фильтр по unitsList
  let checkedUnits = null;
  if (unitsList) {
    checkedUnits = new Set(
      unitsList.filter((el) => el.checked).map((el) => el.guiltyUnit)
    );
    dataFiltered = dataFiltered.filter((d) => checkedUnits.has(d.guiltyUnit));
  }

  // 6. Объединить place < minValue в "Остальные"
  const placeTotals = new Map();
  dataFiltered.forEach((d) => {
    placeTotals.set(d.place, (placeTotals.get(d.place) || 0) + d.totalDuration);
  });

  const lowValuePlaces = new Set();
  placeTotals.forEach((val, key) => {
    if (val < minValue) lowValuePlaces.add(key);
  });

  dataFiltered = dataFiltered.map((d) => ({
    ...d,
    place: lowValuePlaces.has(d.place)
      ? `Остальные (менее ${minValue} ч)`
      : d.place,
  }));

  // 7. Создать nodes и links
  const keys = ["guiltyUnit", "place", "failReason"];
  let index = -1;
  const nodes = [];
  const nodeByKey = new d3.InternMap([], JSON.stringify);
  const indexByKey = new d3.InternMap([], JSON.stringify);
  const links = [];

  for (const k of keys) {
    for (const d of dataFiltered) {
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

    for (const d of dataFiltered) {
      const names = prefix.map((k) => d[k]);
      const value = d.totalDuration || 0;
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

  // 8. Обновить список units
  const unitsUsed = new Set(dataFiltered.map((d) => d.guiltyUnit));
  const unitsListNew = cloneDeep(unitsList || []);
  unitsListNew.forEach((el) => {
    el.isDisabled = !unitsUsed.has(el.guiltyUnit);
  });

  return {
    nodes,
    links,
    unitsList: unitsListNew,
  };
};
