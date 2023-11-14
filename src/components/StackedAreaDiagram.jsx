import React, { useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3";

const StackedAreaDiagram = () => {
  // console.log("Stacked loaded");
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

    // set the dimensions and margins of the graph
    const margin = { top: 20, right: 160, bottom: 80, left: 100 },
      width = 1920 - margin.left - margin.right,
      height = 710 - margin.top - margin.bottom;

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
    // let ticksAmount = resData.length

    function convertUnixToDate(unixDate) {
      const date = new Date(unixDate); // Умножаем на 1000, т.к. в Unix время указывается в миллисекундах
      const day = date.getDate(); // Получаем день месяца
      const month = date.getMonth() + 1; // Получаем номер месяца (начиная с 0)
      const year = date.getFullYear(); // Получаем год

      // Форматируем день и месяц, добавляя ноль если число состоит из одной цифры
      const formattedDay = day.toString().padStart(2, "0");
      const formattedMonth = month.toString().padStart(2, "0");
      // console.log("unix", `${formattedDay}-${formattedMonth}-${year}`);
      return `${formattedDay}-${formattedMonth}-${year}`;
    }

    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(datesArr)
          // .ticks(resData.length)
          .tickFormat(function (d) {
            return convertUnixToDate(d);
          })
      )
      .selectAll("text")
      .attr("text-anchor", "end")
      .attr(
        "transform",
        `translate(-3,5)rotate(${Math.atan(-1 * datesArr.length) * 30})`
      );

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
      width={1900}
      height={900}
    ></svg>
  );
};

export default StackedAreaDiagram;
