import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { useSelector } from "react-redux";
import { cutDecimals } from "../utils/functions";

const SankeyDiagram = ({ svgId = 'id22', filteredCheckList }) => {
  const svgRef6 = useRef();
  let resData = useSelector((state) => state.filters.sankeyArrState);
  let globalCheckList = useSelector((state) => state.filters.sankeyCheckList);
  let checkList = filteredCheckList || globalCheckList;

  useEffect(() => {
    d3.select(`#${svgId}`).selectAll("g").remove();
    
    // Filter data based on checkList
    const checkedUnits = checkList.filter(item => item.checked).map(item => item.guiltyUnit);
    const filteredLinks = resData.links.filter(link => 
      checkedUnits.includes(link.names[0])
    );
    
    // Get all node indices that are referenced in filtered links
    const usedNodeIndices = new Set();
    filteredLinks.forEach(link => {
      usedNodeIndices.add(link.source);
      usedNodeIndices.add(link.target);
    });
    
    // Filter nodes and create index mapping
    const filteredNodes = resData.nodes.filter((node, index) => usedNodeIndices.has(index));
    const indexMap = new Map();
    filteredNodes.forEach((node, newIndex) => {
      const oldIndex = resData.nodes.indexOf(node);
      indexMap.set(oldIndex, newIndex);
    });
    
    // Remap link indices
    const remappedLinks = filteredLinks.map(link => ({
      ...link,
      source: indexMap.get(link.source),
      target: indexMap.get(link.target)
    }));
    
    // set the dimensions and margins of the graph
    const margin = { top: 30, right: 60, bottom: 0, left: 60 },
      width = window.innerWidth - margin.left - margin.right,
      height = window.innerHeight - 180 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3
      .select(`#${svgId}`)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    svg.append("g");

    const nodePadding = 20;
    const sankeyGenerator = sankey()
      .nodeSort((a, b) => b.value - a.value)
      .linkSort((a, b) => b.value - a.value)
      .nodeWidth(4)
      .nodePadding(nodePadding)
      .extent([
        [0, 5],
        [width, height - 10],
      ]);

    const shiftAmount = 500; // на сколько пикселей сместить "ось" узлов влево

    const { nodes, links } = sankeyGenerator({
      nodes: filteredNodes.map((d) => ({ ...d })),
      links: remappedLinks.map((d) => ({ ...d })),
    });

    // Найдём центр всей диаграммы по X
    const centerX = width / 2;

    // Смещаем только те узлы, которые находятся на "центральной линии" или близко к ней
    nodes.forEach((node) => {
      const nodeCenter = (node.x0 + node.x1) / 2;

      // Пример — если узел находится ближе к центру, сдвигаем его
      if (Math.abs(nodeCenter - centerX) < 50) {
        node.x0 -= shiftAmount;
        node.x1 -= shiftAmount;
      }
    });

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
      .text(function (d) {
        return `${d.name}\n${cutDecimals(d.value)}`;
      });

    //draw tooltips
    svg
      .append("g")
      .attr("fill", "none")
      .selectAll("g")
      .data(links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", function (d) {
        return (
          checkList.find((el) => el.guiltyUnit === d.names[0])?.checkboxColor ||
          "default-color"
        );
      })

      .attr("stroke-width", (d) => d.width)
      .style("mix-blend-mode", "multiply")
      .append("title")
      .text((d) => `${d.names.join(" → ")}\n${d.value.toLocaleString()}`);

    const nodeCount = nodes.length;
    const minFontSize = 14;
    const maxFontSize = 40;
    const fontSize = Math.max(
      minFontSize,
      Math.min(
        maxFontSize,
        Math.floor((height - (nodeCount * nodePadding) / 6) / nodeCount),
      ),
    );
    const rightSpaceWidth =
      width / 2 + shiftAmount - margin.left - margin.right;
    const allowedCharsAmount = Math.floor(rightSpaceWidth / fontSize) - 8;

    svg
      .append("g")
      .attr("font-family", "roboto")
      .attr("font-size", (d) => {
        return `${fontSize}px`;
      })
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
      //   return d.name;
      // })
      .text(function (d) {
        if (d.name && d.name.length >= allowedCharsAmount) {
          return d.name.substr(0, allowedCharsAmount) + " ...";
        } else {
          return d.name;
        }
      })
      .append("tspan")
      .attr("fill-opacity", 0.7)
      .text((d) => ` (${cutDecimals(d.value)} ч)`);
  }, [resData, checkList]);

  return (
    <svg
      id={svgId}
      className="chartItem stackedChart"
      ref={svgRef6}
      width={1900}
      height={900}
    ></svg>
  );
};

export default SankeyDiagram;
