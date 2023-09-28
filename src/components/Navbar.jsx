import * as React from "react";
// import AppBar from "@mui/material/AppBar";
// import Box from "@mui/material/Box";
// import Toolbar from "@mui/material/Toolbar";
// import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
// import IconButton from "@mui/material/IconButton";
// import MenuIcon from "@mui/icons-material/Menu";
import DropZoneParser from "./DropZoneParser";
import Controls from "./Controls";
// import SwipeableTemporaryDrawer from "./Drawer";

export default function ButtonAppBar() {
  return (
    <nav className="navbar">
      <Controls />
      <div className="right-section">
        <DropZoneParser />
        <Button color="inherit">Войти</Button>
      </div>
    </nav>
  );
}
