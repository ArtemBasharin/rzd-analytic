import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCheckedUnits } from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";
import { TiArrowSortedDown } from "react-icons/ti";

const DropdownUnits = () => {
  // const options = useSelector(
  //   (state) => state.filters.sankeyArrState.uniqueUnitsToolPanel
  // );
  const stackedCheckList = useSelector(
    (state) => state.filters.stackedCheckList
  );
  const sankeyCheckList = useSelector((state) => state.filters.sankeyCheckList);

  const toolPalette = useSelector((state) => state.filters.toolPalette);

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
  }, []);

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
                    checked={option.stackedChecked}
                    disabled={option.stackedIsDisabled}
                    onChange={(e) =>
                      dispatch(
                        setCheckedUnits({
                          guiltyUnit: e.target.value,
                          checked: e.target.stackedChecked,
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
                    checked={option.sankeyChecked}
                    disabled={option.sankeyIsDisabled}
                    onChange={(e) =>
                      dispatch(
                        setSankeyCheckList({
                          guiltyUnit: e.target.value,
                          checked: e.target.sankeyChecked,
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
