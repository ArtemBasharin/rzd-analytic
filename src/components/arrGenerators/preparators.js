export const filterByMonth = (arr, regexpPattern) => {
  let regexp = new RegExp(`[-]${regexpPattern}[-]`, "g");
  let resultArray = [];
  for (let i = 0; i < arr.length; ++i) {
    if (regexp.test(arr[i]["Начало отказа"])) {
      resultArray.push(arr[i]);
    }
  }
  return resultArray;
};

export const totalFailsCounter = (src, pastYear, currentYear) => {
  let pastYearCount = 0;
  let currentYearCount = 0;
  src.forEach((el) => {
    if (el["Начало отказа"]) {
      el["Начало отказа"].includes(pastYear) && pastYearCount++;
      el["Начало отказа"].includes(currentYear) && currentYearCount++;
    }
  });
  return [
    { value: pastYearCount, label: pastYear, title: "Всего" },
    { value: currentYearCount, label: currentYear, title: "Всего" },
  ];
};
