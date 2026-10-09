import filtersReducer, { setSourceState } from "./filtersSlice";

test("пустой источник очищает графики", () => {
  const seeded = filtersReducer(
    undefined,
    setSourceState([
      {
        "Начало отказа": "2024-06-15T10:00:00.000Z",
        "Виновное предприятие": "ПЧ-1",
        "Категория отказа": "1",
      },
    ]),
  );
  expect(seeded.sourceState.length).toBe(1);
  expect(seeded.sourceReady).toBe(true);

  const cleared = filtersReducer(seeded, setSourceState([]));
  expect(cleared.sourceState).toEqual([]);
  expect(cleared.sourceReady).toBe(true);
  expect(cleared.stackedCheckList).toEqual([]);
  expect(cleared.sankeyArrState).toEqual({ nodes: [], links: [] });
  expect(cleared.raceArrState).toEqual([]);
  expect(Array.isArray(cleared.analyzeState.failsArray)).toBe(true);
  expect(cleared.analyzeState.failsArray.length).toBeGreaterThan(0);
});
