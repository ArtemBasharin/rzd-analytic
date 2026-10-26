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
  expect(result.series.map((s) => s.scaleKey)).toEqual(["hours", "hours", "hours", "hours"]);
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
  expect(result.series.map((s) => s.scaleKey)).toEqual(["count", "hours"]);
});

test("measures share a scale key only when they are the same unit", () => {
  const spec = defaultChartSpec();
  spec.categoryField = "unit";
  spec.chartType = "bar";
  spec.dateFrom = null;
  spec.dateTo = null;
  spec.measures = [
    { fieldId: "__count__", aggregation: "count", axis: "y", mark: "bar" },
    { fieldId: "allDelayed", aggregation: "sum", axis: "y", mark: "line" },
    { fieldId: "freightDuration", aggregation: "sum", axis: "y", mark: "line" },
    { fieldId: "passDuration", aggregation: "count", axis: "y", mark: "line" },
  ];
  const result = aggregateViolations([row("А", 5)], spec);
  expect(result.series.map((s) => s.scaleKey)).toEqual([
    "count",
    "trains",
    "hours",
    "count",
  ]);
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

test("a line in the same unit uses the column scale and no extra axis", async () => {
  const series = [
    {
      id: "bars",
      label: "Все задержки, ч",
      axis: "y" as const,
      mark: "bar" as const,
      scaleKey: "hours",
    },
    {
      id: "line",
      label: "Задержки пригородных, ч",
      axis: "y" as const,
      mark: "line" as const,
      scaleKey: "hours",
    },
  ];
  const data = [
    { label: "А", value: 40, values: { bars: 40, line: 8 } },
    { label: "Б", value: 10, values: { bars: 10, line: 2 } },
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
    expect(container.querySelectorAll("path.series-line")).toHaveLength(1);
  });
  const barTop = Math.min(
    ...[...container.querySelectorAll("path.bar")].map((bar) =>
      pathMinY(bar.getAttribute("d")),
    ),
  );
  const lineTop = pathMinY(
    container.querySelector("path.series-line")?.getAttribute("d") ?? null,
  );
  expect(lineTop).toBeGreaterThan(barTop + 40);
  expect(container.querySelectorAll(".domain")).toHaveLength(2);
});

test("lines of one unit share a scale, and a different unit keeps its own axis", async () => {
  const series = [
    {
      id: "bars",
      label: "Число отказов",
      axis: "y" as const,
      mark: "bar" as const,
      scaleKey: "count",
    },
    {
      id: "big",
      label: "Все задержки, ч",
      axis: "y" as const,
      mark: "line" as const,
      scaleKey: "hours",
    },
    {
      id: "small",
      label: "Задержки пассажирских, ч",
      axis: "y" as const,
      mark: "line" as const,
      scaleKey: "hours",
    },
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
  const barTop = Math.min(
    ...[...container.querySelectorAll("path.bar")].map((bar) =>
      pathMinY(bar.getAttribute("d")),
    ),
  );
  const bigTop = pathMinY(big?.getAttribute("d") ?? null);
  const smallTop = pathMinY(small?.getAttribute("d") ?? null);
  expect(Math.abs(barTop - bigTop)).toBeLessThan(80);
  expect(smallTop).toBeGreaterThan(bigTop + 40);
  expect(container.querySelectorAll(".domain")).toHaveLength(3);
});

test("a smaller label moves below a larger one and zeros stay unlabeled", async () => {
  const series = [
    {
      id: "bars",
      label: "Все задержки, ч",
      axis: "y" as const,
      mark: "bar" as const,
      scaleKey: "hours",
    },
    {
      id: "line",
      label: "Задержки пригородных, ч",
      axis: "y" as const,
      mark: "line" as const,
      scaleKey: "hours",
    },
  ];
  const data = [
    { label: "А", value: 0.1, values: { bars: 0.1, line: 0.7 } },
    { label: "Б", value: 40, values: { bars: 40, line: 0 } },
    { label: "В", value: 0, values: { bars: 0, line: 0 } },
  ];
  const { container } = render(
    <BuilderChart
      data={data}
      series={series}
      chartType="bar"
      valueLabel="значение"
      categoryLabel="ось"
      style={{ ...defaultChartStyle(), showPareto: false, showLabels: true }}
    />,
  );

  await waitFor(() => {
    expect(container.querySelectorAll(".bar-value-label, .line-value-label").length).toBeGreaterThan(0);
  });
  const labels = [...container.querySelectorAll(".bar-value-label, .line-value-label")];
  const parsed = labels.map((el) => ({
    y: Number(el.getAttribute("y")),
    value: Number((el.textContent || "").replace(/\s/g, "").replace(",", ".")),
  }));
  expect(parsed.some((item) => item.value === 0)).toBe(false);
  const small = parsed.find((item) => item.value === 0.1);
  const peak = parsed.find((item) => item.value === 0.7);
  expect(small).toBeTruthy();
  expect(peak).toBeTruthy();
  expect(small!.y).toBeGreaterThan(peak!.y);
});
