import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

import "../App.css";
import descend from "../images/descend.svg";
import increase from "../images/increase.svg";

const BarChart2Bars = (props) => {
  const svgRef2 = useRef();
  useEffect(() => {
    let resData = props.stats;
    //console.log("resData", resData);

    // set the dimensions and margins of the graph

    const margin = { top: 100, right: 5, bottom: 50, left: 5 },
      width = props.width - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    //console.log("props.width", props.width);
    //console.log("props.config", props.config);
    const svg = d3
      .select(`#id${props.config}`) //temp id comes outside
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // get the data

    let x = d3.map(resData, (d) => d.label);
    //console.log("x", x);

    // X axis: scale and draw:
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

    // Y axis: scale and draw:
    const y = d3.scalePow().exponent(0.4).range([height, 0]);
    y.domain([
      0,
      props.yMax,
      // d3.max(resData, function (d) {
      //   return d.value * 1.2;
      // }),
    ]);
    //svg.append("g").call(d3.axisLeft(y)); //temp remove leftAxis

    let bars = svg.selectAll("mybar").data(resData).enter();

    //set the colorscheme
    const color = d3
      .scaleOrdinal()
      .domain(x)
      .range([
        "#e57373",
        "#64b5f6",
        "#80b1d3",
        "#fb8072",

        "#fdb462",
        "#b3de69",
        "#fccde5",
        "#d9d9d9",
        "#bc80bd",

        "#ccebc5",
        "#e57373",
        "#64b5f6",
      ]);

    //draw bars
    bars
      .append("rect")
      .attr("x", function (d) {
        return X(d.label);
      })
      .attr("y", function (d) {
        return y(d.value) - 1; //-1 px is vertical offset for positioning scales below bars
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
        return "+" + resData[1].value + " ТН";
      }
      if (resData[1].value === 0) {
        return "-" + resData[0].value + " ТН";
      }
    };
    let arrowKind = "";
    const setTextAndArrowKind = () => {
      if (
        resData[0].value === resData[1].value ||
        createComparisonText().toString().includes("-")
      ) {
        arrowKind = descend;
        return "rgb(0, 128, 0)";
      } else {
        arrowKind = increase;
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
  }, []);
  return (
    <svg id={`id${props.config}`} className="chartItem" ref={svgRef2}></svg>
  );
};
export default BarChart2Bars;
