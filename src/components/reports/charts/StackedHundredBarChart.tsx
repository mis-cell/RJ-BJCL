import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

export interface StackedHundredItem {
  name: string;
  [key: string]: any; // Series values (e.g. acceptedPct, rejectedPct, pendingPct)
}

export interface StackedSeriesConfig {
  key: string;
  name: string;
  color: string;
}

interface StackedHundredBarChartProps {
  title?: string;
  subtitle?: string;
  data: StackedHundredItem[];
  series: StackedSeriesConfig[];
  layout?: 'horizontal' | 'vertical';
  height?: number;
}

export const StackedHundredBarChart: React.FC<StackedHundredBarChartProps> = ({
  title,
  subtitle,
  data,
  series,
  layout = 'vertical', // 'vertical' means horizontal bars (Y is categories)
  height = 300
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-1">
          <div>
            {title && <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>}
            {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
          </div>
          <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
            100% Stacked Composition
          </span>
        </div>
      )}

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {layout === 'vertical' ? (
            <BarChart layout="vertical" data={data} margin={{ top: 10, right: 25, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(v) => `${v}%`} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={110} 
                tick={{ fontSize: 9, fill: '#334155', fontWeight: 600 }} 
                interval={0}
              />
              <Tooltip
                formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}%`, name]}
                contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Legend verticalAlign="bottom" height={26} formatter={(v) => <span className="text-[10px] text-slate-600 font-bold">{v}</span>} />
              {series.map(s => (
                <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} angle={-15} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}%`, name]}
                contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Legend verticalAlign="bottom" height={26} formatter={(v) => <span className="text-[10px] text-slate-600 font-bold">{v}</span>} />
              {series.map(s => (
                <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
