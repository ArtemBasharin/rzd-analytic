import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import type { RootState } from "../../redux/store";
import { closeBuilder, setChartType } from "../../redux/chartBuilderSlice";
import { aggregateViolations } from "../../chart-builder/aggregate";
import { findField } from "../../chart-builder/fieldCatalog";
import { paretoCaption, paretoOf, paretoSeries } from "../../chart-builder/pareto";
import { yMeasures } from "../../chart-builder/types";
import { filterViolationsByPlace } from "../../utils/placeParts";
import BuilderFieldList from "./BuilderFieldList";
import BuilderConfigPanel from "./BuilderConfigPanel";
import BuilderChart from "./BuilderChart";
import BuilderStyleToolbar from "./BuilderStyleToolbar";

const CONFIG_WIDTH_STORAGE_KEY = "rzd-builder-config-width";
const CONFIG_WIDTH_DEFAULT = 260;
const CONFIG_WIDTH_MIN = 220;
const CONFIG_WIDTH_HARD_MAX = 720;
const FIELDS_COLUMN_MIN = 180;
const PREVIEW_MIN = 280;

function maxConfigWidth(containerWidth: number) {
  return Math.max(
    CONFIG_WIDTH_MIN,
    Math.min(
      CONFIG_WIDTH_HARD_MAX,
      containerWidth - FIELDS_COLUMN_MIN - PREVIEW_MIN,
    ),
  );
}

function clampConfigWidth(px: number, containerWidth: number) {
  const bounded = Math.min(CONFIG_WIDTH_HARD_MAX, Math.max(CONFIG_WIDTH_MIN, px));
  if (containerWidth <= 0) return Math.round(bounded);
  return Math.round(Math.min(maxConfigWidth(containerWidth), bounded));
}

function readConfigWidth() {
  try {
    const raw = window.localStorage.getItem(CONFIG_WIDTH_STORAGE_KEY);
    if (raw == null || raw.trim() === "") return CONFIG_WIDTH_DEFAULT;
    const stored = Number(raw);
    if (!Number.isFinite(stored)) return CONFIG_WIDTH_DEFAULT;
    return Math.round(
      Math.min(CONFIG_WIDTH_HARD_MAX, Math.max(CONFIG_WIDTH_MIN, stored)),
    );
  } catch {
    return CONFIG_WIDTH_DEFAULT;
  }
}

function rememberConfigWidth(width: number) {
  try {
    window.localStorage.setItem(CONFIG_WIDTH_STORAGE_KEY, String(width));
  } catch {
    // Private mode or a full quota should not block resizing.
  }
}

const ChartBuilderOverlay: React.FC = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((s: RootState) => s.chartBuilder.isOpen);
  const spec = useSelector((s: RootState) => s.chartBuilder.spec);
  const style = useSelector((s: RootState) => s.chartBuilder.style);
  const loadedRows = useSelector((s: RootState) => s.filters.sourceState);
  const railwayFilter = useSelector((s: RootState) => s.filters.railwayFilter);
  const regionFilter = useSelector((s: RootState) => s.filters.regionFilter);
  const sourceState = useMemo(
    () => filterViolationsByPlace(loadedRows || [], railwayFilter, regionFilter),
    [loadedRows, railwayFilter, regionFilter],
  );
  const dateStart = useSelector((s: RootState) => s.filters.dateStart);
  const dateEnd = useSelector((s: RootState) => s.filters.dateEnd);
  const bodyRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastClientXRef = useRef<number | null>(null);
  const preferredWidthRef = useRef(readConfigWidth());
  const [configWidth, setConfigWidth] = useState(preferredWidthRef.current);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (spec.chartType === "indicator") dispatch(setChartType("bar"));
  }, [spec.chartType, dispatch]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(closeBuilder());
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (!isOpen) return;
    const body = bodyRef.current;
    if (!body) return;
    const fit = () => {
      const containerWidth = body.getBoundingClientRect().width;
      if (containerWidth <= 0) return;
      setConfigWidth(clampConfigWidth(preferredWidthRef.current, containerWidth));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(body);
    return () => observer.disconnect();
  }, [isOpen]);

  const resizeFromPointer = (clientX: number) => {
    const body = bodyRef.current;
    if (!body) return preferredWidthRef.current;
    const rect = body.getBoundingClientRect();
    const next = clampConfigWidth(rect.right - clientX, rect.width);
    preferredWidthRef.current = next;
    setConfigWidth(next);
    return next;
  };

  const finishResize = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setResizing(false);
    const clientX = lastClientXRef.current;
    if (clientX == null) return;
    rememberConfigWidth(resizeFromPointer(clientX));
  };

  const onResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    draggingRef.current = true;
    lastClientXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
    resizeFromPointer(event.clientX);
  };

  const onResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    lastClientXRef.current = event.clientX;
    resizeFromPointer(event.clientX);
  };

  const onResizePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) lastClientXRef.current = event.clientX;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishResize();
  };

  const resetConfigWidth = () => {
    const body = bodyRef.current;
    const next = body
      ? clampConfigWidth(CONFIG_WIDTH_DEFAULT, body.getBoundingClientRect().width)
      : CONFIG_WIDTH_DEFAULT;
    preferredWidthRef.current = next;
    setConfigWidth(next);
    rememberConfigWidth(next);
  };

  const onResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const body = bodyRef.current;
    if (!body) return;
    const containerWidth = body.getBoundingClientRect().width;
    const step = event.shiftKey ? 48 : 16;
    let next: number | null = null;
    if (event.key === "ArrowLeft") next = configWidth + step;
    else if (event.key === "ArrowRight") next = configWidth - step;
    else if (event.key === "Home") next = CONFIG_WIDTH_MIN;
    else if (event.key === "End") next = maxConfigWidth(containerWidth);
    else if (event.key === "Enter") next = CONFIG_WIDTH_DEFAULT;
    else return;
    event.preventDefault();
    const clamped = clampConfigWidth(next, containerWidth);
    preferredWidthRef.current = clamped;
    setConfigWidth(clamped);
    rememberConfigWidth(clamped);
  };

  const effectiveSpec = useMemo(
    () => ({
      ...spec,
      dateFrom: spec.dateFrom ?? Number(dateStart) ?? null,
      dateTo: spec.dateTo ?? Number(dateEnd) ?? null,
      compareMode: spec.compareMode ?? "none",
      comparePeriods: spec.comparePeriods ?? [],
    }),
    [spec, dateStart, dateEnd],
  );

  const aggregate = useMemo(
    () =>
      aggregateViolations(sourceState || [], effectiveSpec, {
        railway: railwayFilter,
        region: regionFilter,
      }),
    [sourceState, effectiveSpec, railwayFilter, regionFilter],
  );

  const categoryLabel = findField(spec.categoryField)?.label ?? "Группа";
  const primary = yMeasures(spec)[0];
  const valueLabel = findField(primary?.fieldId ?? spec.valueField)?.label ?? "Значение";
  const paretoNote =
    spec.chartType === "bar" && style.showPareto !== false && aggregate.points.length
      ? paretoCaption(
          paretoOf(
            aggregate.points,
            paretoSeries(aggregate.series, spec.seriesLayout ?? "grouped"),
          ),
        )
      : null;

  if (!isOpen) return null;

  const measureNames = (spec.measures?.length ? spec.measures : primary ? [primary] : [])
    .map((m) => findField(m.fieldId)?.label ?? m.fieldId)
    .filter(Boolean);
  const titleParts = [
    measureNames.join(", ") || valueLabel,
    "по",
    spec.chartType === "indicator" ? "периоду" : categoryLabel,
  ];
  if (spec.compareMode === "yoy") titleParts.push("· vs прошлый год");
  if (spec.compareMode === "custom" && (spec.comparePeriods?.length || 0) > 1) {
    titleParts.push(`· ${spec.comparePeriods.length} периода`);
  }

  return (
    <div
      className={
        resizing
          ? "chart-builder-overlay is-resizing-config"
          : "chart-builder-overlay"
      }
      role="dialog"
      aria-modal="true"
      aria-label="Конструктор диаграмм"
    >
      <header className="builder-header">
        <div className="builder-header-left">
          <h2>Конструктор диаграмм</h2>
          {(spec.chartType === "indicator" || (spec.categoryField && primary)) && (
            <p className="builder-subtitle">{titleParts.join(" ")}</p>
          )}
        </div>
        <BuilderStyleToolbar />
        <IconButton
          aria-label="Закрыть конструктор"
          onClick={() => dispatch(closeBuilder())}
          sx={{ color: "#1a1a1a", flexShrink: 0 }}
        >
          <CloseIcon />
        </IconButton>
      </header>

      <div
        ref={bodyRef}
        className="builder-body"
        style={{ ["--builder-config-width" as string]: `${configWidth}px` }}
      >
        <BuilderFieldList />
        <main className="builder-preview">
          <BuilderChart
            data={aggregate.points}
            series={aggregate.series}
            chartType={spec.chartType}
            valueLabel={valueLabel}
            categoryLabel={categoryLabel}
            style={style}
            layout={spec.seriesLayout ?? "grouped"}
            indicator={aggregate.indicator}
            emptyMessage={
              spec.categoryField &&
              yMeasures(effectiveSpec).length > 0 &&
              aggregate.points.length === 0
                ? "Нет данных по текущим фильтрам и периоду"
                : undefined
            }
          />
          {paretoNote && <p className="builder-pareto-note">{paretoNote}</p>}
          {aggregate.points.length > 0 && (
            <p className="builder-preview-meta">
              Показано категорий: {aggregate.points.length}
              {spec.topN ? ` (лимит ${spec.topN})` : ""}
              {aggregate.series.length > 1
                ? ` · рядов: ${aggregate.series.length}`
                : ""}
            </p>
          )}
        </main>
        <div
          className={
            resizing
              ? "builder-config-resizer is-active"
              : "builder-config-resizer"
          }
          role="separator"
          aria-orientation="vertical"
          aria-label="Ширина панели настроек"
          aria-valuemin={CONFIG_WIDTH_MIN}
          aria-valuemax={CONFIG_WIDTH_HARD_MAX}
          aria-valuenow={configWidth}
          tabIndex={0}
          title="Потяните, чтобы изменить ширину. Двойной щелчок — ширина по умолчанию"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
          onLostPointerCapture={finishResize}
          onDoubleClick={resetConfigWidth}
          onKeyDown={onResizeKeyDown}
        />
        <BuilderConfigPanel />
      </div>
    </div>
  );
};

export default ChartBuilderOverlay;
