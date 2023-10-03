import React, { useEffect, useReducer, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setPattern } from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";
import { TiArrowSortedDown } from "react-icons/ti";

let date = new Date();

let initialValue = () => {
  let period = date.getMonth();
  if (period < 10) {
    return "0" + period;
  } else {
    return period.toString();
  }
};

const PeriodSetter = () => {
  const dispatch = useDispatch();

  const periodList = [
    { value: "01", title: "Январь" },
    { value: "02", title: "Февраль" },
    { value: "1-2", title: "2 месяца" },
    { value: "03", title: "Март" },
    { value: "1-3", title: "I квартал" },
    { value: "04", title: "Апрель" },
    { value: "1-4", title: "4 месяца" },
    { value: "05", title: "Май" },
    { value: "1-5", title: "5 месяцев" },
    { value: "06", title: "Июнь" },
    { value: "1-6", title: "6 месяцев" },
    { value: "4-6", title: "II квартал" },
    { value: "07", title: "Июль" },
    { value: "1-7", title: "7 месяцев" },
    { value: "08", title: "Август" },
    { value: "1-8", title: "8 месяцев" },
    { value: "09", title: "Сентябрь" },
    { value: "1-9", title: "9 месяцев" },
    { value: "7-9", title: "III квартал" },
    { value: "10", title: "Октябрь" },
    { value: "1-10", title: "10 месяцев" },
    { value: "11", title: "Ноябрь" },
    { value: "1-11", title: "11 месяцев" },
    { value: "12", title: "Декабрь" },
    { value: "1-12", title: "12 месяцев" },
    { value: "10-12", title: "IV квартал" },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [period, setPeriod] = useState(initialValue());

  const dropdownPeriodRef = useRef(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (event) => {
    if (
      dropdownPeriodRef.current &&
      !dropdownPeriodRef.current.contains(event.target)
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
        className="tools tools_text-button list_element_year tools_text-button_period"
        onClick={handleToggle}
      >
        {periodList.find((el) => el.value === period).title}
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
          {periodList.map((option) => (
            <li
              className={`list_element list_input_big ${option + "li"}`}
              key={option.value}
              onClick={() => {
                setPeriod(option.value);
                dispatch(setPattern(option.value));
                setIsOpen(false);
              }}
            >
              {option.title}
            </li>
          ))}
        </ul>
      </CSSTransition>
      <span className="input-label">Период</span>
    </div>
  );
};
export default PeriodSetter;
