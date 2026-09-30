import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector as useReduxSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../redux/store";
import { setPopup } from "../redux/filtersSlice";

const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;


const Popup = () => {
  const popupRef = useRef<HTMLDivElement>(null);
  const popup = useSelector((state) => state.filters.popup);
  const dispatch = useDispatch();

  const handleOnClose = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (popupRef.current && popupRef.current.contains(event.target as Node)) {
      dispatch(setPopup(false));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
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
