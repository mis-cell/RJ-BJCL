import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';

export interface WaterfallStep {
  name: string;
  value: number; // Signed delta or total (positive or negative)
  isTotal?: boolean;
  color?: string;
  category?: string;
}

interface WaterfallChartProps {
  title?: string;
  subtitle?: string;
  data: WaterfallStep[];
  unit?: string;
  height?: number;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  title,
  subtitle,
  data,
  unit = '₹',
  height = 280
}) => {
  // Transform data for floating bar representation
  let runningTotal = 0;
  const processedData = data.map((step, idx) => {
    if (step.isTotal) {
      const val = step.value !== undefined ? step.value : runningTotal;
      return {
        name: step.name,
        base: 0,
        amount: Math.abs(val),
        displayVal: val,
        isNegative: val < 0,
        isTotal: true,
        fill: step.color || '#059669', // Total color
      };
    } else {
      const isNeg = step.value < 0;
      const amount = Math.abs(step.value);
      const base = isNeg ? (runningTotal - amount) : runningTotal;
      runningTotal += step.value;

      return {
        name: step.name,
        base: Math.max(0, base),
        amount: amount,
        displayVal: step.value,
        isNegative: isNeg,
        isTotal: false,
        fill: step.color || (isNeg ? '#ef4444' : '#10b981'),
      };
    }
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100">
          <div>
            {title && <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>}
            {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
          </div>
          <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
            Waterfall Accounting Model
          </span>
        </div>
      )}

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis 
              tick={{ fontSize: 9, fill: '#64748b' }} 
              tickFormatter={(v) => `${unit}${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
            />
            <Tooltip
              formatter={(_val: any, _name: any, item: any) => {
                const payload = item.payload;
                const sign = payload.isTotal ? '' : (payload.displayVal >= 0 ? '+' : '-');
                return [
                  `${sign}${unit}${Math.abs(payload.displayVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  payload.isTotal ? 'Net Balance' : (payload.displayVal < 0 ? 'Deduction / Loss' : 'Addition')
                ];
              }}
              contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
            />
            {/* Invisible baseline stack */}
            <Bar dataKey="base" stackId="waterfall" fill="transparent" />
            {/* Visible change bar */}
            <Bar dataKey="amount" stackId="waterfall" radius={[4, 4, 4, 4]}>
              {processedData.map((entry, index) => (
                <Cell key={`wf-cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
