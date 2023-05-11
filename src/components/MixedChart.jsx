import {
  ResponsiveContainer,
  ComposedChart,
  Tooltip,
  Legend,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

import { chartsSource, lastYear, currentYear } from "./dataSource";

const renderCustomLineLabel = ({ payload, x, y, width, height, value }) => {
  return (
    <text x={x} y={y} dy={-40} textAnchor="middle">
      {value}
    </text>
  );
};

const MixedChart = () => {
  return (
    <>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartsSource}>
          <XAxis dataKey="name" />
          <YAxis
            type="number"
            domain={[
              (dataMin) => 0 - Math.abs(dataMin),
              (dataMax) => dataMax * 1.3,
            ]}
            hide="true"
          />
          <Tooltip />
          <Legend />
          <CartesianGrid stroke="#ccc" />
          <Bar dataKey={lastYear} barSize={70} fill="#ff3333">
            <LabelList position="top" offset="10" fill="#000000" />
          </Bar>
          <Bar dataKey={currentYear} barSize={70} fill="#413ea0">
            <LabelList position="top" offset="10" fill="#000000" />
          </Bar>
          <Line
            dataKey="dynamics"
            type="linear"
            stroke="rgba (0,0,0,0)"
            dot={false}
            fill="#000000"
            label={renderCustomLineLabel}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
};
export default MixedChart;
