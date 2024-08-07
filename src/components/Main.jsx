import React, { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Swiper, SwiperSlide } from "swiper/react";
import * as d3 from "d3";
import {
  Navigation,
  Pagination,
  Scrollbar,
  A11y,
  Keyboard,
} from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";
import BarGroupedLine from "./BarGroupedLine";
import StackedAreaDiagram from "./StackedAreaDiagram";
import SankeyDiagram from "./SankeyDiagram";
import { setToolPalette } from "../redux/filtersSlice";
import { Loader } from "./Loader";
import AnalyzeSection from "./AnalyzeSection";
import RidgelineDiagram from "./RidgelineDiagramm";
import DownloadButtons from "./ToolDownloadButtons";
import TextReportTemplatePeriod from "./TextReport";
import SumLineDiagram from "./SumLineDiagram";
// import BarChartRaceDiagram from "./BarChartRace";

function Main() {
  // console.time("Main");
  const downloadRef = useRef(null);
  const maxYear = useSelector((state) => state.filters.currentYear);
  const srcArr = useSelector((state) => state.filters.analyzeState);
  // const originArr = useSelector((state) => state.filters.stackedArrState);
  const minValue = useSelector((state) => state.filters.minValue);
  // const checkedUnits = useSelector((state) => state.filters.stackedCheckList);
  const showLoader = useSelector((state) => state.filters.loaderShow);
  const dateStart = useSelector((state) => state.filters.dateStart);
  const dateEnd = useSelector((state) => state.filters.dateEnd);
  const dispatch = useDispatch();

  let areaWidth = window.innerWidth;
  let areaHeight = window.innerHeight;
  // console.log("areaHeight", areaHeight);

  const paramsGroupedSection = {
    id: 15, //this prop need to create unique #id svg elements
    width: areaWidth,
  };

  const paramsGroupedSectionDurations = {
    id: 17, //this prop need to create unique #id svg elements
    width: areaWidth,
  };

  const paramsReasonsSection = {
    id: 16, //this prop need to create unique #id svg elements
    width: areaWidth,
  };
  // console.timeEnd("Main");

  const timeFormatY = d3.timeFormat("%0d.%0m.%Y");
  const timeFormat = d3.timeFormat("%0d.%0m");

  return (
    <div className="main">
      <DownloadButtons reference={downloadRef} />
      <Swiper
        modules={[Navigation, Pagination, Scrollbar, A11y, Keyboard]}
        spaceBetween={50}
        navigation
        // pagination={{ clickable: true }}
        // scrollbar={{ draggable: true }}
        // spaceBetween={50}
        slidesPerView={1}
        keyboard
        onSlideChange={(swiper) => {
          let activeSlideIndex = swiper.activeIndex;
          if (activeSlideIndex === 0) dispatch(setToolPalette("analyze"));
          if (activeSlideIndex >= 1 && activeSlideIndex <= 3)
            dispatch(setToolPalette("groupedChart"));
          if (activeSlideIndex === 4) dispatch(setToolPalette("stacked"));
          if (activeSlideIndex === 5) dispatch(setToolPalette("sankey"));
          if (activeSlideIndex === 6) dispatch(setToolPalette("ridgeline"));
          if (activeSlideIndex === 7) dispatch(setToolPalette("report"));
          if (activeSlideIndex === 8) dispatch(setToolPalette("sumline"));
        }}
        onSwiper={(swiper) => {}}
      >
        <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <div id="selectedElementId" ref={downloadRef}>
                <AnalyzeSection />
              </div>
            )
          }
        </SwiperSlide>

        <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <>
                <h2 className="section-title">
                  Сравнительный анализ количества допущенных технологических
                  нарушений по виновным подразделениям
                </h2>
                <div id="selectedElementId" ref={downloadRef}>
                  <BarGroupedLine
                    className="groupedChart"
                    stats={srcArr.guiltsArray}
                    width={paramsGroupedSection.width}
                    id={paramsGroupedSection.id}
                    key={paramsGroupedSection.id}
                    yMax={srcArr.guiltsYmax}
                    maxYear={maxYear}
                    minValue={minValue}
                    yName="Количество нарушений"
                  />
                </div>
              </>
            )
          }
        </SwiperSlide>

        <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <>
                <h2 className="section-title">
                  Сравнительный анализ задержек поездов от технологических
                  нарушений по виновным подразделениям
                </h2>
                <div id="selectedElementId" ref={downloadRef}>
                  <BarGroupedLine
                    className="groupedChart"
                    stats={srcArr.guiltsDurationsArray}
                    width={paramsGroupedSectionDurations.width}
                    id={paramsGroupedSectionDurations.id}
                    key={paramsGroupedSectionDurations.id}
                    yMax={srcArr.guiltsDurationsYmax}
                    maxYear={maxYear}
                    minValue={minValue}
                    yName="Задержки поездов, ч"
                  />
                </div>
              </>
            )
          }
        </SwiperSlide>

        <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <>
                <h2 className="section-title">
                  Сравнительный анализ по причинам допущенных технологических
                  нарушений
                </h2>
                <div id="selectedElementId" ref={downloadRef}>
                  <BarGroupedLine
                    className="groupedChart"
                    stats={srcArr.reasonsArray}
                    width={paramsReasonsSection.width}
                    id={paramsReasonsSection.id}
                    key={paramsReasonsSection.id}
                    yMax={srcArr.reasonsYmax}
                    maxYear={maxYear}
                    minValue={minValue}
                    yName="Количество нарушений"
                  />
                </div>
              </>
            )
          }
        </SwiperSlide>

        <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <>
                <div className="slide" style={{ height: areaHeight - 100 }}>
                  <h2 className="section-title">
                    Соотношение потерь по подразделениям (за период{" "}
                    {timeFormat(dateStart)}-{timeFormatY(dateEnd)} г.)
                  </h2>
                  {showLoader.stacked ? (
                    <Loader />
                  ) : (
                    <div id="selectedElementId" ref={downloadRef}>
                      <StackedAreaDiagram />
                    </div>
                  )}
                </div>
              </>
            )
          }
        </SwiperSlide>

        <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <>
                <div className="slide" style={{ height: areaHeight - 70 }}>
                  <h2 className="section-title">
                    Аналитика причастности подразделений к причинам нарушений{" "}
                    (за период {timeFormat(dateStart)}-{timeFormatY(dateEnd)}{" "}
                    г.)
                  </h2>
                  {showLoader.sankey ? (
                    <Loader />
                  ) : (
                    <div id="selectedElementId" ref={downloadRef}>
                      <SankeyDiagram />
                    </div>
                  )}
                </div>
              </>
            )
          }
        </SwiperSlide>

        <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <>
                <div className="slide" style={{ height: areaHeight }}>
                  <h2 className="section-title">
                    Соотношение потерь по подразделениям (за период{" "}
                    {timeFormat(dateStart)}-{timeFormatY(dateEnd)} г.)
                  </h2>
                  {showLoader.sankey ? (
                    <Loader />
                  ) : (
                    <div id="selectedElementId" ref={downloadRef}>
                      <RidgelineDiagram />
                    </div>
                  )}
                </div>
              </>
            )
          }
        </SwiperSlide>

        <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <>
                <div className="slide" style={{ height: areaHeight }}>
                  <h2 className="section-title">
                    Аналитика причастности подразделений к причинам нарушений{" "}
                    (за период {timeFormat(dateStart)}-{timeFormatY(dateEnd)}{" "}
                    г.)
                  </h2>
                  {showLoader.sankey ? (
                    <Loader />
                  ) : (
                    <div id="text_report" ref={downloadRef}>
                      <TextReportTemplatePeriod />
                    </div>
                  )}
                </div>
              </>
            )
          }
        </SwiperSlide>

        {/* <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <>
                <div className="slide" style={{ height: areaHeight }}>
                 
                  {showLoader.sankey ? (
                    <Loader />
                  ) : (
                    <div id="text_report">
                      <BarChartRaceDiagram />
                    </div>
                  )}
                </div>
              </>
            )
          }
        </SwiperSlide> */}

        <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <>
                <div className="slide" style={{ height: areaHeight }}>
                  <h2 className="section-title">
                    Сводная аналитика (за период {timeFormat(dateStart)}-
                    {timeFormatY(dateEnd)} г.)
                  </h2>
                  {showLoader.sumline ? (
                    <Loader />
                  ) : (
                    <div id="selectedElementId" ref={downloadRef}>
                      <SumLineDiagram />
                    </div>
                  )}
                </div>
              </>
            )
          }
        </SwiperSlide>
      </Swiper>
    </div>
  );
}

export default Main;
