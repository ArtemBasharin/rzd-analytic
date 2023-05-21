import { delaysSource } from "../../test/delaysSource";
import * as d3 from "d3";

import { store } from "../../redux/store";

let regexp = new RegExp(`[.]${store.getState().filters.regexpPattern}[.]`, "g"); // /\.01\./gm

let srcArray = [];
for (let i = 0; i < delaysSource.length; ++i) {
  if (regexp.test(delaysSource[i]["Начало"])) {
    srcArray.push(delaysSource[i]);
  }
}

const yearFilter = (el) => {
  return Number(
    20 +
      el["Начало"]
        .trim()
        .replace(/[\r\n]/g, " ")
        .split(" ")[0]
        .slice(6)
  );
};

const unitFilter = (el) => {
  return el["Ответственный"]
    .replace(/[\r\n]/g, " ")
    .replace(/З-СИБ,/g, "")
    .replace(/ООО «ЛокоТех-Сервис»/g, " ")
    .replace(/ООО «СТМ-Сервис»/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const durationFilter = (el) => {
  let trainKinds = ["Грузовой", "Пассажирский", "Пригородный"];
  let totalDuration = 0;
  trainKinds.forEach((el_tr) => {
    if (el[el_tr])
      if (el[el_tr].split("\r\n")[1].includes("к учету")) {
        totalDuration =
          totalDuration +
          Number(
            el[el_tr]
              .split("\r\n")[1]
              .split("к учету")[1]
              .replace(/ /g, "")
              .replace(/,/g, ".")
              .slice(0, -2)
          );
      } else {
        totalDuration =
          totalDuration +
          Number(
            el[el_tr]
              .split("\r\n")[1]
              .replace(/ /g, "")
              .replace(/,/g, ".")
              .slice(0, -1)
          );
      }
  });
  return totalDuration;
};

const maxYearKey = (arr) => {
  let maxKeyArr = [];
  Object.keys(arr[0]).forEach((el2) => {
    if (!isNaN(el2)) maxKeyArr.push(el2);
  });
  return d3.max(maxKeyArr);
};

function byField(field) {
  return (a, b) => (a[field] < b[field] ? 1 : -1);
}

const createGuiltsArray = (src) => {
  //accumulate values from source
  const subUnitsAsMap = new Map();
  let uniqueYearLabelsArr = [];
  for (let i = 0; i < src.length; i += 1) {
    const unit = unitFilter(src[i]);
    const year = yearFilter(src[i]);
    if (!uniqueYearLabelsArr.includes(year)) uniqueYearLabelsArr.push(year);
    const currentItem = {
      yearLabel: year,
      label: unit,
      value: durationFilter(src[i]),
    };
    if (subUnitsAsMap.has(year + "-" + unit)) {
      let existedItem = subUnitsAsMap.get(year + "-" + unit);
      existedItem.value += durationFilter(src[i]);
    } else {
      subUnitsAsMap.set(year + "-" + unit, currentItem);
    }
  }

  //unite items with same key [subUnit]
  let transitArr = [...subUnitsAsMap.values()];
  const subResult = new Map();
  for (let i = 0; i < transitArr.length; i += 1) {
    const currentItem = transitArr[i].label;
    const currentItemYearLabel = transitArr[i].yearLabel.toString();
    if (!subResult.has("_" + currentItem)) {
      subResult.set("_" + currentItem, {
        label: currentItem,
        [currentItemYearLabel]: transitArr[i].value,
      });
    } else {
      let existedItem = subResult.get("_" + currentItem);
      existedItem[currentItemYearLabel] = transitArr[i].value;
    }
  }

  //find items with not nonexistent yearLabel and assign zero-value to it
  let result = [...subResult.values()];
  uniqueYearLabelsArr.sort();
  for (let i = 0; i < uniqueYearLabelsArr.length; i++) {
    result.map(function (el) {
      if (!el[uniqueYearLabelsArr[i]]) {
        return (el[uniqueYearLabelsArr[i]] = 0);
      }
    });
  }

  return result.sort(byField(maxYearKey(result)));
};

export let sourceGuiltyDurationArray = createGuiltsArray(srcArray);
export let maxYearGuiltyDuration = maxYearKey(sourceGuiltyDurationArray);

let yMaxGroupsArr = [];
sourceGuiltyDurationArray.forEach((el) => {
  Object.values(el).forEach((el2) => {
    if (!isNaN(el2)) yMaxGroupsArr.push(el2);
  });
});

export let yMaxGroupsDuration = d3.max(yMaxGroupsArr);

const arrayByField = (src) => {
  let result = [];
  src.forEach((el) => result.push(el[maxYearKey(src)]));
  return result;
};

const paretoArrayGen = (src) => {
  let result = [];
  let totalSum = arrayByField(src).reduce((sum, current) => {
    result.push(sum);
    return sum + current;
  });
  result.push(totalSum);
  return result.map((el) => Math.round((el / totalSum) * 1000) / 10);
};

let paretoArray = paretoArrayGen(sourceGuiltyDurationArray);
for (let i = 0; i < sourceGuiltyDurationArray.length; i += 1) {
  sourceGuiltyDurationArray[i].valueP = paretoArray[i];
}
export let paretoArrayResultDuration = sourceGuiltyDurationArray;
console.log("paretoArrayResultDuration", paretoArrayResultDuration);