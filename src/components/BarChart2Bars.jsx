import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3";
// import "../App.css";
import descendArrow from "../images/descendArrow.svg";
import increaseArrow from "../images/increaseArrow.svg";
import transparentArrow from "../images/transparentArrow.svg";
import { cutDecimals } from "../utils/functions";

const BarChart2Bars = (props) => {
  const minValue = useSelector((state) => state.filters.minValue);
  const dateStart = useSelector((state) => state.filters.dateStart);
  const dateEnd = useSelector((state) => state.filters.dateEnd);
  useEffect(() => {
    let resData = props.stats;
    const margin = { top: 80, right: 5, bottom: 55, left: 5 },
      width = props.width - margin.left - margin.right,
      // height = 350 - margin.top - margin.bottom;
      height = props.height;

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
      .call(d3.axisBottom(X))
      .selectAll("text")
      .attr("font-family", "roboto")
      .attr("font-size", "15px")
      .attr("font-weight", "700")
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .attr("dy", "15px");

    // Y axis: scale and draw
    const y = d3.scalePow().exponent(0.4).range([height, 0]);
    y.domain([0, props.yMax]);
    //svg.append("g").call(d3.axisLeft(y)); //temporary remove leftAxis

    let bars = svg.selectAll("mybar").data(resData).enter();

    //set the colorscheme
    const color = d3
      .scaleOrdinal()
      .domain(x)
      .range(["rgb(175,180,116)", "rgb(5,111,173)"]);

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
      .attr("fill", (d) => color(d.label))
      .attr("filter", "drop-shadow(1px -1px 3px rgb(0 0 0 / 0.2))");

    //draw labels
    bars
      .append("text")
      .text(function (d) {
        return Math.round(d.value * 100) / 100;
      })
      .attr("x", function (d) {
        return X(d.label) + X.bandwidth() / 2;
      })
      .attr("y", function (d) {
        return y(d.value) - 10;
      })
      .attr("font-family", "roboto")
      .attr("font-size", "19px")
      .attr("font-weight", "900")
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
        return height + 50;
      })
      .attr("font-family", "roboto")
      .attr("font-size", "16px")
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
          
            cutDecimals((resData[1].value - resData[0].value) / resData[0].value) 
           +
          "%"
        );
      }
      if (resData[0].value === 0) {
        return "+" + cutDecimals(resData[1].value);
      }
      if (resData[1].value === 0) {
        return "-" + cutDecimals(resData[0].value);
      }
    };
    const setTextAndArrowKind = () => {
      if (resData[0].value > resData[1].value) arrowKind = descendArrow;
      if (resData[0].value === resData[1].value) arrowKind = transparentArrow;
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
      .text(createComparisonText)
      .attr("x", function () {
        return width / 2;
      })
      .attr("y", function () {
        return y(d3.max([resData[0].value, resData[1].value])) - 55; //find tallest bar and set y-position of text
      })
      .attr("font-family", "roboto")
      .attr("font-size", "21px")
      .attr("font-weight", "1000")
      .attr("fill", setTextAndArrowKind())
      .attr("text-anchor", "middle");

    //draw arrow
    let compareArrow = svg.selectAll("compareArrow").data(resData).enter();
    compareArrow
      .append("image")
      .attr("href", function () {
        return arrowKind;
      })
      .attr("width", 30)
      .attr("height", 30)
      .attr("x", function () {
        return width / 2 - 15;
      })
      .attr("y", function () {
        return y(d3.max([resData[0].value, resData[1].value])) - 50; //find tallest bar and set y-position of text
      });
  }, [
    props.stats,
    props.config,
    props.yMax,
    props.width,
    props.height,
    minValue,
    dateStart,
    dateEnd,
  ]);
  return <svg id={`id${props.config}`} className="chartItem"></svg>;
};
export default BarChart2Bars;
