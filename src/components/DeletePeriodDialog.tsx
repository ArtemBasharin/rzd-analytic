import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ViolationPeriod } from "../utils/requests";

const MONTHS = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

export type PeriodKey = string;

export function periodKey(year: number, month: number): PeriodKey {
  return `${year}-${month}`;
}

type Props = {
  periods: ViolationPeriod[];
  loading: boolean;
  error: string;
  pending: boolean;
  onConfirm: (periods: { year: number; month: number }[]) => void;
  onDismiss: () => void;
};

function DeletePeriodDialog({
  periods,
  loading,
  error,
  pending,
  onConfirm,
  onDismiss,
}: Props) {
  const [selected, setSelected] = useState<Set<PeriodKey>>(new Set());

  const years = useMemo(() => {
    const map = new Map<number, ViolationPeriod[]>();
    periods.forEach((period) => {
      const list = map.get(period.year) ?? [];
      list.push(period);
      map.set(period.year, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [periods]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss, pending]);

  const toggleMonth = (key: PeriodKey) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleYear = (yearPeriods: ViolationPeriod[]) => {
    const keys = yearPeriods.map((period) =>
      periodKey(period.year, period.month),
    );
    const allOn = keys.every((key) => selected.has(key));
    setSelected((current) => {
      const next = new Set(current);
      keys.forEach((key) => {
        if (allOn) next.delete(key);
        else next.add(key);
      });
      return next;
    });
  };

  const chosen = periods.filter((period) =>
    selected.has(periodKey(period.year, period.month)),
  );

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
        aria-labelledby="period-delete-title"
      >
        <h2 id="period-delete-title" className="absent-dialog__title">
          Что удалить
        </h2>
        <p className="absent-dialog__text">
          Отметьте годы и месяцы. Удалятся только отказы с началом в выбранных
          месяцах.
        </p>
        <div className="period-delete__list">
          {loading && <p className="absent-dialog__text">Загрузка периодов…</p>}
          {!loading && error && <p className="absent-dialog__text">{error}</p>}
          {!loading && !error && years.length === 0 && (
            <p className="absent-dialog__text">В базе нет отказов с датой.</p>
          )}
          {years.map(([year, yearPeriods]) => {
            const keys = yearPeriods.map((period) =>
              periodKey(period.year, period.month),
            );
            const allOn = keys.every((key) => selected.has(key));
            const someOn = keys.some((key) => selected.has(key));
            return (
              <div key={year}>
                <label className="period-delete__year">
                  <input
                    type="checkbox"
                    checked={allOn}
                    ref={(node) => {
                      if (node) node.indeterminate = someOn && !allOn;
                    }}
                    disabled={pending}
                    onChange={() => toggleYear(yearPeriods)}
                  />
                  <span>{year}</span>
                </label>
                <div className="period-delete__months">
                  {yearPeriods.map((period) => {
                    const key = periodKey(period.year, period.month);
                    return (
                      <label className="period-delete__month" key={key}>
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          disabled={pending}
                          onChange={() => toggleMonth(key)}
                        />
                        <span>
                          {MONTHS[period.month - 1] ?? period.month}{" "}
                          <span className="period-delete__count">
                            {period.count}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="absent-dialog__actions">
          <button
            type="button"
            className="absent-dialog__btn"
            disabled={pending}
            onClick={onDismiss}
          >
            Отмена
          </button>
          <button
            type="button"
            className="absent-dialog__btn absent-dialog__btn_primary"
            disabled={pending || chosen.length === 0}
            onClick={() =>
              onConfirm(
                chosen.map((period) => ({
                  year: period.year,
                  month: period.month,
                })),
              )
            }
          >
            Удалить выбранное ({chosen.length})
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default DeletePeriodDialog;
