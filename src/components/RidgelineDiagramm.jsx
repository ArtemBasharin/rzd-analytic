import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3";
import { convertUnixToDate, cutDecimals } from "../config/functions";

const RidgelineDiagram = () => {
  const svgRef7 = useRef();
  let resData = useSelector((state) => state.filters.ridgelineArrState);
  let checkList = useSelector((state) => state.filters.ridgelineCheckList);
  // console.log("checkList", checkList);

  d3.select("#id23").selectAll("g").remove();

  useEffect(() => {
    // set the dimensions and margins of the graph
    const margin = { top: 105, right: 30, bottom: 50, left: 50 },
      width = window.innerWidth - margin.left - margin.right,
      height = window.innerHeight - 20 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3
      .select("#id23")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    // .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // svg.append("g");

    // Prepare the series:
    const dates = Array.from(
      d3.group(resData.arr, (d) => +new Date(d.date.toString())).keys()
    ).sort(d3.ascending);
    // console.log("dates", dates.map((el) => new Date(el)));

    const series = d3
      .groups(resData.arr, (d) => d.name)
      .map(([name, values]) => {
        const value = new Map(values.map((d) => [+d.date, d.value]));
        return {
          name,
          values: dates.map(function (d) {
            if (value.get(d)) {
              return value.get(d);
            } else {
              return 0;
            }
          }),
        };
      });
    // console.log("series", series);

    // const daysOfWeekRU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    // const monthsRU = [
    //   "Январь",
    //   "Февраль",
    //   "Март",
    //   "Апрель",
    //   "Май",
    //   "Июнь",
    //   "Июль",
    //   "Август",
    //   "Сентябрь",
    //   "Октябрь",
    //   "Ноябрь",
    //   "Декабрь",
    // ];

    // const formatDate = d3.timeFormat("%d %b %Y"); // Форматирование даты в формате "день месяца год"
    // const formatDayOfWeek = (d) => daysOfWeekRU[d.getDay()];
    // const formatMonth = (d) => monthsRU[d.getMonth()];

    const x = d3
      .scaleLinear()
      .domain(d3.extent(dates))
      .range([margin.left + 285, width + 25]);
    // .tickFormat(d3.timeFormat("%d %b %Y")) // Форматирование даты
    // .tickFormat((d) => daysOfWeekRU[d.getDay()]) // Форматирование дня недели
    // .tickFormat((d) => monthsRU[d.getMonth()]); // Форматирование месяца

    const y = d3
      .scalePoint()
      .domain(series.map((d) => d.name))
      .range([margin.top, height - margin.bottom])
      .align(1)
      .padding(0.2);

    const z = d3
      // .scaleLinear()
      .scalePow()
      .exponent(0.8)
      .domain([0, d3.max(series, (d) => d3.max(d.values)) * 1.1])
      // .domain([0, resData.yMax])
      .nice()
      // .range([0, -overlap * y.step()]);
      .range([0, (-1 * (height - margin.top - margin.bottom)) / series.length]);

    // Create the area generator and its top-line generator.
    const area = d3
      .area()
      // .curve(d3.curveBasis)
      .curve(d3.curveBumpX)
      // .curve(d3.curveStep)
      .defined((d) => !isNaN(d))
      .x((d, i) => x(dates[i]))
      .y0(0)
      .y1((d) => z(d));

    const line = area.lineY1();

    // Append the axes.
    // Calculating the step for displaying signatures
    const step = Math.ceil(dates.length / 30);

    // Create axis
    const xAxis = d3
      .axisBottom(x)
      .tickSize(0)
      .tickValues(dates.filter((_, i) => i % step === 0)) // Filter dates according to step
      .tickFormat(function (d) {
        return convertUnixToDate(d);
      });

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .attr("text-anchor", "end")
      .attr("transform", "translate(-3,5)rotate(-30)");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left + 280},0)`)
      .call(d3.axisLeft(y).tickSize(0).tickPadding(4))
      .selectAll("text")
      .data(series)
      .join("text")
      .attr("font-family", "roboto")
      .attr("font-size", function (d) {
        return (12 - series.length / 15).toString();
      })
      .attr("font-weight", "600")
      .attr("text-anchor", "end")
      .text(function (d) {
        // console.log(d);
        if (d.name.length >= 36) {
          return d.name.substr(0, 36) + " ...";
        } else {
          return d.name;
        }
      })
      .append("tspan")
      .text((d) => ` (${cutDecimals(d3.sum(d.values))} ч)`)
      .call((g) => g.select(".domain").remove());

    // Append a layer for each series.
    const group = svg
      .append("g")
      .selectAll("g")
      .data(series)
      .join("g")
      .attr("transform", (d) => `translate(0,${y(d.name) + 1})`);

    group
      .append("path")
      .attr("fill", "#ddd")
      .attr("d", (d) => area(d.values));

    group
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("d", (d) => line(d.values));
  }, [resData, checkList]);

  return (
    <svg
      id={`id23`}
      className="chartItem stackedChart"
      ref={svgRef7}
      width={1920}
      height={1080}
    ></svg>
  );
};

export default RidgelineDiagram;
