import {
  ID,
  startTime,
  freightDelayed,
  passDelayed,
  subDelayed,
  otherDelayed,
  allDelayed,
  freightDuration,
  passDuration,
  subDuration,
  otherDuration,
  allDuration,
  guiltyUnit,
  failReason,
  failKind,
  place,
} from "../utils/config";
import { cutDecimals, getDaysBetweenDates } from "../utils/functions";

/** Пороги аналитического отчёта. */
export const SIGNIFICANCE_ALPHA = 0.05;
export const PARETO_SHARE = 0.8;
export const ANOMALY_IQR_FACTOR = 3;
export const ANOMALY_MIN_SAMPLE = 20;
export const REPEAT_WINDOW_DAYS = 30;
export const TREND_RELATIVE_THRESHOLD = 0.2;
/** Новое место попадает в «Главное», если даёт не меньше этой доли потерь. */
export const HOTSPOT_MIN_SHARE = 0.05;
export const TOP_LIMIT = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export type TrainType = "freight" | "pass" | "sub" | "other" | "unsplit";

export const TRAIN_TYPE_LABELS: Record<TrainType, string> = {
  freight: "грузовые",
  pass: "пассажирские",
  sub: "пригородные",
  other: "прочие",
  unsplit: "без разбивки по видам",
};

const TRAIN_PARTS: { type: TrainType; delayed: string; duration: string }[] = [
  { type: "freight", delayed: freightDelayed, duration: freightDuration },
  { type: "pass", delayed: passDelayed, duration: passDuration },
  { type: "sub", delayed: subDelayed, duration: subDuration },
  { type: "other", delayed: otherDelayed, duration: otherDuration },
];

export interface Incident {
  id: unknown;
  time: number;
  unit: string;
  reason: string;
  kind: string;
  place: string;
  delayed: number;
  duration: number;
  mix: Record<TrainType, number>;
}

export interface Window {
  start: number;
  end: number;
  days: number;
}

export interface PeriodTotals {
  count: number;
  delayed: number;
  duration: number;
  hoursPerFail: number;
  trainsPerFail: number;
  hoursPerTrain: number;
  medianDuration: number;
  p90Duration: number;
}

export interface RateTest {
  pValue: number;
  significant: boolean;
}

export interface Decomposition {
  delta: number;
  frequencyEffect: number;
  severityEffect: number;
  /** Что объясняет изменение сильнее. */
  dominant: "frequency" | "severity" | "none";
}

export interface DriverRow {
  key: string;
  label: string;
  pastCount: number;
  currentCount: number;
  pastDuration: number;
  currentDuration: number;
  delta: number;
  share: number;
  test: RateTest;
}

export interface Drivers {
  rows: DriverRow[];
  worsened: DriverRow[];
  improved: DriverRow[];
}

export interface Pareto {
  groups: number;
  /** Сколько групп дают PARETO_SHARE потерь. */
  vitalFew: number;
  vitalFewShare: number;
  leaders: { label: string; duration: number; share: number }[];
}

export interface TimelineBucket {
  label: string;
  days: number;
  currentCount: number;
  pastCount: number;
  currentDuration: number;
  pastDuration: number;
}

export interface Timeline {
  granularity: "day" | "week" | "month";
  buckets: TimelineBucket[];
  trend: "up" | "down" | "flat" | "unknown";
  /** Изменение интенсивности (ч/сут) от начала к концу периода по линии тренда, доля от среднего. */
  trendRelative: number;
  outliers: string[];
}

export interface Seasonality {
  weekdays: { label: string; count: number; duration: number }[];
  peakWeekday: { label: string; share: number } | null;
  hours: { hour: number; count: number; duration: number }[];
  peakHours: { from: number; to: number; share: number } | null;
}

export interface PlaceChange {
  place: string;
  label: string;
  pastCount: number;
  currentCount: number;
  pastDuration: number;
  currentDuration: number;
}

export interface RepeatCase {
  place: string;
  placeLabel: string;
  reason: string;
  count: number;
  spanDays: number;
  duration: number;
  first: number;
  last: number;
}

export interface Recurrence {
  chronic: PlaceChange[];
  fresh: PlaceChange[];
  gone: PlaceChange[];
  repeats: RepeatCase[];
}

export interface Anomalies {
  threshold: number | null;
  items: Incident[];
  share: number;
}

export interface ReasonTrends {
  growing: DriverRow[];
  declining: DriverRow[];
  fresh: DriverRow[];
}

export interface TrainMixRow {
  type: TrainType;
  label: string;
  pastShare: number;
  currentShare: number;
  shiftPp: number;
}

export type Tone = "up" | "down" | "neutral";

export interface Statement {
  tone: Tone;
  text: string;
}

export interface InsightsReport {
  current: Window;
  past: Window;
  totals: { past: PeriodTotals; current: PeriodTotals };
  countTest: RateTest;
  decomposition: Decomposition;
  drivers: { units: Drivers; places: Drivers; reasons: Drivers };
  pareto: { units: Pareto; places: Pareto; reasons: Pareto; topIncidentsShare: number };
  timeline: Timeline;
  seasonality: Seasonality;
  recurrence: Recurrence;
  anomalies: Anomalies;
  reasonTrends: ReasonTrends;
  trainMix: TrainMixRow[];
  crossHotspots: { largest: DriverRow[]; growing: DriverRow[] };
  headlines: Statement[];
  attention: Statement[];
}

export interface Labels {
  unit: (value: string) => string;
  place: (value: string) => string;
}

const identity = (value: string) => value;

function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Задержки по видам поездов. Колонки «всех» используются, только если разбивки нет. */
export function rowTotals(row: any) {
  const mix: Record<TrainType, number> = {
    freight: 0,
    pass: 0,
    sub: 0,
    other: 0,
    unsplit: 0,
  };
  let delayed = 0;
  let duration = 0;
  let delayedSeen = false;
  let durationSeen = false;
  for (const part of TRAIN_PARTS) {
    const d = finiteNumber(row?.[part.delayed]);
    if (d != null) {
      delayedSeen = true;
      delayed += d;
    }
    const h = finiteNumber(row?.[part.duration]);
    if (h != null) {
      durationSeen = true;
      duration += h;
      mix[part.type] += h;
    }
  }
  if (!delayedSeen) delayed = finiteNumber(row?.[allDelayed]) ?? 0;
  if (!durationSeen) {
    duration = finiteNumber(row?.[allDuration]) ?? 0;
    mix.unsplit = duration;
  }
  return { delayed, duration, mix };
}

/** «Причина (12)» → «Причина»; как firstCharToLowerCase, но без смены регистра. */
function cleanReason(value: unknown): string {
  return value == null ? "" : String(value).replace(/\(\d+\)/g, "").trim();
}

export function toIncident(row: any): Incident | null {
  const time = Date.parse(row?.[startTime]);
  if (!Number.isFinite(time)) return null;
  const totals = rowTotals(row);
  return {
    id: row[ID],
    time,
    unit: row[guiltyUnit] ? String(row[guiltyUnit]) : "",
    reason: cleanReason(row[failReason]),
    kind: row[failKind] ? String(row[failKind]) : "",
    place: row[place] ? String(row[place]).trim() : "",
    ...totals,
  };
}

/** То же окно прошлого года, что у отчёта по станциям (getReportStationsArr). */
export function getComparisonWindows(dateStart: number, dateEnd: number) {
  const daysBetweenDates = getDaysBetweenDates(dateStart, dateEnd);
  const dateEndPastYear = new Date(dateEnd);
  dateEndPastYear.setFullYear(dateEndPastYear.getFullYear() - 1);
  const pastEnd = dateEndPastYear.getTime();
  const pastStart = pastEnd - daysBetweenDates * DAY_MS + 1000;
  const current: Window = {
    start: dateStart,
    end: dateEnd,
    days: Math.max((dateEnd - dateStart) / DAY_MS, 1 / 24),
  };
  const past: Window = {
    start: pastStart,
    end: pastEnd,
    days: Math.max((pastEnd - pastStart) / DAY_MS, 1 / 24),
  };
  return { current, past };
}

function inWindow(incident: Incident, w: Window) {
  return incident.time >= w.start && incident.time <= w.end;
}

const round = (n: number) => cutDecimals(n);

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const sumBy = <T>(items: T[], fn: (item: T) => number) =>
  items.reduce((acc, item) => acc + fn(item), 0);

export function computeTotals(incidents: Incident[]): PeriodTotals {
  const count = incidents.length;
  const delayed = sumBy(incidents, (i) => i.delayed);
  const duration = sumBy(incidents, (i) => i.duration);
  const durations = incidents.map((i) => i.duration).sort((a, b) => a - b);
  return {
    count,
    delayed,
    duration,
    hoursPerFail: count ? duration / count : 0,
    trainsPerFail: count ? delayed / count : 0,
    hoursPerTrain: delayed ? duration / delayed : 0,
    medianDuration: quantile(durations, 0.5),
    p90Duration: quantile(durations, 0.9),
  };
}

function logGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Точный двусторонний биномиальный тест. */
export function binomialTwoSided(k: number, n: number, p: number): number {
  if (n <= 0) return 1;
  if (p <= 0 || p >= 1) return 1;
  const logPmf = (i: number) =>
    logGamma(n + 1) -
    logGamma(i + 1) -
    logGamma(n - i + 1) +
    i * Math.log(p) +
    (n - i) * Math.log(1 - p);
  const observed = logPmf(k);
  let total = 0;
  for (let i = 0; i <= n; i++) {
    const lp = logPmf(i);
    if (lp <= observed + 1e-7) total += Math.exp(lp);
  }
  return Math.min(1, total);
}

/**
 * Сравнение двух пуассоновских частот: при равной интенсивности
 * current | current + past ~ Bin(n, days_cur / (days_cur + days_past)).
 */
export function rateTest(
  current: number,
  past: number,
  currentDays = 1,
  pastDays = 1,
): RateTest {
  const pValue = binomialTwoSided(
    current,
    current + past,
    currentDays / (currentDays + pastDays),
  );
  return { pValue, significant: pValue < SIGNIFICANCE_ALPHA };
}

export function decomposeChange(
  past: PeriodTotals,
  current: PeriodTotals,
): Decomposition {
  const delta = current.duration - past.duration;
  const frequencyEffect = (current.count - past.count) * past.hoursPerFail;
  const severityEffect = current.count * (current.hoursPerFail - past.hoursPerFail);
  let dominant: Decomposition["dominant"] = "none";
  if (delta !== 0 && past.count > 0) {
    dominant =
      Math.abs(frequencyEffect) >= Math.abs(severityEffect)
        ? "frequency"
        : "severity";
  }
  return { delta, frequencyEffect, severityEffect, dominant };
}

interface Group {
  pastCount: number;
  currentCount: number;
  pastDuration: number;
  currentDuration: number;
}

function groupBoth(
  past: Incident[],
  current: Incident[],
  keyFn: (i: Incident) => string,
) {
  const groups = new Map<string, Group>();
  const touch = (key: string) => {
    let g = groups.get(key);
    if (!g) {
      g = { pastCount: 0, currentCount: 0, pastDuration: 0, currentDuration: 0 };
      groups.set(key, g);
    }
    return g;
  };
  past.forEach((i) => {
    const key = keyFn(i);
    if (!key) return;
    const g = touch(key);
    g.pastCount++;
    g.pastDuration += i.duration;
  });
  current.forEach((i) => {
    const key = keyFn(i);
    if (!key) return;
    const g = touch(key);
    g.currentCount++;
    g.currentDuration += i.duration;
  });
  return groups;
}

export function computeDrivers(
  past: Incident[],
  current: Incident[],
  keyFn: (i: Incident) => string,
  labelFn: (key: string) => string = identity,
  windows?: { past: Window; current: Window },
): Drivers {
  const totalDelta = sumBy(current, (i) => i.duration) - sumBy(past, (i) => i.duration);
  const rows: DriverRow[] = [];
  groupBoth(past, current, keyFn).forEach((g, key) => {
    const delta = g.currentDuration - g.pastDuration;
    rows.push({
      key,
      label: labelFn(key),
      ...g,
      delta,
      share: totalDelta !== 0 ? delta / totalDelta : 0,
      test: rateTest(
        g.currentCount,
        g.pastCount,
        windows?.current.days,
        windows?.past.days,
      ),
    });
  });
  rows.sort((a, b) => b.delta - a.delta);
  return {
    rows,
    worsened: rows.filter((r) => r.delta > 0).slice(0, TOP_LIMIT),
    improved: rows
      .filter((r) => r.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, TOP_LIMIT),
  };
}

export function computePareto(
  incidents: Incident[],
  keyFn: (i: Incident) => string,
  labelFn: (key: string) => string = identity,
): Pareto {
  const byKey = new Map<string, number>();
  incidents.forEach((i) => {
    const key = keyFn(i);
    if (!key) return;
    byKey.set(key, (byKey.get(key) ?? 0) + i.duration);
  });
  const sorted = Array.from(byKey, ([key, duration]) => ({ key, duration })).sort(
    (a, b) => b.duration - a.duration,
  );
  const total = sumBy(sorted, (g) => g.duration);
  let vitalFew = 0;
  let acc = 0;
  if (total > 0) {
    for (const g of sorted) {
      acc += g.duration;
      vitalFew++;
      if (acc / total >= PARETO_SHARE - 1e-9) break;
    }
  }
  return {
    groups: sorted.length,
    vitalFew,
    vitalFewShare: sorted.length ? vitalFew / sorted.length : 0,
    leaders: sorted.slice(0, vitalFew).map((g) => ({
      label: labelFn(g.key),
      duration: g.duration,
      share: total ? g.duration / total : 0,
    })),
  };
}

export function topIncidentsShare(incidents: Incident[], top = TOP_LIMIT) {
  const total = sumBy(incidents, (i) => i.duration);
  if (!total) return 0;
  const largest = incidents
    .map((i) => i.duration)
    .sort((a, b) => b - a)
    .slice(0, top);
  return sumBy(largest, (d) => d) / total;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const ddmm = (t: number) => {
  const d = new Date(t);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
};
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function linearSlope(values: number[]) {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = sumBy(values, (v) => v) / n;
  let num = 0;
  let den = 0;
  values.forEach((v, x) => {
    num += (x - meanX) * (v - meanY);
    den += (x - meanX) ** 2;
  });
  return den ? num / den : 0;
}

export function computeTimeline(
  past: Incident[],
  current: Incident[],
  windows: { past: Window; current: Window },
): Timeline {
  const { current: cw, past: pw } = windows;
  const granularity: Timeline["granularity"] =
    cw.days >= 90 ? "month" : cw.days >= 14 ? "week" : "day";

  const buckets: TimelineBucket[] = [];
  let indexOf: (t: number, w: Window) => number;

  if (granularity === "month") {
    const monthNo = (t: number) => {
      const d = new Date(t);
      return d.getFullYear() * 12 + d.getMonth();
    };
    indexOf = (t, w) => monthNo(t) - monthNo(w.start);
    const first = monthNo(cw.start);
    const last = monthNo(cw.end);
    for (let m = first; m <= last; m++) {
      const year = Math.floor(m / 12);
      const month = m % 12;
      const from = Math.max(new Date(year, month, 1).getTime(), cw.start);
      const to = Math.min(new Date(year, month + 1, 1).getTime(), cw.end);
      buckets.push({
        label: `${MONTHS[month]} ${year}`,
        days: Math.max((to - from) / DAY_MS, 0),
        currentCount: 0,
        pastCount: 0,
        currentDuration: 0,
        pastDuration: 0,
      });
    }
  } else {
    const step = granularity === "week" ? 7 * DAY_MS : DAY_MS;
    indexOf = (t, w) => Math.floor((t - w.start) / step);
    for (let from = cw.start; from <= cw.end; from += step) {
      const to = Math.min(from + step, cw.end);
      buckets.push({
        label:
          granularity === "week" ? `${ddmm(from)}–${ddmm(to)}` : ddmm(from),
        days: Math.max((to - from) / DAY_MS, 0),
        currentCount: 0,
        pastCount: 0,
        currentDuration: 0,
        pastDuration: 0,
      });
    }
  }

  const assign = (i: Incident, w: Window, isCurrent: boolean) => {
    const idx = Math.min(Math.max(indexOf(i.time, w), 0), buckets.length - 1);
    const b = buckets[idx];
    if (!b) return;
    if (isCurrent) {
      b.currentCount++;
      b.currentDuration += i.duration;
    } else {
      b.pastCount++;
      b.pastDuration += i.duration;
    }
  };
  current.forEach((i) => assign(i, cw, true));
  past.forEach((i) => assign(i, pw, false));

  // Неполный последний интервал сравниваем по интенсивности (ч/сут), а не по сумме.
  const usable = buckets.filter((b) => b.days >= 0.5);
  const rates = usable.map((b) => b.currentDuration / b.days);
  let trend: Timeline["trend"] = "unknown";
  let trendRelative = 0;
  const outliers: string[] = [];
  if (rates.length >= 3) {
    const mean = sumBy(rates, (r) => r) / rates.length;
    if (mean > 0) {
      trendRelative = (linearSlope(rates) * (rates.length - 1)) / mean;
      trend =
        trendRelative > TREND_RELATIVE_THRESHOLD
          ? "up"
          : trendRelative < -TREND_RELATIVE_THRESHOLD
            ? "down"
            : "flat";
    } else {
      trend = "flat";
    }
    if (rates.length >= 4) {
      const sd = Math.sqrt(
        sumBy(rates, (r) => (r - mean) ** 2) / (rates.length - 1),
      );
      usable.forEach((b, i) => {
        if (sd > 0 && rates[i] > mean + 2 * sd) outliers.push(b.label);
      });
    }
  }

  return { granularity, buckets, trend, trendRelative, outliers };
}

const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export function computeSeasonality(incidents: Incident[]): Seasonality {
  const weekdays = WEEKDAYS.map((label) => ({ label, count: 0, duration: 0 }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
    duration: 0,
  }));
  incidents.forEach((i) => {
    const d = new Date(i.time);
    const wd = weekdays[(d.getDay() + 6) % 7];
    wd.count++;
    wd.duration += i.duration;
    const h = hours[d.getHours()];
    h.count++;
    h.duration += i.duration;
  });

  const total = incidents.length;
  let peakWeekday: Seasonality["peakWeekday"] = null;
  let peakHours: Seasonality["peakHours"] = null;
  if (total) {
    const top = weekdays.reduce((a, b) => (b.count > a.count ? b : a));
    peakWeekday = { label: top.label, share: top.count / total };
    let best = { from: 0, count: -1 };
    for (let from = 0; from < 24; from++) {
      const count =
        hours[from].count + hours[(from + 1) % 24].count + hours[(from + 2) % 24].count;
      if (count > best.count) best = { from, count };
    }
    peakHours = { from: best.from, to: (best.from + 3) % 24, share: best.count / total };
  }
  return { weekdays, peakWeekday, hours, peakHours };
}

export function computeRecurrence(
  past: Incident[],
  current: Incident[],
  placeLabel: (value: string) => string = identity,
): Recurrence {
  const chronic: PlaceChange[] = [];
  const fresh: PlaceChange[] = [];
  const gone: PlaceChange[] = [];
  groupBoth(past, current, (i) => i.place).forEach((g, key) => {
    const row = { place: key, label: placeLabel(key), ...g };
    if (g.pastCount && g.currentCount) chronic.push(row);
    else if (g.currentCount) fresh.push(row);
    else gone.push(row);
  });
  chronic.sort((a, b) => b.currentDuration - a.currentDuration);
  fresh.sort((a, b) => b.currentDuration - a.currentDuration);
  gone.sort((a, b) => b.pastDuration - a.pastDuration);

  const byPlaceReason = new Map<string, Incident[]>();
  current.forEach((i) => {
    if (!i.place || !i.reason) return;
    const key = `${i.place}\u0000${i.reason}`;
    const list = byPlaceReason.get(key) ?? [];
    list.push(i);
    byPlaceReason.set(key, list);
  });
  const repeats: RepeatCase[] = [];
  byPlaceReason.forEach((list) => {
    if (list.length < 2) return;
    list.sort((a, b) => a.time - b.time);
    // Самая длинная цепочка, где соседние случаи не дальше окна повторов.
    let best: Incident[] = [];
    let chain: Incident[] = [list[0]];
    for (let k = 1; k < list.length; k++) {
      if (list[k].time - list[k - 1].time <= REPEAT_WINDOW_DAYS * DAY_MS) {
        chain.push(list[k]);
      } else {
        if (chain.length > best.length) best = chain;
        chain = [list[k]];
      }
    }
    if (chain.length > best.length) best = chain;
    if (best.length < 2) return;
    const first = best[0].time;
    const last = best[best.length - 1].time;
    repeats.push({
      place: best[0].place,
      placeLabel: placeLabel(best[0].place),
      reason: best[0].reason,
      count: best.length,
      spanDays: Math.max(1, Math.round((last - first) / DAY_MS)),
      duration: sumBy(best, (i) => i.duration),
      first,
      last,
    });
  });
  repeats.sort((a, b) => b.count - a.count || b.duration - a.duration);
  return { chronic, fresh, gone, repeats };
}

export function findAnomalies(incidents: Incident[]): Anomalies {
  const total = sumBy(incidents, (i) => i.duration);
  if (incidents.length < ANOMALY_MIN_SAMPLE) {
    return { threshold: null, items: [], share: 0 };
  }
  const sorted = incidents.map((i) => i.duration).sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  let threshold = q3 + ANOMALY_IQR_FACTOR * (q3 - q1);
  // Много одинаковых значений → IQR = 0; берём 99-й перцентиль.
  if (q3 - q1 === 0) threshold = quantile(sorted, 0.99);
  const items = incidents
    .filter((i) => i.duration > threshold && i.duration > 0)
    .sort((a, b) => b.duration - a.duration);
  return {
    threshold,
    items,
    share: total ? sumBy(items, (i) => i.duration) / total : 0,
  };
}

export function computeReasonTrends(drivers: Drivers): ReasonTrends {
  const byCount = [...drivers.rows].sort(
    (a, b) => b.currentCount - b.pastCount - (a.currentCount - a.pastCount),
  );
  return {
    growing: byCount
      .filter((r) => r.pastCount > 0 && r.currentCount > r.pastCount)
      .slice(0, TOP_LIMIT),
    declining: byCount
      .filter((r) => r.currentCount < r.pastCount)
      .reverse()
      .slice(0, TOP_LIMIT),
    fresh: drivers.rows
      .filter((r) => r.pastCount === 0 && r.currentCount > 0)
      .sort((a, b) => b.currentDuration - a.currentDuration)
      .slice(0, TOP_LIMIT),
  };
}

export function computeTrainMix(past: Incident[], current: Incident[]): TrainMixRow[] {
  const types = Object.keys(TRAIN_TYPE_LABELS) as TrainType[];
  const sumMix = (list: Incident[]) => {
    const out = Object.fromEntries(types.map((t) => [t, 0])) as Record<TrainType, number>;
    list.forEach((i) => types.forEach((t) => (out[t] += i.mix[t])));
    return out;
  };
  const p = sumMix(past);
  const c = sumMix(current);
  const pTotal = sumBy(types, (t) => p[t]);
  const cTotal = sumBy(types, (t) => c[t]);
  return types
    .map((type) => {
      const pastShare = pTotal ? p[type] / pTotal : 0;
      const currentShare = cTotal ? c[type] / cTotal : 0;
      return {
        type,
        label: TRAIN_TYPE_LABELS[type],
        pastShare,
        currentShare,
        shiftPp: (currentShare - pastShare) * 100,
      };
    })
    .filter((r) => r.pastShare > 0 || r.currentShare > 0);
}

const pct = (share: number) => `${round(share * 100)}%`;
const fmtHours = (n: number) => `${round(n)} ч`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${round(Math.abs(n))}`;
const relChange = (cur: number, prev: number) =>
  prev ? `${signed(((cur - prev) / prev) * 100)}%` : "";
const toneOf = (delta: number): Tone => (delta > 0 ? "up" : delta < 0 ? "down" : "neutral");
const dateRu = (t: number) => new Date(t).toLocaleDateString("ru-RU");

function namesList(rows: { label: string }[]) {
  const names = rows.map((r) => r.label);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} и ${names[names.length - 1]}`;
}

/** Главные изменения, выбранные по величине эффекта. */
export function buildHeadlines(r: Omit<InsightsReport, "headlines" | "attention">): Statement[] {
  const out: Statement[] = [];
  const { past, current } = r.totals;
  if (!past.count && !current.count) return out;

  const delta = current.duration - past.duration;
  out.push({
    tone: toneOf(delta),
    text:
      `Поездо-часы задержек: ${fmtHours(current.duration)} против ${fmtHours(past.duration)} ` +
      `годом ранее` +
      (past.duration ? ` (${relChange(current.duration, past.duration)}, ${signed(delta)} ч).` : "."),
  });

  out.push({
    tone: r.countTest.significant ? toneOf(current.count - past.count) : "neutral",
    text:
      `Количество ТН: ${current.count} против ${past.count}` +
      (current.count === past.count
        ? " – без изменений."
        : r.countTest.significant
          ? " – изменение статистически значимо."
          : " – изменение в пределах случайных колебаний."),
  });

  const d = r.decomposition;
  if (d.dominant !== "none") {
    out.push({
      tone: toneOf(delta),
      text:
        d.dominant === "frequency"
          ? `Изменение потерь объясняется главным образом частотой ТН (${signed(d.frequencyEffect)} ч), а не их тяжестью (${signed(d.severityEffect)} ч).`
          : `Изменение потерь объясняется главным образом тяжестью ТН: в среднем ${fmtHours(current.hoursPerFail)} на ТН против ${fmtHours(past.hoursPerFail)} (${signed(d.severityEffect)} ч), частота дала ${signed(d.frequencyEffect)} ч.`,
    });
  }

  if (delta !== 0) {
    const sameWay = (delta > 0 ? r.drivers.units.worsened : r.drivers.units.improved).slice(0, 2);
    const share = sumBy(sameWay, (x) => x.delta) / delta;
    if (sameWay.length && share > 0) {
      out.push({
        tone: toneOf(delta),
        text: `${pct(Math.min(share, 1))} ${delta > 0 ? "прироста" : "снижения"} потерь дали ${namesList(sameWay)}.`,
      });
    }
  }

  const hotspot = r.recurrence.fresh[0];
  if (hotspot && current.duration && hotspot.currentDuration / current.duration >= HOTSPOT_MIN_SHARE) {
    out.push({
      tone: "up",
      text: `Новое место допущения ТН со значительными потерями: ${hotspot.label} –${fmtHours(hotspot.currentDuration)} (${pct(hotspot.currentDuration / current.duration)} потерь), годом ранее ТН не было.`,
    });
  }

  if (r.anomalies.items.length) {
    out.push({
      tone: "neutral",
      text: `${r.anomalies.items.length} аномально крупных ТН дали ${pct(r.anomalies.share)} всех потерь.`,
    });
  }

  if (r.pareto.units.groups >= 5) {
    out.push({
      tone: "neutral",
      text: `${pct(PARETO_SHARE)} потерь приходится на ${r.pareto.units.vitalFew} из ${r.pareto.units.groups} подразделений.`,
    });
  }

  return out.slice(0, 6);
}

/** Зоны внимания для разбора. */
export function buildAttentionList(r: Omit<InsightsReport, "headlines" | "attention">): Statement[] {
  const out: Statement[] = [];

  r.drivers.units.worsened
    .filter((x) => x.test.significant && x.currentCount > x.pastCount)
    .slice(0, 3)
    .forEach((x) =>
      out.push({
        tone: "up",
        text: `${x.label}: рост количества ТН с ${x.pastCount} до ${x.currentCount} (статистически значимо), потери ${signed(x.delta)} ч – рекомендуется проанализировать причины.`,
      }),
    );

  r.recurrence.chronic
    .filter((x) => x.currentDuration > x.pastDuration)
    .slice(0, 3)
    .forEach((x) =>
      out.push({
        tone: "up",
        text: `${x.label}: ТН допускаются второй год подряд, потери выросли с ${fmtHours(x.pastDuration)} до ${fmtHours(x.currentDuration)}.`,
      }),
    );

  r.recurrence.repeats.slice(0, 3).forEach((x) =>
    out.push({
      tone: "up",
      text: `${x.placeLabel}: причина «${x.reason}» повторилась ${x.count} раз за ${x.spanDays} дн. (${dateRu(x.first)}–${dateRu(x.last)}) – признак неустранённой первопричины.`,
    }),
  );

  r.reasonTrends.growing
    .filter((x) => x.test.significant)
    .slice(0, 2)
    .forEach((x) =>
      out.push({
        tone: "up",
        text: `Причина «${x.label}»: рост с ${x.pastCount} до ${x.currentCount} ТН (статистически значимо).`,
      }),
    );

  r.anomalies.items.slice(0, 2).forEach((x) =>
    out.push({
      tone: "neutral",
      text: `ТН №${x.id} от ${dateRu(x.time)} – аномально крупный (${fmtHours(x.duration)}); рекомендуется отдельный разбор.`,
    }),
  );

  return out;
}

export function getInsightsReport(
  rows: any[],
  dateStart: number,
  dateEnd: number,
  labels: Partial<Labels> = {},
): InsightsReport {
  const unitLabel = labels.unit ?? identity;
  const placeLabel = labels.place ?? identity;
  const windows = getComparisonWindows(dateStart, dateEnd);

  const incidents = (rows ?? [])
    .map(toIncident)
    .filter((i): i is Incident => i !== null);
  const current = incidents.filter((i) => inWindow(i, windows.current));
  const past = incidents.filter((i) => inWindow(i, windows.past));

  const totals = { past: computeTotals(past), current: computeTotals(current) };
  const reasonDrivers = computeDrivers(past, current, (i) => i.reason, identity, windows);

  const base: Omit<InsightsReport, "headlines" | "attention"> = {
    ...windows,
    totals,
    countTest: rateTest(
      totals.current.count,
      totals.past.count,
      windows.current.days,
      windows.past.days,
    ),
    decomposition: decomposeChange(totals.past, totals.current),
    drivers: {
      units: computeDrivers(past, current, (i) => i.unit, unitLabel, windows),
      places: computeDrivers(past, current, (i) => i.place, placeLabel, windows),
      reasons: reasonDrivers,
    },
    pareto: {
      units: computePareto(current, (i) => i.unit, unitLabel),
      places: computePareto(current, (i) => i.place, placeLabel),
      reasons: computePareto(current, (i) => i.reason),
      topIncidentsShare: topIncidentsShare(current),
    },
    timeline: computeTimeline(past, current, windows),
    seasonality: computeSeasonality(current),
    recurrence: computeRecurrence(past, current, placeLabel),
    anomalies: findAnomalies(current),
    reasonTrends: computeReasonTrends(reasonDrivers),
    trainMix: computeTrainMix(past, current),
    crossHotspots: (() => {
      const d = computeDrivers(
        past,
        current,
        (i) => (i.unit && i.place ? `${i.unit}\u0000${i.place}` : ""),
        (key) => {
          const [unit, plc] = key.split("\u0000");
          return `${unitLabel(unit)} × ${placeLabel(plc)}`;
        },
        windows,
      );
      return {
        largest: [...d.rows]
          .sort((a, b) => b.currentDuration - a.currentDuration)
          .slice(0, TOP_LIMIT),
        growing: d.worsened,
      };
    })(),
  };

  return {
    ...base,
    headlines: buildHeadlines(base),
    attention: buildAttentionList(base),
  };
}
