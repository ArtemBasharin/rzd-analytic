/* eslint-disable no-restricted-globals */
/* eslint-disable no-global-assign */
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
// import { guiltyUnit } from "../config/config";

const StackedAreaDiagram = (props) => {
  const svgRef4 = useRef();
  useEffect(() => {
    const margin = { top: 10, right: 30, bottom: 30, left: 60 },
      width = 460 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3
      .select("#id20")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Parse the Data
    d3.csv(
      "https://raw.githubusercontent.com/holtzy/data_to_viz/master/Example_dataset/5_OneCatSevNumOrdered_wide.csv"
    ).then(function (data) {
      // List of groups = header of the csv files
      const keys = data.columns.slice(1);

      // Add X axis
      const x = d3
        .scaleLinear()
        .domain(
          d3.extent(data, function (d) {
            return d.year;
          })
        )
        .range([0, width]);
      svg
        .append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(5));

      // Add Y axis
      const y = d3.scaleLinear().domain([0, 200000]).range([height, 0]);
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
      const stackedData = d3.stack().keys(keys)(data);
      //console.log("This is the stack result: ", stackedData)

      // Show the areas
      svg
        .selectAll("mylayers")
        .data(stackedData)
        .join("path")
        .style("fill", function (d) {
          return color(d.key);
        })
        .attr(
          "d",
          d3
            .area()
            .x(function (d, i) {
              return x(d.data.year);
            })
            .y0(function (d) {
              return y(d[0]);
            })
            .y1(function (d) {
              return y(d[1]);
            })
        );
    });
  }, []);

  return (
    <svg
      id={`id20`}
      className="chartItem stackedChart"
      ref={svgRef4}
      width={800}
      height={600}
    ></svg>
  );
};

export default StackedAreaDiagram;
