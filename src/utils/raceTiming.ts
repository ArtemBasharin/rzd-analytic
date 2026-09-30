export const RACE_STEP_KEY = "rzd-analytic.raceStepSec";
export const RACE_DURATION_KEY = "rzd-analytic.raceDurationSec";

export const DEFAULT_RACE_STEP_SEC = 1.5;
export const DEFAULT_RACE_DURATION_SEC = 15;

const MIN_STEP_SEC = 0.2;
const MAX_STEP_SEC = 30;
const MIN_DURATION_SEC = 1;
const MAX_DURATION_SEC = 180;
const MIN_EMPTY_DAY_MS = 40;
const MIN_EVENT_DAY_MS = 200;

function readNumber(key: string, fallback: number): number {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function clampRaceStepSec(value: number): number {
  return Math.min(MAX_STEP_SEC, Math.max(MIN_STEP_SEC, Math.round(value * 10) / 10));
}

export function clampRaceDurationSec(value: number): number {
  return Math.min(MAX_DURATION_SEC, Math.max(MIN_DURATION_SEC, Math.round(value)));
}

export function readRaceTiming(): { stepSec: number; durationSec: number } {
  const durationSec = clampRaceDurationSec(
    readNumber(RACE_DURATION_KEY, DEFAULT_RACE_DURATION_SEC),
  );
  const stepSec = Math.min(
    clampRaceStepSec(readNumber(RACE_STEP_KEY, DEFAULT_RACE_STEP_SEC)),
    durationSec,
  );
  return { stepSec, durationSec };
}

export function writeRaceTiming(stepSec: number, durationSec: number): void {
  try {
    window.localStorage.setItem(RACE_STEP_KEY, String(stepSec));
    window.localStorage.setItem(RACE_DURATION_KEY, String(durationSec));
  } catch {
    // Private mode or a full quota should not block the chart.
  }
}

/**
 * Длительности календарных дней.
 * eventWeights: 0 — пустой день, 1 — обычное событие, 2 — день с удлинённым отрастанием.
 * Пустые дни пролетают быстро; дни с событием делят оставшийся бюджет по весам.
 */
export function dayDurationsMs(
  eventWeights: number[],
  stepSec: number,
  durationSec: number,
): number[] {
  const count = eventWeights.length;
  const total = Math.max(200, durationSec * 1000);
  if (count === 0) return [];
  if (count === 1) return [total];

  const emptyCount = eventWeights.reduce((sum, weight) => sum + (weight <= 0 ? 1 : 0), 0);
  const weightSum = eventWeights.reduce((sum, weight) => sum + Math.max(0, weight), 0);

  if (weightSum <= 0) {
    return Array.from({ length: count }, () => total / count);
  }

  let emptyBudget = emptyCount * MIN_EMPTY_DAY_MS;
  const maxEmptyShare = total * 0.2;
  if (emptyBudget > maxEmptyShare) emptyBudget = maxEmptyShare;
  if (emptyCount === 0) emptyBudget = 0;

  let eventBudget = total - emptyBudget;
  const minEventTotal = weightSum * MIN_EVENT_DAY_MS;
  if (eventBudget < minEventTotal) {
    eventBudget = Math.min(total, minEventTotal);
    emptyBudget = Math.max(0, total - eventBudget);
  }

  const baseStepMs = Math.max(MIN_EVENT_DAY_MS, stepSec * 1000);
  // stretch=1 → 1×шаг; stretch=2 → 1.5×шага (вторая половина шага уходит в удвоенный grow).
  const desiredTotal = eventWeights.reduce((sum, weight) => {
    if (weight <= 0) return sum;
    return sum + baseStepMs * (0.5 * (1 + weight));
  }, 0);

  const perEmpty = emptyCount > 0 ? emptyBudget / emptyCount : 0;
  const scale = desiredTotal > 0 ? eventBudget / desiredTotal : 1;

  return eventWeights.map((weight) => {
    if (weight <= 0) return perEmpty;
    const desired = baseStepMs * (0.5 * (1 + weight));
    return desired * scale;
  });
}

