import * as React from "react";
import Button from "@mui/material/Button";
import DropZoneParser from "./DropZoneParser";
import Controls from "./Controls";
// import DrawerMenu from "./DrawerMenu";

export default function ButtonAppBar() {
  return (
    <nav className="navbar">
      <button className="logo_main">РЖД-Аналитика</button>
      {/* <DrawerMenu /> */}
      <Controls />
      <div className="right-section">
        <DropZoneParser />
        <Button color="inherit">Войти</Button>
      </div>
    </nav>
  );
}
