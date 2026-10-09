import { aggregateViolations } from "./aggregate";
import { defaultChartSpec } from "./types";
import { Violation } from "../types/violation";

function row(unit: string, hours: number, start: string): Violation {
  return {
    "Виновное предприятие": unit,
    "Причина 2 ур": "Причина",
    "Начало отказа": start,
    Категория: "К",
    Место: "Станция",
    "Вид технологического нарушения": "Вид",
    "Время грузовых поездов(по месту)": hours,
  };
}

test("columns are ordered by descending height when the current period is empty", () => {
  const spec = defaultChartSpec();
  spec.categoryField = "unit";
  spec.chartType = "bar";
  spec.compareMode = "yoy";
  spec.sortBy = "auto";
  spec.sortDir = "desc";
  spec.dateFrom = new Date(2026, 8, 1).getTime();
  spec.dateTo = new Date(2026, 8, 29, 23, 59, 59, 999).getTime();
  spec.measures = [{ fieldId: "freightDuration", aggregation: "sum", axis: "y", mark: "bar" }];

  const past = "2025-09-10T12:00:00";
  const result = aggregateViolations(
    [
      row("Малый", 1.3, past),
      row("Крупный", 47.17, past),
      row("Средний", 6.7, past),
      row("Пустой", 0, "2026-09-10T12:00:00"),
    ],
    spec,
  );

  expect(result.points.map((p) => p.label)).toEqual(["Крупный", "Средний", "Малый", "Пустой"]);
});

test("a single series is ordered by descending value by default", () => {
  const spec = defaultChartSpec();
  spec.categoryField = "unit";
  spec.dateFrom = null;
  spec.dateTo = null;
  spec.measures = [{ fieldId: "freightDuration", aggregation: "sum", axis: "y", mark: "bar" }];

  const result = aggregateViolations(
    [
      row("А", 1, "2026-09-10T12:00:00"),
      row("Б", 10, "2026-09-10T12:00:00"),
      row("В", 3, "2026-09-10T12:00:00"),
    ],
    spec,
  );

  expect(result.points.map((p) => p.label)).toEqual(["Б", "В", "А"]);
});

test("ascending sort reverses column order", () => {
  const spec = defaultChartSpec();
  spec.categoryField = "unit";
  spec.sortDir = "asc";
  spec.dateFrom = null;
  spec.dateTo = null;
  spec.measures = [{ fieldId: "freightDuration", aggregation: "sum", axis: "y", mark: "bar" }];

  const result = aggregateViolations(
    [
      row("А", 1, "2026-09-10T12:00:00"),
      row("Б", 10, "2026-09-10T12:00:00"),
      row("В", 3, "2026-09-10T12:00:00"),
    ],
    spec,
  );

  expect(result.points.map((p) => p.label)).toEqual(["А", "В", "Б"]);
});

test("a time axis stays in calendar order by default", () => {
  const spec = defaultChartSpec();
  spec.categoryField = "month";
  spec.dateFrom = null;
  spec.dateTo = null;
  spec.measures = [{ fieldId: "freightDuration", aggregation: "sum", axis: "y", mark: "bar" }];

  const result = aggregateViolations(
    [
      row("А", 1, "2026-03-10T12:00:00"),
      row("А", 50, "2026-01-10T12:00:00"),
      row("А", 5, "2026-02-10T12:00:00"),
    ],
    spec,
  );

  expect(result.points.map((p) => p.label)).toEqual(["2026-01", "2026-02", "2026-03"]);
});
