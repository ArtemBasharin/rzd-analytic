import React from "react";
// import * as htmlToImage from "html-to-image";
// import { toPng, toJpeg, toBlob, toPixelData, toSvg } from "html-to-image";
// import download from "downloadjs";
import { useSelector } from "react-redux";
import * as d3 from "d3";
import BarChart2Bars from "./BarChart2Bars";

function AnalyzeSection() {
  // console.time("AnalyzeSection");
  const maxYear = useSelector((state) => state.filters.currentYear);
  const srcArr = useSelector((state) => state.filters.analyzeState);
  d3.selectAll(".chartItem").selectAll("g").remove();
  d3.selectAll(".chartItem").selectAll("text").remove();

  // d3.selectAll("compareTitle").remove();
  // d3.selectAll("compareArrow").remove();

  // const originArr = useSelector((state) => state.filters.stackedArrState);
  // const checkedUnits = useSelector((state) => state.filters.stackedCheckList);
  //   const showLoader = useSelector((state) => state.filters.loaderShow);
  const areaWidth = window.innerWidth;
  const areaHeight = window.innerHeight;

  //section of charts with fails counting
  let chartFailsWidth = areaWidth / 7 - 30;
  let chartsHeight = (areaHeight - 500) / 2;

  const paramsFailsSection = {
    ids: [0, 1, 2, 3, 4, 5, 6], //this prop need to create unique #id svg elements
    width: chartFailsWidth,
  };

  let layoutFails = [];
  paramsFailsSection.ids.forEach((item) => {
    layoutFails.push(
      <BarChart2Bars
        stats={srcArr.failsArray[paramsFailsSection.ids.indexOf(item)]}
        config={item}
        width={paramsFailsSection.width}
        height={chartsHeight}
        yMax={srcArr.failsYmax}
        key={item}
      />
    );
  });

  //section of charts with delays counting
  let chartDelaysWidth = areaWidth / 4 / 2 - 30;
  const paramsDelaysSection = {
    ids: [7, 8, 9, 10], //this prop need to create unique #id svg elements
    width: chartDelaysWidth,
  };
  let layoutDelays = [];
  paramsDelaysSection.ids.forEach((item) => {
    layoutDelays.push(
      <BarChart2Bars
        stats={srcArr.delaysArray[paramsDelaysSection.ids.indexOf(item)]}
        config={item}
        width={paramsDelaysSection.width}
        height={chartsHeight}
        yMax={srcArr.delaysYmax}
        key={item}
        maxYear={maxYear}
      />
    );
  });

  //section of charts with durations counting
  const paramsDurationsSection = {
    ids: [11, 12, 13, 14], //this prop need to create unique #id svg elements
    width: chartDelaysWidth,
  };
  let layoutDurations = [];
  paramsDurationsSection.ids.forEach((item) => {
    layoutDurations.push(
      <BarChart2Bars
        stats={srcArr.durationsArray[paramsDurationsSection.ids.indexOf(item)]}
        config={item}
        width={paramsDurationsSection.width}
        height={chartsHeight}
        yMax={srcArr.durationsYmax}
        key={item}
      />
    );
  });

  // console.timeEnd("AnalyzeSection");

  return (
    <div>
      <div>
        <h2 className="section-title">
          Технологические нарушения по виду и характеру
        </h2>
        <div className="horizontalSection">{layoutFails}</div>
        <div className="horizontalSection horizontalSection_group">
          <div>
            <h2 className="section-title">Задержано поездов</h2>
            <div className="horizontalSection">{layoutDelays}</div>
          </div>
          <div>
            <h2 className="section-title">
              Продолжительность задержек поездов, ч
            </h2>
            <div className="horizontalSection">{layoutDurations}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyzeSection;
