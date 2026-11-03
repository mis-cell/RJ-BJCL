import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';

export interface ScorecardMetric {
  subject: string;
  score: number;       // 0 - 100
  benchmark?: number; // 0 - 100 benchmark
  fullMark?: number;
}

interface RadarScorecardProps {
  title?: string;
  subtitle?: string;
  entityName: string;
  entityType?: 'Broker' | 'Supplier' | 'Region';
  data: ScorecardMetric[];
  height?: number;
}

export const RadarScorecard: React.FC<RadarScorecardProps> = ({
  title = "Overall Composite Performance Scorecard",
  subtitle = "Multi-axis operational rating (0-100 scale)",
  entityName,
  entityType = "Broker",
  data,
  height = 260
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-1">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h4>
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle} • <strong className="text-emerald-700">{entityName}</strong></p>}
        </div>
        <span className="text-[9px] font-mono font-bold bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
          5-Axis Spider Metric
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#94a3b8' }} />
            <Tooltip
              formatter={(val: any, name: any) => [`${Number(val).toFixed(1)} / 100`, name]}
              contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
            />
            <Legend verticalAlign="bottom" height={24} formatter={(v) => <span className="text-[10px] text-slate-600 font-bold">{v}</span>} />
            <Radar name={`${entityName} Score`} dataKey="score" stroke="#059669" fill="#10b981" fillOpacity={0.45} />
            {data.some(d => d.benchmark !== undefined) && (
              <Radar name="Mill Benchmark (85)" dataKey="benchmark" stroke="#6366f1" fill="#818cf8" fillOpacity={0.15} />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
