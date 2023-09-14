import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Scrollbar, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";
import { useSelector } from "react-redux";
import * as d3 from "d3";
import BarChart2Bars from "./BarChart2Bars";
import BarGroupedLine from "./BarGroupedLine";
import StackedAreaDiagram from "./StackedAreaDiagram";
import SankeyDiagram from "./SankeyDiagram";

function Main() {
  //clear old svg
  d3.selectAll("g").remove();

  let maxYear = useSelector((state) => state.filters.currentYear);
  let srcArr = useSelector((state) => state.filters.analyzeState);
  let originArr = useSelector((state) => state.filters.stackedArrState);
  let minValue = useSelector((state) => state.filters.minValue);
  let sankeyArr = useSelector((state) => state.filters.sankeyArrState);
  let areaWidth = window.innerWidth;
  //section of charts with fails counting
  let chartFailsWidth = 1920 / 7 - 20;
  if (areaWidth < 1920) chartFailsWidth = areaWidth / 7 - 30;

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
  let chartDelaysWidth = 1920 / 4 / 2 - 30;
  if (areaWidth < 1920) chartDelaysWidth = areaWidth / 4 / 2 - 30;
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
    width: chartDelaysWidth,
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
    width: areaWidth,
  };

  //section of bargrouped chart
  const paramsGroupedSectionDurations = {
    id: 17, //this prop need to create unique #id svg elements
    width: areaWidth,
  };
  // let ID = "id" + paramsGroupedSection.id;

  //section of bargrouped chart
  const paramsReasonsSection = {
    id: 16, //this prop need to create unique #id svg elements
    width: areaWidth,
  };

  return (
    <div className="main">
      <Swiper
        modules={[Navigation, Pagination, Scrollbar, A11y]}
        spaceBetween={50}
        navigation
        // pagination={{ clickable: true }}
        // scrollbar={{ draggable: true }}
        // spaceBetween={50}
        slidesPerView={1}
        // onSlideChange={() => console.log("slide change")}
        // onSwiper={(swiper) => console.log(swiper)}
      >
        <SwiperSlide>
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
        </SwiperSlide>
        <SwiperSlide>
          <h2 className="section-title">
            Сравнительный анализ количества допущенных технологических нарушений
            по виновным подразделениям
          </h2>
          <BarGroupedLine
            className="groupedChart"
            stats={srcArr.guiltsArray}
            width={paramsGroupedSection.width}
            id={paramsGroupedSection.id}
            key={paramsGroupedSection.id}
            yMax={srcArr.guiltsYmax}
            maxYear={maxYear}
            minValue={minValue}
          />
        </SwiperSlide>
        <SwiperSlide>
          <h2 className="section-title">
            Сравнительный анализ задержек поездов от технологических нарушений
            по виновным подразделениям
          </h2>
          <BarGroupedLine
            className="groupedChart"
            stats={srcArr.guiltsDurationsArray}
            width={paramsGroupedSectionDurations.width}
            id={paramsGroupedSectionDurations.id}
            key={paramsGroupedSectionDurations.id}
            yMax={srcArr.guiltsDurationsYmax}
            maxYear={maxYear}
            minValue={minValue}
          />
        </SwiperSlide>
        <SwiperSlide>
          <h2 className="section-title">
            Сравнительный анализ по причинам допущенных технологических
            нарушений
          </h2>
          <BarGroupedLine
            className="groupedChart"
            stats={srcArr.reasonsArray}
            width={paramsReasonsSection.width}
            id={paramsReasonsSection.id}
            key={paramsReasonsSection.id}
            yMax={srcArr.reasonsYmax}
            maxYear={maxYear}
            minValue={minValue}
          />
        </SwiperSlide>

        <SwiperSlide>
          <h2 className="section-title">
            Соотношение потерь по подразделениям за период
          </h2>
          <StackedAreaDiagram
            src={originArr.unitedDatesResult}
            yMax={originArr.yMax}
          />
        </SwiperSlide>
        <SwiperSlide>
          <h2 className="section-title">
            Аналитика причастности подразделений к причинам нарушений
          </h2>
          <SankeyDiagram src={sankeyArr} />
        </SwiperSlide>
      </Swiper>
    </div>
  );
}

export default Main;
