import { useRef, useEffect } from "react";
import * as d3 from "d3";
import { useSelector } from "react-redux";
import { el } from "date-fns/locale";

const BarGroupedLine = (props) => {
  const svgRef3 = useRef();
  const minValue = useSelector((state) => state.filters.minValue);
  const dateStart = useSelector((state) => state.filters.dateStart);
  const dateEnd = useSelector((state) => state.filters.dateEnd);

  let currentYear = props.maxYear;

  useEffect(() => {
    d3.select(`#id${props.id}`).selectAll("g").remove();
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
        return d3.max(arr);
      } else return 0;
    };

    const getLinesOfLabelsAmount = () => {
      if (resData.length <= 10) return 5;
      if (resData.length > 10 && resData.length <= 15) return 4;
      if (resData.length > 15 && resData.length <= 20) return 3;
      if (resData.length > 20 && resData.length <= 30) return 2;
      if (resData.length > 30) return 1;
    };

    let rotationAngle = -40;

    const margin = {
        top: 50,
        right: 100,
        bottom: 300,
        left: 80 + getMaxLabelLength(),
      },
      width = props.width - margin.left - margin.right,
      height = window.innerHeight - margin.bottom - margin.top - 80;

    const groups = resData.map((d) => {
      return d.label;
    });

    // sort method put on to start yearLabels keys, then slice all keys except years
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

    svg
      .append("g")
      .data(resData)
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll("text")
      .attr("transform", `translate(-3,5)rotate(${rotationAngle})`)
      .attr("text-anchor", "end")
      .attr("font-size", function (d) {
        return `${(1 - amountOfLabels / 100) * 15}px`; // ${(1 - amountOfLabels / 10) * 10}px
      })
      .attr("font-weight", "700")
      .call(wrap, margin.bottom, getLinesOfLabelsAmount()); //text wrap, instead x.bandwidth() pasted margin.bottom

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
      .call(
        d3
          .axisRight(yP)
          .tickValues([0, 80, 100])
          .tickFormat((value) => value + "%")
      )
      .attr("transform", `translate(${width},0)`);

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
      .attr("stroke", "rgba(128,0,0,0.8)")
      .attr("stroke-dasharray", "15 8")
      .attr("stroke-width", 4)
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
    //  function wrap(text, width) {
    //   text.each(function () {
    //     let textNode = d3.select(this);
    //     let lineHeight = 1.2;
    //     let y = parseFloat(textNode.attr("y"));
    //     let dy = parseFloat(textNode.attr("dy"));
    //     let words = textNode.text().split(/\s+/).reverse();
    //     let word,
    //       line = [];
    //     let lineNumber = 0;
    //     let tspan = textNode
    //       .text(null)
    //       .append("tspan")
    //       .attr("x", 0)
    //       .attr("y", y)
    //       .attr("dy", dy + "em");

    //     while ((word = words.pop())) {
    //       line.push(word);
    //       tspan.text(line.join(" "));
    //       if (tspan.node().getComputedTextLength() > width && lineNumber < 2) {
    //         line.pop();
    //         tspan.text(line.join(" "));

    //         // Убираем третью строку
    //         if (lineNumber === 1) {
    //           let truncatedText = tspan.text().slice(0, -3); // Убираем троеточие и три символа
    //           tspan.text(truncatedText + "...");
    //           break; // Прерываем процесс добавления новых тspan после обрезания второй строки
    //         }

    //         line = [word];
    //         tspan = textNode
    //           .append("tspan")
    //           .attr("x", 0)
    //           .attr("y", y)
    //           .attr("dy", ++lineNumber * lineHeight + dy + "em")
    //           .text(word);
    //       }
    //     }
    //   });
    // }

    function wrap(text, width, maxLines) {
      text.each(function () {
        let textNode = d3.select(this);
        let lineHeight = 1.2;
        let y = parseFloat(textNode.attr("y"));
        let dy = parseFloat(textNode.attr("dy"));
        let words = textNode.text().split(/\s+/).reverse();
        let word,
          line = [];
        let lineNumber = 0;
        let tspan = textNode
          .text(null)
          .append("tspan")
          .attr("x", 0)
          .attr("y", y)
          .attr("dy", dy + "em");

        while ((word = words.pop())) {
          line.push(word);
          tspan.text(line.join(" "));
          if (
            tspan.node().getComputedTextLength() > width &&
            lineNumber < maxLines
          ) {
            line.pop();
            tspan.text(line.join(" "));

            // Убираем третью строку
            if (lineNumber === maxLines - 1) {
              let truncatedText = tspan.text().slice(0, -3); // Убираем троеточие и три символа
              tspan.text(truncatedText + "...");
              break; // Прерываем процесс добавления новых tspan после обрезания второй строки
            }

            line = [word];
            tspan = textNode
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

    // draw axis titles
    svg
      .append("text")
      .attr("x", margin + 11)
      .attr("y", margin - 11)
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .attr("transform", `translate(-45,5)rotate(270)`)
      .attr("text-anchor", "end")
      .text(props.yName);
  }, [
    props.stats,
    props.config,
    props.yMax,
    props.width,
    props.id,
    props.maxYear,
    currentYear,
    minValue,
    dateStart,
    dateEnd,
    props.yName,
  ]);

  return (
    <svg
      id={`id${props.id}`}
      className="chartItem groupedChart"
      ref={svgRef3}
      width={window.innerWidth}
      height={window.innerHeight}
    ></svg>
  );
};
export default BarGroupedLine;
