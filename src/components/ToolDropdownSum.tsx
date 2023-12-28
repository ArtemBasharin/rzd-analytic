import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  checkAllCheckList,
  invertCheckList,
  setChartCheckList,
} from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";
import { TiArrowSortedDown } from "react-icons/ti";

interface RootState {
  filters: {
    chartCheckList: any[];
    allCheckedCheckList: any;
    toolPalette: any;
  };
}

const ToolDropdownSum = () => {
  const chartCheckList = useSelector(
    (state: RootState) => state.filters.chartCheckList
  );

  console.log(chartCheckList)
  const allChecked = useSelector(
    (state: RootState) => state.filters.allCheckedCheckList
  );
  const toolPalette = useSelector(
    (state: RootState) => state.filters.toolPalette
  );

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
        Графики
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
              {allChecked.sumline ? "Снять выделение" : "Отметить все"}
            </button>
            <button
              className="tools tools_dropdown-button"
              onClick={() => dispatch(invertCheckList(toolPalette.kind))}
              key={"invertCheckList-button-" + toolPalette.kind}
            >
              Инвертировать выбор
            </button>
          </div>
          {
            chartCheckList.map((option) => (
              <li className="list_element" key={"li-" + option.name}>
                <label
                  key={option.name + toolPalette.kind}
                  className="list_label"
                >
                  <input
                    className="list_input"
                    type="checkbox"
                    value={option.name}
                    checked={option.checked}
                    disabled={option.isDisabled}
                    onChange={(e) =>
                      {console.log(e.target)
                        dispatch(
                        setChartCheckList({
                          name: e.target.value,
                          checked: e.target.checked,
                        })
                      )
                    }}
                    style={{ accentColor: option.color }}
                  />
                  {option.translated}: {option.value}
                </label>
              </li>
            ))}
        </ul>
      </CSSTransition>
    </div>
  );
};

export default ToolDropdownSum;
