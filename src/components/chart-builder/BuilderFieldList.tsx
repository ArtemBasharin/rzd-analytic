import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import { dimensionFields, measureFields } from "../../chart-builder/fieldCatalog";
import { pickField } from "../../redux/chartBuilderSlice";

const BuilderFieldList: React.FC = () => {
  const dispatch = useDispatch();
  const { categoryField, valueField } = useSelector(
    (s: RootState) => s.chartBuilder.spec,
  );

  return (
    <aside className="builder-fields">
      <h3 className="builder-panel-title">Поля</h3>
      <p className="builder-hint">Нажмите поле — оно попадёт в нужный слот</p>

      <div className="builder-field-group">
        <h4>Измерения</h4>
        <ul>
          {dimensionFields.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={
                  categoryField === f.id
                    ? "builder-field-btn is-active"
                    : "builder-field-btn"
                }
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
          {measureFields.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={
                  valueField === f.id
                    ? "builder-field-btn is-active measure"
                    : "builder-field-btn measure"
                }
                onClick={() =>
                  dispatch(pickField({ id: f.id, kind: "measure" }))
                }
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default BuilderFieldList;
