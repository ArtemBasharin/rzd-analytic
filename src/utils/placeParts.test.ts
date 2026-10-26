import { Violation } from "../types/violation";
import {
  collectPlaceOptions,
  displayPlaceName,
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

describe("displayPlaceName", () => {
  const full = "Западно-Сибирская, РЕГ-2, ИНСКАЯ";
  const span = "Западно-Сибирская, РЕГ-4, ПП 162 КМ - СРЕДНЕСИБ";

  it("оставляет полную строку, пока фильтры пустые", () => {
    expect(displayPlaceName(full, "", "")).toBe(full);
  });

  it("убирает выбранную дорогу и оставляет РЕГ", () => {
    expect(displayPlaceName(full, "Западно-Сибирская", "")).toBe(
      "РЕГ-2, ИНСКАЯ",
    );
    expect(displayPlaceName(span, "Западно-Сибирская", "")).toBe(
      "РЕГ-4, ПП 162 КМ - СРЕДНЕСИБ",
    );
  });

  it("при выбранном РЕГ убирает и дорогу, и РЕГ", () => {
    expect(displayPlaceName(full, "Западно-Сибирская", "РЕГ-2")).toBe("ИНСКАЯ");
    expect(displayPlaceName(full, "", "рег-2")).toBe("ИНСКАЯ");
    expect(displayPlaceName(span, "", "РЕГ-4")).toBe("ПП 162 КМ - СРЕДНЕСИБ");
  });

  it("не трогает чужую дорогу и строку без РЕГ-N", () => {
    expect(displayPlaceName(full, "Красноярская", "")).toBe(full);
    expect(displayPlaceName(full, "Западно-Сибирская", "РЕГ-1")).toBe(full);
    expect(displayPlaceName("ИНСКАЯ", "Западно-Сибирская", "РЕГ-2")).toBe(
      "ИНСКАЯ",
    );
    expect(
      displayPlaceName("КОЧЕНЕВО - ЧИК", "Западно-Сибирская", ""),
    ).toBe("КОЧЕНЕВО - ЧИК");
    expect(
      displayPlaceName("Остальные (менее 10 ч)", "", "РЕГ-2"),
    ).toBe("Остальные (менее 10 ч)");
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
