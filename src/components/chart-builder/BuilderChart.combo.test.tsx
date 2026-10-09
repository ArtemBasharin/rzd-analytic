import React from "react";
import { render, waitFor } from "@testing-library/react";
import { aggregateViolations } from "../../chart-builder/aggregate";
import { defaultChartSpec, defaultChartStyle } from "../../chart-builder/types";
import { Violation } from "../../types/violation";
import BuilderChart from "./BuilderChart";

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  const svgProto = SVGElement.prototype as unknown as {
    getComputedTextLength: () => number;
    getBBox: () => { x: number; y: number; width: number; height: number };
  };
  svgProto.getComputedTextLength = () => 48;
  svgProto.getBBox = () => ({ x: 0, y: 0, width: 48, height: 12 });
});

function row(unit: string, hours: number): Violation {
  return {
    "Виновное предприятие": unit,
    "Причина 2 ур": "Причина",
    "Начало отказа": "2026-09-10T12:00:00",
    Категория: "К",
    Место: "Станция",
    "Вид технологического нарушения": "Вид",
    "Время грузовых поездов(по месту)": hours,
  };
}

test("comparison keeps period columns and draws the other measures as lines", () => {
  const spec = defaultChartSpec();
  spec.categoryField = "unit";
  spec.chartType = "bar";
  spec.compareMode = "yoy";
  spec.dateFrom = new Date(2026, 8, 1).getTime();
  spec.dateTo = new Date(2026, 8, 29, 23, 59, 59, 999).getTime();
  spec.measures = [
    { fieldId: "allDuration", aggregation: "sum", axis: "y", mark: "bar" },
    { fieldId: "freightDuration", aggregation: "sum", axis: "y", mark: "line" },
  ];
  const result = aggregateViolations(
    [row("А", 5), row("А", 1), row("Б", 2)],
    spec,
  );
  expect(result.series.map((s) => s.mark)).toEqual(["bar", "bar", "line", "line"]);
  expect(result.series.filter((s) => s.mark === "line").map((s) => s.scaleKey)).toEqual([
    "freightDuration",
    "freightDuration",
  ]);
  const point = result.points.find((p) => p.label === "А");
  expect(point?.values.current).toBe(6);
  expect(point?.values["current:freightDuration"]).toBe(6);
});

test("one measure is columns and the rest are lines", () => {
  const spec = defaultChartSpec();
  spec.categoryField = "unit";
  spec.chartType = "bar";
  spec.dateFrom = null;
  spec.dateTo = null;
  spec.measures = [
    { fieldId: "__count__", aggregation: "count", axis: "y", mark: "bar" },
    { fieldId: "allDuration", aggregation: "sum", axis: "y", mark: "line" },
  ];
  const result = aggregateViolations(
    [row("А", 5), row("А", 1), row("Б", 2)],
    spec,
  );
  expect(result.series.map((s) => s.mark)).toEqual(["bar", "line"]);
});

test("combo chart draws columns for the bar measure and a line for the other", async () => {
  const series = [
    { id: "bars", label: "Число отказов", axis: "y" as const, mark: "bar" as const },
    { id: "line", label: "Все задержки, ч", axis: "y" as const, mark: "line" as const },
  ];
  const data = [
    { label: "А", value: 2, values: { bars: 2, line: 10 } },
    { label: "Б", value: 4, values: { bars: 4, line: 1 } },
  ];
  const { container } = render(
    <BuilderChart
      data={data}
      series={series}
      chartType="bar"
      valueLabel="значение"
      categoryLabel="ось"
      style={{ ...defaultChartStyle(), showPareto: false, showLabels: false }}
    />,
  );

  await waitFor(() => {
    expect(container.querySelectorAll("path.bar")).toHaveLength(2);
  });
  const bars = [...container.querySelectorAll("path.bar")];
  expect(bars.every((bar) => bar.getAttribute("fill")?.toLowerCase() === "#e53935")).toBe(
    true,
  );
  const lines = [...container.querySelectorAll("path")].filter(
    (path) =>
      path.getAttribute("fill") === "none" &&
      path.getAttribute("stroke")?.toLowerCase() === "#fb8c00",
  );
  expect(lines).toHaveLength(1);
  expect(container.querySelectorAll("circle")).toHaveLength(2);
});

function pathMinY(d: string | null): number {
  const ys = [...(d || "").matchAll(/[ML]([0-9.eE+-]+),([0-9.eE+-]+)/g)].map((m) =>
    Number(m[2]),
  );
  return ys.length ? Math.min(...ys) : Number.POSITIVE_INFINITY;
}

test("a smaller line measure keeps its own scale instead of collapsing onto the axis", async () => {
  const series = [
    { id: "bars", label: "Число отказов", axis: "y" as const, mark: "bar" as const },
    { id: "big", label: "Все задержки, ч", axis: "y" as const, mark: "line" as const },
    { id: "small", label: "Задержки пассажирских, ч", axis: "y" as const, mark: "line" as const },
  ];
  const data = [
    { label: "А", value: 5, values: { bars: 5, big: 100, small: 1 } },
    { label: "Б", value: 2, values: { bars: 2, big: 40, small: 2 } },
  ];
  const { container } = render(
    <BuilderChart
      data={data}
      series={series}
      chartType="bar"
      valueLabel="значение"
      categoryLabel="ось"
      style={{ ...defaultChartStyle(), showPareto: false, showLabels: false }}
    />,
  );

  await waitFor(() => {
    expect(container.querySelectorAll("path.series-line")).toHaveLength(2);
  });
  const drawn = [...container.querySelectorAll("path.series-line")];
  const big = drawn.find((path) => path.getAttribute("stroke")?.toLowerCase() === "#fb8c00");
  const small = drawn.find((path) => path.getAttribute("stroke")?.toLowerCase() === "#43a047");
  expect(big).toBeTruthy();
  expect(small).toBeTruthy();
  const bigTop = pathMinY(big?.getAttribute("d") ?? null);
  const smallTop = pathMinY(small?.getAttribute("d") ?? null);
  expect(smallTop).toBeLessThan(160);
  expect(Math.abs(smallTop - bigTop)).toBeLessThan(80);
});
