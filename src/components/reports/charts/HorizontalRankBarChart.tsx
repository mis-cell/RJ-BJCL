import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList
} from 'recharts';

export interface HorizontalRankItem {
  label: string;
  fullName?: string;
  value: number;
  annotation?: string; // e.g. "4/22 deals" or "₹1.42Cr"
  secondaryText?: string;
  color?: string;
}

interface HorizontalRankBarChartProps {
  title: string;
  subtitle?: string;
  data: HorizontalRankItem[];
  valueFormatter?: (v: number) => string;
  barColor?: string;
  height?: number;
  yAxisWidth?: number;
  rightSlot?: React.ReactNode;
  onBarClick?: (item: HorizontalRankItem) => void;
}

export const HorizontalRankBarChart: React.FC<HorizontalRankBarChartProps> = ({
  title,
  subtitle,
  data,
  valueFormatter = (v) => v.toLocaleString('en-IN'),
  barColor = '#0f766e',
  height = 320,
  yAxisWidth = 175,
  rightSlot,
  onBarClick
}) => {
  const prepared = data.map(item => ({
    ...item,
    shortLabel: item.label.length > 24 ? `${item.label.slice(0, 22)}…` : item.label,
    displayAnnotation: item.annotation || valueFormatter(item.value)
  }));

  const dynamicHeight = Math.max(height, prepared.length * 32 + 52);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {rightSlot}
      </div>

      {prepared.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No ranking records available for the selected filters.
        </div>
      ) : (
        <div style={{ width: '100%', height: dynamicHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={prepared}
              layout="vertical"
              margin={{ top: 4, right: 110, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                tickFormatter={(v) => {
                  const n = Number(v);
                  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
                  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
                  return n.toLocaleString('en-IN');
                }}
              />
              <YAxis
                type="category"
                dataKey="shortLabel"
                width={yAxisWidth}
                tick={{ fontSize: 10.5, fill: '#1e293b', fontWeight: 600 }}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const row = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-slate-50 rounded-lg px-3 py-2 text-[11px] font-mono shadow-lg border border-slate-700 space-y-1">
                      <div className="font-sans font-bold text-white">{row.fullName || row.label}</div>
                      <div className="text-emerald-300 font-bold">{valueFormatter(row.value)}</div>
                      {row.annotation && <div className="text-slate-300">{row.annotation}</div>}
                      {row.secondaryText && <div className="text-slate-400">{row.secondaryText}</div>}
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="value"
                barSize={18}
                radius={[0, 4, 4, 0]}
                onClick={(entry: any) => onBarClick && entry && onBarClick(entry)}
                className={onBarClick ? 'cursor-pointer' : undefined}
              >
                {prepared.map((entry, idx) => (
                  <Cell key={`hbar-${idx}`} fill={entry.color || barColor} />
                ))}
                <LabelList
                  dataKey="displayAnnotation"
                  position="right"
                  style={{ fontSize: 10, fill: '#334155', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
