// import { useRef } from "react";
import * as d3 from "d3";
import { useSelector } from "react-redux";
import {
  getComparisonText,
  getNumberWithWord,
  getWordOnly,
} from "../config/functions";
import { getReportArr } from "../data-preprocessors/getReportArr";
import {
  startTime,
  freightDelayed,
  passDelayed,
  subDelayed,
  otherDelayed,
  guiltyUnit,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  failReason,
  cutDecimals,
} from "../config/config";

interface RootState {
  filters: {
    sourceState: any[];
    analyzeState: {
      failsArray: any[];
      failsYmax: number;
      delaysArray: any[];
      delaysYmax: number;
      durationsArray: any[];
      durationsYmax: number;
      guiltsArray: any[];
      guiltsYmax: number;
      guiltsDurationsArray: any[];
      guiltsDurationsYmax: number;
      reasonsArray: any[];
      reasonsYmax: number;
    };
    regexpPattern: string;
  };
}

const varTrains: string[] = ["поезд", "поезда", "поездов"];
const varFails: string[] = [
  "технологическое нарушение",
  "технологических нарушения",
  "технологических нарушений",
];
const varDelay: string[] = ["задержан", "задержано", "задержано"];

const TextReportTemplatePeriod = () => {
  // const refTextReportAnyDate = useRef();
  const srcArr = useSelector((state: RootState) => state.filters.sourceState);
  const analyze = useSelector((state: RootState) => state.filters.analyzeState);
  const pattern = useSelector(
    (state: RootState) => state.filters.regexpPattern
  );

  console.log("analyze", analyze);
  const arr = getReportArr(srcArr, pattern);
  let currentYear = d3.max(arr.map((el) => el.year));
  let pastYear = currentYear - 1;

  let dictionary: any[] = [];
  let arrForDict = arr.find((obj) => obj.year === currentYear);
  arrForDict.report.forEach((el: any) => dictionary.push(el[guiltyUnit]));

  const getOneUnitReport = (year: number, unit: string) => {
    const currentYearArr: any[] = arr.find((obj) => obj.year === year).report;
    const currentYearUnit: any = currentYearArr.find(
      (objUnit) => objUnit[guiltyUnit] === unit
    );
    // console.log("unit", unit);
    // console.log("currentYearArr", currentYearArr);
    // console.log("currentYearUnit", currentYearUnit);

    if (currentYearUnit)
      return (
        <span className="text_inner">
          {currentYearUnit.count} ТН.{" "}
          {getWordOnly(currentYearUnit.totalDelayed, varDelay, true)}{" "}
          {getNumberWithWord(currentYearUnit.totalDelayed, varTrains)} на{" "}
          {cutDecimals(currentYearUnit.totalDuration)} ч, в том числе,{" "}
          {currentYearUnit[freightDelayed] > 0
            ? currentYearUnit[freightDelayed] +
              " груз. на " +
              cutDecimals(currentYearUnit[freightDuration]) +
              " ч"
            : ""}
          {currentYearUnit[freightDelayed] > 0 &&
          (currentYearUnit[passDelayed] > 0 ||
            currentYearUnit[subDelayed] > 0 ||
            currentYearUnit[otherDelayed] > 0)
            ? ", "
            : ""}
          {currentYearUnit[passDelayed] > 0
            ? currentYearUnit[passDelayed] +
              " пасс. на " +
              cutDecimals(currentYearUnit[passDuration]) +
              " ч"
            : ""}
          {currentYearUnit[passDelayed] > 0 &&
          (currentYearUnit[subDelayed] > 0 || currentYearUnit[otherDelayed] > 0)
            ? ", "
            : ""}
          {currentYearUnit[subDelayed] > 0
            ? currentYearUnit[subDelayed] +
              " приг. на " +
              cutDecimals(currentYearUnit[subDuration]) +
              " ч"
            : ""}
          {currentYearUnit[subDelayed] > 0 && currentYearUnit[otherDelayed] > 0
            ? ", "
            : ""}
          {currentYearUnit[otherDelayed] > 0
            ? currentYearUnit[otherDelayed] +
              " проч. на " +
              cutDecimals(currentYearUnit[otherDuration]) +
              " ч"
            : ""}
        </span>
      );
  };

  const getArrReasons = (year: number, unit: string) => {
    const currentYearArr: any[] = arr.find((obj) => obj.year === year).report;
    const currentYearUnit: any = currentYearArr.find(
      (objUnit) => objUnit[guiltyUnit] === unit
    );
    if (currentYearUnit) return `${currentYearUnit[failReason]}`;
  };

  let text: any[] = [];
  dictionary.forEach((unit: string) =>
    text.push(
      <p className="text_paragraph text_inner">
        {" "}
        <span className="text_unit">{unit}</span> :{" "}
        {getOneUnitReport(currentYear, unit)} (за аналогичный период прошлого
        года: {getOneUnitReport(pastYear, unit) || "ТН не допущено"}). Причины:{" "}
        {getArrReasons(currentYear, unit)}.
      </p>
    )
  );

  return (
    <div className="text_container">
      <p className="text_paragraph">
        1. За рассматриваемый период допущено{" "}
        {getNumberWithWord(analyze.failsArray[0][1].value, varFails)} (далее –
        ТН), за аналогичный период прошлого года было допущено{" "}
        {analyze.failsArray[0][0].value} ТН,{" "}
        {getComparisonText(
          analyze.failsArray[0][1].value,
          analyze.failsArray[0][0].value
        )}
        . {getWordOnly(analyze.delaysArray[0][1].value, varDelay, true)}{" "}
        {getNumberWithWord(analyze.delaysArray[0][1].value, varTrains)}, за
        аналогичный период прошлого года{" "}
        {getWordOnly(analyze.delaysArray[0][0].value, varDelay)}{" "}
        {getNumberWithWord(analyze.delaysArray[0][0].value, varTrains)},{" "}
        {getComparisonText(
          analyze.delaysArray[0][1].value,
          analyze.delaysArray[0][0].value
        )}
        . Общая продолжительность задержек поездов составила{" "}
        {analyze.durationsArray[0][1].value} ч, за аналогичный период прошлого
        года продолжительность задержек составила{" "}
        {analyze.durationsArray[0][0].value} ч,{" "}
        {getComparisonText(
          analyze.durationsArray[0][1].value,
          analyze.durationsArray[0][0].value
        )}
        .
      </p>
      <p className="text_paragraph">
        2. Определен тип у {analyze.failsArray[0][1].value} ТН, из них:
      </p>

      <p className="text_paragraph">
        технического характера – {analyze.failsArray[3][1].value} (в 2022 г. –{" "}
        {analyze.failsArray[3][0].value}),{" "}
        {getComparisonText(
          analyze.failsArray[3][1].value,
          analyze.failsArray[3][0].value
        )}
        ;
      </p>

      <p className="text_paragraph">
        технологического характера – {analyze.failsArray[4][1].value} (в 2022 г.
        – {analyze.failsArray[4][0].value}),{" "}
        {getComparisonText(
          analyze.failsArray[4][1].value,
          analyze.failsArray[4][0].value
        )}
        ;
      </p>

      <p className="text_paragraph">
        особая технологическая необходимость – {analyze.failsArray[5][1].value}{" "}
        (в 2022 г. – {analyze.failsArray[5][0].value}),{" "}
        {getComparisonText(
          analyze.failsArray[5][1].value,
          analyze.failsArray[5][0].value
        )}
        ;
      </p>

      <p className="text_paragraph">
        внешние – {analyze.failsArray[6][1].value} (в 2022 г. –{" "}
        {analyze.failsArray[6][0].value}),{" "}
        {getComparisonText(
          analyze.failsArray[6][1].value,
          analyze.failsArray[6][0].value
        )}
        ;
      </p>

      <p className="text_paragraph">В том числе: {text.concat("")}</p>
    </div>
  );
};

export default TextReportTemplatePeriod;
