import * as React from "react";
import Button from "@mui/material/Button";
import BarChartIcon from "@mui/icons-material/BarChart";
import { useDispatch, useSelector } from "react-redux";
import DropZoneParser from "./ToolDropZoneParser";
import ToolPanel from "./ToolPanel";
import ToolDeleteButton from "./ToolDeleteButton";
import { openBuilder } from "../redux/chartBuilderSlice";
import type { RootState } from "../redux/store";
// import DrawerMenu from "./DrawerMenu";

export default function Navbar() {
  const dispatch = useDispatch();
  const dateStart = useSelector((s: RootState) => s.filters.dateStart);
  const dateEnd = useSelector((s: RootState) => s.filters.dateEnd);

  return (
    <nav className="navbar">
      <button className="logo_main">РЖД-Аналитика</button>
      {/* <DrawerMenu /> */}
      <ToolPanel />
      <div className="right-section">
        <Button
          className="navbar-builder-btn"
          color="inherit"
          startIcon={<BarChartIcon />}
          onClick={() =>
            dispatch(
              openBuilder({
                dateFrom: Number(dateStart),
                dateTo: Number(dateEnd),
              }),
            )
          }
        >
          Конструктор
        </Button>
        <DropZoneParser />
        <ToolDeleteButton />
        <Button color="inherit">Войти</Button>
      </div>
    </nav>
  );
}
