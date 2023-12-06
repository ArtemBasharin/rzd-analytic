import * as d3 from "d3";

let startTime = "Начало отказа",
  failCategory = "Категория отказа",
  failKind = "Вид технологического нарушения",
  guiltyUnit = "Виновное предприятие",
  guiltyNew = "Ответственный",
  failReason = "Причина 2 ур",
  freightDelayed = "Количество грузовых поездов(по месту)",
  freightDuration = "Время грузовых поездов(по месту)",
  passDelayed = "Количество пассажирских поездов(по месту)",
  passDuration = "Время пассажирских поездов(по месту)",
  subDelayed = "Количество пригородных поездов(по месту)",
  subDuration = "Время пригородных поездов(по месту)",
  otherDelayed = "Количество прочих поездов(по месту)",
  otherDuration = "Время прочих поездов(по месту)";

function generateStylishColors(count: number) {
  var colors = [];
  var hueStep = 360 / count;
  var baseHue = Math.floor(Math.random() * 360);
  for (var i = 0; i < count; i++) {
    var hue = (baseHue + hueStep * i) % 360;
    var saturation = Math.floor(Math.random() * 41) + 60; // Ограничиваем насыщенность в диапазоне 60-100
    var lightness = Math.floor(Math.random() * 21) + 50; // Ограничиваем освещенность в диапазоне 40-60
    var color = "hsl(" + hue + ", " + saturation + "%, " + lightness + "%)";
    colors.push(color);
  }
  colors.sort(function () {
    return Math.random() - 0.5;
  });
  return colors;
}

let similarColors = generateStylishColors(100);

let colors = [];

for (let i = 0; i < 100; i++) {
  const color = (i: number) => {
    if (i < d3.schemeSet2.length) {
      return d3.schemeSet2[i];
    } else {
      return similarColors[i];
    }
  };
  colors.push(color(i));
}

// console.log("colors", colors);

export {
  startTime,
  failCategory,
  failKind,
  guiltyUnit,
  guiltyNew,
  failReason,
  freightDelayed,
  freightDuration,
  passDelayed,
  passDuration,
  subDelayed,
  subDuration,
  otherDelayed,
  otherDuration,
  similarColors,
  generateStylishColors,
  colors,
};
