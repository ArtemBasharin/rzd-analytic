import type { AppDispatch } from "../redux/store";
import { setCutoffDatesFromMeta, setSourceState } from "../redux/filtersSlice";
import dummyArr from "../data-preprocessors/dummyArr";
import { fetchAllViolationsPageable, fetchViolationsMeta } from "./requests";

function yearWindow() {
  const calendarYear = new Date().getFullYear();
  return {
    calendarYear,
    yearParams: { fromYear: 2000, toYear: calendarYear + 1 },
  };
}

/**
 * Тот же путь, что при открытии страницы: meta, затем страницы /violations,
 * затем setSourceState (графики, отчёт, даты).
 */
export async function loadViolationsIntoStore(
  dispatch: AppDispatch,
  options?: { fallbackToDummy?: boolean; shouldApply?: () => boolean },
): Promise<void> {
  const fallbackToDummy = options?.fallbackToDummy !== false;
  const apply = options?.shouldApply ?? (() => true);
  const { calendarYear, yearParams } = yearWindow();

  try {
    const meta = await fetchViolationsMeta(yearParams);
    if (!apply()) return;
    if (
      meta &&
      meta.minDate != null &&
      meta.maxDate != null &&
      meta.total > 0
    ) {
      dispatch(
        setCutoffDatesFromMeta({
          minDate: meta.minDate,
          maxDate: meta.maxDate,
        }),
      );
    }

    const data = await fetchAllViolationsPageable(yearParams);
    if (!apply()) return;

    if (process.env.NODE_ENV === "development") {
      const totalHint =
        meta?.total != null ? ` (meta.total=${meta.total})` : "";
      console.log(
        "[violations] GET /violations — записей:",
        data.length,
        totalHint,
      );
    }

    if (data.length === 0 && !fallbackToDummy) {
      throw new Error("После загрузки сервер вернул пустой список");
    }

    dispatch(setSourceState(data));
  } catch (error) {
    if (!apply()) return;
    if (!fallbackToDummy) throw error;
    console.log("axios violations load error:", error);
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[violations] подставляем dummyArr — отчёт не из БД или старый API",
      );
    }
    dispatch(setSourceState(dummyArr(calendarYear - 1, calendarYear)));
  }
}
