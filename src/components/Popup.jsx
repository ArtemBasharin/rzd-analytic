import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setPopup } from "../redux/filtersSlice";

const Popup = () => {
  const popupRef = useRef(null);
  const popup = useSelector((state) => state.filters.popup);
  const dispatch = useDispatch();

  const handleOnClose = (event) => {
    if (popupRef.current && popupRef.current.contains(event.target)) {
      dispatch(setPopup(false));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        dispatch(setPopup(false));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dispatch]);

  return (
    <div className="popup popup_opened">
      <div className="popup__container" ref={popupRef}>
        <div className={`popup__status popup__status_${popup.status}`} />
        <h2 className="popup__title">{popup.message}</h2>
        <button
          type="button"
          className="popup__close-button"
          onClick={handleOnClose}
        />
      </div>
    </div>
  );
};
export default Popup;
