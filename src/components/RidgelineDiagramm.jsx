import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3";
// import { cutDecimals } from "../config/config";

const RidgelineDiagram = () => {
  const svgRef7 = useRef();
  let resData = useSelector((state) => state.filters.ridgelineArrState);
  let checkList = useSelector((state) => state.filters.ridgelineChecklist);

  d3.select("#id23").selectAll("g").remove();

  useEffect(() => {
    // set the dimensions and margins of the graph
    const margin = { top: 100, right: 40, bottom: 30, left: 50 },
      width = 1920 - margin.left - margin.right,
      height = 900 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3
      .select("#id23")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    // .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // svg.append("g");

    // Prepare the series:
    const dates = Array.from(d3.group(resData.arr, (d) => +d.date).keys()).sort(
      d3.ascending
    );
    const series = d3
      .groups(resData.arr, (d) => d.name)
      .map(([name, values]) => {
        const value = new Map(values.map((d) => [+d.date, d.value]));
        return { name, values: dates.map((d) => value.get(d)) };
      });

    // Specify the chart’s dimensions.
    const overlap = 3;
    //   const width = 928;
    //   const height = series.length * 17;
    //   const marginTop = 40;
    //   const marginRight = 20;
    //   const marginBottom = 30;
    //   const marginLeft = 120;

    // Create the scales.
    const x = d3
      .scaleTime()
      .domain(d3.extent(dates))
      .range([margin.left + 185, width - margin.right]);

    const y = d3
      .scalePoint()
      .domain(series.map((d) => d.name))
      .range([margin.top, height - margin.bottom]);

    const z = d3
      // .scaleLinear()
      .scalePow()
      .exponent(0.6)
      .domain([0, d3.max(series, (d) => d3.max(d.values))])
      // .domain([0, resData.yMax])
      .nice()
      .range([0, -overlap * y.step()]);

    // Create the area generator and its top-line generator.
    const area = d3
      .area()
      // .curve(d3.curveBasis)
      // .curve(d3.curveBumpX)
      .curve(d3.curveStep)
      .defined((d) => !isNaN(d))
      .x((d, i) => x(dates[i]))
      .y0(0)
      .y1((d) => z(d));

    const line = area.lineY1();

    // Create the SVG container.
    //   const svg = d3.create("svg")
    //       .attr("width", width)
    //       .attr("height", height)
    //       .attr("viewBox", [0, 0, width, height])
    //       .attr("style", "max-width: 100%; height: auto;");

    // Append the axes.
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(width / 80)
          .tickSizeOuter(0)
      );

    svg
      .append("g")
      .attr("transform", `translate(${margin.left + 175},0)`)
      .call(d3.axisLeft(y).tickSize(0).tickPadding(4))
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
