import React from 'react';

export interface HeatmapCell {
  row: string;
  col: string;
  value: number;
}

interface HeatmapChartProps {
  title: string;
  subtitle?: string;
  rows: string[];
  cols: string[];
  cells: HeatmapCell[];
  colorScheme?: 'rose' | 'teal' | 'amber';
  emptyMessage?: string;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  title,
  subtitle,
  rows,
  cols,
  cells,
  colorScheme = 'rose',
  emptyMessage = 'No matrix activity available for the selected filters.'
}) => {
  const cellMap = new Map<string, number>();
  let maxVal = 0;
  cells.forEach(c => {
    const key = `${c.row}__${c.col}`;
    const v = (cellMap.get(key) || 0) + c.value;
    cellMap.set(key, v);
    if (v > maxVal) maxVal = v;
  });

  const getBgStyle = (value: number) => {
    if (value <= 0 || maxVal <= 0) {
      return { backgroundColor: '#f8fafc', color: '#94a3b8' };
    }
    const ratio = Math.min(1, value / maxVal);
    if (colorScheme === 'teal') {
      const alpha = 0.14 + ratio * 0.78;
      return {
        backgroundColor: `rgba(13, 148, 136, ${alpha.toFixed(2)})`,
        color: ratio > 0.55 ? '#ffffff' : '#0f172a'
      };
    }
    if (colorScheme === 'amber') {
      const alpha = 0.14 + ratio * 0.78;
      return {
        backgroundColor: `rgba(217, 119, 6, ${alpha.toFixed(2)})`,
        color: ratio > 0.55 ? '#ffffff' : '#0f172a'
      };
    }
    const alpha = 0.14 + ratio * 0.78;
    return {
      backgroundColor: `rgba(217, 75, 90, ${alpha.toFixed(2)})`,
      color: ratio > 0.55 ? '#ffffff' : '#0f172a'
    };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
          <span>Low</span>
          <span className="w-3 h-3 rounded-xs border border-slate-200" style={getBgStyle(0)} />
          <span className="w-3 h-3 rounded-xs" style={getBgStyle(maxVal * 0.35)} />
          <span className="w-3 h-3 rounded-xs" style={getBgStyle(maxVal * 0.7)} />
          <span className="w-3 h-3 rounded-xs" style={getBgStyle(maxVal)} />
          <span>High ({maxVal})</span>
        </div>
      </div>

      {rows.length === 0 || cols.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="p-2 text-left text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 bg-slate-50 min-w-[140px]">
                  Section
                </th>
                {cols.map(col => (
                  <th
                    key={col}
                    className="p-2 text-center text-[10px] font-bold text-slate-600 border-b border-slate-200 bg-slate-50 whitespace-nowrap"
                    title={col}
                  >
                    {col.length > 14 ? `${col.slice(0, 12)}…` : col}
                  </th>
                ))}
                <th className="p-2 text-right text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 bg-slate-50">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(row => {
                const rowSum = cols.reduce((acc, col) => acc + (cellMap.get(`${row}__${col}`) || 0), 0);
                return (
                  <tr key={row}>
                    <td className="p-2 font-bold text-slate-800 whitespace-nowrap bg-white max-w-[180px] truncate" title={row}>
                      {row}
                    </td>
                    {cols.map(col => {
                      const val = cellMap.get(`${row}__${col}`) || 0;
                      const style = getBgStyle(val);
                      return (
                        <td key={col} className="p-1 text-center">
                          <div
                            title={`${row} × ${col}: ${val}`}
                            className="rounded py-1.5 px-2 font-mono tabular-nums font-bold text-[11px] transition"
                            style={style}
                          >
                            {val > 0 ? val : '·'}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2 text-right font-mono tabular-nums font-black text-slate-800 bg-slate-50/70">
                      {rowSum}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
