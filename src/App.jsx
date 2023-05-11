import React from "react";
import "./App.css";
import BarChart2Bars from "./components/BarChart2Bars";
import BarGroupedLine from "./components/BarGroupedLine";
import failsArray, { yMax } from "./components/sourceFailsArray";
import delaysArray, { yMaxDelays } from "./components/sourceDelaysArray";
import durationsArray, {
  yMaxDurations,
} from "./components/sourceDurationArray";
import {
  sourceGuiltyArray,
  yMaxGroups,
  paretoArrayResult,
  maxYear,
} from "./components/sourceGuiltyArray";
import {
  paretoArrayResultReasons,
  yMaxReasons,
  maxYearReasons,
} from "./components/sourceReasonsArray";
import Navbar from "./components/Navbar";
// console.log(paretoArrayResultReasons);
// import MixedChart from "./components/MixedChart";

// import MyGraph from "./components/MyGraph";
// import LineChart from "./components/MyGraph2";
// import MyGraph3 from "./components/MyGraph3";
// import MyGraph4 from "./components/MyGraph4";

import { periodValue } from "../src/components/Controls";
console.log("importedperiodValue", periodValue);
// import Drawer from "./components/Drawer";
//console.log(paretoArrayResult);
function App() {
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
        stats={failsArray[paramsFailsSection.ids.indexOf(item)]}
        config={item}
        width={paramsFailsSection.width}
        yMax={yMax}
        key={item}
        period={periodValue}
      />
    );
  });

  //section of charts with delays counting
  let chartDelaysWidth = window.screen.width / 4 / 2 - 10;
  const paramsDelaysSection = {
    ids: [7, 8, 9, 10], //this prop need to create unique #id svg elements
    width: chartDelaysWidth,
  };
  let layoutDelays = [];
  paramsDelaysSection.ids.forEach((item) => {
    layoutDelays.push(
      <BarChart2Bars
        stats={delaysArray[paramsDelaysSection.ids.indexOf(item)]}
        config={item}
        width={paramsDelaysSection.width}
        yMax={yMaxDelays}
        key={item}
        maxYear={maxYear}
        period={periodValue}
      />
    );
  });

  //section of charts with durations counting
  const paramsDurationsSection = {
    ids: [11, 12, 13, 14], //this prop need to create unique #id svg elements
    width: window.screen.width / 4 / 2 - 5,
  };
  let layoutDurations = [];
  paramsDurationsSection.ids.forEach((item) => {
    layoutDurations.push(
      <BarChart2Bars
        stats={durationsArray[paramsDurationsSection.ids.indexOf(item)]}
        config={item}
        width={paramsDurationsSection.width}
        yMax={yMaxDurations}
        key={item}
        period={periodValue}
      />
    );
  });

  //section of bargrouped chart
  const paramsGroupedSection = {
    id: 15, //this prop need to create unique #id svg elements
    width: window.screen.width - 5,
  };

  //section of bargrouped chart
  const paramsReasonsSection = {
    id: 16, //this prop need to create unique #id svg elements
    width: window.screen.width - 5,
  };

  return (
    <div className="App">
      <Navbar />

      {/* <Drawer /> */}
      {/* <SelectAutoWidth /> */}
      <div className="horizontalSection">{layoutFails}</div>
      <div className="horizontalSection horizontalSection_group">
        <div className="horizontalSection">{layoutDelays}</div>
        <div className="horizontalSection">{layoutDurations}</div>
      </div>

      <BarGroupedLine
        className="groupedChart"
        stats={paretoArrayResult}
        width={paramsGroupedSection.width}
        id={paramsGroupedSection.id}
        key={paramsGroupedSection.id}
        yMax={yMaxGroups}
        maxYear={maxYear}
        period={periodValue}
      />
      <BarGroupedLine
        className="groupedChart"
        stats={paretoArrayResultReasons}
        width={paramsReasonsSection.width}
        id={paramsReasonsSection.id}
        key={paramsReasonsSection.id}
        yMax={yMaxReasons}
        maxYear={maxYearReasons}
        period={periodValue}
      />
    </div>
  );
}

export default App;
