import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { setMinValue, increment, decrement } from "../redux/filtersSlice";

const MinValueSetter = () => {
  const minValue = useSelector((state) => state.filters.minValue);
  const dispatch = useDispatch();

  const handleIncrement = () => {
    dispatch(increment());
  };

  const handleDecrement = () => {
    dispatch(decrement());
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
        value={minValue}
        onChange={(e) => dispatch(setMinValue(Number(e.target.value)))}
      />
      <button
        className="tools tools_square tools_plus"
        onClick={handleIncrement}
      ></button>
      <span className="input-label">Скрыть менее</span>
    </div>
  );
};

export default MinValueSetter;
