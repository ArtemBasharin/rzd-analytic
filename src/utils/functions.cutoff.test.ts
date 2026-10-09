import { getCutoffDates } from "./functions";

test("границы дат считаются на большом списке", () => {
  const arr: { "Начало отказа": string }[] = [];
  for (let i = 0; i < 150000; i += 1) {
    arr.push({ "Начало отказа": "2020-06-15T12:00:00.000Z" });
  }
  arr.push({ "Начало отказа": "2015-01-15T12:00:00.000Z" });
  arr.push({ "Начало отказа": "2026-10-05T12:00:00.000Z" });

  const dates = getCutoffDates(arr);
  expect(dates).toBeDefined();
  expect(new Date(dates!.min).getFullYear()).toBe(2015);
  expect(new Date(dates!.max).getFullYear()).toBe(2026);
});
