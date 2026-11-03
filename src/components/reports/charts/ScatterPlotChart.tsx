import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts';

export interface ScatterPoint {
  x: number;
  y: number;
  z?: number;
  name: string;
  category?: string;
}

interface ScatterPlotChartProps {
  title?: string;
  subtitle?: string;
  data: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  xThreshold?: number;
  yThreshold?: number;
  height?: number;
}

export const ScatterPlotChart: React.FC<ScatterPlotChartProps> = ({
  title = "Correlation & Anomaly Scatter Matrix",
  subtitle = "Evaluating operational tradeoffs and outlier points",
  data,
  xLabel,
  yLabel,
  xUnit = "",
  yUnit = "",
  xThreshold,
  yThreshold,
  height = 270
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-1">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </div>
        <span className="text-[9px] font-mono font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
          Scatter Correlation Plot
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 15, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name={xLabel} 
              unit={xUnit}
              tick={{ fontSize: 9, fill: '#64748b' }}
              label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 10, fontWeight: 700 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={yLabel} 
              unit={yUnit}
              tick={{ fontSize: 9, fill: '#64748b' }}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10, fontWeight: 700 }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 300]} name="Volume" />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value: any, name: any, item: any) => {
                const p = item.payload;
                return [`${p.name}: ${xLabel}=${p.x}${xUnit}, ${yLabel}=${p.y}${yUnit}`, 'Data Point'];
              }}
              contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
            />
            {xThreshold !== undefined && (
              <ReferenceLine x={xThreshold} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Benchmark`, fill: '#f59e0b', fontSize: 9 }} />
            )}
            {yThreshold !== undefined && (
              <ReferenceLine y={yThreshold} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Target`, fill: '#10b981', fontSize: 9 }} />
            )}
            <Scatter name="Entities" data={data} fill="#0d9488" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
