import { AggregatedPoint, ChartSeriesMeta } from "./types";
import { paretoCaption, paretoOf, paretoSeries } from "./pareto";

const series: ChartSeriesMeta[] = [{ id: "y:count:0", label: "Количество" }];

function point(label: string, amount: number): AggregatedPoint {
  return {
    label,
    value: amount,
    weight: amount,
    values: { "y:count:0": amount },
  };
}

describe("paretoOf", () => {
  it("marks the first category where the running share reaches 80%", () => {
    const result = paretoOf(
      [point("A", 50), point("B", 30), point("C", 20)],
      series,
    );
    expect(result.hitIndex).toBe(1);
    expect(result.steps.map((s) => Math.round(s.cumulative))).toEqual([50, 80, 100]);
    expect(paretoCaption(result)).toContain("«B»");
    expect(paretoCaption(result)).toContain("2-я из 3");
  });

  it("marks the first category when it already exceeds 80%", () => {
    const result = paretoOf([point("A", 90), point("B", 10)], series);
    expect(result.hitIndex).toBe(0);
    expect(paretoCaption(result)).toContain("уже на 1-й");
  });

  it("does not mark a threshold when every amount is zero", () => {
    const result = paretoOf([point("A", 0), point("B", 0)], series);
    expect(result.hitIndex).toBe(-1);
    expect(paretoCaption(result)).toBeNull();
  });
});

describe("paretoSeries", () => {
  it("sums color splits and keeps a single measure when several are grouped", () => {
    const colors: ChartSeriesMeta[] = [
      { id: "color:0:a", label: "A" },
      { id: "color:1:b", label: "B" },
    ];
    expect(paretoSeries(colors, "grouped").map((s) => s.id)).toEqual([
      "color:0:a",
      "color:1:b",
    ]);

    const measures: ChartSeriesMeta[] = [
      { id: "y:count:0", label: "Количество" },
      { id: "y:hours:1", label: "Часы" },
    ];
    expect(paretoSeries(measures, "grouped").map((s) => s.id)).toEqual(["y:count:0"]);
    expect(paretoSeries(measures, "stacked").map((s) => s.id)).toEqual([
      "y:count:0",
      "y:hours:1",
    ]);
  });
});
