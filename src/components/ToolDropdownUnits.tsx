import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  checkAllCheckList,
  invertCheckList,
  setRidgelineCheckList,
  setSankeyCheckList,
  setStackedCheckList,
  setSumLineCheckList,
} from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";
import { TiArrowSortedDown } from "react-icons/ti";

interface RootState {
  filters: {
    stackedCheckList: any[];
    sankeyCheckList: any[];
    ridgelineCheckList: any[];
    sumLineCheckList: any[];
    allCheckedCheckList: any;
  };
}

const DropdownUnits = () => {
  const stackedCheckList = useSelector(
    (state: RootState) => state.filters.stackedCheckList
  );
  const sankeyCheckList = useSelector(
    (state: RootState) => state.filters.sankeyCheckList
  );
  const ridgelineCheckList = useSelector(
    (state: RootState) => state.filters.ridgelineCheckList
  );
  const sumLineCheckList = useSelector(
    (state: RootState) => state.filters.sumLineCheckList
  );
  const allChecked = useSelector(
    (state: RootState) => state.filters.allCheckedCheckList
  );
  const toolPalette = useSelector((state: any) => state.filters.toolPalette);

  const dispatch = useDispatch();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLUListElement>(null);

  const handleToggle = () => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // console.log(event.target);
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="list_container">
      <button onClick={handleToggle} className="tools tools_text-button">
        Подразделения
        <TiArrowSortedDown
          className={`tools_dropdown-icon${isOpen ? "_rotate" : ""}`}
        />
      </button>
      <CSSTransition
        in={isOpen}
        timeout={100}
        classNames="dropdown"
        unmountOnExit
      >
        <ul className="list list_units" ref={dropdownRef}>
          <div className="tools_buttons-container">
            <button
              className="tools tools_dropdown-button"
              onClick={() => dispatch(checkAllCheckList(toolPalette.kind))}
              key={"checkAllCheckList-button-" + toolPalette.kind}
            >
              {allChecked[toolPalette.kind]
                ? "Снять выделение"
                : "Отметить все"}
            </button>
            <button
              className="tools tools_dropdown-button"
              onClick={() => dispatch(invertCheckList(toolPalette.kind))}
              key={"invertCheckList-button-" + toolPalette.kind}
            >
              Инвертировать выбор
            </button>
          </div>
          {toolPalette.kind === "stacked" &&
            stackedCheckList.map((option) => (
              <li className="list_element" key={"li-" + option.guiltyUnit}>
                <label
                  key={option.guiltyUnit + toolPalette.kind}
                  className="list_label"
                >
                  <input
                    className="list_input"
                    type="checkbox"
                    value={option.guiltyUnit}
                    checked={option.checked}
                    disabled={option.isDisabled}
                    onChange={(e) =>
                      dispatch(
                        setStackedCheckList({
                          guiltyUnit: e.target.value,
                          checked: e.target.checked,
                        })
                      )
                    }
                    style={{ accentColor: option.checkboxColor }}
                  />
                  {option.guiltyUnit}, ({option.value} ч)
                </label>
              </li>
            ))}

          {toolPalette.kind === "sankey" &&
            sankeyCheckList.map((option) => (
              <li className="list_element" key={"li-" + option.guiltyUnit}>
                <label
                  key={option.guiltyUnit + toolPalette.kind}
                  className="list_label"
                >
                  <input
                    className="list_input"
                    type="checkbox"
                    value={option.guiltyUnit}
                    checked={option.checked}
                    disabled={option.isDisabled}
                    onChange={(e) =>
                      dispatch(
                        setSankeyCheckList({
                          guiltyUnit: e.target.value,
                          checked: e.target.checked,
                        })
                      )
                    }
                    style={{ accentColor: option.checkboxColor }}
                  />
                  {option.guiltyUnit}, ({option.value} ч)
                </label>
              </li>
            ))}

          {toolPalette.kind === "ridgeline" &&
            ridgelineCheckList.map((option) => (
              <li className="list_element" key={"li-" + option.guiltyUnit}>
                <label
                  key={option.guiltyUnit + toolPalette.kind}
                  className="list_label"
                >
                  <input
                    className="list_input"
                    type="checkbox"
                    value={option.guiltyUnit}
                    checked={option.checked}
                    disabled={option.isDisabled}
                    onChange={(e) => {
                      // console.log(e.target);
                      dispatch(
                        setRidgelineCheckList({
                          guiltyUnit: e.target.value,
                          checked: e.target.checked,
                        })
                      );
                    }}
                    style={{ accentColor: option.checkboxColor }}
                  />
                  {option.guiltyUnit}, ({option.value} ч)
                </label>
              </li>
            ))}

          {toolPalette.kind === "sumline" &&
            sumLineCheckList.map((option) => (
              <li className="list_element" key={"li-" + option.guiltyUnit}>
                <label
                  key={option.guiltyUnit + toolPalette.kind}
                  className="list_label"
                >
                  <input
                    className="list_input"
                    type="checkbox"
                    value={option.guiltyUnit}
                    checked={option.checked}
                    disabled={option.isDisabled}
                    onChange={(e) => {
                      // console.log(e.target);
                      dispatch(
                        setSumLineCheckList({
                          guiltyUnit: e.target.value,
                          checked: e.target.checked,
                        })
                      );
                    }}
                    style={{ accentColor: option.checkboxColor }}
                  />
                  {option.guiltyUnit}, ({option.value} ч)
                </label>
              </li>
            ))}
        </ul>
      </CSSTransition>
    </div>
  );
};

export default DropdownUnits;
