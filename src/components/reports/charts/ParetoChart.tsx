import React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

export interface ParetoItem {
  name: string;
  countOrVolume: number;
  cumulativePct?: number;
  category?: string;
}

interface ParetoChartProps {
  title?: string;
  subtitle?: string;
  data: ParetoItem[];
  volumeUnit?: string;
  height?: number;
}

export const ParetoChart: React.FC<ParetoChartProps> = ({
  title = "Pareto 80/20 Analysis",
  subtitle = "Identifying the vital few drivers creating 80% of total delay/bottlenecks",
  data,
  volumeUnit = "MT",
  height = 270
}) => {
  // Sort descending and compute cumulative percentages
  const sorted = [...data].sort((a, b) => b.countOrVolume - a.countOrVolume);
  const total = sorted.reduce((sum, item) => sum + item.countOrVolume, 0);

  let runSum = 0;
  const processed = sorted.map(item => {
    runSum += item.countOrVolume;
    const cumPct = total > 0 ? (runSum / total) * 100 : 0;
    return {
      name: item.name.length > 15 ? `${item.name.substring(0, 13)}...` : item.name,
      fullName: item.name,
      volume: item.countOrVolume,
      cumPct: Number(cumPct.toFixed(1))
    };
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-1">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </div>
        <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
          Pareto 80/20 Distribution
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processed} margin={{ top: 15, right: 15, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} angle={-15} textAnchor="end" />
            {/* Left Axis: Absolute volume / count */}
            <YAxis 
              yAxisId="left" 
              tick={{ fontSize: 9, fill: '#64748b' }}
              tickFormatter={(v) => `${v}${volumeUnit}`} 
            />
            {/* Right Axis: Cumulative percentage (0 - 100%) */}
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              domain={[0, 100]} 
              tick={{ fontSize: 9, fill: '#e11d48' }}
              tickFormatter={(v) => `${v}%`} 
            />
            <Tooltip
              formatter={(val: any, name: any) => {
                if (name === 'Cumulative %') return [`${val}%`, name];
                return [`${Number(val).toFixed(2)} ${volumeUnit}`, name];
              }}
              contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
            />
            <Legend verticalAlign="bottom" height={24} formatter={(v) => <span className="text-[10px] text-slate-600 font-bold">{v}</span>} />
            <ReferenceLine yAxisId="right" y={80} stroke="#e11d48" strokeDasharray="4 4" label={{ value: '80% Threshold', position: 'top', fill: '#e11d48', fontSize: 9, fontWeight: 'bold' }} />
            <Bar yAxisId="left" dataKey="volume" name={`Volume (${volumeUnit})`} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumPct" name="Cumulative %" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 3, fill: '#e11d48' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
