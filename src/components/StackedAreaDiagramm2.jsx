import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { similarColors } from "../config/config";
// import { interpolateRainbow } from "d3-scale-chromatic";
import chroma from "chroma-js";

const StackedAreaDiagram2 = (props) => {
  const svgRef5 = useRef();
  useEffect(() => {
    let resData = props.src;

    // set the dimensions and margins of the graph
    const margin = { top: 20, right: 30, bottom: 30, left: 100 },
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

    function convertUnixToDate(unixDate) {
      const date = new Date(unixDate); // Умножаем на 1000, т.к. в Unix время указывается в миллисекундах
      const day = date.getDate(); // Получаем день месяца
      const month = date.getMonth() + 1; // Получаем номер месяца (начиная с 0)
      const year = date.getFullYear(); // Получаем год

      // Форматируем день и месяц, добавляя ведущий ноль если число состоит из одной цифры
      const formattedDay = day.toString().padStart(2, "0");
      const formattedMonth = month.toString().padStart(2, "0");
      console.log("unix", `${formattedDay}-${formattedMonth}-${year}`);
      return `${formattedDay}-${formattedMonth}-${year}`;
    }

    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(10)
          .tickFormat(function (d) {
            return convertUnixToDate(d);
          })
      );

    // Add Y axis
    const y = d3
      // .scalePow()
      // .exponent(5.1)
      .scaleLinear()
      .domain([0, props.yMax + 50])
      .range([height, 0]);
    svg.append("g").call(d3.axisLeft(y));

    // // Палитра из d3.schemeCategory10
    // const colorPalette = d3.schemeCategory10;

    // // Функция для генерации похожих цветов
    // const generateSimilarColors = (baseColor, count) => {
    //   const colorScale = chroma.scale(chroma.hex(baseColor)).colors(count);
    //   return colorScale;
    // };

    // // Генерация массива из 100 похожих цветов
    // const similarColors = [];
    // colorPalette.forEach((color) => {
    //   const shades = generateSimilarColors(color, 10);
    //   similarColors.push(...shades);
    // });
    // console.log(similarColors);

    // color palette
    const color = d3.scaleOrdinal().domain(keys).range(similarColors);

    // if you'll need to use chromatic colors
    // const color = d3
    //   .scaleSequential()
    //   .interpolator(d3.interpolateRdBu)
    //   .domain([0, keys.length]);

    //stack the data?
    const stackedData = d3.stack().keys(keys)(resData);
    //console.log("This is the stack result: ", stackedData)

    // Show the areas
    svg
      .selectAll("mylayers")
      .data(stackedData)
      .join("path")
      // for chromatic colors
      // .style("fill", function (d) {
      //   console.log(color(d.index));
      //   return color(d.index);
      // })
      .style("fill", function (d) {
        return color(d.key);
      })
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
