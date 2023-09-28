import React, { useEffect, useRef, useState } from "react";
import { TiArrowSortedDown } from "react-icons/ti";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentYear } from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";

const DropdownCurrentYear = () => {
  let date = new Date();

  const getOptions = () => {
    const arr = [];
    for (let i = 2014; i <= date.getFullYear(); i++) {
      arr.push(i);
    }
    return arr;
  };
  let options = getOptions();

  const currentYear = useSelector((state) => state.filters.currentYear);
  const dispatch = useDispatch();

  const [isOpen, setIsOpen] = useState(false);

  const dropdownCurrentYearRef = useRef(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (event) => {
    if (
      dropdownCurrentYearRef.current &&
      !dropdownCurrentYearRef.current.contains(event.target)
    ) {
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
    <div className="list_container">
      <button
        className="tools tools_text-button list_element_year tools_text-button_year"
        onClick={handleToggle}
      >
        {currentYear}
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
        <ul className="list" key="droplist-content">
          {options.map((option) => (
            <li
              className={`list_element list_input_big ${option + "li"}`}
              key={option + "li"}
              onClick={() => {
                dispatch(setCurrentYear(option));
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      </CSSTransition>
      <span className="input-label">Текущий</span>
    </div>
  );
};

export default DropdownCurrentYear;
