import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import { displayPlaceName } from "../utils/placeParts";
import type { AbsentViolation } from "../utils/requests";

type Props = {
  rows: AbsentViolation[];
  selected: Set<number>;
  pending: boolean;
  onToggle: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
  onConfirm: () => void;
  onDismiss: () => void;
};

function formatStart(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cell(value?: string | number): string {
  if (value == null || value === "") return "—";
  return String(value);
}

function AbsentViolationsDialog({
  rows,
  selected,
  pending,
  onToggle,
  onToggleAll,
  onConfirm,
  onDismiss,
}: Props) {
  const masterRef = useRef<HTMLInputElement>(null);
  const railwayFilter = useSelector(
    (state: RootState) => state.filters.railwayFilter,
  );
  const regionFilter = useSelector(
    (state: RootState) => state.filters.regionFilter,
  );
  const allChecked = rows.length > 0 && selected.size === rows.length;

  useEffect(() => {
    if (!masterRef.current) return;
    masterRef.current.indeterminate =
      selected.size > 0 && selected.size < rows.length;
  }, [rows.length, selected.size]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss, pending]);

  return createPortal(
    <div
      className="absent-dialog"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onDismiss();
      }}
    >
      <div
        className="absent-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="absent-dialog-title"
      >
        <h2 id="absent-dialog-title" className="absent-dialog__title">
          В выгрузке нет этих отказов
        </h2>
        <p className="absent-dialog__text">
          За период файла в базе остались отказы, которых нет в новом файле
          ({rows.length}). Отмеченные будут удалены. Снимите отметку, чтобы
          оставить отказ.
        </p>
        <div className="absent-dialog__list">
          <div className="absent-dialog__table">
            <div className="absent-dialog__row absent-dialog__head">
              <input
                ref={masterRef}
                type="checkbox"
                checked={allChecked}
                disabled={pending}
                aria-label="Отметить все"
                onChange={(event) => onToggleAll(event.target.checked)}
              />
              <span>ID</span>
              <span>Начало</span>
              <span>Виновное предприятие</span>
              <span>Место</span>
              <span>Причина</span>
            </div>
            {rows.map((row) => {
              const id = Number(row["ID отказа"]);
              const checked = selected.has(id);
              return (
                <label className="absent-dialog__row" key={row._id ?? id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={pending || !Number.isFinite(id)}
                    onChange={() => onToggle(id)}
                  />
                  <span>{cell(row["ID отказа"])}</span>
                  <span>{formatStart(row["Начало отказа"])}</span>
                  <span>{cell(row["Виновное предприятие"])}</span>
                  <span>
                    {cell(
                      displayPlaceName(
                        row["Место"],
                        railwayFilter,
                        regionFilter,
                      ),
                    )}
                  </span>
                  <span>{cell(row["Причина 2 ур"])}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="absent-dialog__actions">
          <button
            type="button"
            className="absent-dialog__btn"
            disabled={pending}
            onClick={onDismiss}
          >
            Оставить все
          </button>
          <button
            type="button"
            className="absent-dialog__btn absent-dialog__btn_primary"
            disabled={pending || selected.size === 0}
            onClick={onConfirm}
          >
            Удалить отмеченные ({selected.size})
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default AbsentViolationsDialog;
