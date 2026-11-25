import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';

export interface TornadoRow {
  label: string;
  fullName?: string;
  shortageMt: number; // Positive magnitude; plotted to LEFT of zero (-shortageMt)
  excessMt: number;   // Positive magnitude; plotted to RIGHT of zero (+excessMt)
  deductionAmt?: number;
  contractMt?: number;
  receivedMt?: number;
}

interface TornadoChartProps {
  title: string;
  subtitle?: string;
  data: TornadoRow[];
  unit?: string;
  leftLabel?: string;
  rightLabel?: string;
  height?: number;
}

/**
 * Symmetric Tornado / Diverging Bar Chart:
 * Shortage sits to the LEFT of zero, Excess to the RIGHT of zero,
 * strictly enforcing the SAME scale [-maxAbs, +maxAbs] on both sides.
 */
export const TornadoChart: React.FC<TornadoChartProps> = ({
  title,
  subtitle,
  data,
  unit = 'MT',
  leftLabel = 'Shortage (MT)',
  rightLabel = 'Excess (MT)',
  height = 340
}) => {
  const chartData = data.map(item => {
    const shortMag = Math.abs(Number(item.shortageMt) || 0);
    const excessMag = Math.abs(Number(item.excessMt) || 0);
    // Net signed value if a PO is either short or excess, plus separate series for broker-level rows that may have both
    return {
      ...item,
      name: item.label.length > 22 ? `${item.label.slice(0, 20)}…` : item.label,
      shortageSigned: -Number(shortMag.toFixed(3)),
      excessSigned: Number(excessMag.toFixed(3))
    };
  });

  // Strict symmetric domain: same MT scale on both left and right of zero
  const rawMax = chartData.reduce(
    (acc, row) => Math.max(acc, Math.abs(row.shortageSigned), Math.abs(row.excessSigned)),
    0
  );
  const niceMax = rawMax > 0 ? Math.ceil(rawMax * 1.15 * 10) / 10 : 10;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-amber-800">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
            {leftLabel}
          </span>
          <span className="flex items-center gap-1.5 text-indigo-800">
            <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
            {rightLabel}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Scale: ±{niceMax.toFixed(1)} {unit}
          </span>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No shortage or excess variance records in the current view.
        </div>
      ) : (
        <div style={{ width: '100%', height: Math.max(height, chartData.length * 30 + 60) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              stackOffset="sign"
              margin={{ top: 8, right: 24, left: 12, bottom: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                domain={[-niceMax, niceMax]}
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                tickFormatter={(v) => `${Math.abs(Number(v)).toFixed(1)}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={165}
                tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const row = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-slate-50 rounded-lg px-3 py-2 text-[11px] font-mono shadow-lg border border-slate-700 space-y-1">
                      <div className="font-sans font-bold text-white border-b border-slate-700 pb-1">
                        {row.fullName || row.label}
                      </div>
                      {row.shortageMt > 0 && (
                        <div className="flex justify-between gap-4 text-amber-300">
                          <span>Shortage:</span>
                          <strong>-{Number(row.shortageMt).toFixed(3)} {unit}</strong>
                        </div>
                      )}
                      {row.excessMt > 0 && (
                        <div className="flex justify-between gap-4 text-indigo-300">
                          <span>Excess:</span>
                          <strong>+{Number(row.excessMt).toFixed(3)} {unit}</strong>
                        </div>
                      )}
                      {row.contractMt !== undefined && (
                        <div className="flex justify-between gap-4 text-slate-300">
                          <span>Contract / Recd:</span>
                          <span>{Number(row.contractMt).toFixed(2)} / {Number(row.receivedMt || 0).toFixed(2)} {unit}</span>
                        </div>
                      )}
                      {row.deductionAmt !== undefined && row.deductionAmt > 0 && (
                        <div className="flex justify-between gap-4 text-rose-300 pt-0.5 border-t border-slate-700">
                          <span>Deduction:</span>
                          <strong>₹{Number(row.deductionAmt).toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <ReferenceLine x={0} stroke="#334155" strokeWidth={1.5} />
              <Bar dataKey="shortageSigned" stackId="tornado" name={leftLabel} barSize={16} radius={[3, 0, 0, 3]}>
                {chartData.map((_, i) => (
                  <Cell key={`s-${i}`} fill="#d97706" />
                ))}
              </Bar>
              <Bar dataKey="excessSigned" stackId="tornado" name={rightLabel} barSize={16} radius={[0, 3, 3, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={`e-${i}`} fill="#4f46e5" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
