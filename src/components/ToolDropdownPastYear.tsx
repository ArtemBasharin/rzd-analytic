import React, { useEffect, useRef, useState } from "react";
import { TiArrowSortedDown } from "react-icons/ti";
import { useDispatch, useSelector as useReduxSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../redux/store";
import { setPastYear } from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";

const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;


const DropdownPastYear = () => {
  const minCutoffMs = useSelector((state) => state.filters.minCutoffDate);
  const maxCutoffMs = useSelector((state) => state.filters.maxCutoffDate);
  const pastYear = useSelector((state) => state.filters.pastYear);
  const dispatch = useDispatch();

  const minYear = new Date(minCutoffMs).getFullYear();
  const maxYear = new Date(maxCutoffMs).getFullYear();
  const from = Number.isFinite(minYear) ? Math.min(minYear, pastYear) : pastYear;
  const to = Number.isFinite(maxYear) ? Math.max(maxYear, pastYear) : pastYear;
  const options: number[] = [];
  for (let year = from; year <= to; year += 1) options.push(year);
  if (options.length === 0) options.push(pastYear);

  const [isOpen, setIsOpen] = useState(false);

  const dropdownPastYearRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownPastYearRef.current &&
        !dropdownPastYearRef.current.contains(event.target as Node)
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
