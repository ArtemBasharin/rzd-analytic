import React from "react";
import { useDispatch, useSelector } from "react-redux";
import Tooltip from "@mui/material/Tooltip";
import type { RootState } from "../../redux/store";
import { COLOR_PALETTES } from "../../chart-builder/palettes";
import {
  setFillColor,
  setPalette,
  setRounded,
  setShadow,
  setShowGrid,
  setShowYAxis,
  setStrokeColor,
  setStrokeWidth,
} from "../../redux/chartBuilderSlice";

const BuilderStyleToolbar: React.FC = () => {
  const dispatch = useDispatch();
  const style = useSelector((s: RootState) => s.chartBuilder.style);
  const primaryFill = style.fillColors[0] || "#E53935";

  return (
    <div className="builder-style-toolbar" role="toolbar" aria-label="Оформление диаграммы">
      <div className="builder-style-group">
        <span className="builder-style-label">Палитра</span>
        <div className="builder-palette-row">
          {COLOR_PALETTES.map((pal) => (
            <Tooltip key={pal.id} title={pal.label} arrow>
              <button
                type="button"
                className={
                  style.paletteId === pal.id
                    ? "builder-palette-chip is-active"
                    : "builder-palette-chip"
                }
                aria-label={pal.label}
                onClick={() => dispatch(setPalette(pal.id))}
              >
                {pal.colors.slice(0, 4).map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="builder-style-sep" />

      <div className="builder-style-group">
        <span className="builder-style-label">Заливка</span>
        <label className="builder-color-swatch" title="Цвет заливки">
          <input
            type="color"
            value={primaryFill}
            onChange={(e) => dispatch(setFillColor(e.target.value))}
            aria-label="Цвет заливки"
          />
          <span style={{ background: primaryFill }} />
        </label>
      </div>

      <div className="builder-style-group">
        <span className="builder-style-label">Обводка</span>
        <label className="builder-color-swatch" title="Цвет обводки">
          <input
            type="color"
            value={style.strokeColor}
            onChange={(e) => dispatch(setStrokeColor(e.target.value))}
            aria-label="Цвет обводки"
          />
          <span style={{ background: style.strokeColor }} />
        </label>
        <select
          className="builder-stroke-width"
          aria-label="Толщина обводки"
          value={style.strokeWidth}
          onChange={(e) => dispatch(setStrokeWidth(Number(e.target.value)))}
        >
          <option value={0}>нет</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </div>

      <div className="builder-style-sep" />

      <div className="builder-style-toggles">
        <Tooltip title="Тень" arrow>
          <button
            type="button"
            className={style.shadow ? "builder-toggle is-on" : "builder-toggle"}
            aria-pressed={style.shadow}
            onClick={() => dispatch(setShadow(!style.shadow))}
          >
            Тень
          </button>
        </Tooltip>
        <Tooltip title="Скругление углов" arrow>
          <button
            type="button"
            className={style.rounded ? "builder-toggle is-on" : "builder-toggle"}
            aria-pressed={style.rounded}
            onClick={() => dispatch(setRounded(!style.rounded))}
          >
            Скругл.
          </button>
        </Tooltip>
        <Tooltip title="Вспомогательная сетка" arrow>
          <button
            type="button"
            className={style.showGrid ? "builder-toggle is-on" : "builder-toggle"}
            aria-pressed={style.showGrid}
            onClick={() => dispatch(setShowGrid(!style.showGrid))}
          >
            Сетка
          </button>
        </Tooltip>
        <Tooltip title="Вертикальная ось (Y)" arrow>
          <button
            type="button"
            className={style.showYAxis ? "builder-toggle is-on" : "builder-toggle"}
            aria-pressed={style.showYAxis}
            onClick={() => dispatch(setShowYAxis(!style.showYAxis))}
          >
            Ось Y
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default BuilderStyleToolbar;
