import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import type { RootState } from "../../redux/store";
import { closeBuilder } from "../../redux/chartBuilderSlice";
import { aggregateViolations } from "../../chart-builder/aggregate";
import { findField } from "../../chart-builder/fieldCatalog";
import BuilderFieldList from "./BuilderFieldList";
import BuilderConfigPanel from "./BuilderConfigPanel";
import BuilderChart from "./BuilderChart";
import BuilderStyleToolbar from "./BuilderStyleToolbar";

const ChartBuilderOverlay: React.FC = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((s: RootState) => s.chartBuilder.isOpen);
  const spec = useSelector((s: RootState) => s.chartBuilder.spec);
  const style = useSelector((s: RootState) => s.chartBuilder.style);
  const sourceState = useSelector((s: RootState) => s.filters.sourceState);
  const dateStart = useSelector((s: RootState) => s.filters.dateStart);
  const dateEnd = useSelector((s: RootState) => s.filters.dateEnd);

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
    () => aggregateViolations(sourceState || [], effectiveSpec),
    [sourceState, effectiveSpec],
  );

  const categoryLabel = findField(spec.categoryField)?.label ?? "Группа";
  const valueLabel = findField(spec.valueField)?.label ?? "Значение";

  if (!isOpen) return null;

  const titleParts = [
    valueLabel,
    spec.aggregation === "sum"
      ? "(сумма)"
      : spec.aggregation === "avg"
        ? "(среднее)"
        : "(кол-во)",
    "по",
    categoryLabel,
  ];
  if (spec.compareMode === "yoy") titleParts.push("· vs прошлый год");
  if (spec.compareMode === "custom" && (spec.comparePeriods?.length || 0) > 1) {
    titleParts.push(`· ${spec.comparePeriods.length} периода`);
  }

  return (
    <div
      className="chart-builder-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Конструктор диаграмм"
    >
      <header className="builder-header">
        <div className="builder-header-left">
          <h2>Конструктор диаграмм</h2>
          {spec.categoryField && spec.valueField && (
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

      <div className="builder-body">
        <BuilderFieldList />
        <main className="builder-preview">
          <BuilderChart
            data={aggregate.points}
            series={aggregate.series}
            chartType={spec.chartType}
            valueLabel={valueLabel}
            categoryLabel={categoryLabel}
            style={style}
          />
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
        <BuilderConfigPanel />
      </div>
    </div>
  );
};

export default ChartBuilderOverlay;
