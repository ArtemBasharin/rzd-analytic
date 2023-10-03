import React from "react";

import { useDispatch, useSelector } from "react-redux";
import {
  incrementDaysIngroup,
  decrementDaysIngroup,
  setDaysInGroup,
} from "../redux/filtersSlice";

const DaysInGroupSetter = () => {
  const daysInGroup = useSelector((state) => state.filters.daysInGroup);
  const dispatch = useDispatch();

  const handleIncrement = () => {
    dispatch(incrementDaysIngroup());
  };

  const handleDecrement = () => {
    dispatch(decrementDaysIngroup());
  };

  return (
    <div className="tools divider">
      <button
        className="tools tools_square tools_minus"
        onClick={handleDecrement}
      ></button>
      <input
        className="tools_square "
        type="text"
        value={daysInGroup}
        onChange={(e) => dispatch(setDaysInGroup(Number(e.target.value)))}
      />
      <button
        className="tools tools_square tools_plus"
        onClick={handleIncrement}
      ></button>
      <span className="input-label">Объединить по</span>
    </div>
  );
};

export default DaysInGroupSetter;
