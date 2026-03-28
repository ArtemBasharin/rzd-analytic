import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { useSelector } from "react-redux";
import { cutDecimals } from "../utils/functions";

/** Как `.text_paragraph` в report.css (font-size: 14pt) */
const REPORT_TEXT_PT = 14;
const reportTextPx = (REPORT_TEXT_PT * 96) / 72;
/** Как `.text_container` в report.css: margin слева и справа */
const REPORT_PAGE_MARGIN_PX = 200;
/** Как `.text_paragraph` line-height в report.css — зазор между «рядами» подписей */
const REPORT_LABEL_LINE_HEIGHT_PX = 21.5;
/** Между соседними связями у одного узла (стопка у «чёрточки») — без просвета */
const REPORT_LINK_NODE_STACK_GAP_PX = 0;
/** Сколько параллельных рядов считать «мало» / «много» для интерполяции */
const REPORT_PARALLEL_LOW = 2;
const REPORT_PARALLEL_HIGH = 7;
/** Зазор между строками смежных подписей (нижний край / верхний край глифов), px */
const REPORT_LABEL_VERTICAL_GAP_PX = 6;
/** Высота вертикального слота узла под строку подписи + зазор (не зависит от value) */
const reportNodeSlotHeightPx = () =>
  REPORT_LABEL_LINE_HEIGHT_PX + REPORT_LABEL_VERTICAL_GAP_PX;
/** Мин. доля от max потока — высота узла в sankey; меньше = плотнее средняя колонка */
const REPORT_LAYOUT_MIN_FLOW_FRAC = 0.028;

const SankeyDiagram = ({
  svgId = "id22",
  filteredCheckList,
  mode = "slide",
  singleUnit,
}) => {
  const svgRef6 = useRef();
  const [reportOuterWidth, setReportOuterWidth] = useState(() => {
    if (typeof window === "undefined") return 600;
    return Math.max(280, window.innerWidth - 2 * REPORT_PAGE_MARGIN_PX);
  });

  let resData = useSelector((state) => state.filters.sankeyArrState);
  let globalCheckList = useSelector((state) => state.filters.sankeyCheckList);
  let checkList = filteredCheckList || globalCheckList;

  useEffect(() => {
    if (mode !== "report") return;
    const svg = svgRef6.current;
    if (!svg) return;
    const parent = svg.parentElement;
    const measure = () => {
      const el = svgRef6.current?.parentElement;
      if (!el) return;
      const w = el.getBoundingClientRect().width;
      if (w > 40) setReportOuterWidth(w);
    };
    measure();
    if (!parent) return;
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mode, svgId]);

  useEffect(() => {
    if (!resData?.nodes || !resData?.links) return;

    const isReport = mode === "report";

    d3.select(`#${svgId}`).selectAll("g").remove();

    // Filter data based on mode
    const checkedUnits =
      isReport && singleUnit
        ? [singleUnit]
        : checkList
            .filter((item) => item.checked)
            .map((item) => item.guiltyUnit);
    const filteredLinks = resData.links.filter((link) =>
      checkedUnits.includes(link.names[0]),
    );

    // Get all node indices that are referenced in filtered links
    const usedNodeIndices = new Set();
    filteredLinks.forEach((link) => {
      usedNodeIndices.add(link.source);
      usedNodeIndices.add(link.target);
    });

    // Filter nodes and create index mapping
    const filteredNodes = resData.nodes.filter((node, index) =>
      usedNodeIndices.has(index),
    );
    const indexMap = new Map();
    filteredNodes.forEach((node, newIndex) => {
      const oldIndex = resData.nodes.indexOf(node);
      indexMap.set(oldIndex, newIndex);
    });

    d3.select(svgRef6.current).selectAll("g").remove();
    d3.select(svgRef6.current).selectAll("g").remove();

    let margin;
    let width;
    let height;
    let fontSize;
    let nodePadding;
    let nodeWidth;
    let shiftAmount;

    if (isReport) {
      const nN = filteredNodes.length;
      const remappedIdxLinks = filteredLinks
        .map((l) => ({
          source: indexMap.get(l.source),
          target: indexMap.get(l.target),
        }))
        .filter(
          (l) => l.source !== undefined && l.target !== undefined,
        );

      let maxParallelEdges = 1;
      let maxCol = 1;
      if (nN > 0) {
        const outD = new Array(nN).fill(0);
        const inD = new Array(nN).fill(0);
        remappedIdxLinks.forEach((l) => {
          outD[l.source]++;
          inD[l.target]++;
        });
        maxParallelEdges = Math.max(1, ...outD, ...inD);

        const dDepth = new Array(nN).fill(0);
        for (let it = 0; it < nN; it++) {
          remappedIdxLinks.forEach((l) => {
            dDepth[l.target] = Math.max(dDepth[l.target], dDepth[l.source] + 1);
          });
        }
        const colSizes = new Map();
        for (let i = 0; i < nN; i++) {
          const d = dDepth[i];
          colSizes.set(d, (colSizes.get(d) || 0) + 1);
        }
        maxCol = Math.max(1, ...colSizes.values());
      }

      const parallelN = Math.max(maxParallelEdges, maxCol);
      const u = Math.max(
        0,
        Math.min(
          1,
          (parallelN - REPORT_PARALLEL_LOW) /
            (REPORT_PARALLEL_HIGH - REPORT_PARALLEL_LOW),
        ),
      );

      const nodePadMin = Math.max(
        REPORT_LABEL_LINE_HEIGHT_PX + REPORT_LABEL_VERTICAL_GAP_PX,
        reportTextPx * 0.92,
      );
      const nodePadMax = Math.max(
        REPORT_LABEL_LINE_HEIGHT_PX + 13,
        reportTextPx * 1.32,
      );

      const maxStrokeUpper = reportTextPx * 1.15;
      const thinLinksVsFont = maxStrokeUpper < REPORT_LABEL_LINE_HEIGHT_PX;

      if (thinLinksVsFont) {
        const padLo = REPORT_LABEL_VERTICAL_GAP_PX;
        const padHi = REPORT_LABEL_VERTICAL_GAP_PX + 10;
        nodePadding = padLo + u * (padHi - padLo);
      } else {
        nodePadding = nodePadMin + u * (nodePadMax - nodePadMin);
      }

      margin = { top: 10, right: 10, bottom: 10, left: 10 };
      width = Math.max(220, reportOuterWidth - margin.left - margin.right);
      fontSize = reportTextPx;
      nodeWidth = 2;
      const slotH = reportNodeSlotHeightPx();
      const innerTop = 5;
      const innerBottomReserve = 5;
      const innerNeeded =
        innerTop +
        maxCol * slotH +
        Math.max(0, maxCol - 1) * nodePadding +
        innerBottomReserve;
      height = Math.min(
        1400,
        Math.max(96, innerNeeded + 20),
      );
      shiftAmount = width * 0.3;
    } else {
      margin = { top: 30, right: 60, bottom: 0, left: 60 };
      width = window.innerWidth - margin.left - margin.right;
      fontSize = 20;
      nodePadding = fontSize * 1.2;
      height = window.innerHeight - 180 - margin.top - margin.bottom;
      shiftAmount = 500;
      nodeWidth = 4;
    }

    // append the svg object to the body of the page
    const svg = d3
      .select(`#${svgId}`)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    svg.selectAll("*").remove();

    const sankeyGenerator = sankey()
      .nodeSort((a, b) => b.value - a.value)
      .linkSort((a, b) => b.value - a.value)
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .extent([
        [0, 5],
        [width, height - 10],
      ]);

    let sankeyNodesInput = filteredNodes.map((d) => ({ ...d }));
    if (isReport && filteredNodes.length > 0) {
      const nN = filteredNodes.length;
      const flowIn = new Array(nN).fill(0);
      const flowOut = new Array(nN).fill(0);
      filteredLinks.forEach((l) => {
        const s = indexMap.get(l.source);
        const t = indexMap.get(l.target);
        if (s !== undefined && t !== undefined) {
          flowOut[s] += l.value;
          flowIn[t] += l.value;
        }
      });
      const globalMaxFlow = Math.max(1e-12, ...flowIn, ...flowOut);
      const floorFlow = globalMaxFlow * REPORT_LAYOUT_MIN_FLOW_FRAC;
      sankeyNodesInput = filteredNodes.map((d, i) => {
        const thru = Math.max(flowIn[i], flowOut[i]);
        const trueV = d.value !== undefined && d.value !== null ? d.value : thru;
        return {
          ...d,
          fixedValue: Math.max(thru, floorFlow),
          reportTrueValue: trueV,
        };
      });
    }

    const { nodes, links } = sankeyGenerator({
      nodes: sankeyNodesInput.map((d) => ({ ...d })),
      links: filteredLinks.map((d) => ({
        ...d,
        source: indexMap.get(d.source),
        target: indexMap.get(d.target),
      })),
    });

    const minLinkStrokePx = 5;
    const maxLinkStrokePx = fontSize * 1.15;

    if (isReport && links.length > 0) {
      const vals = links.map((l) => l.value);
      const vMin = Math.min(...vals);
      const vMax = Math.max(...vals);
      links.forEach((link) => {
        const t = vMax <= vMin ? 0.5 : (link.value - vMin) / (vMax - vMin);
        link.reportStrokeWidth =
          minLinkStrokePx + t * (maxLinkStrokePx - minLinkStrokePx);
      });
    } else if (links.length > 0) {
      // Нелинейное масштабирование ширины связей (слайд)
      const maxWidth = Math.max(...links.map((l) => l.width));
      links.forEach((link) => {
        link.originalWidth = link.width;
        link.width = Math.sqrt(link.width / maxWidth) * maxWidth;
      });
    }

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

    // Вертикальная раскладка по колонкам: между строками подписей ровно REPORT_LABEL_VERTICAL_GAP_PX,
    // если позволяют стопки связей; иначе шаг увеличивается (без наложения слотов).
    if (isReport && links.length > 0) {
      const yTopStart = 5;
      const L = REPORT_LABEL_LINE_HEIGHT_PX;
      const g = REPORT_LABEL_VERTICAL_GAP_PX;
      const linkGapLoc = REPORT_LINK_NODE_STACK_GAP_PX;

      const stackExtentR = (linkArr, measure) => {
        if (!linkArr.length) return 0;
        let s = 0;
        for (let i = 0; i < linkArr.length; i++) {
          s += measure(linkArr[i]);
          if (i < linkArr.length - 1) s += linkGapLoc;
        }
        return s;
      };
      const br = (link) => link.reportStrokeWidth;
      const nodeStackPx = (n) => {
        const ss = stackExtentR(n.sourceLinks, br);
        const st = stackExtentR(n.targetLinks, br);
        if (ss <= 0 && st <= 0) return 0;
        return Math.max(ss, st, 1e-6);
      };
      const slotHFor = (n) => Math.max(L, nodeStackPx(n));

      /** @returns {{ spanBot: number }} */
      const layoutColumnAt = (sorted, y0Top) => {
        if (!sorted.length) return { spanBot: y0Top };
        const S0 = slotHFor(sorted[0]);
        let c = y0Top + S0 / 2;
        sorted[0].y0 = y0Top;
        sorted[0].y1 = y0Top + S0;
        for (let i = 1; i < sorted.length; i++) {
          const Sp = slotHFor(sorted[i - 1]);
          const Si = slotHFor(sorted[i]);
          const step = Math.max(L + g, (Sp + Si) / 2);
          c += step;
          sorted[i].y0 = c - Si / 2;
          sorted[i].y1 = c + Si / 2;
        }
        return { spanBot: sorted[sorted.length - 1].y1 };
      };

      const columnHeightIfAt = (sorted, y0Top) => {
        if (!sorted.length) return 0;
        const { spanBot } = layoutColumnAt(sorted, y0Top);
        return spanBot - y0Top;
      };

      const byDepth = d3.group(nodes, (d) => d.depth);
      const depthsOrd = [...byDepth.keys()].sort((a, b) => a - b);
      if (depthsOrd.length === 0) {
        /* skip */
      } else {
        const minD = depthsOrd[0];
        const maxD = depthsOrd[depthsOrd.length - 1];

        const refD = depthsOrd.reduce((best, d) =>
          byDepth.get(d).length > byDepth.get(best).length ? d : best,
        );

        const refCol = [...byDepth.get(refD)].sort((a, b) => a.y0 - b.y0);
        const { spanBot } = layoutColumnAt(refCol, yTopStart);
        const spanH = spanBot - yTopStart;

        const placeColumnAt = (d, y0Top) => {
          const col = [...byDepth.get(d)].sort((a, b) => a.y0 - b.y0);
          layoutColumnAt(col, y0Top);
        };

        if (minD !== refD) {
          const leftCol = [...byDepth.get(minD)].sort((a, b) => a.y0 - b.y0);
          if (leftCol.length === 1) {
            leftCol[0].y0 = yTopStart;
            leftCol[0].y1 = spanBot;
          } else {
            placeColumnAt(minD, yTopStart);
          }
        }

        if (maxD !== refD) {
          const rightCol = [...byDepth.get(maxD)].sort((a, b) => a.y0 - b.y0);
          const hR = columnHeightIfAt(rightCol, 0);
          const yr = yTopStart + Math.max(0, (spanH - hR) / 2);
          layoutColumnAt(rightCol, yr);
        }

        for (const d of depthsOrd) {
          if (d === refD || d === minD || d === maxD) continue;
          placeColumnAt(d, yTopStart);
        }
      }
    }

    if (isReport && nodes.length > 0) {
      nodes.forEach((node) => {
        node.reportCy = (node.y0 + node.y1) / 2;
        node.reportBarH = nodeWidth;
      });
    }

    // В отчёте толщина связи = reportStrokeWidth, а y0/y1 у связей считались по value-width —
    // пересобираем стопку как в d3-sankey computeLinkBreadths: исходящие и входящие
    // отсчитываются от одного node.y0 параллельно, а не друг под другом (иначе «лестница»).
    if (isReport && links.length > 0) {
      const linkGap = REPORT_LINK_NODE_STACK_GAP_PX;
      const stackExtent = (linkArr, measure) => {
        if (!linkArr.length) return 0;
        let s = 0;
        for (let i = 0; i < linkArr.length; i++) {
          s += measure(linkArr[i]);
          if (i < linkArr.length - 1) s += linkGap;
        }
        return s;
      };

      for (const node of nodes) {
        const srcLinks = node.sourceLinks;
        const tgtLinks = node.targetLinks;
        const b = (link) => link.reportStrokeWidth;
        const sumSrc = stackExtent(srcLinks, b);
        const sumTgt = stackExtent(tgtLinks, b);
        if (sumSrc <= 0 && sumTgt <= 0) continue;

        const cy = (node.y0 + node.y1) / 2;

        if (srcLinks.length === 1 && tgtLinks.length === 1) {
          const wBar = Math.max(b(srcLinks[0]), b(tgtLinks[0]));
          node.reportCy = cy;
          node.reportBarH = wBar;
          srcLinks[0].y0 = cy;
          tgtLinks[0].y1 = cy;
          continue;
        }

        const stackH = Math.max(sumSrc, sumTgt, 1e-6);
        const yTop = cy - stackH / 2;
        node.reportCy = cy;
        node.reportBarH = stackH;

        let y = yTop;
        for (let i = 0; i < srcLinks.length; i++) {
          const link = srcLinks[i];
          const w = b(link);
          link.y0 = y + w / 2;
          y += w + (i < srcLinks.length - 1 ? linkGap : 0);
        }
        y = yTop;
        for (let i = 0; i < tgtLinks.length; i++) {
          const link = tgtLinks[i];
          const w = b(link);
          link.y1 = y + w / 2;
          y += w + (i < tgtLinks.length - 1 ? linkGap : 0);
        }
      }
    }

    // В отчёте переразкладка узлов занимает только верх «высокого» extent sankey;
    // без поджатия SVG остаётся лишняя высота + центрирование slack/2 → огромные поля вокруг.
    if (isReport && nodes.length > 0) {
      const maxNodeY = d3.max(nodes, (n) => n.y1) ?? 0;
      const maxLinkY =
        links.length > 0
          ? (d3.max(links, (l) => Math.max(l.y0 ?? 0, l.y1 ?? 0)) ?? 0)
          : 0;
      const labelDescent = REPORT_LABEL_LINE_HEIGHT_PX * 0.55;
      const maxLabelBottom =
        d3.max(nodes, (n) => (n.y0 + n.y1) / 2 + labelDescent) ?? 0;
      let maxBarBottom = maxNodeY;
      for (const n of nodes) {
        if (n.reportCy != null && n.reportBarH != null) {
          maxBarBottom = Math.max(maxBarBottom, n.reportCy + n.reportBarH / 2);
        }
      }
      const contentMaxY = Math.max(maxNodeY, maxLinkY, maxLabelBottom, maxBarBottom);
      const padBelow = 8;
      height = Math.max(40, contentMaxY + padBelow + 10);
      d3.select(`#${svgId}`).attr("height", height + margin.top + margin.bottom);
    }

    svg
      .append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) =>
        isReport && d.reportCy != null && d.reportBarH != null
          ? d.reportCy - d.reportBarH / 2
          : d.y0,
      )
      .attr("height", (d) =>
        isReport && d.reportBarH != null ? d.reportBarH : d.y1 - d.y0,
      )
      .attr("width", (d) => d.x1 - d.x0)
      .append("title")
      .text(function (d) {
        const v = d.reportTrueValue ?? d.value;
        return `${d.name}\n${cutDecimals(v)}`;
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

      .attr("stroke-width", (d) =>
        isReport ? d.reportStrokeWidth : d.originalWidth,
      )
      .style("mix-blend-mode", "multiply")
      .append("title")
      .text(
        (d) =>
          `${d.names?.join(" → ") || `${d.source.name} → ${d.target.name}`}\n${d.value.toLocaleString()}`,
      );

    const nodeCount = nodes.length;
    const minFontSize = 14;
    const maxFontSize = 40;
    if (!isReport) {
      fontSize = Math.max(
        minFontSize,
        Math.min(
          maxFontSize,
          Math.floor((height - (nodeCount * nodePadding) / 6) / nodeCount),
        ),
      );
    }

    const minDepth = d3.min(nodes, (n) => n.depth) ?? 0;
    const maxDepth = d3.max(nodes, (n) => n.depth) ?? 0;
    const avgCharPx = isReport
      ? reportTextPx * 0.48
      : Math.max(fontSize * 0.52, 7);
    /** Шире avgCharPx: жирный Times / длинные подписи средних узлов */
    const middleLabelCharPx = isReport
      ? reportTextPx * 0.62
      : Math.max(fontSize * 0.58, 8);
    const labelWidthSafety = 1.12;
    const labelPadPx = 12;

    const rightSpaceWidth =
      width / 2 + shiftAmount - margin.left - margin.right;
    const allowedCharsAmount = Math.max(
      4,
      Math.floor(rightSpaceWidth / Math.max(fontSize * 0.55, 6)) - 6,
    );

    const labelOnLeftSide = (d) => {
      if (d.depth === minDepth) return true;
      if (d.depth === maxDepth) return false;
      return (d.x0 + d.x1) / 2 < width / 2;
    };

    const nodeDisplayValue = (d) => d.reportTrueValue ?? d.value;
    const suffixFor = (d) => ` (${cutDecimals(nodeDisplayValue(d))} ч)`;

    const truncateMainToCharBudget = (raw, suffix, budgetChars) => {
      const r = raw || "";
      if (r.length + suffix.length <= budgetChars) return r;
      const ell = " ...";
      const n = Math.max(
        1,
        Math.min(r.length, budgetChars - suffix.length - ell.length),
      );
      return r.length > n ? r.substr(0, n) + ell : r;
    };

    const provisionalMainMiddleOrOther = (d) => {
      const raw = d.name || "";
      if (raw.length >= allowedCharsAmount) {
        return raw.substr(0, allowedCharsAmount) + " ...";
      }
      return raw;
    };

    const estimatedMiddleLabelRightX = (M) => {
      if (!labelOnLeftSide(M)) return 0;
      const main = provisionalMainMiddleOrOther(M);
      const suf = suffixFor(M);
      const w =
        (main.length + suf.length) * middleLabelCharPx * labelWidthSafety;
      return M.x1 + 6 + w + labelPadPx;
    };

    let maxMiddleLabelRightX = 0;
    if (maxDepth > minDepth) {
      for (const m of nodes) {
        if (m.depth <= minDepth || m.depth >= maxDepth) continue;
        maxMiddleLabelRightX = Math.max(
          maxMiddleLabelRightX,
          estimatedMiddleLabelRightX(m),
        );
      }
    }

    /** Правый край подписей тех средних узлов, из которых идут рёбра в данный правый */
    const clearanceForRightNodeLabel = (d) => {
      let c = 0;
      for (const link of d.targetLinks || []) {
        const M = link.source;
        if (!M || M.depth <= minDepth || M.depth >= maxDepth) continue;
        c = Math.max(c, estimatedMiddleLabelRightX(M));
      }
      return c > 0 ? c : maxMiddleLabelRightX;
    };

    const mainNameForNode = (d) => {
      const raw = d.name || "";
      const suffix = suffixFor(d);
      const isLeftCol = d.depth === minDepth && d.sourceLinks?.length > 0;
      if (isLeftCol) {
        const minTargetX = d3.min(d.sourceLinks, (l) => l.target.x0);
        const maxRightPx = Math.max(
          avgCharPx * 6,
          minTargetX - d.x1 - 6 - labelPadPx,
        );
        const budgetChars = Math.max(
          6,
          Math.floor(maxRightPx / avgCharPx),
        );
        return truncateMainToCharBudget(raw, suffix, budgetChars);
      }
      if (maxDepth > minDepth && d.depth === maxDepth) {
        const clearanceX = clearanceForRightNodeLabel(d);
        const maxLeftSpan = Math.max(
          middleLabelCharPx * 4,
          d.x0 - 6 - clearanceX,
        );
        const charPxForRightBudget = isReport
          ? reportTextPx * 0.54
          : Math.max(fontSize * 0.56, 7);
        const budgetChars = Math.max(
          6,
          Math.floor(maxLeftSpan / charPxForRightBudget),
        );
        return truncateMainToCharBudget(raw, suffix, budgetChars);
      }
      if (raw.length >= allowedCharsAmount) {
        return raw.substr(0, allowedCharsAmount) + " ...";
      }
      return raw;
    };

    svg
      .append("g")
      .attr(
        "font-family",
        isReport ? '"Times New Roman", Times, serif' : "roboto",
      )
      .attr("font-size", () =>
        isReport ? `${REPORT_TEXT_PT}pt` : `${fontSize}px`,
      )
      .attr("font-weight", isReport ? "700" : "900")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", (d) => (labelOnLeftSide(d) ? d.x1 + 6 : d.x0 - 6))
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (labelOnLeftSide(d) ? "start" : "end"))
      .text((d) => mainNameForNode(d))
      .append("tspan")
      .attr("fill-opacity", 0.7)
      .text((d) => ` (${cutDecimals(nodeDisplayValue(d))} ч)`);
  }, [resData, checkList, svgId, mode, singleUnit, reportOuterWidth]);

  return (
    <svg
      id={svgId}
      className={
        mode === "report"
          ? "chartItem stackedChart sankey-diagram--report"
          : "chartItem stackedChart"
      }
      ref={svgRef6}
      width={mode === "report" ? "100%" : 1900}
      height={mode === "report" ? 120 : 900}
    ></svg>
  );
};

export default SankeyDiagram;
