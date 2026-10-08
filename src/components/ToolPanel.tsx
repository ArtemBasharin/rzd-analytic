import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { loadViolationsIntoStore } from "../utils/loadViolations";
import "../utils/requests";
import DateRangePicker from "./ToolDatePicker";
import DropdownUnits from "./ToolDropdownUnits";
import DropdownPastYear from "./ToolDropdownPastYear";
import DropdownCurrentYear from "./ToolDropdownCurrentYear";
import DaysInGroupSetter from "./ToolDaysInGroupSetter";
import MinValueSetter from "./ToolMinValueSetter";
import PeriodSetter from "./ToolPeriodSetter";
import ToolDropdownSum from "./ToolDropdownSum";
import RaceTimingSetter from "./ToolRaceTiming";
const { CSSTransition } = require("react-transition-group");

const ToolPanel = () => {
  const toolPalette = useSelector((state: any) => state.filters.toolPalette);
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    loadViolationsIntoStore(dispatch, { shouldApply: () => !cancelled });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

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
      <CSSTransition
        in={toolPalette.raceTimingVisibility}
        timeout={timeout}
        classNames="fade"
        unmountOnExit
      >
        <RaceTimingSetter />
      </CSSTransition>
      <CSSTransition
        in={toolPalette.sumLineVisibility}
        timeout={timeout}
        classNames="fade"
        unmountOnExit
      >
        <div className="datepicker_container">
          <ToolDropdownSum />
        </div>
      </CSSTransition>
    </div>
  );
};
export default ToolPanel;
