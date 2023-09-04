import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { similarColors } from "../config/config";

const SankeyDiagram = (props) => {
  const svgRef6 = useRef();
  useEffect(() => {
    let resData = props.src;

    // set the dimensions and margins of the graph
    const margin = { top: 20, right: 160, bottom: 30, left: 100 },
      width = 1900 - margin.left - margin.right,
      height = 710 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3
      .select("#id22")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  }, [props.src]);

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
