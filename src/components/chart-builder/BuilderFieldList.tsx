import React from "react";
import BarChartIcon from "@mui/icons-material/BarChart";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import { dimensionFields, measureFields } from "../../chart-builder/fieldCatalog";
import { pickField, setBarMeasure } from "../../redux/chartBuilderSlice";

function LineMarkIcon() {
  return (
    <svg className="builder-mark-icon" viewBox="0 0 20 16" aria-hidden="true">
      <path
        d="M1 14.2H19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.75"
      />
      <polyline
        points="1,10 6,3 11,11 19,2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const BuilderFieldList: React.FC = () => {
  const dispatch = useDispatch();
  const { categoryField, colorField, measures } = useSelector(
    (s: RootState) => s.chartBuilder.spec,
  );
  const selectedMeasures = new Set((measures || []).map((m) => m.fieldId));
  const showMarks = (measures || []).length >= 2;

  return (
    <aside className="builder-fields">
      <h3 className="builder-panel-title">Поля</h3>
      <p className="builder-hint">
        Нажмите поле, чтобы добавить его. Повторное нажатие снимает показатель.
        Если показателей два или больше, значок справа выбирает, какой из них
        рисуется столбцами.
      </p>

      <div className="builder-field-group">
        <h4>Измерения</h4>
        <ul>
          {dimensionFields.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={
                  categoryField === f.id || colorField === f.id
                    ? "builder-field-btn is-active"
                    : "builder-field-btn"
                }
                title={f.label}
                onClick={() =>
                  dispatch(pickField({ id: f.id, kind: "dimension" }))
                }
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="builder-field-group">
        <h4>Показатели</h4>
        <ul>
          {measureFields.map((f) => {
            const selected = selectedMeasures.has(f.id);
            const isBar =
              (measures || []).find((m) => m.fieldId === f.id)?.mark !== "line";
            const withMark = selected && showMarks;
            return (
              <li key={f.id}>
                <div
                  className={
                    withMark ? "builder-measure-slot has-mark" : "builder-measure-slot"
                  }
                >
                  <button
                    type="button"
                    className={
                      selected
                        ? "builder-field-btn is-active measure"
                        : "builder-field-btn measure"
                    }
                    aria-pressed={selected}
                    title={f.label}
                    onClick={() =>
                      dispatch(pickField({ id: f.id, kind: "measure" }))
                    }
                  >
                    {f.label}
                  </button>
                  {withMark && (
                    <button
                      type="button"
                      className="builder-mark-btn"
                      aria-pressed={isBar}
                      aria-label={
                        isBar ? "Столбчатая диаграмма" : "Показать столбцами"
                      }
                      title={
                        isBar
                          ? "Столбчатая диаграмма"
                          : "Показать этот показатель столбцами"
                      }
                      onClick={() => {
                        if (!isBar) dispatch(setBarMeasure(f.id));
                      }}
                    >
                      {isBar ? <BarChartIcon fontSize="inherit" /> : <LineMarkIcon />}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default BuilderFieldList;
