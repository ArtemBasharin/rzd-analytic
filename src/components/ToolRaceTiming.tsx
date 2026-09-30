import { useDispatch, useSelector as useReduxSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../redux/store";
import { setRaceDurationSec, setRaceStepSec } from "../redux/filtersSlice";
import {
  clampRaceDurationSec,
  clampRaceStepSec,
  writeRaceTiming,
} from "../utils/raceTiming";

const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

const RaceTimingSetter = () => {
  const stepSec = useSelector((state) => state.filters.raceStepSec);
  const durationSec = useSelector((state) => state.filters.raceDurationSec);
  const dispatch = useDispatch();

  const commit = (step: number, duration: number) => {
    const durationNext = clampRaceDurationSec(duration);
    const stepNext = Math.min(clampRaceStepSec(step), durationNext);
    dispatch(setRaceStepSec(stepNext));
    dispatch(setRaceDurationSec(durationNext));
    writeRaceTiming(stepNext, durationNext);
  };

  return (
    <div className="race-timing-row">
      <div className="tools divider race-timing" title="Начальная длительность шага">
        <button
          className="tools tools_square tools_minus"
          onClick={() => commit(stepSec - 0.1, durationSec)}
        ></button>
        <input
          className="tools_square"
          type="text"
          inputMode="decimal"
          value={stepSec}
          onChange={(event) => {
            const value = Number(event.target.value.replace(",", "."));
            if (!Number.isFinite(value)) return;
            commit(value, durationSec);
          }}
        />
        <button
          className="tools tools_square tools_plus"
          onClick={() => commit(stepSec + 0.1, durationSec)}
        ></button>
        <span className="input-label">Начальный шаг, с</span>
      </div>
      <div className="tools divider race-timing" title="Общая продолжительность анимации">
        <button
          className="tools tools_square tools_minus"
          onClick={() => commit(stepSec, durationSec - 1)}
        ></button>
        <input
          className="tools_square"
          type="text"
          inputMode="numeric"
          value={durationSec}
          onChange={(event) => {
            const value = Number(event.target.value.replace(",", "."));
            if (!Number.isFinite(value)) return;
            commit(stepSec, value);
          }}
        />
        <button
          className="tools tools_square tools_plus"
          onClick={() => commit(stepSec, durationSec + 1)}
        ></button>
        <span className="input-label">Вся анимация, с</span>
      </div>
    </div>
  );
};

export default RaceTimingSetter;
