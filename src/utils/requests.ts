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
): Promise<Violation[]> {
  const first = await fetchViolationPage(params, limit, 1);
  const firstChunk = asRows(first.data);
  if (firstChunk.length === 0) return [];

  const total = parseTotalCount(first.headers);

  if (total == null && firstChunk.length !== limit) return firstChunk;
  if (total != null && firstChunk.length >= total) return firstChunk;

  const pageCount = total != null ? Math.ceil(total / limit) : 0;
  if (pageCount > 1) {
    const pages: number[] = [];
    for (let page = 2; page <= pageCount; page += 1) pages.push(page);

    const all = firstChunk.slice();
    for (let i = 0; i < pages.length; i += PAGE_CONCURRENCY) {
      const batch = pages.slice(i, i + PAGE_CONCURRENCY);
      const results = await Promise.all(
        batch.map((page) => fetchViolationPage(params, limit, page)),
      );
      results.forEach((res) => {
        all.push(...asRows(res.data));
      });
    }
    return all;
  }

  if (total != null) return firstChunk;

  const second = await fetchViolationPage(params, limit, 2);
  const secondChunk = asRows(second.data);
  if (secondChunk.length === 0) return firstChunk;
  if (secondChunk.length >= limit && secondChunk.length === firstChunk.length) {
    return firstChunk;
  }

  const all = firstChunk.concat(secondChunk);
  let page = 3;
  const maxPages = 50;
  while (page <= maxPages) {
    const res = await fetchViolationPage(params, limit, page);
    const chunk = asRows(res.data);
    all.push(...chunk);
    const pageTotal = parseTotalCount(res.headers);
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

export type BulkUploadSummary = {
  matchedCount?: number;
  modifiedCount?: number;
  upsertedCount?: number;
  total?: number;
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

const postViolationsArray = async (
  arr: Violation[],
  noticeId?: number,
): Promise<BulkUploadSummary> => {
  const sending = `Отправка ${arr.length} ${recordsLabel(arr.length)}…`;
  const id =
    noticeId != null ? noticeId : pushToast(sending, "info", true);
  if (noticeId != null) updateToast(id, sending, "info", true);

  try {
    const res = await axios.post<BulkUploadSummary>("/add-bulk-of-violations", arr);
    console.log("post response:", res.data);
    return res.data ?? {};
  } catch (error) {
    console.log("axios.post error:", error);
    const serverText = requestErrorText(error, "Не удалось загрузить файл");
    updateToast(
      id,
      serverText === "Пустой массив" ? "Файл пустой или не распознан" : serverText,
      "fail",
    );
    throw error;
  }
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
  deleteCollection,
};
