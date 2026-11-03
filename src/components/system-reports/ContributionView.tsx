import React, { useState } from 'react';
import { Layers, Award, ChevronRight, BarChart3 } from 'lucide-react';
import { SystemReportDataset, ReportTransactionLine, groupTransactionsByDimension } from '../../services/systemReportEngine';

interface ContributionViewProps {
  dataset: SystemReportDataset;
  onDrillDown: (title: string, txns: ReportTransactionLine[]) => void;
}

export const ContributionView: React.FC<ContributionViewProps> = ({
  dataset,
  onDrillDown
}) => {
  const { filtered } = dataset;
  const [dim, setDim] = useState<'supplier' | 'broker'>('supplier');

  const grouped = groupTransactionsByDimension(filtered, dim);
  const totalValue = filtered.reduce((acc, t) => acc + t.grossPurchaseValue, 0);

  // Group into tiers
  const tiered = grouped.map((g, idx) => {
    let tier = 'Lower Business (<1%)';
    let tierColor = 'bg-slate-100 text-slate-700';

    if (g.businessSharePct >= 20) {
      tier = 'Highest Business (>20%)';
      tierColor = 'bg-emerald-100 text-emerald-900 border border-emerald-300';
    } else if (g.businessSharePct >= 10) {
      tier = 'High Business (10-20%)';
      tierColor = 'bg-teal-100 text-teal-900 border border-teal-300';
    } else if (g.businessSharePct >= 5) {
      tier = 'Medium Business (5-10%)';
      tierColor = 'bg-blue-100 text-blue-900 border border-blue-300';
    } else if (g.businessSharePct >= 1) {
      tier = 'Low Business (1-5%)';
      tierColor = 'bg-amber-100 text-amber-900 border border-amber-300';
    }

    return {
      ...g,
      tier,
      tierColor,
      rank: idx + 1
    };
  });

  return (
    <div className="space-y-4 font-sans">
      
      {/* Selector */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-xs font-black uppercase text-emerald-950 tracking-wider">
            9. Business Contribution & Pareto Tier Analysis
          </h3>
          <p className="text-[10px] text-slate-500">
            Categorizes procurement volume into 5 standardized contribution tiers (Highest to Lower).
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setDim('supplier')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              dim === 'supplier' ? 'bg-emerald-900 text-white font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Supplier Contribution
          </button>
          <button
            onClick={() => setDim('broker')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              dim === 'broker' ? 'bg-emerald-900 text-white font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Broker Contribution
          </button>
        </div>
      </div>

      {/* Contribution Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-950 text-white font-black uppercase text-[10px] tracking-wider border-b border-emerald-900">
                <th className="p-3 w-12 text-center">Rank</th>
                <th className="p-3">{dim === 'supplier' ? 'Supplier Name' : 'Broker Name'}</th>
                <th className="p-3 text-right">Qty (MT)</th>
                <th className="p-3 text-right">Business Value (₹)</th>
                <th className="p-3 text-right">Share %</th>
                <th className="p-3 text-center">Contribution Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
              {tiered.map((item) => {
                const subTxns = filtered.filter(t => String(t[dim] || 'UNASSIGNED') === item.key);
                return (
                  <tr
                    key={item.key}
                    onClick={() => onDrillDown(`${dim.toUpperCase()}: ${item.key} (${item.tier})`, subTxns)}
                    className="hover:bg-emerald-50/50 transition cursor-pointer"
                  >
                    <td className="p-2.5 text-center font-bold text-slate-400">#{item.rank}</td>
                    <td className="p-2.5 font-bold text-emerald-950">{item.key}</td>
                    <td className="p-2.5 text-right font-bold">{item.quantityMT.toFixed(2)} MT</td>
                    <td className="p-2.5 text-right font-bold">₹{item.purchaseValue.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-700">
                      {item.businessSharePct.toFixed(2)}%
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${item.tierColor}`}>
                        {item.tier}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
