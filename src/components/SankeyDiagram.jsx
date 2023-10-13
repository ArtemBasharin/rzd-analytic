import React, { useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { useSelector } from "react-redux";
import { useEffect } from "react";
// import { similarColors } from "../config/config";

const SankeyDiagram = () => {
  const svgRef6 = useRef();
  let sankeyArr = useSelector((state) => state.filters.sankeyArrState);
  let checkedUnits = useSelector((state) => state.filters.sankeyCheckList);

  useEffect(() => {
    let resData = sankeyArr;
    console.log("sankey loaded");
    d3.select("#id22").selectAll("g").remove();

    // set the dimensions and margins of the graph
    const margin = { top: 20, right: 100, bottom: 30, left: 100 },
      width = 1920 - margin.left - margin.right,
      height = 751 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3
      // .select(svgRef6.current)
      .select("#id22")
      // .select("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // svg.select("#id22").selectAll("g").remove();

    svg.append("g");

    const color = d3.scaleOrdinal(d3.schemeSet2);

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

    svg
      .append("g")
      .attr("fill", "none")
      .selectAll("g")
      .data(links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", (d) => color(d.names[0]))
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
      .text((d) => d.name)
      .append("tspan")
      .attr("fill-opacity", 0.7)
      .text((d) => ` (${d.value.toLocaleString()})`);
  }, [sankeyArr, checkedUnits]);

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
