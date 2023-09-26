import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { useSelector } from "react-redux";

const BarGroupedLine = (props) => {
  const svgRef3 = useRef();
  const minValue = useSelector((state) => state.filters.minValue);

  let currentYear = props.maxYear;

  useEffect(() => {
    const findTrimIndex = (arr, minValue) => {
      for (let i = 0; i < arr.length; ++i) {
        if (arr[i][currentYear] < minValue) return i;
      }
    };
    let resData = props.stats.slice(0, findTrimIndex(props.stats, minValue));

    let amountOfLabels = resData.length;
    // console.log("amountOfLabels", amountOfLabels);

    const getMaxLabelLength = () => {
      if (props.stats[0].label) {
        let arr = [];
        props.stats.forEach((element) => {
          if (element.label) arr.push(element.label.length);
        });
        return d3.max(arr) / 2;
      } else return 0;
    };

    const margin = {
        top: 50,
        right: 100,
        bottom: 210 + getMaxLabelLength() * 1.5,
        left: 130 + getMaxLabelLength() * 1.5,
      },
      width = props.width - margin.left - margin.right,
      height =
        window.innerHeight - margin.bottom - margin.top - margin.bottom + 150;
    const groups = resData.map((d) => {
      return d.label;
    });
    // sort method put on to start yearLabels keys, then slice all keys except years
    // console.log("resData[0]", resData[0]);
    const subgroups = Object.keys(resData[0]).sort().slice(0, -2);
    const svg = d3
      .select(`#id${props.id}`) //temp id comes outside
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add X axis
    const x = d3.scaleBand().domain(groups).range([0, width]).padding([0.2]);
    let rotationAngle = -45;
    svg
      .append("g")
      .data(resData)
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll("text")
      .attr("transform", `translate(-3,5)rotate(${rotationAngle})`)
      .attr("text-anchor", "end")
      .attr("font-size", function (d) {
        return `${(1 - amountOfLabels / 100) * 12}px`; // ${(1 - amountOfLabels / 10) * 10}px
      })
      .call(wrap, margin.bottom / Math.sin(90 + rotationAngle)); //text wrap, instead x.bandwidth() pasted margin.bottom

    // Add Y axis
    const y = d3
      .scalePow()
      .exponent(0.5)
      .domain([0, props.yMax])
      .range([height, 0]);
    svg.append("g").call(d3.axisLeft(y));

    // Add second Y axis for paretto line
    const yP = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    svg
      .append("g")
      .call(d3.axisRight(yP).tickValues([0, 80, 100]))
      .attr("transform", `translate(${width},0)`);

    // Another scale for subgroup position?
    const xSubgroup = d3
      .scaleBand()
      .domain(subgroups)
      .range([0, x.bandwidth()]);
    // .padding([0.1]);

    // color palette = one color per subgroup
    const color = d3
      .scaleOrdinal()
      .domain(subgroups)
      .range([
        "rgb(175,180,116)",
        "rgb(5,111,173)",

        "#64b5f6",
        "#e57373",

        "#fb8072",
        "#80b1d3",
        "#fdb462",
        "#b3de69",
        "#fccde5",
        "#d9d9d9",
        "#bc80bd",
        "#ccebc5",
        "#e57373",
        "#64b5f6",
      ]);

    // Show the bars
    svg
      .append("g")
      .selectAll("g")
      // Enter in data = loop group per group
      .data(resData)
      .join("g")
      .attr("transform", (d) => `translate(${x(d.label)}, 0)`)
      .selectAll("rect")
      .data(function (d) {
        return subgroups.map(function (key) {
          return { key: key, value: d[key] };
        });
      })
      .join("rect")
      .attr("x", (d) => xSubgroup(d.key))
      .attr("y", (d) => y(d.value))
      .attr("width", xSubgroup.bandwidth())
      .attr("height", (d) => height - y(d.value))
      .attr("fill", (d) => color(d.key))
      .attr("filter", "drop-shadow(1px -1px 3px rgb(0 0 0 / 0.2))");

    // draw labels
    let yArrBarLabels = [];
    svg
      .append("g")
      .selectAll("g")
      .data(resData)
      .join("g")
      .attr("transform", (d) => `translate(${x(d.label)}, 0)`)
      .selectAll("rect")
      .data(function (d) {
        return subgroups.map(function (key) {
          return { key: key, value: d[key] };
        });
      })
      .join("text")
      .attr("x", (d) => xSubgroup(d.key) + xSubgroup.bandwidth() / 2)
      .attr("y", function (d) {
        yArrBarLabels.push(y(d.value) - 5);
        return y(d.value) - 5;
      })
      .text((d) => height - y(d.value))
      .attr("font-family", "roboto")
      .attr("font-size", "10px")
      .attr("font-weight", "900")
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .attr("fill", "#000")
      .text(function (d) {
        if (d.value >= 100) {
          return Math.round(d.value);
        } else {
          return Math.round(d.value * 10) / 10;
        }
      });

    //create array of y coordinates of labels of current year bars
    yArrBarLabels = yArrBarLabels.filter(
      (item) => yArrBarLabels.indexOf(item) % 2 !== 0
    );

    // draw simple pareto line
    svg
      .append("path")
      .datum(resData)
      .attr("fill", "none")
      .attr("stroke", "rgba(128,0,0,0.5)")
      .attr("stroke-dasharray", "15 8")
      .attr("stroke-width", 2)
      .attr(
        "d",
        d3
          .line()
          .x(function (d) {
            return (
              x(d.label) + xSubgroup.bandwidth() * (subgroups.length - 0.5)
            );
          })
          .y(function (d) {
            return yP(d.valueP);
          })
          .curve(d3.curveBasis)
      );

    // draw pareto line labels
    let testarr = [];
    svg
      .append("g")
      .selectAll("textLabels")
      .data(resData)
      .enter()
      .append("text")
      .attr("font-family", "roboto")
      .attr("font-size", "12px")
      .attr("font-weight", "700")
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .attr("fill", "#000")
      .attr("transform", "translate(0, -7)")
      .attr("x", function (d) {
        return x(d.label) + xSubgroup.bandwidth() * (subgroups.length - 0.5);
      })
      .attr("y", function (d, i) {
        testarr.push(yArrBarLabels[i] - yP(d.valueP));
        // if pareto label on backgroung of the bar make it white
        if (yArrBarLabels[i] - yP(d.valueP) < 0) {
          d3.select(this)
            .style("fill", "white")
            .style(
              "text-shadow",
              "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000"
            );
        }
        // if pareto label is first or near by barlabel make it white
        if (
          (i === 0) | (yArrBarLabels[i] - yP(d.valueP) > -30) &&
          yArrBarLabels[i] - yP(d.valueP) < 0
        ) {
          d3.select(this)
            .style("fill", "white")
            .style(
              "text-shadow",
              "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000"
            );
          return yP(d.valueP) + 25;
        } else {
          return yP(d.valueP);
        }
      })
      .text(function (d) {
        return d.valueP;
      });

    //draw 80% line
    svg
      .append("path")
      .datum(resData)
      .attr("fill", "none")
      .attr("stroke", "rgba(0,0,0,0.25")
      .attr("stroke-dasharray", "15 8")
      .attr("stroke-width", 1)
      .attr(
        "d",
        d3
          .line()
          .x(function (d) {
            return x(d.label) + xSubgroup.bandwidth();
          })
          .y(function (d) {
            return yP(80);
          })
      );

    //wrapping label`s text
    function wrap(text, width) {
      text.each(function () {
        let text = d3.select(this);
        let words = text.text().split(/\s+/).reverse();
        let word,
          line = [];
        let lineNumber = 0,
          lineHeight = 1; // ems
        let y = text.attr("y"),
          dy = parseFloat(text.attr("dy"));
        let tspan = text
          .text(null)
          .append("tspan")
          .attr("x", 0)
          .attr("y", y)
          .attr("dy", dy + "em");
        while ((word = words.pop())) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text
              .append("tspan")
              .attr("x", 0)
              .attr("y", y)
              .attr("dy", ++lineNumber * lineHeight + dy + "em")
              .text(word);
          }
        }
      });
    }

    // Add one dot in the legend for each name.
    svg
      .selectAll("mydots")
      .data(subgroups)
      .enter()
      .append("circle")
      .attr("cx", width - 110)
      .attr("cy", function (d, i) {
        return 140 + i * 35;
      }) // 140 is where the first dot appears. 35 is the distance between dots
      .attr("r", 15)
      .style("fill", function (d) {
        return color(d);
      });

    // Add text in the legend for each name.
    svg
      .selectAll("mylabels")
      .data(subgroups)
      .enter()
      .append("text")
      .attr("x", width - 90)
      .attr("y", function (d, i) {
        return 140 + i * 35;
      }) // 140 is where the first dot appears. 35 is the distance between dots
      .style("fill", "#000")
      .text(function (d) {
        return "- " + d + " год";
      })
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.stats,
    props.config,
    props.yMax,
    props.width,
    props.id,
    props.maxYear,
    currentYear,
    minValue,
  ]);

  return (
    <svg
      id={`id${props.id}`}
      className="chartItem groupedChart"
      ref={svgRef3}
      width={props.width}
      height={window.innerHeight - 90}
    ></svg>
  );
};
export default BarGroupedLine;
