import axios from "axios";
import dummyArr from "../data-preprocessors/dummyArr";

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

/**
 * GET /violations с limit/page и заголовком X-Total-Count — собирает все страницы.
 */
export async function fetchAllViolationsPageable(
  params: ViolationsYearParams,
  limit = VIOLATIONS_PAGE_LIMIT,
): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const res = await axios.get<any[]>("/violations", {
      params: { ...params, limit, page },
    });
    const chunk = Array.isArray(res.data) ? res.data : [];
    all.push(...chunk);
    const total = parseTotalCount(res.headers);
    if (chunk.length === 0) break;
    if (total != null && all.length >= total) break;
    if (total == null && chunk.length < limit) break;
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

const postViolationsArray = (arr: any[]) => {
  axios
    .post("/add-bulk-of-violations", arr)
    .then(function (res) {
      console.log("post response:", res.data);
    })
    .catch(function (error) {
      console.log("axios.post error:", error);
    })
    .finally(function () {});
};

const deleteCollection = () => {
  axios
    .delete("/violations")
    .then(function (res) {
      console.log("post response:", res.data);
    })
    .catch(function (error) {
      console.log("axios.post error:", error);
    })
    .finally(function () {});
};

export {
  getViolationsArray,
  postViolationsArray,
  deleteCollection,
};
