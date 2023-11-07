import React from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Main from "./components/Main";
import Popup from "./components/Popup";
import { useSelector } from "react-redux";

function App() {
  const popup = useSelector((state) => state.filters.popup);
  return (
    <div className="App">
      {popup.isOpened && <Popup />}
      <Navbar />
      <Main />
    </div>
  );
}

export default App;
