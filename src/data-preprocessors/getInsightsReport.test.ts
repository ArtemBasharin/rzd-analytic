import {
  getInsightsReport,
  getComparisonWindows,
  rateTest,
  computePareto,
  findAnomalies,
  computeRecurrence,
  rowTotals,
  toIncident,
  Incident,
} from "./getInsightsReport";
import { getReportArr } from "./getReportArr";

const row = (
  id: number,
  date: string,
  unit: string,
  placeName: string,
  hours: number,
  reason = "Отказ",
  extra: Record<string, unknown> = {},
) => ({
  "ID отказа": id,
  "Начало отказа": date,
  "Виновное предприятие": unit,
  Место: placeName,
  "Причина 2 ур": reason,
  "Количество грузовых поездов(по месту)": 1,
  "Время грузовых поездов(по месту)": hours,
  ...extra,
});

const dateStart = new Date("2025-01-01T00:00:00").getTime();
const dateEnd = new Date("2025-06-30T23:59:59").getTime();

const rows = [
  // прошлый год
  row(1, "2024-02-10T10:00:00", "ПЧ-1", "ИНСКАЯ", 10),
  row(2, "2024-03-10T10:00:00", "ПЧ-2", "БИЙСК", 5),
  row(3, "2024-04-10T10:00:00", "ПЧ-1", "КУЛУНДА", 4),
  // текущий год
  row(4, "2025-02-10T10:00:00", "ПЧ-1", "ИНСКАЯ", 20),
  row(5, "2025-03-10T10:00:00", "ПЧ-1", "ИНСКАЯ", 8),
  row(6, "2025-03-20T10:00:00", "ПЧ-2", "БАРНАУЛ", 3),
  row(7, "2025-04-10T10:00:00", "ПЧ-3", "БАРНАУЛ", 6, "Сбой"),
];

describe("getInsightsReport", () => {
  const report = getInsightsReport(rows, dateStart, dateEnd);

  test("totals per period", () => {
    expect(report.totals.past.count).toBe(3);
    expect(report.totals.current.count).toBe(4);
    expect(report.totals.past.duration).toBe(19);
    expect(report.totals.current.duration).toBe(37);
  });

  test("totals match the stable report for split train columns", () => {
    const old = getReportArr(rows, dateStart, dateEnd);
    expect(report.totals.current.count).toBe(old[1].sum.currentYearTotalFails);
    expect(report.totals.past.count).toBe(old[0].sum.pastYearTotalFails);
    expect(report.totals.current.duration).toBe(old[1].sum.currentYearTotalDurations);
    expect(report.totals.past.duration).toBe(old[0].sum.pastYearTotalDurations);
  });

  test("decomposition adds up to the total change", () => {
    const d = report.decomposition;
    expect(d.frequencyEffect + d.severityEffect).toBeCloseTo(d.delta, 6);
    expect(d.delta).toBe(18);
  });

  test("driver contributions add up to the total change", () => {
    for (const drivers of Object.values(report.drivers)) {
      const sum = drivers.rows.reduce((acc, r) => acc + r.delta, 0);
      expect(sum).toBeCloseTo(report.decomposition.delta, 6);
      const shares = drivers.rows.reduce((acc, r) => acc + r.share, 0);
      expect(shares).toBeCloseTo(1, 6);
    }
    expect(report.drivers.units.worsened[0].key).toBe("ПЧ-1");
  });

  test("chronic, new and gone places", () => {
    const { chronic, fresh, gone } = report.recurrence;
    expect(chronic.map((p) => p.place)).toEqual(["ИНСКАЯ"]);
    expect(fresh.map((p) => p.place)).toEqual(["БАРНАУЛ"]);
    expect(gone.map((p) => p.place).sort()).toEqual(["БИЙСК", "КУЛУНДА"]);
  });

  test("repeats in the same place with the same reason within 30 days", () => {
    expect(report.recurrence.repeats).toHaveLength(1);
    expect(report.recurrence.repeats[0]).toMatchObject({
      place: "ИНСКАЯ",
      reason: "Отказ",
      count: 2,
    });
  });

  test("monthly timeline for a half-year period", () => {
    expect(report.timeline.granularity).toBe("month");
    expect(report.timeline.buckets).toHaveLength(6);
    const cur = report.timeline.buckets.reduce((a, b) => a + b.currentDuration, 0);
    const past = report.timeline.buckets.reduce((a, b) => a + b.pastDuration, 0);
    expect(cur).toBe(37);
    expect(past).toBe(19);
  });

  test("new reasons are listed", () => {
    expect(report.reasonTrends.fresh.map((r) => r.key)).toEqual(["Сбой"]);
  });

  test("headlines and attention list contain no NaN", () => {
    expect(report.headlines.length).toBeGreaterThan(0);
    const text = [...report.headlines, ...report.attention].map((s) => s.text).join(" ");
    expect(text).not.toMatch(/NaN|undefined|Infinity/);
  });

  test("labels are applied", () => {
    const labeled = getInsightsReport(rows, dateStart, dateEnd, {
      unit: (u) => `[${u}]`,
      place: (p) => `ст. ${p}`,
    });
    expect(labeled.drivers.units.worsened[0].label).toBe("[ПЧ-1]");
    expect(labeled.recurrence.chronic[0].label).toBe("ст. ИНСКАЯ");
  });

  test("empty data does not crash", () => {
    const empty = getInsightsReport([], dateStart, dateEnd);
    expect(empty.totals.current.count).toBe(0);
    expect(empty.headlines).toEqual([]);
    expect(empty.timeline.trend).toBe("flat");
    for (const period of Object.values(empty.totals)) {
      expect(Object.values(period).every(Number.isFinite)).toBe(true);
    }
  });
});

describe("rateTest", () => {
  test("small numbers are not significant", () => {
    expect(rateTest(5, 3).significant).toBe(false);
  });
  test("doubling on a large base is significant", () => {
    expect(rateTest(60, 30).significant).toBe(true);
  });
  test("equal counts give p = 1", () => {
    expect(rateTest(10, 10).pValue).toBeCloseTo(1, 6);
  });
});

describe("helpers", () => {
  test("comparison window is the same period one year back", () => {
    const { current, past } = getComparisonWindows(dateStart, dateEnd);
    expect(new Date(past.end).getFullYear()).toBe(2024);
    expect(Math.abs(current.days - past.days)).toBeLessThan(1.01);
  });

  test("falls back to the all-trains columns", () => {
    expect(
      rowTotals({
        "Количество всех поездов(по месту)": 8,
        "Время всех поездов(по месту)": 6.5,
      }),
    ).toMatchObject({ delayed: 8, duration: 6.5, mix: { unsplit: 6.5 } });
  });

  const incidents = (durations: number[]) =>
    durations.map((d, k) =>
      toIncident(row(k, "2025-03-01T10:00:00", `U${k}`, `P${k}`, d)),
    ) as Incident[];

  test("pareto counts the vital few", () => {
    const p = computePareto(incidents([50, 30, 10, 5, 5]), (i) => i.unit);
    expect(p.groups).toBe(5);
    expect(p.vitalFew).toBe(2);
  });

  test("anomaly is found", () => {
    const list = incidents([...Array(25).fill(1), 2, 1.5, 500]);
    const a = findAnomalies(list);
    expect(a.items.map((i) => i.duration)).toEqual([500]);
  });

  test("no anomalies on a small sample", () => {
    expect(findAnomalies(incidents([1, 2, 500])).items).toEqual([]);
  });

  test("repeats further apart than the window are not chained", () => {
    const list = [
      toIncident(row(1, "2025-01-01T10:00:00", "U", "P", 1)),
      toIncident(row(2, "2025-03-01T10:00:00", "U", "P", 1)),
    ] as Incident[];
    expect(computeRecurrence([], list).repeats).toEqual([]);
  });
});
