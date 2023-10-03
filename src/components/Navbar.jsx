import * as React from "react";
import Button from "@mui/material/Button";
import DropZoneParser from "./DropZoneParser";
import ToolPanel from "./ToolPanel";
// import DrawerMenu from "./DrawerMenu";

export default function Navbar() {
  return (
    <nav className="navbar">
      <button className="logo_main">РЖД-Аналитика</button>
      {/* <DrawerMenu /> */}
      <ToolPanel />
      <div className="right-section">
        <DropZoneParser />
        <Button color="inherit">Войти</Button>
      </div>
    </nav>
  );
}
