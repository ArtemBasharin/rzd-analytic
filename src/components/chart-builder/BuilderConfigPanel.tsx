import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import BarChartIcon from "@mui/icons-material/BarChart";
import StackedBarChartIcon from "@mui/icons-material/StackedBarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import type { RootState } from "../../redux/store";
import {
  clearDataFilters,
  setAggregation,
  setBuilderDates,
  setCategoryField,
  setChartType,
  setCompareMode,
  setDataFilter,
  setTopN,
  setValueField,
  addComparePeriod,
  updateComparePeriod,
  removeComparePeriod,
  resetBuilderSpec,
  toggleFilterValue,
} from "../../redux/chartBuilderSlice";
import {
  dimensionFields,
  findField,
  measureFields,
} from "../../chart-builder/fieldCatalog";
import { collectFilterOptions } from "../../chart-builder/dataFilters";
import {
  Aggregation,
  ChartDataFilters,
  ChartType,
  CompareMode,
  defaultDataFilters,
} from "../../chart-builder/types";

type IconComponent = React.ComponentType<{
  fontSize?: "small" | "inherit" | "medium" | "large";
}>;

const chartTypes: { type: ChartType; label: string; Icon: IconComponent }[] = [
  { type: "bar", label: "Столбцы", Icon: BarChartIcon },
  { type: "hbar", label: "Полосы", Icon: StackedBarChartIcon },
  { type: "line", label: "Линия", Icon: ShowChartIcon },
  { type: "pie", label: "Круговая", Icon: PieChartIcon },
];

type ListFilterKey = "units" | "places" | "categories" | "kinds" | "reasons";

function toDateInputValue(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromDateInputValue(value: string, endOfDay: boolean): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const MultiCheckFilter: React.FC<{
  label: string;
  filterKey: ListFilterKey;
  options: string[];
  selected: string[];
}> = ({ label, filterKey, options, selected }) => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const summary =
    selected.length === 0
      ? "Все"
      : selected.length === 1
        ? selected[0]
        : `Выбрано: ${selected.length}`;

  return (
    <div className="builder-config-block builder-filter-block">
      <div className="builder-filter-head">
        <span className="builder-label">{label}</span>
        {selected.length > 0 && (
          <button
            type="button"
            className="builder-clear-slot"
            onClick={() =>
              dispatch(setDataFilter({ key: filterKey, value: [] }))
            }
          >
            Сбросить
          </button>
        )}
      </div>
      <button
        type="button"
        className="builder-filter-summary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="builder-filter-summary-text" title={summary}>
          {summary}
        </span>
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="builder-filter-dropdown">
          <input
            type="search"
            className="builder-filter-search"
            placeholder="Поиск…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={`Поиск: ${label}`}
          />
          <div className="builder-filter-list" role="group" aria-label={label}>
            {filtered.length === 0 && (
              <p className="builder-filter-empty">Нет значений</p>
            )}
            {filtered.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label key={opt} className="builder-filter-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      dispatch(
                        toggleFilterValue({ key: filterKey, value: opt }),
                      )
                    }
                  />
                  <span title={opt}>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const BuilderConfigPanel: React.FC = () => {
  const dispatch = useDispatch();
  const spec = useSelector((s: RootState) => s.chartBuilder.spec);
  const sourceState = useSelector((s: RootState) => s.filters.sourceState);
  const dateStart = useSelector((s: RootState) => s.filters.dateStart);
  const dateEnd = useSelector((s: RootState) => s.filters.dateEnd);
  const category = findField(spec.categoryField);
  const measure = findField(spec.valueField);
  const filters: ChartDataFilters = spec.filters ?? defaultDataFilters();

  const displayFrom = spec.dateFrom ?? Number(dateStart) ?? null;
  const displayTo = spec.dateTo ?? Number(dateEnd) ?? null;

  const options = useMemo(
    () => collectFilterOptions(sourceState || []),
    [sourceState],
  );

  const activeFilterCount =
    filters.units.length +
    filters.places.length +
    filters.categories.length +
    filters.kinds.length +
    filters.reasons.length +
    (filters.onlyWithDelays ? 1 : 0) +
    (filters.minDelayHours > 0 ? 1 : 0);

  return (
    <aside className="builder-config">
      <h3 className="builder-panel-title">Настройки</h3>

      <div className="builder-config-block">
        <span className="builder-label">Тип графика</span>
        <div className="builder-chart-types" role="group" aria-label="Тип графика">
          {chartTypes.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              title={label}
              className={
                spec.chartType === type
                  ? "builder-type-btn is-active"
                  : "builder-type-btn"
              }
              onClick={() => dispatch(setChartType(type))}
            >
              <Icon fontSize="small" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="builder-config-block">
        <label className="builder-label" htmlFor="builder-category">
          Ось X / группы
        </label>
        <select
          id="builder-category"
          value={spec.categoryField ?? ""}
          onChange={(e) =>
            dispatch(setCategoryField(e.target.value || null))
          }
        >
          <option value="">— не выбрано —</option>
          {dimensionFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        {category && (
          <button
            type="button"
            className="builder-clear-slot"
            onClick={() => dispatch(setCategoryField(null))}
          >
            Очистить
          </button>
        )}
      </div>

      <div className="builder-config-block">
        <label className="builder-label" htmlFor="builder-value">
          Значение
        </label>
        <select
          id="builder-value"
          value={spec.valueField ?? ""}
          onChange={(e) => dispatch(setValueField(e.target.value || null))}
        >
          <option value="">— не выбрано —</option>
          {measureFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        {measure && (
          <button
            type="button"
            className="builder-clear-slot"
            onClick={() => dispatch(setValueField(null))}
          >
            Очистить
          </button>
        )}
      </div>

      <div className="builder-config-block">
        <label className="builder-label" htmlFor="builder-agg">
          Агрегация
        </label>
        <select
          id="builder-agg"
          value={spec.aggregation}
          onChange={(e) =>
            dispatch(setAggregation(e.target.value as Aggregation))
          }
        >
          <option value="sum">Сумма</option>
          <option value="count">Количество</option>
          <option value="avg">Среднее</option>
        </select>
      </div>

      <div className="builder-config-block">
        <span className="builder-label">Период</span>
        <div className="builder-dates">
          <input
            type="date"
            aria-label="Дата с"
            value={toDateInputValue(displayFrom)}
            onChange={(e) =>
              dispatch(
                setBuilderDates({
                  dateFrom: fromDateInputValue(e.target.value, false),
                  dateTo: spec.dateTo ?? displayTo,
                }),
              )
            }
          />
          <span>—</span>
          <input
            type="date"
            aria-label="Дата по"
            value={toDateInputValue(displayTo)}
            onChange={(e) =>
              dispatch(
                setBuilderDates({
                  dateFrom: spec.dateFrom ?? displayFrom,
                  dateTo: fromDateInputValue(e.target.value, true),
                }),
              )
            }
          />
        </div>
      </div>

      <div className="builder-config-block">
        <label className="builder-label" htmlFor="builder-topn">
          Топ категорий
        </label>
        <input
          id="builder-topn"
          type="number"
          min={5}
          max={50}
          value={spec.topN}
          onChange={(e) =>
            dispatch(
              setTopN(Math.max(5, Math.min(50, Number(e.target.value) || 20))),
            )
          }
        />
      </div>

      <div className="builder-filters-section">
        <h4 className="builder-filters-title">Сравнение периодов</h4>
        <div className="builder-compare-modes" role="radiogroup" aria-label="Режим сравнения">
          {(
            [
              { id: "none", label: "Без сравнения" },
              { id: "yoy", label: "С прошлым годом" },
              { id: "custom", label: "Несколько периодов" },
            ] as { id: CompareMode; label: string }[]
          ).map((m) => (
            <label key={m.id} className="builder-filter-item builder-filter-toggle">
              <input
                type="radio"
                name="compare-mode"
                checked={(spec.compareMode ?? "none") === m.id}
                onChange={() => dispatch(setCompareMode(m.id))}
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
        {spec.compareMode === "yoy" && (
          <p className="builder-filter-empty">
            Столбцы — группами, линии — наложением текущего и прошлого года.
          </p>
        )}
        {spec.compareMode === "custom" && (
          <div className="builder-compare-periods">
            {(spec.comparePeriods || []).map((p, idx) => (
              <div key={p.id} className="builder-compare-period">
                <input
                  type="text"
                  className="builder-filter-search"
                  value={p.label}
                  aria-label={`Название периода ${idx + 1}`}
                  onChange={(e) =>
                    dispatch(
                      updateComparePeriod({
                        id: p.id,
                        patch: { label: e.target.value },
                      }),
                    )
                  }
                />
                <div className="builder-dates">
                  <input
                    type="date"
                    aria-label={`Период ${idx + 1} с`}
                    value={toDateInputValue(p.dateFrom)}
                    onChange={(e) =>
                      dispatch(
                        updateComparePeriod({
                          id: p.id,
                          patch: {
                            dateFrom: fromDateInputValue(e.target.value, false),
                          },
                        }),
                      )
                    }
                  />
                  <span>—</span>
                  <input
                    type="date"
                    aria-label={`Период ${idx + 1} по`}
                    value={toDateInputValue(p.dateTo)}
                    onChange={(e) =>
                      dispatch(
                        updateComparePeriod({
                          id: p.id,
                          patch: {
                            dateTo: fromDateInputValue(e.target.value, true),
                          },
                        }),
                      )
                    }
                  />
                </div>
                {(spec.comparePeriods?.length || 0) > 1 && (
                  <button
                    type="button"
                    className="builder-clear-slot"
                    onClick={() => dispatch(removeComparePeriod(p.id))}
                  >
                    Удалить
                  </button>
                )}
              </div>
            ))}
            {(spec.comparePeriods?.length || 0) < 4 && (
              <button
                type="button"
                className="builder-reset-btn"
                onClick={() => dispatch(addComparePeriod())}
              >
                + Добавить период
              </button>
            )}
          </div>
        )}
      </div>

      <div className="builder-filters-section">
        <div className="builder-filters-title-row">
          <h4 className="builder-filters-title">Фильтры данных</h4>
          {activeFilterCount > 0 && (
            <button
              type="button"
              className="builder-clear-slot"
              onClick={() => dispatch(clearDataFilters())}
            >
              Сбросить все ({activeFilterCount})
            </button>
          )}
        </div>

        <MultiCheckFilter
          label="Подразделение"
          filterKey="units"
          options={options.units}
          selected={filters.units}
        />
        <MultiCheckFilter
          label="Место возникновения"
          filterKey="places"
          options={options.places}
          selected={filters.places}
        />
        <MultiCheckFilter
          label="Категория"
          filterKey="categories"
          options={options.categories}
          selected={filters.categories}
        />
        <MultiCheckFilter
          label="Вид нарушения"
          filterKey="kinds"
          options={options.kinds}
          selected={filters.kinds}
        />
        <MultiCheckFilter
          label="Причина"
          filterKey="reasons"
          options={options.reasons}
          selected={filters.reasons}
        />

        <div className="builder-config-block">
          <label className="builder-filter-item builder-filter-toggle">
            <input
              type="checkbox"
              checked={filters.onlyWithDelays}
              onChange={(e) =>
                dispatch(
                  setDataFilter({
                    key: "onlyWithDelays",
                    value: e.target.checked,
                  }),
                )
              }
            />
            <span>Только с задержками поездов</span>
          </label>
        </div>

        <div className="builder-config-block">
          <label className="builder-label" htmlFor="builder-min-delay">
            Мин. задержка, ч
          </label>
          <input
            id="builder-min-delay"
            type="number"
            min={0}
            step={0.5}
            value={filters.minDelayHours || ""}
            placeholder="0 — без ограничения"
            onChange={(e) =>
              dispatch(
                setDataFilter({
                  key: "minDelayHours",
                  value: Math.max(0, Number(e.target.value) || 0),
                }),
              )
            }
          />
        </div>
      </div>

      <button
        type="button"
        className="builder-reset-btn"
        onClick={() => dispatch(resetBuilderSpec())}
      >
        Сбросить настройки
      </button>
    </aside>
  );
};

export default BuilderConfigPanel;
