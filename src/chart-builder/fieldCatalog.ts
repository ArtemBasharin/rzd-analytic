import {
  failCategory,
  failKind,
  failReason,
  freightDelayed,
  freightDuration,
  guiltyUnit,
  otherDelayed,
  otherDuration,
  passDelayed,
  passDuration,
  place,
  startTime,
  subDelayed,
  subDuration,
} from "../utils/config";
import { Aggregation, COUNT_FIELD_ID, FieldDef } from "./types";

export const dimensionFields: FieldDef[] = [
  {
    id: "unit",
    key: guiltyUnit,
    label: "Виновное предприятие",
    kind: "dimension",
  },
  {
    id: "reason",
    key: failReason,
    label: "Причина",
    kind: "dimension",
  },
  {
    id: "category",
    key: failCategory,
    label: "Категория",
    kind: "dimension",
  },
  {
    id: "kind",
    key: failKind,
    label: "Вид нарушения",
    kind: "dimension",
  },
  {
    id: "place",
    key: place,
    label: "Место",
    kind: "dimension",
  },
  {
    id: "month",
    key: startTime,
    label: "Месяц отказа",
    kind: "dimension",
    derived: "month",
  },
  {
    id: "day",
    key: startTime,
    label: "День отказа",
    kind: "dimension",
    derived: "day",
  },
  {
    id: "week",
    key: startTime,
    label: "Неделя отказа",
    kind: "dimension",
    derived: "week",
  },
  {
    id: "quarter",
    key: startTime,
    label: "Квартал отказа",
    kind: "dimension",
    derived: "quarter",
  },
  {
    id: "year",
    key: startTime,
    label: "Год отказа",
    kind: "dimension",
    derived: "year",
  },
];

export const measureFields: FieldDef[] = [
  {
    id: COUNT_FIELD_ID,
    key: COUNT_FIELD_ID,
    label: "Число отказов",
    kind: "measure",
  },
  {
    id: "allDuration",
    key: "__all_duration__",
    label: "Все задержки, ч",
    kind: "measure",
    composeKeys: [freightDuration, passDuration, subDuration, otherDuration],
  },
  {
    id: "allDelayed",
    key: "__all_delayed__",
    label: "Все поезда",
    kind: "measure",
    composeKeys: [freightDelayed, passDelayed, subDelayed, otherDelayed],
  },
  {
    id: "freightDuration",
    key: freightDuration,
    label: "Задержки грузовых, ч",
    kind: "measure",
  },
  {
    id: "passDuration",
    key: passDuration,
    label: "Задержки пассажирских, ч",
    kind: "measure",
  },
  {
    id: "subDuration",
    key: subDuration,
    label: "Задержки пригородных, ч",
    kind: "measure",
  },
  {
    id: "otherDuration",
    key: otherDuration,
    label: "Задержки прочих, ч",
    kind: "measure",
  },
  {
    id: "freightDelayed",
    key: freightDelayed,
    label: "Задержано грузовых",
    kind: "measure",
  },
  {
    id: "passDelayed",
    key: passDelayed,
    label: "Задержано пассажирских",
    kind: "measure",
  },
  {
    id: "subDelayed",
    key: subDelayed,
    label: "Задержано пригородных",
    kind: "measure",
  },
  {
    id: "otherDelayed",
    key: otherDelayed,
    label: "Задержано прочих",
    kind: "measure",
  },
];

export const allFields: FieldDef[] = [...dimensionFields, ...measureFields];

/** Failure counts, train counts, or delay hours. */
export type MeasureUnit = "count" | "trains" | "hours";

const TRAIN_MEASURE_IDS: ReadonlySet<string> = new Set([
  "allDelayed",
  "freightDelayed",
  "passDelayed",
  "subDelayed",
  "otherDelayed",
]);

const HOUR_MEASURE_IDS: ReadonlySet<string> = new Set([
  "allDuration",
  "freightDuration",
  "passDuration",
  "subDuration",
  "otherDuration",
]);

/**
 * Unit of a plotted measure.
 * Count aggregations count rows, so they stay with failure counts
 * rather than hours or trains.
 */
export function measureUnit(fieldId: string, aggregation: Aggregation): MeasureUnit {
  if (
    fieldId === COUNT_FIELD_ID ||
    aggregation === "count" ||
    aggregation === "countUnique"
  ) {
    return "count";
  }
  if (TRAIN_MEASURE_IDS.has(fieldId)) return "trains";
  if (HOUR_MEASURE_IDS.has(fieldId)) return "hours";
  return "count";
}

export function findField(id: string | null): FieldDef | undefined {
  if (!id) return undefined;
  return allFields.find((f) => f.id === id);
}
