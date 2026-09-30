import React, { useRef } from "react";
import { useDispatch, useSelector as useReduxSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../redux/store";
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
import InteractiveMap from "./InteractiveMap";
import BarChartRaceDiagram from "./BarChartRace";

const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

const SwiperAny = Swiper as React.ComponentType<any>;

const SLIDE_STORAGE_KEY = "rzd-active-slide";
const SLIDE_COUNT = 11;

function readSavedSlideIndex() {
  try {
    const index = Number(window.localStorage.getItem(SLIDE_STORAGE_KEY));
    if (!Number.isInteger(index) || index < 0 || index >= SLIDE_COUNT) {
      return 0;
    }
    return index;
  } catch {
    return 0;
  }
}

function rememberSlide(index: number) {
  try {
    window.localStorage.setItem(SLIDE_STORAGE_KEY, String(index));
  } catch {
    // Private mode or a full storage quota should not block the slider.
  }
}

function paletteForSlide(index: number) {
  if (index === 0) return "analyze";
  if (index >= 1 && index <= 3) return "groupedChart";
  if (index === 4) return "stacked";
  if (index === 5) return "sankey";
  if (index === 6) return "ridgeline";
  if (index === 7) return "report";
  if (index === 8) return "sumline";
  if (index === 9) return "map";
  if (index === 10) return "race";
  return "analyze";
}

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
  const initialSlide = useRef(readSavedSlideIndex()).current;

  let areaWidth = window.innerWidth;
  let areaHeight = window.innerHeight;

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
      <SwiperAny
        modules={[Navigation, Pagination, Scrollbar, A11y, Keyboard]}
        spaceBetween={50}
        navigation
        // pagination={{ clickable: true }}
        // scrollbar={{ draggable: true }}
        // spaceBetween={50}
        slidesPerView={1}
        keyboard
        initialSlide={initialSlide}
        onSlideChange={(swiper: any) => {
          const activeSlideIndex = swiper.activeIndex;
          rememberSlide(activeSlideIndex);
          dispatch(setToolPalette(paletteForSlide(activeSlideIndex)));
        }}
        onSwiper={(swiper: any) => {
          if (swiper.activeIndex !== initialSlide) {
            swiper.slideTo(initialSlide, 0);
          }
          dispatch(setToolPalette(paletteForSlide(initialSlide)));
        }}
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

        <SwiperSlide>
          {({ isActive }) =>
            isActive && (
              <>
                <div
                  className="slide"
                  style={{
                    /* .main margin-top: 90px — полная innerHeight даёт вынос за низ вьюпорта */
                    height: Math.max(120, areaHeight - 90),
                  }}
                >
                  <h2 className="section-title">
                    Распределение по территориальному признаку (за период{" "}
                    {timeFormat(dateStart)}-{timeFormatY(dateEnd)} г.)
                  </h2>
                  <InteractiveMap />
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
                    Динамика задержек поездов по виновным подразделениям (за
                    период {timeFormat(dateStart)}-{timeFormatY(dateEnd)} г.)
                  </h2>
                  <div id="selectedElementId" ref={downloadRef}>
                    <BarChartRaceDiagram />
                  </div>
                </div>
              </>
            )
          }
        </SwiperSlide>
      </SwiperAny>
    </div>
  );
}

export default Main;
