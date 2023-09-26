import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCheckedUnits } from "../redux/filtersSlice";

const DropdownMenu = () => {
  const options = useSelector(
    (state) => state.filters.sankeyArrState.uniqueUnitsToolPanel
  );
  const checkedUnits = useSelector((state) => state.filters.checkedUnits);
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
    <div
      className="list_container"
      style={{ display: `${toolPalette.unitsListVisibility}` }}
      ref={dropdownRef}
    >
      <button onClick={handleToggle} className="tools tools_text-button">
        Подразделения
      </button>
      {isOpen && (
        <ul className="list">
          {options.map((option) => (
            <li className="list_element" key={"li-" + option}>
              <label key={option} className="list_label">
                <input
                  className="list_input"
                  type="checkbox"
                  value={option}
                  defaultChecked="true"
                  checked={checkedUnits.includes(option)}
                  onChange={(e) => dispatch(setCheckedUnits(e.target))}
                />
                {option}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownMenu;
