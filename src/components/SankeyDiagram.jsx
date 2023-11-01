import React, { useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { useSelector } from "react-redux";

const SankeyDiagram = () => {
  const svgRef6 = useRef();
  let resData = useSelector((state) => state.filters.sankeyArrState);
  let checkList = useSelector((state) => state.filters.sankeyCheckList);
  console.log("resData", resData);

  d3.select("#id22").selectAll("g").remove();

  // set the dimensions and margins of the graph
  const margin = { top: 20, right: 100, bottom: 30, left: 100 },
    width = 1920 - margin.left - margin.right,
    height = 751 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  const svg = d3
    .select("#id22")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  svg.append("g");

  // const color2 = d3.scaleOrdinal(d3.schemeSet2);

  const sankeyGenerator = sankey()
    .nodeSort(null)
    .linkSort(null)
    .nodeWidth(4)
    .nodePadding(10)
    .extent([
      [0, 5],
      [width, height - 10],
    ]);

  const { nodes, links } = sankeyGenerator({
    nodes: resData.nodes.map((d) => ({ ...d })),
    links: resData.links.map((d) => ({ ...d })),
  });

  // console.log("nodes", nodes);
  let arrFromKeys = [];
  links.forEach((el) => {
    arrFromKeys.push(el.names[0]);
  });

  console.log("arrFromKeys", arrFromKeys);
  let colorArr = [];

  checkList.forEach((el) => {
    if (el.checked) colorArr.push(el.checkboxColor);
  });
  // console.log("colorArr", colorArr);
  // let color = d3.scaleOrdinal(colorArr);
  // const color = d3.scaleOrdinal().domain(arrFromKeys).range(colorArr);

  svg
    .append("g")
    .selectAll("rect")
    .data(nodes)
    .join("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .append("title")
    .text((d) => `${d.name}\n${d.value.toLocaleString()}`);

  //draw tooltips
  svg
    .append("g")
    .attr("fill", "none")
    .selectAll("g")
    .data(links)
    .join("path")
    .attr("d", sankeyLinkHorizontal())
    .attr("stroke", function (d) {
      return checkList.find((el) => el.guiltyUnit === d.names[0]).checkboxColor;
    })
    .attr("stroke-width", (d) => d.width)
    .style("mix-blend-mode", "multiply")
    .append("title")
    .text((d) => `${d.names.join(" → ")}\n${d.value.toLocaleString()}`);

  svg
    .append("g")
    .attr("font-family", "roboto")
    .attr("font-size", "10")
    .attr("font-weight", "900")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
    .attr("y", (d) => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
    // .style("fill", "white")
    // .style(
    //   "text-shadow",
    //   "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000"
    // )
    // .text(function (d) {
    //   console.log(d.name.length);
    //   return d.name;
    // })
    .text(function (d) {
      if (d.name && d.name.length >= 80) {
        return d.name.substr(0, 80) + " ...";
      } else {
        return d.name;
      }
    })
    .append("tspan")
    .attr("fill-opacity", 0.7)
    .text((d) => ` (${d.value.toLocaleString()})`);

  return (
    <svg
      id={`id22`}
      className="chartItem stackedChart"
      ref={svgRef6}
      width={1900}
      height={900}
    ></svg>
  );
};

export default SankeyDiagram;
