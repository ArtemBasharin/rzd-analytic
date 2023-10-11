import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSankeyCheckList, setStackedCheckList } from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";
import { TiArrowSortedDown } from "react-icons/ti";

const DropdownUnits = () => {
  const stackedCheckList = useSelector(
    (state) => state.filters.stackedCheckList
  );
  const sankeyCheckList = useSelector((state) => state.filters.sankeyCheckList);
  const toolPalette = useSelector((state) => state.filters.toolPalette);
  const customCalendar = useSelector((state) => state.filters.customCalendar);
  const dispatch = useDispatch();

  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [customCalendar]);

  return (
    <div className="list_container" ref={dropdownRef}>
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
        <ul className="list list_units">
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
                    // defaultChecked="true"
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
                  />
                  {option.guiltyUnit}
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
                    // defaultChecked="true"
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
                  />
                  {option.guiltyUnit}
                </label>
              </li>
            ))}
        </ul>
      </CSSTransition>
    </div>
  );
};

export default DropdownUnits;
