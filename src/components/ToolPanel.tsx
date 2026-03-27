import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setCutoffDatesFromMeta, setSourceState } from "../redux/filtersSlice";
import {
  fetchAllViolationsPageable,
  fetchViolationsMeta,
} from "../utils/requests";
import "../utils/requests";
import DateRangePicker from "./ToolDatePicker";
import DropdownUnits from "./ToolDropdownUnits";
import DropdownPastYear from "./ToolDropdownPastYear";
import DropdownCurrentYear from "./ToolDropdownCurrentYear";
import DaysInGroupSetter from "./ToolDaysInGroupSetter";
import MinValueSetter from "./ToolMinValueSetter";
import PeriodSetter from "./ToolPeriodSetter";
import dummyArr from "../data-preprocessors/dummyArr";
import ToolDropdownSum from "./ToolDropdownSum";
const { CSSTransition } = require("react-transition-group");

const ToolPanel = () => {
  const toolPalette = useSelector((state: any) => state.filters.toolPalette);
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    const calendarYear = new Date().getFullYear();
    const yearParams = { fromYear: 2000, toYear: calendarYear + 1 };

    (async () => {
      try {
        const meta = await fetchViolationsMeta(yearParams);
        if (cancelled) return;
        if (
          meta &&
          meta.minDate != null &&
          meta.maxDate != null &&
          meta.total > 0
        ) {
          dispatch(
            setCutoffDatesFromMeta({
              minDate: meta.minDate,
              maxDate: meta.maxDate,
            }),
          );
        }

        const data = await fetchAllViolationsPageable(yearParams);
        if (cancelled) return;

        if (process.env.NODE_ENV === "development") {
          const totalHint =
            meta?.total != null ? ` (meta.total=${meta.total})` : "";
          console.log(
            "[ToolPanel] GET /violations — записей:",
            data.length,
            totalHint,
          );
        }
        dispatch(setSourceState(data));
      } catch (error) {
        if (cancelled) return;
        console.log("axios violations load error:", error);
        if (process.env.NODE_ENV === "development") {
          console.log(
            "[ToolPanel] подставляем dummyArr — отчёт не из БД или старый API",
          );
        }
        dispatch(
          setSourceState(dummyArr(calendarYear - 1, calendarYear)),
        );
      }
    })();

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
