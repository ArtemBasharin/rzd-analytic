import { useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { useDispatch } from "react-redux";

import AbsentViolationsDialog from "./AbsentViolationsDialog";
import {
  describeBulkUpload,
  postViolationsArray,
  removeSelectedViolations,
  requestErrorText,
  type AbsentViolation,
} from "../utils/requests";
import { guiltyUnit, guiltyNew } from "../utils/config";
import { pushToast, recordsLabel, updateToast, type ToastStatus } from "../utils/toast";
import { loadViolationsIntoStore } from "../utils/loadViolations";
import type { AppDispatch } from "../redux/store";

type UploadReview = {
  rows: AbsentViolation[];
  selected: Set<number>;
  noticeId: number;
  message: string;
  status: ToastStatus;
  wrote: boolean;
};

type FileOutcome = {
  wrote: boolean;
  deleted: number;
  notice: { message: string; status: ToastStatus } | null;
  failed: boolean;
};

let initialData: any[] = [];

function selectedIds(rows: AbsentViolation[]): Set<number> {
  const ids = rows
    .map((row) => Number(row["ID отказа"]))
    .filter((id) => Number.isFinite(id));
  return new Set(ids);
}

function reportProgress(noticeId: number, message: string, percent: number) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  updateToast(noticeId, message, "info", true, pct);
}

function filesLabel(count: number): string {
  const n = Math.abs(Math.trunc(count));
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 > 10 && mod100 < 20) return "файлов";
  if (mod10 === 1) return "файл";
  if (mod10 >= 2 && mod10 <= 4) return "файла";
  return "файлов";
}

function stageLabel(index: number, count: number, text: string): string {
  if (count <= 1) return text;
  return `Файл ${index + 1} из ${count}: ${text}`;
}

/** Чтение, разбор и запись занимают 0–90%. Обновление графиков — хвост. */
function batchPercent(index: number, count: number, phasePercent: number): number {
  const span = 90 / Math.max(count, 1);
  const within = Math.min(Math.max(phasePercent, 0), 80) / 80;
  return index * span + within * span;
}

function readFileAsBinary(
  file: File,
  onProgress: (ratio: number) => void,
): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(event.loaded / event.total);
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = () => resolve(reader.result);
    reader.readAsBinaryString(file);
  });
}

async function firstSheetRows(data: string | ArrayBuffer | null): Promise<any[] | null> {
  if (data == null) return null;
  const XLSX = await import("xlsx/xlsx.mjs");
  const workbook = XLSX.read(data, {
    type: "binary",
    cellDates: true,
  });
  let resultArray: any[] | undefined;
  workbook.SheetNames.forEach((sheetName: string) => {
    if (resultArray) return;
    const roa = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
    if (roa.length > 0) resultArray = roa;
  });
  return resultArray && resultArray.length > 0 ? resultArray : null;
}

function cleanRows(arr: any[]): any[] {
  return arr.map((el: any) => {
    if (el["ID отказа"] || el["#"]) {
      if (typeof el[guiltyNew] === "string") {
        el[guiltyNew] = el[guiltyNew].replace(/Московская,$/, "");
      }
      if (typeof el[guiltyUnit] === "string") {
        el[guiltyUnit] = el[guiltyUnit].replace(/Московская,$/, "");
      }
    }
    return el;
  });
}

function queueSummary(
  fileCount: number,
  failed: string[],
  deleted: number,
  single: { message: string; status: ToastStatus } | null,
): { message: string; status: ToastStatus } {
  const loaded = fileCount - failed.length;
  let message: string;
  let status: ToastStatus;
  if (fileCount === 1 && single) {
    message = single.message;
    status = failed.length > 0 ? "fail" : single.status;
  } else if (loaded === 0) {
    message = `Не удалось загрузить: ${failed.join(", ")}`;
    status = "fail";
  } else if (failed.length === 0) {
    message = `Загружено ${fileCount} ${filesLabel(fileCount)}`;
    status = "success";
  } else {
    message = `Загружено ${loaded} из ${fileCount}. Не удалось: ${failed.join(", ")}`;
    status = "success";
  }
  if (deleted > 0) {
    message += `. Удалено ${deleted} ${recordsLabel(deleted)}`;
  }
  return { message, status };
}

function DropZoneParser() {
  const [pending, setPending] = useState(false);
  const [review, setReview] = useState<UploadReview | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const reviewResolve = useRef<((deleted: number | null) => void) | null>(null);
  const queuePos = useRef({ index: 0, count: 1 });

  const reloadCharts = async (
    noticeId: number,
    message: string,
    status: ToastStatus,
  ) => {
    try {
      await loadViolationsIntoStore(dispatch, {
        fallbackToDummy: false,
        onProgress: (done, total) => {
          const ratio = total > 0 ? done / total : 0;
          reportProgress(
            noticeId,
            total > 1
              ? `Обновление графиков: ${done} из ${total}`
              : "Обновление графиков…",
            90 + 10 * ratio,
          );
        },
      });
    } catch (loadError) {
      console.log("reload after upload failed:", loadError);
      updateToast(
        noticeId,
        "Файл загружен, но графики не обновились. Обновите страницу.",
        "fail",
      );
      return;
    }
    updateToast(noticeId, message, status);
  };

  const finishReview = (deleted: number | null) => {
    setPending(true);
    setReview(null);
    const resolve = reviewResolve.current;
    reviewResolve.current = null;
    resolve?.(deleted);
  };

  const waitForReview = (next: UploadReview) =>
    new Promise<number | null>((resolve) => {
      reviewResolve.current = resolve;
      setReview(next);
      setPending(false);
    });

  const processFile = async (
    file: File,
    index: number,
    fileCount: number,
    noticeId: number,
  ): Promise<FileOutcome> => {
    queuePos.current = { index, count: fileCount };
    const label = (text: string) => stageLabel(index, fileCount, text);
    const percent = (phase: number) => batchPercent(index, fileCount, phase);
    try {
      reportProgress(noticeId, label(`Читаем «${file.name}»…`), percent(0));
      const data = await readFileAsBinary(file, (ratio) => {
        reportProgress(noticeId, label(`Читаем «${file.name}»…`), percent(8 * ratio));
      });
      reportProgress(noticeId, label("Разбираем таблицу…"), percent(8));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const resultArray = await firstSheetRows(data);
      if (!resultArray) {
        return { wrote: false, deleted: 0, notice: null, failed: true };
      }
      initialData = resultArray;
      const rows = cleanRows(resultArray);
      console.log("Length of the sent array:", rows.length);
      reportProgress(
        noticeId,
        label(`Запись ${rows.length} ${recordsLabel(rows.length)}…`),
        percent(12),
      );
      const summary = await postViolationsArray(rows, noticeId, (done, total) => {
        reportProgress(
          noticeId,
          label(`Запись в базу: ${done} из ${total}`),
          percent(12 + 68 * (total > 0 ? done / total : 1)),
        );
      });
      const notice = describeBulkUpload(summary, rows.length);
      if (notice.status !== "success") {
        return { wrote: false, deleted: 0, notice, failed: true };
      }
      const wrote =
        Number(summary?.upsertedCount ?? 0) > 0 ||
        Number(summary?.modifiedCount ?? 0) > 0;
      const absent = summary.absent ?? [];
      let deleted = 0;
      if (absent.length > 0) {
        updateToast(noticeId, label(notice.message), notice.status, true);
        deleted =
          (await waitForReview({
            rows: absent,
            selected: selectedIds(absent),
            noticeId,
            message: notice.message,
            status: notice.status,
            wrote,
          })) ?? 0;
      }
      return { wrote, deleted, notice, failed: false };
    } catch (error) {
      const handled =
        error instanceof Error &&
        (error as Error & { uploadHandled?: boolean }).uploadHandled;
      if (!axios.isAxiosError(error) && !handled) {
        console.log("file parse error:", error);
      }
      const message =
        handled && error instanceof Error && error.message
          ? error.message
          : "Не удалось прочитать файл";
      return {
        wrote: false,
        deleted: 0,
        notice: { message, status: "fail" },
        failed: true,
      };
    }
  };

  const runQueue = async (files: File[]) => {
    const noticeId = pushToast(
      stageLabel(0, files.length, `Читаем «${files[0].name}»…`),
      "info",
      true,
      0,
    );
    setPending(true);
    const failed: string[] = [];
    let wroteAny = false;
    let deletedTotal = 0;
    let single: { message: string; status: ToastStatus } | null = null;
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const outcome = await processFile(file, index, files.length, noticeId);
        if (outcome.failed) failed.push(`«${file.name}»`);
        if (outcome.wrote) wroteAny = true;
        deletedTotal += outcome.deleted;
        if (files.length === 1) single = outcome.notice;
      }
      const summary = queueSummary(files.length, failed, deletedTotal, single);
      if (wroteAny || deletedTotal > 0) {
        await reloadCharts(noticeId, summary.message, summary.status);
        return;
      }
      updateToast(noticeId, summary.message, summary.status);
    } finally {
      setPending(false);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      pushToast("Файл не выбран", "fail");
      return;
    }
    void runQueue(acceptedFiles);
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    disabled: pending || review != null,
    multiple: true,
  });

  const confirmRemove = async () => {
    if (!review || pending) return;
    const ids = Array.from(review.selected);
    const { noticeId } = review;
    setPending(true);
    try {
      reportProgress(
        noticeId,
        stageLabel(queuePos.current.index, queuePos.current.count, "Удаление отмеченных…"),
        batchPercent(queuePos.current.index, queuePos.current.count, 80),
      );
      const result = await removeSelectedViolations(ids);
      finishReview(result.deletedCount ?? 0);
    } catch (error) {
      updateToast(
        noticeId,
        requestErrorText(error, "Не удалось удалить отмеченные отказы"),
        "fail",
      );
      setPending(false);
    }
  };

  return (
    <>
      <div
        {...getRootProps({
          className: `dropzone 
          ${isDragAccept && "dropzoneAccept"} 
          ${isDragReject && "dropzoneReject"}`,
        })}
      >
        <input {...getInputProps()} />
        {pending ? (
          <p>Загрузка…</p>
        ) : isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag'n'drop zone</p>
        )}
      </div>
      {review && (
        <AbsentViolationsDialog
          rows={review.rows}
          selected={review.selected}
          pending={pending}
          onToggle={(id) => {
            setReview((current) => {
              if (!current) return current;
              const selected = new Set(current.selected);
              if (selected.has(id)) selected.delete(id);
              else selected.add(id);
              return { ...current, selected };
            });
          }}
          onToggleAll={(checked) => {
            setReview((current) => {
              if (!current) return current;
              return {
                ...current,
                selected: checked ? selectedIds(current.rows) : new Set(),
              };
            });
          }}
          onConfirm={() => {
            void confirmRemove();
          }}
          onDismiss={() => {
            finishReview(null);
          }}
        />
      )}
    </>
  );
}

export default DropZoneParser;
export { initialData };
