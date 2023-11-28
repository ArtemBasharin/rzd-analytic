import React, { useEffect, useRef, useState } from "react";
import { TiArrowSortedDown } from "react-icons/ti";
import { useDispatch, useSelector } from "react-redux";
import { setPastYear } from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";

const DropdownPastYear = () => {
  const minDate = new Date(useSelector((state) => state.filters.minCutoffDate));
  const maxDate = new Date(useSelector((state) => state.filters.maxCutoffDate));
  const pastYear = useSelector((state) => state.filters.pastYear);
  const dispatch = useDispatch();

  const getOptions = () => {
    const arr = [];
    for (let i = minDate.getFullYear(); i < maxDate.getFullYear(); i++) {
      arr.push(i);
    }
    return arr;
  };
  let options = getOptions();

  const [isOpen, setIsOpen] = useState(false);

  const dropdownPastYearRef = useRef(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownPastYearRef.current &&
        !dropdownPastYearRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
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
        {pastYear}
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
                dispatch(setPastYear(option));
                handleToggle();
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      </CSSTransition>
      <span className="input-label">Прошлый</span>
    </div>
  );
};

export default DropdownPastYear;
