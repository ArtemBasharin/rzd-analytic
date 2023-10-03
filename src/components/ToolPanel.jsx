import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setSourceState } from "../redux/filtersSlice";
import axios from "axios";
import DateRangePicker from "./DatePicker";
import DropdownUnits from "./DropdownUnits";
import DropdownPastYear from "./DropdownPastYear";
import DropdownCurrentYear from "./DropdownCurrentYear";
import DaysInGroupSetter from "./DaysInGroupSetter";
import MinValueSetter from "./MinValueSetter";
import PeriodSetter from "./PeriodSetter";

const ToolPanel = () => {
  const toolPalette = useSelector((state) => state.filters.toolPalette);
  const dispatch = useDispatch();
  let date = new Date();

  useEffect(() => {
    let params = {
      "fromYear": date.getFullYear() - 1,
      "toYear": date.getFullYear(),
    };

    axios
      .get("/violations", { params })
      .then(function (res) {
        dispatch(setSourceState(res.data));
      })
      .catch(function (error) {
        console.log("axios.get error:", error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="controls-container">
      {toolPalette.unitsListVisibility && <DropdownUnits />}
      {toolPalette.minValueVisibility && <MinValueSetter />}
      {toolPalette.yearVisibility && <DropdownPastYear />}
      {toolPalette.yearVisibility && <DropdownCurrentYear />}
      {toolPalette.periodVisibility && <PeriodSetter />}
      {toolPalette.daysInGroupVisibility && <DaysInGroupSetter />}
      {toolPalette.datePickerVisibility && <DateRangePicker />}
    </div>
  );
};
export default ToolPanel;
