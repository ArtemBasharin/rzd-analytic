import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3";
// import { powerpointColors } from "../utils/config";
// import { convertUnixToDate } from "../utils/functions";

const SumLineDiagram = () => {
  const src = useSelector((state) => state.filters.sumLineArrState);
  const checkList = useSelector((state) => state.filters.sumLineCheckList);
  const chartCheckList = useSelector((state) => state.filters.chartCheckList);
  // console.log("chartCheckList", chartCheckList);

  d3.select("#id24").selectAll("g").remove();
  let resData = src.arr;
  // console.log("resData", resData);

  useEffect(() => {
    // console.log("resData", resData);
    // set the dimensions and margins of the graph
    const margin = { top: 30, right: 170, bottom: 50, left: 100 },
      width = window.innerWidth - margin.left - margin.right,
      height = window.innerHeight - 180 - margin.top - margin.bottom;

    let datesArr = [];
    resData.forEach((el) => datesArr.push(el.date));

    // append the svg object to the body of the page
    const svg = d3
      .select("#id24")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const step = Math.ceil(datesArr.length / 30);
    // Add X axis --> it is a date format
    const x = d3
      .scaleLinear()
      .domain(
        d3.extent(resData, function (d) {
          return d.date;
        })
      )
      .range([0, width - 200]);

    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(
        d3
          .axisBottom(x)
          .tickSize(0)
          .tickValues(datesArr.filter((_, i) => i % step === 0))
          .tickFormat(function (d) {
            let format = d3.timeFormat("%0d.%0m");
            return format(d);
          })
      );

    let checkedOnlyList = chartCheckList.reduce(function (acc, item) {
      item.checked && (acc = [...acc, item]);
      return acc;
    }, []);

    let properties = chartCheckList.reduce(function (acc, item) {
      item.checked && (acc = [...acc, item.name]);
      return acc;
    }, []);
    // console.log(properties);
    // const color = []

    let yMax = src.yMax;
    const getChartProps = (prop) => {
      let arr = [];
      let strokeDash = "";
      let strokeWidth = "";
      let axisPos = "";
      let tickPos = "";
      if (prop.includes("Duration")) {
        for (let key in yMax) {
          key.includes("Duration") && arr.push(yMax[key]);
        }
        strokeDash = "10, 0";
        strokeWidth = "3.5";
        axisPos = "left";
        tickPos = "left";
      }

      if (prop.includes("Delayed")) {
        for (let key in yMax) {
          key.includes("Delayed") && arr.push(yMax[key]);
        }
        strokeDash = "5, 2";
        strokeWidth = "5.5";
        axisPos = "left";
        tickPos = "right";
      }

      if (prop.includes("Kind") || prop.includes("Cat")) {
        for (let key in yMax) {
          key.includes("Kind") && arr.push(yMax[key]);
          key.includes("Cat") && arr.push(yMax[key]);
        }
        strokeDash = "2, 2";
        strokeWidth = "10";
        axisPos = "right";
        tickPos = "right";
      }
      return {
        yMax: d3.max(arr),
        dash: strokeDash,
        width: strokeWidth,
        axisPos: axisPos,
        tickPos: tickPos,
      };
    };

    // Add Y axises and lines
    for (let i = 0; i < checkedOnlyList.length; i++) {
      let col = checkedOnlyList[i].color;
      const name = checkedOnlyList[i].name;
      let chartProp = getChartProps(name);
      let maxDomainValue = chartProp.yMax;
      // console.log(maxDomainValue);
      let data = resData.map((el) => {
        return { date: el.date, value: el[name] || 0 };
      });

      let y = d3
        .scalePow()
        .exponent(0.6)
        .domain([0, maxDomainValue])
        .range([height, 0]);

      svg.append("g").call(d3.axisLeft(y));

      // Add the line
      svg
        .append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", `${col}`)
        .attr("stroke-width", `${chartProp.width}`)
        .attr("stroke-dasharray", `${chartProp.dash}`)
        .attr(
          "d",
          d3
            .line()
            .x(function (d) {
              return x(d.date);
            })
            .y(function (d) {
              return y(d.value);
            })
            .curve(d3.curveBumpX)
          // .curve(d3.curveStep)
        );
    }

    // Add one line in the legend for each name.
    let legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 150},0)`);

    legend
      .selectAll("path")
      .data(properties)
      .enter()
      .append("path")
      .attr("d", function (d, i) {
        return "M 0," + (i * 20 + 5) + " L 25," + (i * 20 + 5);
      })
      .style("stroke", function (d, i) {
        return checkedOnlyList[i].color;
      })
      .style("stroke-width", function (d, i) {
        return getChartProps(d).width;
      })
      .attr("stroke-dasharray", function (d, i) {
        return getChartProps(d).dash;
      });

    legend
      .selectAll("text")
      .data(checkedOnlyList)
      .enter()
      .append("text")
      .attr("font-size", "12px")
      .attr("x", 30)
      .attr("y", function (d, i) {
        return i * 20 + 10;
      })
      .text(function (d, i) {
        return checkedOnlyList[i].translated;
      });
  }, [checkList, resData, src.yMax]);

  return (
    <svg
      id={`id24`}
      className="chartItem stackedChart"
      width={1920}
      height={1080}
    ></svg>
  );
};

export default SumLineDiagram;
