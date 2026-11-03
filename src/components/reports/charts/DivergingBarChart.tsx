import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';

export interface DivergingBarItem {
  name: string;
  variancePct: number; // positive or negative percentage
  actualVal?: number;
  benchmarkVal?: number;
}

interface DivergingBarChartProps {
  title?: string;
  subtitle?: string;
  data: DivergingBarItem[];
  unit?: string;
  positiveLabel?: string;
  negativeLabel?: string;
  height?: number;
}

export const DivergingBarChart: React.FC<DivergingBarChartProps> = ({
  title,
  subtitle,
  data,
  unit = "%",
  positiveLabel = "Above Benchmark (+)",
  negativeLabel = "Below Benchmark (-)",
  height = 270
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-1">
          <div>
            {title && <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>}
            {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono font-bold">
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{positiveLabel}</span>
            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{negativeLabel}</span>
          </div>
        </div>
      )}

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} angle={-15} textAnchor="end" />
            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}${unit}`} />
            <Tooltip
              formatter={(val: any) => [`${Number(val) > 0 ? '+' : ''}${Number(val).toFixed(2)}${unit}`, 'Variance']}
              contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
            />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
            <Bar dataKey="variancePct" name="Variance %" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                const fill = entry.variancePct >= 0 ? '#10b981' : '#ef4444';
                return <Cell key={`div-cell-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
