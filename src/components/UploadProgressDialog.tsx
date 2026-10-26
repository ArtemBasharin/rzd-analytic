import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { easedCount, formatUploadCount } from "../utils/uploadPeriod";

export type UploadPhase = "read" | "write" | "charts" | "done";

export type UploadProgressState = {
  phase: UploadPhase;
  fileIndex: number;
  fileCount: number;
  fileName: string;
  period: string | null;
  written: number | null;
  rowTotal: number | null;
  percent: number;
  note: string | null;
  summary: string | null;
  failed: boolean;
};

const PHASES: { id: Exclude<UploadPhase, "done">; label: string }[] = [
  { id: "read", label: "Чтение" },
  { id: "write", label: "Запись" },
  { id: "charts", label: "Графики" },
];

type Props = {
  progress: UploadProgressState;
  onClose: () => void;
};

function phaseIndex(phase: UploadPhase): number {
  if (phase === "done") return PHASES.length;
  return PHASES.findIndex((item) => item.id === phase);
}

/** Дорисовывает счётчик между пачками по 500 строк, чтобы цифра не прыгала. */
function useSmoothCount(target: number | null): number | null {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target ?? 0);

  useEffect(() => {
    if (target == null) {
      valueRef.current = 0;
      setValue(null);
      return;
    }
    const from = valueRef.current;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target <= from) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    const delta = target - from;
    const duration =
      from === 0 && delta <= 1500 ? 1000 : Math.min(800, Math.max(280, delta * 0.7));
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = easedCount(from, target, t);
      valueRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

function UploadProgressDialog({ progress, onClose }: Props) {
  const finished = progress.phase === "done";
  const current = phaseIndex(progress.phase);
  const percent = Math.max(0, Math.min(100, Math.round(progress.percent)));
  const showFiles = progress.fileCount > 1 && progress.fileCount <= 12;
  const shownWritten = useSmoothCount(progress.phase === "write" ? progress.written : null);
  const countLine =
    shownWritten != null && progress.rowTotal != null
      ? `${formatUploadCount(shownWritten)} из ${formatUploadCount(progress.rowTotal)}`
      : null;

  useEffect(() => {
    if (!finished) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, onClose]);

  return createPortal(
    <div className="upload-progress" role="presentation">
      <div
        className="upload-progress__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-progress-title"
      >
        <h2 id="upload-progress-title" className="upload-progress__title">
          {finished ? (progress.failed ? "Загрузка не завершена" : "Загрузка завершена") : "Загрузка"}
        </h2>
        <ol className="upload-progress__steps">
          {PHASES.map((step, index) => {
            const state =
              index < current ? "done" : index === current ? "current" : "wait";
            return (
              <li key={step.id} className={`upload-progress__step upload-progress__step_${state}`}>
                {step.label}
              </li>
            );
          })}
        </ol>
        <p className="upload-progress__percent">{percent}%</p>
        <div
          className={`upload-progress__bar${progress.failed ? " upload-progress__bar_fail" : ""}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Ход загрузки пачки файлов"
        >
          <div className="upload-progress__bar-fill" style={{ width: `${percent}%` }} />
        </div>
        {showFiles && (
          <ol className="upload-progress__files">
            {Array.from({ length: progress.fileCount }, (_, index) => {
              const state =
                progress.phase === "charts" || progress.phase === "done" || index < progress.fileIndex
                  ? "done"
                  : index === progress.fileIndex
                    ? "current"
                    : "wait";
              return (
                <li key={index} className={`upload-progress__file upload-progress__file_${state}`}>
                  <span>{index + 1}</span>
                </li>
              );
            })}
          </ol>
        )}
        <div className="upload-progress__detail">
          {finished && progress.summary ? (
            <p className="upload-progress__summary">{progress.summary}</p>
          ) : (
            <>
              <p className="upload-progress__file-label">
                {progress.fileCount > 1 && progress.phase !== "charts"
                  ? `Файл ${progress.fileIndex + 1} из ${progress.fileCount}`
                  : "\u00a0"}
              </p>
              <p className="upload-progress__period">
                {progress.phase === "charts"
                  ? "Обновление графиков"
                  : progress.period ?? `«${progress.fileName}»`}
              </p>
              <p className="upload-progress__count">
                {countLine ?? progress.note ?? "\u00a0"}
              </p>
            </>
          )}
        </div>
        {finished && (
          <div className="upload-progress__actions">
            <button type="button" className="upload-progress__close" onClick={onClose}>
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default UploadProgressDialog;
