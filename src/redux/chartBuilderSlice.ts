import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { normalizeFilters } from "../chart-builder/dataFilters";
import { styleFromPalette } from "../chart-builder/palettes";
import {
  Aggregation,
  ChartDataFilters,
  ChartSpec,
  ChartStyle,
  ChartType,
  CompareMode,
  ComparePeriod,
  MeasureAxis,
  SeriesLayout,
  SortBy,
  SortDir,
  defaultAggregationFor,
  defaultChartSpec,
  defaultChartStyle,
  normalizeChartSpec,
  normalizeMeasureMarks,
  syncLegacyMeasureFields,
  STORAGE_KEY,
  STYLE_STORAGE_KEY,
} from "../chart-builder/types";

function readStoredSpec(): ChartSpec {
  const base = defaultChartSpec();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<ChartSpec>;
    const spec = normalizeChartSpec(parsed);
    spec.filters = normalizeFilters(parsed.filters);
    return spec;
  } catch {
    return base;
  }
}

function readStoredStyle(): ChartStyle {
  const base = defaultChartStyle();
  try {
    const raw = window.localStorage.getItem(STYLE_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<ChartStyle>;
    return {
      ...base,
      ...parsed,
      fillColors:
        Array.isArray(parsed.fillColors) && parsed.fillColors.length
          ? parsed.fillColors
          : base.fillColors,
      showLabels: parsed.showLabels !== false,
      showPareto: parsed.showPareto !== false,
    };
  } catch {
    return base;
  }
}

function persistSpec(spec: ChartSpec) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(spec));
  } catch {
    // ignore
  }
}

function persistStyle(style: ChartStyle) {
  try {
    window.localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(style));
  } catch {
    // ignore
  }
}

const initialState = {
  isOpen: false,
  spec: typeof window !== "undefined" ? readStoredSpec() : defaultChartSpec(),
  style: typeof window !== "undefined" ? readStoredStyle() : defaultChartStyle(),
};

const chartBuilderSlice = createSlice({
  name: "chartBuilder",
  initialState,
  reducers: {
    openBuilder(
      state,
      action: PayloadAction<{ dateFrom: number; dateTo: number } | undefined>,
    ) {
      state.isOpen = true;
      if (action.payload) {
        if (state.spec.dateFrom == null)
          state.spec.dateFrom = action.payload.dateFrom;
        if (state.spec.dateTo == null) state.spec.dateTo = action.payload.dateTo;
      }
      persistSpec(state.spec);
    },
    closeBuilder(state) {
      state.isOpen = false;
      persistSpec(state.spec);
      persistStyle(state.style);
    },
    setChartType(state, action: PayloadAction<ChartType>) {
      state.spec.chartType = action.payload;
      if (
        action.payload === "hbar" ||
        action.payload === "pie" ||
        action.payload === "indicator"
      ) {
        state.spec.measures = state.spec.measures.map((m) => ({ ...m, axis: "y" }));
      }
      syncLegacyMeasureFields(state.spec);
      persistSpec(state.spec);
    },
    setCategoryField(state, action: PayloadAction<string | null>) {
      state.spec.categoryField = action.payload;
      if (action.payload && state.spec.colorField === action.payload) {
        state.spec.colorField = null;
      }
      persistSpec(state.spec);
    },
    setValueField(state, action: PayloadAction<string | null>) {
      if (!action.payload) {
        state.spec.measures = state.spec.measures.filter((m) => m.axis === "y2");
        if (!state.spec.measures.length) {
          state.spec.measures = defaultChartSpec().measures;
        }
      } else {
        state.spec.measures = [
          {
            fieldId: action.payload,
            axis: "y",
            aggregation: defaultAggregationFor(action.payload),
            mark: "bar",
          },
        ];
      }
      normalizeMeasureMarks(state.spec.measures);
      syncLegacyMeasureFields(state.spec);
      persistSpec(state.spec);
    },
    setAggregation(state, action: PayloadAction<Aggregation>) {
      const slot = state.spec.measures.find((m) => m.axis === "y");
      if (slot) slot.aggregation = action.payload;
      syncLegacyMeasureFields(state.spec);
      persistSpec(state.spec);
    },
    addMeasure(state, action: PayloadAction<string>) {
      const fieldId = action.payload;
      if (!fieldId) return;
      if (state.spec.measures.some((m) => m.fieldId === fieldId)) return;
      if (state.spec.measures.length >= 8) return;
      state.spec.measures.push({
        fieldId,
        axis: "y",
        aggregation: defaultAggregationFor(fieldId),
        mark: "line",
      });
      normalizeMeasureMarks(state.spec.measures);
      syncLegacyMeasureFields(state.spec);
      persistSpec(state.spec);
    },
    removeMeasure(state, action: PayloadAction<number>) {
      if (state.spec.measures.length <= 1) return;
      state.spec.measures.splice(action.payload, 1);
      if (!state.spec.measures.some((m) => m.axis === "y")) {
        state.spec.measures[0].axis = "y";
      }
      normalizeMeasureMarks(state.spec.measures);
      syncLegacyMeasureFields(state.spec);
      persistSpec(state.spec);
    },
    setMeasureAggregation(
      state,
      action: PayloadAction<{ index: number; aggregation: Aggregation }>,
    ) {
      const slot = state.spec.measures[action.payload.index];
      if (!slot) return;
      slot.aggregation = action.payload.aggregation;
      syncLegacyMeasureFields(state.spec);
      persistSpec(state.spec);
    },
    setMeasureAxis(
      state,
      action: PayloadAction<{ index: number; axis: MeasureAxis }>,
    ) {
      const slot = state.spec.measures[action.payload.index];
      if (!slot) return;
      const next = action.payload.axis;
      if (next === "y2") {
        if (state.spec.chartType !== "bar" && state.spec.chartType !== "line") return;
        const yCount = state.spec.measures.filter((m) => m.axis !== "y2").length;
        if (slot.axis !== "y2" && yCount <= 1) return;
      }
      slot.axis = next;
      syncLegacyMeasureFields(state.spec);
      persistSpec(state.spec);
    },
    setColorField(state, action: PayloadAction<string | null>) {
      state.spec.colorField = action.payload;
      persistSpec(state.spec);
    },
    setSeriesLayout(state, action: PayloadAction<SeriesLayout>) {
      state.spec.seriesLayout = action.payload;
      persistSpec(state.spec);
    },
    setSortBy(state, action: PayloadAction<SortBy>) {
      state.spec.sortBy = action.payload;
      persistSpec(state.spec);
    },
    setSortDir(state, action: PayloadAction<SortDir>) {
      state.spec.sortDir = action.payload;
      persistSpec(state.spec);
    },
    setBuilderDates(
      state,
      action: PayloadAction<{ dateFrom: number | null; dateTo: number | null }>,
    ) {
      state.spec.dateFrom = action.payload.dateFrom;
      state.spec.dateTo = action.payload.dateTo;
      persistSpec(state.spec);
    },
    setTopN(state, action: PayloadAction<number>) {
      state.spec.topN = action.payload;
      persistSpec(state.spec);
    },
    setDataFilter(
      state,
      action: PayloadAction<{
        key: keyof ChartDataFilters;
        value: ChartDataFilters[keyof ChartDataFilters];
      }>,
    ) {
      const { key, value } = action.payload;
      state.spec.filters = {
        ...normalizeFilters(state.spec.filters),
        [key]: value,
      };
      persistSpec(state.spec);
    },
    toggleFilterValue(
      state,
      action: PayloadAction<{
        key: "units" | "places" | "categories" | "kinds" | "reasons";
        value: string;
      }>,
    ) {
      const filters = normalizeFilters(state.spec.filters);
      const list = [...filters[action.payload.key]];
      const idx = list.indexOf(action.payload.value);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(action.payload.value);
      state.spec.filters = { ...filters, [action.payload.key]: list };
      persistSpec(state.spec);
    },
    clearDataFilters(state) {
      state.spec.filters = normalizeFilters(null);
      persistSpec(state.spec);
    },
    setCompareMode(state, action: PayloadAction<CompareMode>) {
      state.spec.compareMode = action.payload;
      if (action.payload === "custom" && state.spec.comparePeriods.length === 0) {
        state.spec.comparePeriods = [
          {
            id: "period-1",
            label: "Период 1",
            dateFrom: state.spec.dateFrom,
            dateTo: state.spec.dateTo,
          },
          {
            id: "period-2",
            label: "Период 2",
            dateFrom:
              state.spec.dateFrom != null
                ? new Date(state.spec.dateFrom).setFullYear(
                    new Date(state.spec.dateFrom).getFullYear() - 1,
                  )
                : null,
            dateTo:
              state.spec.dateTo != null
                ? new Date(state.spec.dateTo).setFullYear(
                    new Date(state.spec.dateTo).getFullYear() - 1,
                  )
                : null,
          },
        ];
      }
      persistSpec(state.spec);
    },
    addComparePeriod(state) {
      const n = state.spec.comparePeriods.length + 1;
      if (n > 4) return;
      state.spec.comparePeriods.push({
        id: `period-${Date.now()}`,
        label: `Период ${n}`,
        dateFrom: state.spec.dateFrom,
        dateTo: state.spec.dateTo,
      });
      state.spec.compareMode = "custom";
      persistSpec(state.spec);
    },
    updateComparePeriod(
      state,
      action: PayloadAction<{ id: string; patch: Partial<ComparePeriod> }>,
    ) {
      const idx = state.spec.comparePeriods.findIndex(
        (p) => p.id === action.payload.id,
      );
      if (idx < 0) return;
      state.spec.comparePeriods[idx] = {
        ...state.spec.comparePeriods[idx],
        ...action.payload.patch,
      };
      persistSpec(state.spec);
    },
    removeComparePeriod(state, action: PayloadAction<string>) {
      state.spec.comparePeriods = state.spec.comparePeriods.filter(
        (p) => p.id !== action.payload,
      );
      persistSpec(state.spec);
    },
    resetBuilderSpec(state) {
      state.spec = defaultChartSpec();
      persistSpec(state.spec);
    },
    pickField(
      state,
      action: PayloadAction<{ id: string; kind: "dimension" | "measure" }>,
    ) {
      const { id, kind } = action.payload;
      if (kind === "dimension") {
        state.spec.categoryField = id;
        if (state.spec.colorField === id) state.spec.colorField = null;
      } else {
        const index = state.spec.measures.findIndex((m) => m.fieldId === id);
        if (index >= 0) {
          if (state.spec.measures.length <= 1) return;
          state.spec.measures.splice(index, 1);
          if (!state.spec.measures.some((m) => m.axis === "y")) {
            state.spec.measures[0].axis = "y";
          }
        } else if (state.spec.measures.length < 8) {
          state.spec.measures.push({
            fieldId: id,
            axis: "y",
            aggregation: defaultAggregationFor(id),
            mark: "line",
          });
        } else {
          return;
        }
        normalizeMeasureMarks(state.spec.measures);
        syncLegacyMeasureFields(state.spec);
      }
      persistSpec(state.spec);
    },
    setBarMeasure(state, action: PayloadAction<string>) {
      const fieldId = action.payload;
      if (state.spec.measures.length < 2) return;
      if (!state.spec.measures.some((m) => m.fieldId === fieldId)) return;
      for (const measure of state.spec.measures) {
        measure.mark = measure.fieldId === fieldId ? "bar" : "line";
      }
      persistSpec(state.spec);
    },
    setPalette(state, action: PayloadAction<string>) {
      state.style = styleFromPalette(action.payload, state.style);
      persistStyle(state.style);
    },
    setFillColor(state, action: PayloadAction<string>) {
      // Apply primary fill; keep rest of palette relative by replacing first
      const next = [...state.style.fillColors];
      next[0] = action.payload;
      state.style.fillColors = next;
      state.style.paletteId = "custom";
      persistStyle(state.style);
    },
    setStrokeColor(state, action: PayloadAction<string>) {
      state.style.strokeColor = action.payload;
      persistStyle(state.style);
    },
    setStrokeWidth(state, action: PayloadAction<number>) {
      state.style.strokeWidth = action.payload;
      persistStyle(state.style);
    },
    setShadow(state, action: PayloadAction<boolean>) {
      state.style.shadow = action.payload;
      persistStyle(state.style);
    },
    setRounded(state, action: PayloadAction<boolean>) {
      state.style.rounded = action.payload;
      persistStyle(state.style);
    },
    setShowGrid(state, action: PayloadAction<boolean>) {
      state.style.showGrid = action.payload;
      persistStyle(state.style);
    },
    setShowYAxis(state, action: PayloadAction<boolean>) {
      state.style.showYAxis = action.payload;
      persistStyle(state.style);
    },
    setShowLabels(state, action: PayloadAction<boolean>) {
      state.style.showLabels = action.payload;
      persistStyle(state.style);
    },
    setShowPareto(state, action: PayloadAction<boolean>) {
      state.style.showPareto = action.payload;
      persistStyle(state.style);
    },
    resetBuilderStyle(state) {
      state.style = defaultChartStyle();
      persistStyle(state.style);
    },
  },
});

export const {
  openBuilder,
  closeBuilder,
  setChartType,
  setCategoryField,
  setValueField,
  setAggregation,
  addMeasure,
  removeMeasure,
  setMeasureAggregation,
  setMeasureAxis,
  setColorField,
  setSeriesLayout,
  setSortBy,
  setSortDir,
  setBuilderDates,
  setTopN,
  setDataFilter,
  toggleFilterValue,
  clearDataFilters,
  setCompareMode,
  addComparePeriod,
  updateComparePeriod,
  removeComparePeriod,
  resetBuilderSpec,
  pickField,
  setBarMeasure,
  setPalette,
  setFillColor,
  setStrokeColor,
  setStrokeWidth,
  setShadow,
  setRounded,
  setShowGrid,
  setShowYAxis,
  setShowLabels,
  setShowPareto,
  resetBuilderStyle,
} = chartBuilderSlice.actions;

export default chartBuilderSlice.reducer;
