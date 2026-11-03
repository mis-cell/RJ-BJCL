import React, { useState } from 'react';
import { ArrowRight, Shuffle, CheckCircle, Clock, AlertTriangle, Layers } from 'lucide-react';

export interface SankeyNode {
  id: string;
  name: string;
  category: 'source' | 'intermediate' | 'target';
  value: number;
  unit?: string;
  color?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  label?: string;
  color?: string;
}

interface SankeyFlowChartProps {
  title?: string;
  subtitle?: string;
  mode?: 'pipeline' | 'clubbed_mr';
  nodes?: SankeyNode[];
  links?: SankeyLink[];
  clubbedMRData?: Array<{
    mrNo: string;
    lorryNo: string;
    supplier: string;
    totalWeightMT: number;
    allocations: Array<{
      saudaNo: string;
      poNo: string;
      allocatedMT: number;
      grade: string;
      sharePct: number;
    }>;
  }>;
}

export const SankeyFlowChart: React.FC<SankeyFlowChartProps> = ({
  title = "Flow & Allocation Network",
  subtitle = "Dynamic multi-tier relational allocation and flow tracking",
  mode = 'pipeline',
  clubbedMRData = []
}) => {
  const [selectedMR, setSelectedMR] = useState<string | null>(clubbedMRData[0]?.mrNo || null);

  const activeMR = clubbedMRData.find(m => m.mrNo === selectedMR) || clubbedMRData[0];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
            {title}
          </h4>
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </div>
        <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
          {mode === 'clubbed_mr' ? 'Clubbed MR Multi-Contract Split' : 'Contract-to-Payment Movement'}
        </span>
      </div>

      {mode === 'clubbed_mr' && (
        <div className="space-y-3">
          {/* Lorry / MR Selector */}
          <div className="flex flex-wrap gap-1.5 items-center pb-2 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Select MR Lorry:</span>
            {clubbedMRData.slice(0, 6).map(m => (
              <button
                key={m.mrNo}
                onClick={() => setSelectedMR(m.mrNo)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all ${
                  selectedMR === m.mrNo
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {m.mrNo} ({m.lorryNo})
              </button>
            ))}
          </div>

          {activeMR ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                {/* Source Node */}
                <div className="bg-white border-2 border-indigo-500 rounded-lg p-3 shadow-sm text-center">
                  <span className="text-[9px] font-black uppercase text-indigo-600 block">Single Physical Gate Arrival</span>
                  <p className="text-sm font-black text-slate-900 font-mono mt-0.5">{activeMR.mrNo}</p>
                  <p className="text-[10px] text-slate-600 font-bold">{activeMR.lorryNo} • {activeMR.supplier}</p>
                  <div className="mt-2 inline-block bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded font-mono text-xs font-black">
                    {activeMR.totalWeightMT.toFixed(2)} MT Total
                  </div>
                </div>

                {/* Arrow Flow */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-white px-2.5 py-1 rounded-full border border-indigo-200 shadow-xs mb-1">
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Apportioned Across {activeMR.allocations.length} Contracts</span>
                  </div>
                  <div className="w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-teal-500 rounded-full my-1" />
                  <span className="text-[9px] text-slate-500 font-mono font-bold">100% Weight Reconciliation</span>
                </div>

                {/* Target Allocated Contracts */}
                <div className="space-y-2">
                  {activeMR.allocations.map((alloc, aIdx) => (
                    <div key={aIdx} className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[11px] font-bold font-mono text-slate-900">{alloc.saudaNo}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-bold">{alloc.grade}</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono pl-3.5">PO: {alloc.poNo}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-black text-emerald-800">{alloc.allocatedMT.toFixed(2)} MT</span>
                        <span className="text-[9px] text-slate-500 font-mono block font-bold">({alloc.sharePct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">No clubbed MR allocations available</p>
          )}
        </div>
      )}

      {mode === 'pipeline' && (
        /* Full Contract to Payment Flow Graph */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
          {[
            { stage: '1. Sauda Contract', desc: 'Commercial Booking', bg: 'border-sky-300 bg-sky-50 text-sky-900', val: '100% Inception' },
            { stage: '2. Checkpoint Out', desc: 'Dispatch Authorization', bg: 'border-teal-300 bg-teal-50 text-teal-900', val: '96.4% Passed' },
            { stage: '3. Physical Arrival', desc: 'Gate & Weighbridge', bg: 'border-emerald-300 bg-emerald-50 text-emerald-900', val: '94.2% Received' },
            { stage: '4. Final MR & Audit', desc: 'Lab & Moisture Clear', bg: 'border-amber-300 bg-amber-50 text-amber-900', val: '91.8% Accepted' },
            { stage: '5. Purchase Order', desc: 'Formal Mill PO Linked', bg: 'border-orange-300 bg-orange-50 text-orange-900', val: '89.5% Billed' },
            { stage: '6. Bank Settlement', desc: 'Net Payout Cleared', bg: 'border-purple-300 bg-purple-50 text-purple-900', val: '86.1% Settled' }
          ].map((item, idx) => (
            <div key={idx} className={`border rounded-lg p-2.5 flex flex-col justify-between shadow-xs ${item.bg}`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wide block">{item.stage}</span>
                <span className="text-[8.5px] opacity-80 block">{item.desc}</span>
              </div>
              <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold">{item.val}</span>
                <CheckCircle className="w-3 h-3 opacity-75" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
