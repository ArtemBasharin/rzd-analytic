export const list = [
  "totalDuration",
  "passDuration",
  "subDuration",
  "freightDuration",
  // "otherDuration",
  "totalDelayed",
  "passDelayed",
  "subDelayed",
  "freightDelayed",
  // "otherDelayed",
  "technicalKind",
  "tenologicalKind",
  "specialKind",
  "otherKind",
  "firstCat",
  "secondCat",
];

const translation = [
  "Задержки общие, ч",
  "Задержки пассажирских, ч",
  "Задержки пригородных, ч",
  "Задержки грузовых, ч",
  // "Задержки прочих, ч",
  "Задержано всего",
  "Задержано пассажирских",
  "Задержано пригородных",
  "Задержано грузовых",
  // "Задержано прочих",
  "Нарушения технического вида",
  "Технологические нарушения",
  "Особая технологическая необходимость",
  "Внешние",
  "1-й категории",
  "2-й категории",
];

const colors = [
  "rgb(0, 0, 0)", // Черный
  "rgb(192, 0, 0)", // Красный
  "rgb(247, 150, 70)", // Оранжевый
  "rgb(155, 187, 89)", // Зеленый
  "rgb(31, 73, 125)", // Синий
  "rgb(0, 0, 0)", // Черный
  "rgb(192, 0, 0)", // Красный
  "rgb(247, 150, 70)", // Оранжевый
  "rgb(155, 187, 89)", // Зеленый
  "rgb(31, 73, 125)", // Синий
  "rgb(91, 155, 213)", // Светло-синий
  "rgb(255, 192, 0)", // Желтый
  "rgb(112, 48, 160)", // Фиолетовый
  "rgb(64, 64, 64)", // Темно-серый
  "rgb(0, 0, 0)", // Черный
  "rgb(192, 0, 0)", // Красный
];

export const initialChartCheckList = () => {
  let result: any[] = [];
  for (let i = 0; i < list.length; i++) {
    let strokeDash = "";
    let strokeWidth = "";
    if (list[i].includes("Duration")) {
      strokeDash = "10, 0";
      strokeWidth = "3.5";
    }

    if (list[i].includes("Delayed")) {
      strokeDash = "5, 2";
      strokeWidth = "5.5";
    }

    if (list[i].includes("Kind") || list[i].includes("Cat")) {
      strokeDash = "2, 2";
      strokeWidth = "10";
    }

    result.push({
      name: list[i],
      color: colors[i],
      translated: translation[i],
      dash: strokeDash,
      width: strokeWidth,
      checked: true,
      isDisabled: false,
    });
  }
  return result;
};
