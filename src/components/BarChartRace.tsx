import React, { useEffect, useRef } from "react";
import { useSelector as useReduxSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../redux/store";
import * as d3 from "d3";
import { displayUnitName } from "../utils/functions";
import { dayDurationsMs } from "../utils/raceTiming";

const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

/** Доля линейного хода внутри сглаживания, чтобы полоса не замирала в начале крупного прироста. */
const LINEAR_FLOOR = 0.28;

type RaceInput = {
  date: Date | string | number;
  name: string;
  totalDuration: number;
};

type Delta = { name: string; delta: number };

type EventPoint = {
  time: number;
  deltas: Delta[];
  mag: number;
};

type DaySlot = {
  time: number;
  eventIndex: number | null;
  holdIndex: number;
  startMs: number;
  durationMs: number;
  /** 1 — обычный grow, 2 — в этот день есть полоса с удвоенным отрастанием. */
  growStretch: number;
};

type Row = {
  name: string;
  value: number;
  tip: number;
  delta: number;
  surge: number;
  from: number;
  to: number;
  isNew: boolean;
  /** 1 или 2: однократное удлинение отрастания для крупного прироста. */
  growStretch: number;
  opacity: number;
  rank: number;
};

type PhaseName = "room" | "name" | "grow" | "move";

const EMPTY = new Map<string, number>();

function quad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
}

/** Линейно для мелких добавок, с разгоном и торможением — для крупных. */
function accelEase(t: number, intensity: number): number {
  const shaped = quad(t) * (1 - LINEAR_FLOOR) + t * LINEAR_FLOOR;
  return t + (shaped - t) * intensity;
}

function jumpIntensity(from: number, delta: number, typical: number): number {
  if (delta <= 1e-9) return 0;
  const rel = delta / (from + delta);
  const abs = 1 - Math.exp(-delta / Math.max(typical, 1e-6));
  return Math.min(1, Math.max(rel, abs));
}

/**
 * Однократное удлинение ×2:
 * — существующая полоса выросла больше чем на 50%;
 * — новая полоса больше самой большой существующей более чем на 30%.
 */
function growStretchForDelta(
  from: number,
  to: number,
  isNew: boolean,
  maxExisting: number,
): number {
  const delta = Math.max(0, to - from);
  if (delta <= 1e-9) return 1;
  if (!isNew && from > 1e-9 && delta / from > 0.5) return 2;
  if (isNew && maxExisting > 1e-9 && to > maxExisting * 1.3) return 2;
  return 1;
}

function eventGrowStretch(
  before: Map<string, number>,
  afterMap: Map<string, number>,
): number {
  let maxExisting = 0;
  before.forEach((value) => {
    if (value > maxExisting) maxExisting = value;
  });
  let stretch = 1;
  afterMap.forEach((to, name) => {
    const from = before.get(name) ?? 0;
    const isNew = from <= 1e-9 && to > 0;
    stretch = Math.max(stretch, growStretchForDelta(from, to, isNew, maxExisting));
  });
  return stretch;
}

function formatHours(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 100) return d3.format(",.0f")(value);
  if (abs >= 10) return d3.format(",.1f")(value);
  if (abs >= 1) return d3.format(",.2f")(value);
  if (abs >= 0.01) return d3.format(".2f")(value);
  return d3.format(".3f")(value);
}

function displayName(name: string): string {
  return displayUnitName(name).replace(/\s+/g, " ").trim();
}

function unitColor(index: number): string {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue}, 58%, 38%)`;
}

function localMidnight(value: Date | string | number): number {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return NaN;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function addDays(midnight: number, days: number): number {
  const date = new Date(midnight);
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function calendarDays(start: number, end: number): number[] {
  const days: number[] = [];
  for (let cursor = start; cursor <= end && days.length < 4000; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days.length > 0 ? days : [start];
}

function buildPlayback(
  input: RaceInput[],
  periodStart: number,
  periodEnd: number,
  stepSec: number,
  durationSec: number,
): {
  events: EventPoint[];
  after: Map<string, number>[];
  days: DaySlot[];
  durationMs: number;
  typical: number;
  colors: Map<string, string>;
} | null {
  const byTime = new Map<number, Map<string, number>>();
  for (const row of input) {
    const time = localMidnight(row.date);
    const delta = Number(row.totalDuration);
    if (!row.name || !Number.isFinite(time) || !Number.isFinite(delta) || delta <= 0) {
      continue;
    }
    let bucket = byTime.get(time);
    if (!bucket) {
      bucket = new Map();
      byTime.set(time, bucket);
    }
    bucket.set(row.name, (bucket.get(row.name) ?? 0) + delta);
  }

  const events: EventPoint[] = Array.from(byTime.keys())
    .sort((a, b) => a - b)
    .map((time) => {
      const bucket = byTime.get(time)!;
      const deltas = Array.from(bucket, ([name, delta]) => ({ name, delta }));
      const mag = deltas.reduce((sum, item) => sum + item.delta, 0);
      return { time, deltas, mag };
    })
    .filter((event) => event.mag > 0);

  if (events.length === 0) return null;

  const after: Map<string, number>[] = [];
  const running = new Map<string, number>();
  const firstSeen: string[] = [];
  for (const event of events) {
    for (const item of event.deltas) {
      if (!running.has(item.name)) firstSeen.push(item.name);
      running.set(item.name, (running.get(item.name) ?? 0) + item.delta);
    }
    after.push(new Map(running));
  }

  const allDeltas = events.flatMap((event) => event.deltas.map((item) => item.delta));
  const typical = d3.quantile(allDeltas, 0.75) || d3.median(allDeltas) || 1;

  const firstEvent = events[0].time;
  const lastEvent = events[events.length - 1].time;
  const rangeStart = Number.isFinite(periodStart) ? periodStart : firstEvent;
  const rangeEnd = Number.isFinite(periodEnd) ? periodEnd : lastEvent;
  const start = Math.min(rangeStart, firstEvent);
  const end = Math.max(rangeEnd, lastEvent);
  const calendar = calendarDays(start, end);

  let holdIndex = -1;
  let eventCursor = 0;
  const days: DaySlot[] = calendar.map((time) => {
    while (eventCursor < events.length && events[eventCursor].time <= time) {
      holdIndex = eventCursor;
      eventCursor += 1;
    }
    const eventIndex = holdIndex >= 0 && events[holdIndex].time === time ? holdIndex : null;
    let growStretch = 1;
    if (eventIndex !== null) {
      const before = eventIndex === 0 ? EMPTY : after[eventIndex - 1] ?? EMPTY;
      growStretch = eventGrowStretch(before, after[eventIndex] ?? EMPTY);
    }
    return { time, eventIndex, holdIndex, startMs: 0, durationMs: 0, growStretch };
  });

  const lengths = dayDurationsMs(
    days.map((day) => (day.eventIndex !== null ? day.growStretch : 0)),
    stepSec,
    durationSec,
  );
  let cursor = 0;
  days.forEach((day, index) => {
    day.startMs = cursor;
    day.durationMs = lengths[index];
    cursor += lengths[index];
  });

  const colors = new Map(firstSeen.map((name, index) => [name, unitColor(index)]));

  return {
    events,
    after,
    days,
    durationMs: cursor,
    typical,
    colors,
  };
}

function byDest(a: Row, b: Row): number {
  return b.to - a.to || a.name.localeCompare(b.name, "ru");
}

function byOrigin(a: Row, b: Row): number {
  return b.from - a.from || a.name.localeCompare(b.name, "ru");
}

/** Порядок до переезда: старые полосы на прежних местах, новой оставлен зазор там, где она встанет. */
function orderBeforeMove(rows: Row[]): Row[] {
  const result = rows.filter((row) => !row.isNew).sort(byOrigin);
  const newcomers = rows.filter((row) => row.isNew).sort(byDest);
  for (const neu of newcomers) {
    let index = result.length;
    for (let i = 0; i < result.length; i++) {
      if (byDest(neu, result[i]) < 0) {
        index = i;
        break;
      }
    }
    result.splice(index, 0, neu);
  }
  return result;
}

function layoutSlots(ordered: Row[], plotH: number, marginTop: number) {
  const count = Math.max(ordered.length, 1);
  const slot = plotH / count;
  // Не даём полосам сжиматься до «нитки»: минимум ~8px, плотнее заполняем ряд.
  const barH = Math.min(36, Math.max(8, slot * 0.9));
  const pad = Math.max(0, (slot - barH) / 2);
  const yOf = new Map<string, number>();
  ordered.forEach((row, index) => {
    yOf.set(row.name, marginTop + index * slot + pad);
  });
  return { yOf, barH };
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

const PHASE_WEIGHT: Record<PhaseName, number> = {
  room: 0.26,
  name: 0.18,
  grow: 0.5,
  move: 0.22,
};

/** Отрастание занимает половину настроенного шага (growShare); остальное — room/name/move/idle. */
function phaseAt(p: number, phases: PhaseName[], growShare = 0.5) {
  const passed = new Set<PhaseName>();
  if (phases.length === 0) {
    return { phase: "idle" as const, local: 1, passed };
  }

  const growSpan = Math.min(0.85, Math.max(0.15, growShare));
  const hasGrow = phases.includes("grow");
  const others = phases.filter((phase) => phase !== "grow");
  const otherSum = others.reduce((total, phase) => total + PHASE_WEIGHT[phase], 0);
  const otherBudget = hasGrow ? 1 - growSpan : 1;
  const spans = phases.map((phase) => {
    if (phase === "grow") {
      return hasGrow ? growSpan : 0;
    }
    if (otherSum <= 1e-9) return 0;
    return (otherBudget * PHASE_WEIGHT[phase]) / otherSum;
  });

  if (hasGrow && others.length === 0) {
    if (p < growSpan) {
      return {
        phase: "grow" as const,
        local: Math.min(1, Math.max(0, p / growSpan)),
        passed,
      };
    }
    passed.add("grow");
    return { phase: "idle" as const, local: 1, passed };
  }

  let acc = 0;
  for (let i = 0; i < phases.length; i++) {
    const span = spans[i];
    const end = i === phases.length - 1 ? 1 : acc + span;
    if (p < end || i === phases.length - 1) {
      const local = span <= 1e-9 ? 1 : Math.min(1, Math.max(0, (p - acc) / span));
      return {
        phase: phases[i],
        local: p >= 1 ? 1 : local,
        passed,
      };
    }
    passed.add(phases[i]);
    acc = end;
  }
  return { phase: phases[phases.length - 1], local: 1, passed };
}

function rowsAt(
  model: NonNullable<ReturnType<typeof buildPlayback>>,
  elapsed: number,
): { rows: Row[]; date: Date; p: number; dayMs: number; dayStretch: number } {
  const last = model.days.length - 1;
  let index = last;
  if (elapsed < model.durationMs) {
    for (let i = 0; i < model.days.length; i++) {
      const day = model.days[i];
      if (elapsed < day.startMs + day.durationMs) {
        index = i;
        break;
      }
    }
  }
  const slot = model.days[index];
  const into = elapsed - slot.startMs;
  const p =
    elapsed >= model.durationMs
      ? 1
      : Math.min(1, Math.max(0, into / Math.max(slot.durationMs, 1)));

  if (slot.eventIndex === null) {
    const hold = slot.holdIndex >= 0 ? model.after[slot.holdIndex] : EMPTY;
    const rows: Row[] = [];
    hold.forEach((value, name) => {
      if (value <= 0) return;
      rows.push({
        name,
        value,
        tip: 0,
        delta: 0,
        surge: 0,
        from: value,
        to: value,
        isNew: false,
        growStretch: 1,
        opacity: 1,
        rank: 0,
      });
    });
    return {
      rows,
      date: new Date(slot.time),
      p: 1,
      dayMs: slot.durationMs,
      dayStretch: 1,
    };
  }

  const before = slot.eventIndex === 0 ? EMPTY : model.after[slot.eventIndex - 1] ?? EMPTY;
  const afterMap = model.after[slot.eventIndex] ?? EMPTY;
  let maxExisting = 0;
  before.forEach((value) => {
    if (value > maxExisting) maxExisting = value;
  });
  const rows: Row[] = [];
  afterMap.forEach((to, name) => {
    const from = before.get(name) ?? 0;
    const delta = Math.max(0, to - from);
    if (to <= 0) return;
    const isNew = from <= 1e-9 && to > 0;
    rows.push({
      name,
      value: from,
      tip: 0,
      delta,
      surge: 0,
      from,
      to,
      isNew,
      growStretch: growStretchForDelta(from, to, isNew, maxExisting),
      opacity: 1,
      rank: 0,
    });
  });

  return {
    rows,
    date: new Date(slot.time),
    p,
    dayMs: slot.durationMs,
    dayStretch: slot.growStretch,
  };
}

const BarChartRaceDiagram = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const data = useSelector((state) => state.filters.raceArrState);
  const dateStart = useSelector((state) => state.filters.dateStart);
  const dateEnd = useSelector((state) => state.filters.dateEnd);
  const stepSec = useSelector((state) => state.filters.raceStepSec);
  const durationSec = useSelector((state) => state.filters.raceDurationSec);

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;

    const svg = d3.select(node);
    svg.selectAll("*").remove();

    const host = node.parentElement;
    const slide = node.closest(".slide");
    const slideWidth = slide instanceof HTMLElement ? slide.clientWidth : 0;
    const width = Math.max(320, slideWidth || Math.min(window.innerWidth, 1920));
    const hostTop = host?.getBoundingClientRect().top ?? 150;
    const height = Math.max(320, Math.round(window.innerHeight - hostTop - 12));

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .style("background", "#fff");

    const model = buildPlayback(
      (Array.isArray(data) ? data : []) as RaceInput[],
      localMidnight(dateStart),
      localMidnight(dateEnd),
      stepSec,
      durationSec,
    );
    if (!model) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#607d8b")
        .attr("font-family", "Roboto, sans-serif")
        .attr("font-size", 16)
        .text("Нет данных за выбранный период");
      return;
    }

    const gutter = Math.max(160, Math.min(300, Math.round(width * 0.24)));
    const margin = { top: 28, right: 120, bottom: 52, left: gutter };
    const plotH = height - margin.top - margin.bottom;
    const x = d3
      .scalePow()
      .exponent(0.72)
      .domain([0, 1])
      .range([margin.left, width - margin.right]);
    const axisG = svg.append("g").attr("transform", `translate(0,${margin.top})`);

    const drawAxis = () => {
      axisG.call(
        d3
          .axisTop(x)
          .ticks(Math.max(2, Math.floor((width - margin.left - margin.right) / 140)))
          .tickSizeOuter(0)
          .tickSizeInner(-plotH)
          .tickFormat(() => ""),
      );
      axisG.select(".domain").remove();
      axisG.selectAll(".tick line").attr("stroke", "#e3e8ee");
      axisG.selectAll(".tick text").remove();
    };

    const dateFormat = d3.timeFormat("%d.%m.%Y");
    const ticker = svg
      .append("text")
      .attr("x", width - 20)
      .attr("y", height - 16)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "alphabetic")
      .attr("fill", "#263238")
      .attr("font-family", "Roboto, sans-serif")
      .attr("font-weight", 700)
      .attr("font-size", 36)
      .attr("font-variant-numeric", "tabular-nums")
      .style("cursor", "pointer");

    const barsG = svg.append("g");
    const namesG = svg.append("g");
    const valuesG = svg.append("g");

    const measure = document.createElement("canvas").getContext("2d");
    const labelCache = new Map<string, string>();
    const fitLabel = (name: string, fontSize: number) => {
      const clean = displayName(name);
      const key = `${fontSize}|${clean}`;
      const cached = labelCache.get(key);
      if (cached) return cached;
      const maxPx = margin.left - 18;
      if (!measure) return clean;
      measure.font = `600 ${fontSize}px Roboto, sans-serif`;
      if (measure.measureText(clean).width <= maxPx) {
        labelCache.set(key, clean);
        return clean;
      }
      let lo = 1;
      let hi = clean.length;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        const sample = `${clean.slice(0, mid)}…`;
        if (measure.measureText(sample).width <= maxPx) lo = mid;
        else hi = mid - 1;
      }
      const fitted = `${clean.slice(0, lo)}…`;
      labelCache.set(key, fitted);
      return fitted;
    };

    let xMax = 0;
    let virtual = 0;
    let lastNow = 0;
    let raf = 0;
    let blinkRaf = 0;
    let stopped = false;
    const BLINK_MS = 2000;
    const BLINK_HALF_PERIOD_MS = 200;

    const setTickerOpacity = (opacity: number) => {
      ticker.attr("fill-opacity", opacity);
    };

    const stopBlink = () => {
      cancelAnimationFrame(blinkRaf);
      blinkRaf = 0;
      setTickerOpacity(1);
    };

    const startBlink = () => {
      stopBlink();
      const blinkStart = performance.now();
      const blinkLoop = (now: number) => {
        if (stopped) return;
        const elapsed = now - blinkStart;
        if (elapsed >= BLINK_MS) {
          setTickerOpacity(1);
          blinkRaf = 0;
          return;
        }
        const phase = Math.floor(elapsed / BLINK_HALF_PERIOD_MS) % 2;
        setTickerOpacity(phase === 0 ? 1 : 0.15);
        blinkRaf = requestAnimationFrame(blinkLoop);
      };
      blinkRaf = requestAnimationFrame(blinkLoop);
    };

    const render = (elapsed: number) => {
      const { rows, date, p, dayMs, dayStretch } = rowsAt(model, elapsed);
      const beforeOrder = orderBeforeMove(rows);
      const afterOrder = [...rows].sort(byDest);
      const hasNew = rows.some((row) => row.isNew);
      const hasGrow = rows.some((row) => row.delta > 1e-9);
      const hasMove = beforeOrder.some((row, index) => row.name !== afterOrder[index]?.name);
      const phases: PhaseName[] = [];
      if (hasNew) phases.push("room", "name");
      if (hasGrow) phases.push("grow");
      if (hasMove) phases.push("move");
      const growShare = Math.min(
        0.85,
        ((0.5 * stepSec * 1000) * Math.max(1, dayStretch)) / Math.max(dayMs, 1),
      );
      const { phase, local, passed } = phaseAt(p, phases, hasGrow ? growShare : 0.5);
      const roomT = phase === "room" ? smoothstep(local) : hasNew ? 1 : 0;
      const moveT = phase === "move" ? smoothstep(local) : passed.has("move") ? 1 : 0;

      const existing = rows.filter((row) => !row.isNew).sort(byOrigin);
      const fromGeom = layoutSlots(existing.length > 0 ? existing : beforeOrder, plotH, margin.top);
      const preGeom = layoutSlots(beforeOrder, plotH, margin.top);
      const postGeom = layoutSlots(afterOrder, plotH, margin.top);

      const shown = rows.map((row) => {
        const intensity = jumpIntensity(row.from, row.delta, model.typical);
        const stretch = Math.max(1, row.growStretch);
        const dayFactor = Math.max(1, dayStretch);
        // Обычные полосы успевают за первую половину удлинённого grow; растянутые — за весь.
        let barLocal = 0;
        if (row.delta <= 1e-9 || passed.has("grow") || phase === "move") {
          barLocal = 1;
        } else if (phase === "grow") {
          barLocal = Math.min(1, (local * dayFactor) / stretch);
        }
        const growT =
          row.delta <= 1e-9 ? 1 : phase === "grow" ? accelEase(barLocal, intensity) : barLocal;
        const value = row.from + row.delta * growT;
        const nameOpacity = !row.isNew ? 1 : phase === "name" ? smoothstep(local) : passed.has("name") ? 1 : 0;
        const barOpacity =
          !row.isNew || phase === "grow" || phase === "move" || passed.has("grow") ? 1 : 0;

        let y = preGeom.yOf.get(row.name) ?? margin.top;
        let barH = preGeom.barH;
        if (phase === "room" || (!passed.has("room") && hasNew && phase !== "idle")) {
          if (row.isNew) {
            const idx = beforeOrder.findIndex((item) => item.name === row.name);
            const above = [...beforeOrder.slice(0, idx)].reverse().find((item) => !item.isNew);
            const below = beforeOrder.slice(idx + 1).find((item) => !item.isNew);
            const aboveY = above ? fromGeom.yOf.get(above.name) ?? y : y;
            const belowY = below ? fromGeom.yOf.get(below.name) ?? y : y;
            const collapsed = above && below ? (aboveY + belowY) / 2 : above ? aboveY + fromGeom.barH : below ? belowY : y;
            y = collapsed + (y - collapsed) * roomT;
            barH = preGeom.barH * Math.max(roomT, 0.001);
          } else {
            const originY = fromGeom.yOf.get(row.name) ?? y;
            y = originY + (y - originY) * roomT;
            barH = fromGeom.barH + (preGeom.barH - fromGeom.barH) * roomT;
          }
        } else if (phase === "move") {
          const fromY = preGeom.yOf.get(row.name) ?? y;
          const toY = postGeom.yOf.get(row.name) ?? fromY;
          y = fromY + (toY - fromY) * moveT;
          barH = postGeom.barH;
        } else if (passed.has("move")) {
          y = postGeom.yOf.get(row.name) ?? y;
          barH = postGeom.barH;
        }

        return { ...row, value, surge: 0, tip: 0, y, barH, nameOpacity, barOpacity };
      });

      const leaderValue = shown.reduce((max, row) => Math.max(max, row.value), 0);
      const targetMax = Math.max(leaderValue * 1.08, 1e-4);
      if (targetMax > xMax) xMax = targetMax;
      x.domain([0, Math.max(xMax, 1e-4)]);
      drawAxis();

      const fullBand = postGeom.barH;
      const showText = fullBand >= 8;
      const fontSize = Math.min(15, Math.max(9, fullBand * 0.64));
      const placed = shown;

      ticker.text(dateFormat(date));

      const bars = barsG
        .selectAll<SVGRectElement, (typeof placed)[number]>("rect.race-bar")
        .data(placed, (d) => d.name);
      bars.exit().remove();
      bars
        .enter()
        .append("rect")
        .attr("class", "race-bar")
        .attr("rx", 2)
        .append("title");
      barsG
        .selectAll<SVGRectElement, (typeof placed)[number]>("rect.race-bar")
        .attr("x", x(0))
        .attr("y", (d) => d.y)
        .attr("width", (d) => Math.max(0, x(d.value) - x(0)))
        .attr("height", (d) => d.barH)
        .attr("fill", (d) => model.colors.get(d.name) || "#546e7a")
        .attr("fill-opacity", (d) => d.barOpacity)
        .select("title")
        .text((d) => `${displayName(d.name)}: ${formatHours(d.value)} ч`);

      const names = namesG
        .selectAll<SVGTextElement, (typeof placed)[number]>("text.race-name")
        .data(showText ? placed : [], (d) => d.name);
      names.exit().remove();
      names
        .enter()
        .append("text")
        .attr("class", "race-name")
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "central")
        .attr("font-family", "Roboto, sans-serif")
        .attr("font-weight", 600)
        .attr("fill", "#263238");
      namesG
        .selectAll<SVGTextElement, (typeof placed)[number]>("text.race-name")
        .attr("x", margin.left - 10)
        .attr("y", (d) => d.y + d.barH / 2)
        .attr("font-size", fontSize)
        .attr("fill-opacity", (d) => d.nameOpacity)
        .text((d) => fitLabel(d.name, fontSize));

      const values = valuesG
        .selectAll<SVGTextElement, (typeof placed)[number]>("text.race-value")
        .data(showText ? placed : [], (d) => d.name);
      values.exit().remove();
      values
        .enter()
        .append("text")
        .attr("class", "race-value")
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "central")
        .attr("font-family", "Roboto, sans-serif")
        .attr("font-variant-numeric", "tabular-nums");
      valuesG
        .selectAll<SVGTextElement, (typeof placed)[number]>("text.race-value")
        .attr("x", (d) => Math.max(x(d.value) + 6, margin.left + 4))
        .attr("y", (d) => d.y + d.barH / 2)
        .attr("font-size", fontSize)
        .attr("font-weight", 500)
        .attr("fill", "#455a64")
        .attr("fill-opacity", (d) => (d.isNew ? d.barOpacity : 1))
        .text((d) => (d.isNew && d.barOpacity <= 0 ? "" : `${formatHours(d.value)} ч`));
    };

    const loop = (now: number) => {
      if (stopped) return;
      const frameDt = Math.min(48, Math.max(0, now - lastNow));
      lastNow = now;
      virtual = Math.min(model.durationMs, virtual + frameDt);
      render(virtual);
      if (virtual < model.durationMs) {
        raf = requestAnimationFrame(loop);
      } else {
        startBlink();
      }
    };

    const play = () => {
      stopBlink();
      cancelAnimationFrame(raf);
      xMax = 0;
      virtual = 0;
      lastNow = performance.now();
      raf = requestAnimationFrame(loop);
    };

    ticker.on("click", play);
    const onReplay = () => play();
    window.addEventListener("rzd-race-replay", onReplay);
    play();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stopBlink();
      window.removeEventListener("rzd-race-replay", onReplay);
    };
  }, [data, dateStart, dateEnd, stepSec, durationSec]);

  return (
    <svg
      id="id25"
      className="chartItem stackedChart"
      ref={svgRef}
      style={{ display: "block" }}
    />
  );
};

export default BarChartRaceDiagram;
