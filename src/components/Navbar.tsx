import * as React from "react";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import BarChartIcon from "@mui/icons-material/BarChart";
import { useDispatch, useSelector } from "react-redux";
import DropZoneParser from "./ToolDropZoneParser";
import ToolPanel from "./ToolPanel";
import ToolDeleteButton from "./ToolDeleteButton";
import PlaceFilters from "./PlaceFilters";
import ReportParagraphSort from "./ReportParagraphSort";
import { openBuilder, setShowPareto } from "../redux/chartBuilderSlice";
import type { RootState } from "../redux/store";
// import DrawerMenu from "./DrawerMenu";

export default function Navbar() {
  const dispatch = useDispatch();
  const dateStart = useSelector((s: RootState) => s.filters.dateStart);
  const dateEnd = useSelector((s: RootState) => s.filters.dateEnd);
  const builderOpen = useSelector((s: RootState) => s.chartBuilder.isOpen);
  const chartType = useSelector((s: RootState) => s.chartBuilder.spec.chartType);
  const showPareto = useSelector((s: RootState) => s.chartBuilder.style.showPareto !== false);
  const paretoToggle = builderOpen && chartType === "bar";

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="logo_main">РЖД-Аналитика</button>
        <PlaceFilters />
        <ReportParagraphSort />
      </div>
      {/* <DrawerMenu /> */}
      <ToolPanel />
      <div className="right-section">
        {paretoToggle && (
          <Tooltip
            title={
              showPareto
                ? "Отключить линию Парето"
                : "Показать линию Парето"
            }
            arrow
            PopperProps={{ sx: { zIndex: 3000 } }}
          >
            <Button
              className={showPareto ? "navbar-pareto-btn is-on" : "navbar-pareto-btn"}
              color="inherit"
              aria-pressed={showPareto}
              aria-label={showPareto ? "Отключить линию Парето" : "Показать линию Парето"}
              onClick={() => dispatch(setShowPareto(!showPareto))}
            >
              Парето
            </Button>
          </Tooltip>
        )}
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
