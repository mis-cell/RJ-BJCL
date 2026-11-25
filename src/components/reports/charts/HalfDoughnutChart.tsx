import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface HalfDoughnutChartProps {
  title: string;
  subtitle?: string;
  percentage: number; // 0 to 100
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  accentColor?: string;
  trackColor?: string;
  height?: number;
}

export const HalfDoughnutChart: React.FC<HalfDoughnutChartProps> = ({
  title,
  subtitle,
  percentage,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  accentColor = '#0f766e',
  trackColor = '#e2e8f0',
  height = 220
}) => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));
  const data = [
    { name: primaryLabel, value: clamped },
    { name: 'Remaining', value: Math.max(0, 100 - clamped) }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between h-full">
      <div className="pb-2 border-b border-slate-100">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="relative flex items-center justify-center" style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="78%"
              startAngle={180}
              endAngle={0}
              innerRadius="68%"
              outerRadius="96%"
              paddingAngle={0}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={accentColor} />
              <Cell fill={trackColor} />
            </Pie>
            <Tooltip
              formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}%`, name]}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                color: '#f8fafc',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace'
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute bottom-5 inset-x-0 text-center pointer-events-none">
          <div className="text-3xl font-black font-mono tabular-nums text-slate-900 leading-none">
            {clamped.toFixed(1)}%
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
            Completion Rate
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-500 block">{primaryLabel}</span>
          <span className="font-mono tabular-nums font-black text-slate-900 text-sm">{primaryValue}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">{secondaryLabel}</span>
          <span className="font-mono tabular-nums font-black text-slate-700 text-sm">{secondaryValue}</span>
        </div>
      </div>
    </div>
  );
};
