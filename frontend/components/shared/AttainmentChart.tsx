/* eslint-disable */
// @ts-nocheck
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './AttainmentChart.css';

const COLORS = ['#5E5CE6', '#32D2F5', '#14b8a6', '#f97316', '#ef4444', '#8b5cf6'];

const AttainmentChart = ({ data = [], title = 'CO Attainment', height = 280 }) => (
  <div className="attainment-chart glass-card">
    {title && <h3 className="attainment-chart__title">{title}</h3>}
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
        <XAxis dataKey="co" tick={{ fill: '#ffffff', fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#ffffff', fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: 12,
            fontSize: 13,
          }}
        />
        <Bar dataKey="attainment" radius={[8, 8, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default AttainmentChart;

