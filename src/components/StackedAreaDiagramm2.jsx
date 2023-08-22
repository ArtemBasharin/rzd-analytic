import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
// import { guiltyUnit } from "../config/config";

const StackedAreaDiagram2 = (props) => {
  const svgRef5 = useRef();
  useEffect(() => {
    let resData = props.src;

    // set the dimensions and margins of the graph
    const margin = { top: 20, right: 30, bottom: 30, left: 55 },
      width = 1800 - margin.left - margin.right,
      height = 710 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3
      .select("#id21")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Parse the Data
    // d3.csv("https://raw.githubusercontent.com/holtzy/data_to_viz/master/Example_dataset/5_OneCatSevNumOrdered_wide.csv").then( function(data) {

    // List of groups = header of the csv files
    const keys = Object.keys(resData[0]).slice(1);
    console.log("keys2", keys);

    // Add X axis
    const x = d3
      .scaleLinear()
      .domain(
        d3.extent(resData, function (d) {
          //   console.log("xd", d.date);
          return d.date;
        })
      )
      .range([0, width]);
    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).ticks(20));

    // Add Y axis
    const y = d3.scalePow().exponent(0.2).domain([0, 100]).range([height, 0]);
    svg.append("g").call(d3.axisLeft(y));

    // color palette
    const color = d3
      .scaleOrdinal()
      .domain(keys)
      .range([
        "#e41a1c",
        "#377eb8",
        "#4daf4a",
        "#984ea3",
        "#ff7f00",
        "#ffff33",
        "#a65628",
        "#f781bf",
      ]);

    //stack the data?
    const stackedData = d3.stack().keys(keys)(resData);
    //console.log("This is the stack result: ", stackedData)

    // Show the areas
    svg
      .selectAll("mylayers")
      .data(stackedData)
      .join("path")
      .style("fill", function (d) {
        return color(d.key);
      })
      // .style("fill", function () {
      //   return "hsl(" + Math.random() * 360 + ",100%,50%)";
      // })
      .attr(
        "d",
        d3
          .area()
          .x(function (d, i) {
            return x(d.data.date);
          })
          .y0(function (d) {
            return y(d[0]);
          })
          .y1(function (d) {
            return y(d[1]);
          })
      );
  }, [props.src]);

  return (
    <svg
      id={`id21`}
      className="chartItem stackedChart"
      ref={svgRef5}
      width={1800}
      height={900}
    ></svg>
  );
};

export default StackedAreaDiagram2;
