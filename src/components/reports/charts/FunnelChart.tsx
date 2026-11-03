import React from 'react';
import { ArrowRight, ChevronRight, CheckCircle2, TrendingDown } from 'lucide-react';

export interface FunnelStage {
  id: string;
  name: string;
  volume: number;
  unit?: string;
  conversionPct: number; // vs previous stage
  overallPct: number;    // vs initial stage
  dropOffVolume?: number;
  dropOffPct?: number;
  color?: string;
}

interface FunnelChartProps {
  title?: string;
  subtitle?: string;
  stages: FunnelStage[];
  height?: number;
  onStageClick?: (stage: FunnelStage) => void;
}

const STAGE_COLORS = [
  '#0284c7', // Sky blue - Sauda
  '#0d9488', // Teal - Checkpoint
  '#16a34a', // Green - Temp Arrival
  '#eab308', // Amber - Final MR
  '#f97316', // Orange - Final PO
  '#8b5cf6', // Violet - Payout
];

export const FunnelChart: React.FC<FunnelChartProps> = ({
  title = "End-to-End Procurement Lifecycle Funnel",
  subtitle = "Stage-by-stage volume conversion and pipeline dropout tracking",
  stages,
  onStageClick
}) => {
  const maxVolume = stages.length > 0 ? Math.max(...stages.map(s => s.volume), 1) : 1;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {title}
          </h4>
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
            Overall Conversion: {stages.length > 0 ? stages[stages.length - 1].overallPct : 0}%
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const widthPct = Math.max(15, Math.min(100, (stage.volume / maxVolume) * 100));
          const color = stage.color || STAGE_COLORS[idx % STAGE_COLORS.length];
          const isLast = idx === stages.length - 1;
          const dropOff = stage.dropOffVolume !== undefined ? stage.dropOffVolume : (idx > 0 ? stages[idx - 1].volume - stage.volume : 0);

          return (
            <div 
              key={stage.id} 
              onClick={() => onStageClick && onStageClick(stage)}
              className="group relative cursor-pointer"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-black">
                    {idx + 1}
                  </span>
                  <span className="font-extrabold uppercase tracking-wide group-hover:text-emerald-700 transition-colors">
                    {stage.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-900 font-black">
                    {stage.volume.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {stage.unit || 'MT'}
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                    {stage.overallPct}% of Start
                  </span>
                </div>
              </div>

              {/* Funnel Bar with Dynamic Tapering Width */}
              <div className="h-7 w-full bg-slate-100 rounded-lg p-0.5 overflow-hidden flex items-center border border-slate-200/80 shadow-inner">
                <div 
                  className="h-full rounded-md transition-all duration-500 relative flex items-center justify-between px-3 text-white font-mono text-[10px] font-bold shadow-sm"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: color,
                    backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 100%)'
                  }}
                >
                  <span className="truncate">{stage.name}</span>
                  <span className="font-black text-[9px] bg-black/20 px-1.5 py-0.2 rounded">
                    {idx === 0 ? '100% (Baseline)' : `${stage.conversionPct}% Step Pass`}
                  </span>
                </div>
              </div>

              {/* Stage Drop-off indicator if not the last item */}
              {!isLast && dropOff > 0.01 && (
                <div className="pl-6 pt-1 flex items-center gap-1.5 text-[9px] text-rose-600 font-mono font-bold">
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                  <span>
                    Drop / In-Transit / Mismatch: {dropOff.toFixed(1)} {stage.unit || 'MT'} ({(100 - (stages[idx + 1]?.conversionPct || 100)).toFixed(1)}% loss)
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
