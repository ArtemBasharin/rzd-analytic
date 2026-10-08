import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import BarChartIcon from "@mui/icons-material/BarChart";
import StackedBarChartIcon from "@mui/icons-material/StackedBarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import type { RootState } from "../../redux/store";
import { filterViolationsByPlace } from "../../utils/placeParts";
import {
  clearDataFilters,
  addMeasure,
  removeMeasure,
  setBuilderDates,
  setCategoryField,
  setChartType,
  setColorField,
  setCompareMode,
  setDataFilter,
  setMeasureAggregation,
  setMeasureAxis,
  setSeriesLayout,
  setSortBy,
  setSortDir,
  setTopN,
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
import { resolveCompareSeries } from "../../chart-builder/aggregate";
import {
  collectFilterOptions,
  FilterOption,
  ListFilterKey,
} from "../../chart-builder/dataFilters";
import {
  Aggregation,
  ChartDataFilters,
  ChartType,
  CompareMode,
  MeasureSlot,
  SeriesLayout,
  SortBy,
  SortDir,
  defaultDataFilters,
  y2Measures,
  yMeasures,
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

const AGG_OPTIONS: { id: Aggregation; label: string }[] = [
  { id: "sum", label: "Сумма" },
  { id: "count", label: "Количество" },
  { id: "avg", label: "Среднее" },
  { id: "min", label: "Минимум" },
  { id: "max", label: "Максимум" },
  { id: "countUnique", label: "Уникальные" },
];

function aggregationOptions(fieldId: string) {
  if (fieldId === "__count__") {
    return AGG_OPTIONS.filter((o) => o.id === "count" || o.id === "countUnique");
  }
  return AGG_OPTIONS;
}

const FILTER_LABELS: Record<ListFilterKey, string> = {
  units: "Виновное предприятие",
  places: "Место",
  categories: "Категория",
  kinds: "Вид нарушения",
  reasons: "Причина",
};

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
  options: FilterOption[];
  selected: string[];
}> = ({ label, filterKey, options, selected }) => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.value.toLowerCase().includes(q));
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
              const checked = selected.includes(opt.value);
              const empty = opt.count === 0;
              return (
                <label
                  key={opt.value}
                  className={
                    empty
                      ? "builder-filter-item is-empty"
                      : "builder-filter-item"
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      dispatch(
                        toggleFilterValue({ key: filterKey, value: opt.value }),
                      )
                    }
                  />
                  <span className="builder-filter-item-name" title={opt.value}>
                    {opt.value}
                  </span>
                  <span className="builder-filter-count">
                    {opt.count.toLocaleString("ru-RU")}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const MeasureRow: React.FC<{
  slot: MeasureSlot;
  index: number;
  canRemove: boolean;
  y2Supported: boolean;
  yCount: number;
}> = ({ slot, index, canRemove, y2Supported, yCount }) => {
  const dispatch = useDispatch();
  const name = findField(slot.fieldId)?.label ?? slot.fieldId;
  const onY2 = slot.axis === "y2";
  const canMoveToY2 = y2Supported && !onY2 && yCount > 1;

  return (
    <div className="builder-measure-row">
      <span className="builder-measure-name">
        {onY2 ? "Y2 · " : "Y · "}
        {name}
      </span>
      <select
        aria-label={`Агрегация: ${name}`}
        value={slot.aggregation}
        onChange={(e) =>
          dispatch(
            setMeasureAggregation({
              index,
              aggregation: e.target.value as Aggregation,
            }),
          )
        }
      >
        {aggregationOptions(slot.fieldId).map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {y2Supported && (
        <button
          type="button"
          className="builder-clear-slot"
          disabled={onY2 ? false : !canMoveToY2}
          onClick={() =>
            dispatch(
              setMeasureAxis({ index, axis: onY2 ? "y" : "y2" }),
            )
          }
        >
          {onY2 ? "На Y" : "На Y2"}
        </button>
      )}
      {canRemove && (
        <button
          type="button"
          className="builder-clear-slot"
          onClick={() => dispatch(removeMeasure(index))}
        >
          Убрать
        </button>
      )}
    </div>
  );
};

const BuilderConfigPanel: React.FC = () => {
  const dispatch = useDispatch();
  const spec = useSelector((s: RootState) => s.chartBuilder.spec);
  const loadedRows = useSelector((s: RootState) => s.filters.sourceState);
  const railwayFilter = useSelector((s: RootState) => s.filters.railwayFilter);
  const regionFilter = useSelector((s: RootState) => s.filters.regionFilter);
  const sourceState = useMemo(
    () => filterViolationsByPlace(loadedRows || [], railwayFilter, regionFilter),
    [loadedRows, railwayFilter, regionFilter],
  );
  const dateStart = useSelector((s: RootState) => s.filters.dateStart);
  const dateEnd = useSelector((s: RootState) => s.filters.dateEnd);
  const category = findField(spec.categoryField);
  const filters: ChartDataFilters = spec.filters ?? defaultDataFilters();
  const measures = spec.measures?.length ? spec.measures : yMeasures(spec);
  const comparing = spec.compareMode === "yoy" || spec.compareMode === "custom";
  const y2Supported = spec.chartType === "bar" || spec.chartType === "line";
  const layoutSupported = spec.chartType === "bar" || spec.chartType === "hbar";
  const isIndicator = spec.chartType === "indicator";

  const displayFrom = spec.dateFrom ?? Number(dateStart) ?? null;
  const displayTo = spec.dateTo ?? Number(dateEnd) ?? null;

  const periods = useMemo(
    () =>
      resolveCompareSeries({
        ...spec,
        dateFrom: displayFrom,
        dateTo: displayTo,
        compareMode: spec.compareMode ?? "none",
        comparePeriods: spec.comparePeriods ?? [],
      }).map((period) => ({
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
      })),
    [spec, displayFrom, displayTo],
  );

  const facets = useMemo(
    () => collectFilterOptions(sourceState || [], filters, periods),
    [sourceState, filters, periods],
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
        <span className="builder-label">Показатели</span>
        {measures.map((slot, index) => (
          <MeasureRow
            key={`${slot.fieldId}-${slot.axis}-${index}`}
            slot={slot}
            index={index}
            canRemove={measures.length > 1}
            y2Supported={y2Supported && !comparing}
            yCount={measures.filter((m) => m.axis !== "y2").length}
          />
        ))}
        <select
          id="builder-add-measure"
          aria-label="Добавить показатель"
          value=""
          onChange={(e) => {
            if (e.target.value) dispatch(addMeasure(e.target.value));
          }}
        >
          <option value="">+ Добавить показатель</option>
          {measureFields
            .filter((f) => !measures.some((m) => m.fieldId === f.id))
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
        </select>
        {isIndicator && (
          <p className="builder-filter-empty">
            Индикатор показывает первый показатель оси Y.
          </p>
        )}
      </div>

      {!isIndicator && (
        <div className="builder-config-block">
          <label className="builder-label" htmlFor="builder-color">
            Цвет
          </label>
          <select
            id="builder-color"
            value={comparing ? "" : spec.colorField ?? ""}
            disabled={comparing}
            onChange={(e) => dispatch(setColorField(e.target.value || null))}
          >
            <option value="">— по показателям —</option>
            {dimensionFields
              .filter((f) => f.id !== spec.categoryField)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
          </select>
          {comparing && (
            <p className="builder-filter-empty">
              Сравнение периодов строится по первому показателю. Цвет и вторая ось
              недоступны.
            </p>
          )}
          {!comparing && spec.colorField && yMeasures(spec).length > 1 && (
            <p className="builder-filter-empty">
              Цвет применяется, когда на оси Y один показатель.
            </p>
          )}
          {!comparing && spec.colorField && y2Measures(spec).length > 0 && (
            <p className="builder-filter-empty">
              Цвет не смешивается со второй осью.
            </p>
          )}
        </div>
      )}

      {layoutSupported && (
        <div className="builder-config-block">
          <span className="builder-label">Раскладка столбцов</span>
          <div className="builder-compare-modes" role="radiogroup" aria-label="Раскладка">
            {(
              [
                { id: "grouped", label: "Рядом" },
                { id: "stacked", label: "Накопление" },
                { id: "normalized", label: "Доли" },
              ] as { id: SeriesLayout; label: string }[]
            ).map((m) => (
              <label key={m.id} className="builder-filter-item builder-filter-toggle">
                <input
                  type="radio"
                  name="series-layout"
                  checked={(spec.seriesLayout ?? "grouped") === m.id}
                  onChange={() => dispatch(setSeriesLayout(m.id))}
                />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!isIndicator && (
        <div className="builder-config-block">
          <span className="builder-label">Сортировка</span>
          <select
            aria-label="Поле сортировки"
            value={spec.sortBy ?? "auto"}
            onChange={(e) => dispatch(setSortBy(e.target.value as SortBy))}
          >
            <option value="auto">По умолчанию</option>
            <option value="category">По категории</option>
            <option value="value">По значению</option>
          </select>
          <select
            aria-label="Направление сортировки"
            value={spec.sortDir ?? "desc"}
            onChange={(e) => dispatch(setSortDir(e.target.value as SortDir))}
          >
            <option value="desc">По убыванию</option>
            <option value="asc">По возрастанию</option>
          </select>
        </div>
      )}

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

        <p className="builder-filter-hint">
          Число справа — сколько строк останется с этим значением при остальных
          условиях.
        </p>
        {activeFilterCount > 0 && (
          <div className="builder-filter-chips">
            {(Object.keys(FILTER_LABELS) as ListFilterKey[]).flatMap((key) =>
              filters[key].map((value) => (
                <span key={`${key}:${value}`} className="builder-filter-chip">
                  <span className="builder-filter-chip-text" title={`${FILTER_LABELS[key]}: ${value}`}>
                    {FILTER_LABELS[key]}: {value}
                  </span>
                  <button
                    type="button"
                    aria-label={`Снять ${FILTER_LABELS[key]}: ${value}`}
                    onClick={() =>
                      dispatch(toggleFilterValue({ key, value }))
                    }
                  >
                    ×
                  </button>
                </span>
              )),
            )}
            {filters.onlyWithDelays && (
              <span className="builder-filter-chip">
                <span className="builder-filter-chip-text">
                  Только с задержками
                </span>
                <button
                  type="button"
                  aria-label="Снять только с задержками"
                  onClick={() =>
                    dispatch(
                      setDataFilter({ key: "onlyWithDelays", value: false }),
                    )
                  }
                >
                  ×
                </button>
              </span>
            )}
            {filters.minDelayHours > 0 && (
              <span className="builder-filter-chip">
                <span className="builder-filter-chip-text">
                  Мин. задержка: {filters.minDelayHours} ч
                </span>
                <button
                  type="button"
                  aria-label="Снять минимальную задержку"
                  onClick={() =>
                    dispatch(setDataFilter({ key: "minDelayHours", value: 0 }))
                  }
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
        <p className="builder-filter-match">
          Подошло {facets.matched.toLocaleString("ru-RU")} из{" "}
          {facets.scoped.toLocaleString("ru-RU")}
        </p>
        {facets.matched === 0 && activeFilterCount > 0 && (
          <p className="builder-filter-hint">Нет строк по выбранным условиям</p>
        )}

        <div className="builder-config-block">
          <span className="builder-label">Задержки</span>
          <p className="builder-filter-hint">Ограничивают все списки.</p>
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

        {(Object.keys(FILTER_LABELS) as ListFilterKey[]).map((key) => (
          <MultiCheckFilter
            key={key}
            label={FILTER_LABELS[key]}
            filterKey={key}
            options={facets.options[key]}
            selected={filters[key]}
          />
        ))}
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
