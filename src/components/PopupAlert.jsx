import React, { useEffect, useRef, useState } from "react";
const PopupAlert = () => {
  const popupRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  //   const handleOnClose = (event) => {
  //     if (popupRef.current && !popupRef.current.contains(event.target)) {
  //       setIsOpen(false);
  //     }
  //   };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`popup ${isOpen && "popup_opened"}`}>
      <div className="popup__container" onClick={handleClickOutside}>
        <div className="popup__status popup__status_fail" />
        <h2 className="popup__title">Ошибка</h2>
        <button
          type="button"
          className="popup__close-button"
          onClick={setIsOpen(false)}
        />
      </div>
    </div>
  );
};
export default PopupAlert;
