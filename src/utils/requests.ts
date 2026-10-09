import axios from "axios";
import dummyArr from "../data-preprocessors/dummyArr";
import { Violation } from "../types/violation";
import { pushToast, recordsLabel, updateToast, ToastStatus } from "./toast";

axios.defaults.baseURL = "http://localhost:3001";
axios.defaults.timeout = 1200000; //120secs is not enough when handling 30k docs to mongoDB

/** Согласовано с VIOLATIONS_MAX_LIMIT на бэкенде (по умолчанию 20000). */
export const VIOLATIONS_PAGE_LIMIT = 20000;

export type ViolationsYearParams = {
  fromYear: number;
  toYear: number;
};

export type ViolationsMeta = {
  total: number;
  minDate: string | null;
  maxDate: string | null;
};

function parseTotalCount(headers: unknown): number | null {
  if (headers == null) return null;
  const h = headers as Record<string, string | undefined> & {
    get?: (name: string) => string | undefined;
  };
  const raw =
    (typeof h.get === "function" ? h.get("x-total-count") : undefined) ??
    h["x-total-count"] ??
    h["X-Total-Count"];
  if (raw == null || raw === "") return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

/** GET /violations/meta — total, minDate, maxDate по «Начало отказа». */
export async function fetchViolationsMeta(
  params: ViolationsYearParams,
): Promise<ViolationsMeta | null> {
  try {
    const { data } = await axios.get<ViolationsMeta>("/violations/meta", { params });
    return data ?? null;
  } catch (e) {
    console.warn("[requests] GET /violations/meta failed:", e);
    return null;
  }
}

const PAGE_CONCURRENCY = 4;

function asRows(data: unknown): Violation[] {
  return Array.isArray(data) ? data : [];
}

async function fetchViolationPage(
  params: ViolationsYearParams,
  limit: number,
  page: number,
) {
  return axios.get<Violation[]>("/violations", {
    params: { ...params, limit, page },
  });
}

/**
 * GET /violations с limit/page и заголовком X-Total-Count.
 * Первая страница, затем остальные параллельно пачками.
 * Если сервер проигнорировал limit и отдал весь массив — повторных запросов нет.
 */
export async function fetchAllViolationsPageable(
  params: ViolationsYearParams,
  limit = VIOLATIONS_PAGE_LIMIT,
  onProgress?: (done: number, total: number) => void,
): Promise<Violation[]> {
  const report = (done: number, total: number) => {
    onProgress?.(done, Math.max(total, 1));
  };
  const first = await fetchViolationPage(params, limit, 1);
  const firstChunk = asRows(first.data);
  if (firstChunk.length === 0) {
    report(1, 1);
    return [];
  }

  const total = parseTotalCount(first.headers);

  if (total == null && firstChunk.length !== limit) {
    report(1, 1);
    return firstChunk;
  }
  if (total != null && firstChunk.length >= total) {
    report(1, 1);
    return firstChunk;
  }

  const pageCount = total != null ? Math.ceil(total / limit) : 0;
  if (pageCount > 1) {
    const pages: number[] = [];
    for (let page = 2; page <= pageCount; page += 1) pages.push(page);

    const all = firstChunk.slice();
    let done = 1;
    report(done, pageCount);
    for (let i = 0; i < pages.length; i += PAGE_CONCURRENCY) {
      const batch = pages.slice(i, i + PAGE_CONCURRENCY);
      const results = await Promise.all(
        batch.map((page) => fetchViolationPage(params, limit, page)),
      );
      results.forEach((res) => {
        all.push(...asRows(res.data));
      });
      done += batch.length;
      report(done, pageCount);
    }
    return all;
  }

  if (total != null) {
    report(1, 1);
    return firstChunk;
  }

  const second = await fetchViolationPage(params, limit, 2);
  const secondChunk = asRows(second.data);
  if (secondChunk.length === 0) {
    report(1, 1);
    return firstChunk;
  }
  if (secondChunk.length >= limit && secondChunk.length === firstChunk.length) {
    report(1, 1);
    return firstChunk;
  }

  const all = firstChunk.concat(secondChunk);
  let page = 3;
  const maxPages = 50;
  report(2, maxPages);
  while (page <= maxPages) {
    const res = await fetchViolationPage(params, limit, page);
    const chunk = asRows(res.data);
    all.push(...chunk);
    const pageTotal = parseTotalCount(res.headers);
    const knownTotal =
      pageTotal != null ? Math.ceil(pageTotal / limit) : maxPages;
    report(page, knownTotal);
    if (chunk.length === 0) break;
    if (pageTotal != null && all.length >= pageTotal) break;
    if (chunk.length < limit) break;
    page += 1;
  }
  return all;
}

const getViolationsArray = (startDate: string, endDate: string) => {
  let params = {
    "fromYear": new Date(startDate).getFullYear() - 1,
    "toYear": new Date(endDate).getFullYear(),
  };

  axios
    .get("/violations", { params })
    .then(function (res) {
      return res.data;
    })
    .catch(function (error) {
      console.log("axios.get error:", error);
      return dummyArr;
    });
};

export type AbsentViolation = {
  _id?: string;
  "ID отказа"?: number;
  "Начало отказа"?: string;
  "Виновное предприятие"?: string;
  Место?: string;
  "Причина 2 ур"?: string;
};

export type BulkUploadSummary = {
  matchedCount?: number;
  modifiedCount?: number;
  upsertedCount?: number;
  total?: number;
  absent?: AbsentViolation[];
};

export type DeleteCollectionResult = {
  deletedCount?: number;
  acknowledged?: boolean;
};

export function requestErrorText(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object" && "error" in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return fallback;
}

export function describeBulkUpload(
  summary: BulkUploadSummary,
  sent: number,
): { message: string; status: ToastStatus } {
  const total = Number(summary?.total ?? sent);
  const added = Number(summary?.upsertedCount ?? 0);
  const updated = Number(summary?.modifiedCount ?? 0);
  const matched = Number(summary?.matchedCount ?? 0);

  if (!Number.isFinite(total) || total <= 0) {
    return {
      status: "fail",
      message: "Файл не распознан: нет колонок «ID отказа» или «Ответственный»",
    };
  }

  if (added === 0 && updated === 0) {
    if (matched > 0) {
      return {
        status: "success",
        message: `Файл обработан: ${matched} ${recordsLabel(matched)} уже в базе, изменений нет`,
      };
    }
    return {
      status: "success",
      message: `Файл обработан: ${total} ${recordsLabel(total)}, совпадений в базе нет`,
    };
  }

  return {
    status: "success",
    message: `Загружено ${total} ${recordsLabel(total)}: добавлено ${added}, обновлено ${updated}`,
  };
}

const UPLOAD_TIMEOUT_MS = 1200000;

async function readNdjson(
  res: Response,
  onEvent: (event: BulkUploadEvent) => void,
) {
  const reader = res.body?.getReader();
  if (!reader) {
    onEvent((await res.json()) as BulkUploadEvent);
    return;
  }
  const decoder = new TextDecoder();
  let buf = "";
  const take = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    onEvent(JSON.parse(trimmed) as BulkUploadEvent);
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    lines.forEach(take);
  }
  take(buf);
}

type BulkUploadEvent = BulkUploadSummary & {
  phase?: "write" | "done";
  done?: number;
  total?: number;
  error?: string;
};

const postViolationsArray = async (
  arr: Violation[],
  noticeId?: number,
  onBatch?: (done: number, total: number) => void,
): Promise<BulkUploadSummary> => {
  const sending = `Отправка ${arr.length} ${recordsLabel(arr.length)}…`;
  const id =
    noticeId != null ? noticeId : pushToast(sending, "info", true, 12);
  if (noticeId != null && !onBatch) updateToast(id, sending, "info", true);

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(`${axios.defaults.baseURL}/add-bulk-of-violations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-no-compression": "1",
      },
      body: JSON.stringify(arr),
      signal: controller.signal,
    });
    if (!res.ok) {
      let serverText = "Не удалось загрузить файл";
      try {
        const data = (await res.json()) as { error?: unknown };
        if (typeof data?.error === "string" && data.error.trim()) {
          serverText = data.error;
        }
      } catch (parseError) {
        console.log("upload error parse:", parseError);
      }
      if (serverText === "Пустой массив") serverText = "Файл пустой или не распознан";
      throw new Error(serverText);
    }

    let summary: BulkUploadSummary | null = null;
    await readNdjson(res, (event) => {
      if (event.error) throw new Error(event.error);
      if (event.phase === "write" && event.done != null && event.total != null) {
        onBatch?.(event.done, event.total);
      }
      if (event.phase === "done" || event.phase == null) summary = event;
    });
    if (!summary) throw new Error("Не удалось загрузить файл");
    console.log("post response:", summary);
    return summary;
  } catch (error) {
    console.log("upload error:", error);
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Превышено время загрузки файла"
        : error instanceof Error && error.message
          ? error.message
          : "Не удалось загрузить файл";
    updateToast(id, message, "fail");
    if (error instanceof Error) {
      (error as Error & { uploadHandled?: boolean }).uploadHandled = true;
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

const removeSelectedViolations = async (
  ids: number[],
): Promise<DeleteCollectionResult> => {
  try {
    const res = await axios.post<DeleteCollectionResult>(
      "/violations/remove-selected",
      { ids },
    );
    return res.data ?? {};
  } catch (error) {
    console.log("axios remove-selected error:", error);
    throw error;
  }
};

export type ViolationPeriod = {
  year: number;
  month: number;
  count: number;
};

const fetchViolationPeriods = async (): Promise<ViolationPeriod[]> => {
  const res = await axios.get<ViolationPeriod[]>("/violations/periods");
  return Array.isArray(res.data) ? res.data : [];
};

const removeViolationPeriods = async (
  periods: { year: number; month: number }[],
): Promise<DeleteCollectionResult> => {
  const res = await axios.post<DeleteCollectionResult>(
    "/violations/remove-periods",
    { periods },
  );
  return res.data ?? {};
};

const deleteCollection = async (): Promise<DeleteCollectionResult> => {
  try {
    const res = await axios.delete<DeleteCollectionResult>("/violations");
    console.log("delete response:", res.data);
    return res.data ?? {};
  } catch (error) {
    console.log("axios.delete error:", error);
    throw error;
  }
};

export {
  getViolationsArray,
  postViolationsArray,
  removeSelectedViolations,
  fetchViolationPeriods,
  removeViolationPeriods,
  deleteCollection,
};
