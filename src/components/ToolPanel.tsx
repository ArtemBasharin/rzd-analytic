import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setSourceState } from "../redux/filtersSlice";
import axios from "axios";
import DateRangePicker from "./ToolDatePicker";
import DropdownUnits from "./ToolDropdownUnits";
import DropdownPastYear from "./ToolDropdownPastYear";
import DropdownCurrentYear from "./ToolDropdownCurrentYear";
import DaysInGroupSetter from "./ToolDaysInGroupSetter";
import MinValueSetter from "./ToolMinValueSetter";
import PeriodSetter from "./ToolPeriodSetter";
import dummyArr from "../data-preprocessors/dummyArr";
const { CSSTransition } = require("react-transition-group");

const ToolPanel = () => {
  const toolPalette = useSelector((state: any) => state.filters.toolPalette);
  const dispatch = useDispatch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        dispatch(setSourceState(dummyArr));
      });
  }, [date, dispatch]);

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
