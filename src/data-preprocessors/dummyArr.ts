const unitsList = [
  "Depo #1",
  "Depo #2",
  "Depo #3",
  "Сontrol center",
  "Track maintenance #1",
  "Track maintenance #2",
  "Track maintenance #3",
  "Electrical maintenance #1",
  "Electrical maintenance #2",
  "Car maintenance #1",
  "Car maintenance #2",
];
const reasonsList = [
  "Distraction of maintainers",
  "Late work request",
  "High blood pressure",
  "Lack of train info",
  "Obstruction at crossing",
  "Low temp speed limit",
  "Wrong brake start",
  "Misdropped cars",
  "Passenger misconduct",
  "Crossing violation",
  "Staff boarding",
  "Tug unhook delay",
  "No brake check",
  "Operator inattention",
];

const failKindsList = [
  "Технологическое нарушение",
  "Нарушение технического вида",
  "Особая технологическая необходимость",
  "Прочие причины",
];

const dummyArr = (pastYear: number, currentYear: number) => {
  console.log(pastYear, currentYear);

  const getRandomizedValue = (min: number, max: number) => {
    return Math.round(Math.random() * (max - min) + min);
  };

  const generateElement = () =>
    testArr.push({
      "Начало отказа": `${getRandomizedValue(
        pastYear,
        currentYear
      )}-0${getRandomizedValue(1, 12)}-0${getRandomizedValue(
        1,
        12
      )}T00:00:01.000Z`,
      "Категория отказа": `${getRandomizedValue(1, 2)} категория`,
      "Виновное предприятие":
        unitsList[getRandomizedValue(0, unitsList.length - 1)],
      "Количество грузовых поездов(по месту)": getRandomizedValue(1, 50),
      "Время грузовых поездов(по месту)": getRandomizedValue(1, 200),
      "Количество пассажирских поездов(по месту)": getRandomizedValue(1, 20),
      "Время пассажирских поездов(по месту)": getRandomizedValue(1, 30),
      "Количество пригородных поездов(по месту)": getRandomizedValue(1, 20),
      "Время пригородных поездов(по месту)": getRandomizedValue(1, 30),
      "Количество прочих поездов(по месту)": getRandomizedValue(1, 20),
      "Время прочих поездов(по месту)": getRandomizedValue(1, 100),
      "Причина 2 ур":
        reasonsList[getRandomizedValue(0, reasonsList.length - 1)],
      "Вид технологического нарушения": failKindsList[getRandomizedValue(0, 3)],
    });

  let testArr: any[] = [];
  for (let i = 0; i < 2000; ++i) {
    generateElement();
  }
  return testArr;
};
export default dummyArr;
