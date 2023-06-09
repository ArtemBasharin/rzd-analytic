import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

import "../App.css";
import descendArrow from "../images/descendArrow.svg";
import increaseArrow from "../images/increaseArrow.svg";

const BarChart2Bars = (props) => {
  const svgRef2 = useRef();

  useEffect(() => {
    let resData = props.stats;
    const margin = { top: 100, right: 5, bottom: 50, left: 5 },
      width = props.width - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3
      .select(`#id${props.config}`) //temporary id comes outside
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.map(resData, (d) => d.label);

    // X axis: scale and draw
    let X = d3
      .scaleBand()
      .domain(resData.map((d) => d.label)) // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
      .range([0, width])
      .paddingInner(0.2)
      .paddingOuter(0.1);

    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(X));

    // Y axis: scale and draw
    const y = d3.scalePow().exponent(0.4).range([height, 0]);
    y.domain([0, props.yMax]);
    //svg.append("g").call(d3.axisLeft(y)); //temporary remove leftAxis

    let bars = svg.selectAll("mybar").data(resData).enter();

    //set the colorscheme
    const color = d3
      .scaleOrdinal()
      .domain(x)
      .range([
        "rgb(175,180,116)",
        "rgb(5,111,173)",
        "rgb(175,180,116)",
        "rgb(5,111,173)",

        "#fdb462",
        "#b3de69",
        "#fccde5",
        "#d9d9d9",
        "#bc80bd",

        "#ccebc5",
        "rgb(175,180,116)",
        "rgb(5,111,173)",
      ]);

    //draw bars
    bars
      .append("rect")
      .attr("x", function (d) {
        return X(d.label);
      })
      .attr("y", function (d) {
        return y(d.value);
      })
      .attr("width", X.bandwidth())
      .attr("height", function (d) {
        return height - y(d.value);
      })
      .attr("fill", (d) => color(d))
      .attr("filter", "drop-shadow(1px -1px 3px rgb(0 0 0 / 0.2))");

    //draw labels
    bars
      .append("text")
      .text(function (d) {
        return d.value;
      })
      .attr("x", function (d) {
        return X(d.label) + X.bandwidth() / 2;
      })
      .attr("y", function (d) {
        return y(d.value) - 10;
      })
      .attr("font-family", "roboto")
      .attr("font-size", "14px")
      .attr("font-weight", "700")
      .attr("fill", "#000")
      .attr("text-anchor", "middle");

    //draw title
    let chartTitle = svg.selectAll("chartTitle").data(resData).enter();
    chartTitle
      .append("text")
      .text(function (d) {
        return d.title;
      })
      .attr("x", function () {
        return width / 2;
      })
      .attr("y", function () {
        return height + 40;
      })
      .attr("font-family", "roboto")
      .attr("font-size", "14px")
      .attr("font-weight", "700")
      .attr("fill", "#000")
      .attr("text-anchor", "middle");

    //draw comparison text
    let arrowKind = "";
    const createComparisonText = () => {
      if (resData[0].value === resData[1].value) {
        return "Без изменений";
      }
      if (resData[0].value !== 0) {
        return (
          Math.floor(
            ((resData[1].value - resData[0].value) / resData[0].value) * 1000
          ) /
            10 +
          "%"
        );
      }
      if (resData[0].value === 0) {
        return "+" + resData[1].value;
      }
      if (resData[1].value === 0) {
        return "-" + resData[0].value;
      }
    };
    const setTextAndArrowKind = () => {
      if (resData[0].value > resData[1].value) arrowKind = descendArrow;
      if (resData[0].value === resData[1].value) arrowKind = "";
      if (resData[0].value < resData[1].value) arrowKind = increaseArrow;
      if (
        resData[0].value === resData[1].value ||
        createComparisonText().toString().includes("-")
      ) {
        return "rgb(0, 128, 0)";
      } else {
        return "rgb(128, 0, 0)";
      }
    };

    let compareTitle = svg.selectAll("compareTitle").data(resData).enter();
    compareTitle
      .append("text")
      .text(createComparisonText())
      .attr("x", function () {
        return width / 2;
      })
      .attr("y", function () {
        return y(d3.max([resData[0].value, resData[1].value])) - 55; //find tallest bar and set y-position of text
      })
      .attr("font-family", "roboto")
      .attr("font-size", "18px")
      .attr("font-weight", "700")
      .attr("fill", setTextAndArrowKind())
      .attr("text-anchor", "middle");

    //draw arrow
    let compareArrow = svg.selectAll("compareArrow").data(resData).enter();
    compareArrow
      .append("image")
      .attr("href", arrowKind)
      .attr("width", 30)
      .attr("height", 30)
      .attr("x", function () {
        return width / 2 - 15;
      })
      .attr("y", function () {
        return y(d3.max([resData[0].value, resData[1].value])) - 50; //find tallest bar and set y-position of text
      });
  }, [props.stats, props.config, props.yMax, props.width]);
  return (
    <svg id={`id${props.config}`} className="chartItem" ref={svgRef2}></svg>
  );
};
export default BarChart2Bars;
