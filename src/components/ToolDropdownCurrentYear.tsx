import React, { useEffect, useRef, useState } from "react";
import { TiArrowSortedDown } from "react-icons/ti";
import { useDispatch, useSelector as useReduxSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../redux/store";
import { setCurrentYear } from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";

const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;


const DropdownCurrentYear = () => {
  const minCutoffMs = useSelector((state) => state.filters.minCutoffDate);
  const maxCutoffMs = useSelector((state) => state.filters.maxCutoffDate);
  const currentYear = useSelector((state) => state.filters.currentYear);
  const dispatch = useDispatch();

  const minYear = new Date(minCutoffMs).getFullYear();
  const maxYear = new Date(maxCutoffMs).getFullYear();
  const from = Number.isFinite(minYear) ? Math.min(minYear, currentYear) : currentYear;
  const to = Number.isFinite(maxYear) ? Math.max(maxYear, currentYear) : currentYear;
  const options: number[] = [];
  for (let year = from; year <= to; year += 1) options.push(year);
  if (options.length === 0) options.push(currentYear);

  const [isOpen, setIsOpen] = useState(false);

  const dropdownCurrentYearRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownCurrentYearRef.current &&
        !dropdownCurrentYearRef.current.contains(event.target as Node)
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
                handleToggle();
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
