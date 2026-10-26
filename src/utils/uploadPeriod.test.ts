import { easedCount, formatPeriod, pauseForSmallFile, periodText, SMALL_FILE_ROWS, uploadWriteMessage } from "./uploadPeriod";

test("маленький файл удерживает шаг, большой не ждёт", () => {
  expect(pauseForSmallFile(80, 650, true)).toBe(570);
  expect(pauseForSmallFile(900, 650, true)).toBe(0);
  expect(pauseForSmallFile(80, 650, false)).toBe(0);
  expect(SMALL_FILE_ROWS).toBeGreaterThan(0);
});

test("счётчик строк догоняет цель с замедлением, без прыжка на всю пачку", () => {
  expect(easedCount(8000, 8500, 0)).toBe(8000);
  expect(easedCount(8000, 8500, 1)).toBe(8500);
  const mid = easedCount(8000, 8500, 0.5);
  expect(mid).toBeGreaterThan(8000);
  expect(mid).toBeLessThan(8500);
  expect(mid - 8000).toBeGreaterThan(8500 - mid);
});

function plain(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, " ");
}

test("период сжимается до дня, месяца или диапазона", () => {
  expect(formatPeriod({ year: 2025, month: 12, day: 15 }, { year: 2025, month: 12, day: 15 })).toBe(
    "15 декабря 2025",
  );
  expect(formatPeriod({ year: 2025, month: 12, day: 1 }, { year: 2025, month: 12, day: 31 })).toBe(
    "1–31 декабря 2025",
  );
  expect(formatPeriod({ year: 2025, month: 11, day: 1 }, { year: 2025, month: 12, day: 15 })).toBe(
    "1 ноября — 15 декабря 2025",
  );
  expect(formatPeriod({ year: 2025, month: 12, day: 1 }, { year: 2026, month: 1, day: 15 })).toBe(
    "1 декабря 2025 — 15 января 2026",
  );
});

test("подпись загрузки показывает период и число отказов", () => {
  const rows = [
    { Начало: "31.12.2025 23:10" },
    { "Начало отказа": new Date(2025, 11, 1, 8, 0, 0) },
  ];
  expect(periodText(rows)).toBe("1–31 декабря 2025");
  expect(
    plain(uploadWriteMessage(1, 8, rows, "отчёт.xlsx", 29000, 48500)),
  ).toBe("Файл 2 из 8\n1–31 декабря 2025\n29 000 из 48 500");
});

test("без дат остаётся имя файла", () => {
  expect(plain(uploadWriteMessage(0, 1, [{ "#": 1 }], "отчёт.xlsx", 0, 12))).toBe(
    "«отчёт.xlsx»\n0 из 12",
  );
});
