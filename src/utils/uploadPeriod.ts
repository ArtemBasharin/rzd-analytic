type Day = { year: number; month: number; day: number };

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export const SMALL_FILE_ROWS = 1500;
export const MIN_READ_MS = 650;
export const MIN_WRITE_MS = 1000;
export const MIN_CHARTS_MS = 800;

/** Сколько ещё держать шаг на экране, если файл маленький и он уже завершился. */
export function pauseForSmallFile(elapsedMs: number, minMs: number, small: boolean): number {
  if (!small || elapsedMs >= minMs) return 0;
  return minMs - elapsedMs;
}

export function easedCount(from: number, to: number, t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  const eased = 1 - (1 - clamped) * (1 - clamped);
  return Math.round(from + (to - from) * eased);
}

export function formatUploadCount(count: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.trunc(count));
}

function dayKey(day: Day): number {
  return day.year * 10000 + day.month * 100 + day.day;
}

function formatDay(day: Day, withYear: boolean): string {
  const month = MONTHS[day.month - 1] ?? "";
  return withYear ? `${day.day} ${month} ${day.year}` : `${day.day} ${month}`;
}

export function formatPeriod(min: Day, max: Day): string {
  if (dayKey(min) === dayKey(max)) return formatDay(min, true);
  if (min.year === max.year && min.month === max.month) {
    return `${min.day}–${max.day} ${MONTHS[min.month - 1]} ${min.year}`;
  }
  if (min.year === max.year) {
    return `${formatDay(min, false)} — ${formatDay(max, true)}`;
  }
  return `${formatDay(min, true)} — ${formatDay(max, true)}`;
}

function dayFromDate(date: Date): Day | null {
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function dayFromMoscowIso(value: string): Day | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const year = pick("year");
  const month = pick("month");
  const day = pick("day");
  if (![year, month, day].every((n) => Number.isFinite(n))) return null;
  return { year, month, day };
}

function dayFromValue(value: unknown): Day | null {
  if (value instanceof Date) return dayFromDate(value);
  if (typeof value !== "string") return null;
  const text = value.trim();
  const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (match) {
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    const month = Number(match[2]);
    const day = Number(match[1]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return dayFromMoscowIso(text);
  return null;
}

export function periodText(rows: Array<Record<string, unknown>>): string | null {
  let min: Day | null = null;
  let max: Day | null = null;
  rows.forEach((row) => {
    const day = dayFromValue(row["Начало"] ?? row["Начало отказа"]);
    if (!day) return;
    if (!min || dayKey(day) < dayKey(min)) min = day;
    if (!max || dayKey(day) > dayKey(max)) max = day;
  });
  if (!min || !max) return null;
  return formatPeriod(min, max);
}

export function uploadWriteMessage(
  index: number,
  fileCount: number,
  rows: Array<Record<string, unknown>>,
  fileName: string,
  done: number,
  total: number,
): string {
  const lines: string[] = [];
  if (fileCount > 1) lines.push(`Файл ${index + 1} из ${fileCount}`);
  lines.push(periodText(rows) ?? `«${fileName}»`);
  lines.push(`${formatUploadCount(done)} из ${formatUploadCount(total)}`);
  return lines.join("\n");
}
