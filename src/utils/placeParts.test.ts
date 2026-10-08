import { Violation } from "../types/violation";
import {
  collectPlaceOptions,
  filterViolationsByPlace,
  parsePlaceParts,
} from "./placeParts";

function row(place: string): Violation {
  return {
    "Виновное предприятие": "ПЧ-1",
    "Начало отказа": "2026-01-01T00:00:00",
    Категория: 1,
    Место: place,
  };
}

describe("parsePlaceParts", () => {
  it("берёт дорогу и регион из места возникновения", () => {
    expect(parsePlaceParts("Западно-Сибирская, РЕГ-2, ИНСКАЯ")).toEqual({
      railway: "Западно-Сибирская",
      region: "РЕГ-2",
    });
  });

  it("не считает станцией без РЕГ-N ни дорогу, ни регион", () => {
    expect(parsePlaceParts("ИНСКАЯ")).toEqual({ railway: "", region: "" });
    expect(parsePlaceParts("КОЧЕНЕВО - ЧИК")).toEqual({
      railway: "",
      region: "",
    });
  });
});

describe("filterViolationsByPlace", () => {
  const rows = [
    row("Западно-Сибирская, РЕГ-2, ИНСКАЯ"),
    row("Западно-Сибирская, РЕГ-1, ОМСК-ПАС"),
    row("Красноярская, РЕГ-2, КРАСНОЯРСК"),
    row("АЛТАЙСКАЯ"),
  ];

  it("оставляет все строки, пока фильтры пустые", () => {
    expect(filterViolationsByPlace(rows, "", "")).toBe(rows);
  });

  it("сужает по дороге и региону вместе", () => {
    expect(
      filterViolationsByPlace(rows, "Западно-Сибирская", "РЕГ-2").map(
        (item) => item["Место"],
      ),
    ).toEqual(["Западно-Сибирская, РЕГ-2, ИНСКАЯ"]);
  });

  it("показывает регионы только выбранной дороги", () => {
    const options = collectPlaceOptions(rows, "Западно-Сибирская");
    expect(options.regions.map((item) => item.value)).toEqual(["РЕГ-1", "РЕГ-2"]);
    expect(options.railways.map((item) => item.value)).toEqual([
      "Западно-Сибирская",
      "Красноярская",
    ]);
  });
});
