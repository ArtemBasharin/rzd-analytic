import { Violation } from "../types/violation";
import { collectFilterOptions, DateWindow } from "./dataFilters";

function at(year: number, month: number, day: number): number {
  return new Date(year, month, day, 12).getTime();
}

function windowOf(year: number, month: number): DateWindow {
  const from = new Date(year, month, 1, 0, 0, 0, 0).getTime();
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return { dateFrom: from, dateTo: to };
}

function row(
  unit: string,
  reason: string,
  when: number,
  extra: Partial<Violation> = {},
): Violation {
  return {
    "Виновное предприятие": unit,
    "Причина 2 ур": reason,
    "Начало отказа": new Date(when).toISOString(),
    Категория: "К",
    Место: "Станция",
    "Вид технологического нарушения": "Вид",
    ...extra,
  };
}

function countOf(
  options: { value: string; count: number }[],
  value: string,
): number | undefined {
  return options.find((option) => option.value === value)?.count;
}

const rows = [
  row("А", "Р1", at(2024, 0, 10)),
  row("А", "Р1", at(2024, 0, 12)),
  row("Б", "Р2", at(2024, 0, 14)),
  row("Б", "Р2", at(2024, 0, 16)),
  row("Б", "Р2", at(2024, 0, 18)),
  row("В", "Р1", at(2024, 5, 15)),
  row("А", "Р1", at(2025, 0, 10), {
    "Количество грузовых поездов(по месту)": 1,
  }),
];

describe("collectFilterOptions", () => {
  it("narrows reasons by unit and units by reason", () => {
    const byUnit = collectFilterOptions(rows, { units: ["А"] });
    expect(countOf(byUnit.options.reasons, "Р1")).toBe(3);
    expect(countOf(byUnit.options.reasons, "Р2")).toBeUndefined();
    expect(countOf(byUnit.options.units, "Б")).toBe(3);

    const byReason = collectFilterOptions(rows, { reasons: ["Р2"] });
    expect(countOf(byReason.options.units, "Б")).toBe(3);
    expect(countOf(byReason.options.units, "А")).toBeUndefined();
    expect(countOf(byReason.options.reasons, "Р1")).toBe(4);
  });

  it("does not hide other values of the same list", () => {
    const facets = collectFilterOptions(rows, { units: ["А", "Б"] });
    expect(countOf(facets.options.units, "А")).toBe(3);
    expect(countOf(facets.options.units, "Б")).toBe(3);
    expect(countOf(facets.options.units, "В")).toBe(1);
  });

  it("keeps an incompatible selection with a zero count", () => {
    const facets = collectFilterOptions(rows, {
      units: ["А"],
      reasons: ["Р2"],
    });
    expect(countOf(facets.options.units, "А")).toBe(0);
    expect(countOf(facets.options.reasons, "Р2")).toBe(0);
    expect(facets.options.units[0]?.value).toBe("А");
    expect(facets.options.reasons[0]?.value).toBe("Р2");
    expect(facets.matched).toBe(0);
    expect(facets.scoped).toBe(rows.length);
  });

  it("applies delay limits before list counts", () => {
    const open = collectFilterOptions(rows, {});
    const delayed = collectFilterOptions(rows, { onlyWithDelays: true });
    expect(countOf(open.options.units, "А")).toBe(3);
    expect(countOf(delayed.options.units, "А")).toBe(1);
    expect(countOf(delayed.options.units, "Б")).toBeUndefined();
    expect(delayed.matched).toBe(1);
    expect(delayed.scoped).toBe(rows.length);

    const minHours = collectFilterOptions(rows, { minDelayHours: 2 });
    const withHours = row("А", "Р1", at(2024, 0, 20), {
      "Время грузовых поездов(по месту)": 3,
    });
    const counted = collectFilterOptions([...rows, withHours], {
      minDelayHours: 2,
    });
    expect(minHours.matched).toBe(0);
    expect(countOf(counted.options.units, "А")).toBe(1);
  });

  it("counts a row only when it falls inside one of the chart periods", () => {
    const periods = [windowOf(2024, 0), windowOf(2025, 0)];
    const facets = collectFilterOptions(rows, {}, periods);
    expect(facets.scoped).toBe(6);
    expect(countOf(facets.options.units, "В")).toBeUndefined();
    expect(countOf(facets.options.units, "А")).toBe(3);
    expect(countOf(facets.options.units, "Б")).toBe(3);
  });
});
