import React, { useState } from 'react';
import { CompiledReportData, calcHelpers } from '../../services/reportCalculations';
import { 
  ShieldCheck, 
  Download, 
  Sliders, 
  Award, 
  Clock, 
  CheckCircle2, 
  ArrowUpDown 
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportHelpers';

interface DeliveryComplianceMatrixProps {
  deliveryCompliance: CompiledReportData['deliveryCompliance'];
}

export const DeliveryComplianceMatrix: React.FC<DeliveryComplianceMatrixProps> = ({ deliveryCompliance }) => {
  const [weights, setWeights] = useState({
    delivered: 0.4,
    onTime: 0.4,
    quality: 0.2
  });

  const [sortField, setSortField] = useState<string>('complianceScore');
  const [sortAsc, setSortAsc] = useState(false);

  const recomputedCompliance = deliveryCompliance.map(item => {
    const deliveredPct = item.scheduledMT > 0 ? ((item.onTimeMT + item.delayedMT) / item.scheduledMT) * 100 : 0;
    const score = calcHelpers.calcComplianceScore(deliveredPct, item.onTimePct, 98.0, weights);
    return {
      ...item,
      complianceScore: score
    };
  }).sort((a: any, b: any) => {
    const valA = a[sortField] ?? 0;
    const valB = b[sortField] ?? 0;
    return sortAsc ? valA - valB : valB - valA;
  });

  const handleExport = () => {
    const headers = [
      'Supplier / Partner',
      'Scheduled (MT)',
      'On-Time Delivered (MT)',
      'Delayed Delivered (MT)',
      'Undelivered (MT)',
      'On-Time %',
      'Delayed %',
      'Undelivered %',
      'Avg Delay Days',
      'Max Delay Days',
      'Compliance Score (0-100)'
    ];

    const rows = recomputedCompliance.map(c => [
      c.name,
      c.scheduledMT,
      c.onTimeMT,
      c.delayedMT,
      c.undeliveredMT,
      `${c.onTimePct}%`,
      `${c.delayedPct}%`,
      `${c.undeliveredPct}%`,
      c.avgDelayDays,
      c.maxDelayDays,
      c.complianceScore
    ]);

    exportToCSV(`Delivery_Compliance_Matrix_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Formula & Configurable Weights Toolbar */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-lg p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">
                Supplier Delivery Compliance Score Engine
              </h4>
              <p className="text-[10px] text-slate-400 font-mono">
                Formula: Compliance Score = (Delivered% × {Math.round(weights.delivered * 100)}%) + (On-Time% × {Math.round(weights.onTime * 100)}%) + (Quality% × {Math.round(weights.quality * 100)}%)
              </p>
            </div>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        {/* Weights Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-slate-800 p-2 rounded border border-slate-700">
            <div className="flex justify-between text-[10px] text-slate-300 font-bold mb-1">
              <span>Delivered Weight Factor:</span>
              <span className="text-emerald-400 font-black">{Math.round(weights.delivered * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={weights.delivered}
              onChange={(e) => setWeights({ ...weights, delivered: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="bg-slate-800 p-2 rounded border border-slate-700">
            <div className="flex justify-between text-[10px] text-slate-300 font-bold mb-1">
              <span>On-Time Delivery Factor:</span>
              <span className="text-cyan-400 font-black">{Math.round(weights.onTime * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={weights.onTime}
              onChange={(e) => setWeights({ ...weights, onTime: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="bg-slate-800 p-2 rounded border border-slate-700">
            <div className="flex justify-between text-[10px] text-slate-300 font-bold mb-1">
              <span>Quality Factor:</span>
              <span className="text-amber-400 font-black">{Math.round(weights.quality * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={weights.quality}
              onChange={(e) => setWeights({ ...weights, quality: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs border-collapse min-w-[1150px]">
            <thead className="bg-slate-800 text-white sticky top-0 text-[9px] uppercase tracking-wider font-mono z-10">
              <tr>
                <th className="p-2.5 px-3 border-r border-slate-700">Supplier Name</th>
                <th className="p-2.5 text-right border-r border-slate-700">Scheduled (MT)</th>
                <th className="p-2.5 text-right border-r border-slate-700 text-emerald-300">On-Time (MT)</th>
                <th className="p-2.5 text-right border-r border-slate-700 text-rose-300">Delayed (MT)</th>
                <th className="p-2.5 text-right border-r border-slate-700 text-amber-300">Undelivered (MT)</th>
                <th className="p-2.5 text-right border-r border-slate-700">On-Time %</th>
                <th className="p-2.5 text-right border-r border-slate-700">Delayed %</th>
                <th className="p-2.5 text-right border-r border-slate-700">Undelivered %</th>
                <th className="p-2.5 text-right border-r border-slate-700">Avg Delay</th>
                <th className="p-2.5 text-right border-r border-slate-700">Max Delay</th>
                <th className="p-2.5 text-center bg-slate-900 font-bold">Compliance Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {recomputedCompliance.map((c) => (
                <tr 
                  key={c.name}
                  className="hover:bg-emerald-50/40 transition-colors even:bg-slate-50/50"
                >
                  <td className="p-2.5 px-3 font-sans font-bold text-slate-800 border-r border-slate-100">
                    {c.name}
                  </td>
                  <td className="p-2.5 text-right text-slate-900 border-r border-slate-100 font-bold">{c.scheduledMT}</td>
                  <td className="p-2.5 text-right text-emerald-800 border-r border-slate-100 font-bold">{c.onTimeMT}</td>
                  <td className="p-2.5 text-right text-rose-800 border-r border-slate-100">{c.delayedMT}</td>
                  <td className="p-2.5 text-right text-amber-800 border-r border-slate-100 font-bold">{c.undeliveredMT}</td>
                  <td className="p-2.5 text-right text-emerald-800 border-r border-slate-100 font-bold">{c.onTimePct}%</td>
                  <td className="p-2.5 text-right text-rose-700 border-r border-slate-100">{c.delayedPct}%</td>
                  <td className="p-2.5 text-right text-amber-700 border-r border-slate-100">{c.undeliveredPct}%</td>
                  <td className="p-2.5 text-right text-slate-700 border-r border-slate-100">{c.avgDelayDays}d</td>
                  <td className="p-2.5 text-right text-slate-700 border-r border-slate-100">{c.maxDelayDays}d</td>
                  <td className="p-2.5 text-center bg-slate-50 font-sans">
                    <span className={`px-2.5 py-1 rounded font-mono font-black text-xs ${
                      c.complianceScore >= 85 ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                      c.complianceScore >= 70 ? 'bg-cyan-100 text-cyan-900 border border-cyan-300' :
                      c.complianceScore >= 50 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {c.complianceScore} / 100
                    </span>
                  </td>
                </tr>
              ))}
              {recomputedCompliance.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 italic">
                    No delivery compliance records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
