import React, { useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3";
import { convertUnixToDate } from "../utils/functions";

const StackedAreaDiagram = () => {
  const svgRef5 = useRef();
  const stackedArrState = useSelector((state) => state.filters.stackedArrState);
  const minValue = useSelector((state) => state.filters.minValue);
  const period = useSelector((state) => state.filters.regexpPattern);
  const checkList = useSelector((state) => state.filters.stackedCheckList);
  const dateStart = useSelector((state) => state.filters.dateStart);
  const dateEnd = useSelector((state) => state.filters.dateEnd);

  d3.select("#id21").selectAll("g").remove();

  useEffect(() => {
    let resData = stackedArrState.arr;
    // console.log("resData", resData);

    // set the dimensions and margins of the graph
    const margin = { top: 30, right: 170, bottom: 50, left: 100 },
      width = window.innerWidth - margin.left - margin.right,
      height = window.innerHeight - 180 - margin.top - margin.bottom;

    let datesArr = [];
    resData.forEach((el) => datesArr.push(el.date));

    // append the svg object to the body of the page
    const svg = d3
      .select("#id21")
      // .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    let keys = [];
    let colorArr = [];
    // console.log("keys", keys);

    // collect colors in right order from checklist checkboxes
    checkList.forEach((el) => {
      if (el.checked) {
        keys.push(el);
        colorArr.push(el.checkboxColor);
      }
    });

    // console.log("colorArr", colorArr);

    // Add X axis
    const x = d3
      .scaleLinear()
      .domain(
        d3.extent(resData, function (d) {
          return d.date;
        })
      )
      .range([0, width - 200]);
    // console.log(resData);

    // Append the axes.
    // Calculating the step for displaying signatures
    const step = Math.ceil(datesArr.length / 30);

    // Create axis
    const xAxis = d3
      .axisBottom(x)
      .tickSize(0)
      .tickValues(datesArr.filter((_, i) => i % step === 0)) // Filter dates according to step
      .tickFormat(function (d) {
        return convertUnixToDate(d);
      });

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("text-anchor", "end")
      .attr("transform", "translate(-3,5)rotate(-30)");
    // `translate(-3,5)rotate(${Math.atan(-1 * datesArr.length) * 30})`

    // Add Y axis
    const y = d3
      // .scalePow()
      // .exponent(0.5)
      .scaleLinear()
      .domain([0, stackedArrState.yMax])
      .range([height, 0]);
    svg.append("g").call(d3.axisLeft(y));

    //stack the data
    let arrFromKeys = keys.map((el) => {
      return el.guiltyUnit;
    });

    const color = d3.scaleOrdinal().domain(arrFromKeys).range(colorArr);
    const stackedData = d3.stack().keys(arrFromKeys)(resData);
    // console.log("stackedData", stackedData);

    // Show the areas
    svg
      .selectAll("mylayers")
      .data(stackedData)
      .join("path")
      .style("fill", function (d) {
        return color(d.key);
      })
      .attr("stroke", "#888")
      .attr("stroke-width", 1)
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
          // .curve(d3.curveCardinal.tension(0.8))
          // .curve(d3.curveStep)
          .curve(d3.curveBumpX)
      );

    // Add one circle in the legend for each name.
    let newKeys = [];
    keys.length > 46 ? (newKeys = keys.slice(0, 46)) : (newKeys = keys);
    svg
      .selectAll("mydots")
      .data(newKeys)
      .enter()
      .append("circle")
      .attr("cx", width - 180)
      .attr("cy", function (d, i) {
        return i * 15;
      })
      .attr("r", 7)
      .style("fill", function (d, i) {
        return color(i);
      });

    // Add text in the legend for each name.
    svg
      .selectAll("mylabels")
      .data(newKeys)
      .enter()
      .append("text")
      .attr("x", width - 160)
      .attr("y", function (d, i) {
        return i * 15;
      })
      .attr("font-size", "12px")
      .style("fill", "#000")
      .text(function (d) {
        if (d.guiltyUnit.length >= 36) {
          return "- " + d.guiltyUnit.substr(0, 35) + ` ... ${d.value} ч)`;
        } else {
          return "- " + d.guiltyUnit + ` (${d.value} ч)`;
        }
      })
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle");
  }, [
    stackedArrState.arr,
    minValue,
    period,
    stackedArrState.yMax,
    stackedArrState.keys,
    checkList,
    dateStart,
    dateEnd,
  ]);

  return (
    <svg
      id={`id21`}
      className="chartItem stackedChart"
      ref={svgRef5}
      width={1920}
      height={1080}
    ></svg>
  );
};

export default StackedAreaDiagram;
