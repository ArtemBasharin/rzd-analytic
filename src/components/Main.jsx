import React from "react";
import BarChart2Bars from "./BarChart2Bars";
import BarGroupedLine from "./BarGroupedLine";
import { store } from "../redux/store";
import { useSelector } from "react-redux";

function Main() {
  let maxYear = useSelector((state) => state.filters.currentYear);
  let srcArr = useSelector((state) => state.filters.analyzeState);
  console.log("main", srcArr);
  console.log(typeof store.getState().filters.analyzeState);

  //section of charts with fails counting
  let chartFailsWidth = window.screen.width / 7 - 10;
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
        yMax={srcArr.failsYmax}
        key={item}
      />
    );
  });

  //section of charts with delays counting
  let chartDelaysWidth = window.screen.width / 4 / 2 - 20;
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
        yMax={srcArr.delaysYmax}
        key={item}
        maxYear={maxYear}
      />
    );
  });

  //section of charts with durations counting
  const paramsDurationsSection = {
    ids: [11, 12, 13, 14], //this prop need to create unique #id svg elements
    width: window.screen.width / 4 / 2 - 20,
  };
  let layoutDurations = [];
  paramsDurationsSection.ids.forEach((item) => {
    layoutDurations.push(
      <BarChart2Bars
        stats={srcArr.durationsArray[paramsDurationsSection.ids.indexOf(item)]}
        config={item}
        width={paramsDurationsSection.width}
        yMax={srcArr.durationsYmax}
        key={item}
      />
    );
  });

  //section of bargrouped chart
  const paramsGroupedSection = {
    id: 15, //this prop need to create unique #id svg elements
    width: window.screen.width,
  };

  //section of bargrouped chart
  const paramsReasonsSection = {
    id: 16, //this prop need to create unique #id svg elements
    width: window.screen.width,
  };

  //section of bargrouped chart
  const paramsGroupedSectionDurations = {
    id: 17, //this prop need to create unique #id svg elements
    width: window.screen.width,
  };

  return (
    <div className="Main">
      <div className="horizontalSection">{layoutFails}</div>
      <div className="horizontalSection horizontalSection_group">
        <div className="horizontalSection">{layoutDelays}</div>
        <div className="horizontalSection">{layoutDurations}</div>
      </div>

      <BarGroupedLine
        className="groupedChart"
        stats={srcArr.guiltsArray}
        width={paramsGroupedSection.width}
        id={paramsGroupedSection.id}
        key={paramsGroupedSection.id}
        yMax={srcArr.guiltsYmax}
        maxYear={maxYear}
      />
      <BarGroupedLine
        className="groupedChart"
        stats={srcArr.guiltsDurationsArray}
        width={paramsGroupedSectionDurations.width}
        id={paramsGroupedSectionDurations.id}
        key={paramsGroupedSectionDurations.id}
        yMax={srcArr.guiltsDurationsYmax}
        maxYear={maxYear}
      />
      <BarGroupedLine
        className="groupedChart"
        stats={srcArr.reasonsArray}
        width={paramsReasonsSection.width}
        id={paramsReasonsSection.id}
        key={paramsReasonsSection.id}
        yMax={srcArr.reasonsYmax}
        maxYear={maxYear}
      />
    </div>
  );
}

export default Main;
