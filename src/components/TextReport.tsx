// import { useRef } from "react";
import * as d3 from "d3";
import { useSelector, useDispatch } from "react-redux";
import {
  cellComparingPercents,
  defineСategory,
  getComparisonText,
  getNumberWithWord,
  getWordOnly,
  renameCategory,
  getOneUnitReport,
  getOneUnitReportWithCompare,
  sumValuesByKey,
} from "../utils/functions";

import { cutDecimals } from "../utils/functions";
import { useState, useMemo } from "react";
import SankeyDiagram from "./SankeyDiagram";

import {
  startTime,
  freightDelayed,
  freightDuration,
  ID,
  place,
  allDelayed,
  allDuration,
  guiltyNew,
  failReason,
  guiltyUnit,
} from "../utils/config";

import {
  startTime,
  freightDelayed,
  freightDuration,
  ID,
  place,
  allDelayed,
  allDuration,
  guiltyNew,
  failReason,
  guiltyUnit,
} from "../utils/config";

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
    reportSrcState: any[];
    reportStations: any[];
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    sankeyCheckList: any[];
=======
    dateStart: number;
    dateEnd: number;
>>>>>>> Stashed changes
=======
    dateStart: number;
    dateEnd: number;
>>>>>>> Stashed changes
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
  // const analyze = useSelector((state: RootState) => state.filters.analyzeState);
  const arr = useSelector((state: RootState) => state.filters.reportSrcState);

  const stationsReport = useSelector(
    (state: RootState) => state.filters.reportStations,
  );

  const checkList = useSelector((state: RootState) => state.filters.sankeyCheckList);
  const dispatch = useDispatch();

  // Create filtered checkList for each unit
  const getFilteredCheckList = useMemo(() => {
    return (currentUnit: string) => {
      return checkList.map(item => ({
        ...item,
        checked: item.guiltyUnit === currentUnit
      }));
    };
  }, [checkList]);

  const [isRightTableVisible, setRightTableVisible] = useState(false);
  const toggleRightTable = () => {
    setRightTableVisible(!isRightTableVisible);
  };

  let sourceArr = useSelector((state: RootState) => state.filters.sourceState);
  let topCases: any = [];
  let start = new Date(
    useSelector((state: RootState) => state.filters.dateStart),
  );
  let end = new Date(useSelector((state: RootState) => state.filters.dateEnd));
  console.log(start, end);
  // const [isTopCasesVisible, setIsTopCasesVisible] = useState(false);
  // const toggleTopCasesVisible = () => {
  //   setIsTopCasesVisible(!isTopCasesVisible);
  //   console.log(topCases);
  //   topCases = sourceArr
  //     .filter((el) => el[startTime] > start && el[startTime] < end)
  //     .sort((a, b) => b[freightDuration] - b[freightDuration]);
  // };

  topCases = sourceArr
    .filter((el) => {
      const elDate = new Date(el[startTime] as string);
      return elDate > start && elDate < end;
    })
    .sort((b, a) => a[freightDuration] - b[freightDuration]);
  console.log(topCases);

  let currentYear: number = d3.max(arr.map((el) => el.year));
  let pastYear: number = currentYear - 1;

  let dictionary: any[] = [];
  let arrForDict = arr.find((obj) => obj.year === currentYear);
  arrForDict.report.forEach((el: any) => dictionary.push(el.guiltyUnit));

  const getArrReasons = (year: number, unit: string) => {
    const currentYearArr: any[] = arr.find((obj) => obj.year === year).report;
    const currentYearUnit: any = currentYearArr.find(
      (objUnit) => objUnit.guiltyUnit === unit,
    );
    if (currentYearUnit) return `${currentYearUnit.failReason}`;
  };

  //generating part of each unit description
  let text: any[] = [];
  dictionary.forEach((unit: string) =>
    text.push(
<<<<<<< Updated upstream
      <>
        <p className="text_paragraph text_inner">
          <span className="text_unit">{unit.replace(/\n/g, " ")}</span>:{" "}
          {getOneUnitReportWithCompare({
            arr: arr,
            currYear: currentYear,
            pastYear: pastYear,
            unit: unit,
          })}{" "}
          (за аналогичный период прошлого года:{" "}
          {getOneUnitReport(arr, pastYear, unit) || "ТН не допущено"}). Причины:{" "}
          {getArrReasons(currentYear, unit)}
        </p>
        <SankeyDiagram 
          key={unit} 
          svgId={`sankey-${unit.replace(/\s+/g, '-')}`}
          filteredCheckList={getFilteredCheckList(unit)}
        />
      </>,
=======
      <p className="text_paragraph text_inner">
        <span className="text_unit">{unit.replace(/\n/g, " ")}</span>:{" "}
        {/* {getOneUnitReport(arr, currentYear, unit)} (за аналогичный период */}
        {getOneUnitReportWithCompare({
          arr: arr,
          currYear: currentYear,
          pastYear: pastYear,
          unit: unit,
        })}{" "}
        (за аналогичный период прошлого года:{" "}
        {getOneUnitReport(arr, pastYear, unit) || "ТН не допущено"}). Причины:{" "}
        {getArrReasons(currentYear, unit)}
      </p>,
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
    ),
  );

  //generating one row of table of each unit description
  const getOneRowReport = (unit: string) => {
    const currentYearArr: any[] = arr.find(
      (obj) => obj.year === currentYear,
    ).report;
    const currentYearUnit: any = currentYearArr.find(
      (objUnit) => objUnit.guiltyUnit === unit,
    );

    const pastYearArr: any[] = arr.find((obj) => obj.year === pastYear).report;
    const pastYearUnit: any = pastYearArr.find(
      (objUnit) => objUnit.guiltyUnit === unit,
    );
    let pastYearUnitTotalDuration = pastYearUnit
      ? pastYearUnit.totalDuration
      : "";
    let currentYearUnitTotalDuration = currentYearUnit
      ? currentYearUnit.totalDuration
      : "";
    return {
      layout: (
        <tr key={unit}>
          <td className="table_bold_right">{unit}</td>
          <td>{pastYearUnitTotalDuration}</td>
          <td className="table_bold_right">{currentYearUnitTotalDuration}</td>
          {cellComparingPercents(
            pastYearUnitTotalDuration,
            currentYearUnitTotalDuration,
          )}
          <td>
            {cutDecimals(
              (pastYearUnitTotalDuration / arr[0].sum.pastYearTotalDurations) *
                100,
            )}
          </td>
          <td>
            {cutDecimals(
              (currentYearUnitTotalDuration /
                arr[1].sum.currentYearTotalDurations) *
                100,
            )}
          </td>
        </tr>
      ),
      pastYear: pastYearUnitTotalDuration,
      currentYear: currentYearUnitTotalDuration,
    };
  };

  let dictionaryForTableAsSet: Set<string> = new Set();
  arr.forEach((el) => {
    el.report.forEach((el2: any) =>
      dictionaryForTableAsSet.add(el2.guiltyUnit),
    );
  });

  let dictionaryForTable: string[] = Array.from(dictionaryForTableAsSet);

  const dicUnitForTableStationsAsSet: Set<string> = new Set();

  arr[0].report.forEach((el: any) => {
    dicUnitForTableStationsAsSet.add(el.guiltyUnit);
  });
  arr[1].report.forEach((el: any) => {
    dicUnitForTableStationsAsSet.add(el.guiltyUnit);
  });

  const dicUnitForTableStations: string[] = Array.from(
    dicUnitForTableStationsAsSet,
  );

  let tableLayout: any[] = [];
  let subtotal: any = {
    PCH: { arr: [], pastValue: 0, currentValue: 0 },
    SHCH: { arr: [], pastValue: 0, currentValue: 0 },
    ECH: { arr: [], pastValue: 0, currentValue: 0 },
    VCHD: { arr: [], pastValue: 0, currentValue: 0 },
    PMS: { arr: [], pastValue: 0, currentValue: 0 },
    TCH: { arr: [], pastValue: 0, currentValue: 0 },
    SLD: { arr: [], pastValue: 0, currentValue: 0 },
    FPC: { arr: [], pastValue: 0, currentValue: 0 },
    D: { arr: [], pastValue: 0, currentValue: 0 },
    OTHER: { arr: [], pastValue: 0, currentValue: 0 },
  };

  dictionaryForTable.forEach((el: string) => {
    const category: string = defineСategory(el);

    if (subtotal[category]) {
      subtotal[category].arr = [
        ...subtotal[category].arr,
        getOneRowReport(el).layout,
      ];
      subtotal[category].pastValue =
        subtotal[category].pastValue + Number(getOneRowReport(el).pastYear);
      subtotal[category].currentValue =
        subtotal[category].currentValue +
        Number(getOneRowReport(el).currentYear);
    } else {
      subtotal["OTHER"].arr = [
        ...subtotal["OTHER"].arr,
        getOneRowReport(el).layout,
      ];
      subtotal["OTHER"].pastValue =
        subtotal["OTHER"].pastValue + Number(getOneRowReport(el).pastYear);
      subtotal["OTHER"].currentValue =
        subtotal["OTHER"].currentValue +
        Number(getOneRowReport(el).currentYear);
    }
  });

  for (const key in subtotal) {
    subtotal[key].arr.length !== 0 &&
      tableLayout.push(
        <>
          {subtotal[key].arr}
          <tr className="table_bold text_header table_fill" key={subtotal[key]}>
            <td className="table_bold_right table_fill">
              {renameCategory(key)}
            </td>
            <td>{cutDecimals(subtotal[key].pastValue)}</td>
            <td className="table_bold_right table_fill">
              {" "}
              {cutDecimals(subtotal[key].currentValue)}
            </td>
            {cellComparingPercents(
              subtotal[key].pastValue,
              subtotal[key].currentValue,
            )}
            <td>
              {cutDecimals(
                (subtotal[key].pastValue / arr[0].sum.pastYearTotalDurations) *
                  100,
              )}
            </td>
            <td className="table_bold_right">
              {" "}
              {cutDecimals(
                (subtotal[key].currentValue /
                  arr[1].sum.currentYearTotalDurations) *
                  100,
              )}
            </td>
          </tr>
        </>,
      );
  }

  tableLayout.push(
    <tr className="table_bold text_header table_fill">
      <td className="table_bold_right table_fill">Всего</td>
      <td>{arr[0].sum.pastYearTotalDurations}</td>
      <td className="table_bold_right table_fill">
        {arr[1].sum.currentYearTotalDurations}
      </td>
      {cellComparingPercents(
        arr[0].sum.pastYearTotalDurations,
        arr[1].sum.currentYearTotalDurations,
      )}
    </tr>,
  );

  ////////////////////////////////////////////////////////////////////////////////////
  const getOneRowStationsReport = (place: string, index: number) => {
    const currentYearArr: any[] = stationsReport.find(
      (obj) => obj.year === currentYear,
    ).report;
    const currentYearPlace: any = currentYearArr.find(
      (objUnit) => objUnit.place === place,
    );

    const pastYearArr: any[] = stationsReport.find(
      (obj) => obj.year === pastYear,
    ).report;
    const pastYearPlace: any = pastYearArr.find(
      (objUnit) => objUnit.place === place,
    );

    let pastYearPlaceTotalDuration = pastYearPlace
      ? pastYearPlace.totalDuration
      : "";
    let currentYearPlaceTotalDuration = currentYearPlace
      ? currentYearPlace.totalDuration
      : "";

    return {
      layout: (
        <tr key={index}>
          <td className="table_bold_right">{place}</td>
          <td>{pastYearPlaceTotalDuration}</td>
          <td className="table_bold_right">{currentYearPlaceTotalDuration}</td>
          {cellComparingPercents(
            pastYearPlaceTotalDuration,
            currentYearPlaceTotalDuration,
          )}
          {isRightTableVisible &&
            dicUnitForTableStations.map((unit) => {
              const pastCell = (
                <td key={"past-" + unit}>
                  {pastYearPlace && pastYearPlace[unit]
                    ? cutDecimals(
                        pastYearPlace[unit].freightDuration +
                          pastYearPlace[unit].passDuration +
                          pastYearPlace[unit].subDuration +
                          pastYearPlace[unit].otherDuration,
                      )
                    : ""}
                </td>
              );
              const currentCell = (
                <td key={"cur" + unit}>
                  {currentYearPlace && currentYearPlace[unit]
                    ? cutDecimals(
                        currentYearPlace[unit].freightDuration +
                          currentYearPlace[unit].passDuration +
                          currentYearPlace[unit].subDuration +
                          currentYearPlace[unit].otherDuration,
                      )
                    : ""}
                </td>
              );
              return [pastCell, currentCell];
            })}
        </tr>
      ),
      pastYear: pastYearPlaceTotalDuration,
      currentYear: currentYearPlaceTotalDuration,
    };
  };

  const dictionaryStationsTableAsSet: Set<string> = new Set();
  stationsReport.forEach((el) => {
    el.report.forEach((el2: any) => {
      dictionaryStationsTableAsSet.add(el2.place);
    });
  });
  const dictionaryStationsTable: string[] = Array.from(
    dictionaryStationsTableAsSet,
  );

  const tableStationsLayout: any[] = dictionaryStationsTable.map(
    (el, index) => {
      const l = getOneRowStationsReport(el, index);
      return l.layout;
    },
  );

  //итоговая строка всей таблицы
  tableStationsLayout.push(
    <tr className="table_bold text_header table_fill">
      <td className="table_bold_right table_fill">Всего</td>
      <td>{cutDecimals(arr[0].sum.pastYearTotalDurations)}</td>
      <td className="table_bold_right table_fill">
        {cutDecimals(arr[1].sum.currentYearTotalDurations)}
      </td>
      {cellComparingPercents(
        arr[0].sum.pastYearTotalDurations,
        arr[1].sum.currentYearTotalDurations,
      )}

      {/* итоговая строка правой части таблицы*/}
      {isRightTableVisible &&
        dicUnitForTableStations.map((unit) => {
          const pastCell = (
            <td key={"past-" + unit}>
              {cutDecimals(sumValuesByKey(stationsReport[0].report, unit))}
            </td>
          );

          const currentCell = (
            <td key={"cur-" + unit}>
              {cutDecimals(sumValuesByKey(stationsReport[1].report, unit))}
            </td>
          );

          return [pastCell, currentCell];
        })}
    </tr>,
  );

  ///////////////////////////////////////////////////////
  return (
    <>
      <div className="text_container">
        <p className="text_paragraph">
          За рассматриваемый период допущено{" "}
          {getNumberWithWord(arr[1].sum.currentYearTotalFails, varFails)} (далее
          – ТН), за аналогичный период прошлого года было допущено{" "}
          {arr[0].sum.pastYearTotalFails} ТН,{" "}
          {getComparisonText(
            arr[1].sum.currentYearTotalFails,
            arr[0].sum.pastYearTotalFails,
          )}
          . {getWordOnly(arr[1].sum.currentYearTotalDelays, varDelay, true)}{" "}
          {getNumberWithWord(arr[1].sum.currentYearTotalDelays, varTrains)}, за
          аналогичный период прошлого года{" "}
          {getWordOnly(arr[0].sum.pastYearTotalDelays, varDelay)}{" "}
          {getNumberWithWord(arr[0].sum.pastYearTotalDelays, varTrains)},{" "}
          {getComparisonText(
            arr[1].sum.currentYearTotalDelays,
            arr[0].sum.pastYearTotalDelays,
          )}
          . Общая продолжительность задержек поездов составила{" "}
          {arr[1].sum.currentYearTotalDurations} ч, за аналогичный период
          прошлого года продолжительность задержек составила{" "}
          {arr[0].sum.pastYearTotalDurations} ч,{" "}
          {getComparisonText(
            arr[1].sum.currentYearTotalDurations,
            arr[0].sum.pastYearTotalDurations,
          )}
          .
        </p>

        {arr[1].sum.currentYearTotalTechnical +
          arr[1].sum.currentYearTotalTechnological +
          arr[1].sum.currentYearTotalSpecial +
          arr[1].sum.currentYearTotalExternal >
          0 && (
          <>
            <p className="text_paragraph">
              Определен тип у{" "}
              {arr[1].sum.currentYearTotalTechnical +
                arr[1].sum.currentYearTotalTechnological +
                arr[1].sum.currentYearTotalSpecial +
                arr[1].sum.currentYearTotalExternal}{" "}
              ТН, из них:
            </p>

            <p className="text_paragraph">
              технического характера – {arr[1].sum.currentYearTotalTechnical} (в{" "}
              {pastYear} г. – {arr[0].sum.pastYearTotalTechnical}),{" "}
              {getComparisonText(
                arr[1].sum.currentYearTotalTechnical,
                arr[0].sum.pastYearTotalTechnical,
              )}
              ;
            </p>

            <p className="text_paragraph">
              технологического характера –{" "}
              {arr[1].sum.currentYearTotalTechnological} (в {pastYear} г. –{" "}
              {arr[0].sum.pastYearTotalTechnological}),{" "}
              {getComparisonText(
                arr[1].sum.currentYearTotalTechnological,
                arr[0].sum.pastYearTotalTechnological,
              )}
              ;
            </p>

            <p className="text_paragraph">
              особая технологическая необходимость –{" "}
              {arr[1].sum.currentYearTotalSpecial} (в {pastYear} г. –{" "}
              {arr[0].sum.pastYearTotalSpecial}),{" "}
              {getComparisonText(
                arr[1].sum.currentYearTotalSpecial,
                arr[0].sum.pastYearTotalSpecial,
              )}
              ;
            </p>

            <p className="text_paragraph">
              внешние – {arr[1].sum.currentYearTotalExternal} (в {pastYear} г. –{" "}
              {arr[0].sum.pastYearTotalExternal}),{" "}
              {getComparisonText(
                arr[1].sum.currentYearTotalExternal,
                arr[0].sum.pastYearTotalExternal,
              )}
              ;
            </p>
          </>
        )}

        <p className="text_paragraph">
<<<<<<< Updated upstream
<<<<<<< Updated upstream
          технического характера – {arr[1].sum.currentYearTotalTechnical} (в{" "}
          {pastYear} г. – {arr[0].sum.pastYearTotalTechnical}),{" "}
          {getComparisonText(
            arr[1].sum.currentYearTotalTechnical,
            arr[0].sum.pastYearTotalTechnical,
          )}
          ;
        </p>

        <p className="text_paragraph">
          технологического характера –{" "}
          {arr[1].sum.currentYearTotalTechnological} (в {pastYear} г. –{" "}
          {arr[0].sum.pastYearTotalTechnological}),{" "}
          {getComparisonText(
            arr[1].sum.currentYearTotalTechnological,
            arr[0].sum.pastYearTotalTechnological,
          )}
          ;
        </p>

        <p className="text_paragraph">
          особая технологическая необходимость –{" "}
          {arr[1].sum.currentYearTotalSpecial} (в {pastYear} г. –{" "}
          {arr[0].sum.pastYearTotalSpecial}),{" "}
          {getComparisonText(
            arr[1].sum.currentYearTotalSpecial,
            arr[0].sum.pastYearTotalSpecial,
          )}
          ;
        </p>

        <p className="text_paragraph">
          внешние – {arr[1].sum.currentYearTotalExternal} (в {pastYear} г. –{" "}
          {arr[0].sum.pastYearTotalExternal}),{" "}
          {getComparisonText(
            arr[1].sum.currentYearTotalExternal,
            arr[0].sum.pastYearTotalExternal,
          )}
          ;
=======
=======
>>>>>>> Stashed changes
          Технологические нарушения, повлекшие за собой наибольшее количество
          потерь:
          {topCases.slice(0, 5).map((el: any, index: any) => {
            return (
              <p key={index}>
                {index + 1}
                {")"} ТН №{el[ID]},{" "}
                {new Date(el[startTime]).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}{" "}
                г. , станция/перегон: {el[place]}, задержано поездов:{" "}
                {el[allDelayed]} на {el[allDuration]} ч, причина:{" "}
                {el[failReason].toLowerCase()} отнесено за {el[guiltyUnit]};
              </p>
            );
          })}
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
        </p>

        <p className="text_paragraph">
          ТН по ответственности подразделений: {text.concat("")}
        </p>
        <p style={{ lineHeight: "30px" }}>&nbsp;&nbsp;</p>

        <table className="table_bold">
          <tr className="table_bold text_header">
            <td rowSpan={2} className="table_bold ">
              Подразделение
            </td>
            <th colSpan={2}>
              Поездо-часы <br />
              задержек
            </th>
            <th rowSpan={2} className="table_bold ">
              +/- % (ч) к<br />
              прошлому <br />
              году
            </th>
            <th colSpan={2}>
              По отношению к общему
              <br />
              количеству поездо-часов, %
            </th>
          </tr>
          <tr className="table_bold text_header">
            <td>{pastYear}</td>
            <td>{currentYear}</td>
            <td>{pastYear}</td>
            <td>{currentYear}</td>
          </tr>

          {tableLayout}
        </table>

        <div>
          <h2
            style={{
              lineHeight: "50px",
              textAlign: "center",
              marginTop: "15px",
            }}
          >
            Распределение технологических нарушений по железнодорожным станциям
            <button onClick={toggleRightTable} className="table_right_button">
              {!isRightTableVisible
                ? " (консолидированное представление)"
                : " (c распределением по подразделениям)"}
            </button>
          </h2>
        </div>
      </div>
      <div className="stations_container">
        <table className="table_bold table_stations" id="stations_container">
          <thead>
            <tr className="table_bold text_header">
              <td rowSpan={2} className="table_bold ">
                Станция
              </td>
              <th colSpan={2}>
                Поездо-часы <br />
                задержек
              </th>
              <th rowSpan={2} className="table_bold ">
                +/- % (ч) к <br />
                прошлому <br />
                году
              </th>
              {isRightTableVisible &&
                dicUnitForTableStations.map((unit) => {
                  return (
                    <th
                      rowSpan={2}
                      colSpan={2}
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        height: "130px", // Фиксированная высота ячейки
                        whiteSpace: "normal",
                        fontSize: "12px",
                      }}
                    >
                      {unit}
                    </th>
                  );
                })}
            </tr>
            <tr className="table_bold text_header">
              <td>{pastYear}</td>
              <td>{currentYear}</td>
            </tr>
          </thead>
          {tableStationsLayout}
        </table>
      </div>
    </>
  );
};

export default TextReportTemplatePeriod;
