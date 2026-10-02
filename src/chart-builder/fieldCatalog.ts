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
import { COUNT_FIELD_ID, FieldDef } from "./types";

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
];

export const measureFields: FieldDef[] = [
  {
    id: COUNT_FIELD_ID,
    key: COUNT_FIELD_ID,
    label: "Число отказов",
    kind: "measure",
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

export function findField(id: string | null): FieldDef | undefined {
  if (!id) return undefined;
  return allFields.find((f) => f.id === id);
}
