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
import { CSSTransition } from "react-transition-group";

const ToolPanel = () => {
  const toolPalette = useSelector((state) => state.filters.toolPalette);
  const dispatch = useDispatch();
  // const ref = useRef();
  let date = new Date();

  useEffect(() => {
    let params = {
      "fromYear": date.getFullYear() - 1,
      "toYear": date.getFullYear(),
    };
    console.log("params", params);
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

  const timeout = 500;
  return (
    <div className="controls-container">
      <CSSTransition
        in={toolPalette.minValueVisibility}
        timeout={timeout}
        classNames="fade"
        unmountOnExit
      >
        <MinValueSetter />
      </CSSTransition>
      <CSSTransition
        // in={toolPalette.unitsListVisibility}
        in={toolPalette.unitsListVisibility}
        timeout={timeout}
        classNames="fade"
        // nodeRef={ref}
        unmountOnExit
      >
        <DropdownUnits />
      </CSSTransition>
      <CSSTransition
        in={toolPalette.yearVisibility}
        timeout={timeout}
        classNames="fade"
        unmountOnExit
      >
        <DropdownPastYear />
      </CSSTransition>
      <CSSTransition
        in={toolPalette.yearVisibility}
        timeout={timeout}
        classNames="fade"
        unmountOnExit
      >
        <DropdownCurrentYear />
      </CSSTransition>
      <CSSTransition
        in={toolPalette.periodVisibility}
        timeout={timeout}
        classNames="fade"
        unmountOnExit
      >
        <PeriodSetter />
      </CSSTransition>
      <CSSTransition
        in={toolPalette.daysInGroupVisibility}
        timeout={timeout}
        classNames="fade"
        unmountOnExit
      >
        <DaysInGroupSetter />
      </CSSTransition>
      <CSSTransition
        in={toolPalette.datePickerVisibility}
        timeout={timeout}
        classNames="fade"
        unmountOnExit
      >
        <div className="datepicker_container">
          <DateRangePicker />
        </div>
      </CSSTransition>
    </div>
  );
};
export default ToolPanel;
