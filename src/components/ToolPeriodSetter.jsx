import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setPattern } from "../redux/filtersSlice";
import { CSSTransition } from "react-transition-group";
import { TiArrowSortedDown } from "react-icons/ti";

const PeriodSetter = () => {
  let period = useSelector((state) => state.filters.regexpPattern);
  // console.log(period);
  const dispatch = useDispatch();

  const periodList = [
    { value: "01", title: "Январь" },
    { value: "02", title: "Февраль" },
    { value: "01|02", title: "2 месяца" },
    { value: "03", title: "Март" },
    { value: "01|02|03", title: "I квартал" },
    { value: "04", title: "Апрель" },
    { value: "01|02|03|04", title: "4 месяца" },
    { value: "05", title: "Май" },
    { value: "01|02|03|04|05", title: "5 месяцев" },
    { value: "06", title: "Июнь" },
    { value: "01|02|03|04|05|06", title: "6 месяцев" },
    { value: "04|05|06", title: "II квартал" },
    { value: "07", title: "Июль" },
    { value: "01|02|03|04|05|06|07", title: "7 месяцев" },
    { value: "08", title: "Август" },
    { value: "01|02|03|04|05|06|07|08", title: "8 месяцев" },
    { value: "09", title: "Сентябрь" },
    { value: "01|02|03|04|05|06|07|08|09", title: "9 месяцев" },
    { value: "07|08|09", title: "III квартал" },
    { value: "10", title: "Октябрь" },
    { value: "01|02|03|04|05|06|07|08|09|10", title: "10 месяцев" },
    { value: "11", title: "Ноябрь" },
    { value: "01|02|03|04|05|06|07|08|09|10|11", title: "11 месяцев" },
    { value: "12", title: "Декабрь" },
    { value: "01|02|03|04|05|06|07|08|09|10|11|12", title: "12 месяцев" },
    { value: "10|11|12", title: "IV квартал" },
  ];

  const [isOpen, setIsOpen] = useState(false);
  // const [period, setPeriod] = useState(initialValue);

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
  // console.log(periodList.find((el) => el.value === period));
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
                // setPeriod(option.value);
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
