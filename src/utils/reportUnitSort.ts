export type ReportUnitSort = "count" | "delayed" | "duration";

const STORAGE_KEY = "rzd-analytic.reportUnitSort";

export function readReportUnitSort(): ReportUnitSort {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === "count" || raw === "delayed" || raw === "duration") return raw;
  } catch {
    // Приватный режим не должен ломать отчёт.
  }
  return "count";
}

export function writeReportUnitSort(value: ReportUnitSort): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Приватный режим или переполненная квота не должны блокировать сортировку.
  }
}
