import React from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Main from "./components/Main";
import Popup from "./components/Popup";
import ChartBuilderOverlay from "./components/chart-builder/ChartBuilderOverlay";
import { useSelector } from "react-redux";

function App() {
  const popup = useSelector((state: any) => state.filters.popup);
  return (
    <div className="App">
      {popup.isOpened && <Popup />}
      <Navbar />
      <Main />
      <ChartBuilderOverlay />
    </div>
  );
}

export default App;
