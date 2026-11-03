import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';

export interface HistogramBin {
  binRange: string;
  count: number;
  pct: number;
  isBenchmark?: boolean;
  isWarning?: boolean;
}

interface HistogramChartProps {
  title?: string;
  subtitle?: string;
  bins: HistogramBin[];
  metricLabel?: string;
  referenceBin?: string;
  height?: number;
}

export const HistogramChart: React.FC<HistogramChartProps> = ({
  title = "Frequency Distribution Histogram",
  subtitle = "Statistical distribution across metric bins",
  bins,
  metricLabel = "Readings Count",
  height = 270
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-1">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </div>
        <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
          Statistical Histogram
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins} margin={{ top: 15, right: 15, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="binRange" tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} angle={-15} textAnchor="end" />
            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
            <Tooltip
              formatter={(val: any, _name: any, item: any) => {
                const p = item.payload;
                return [`${val} occurrences (${p.pct}%)`, metricLabel];
              }}
              contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
            />
            <Bar dataKey="count" name={metricLabel} radius={[4, 4, 0, 0]}>
              {bins.map((entry, index) => {
                let fill = '#3b82f6';
                if (entry.isBenchmark) fill = '#10b981';
                if (entry.isWarning) fill = '#ef4444';
                return <Cell key={`hist-cell-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
