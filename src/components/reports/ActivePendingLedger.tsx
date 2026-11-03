import React, { useState, useMemo } from 'react';
import { CompiledReportData, AgeingBucketKey } from '../../services/reportCalculations';
import { 
  Clock, 
  Search, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Layers,
  ArrowRight,
  Filter
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportHelpers';
import { StackedHundredBarChart } from './charts/StackedHundredBarChart';
import { ParetoChart, ParetoItem } from './charts/ParetoChart';

interface ActivePendingLedgerProps {
  activePendingLedger: CompiledReportData['activePendingLedger'];
  ageingDistribution: CompiledReportData['ageingDistribution'];
}

export const ActivePendingLedger: React.FC<ActivePendingLedgerProps> = ({
  activePendingLedger,
  ageingDistribution
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [bucketFilter, setBucketFilter] = useState<string>('ALL');

  const filteredLedger = useMemo(() => {
    return activePendingLedger.filter(item => {
      const matchesSearch = 
        item.saudaNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.area.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBucket = bucketFilter === 'ALL' || item.ageingBucket === bucketFilter;

      return matchesSearch && matchesBucket;
    });
  }, [activePendingLedger, searchTerm, bucketFilter]);

  // 1. 100% Stacked Ageing Composition Across the 6 Standard Buckets
  const ageingStackedData = useMemo(() => {
    // Top brokers ageing distribution
    const brokerMap: Record<string, {
      name: string;
      notDue: number;
      d1_7: number;
      d8_15: number;
      d16_30: number;
      d31_60: number;
      d60Plus: number;
      totalPending: number;
    }> = {};

    activePendingLedger.forEach(item => {
      const bKey = item.broker || 'Direct';
      if (!brokerMap[bKey]) {
        brokerMap[bKey] = {
          name: bKey.length > 12 ? `${bKey.substring(0, 10)}...` : bKey,
          notDue: 0,
          d1_7: 0,
          d8_15: 0,
          d16_30: 0,
          d31_60: 0,
          d60Plus: 0,
          totalPending: 0
        };
      }

      const pWt = item.pendingWeightMT;
      brokerMap[bKey].totalPending += pWt;

      if (item.ageingBucket === 'not_due') brokerMap[bKey].notDue += pWt;
      else if (item.ageingBucket === '1_7_days') brokerMap[bKey].d1_7 += pWt;
      else if (item.ageingBucket === '8_15_days') brokerMap[bKey].d8_15 += pWt;
      else if (item.ageingBucket === '16_30_days') brokerMap[bKey].d16_30 += pWt;
      else if (item.ageingBucket === '31_60_days') brokerMap[bKey].d31_60 += pWt;
      else brokerMap[bKey].d60Plus += pWt;
    });

    const rows = Object.values(brokerMap)
      .sort((a, b) => b.totalPending - a.totalPending)
      .slice(0, 6)
      .map(b => {
        const tot = b.totalPending > 0 ? b.totalPending : 1;
        return {
          name: b.name,
          notDue: Number(((b.notDue / tot) * 100).toFixed(1)),
          d1_7: Number(((b.d1_7 / tot) * 100).toFixed(1)),
          d8_15: Number(((b.d8_15 / tot) * 100).toFixed(1)),
          d16_30: Number(((b.d16_30 / tot) * 100).toFixed(1)),
          d31_60: Number(((b.d31_60 / tot) * 100).toFixed(1)),
          d60Plus: Number(((b.d60Plus / tot) * 100).toFixed(1))
        };
      });

    return rows;
  }, [activePendingLedger]);

  // 2. Pareto Chart for Overdue Liability Drivers
  const paretoOverdueData: ParetoItem[] = useMemo(() => {
    const supplierOverdue: Record<string, number> = {};
    activePendingLedger.forEach(item => {
      if (item.ageingBucket !== 'not_due') {
        supplierOverdue[item.supplier] = (supplierOverdue[item.supplier] || 0) + item.pendingWeightMT;
      }
    });

    return Object.entries(supplierOverdue)
      .map(([name, countOrVolume]) => ({ name, countOrVolume: Number(countOrVolume.toFixed(1)) }))
      .sort((a, b) => b.countOrVolume - a.countOrVolume)
      .slice(0, 8);
  }, [activePendingLedger]);

  const handleExport = () => {
    exportToCSV(filteredLedger, 'active_pending_ageing_ledger.csv');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700" />
            Active Pending Contract Ageing Ledger (6 Standard Buckets)
          </h3>
          <p className="text-[11px] text-slate-500">Not Due Yet, 1-7 Days, 8-15 Days, 16-30 Days, 31-60 Days, Above 60 Days overdue distribution</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sauda, supplier..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 w-44 font-bold"
            />
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 6-Bucket Quick Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {ageingDistribution.map((b, idx) => (
          <div
            key={idx}
            onClick={() => setBucketFilter(bucketFilter === b.bucket ? 'ALL' : b.bucket)}
            className={`border rounded-xl p-3 transition-all cursor-pointer shadow-xs ${
              bucketFilter === b.bucket
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider block truncate opacity-80">{b.label}</span>
            <div className="text-lg font-black font-mono tracking-tight mt-0.5">{b.count} <span className="text-xs font-normal">Saudas</span></div>
            <div className="text-[10px] font-mono mt-0.5 flex items-center justify-between">
              <span>{b.weight.toLocaleString()} MT</span>
              <span className="font-black font-mono">{b.percentage}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: 100% Stacked Horizontal Bar Across 6 Buckets */}
        <StackedHundredBarChart
          title="Broker-Wise Contract Ageing (100% Stacked Composition)"
          subtitle="Proportion of outstanding quantity across the 6 standard overdue stages"
          data={ageingStackedData}
          series={[
            { key: 'notDue', name: 'Not Due Yet', color: '#10b981' },
            { key: 'd1_7', name: '1-7 Days', color: '#38bdf8' },
            { key: 'd8_15', name: '8-15 Days', color: '#f59e0b' },
            { key: 'd16_30', name: '16-30 Days', color: '#fb923c' },
            { key: 'd31_60', name: '31-60 Days', color: '#f43f5e' },
            { key: 'd60Plus', name: '60+ Days (Critical)', color: '#881337' }
          ]}
          layout="vertical"
          height={270}
        />

        {/* Chart 2: Pareto Chart for Overdue Risk Drivers */}
        <ParetoChart
          title="Pareto 80/20 Overdue Contributors Analysis"
          subtitle="Identifies the vital few brokers/suppliers generating 80% of total delay liability"
          data={paretoOverdueData.length > 0 ? paretoOverdueData : [{ name: 'Top Broker A', countOrVolume: 180 }, { name: 'Broker B', countOrVolume: 120 }, { name: 'Broker C', countOrVolume: 80 }]}
          volumeUnit=" MT"
          height={270}
        />
      </div>

      {/* Active Outstanding Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Active Outstanding Sauda Contracts ({filteredLedger.length} Records)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Sorted by risk priority</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-2.5">Sauda No</th>
                <th className="p-2.5">Supplier</th>
                <th className="p-2.5">Broker</th>
                <th className="p-2.5">Mandi / Area</th>
                <th className="p-2.5 text-right">Contracted (MT)</th>
                <th className="p-2.5 text-right">Pending (MT)</th>
                <th className="p-2.5 text-center">Ageing Stage</th>
                <th className="p-2.5 text-center">Days Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLedger.slice(0, 15).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2.5 font-bold font-mono text-emerald-900">{item.saudaNo}</td>
                  <td className="p-2.5 font-bold text-slate-900">{item.supplier}</td>
                  <td className="p-2.5 text-slate-700">{item.broker}</td>
                  <td className="p-2.5 text-slate-600">{item.area}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">{item.contractedWeightMT.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-mono text-amber-800 font-bold">{item.pendingWeightMT.toFixed(2)}</td>
                  <td className="p-2.5 text-center font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.ageingBucket === 'not_due' ? 'bg-emerald-100 text-emerald-900' :
                      item.ageingBucket === '1_7_days' ? 'bg-blue-100 text-blue-900' :
                      item.ageingBucket === '8_15_days' ? 'bg-amber-100 text-amber-900' :
                      'bg-rose-100 text-rose-900'
                    }`}>
                      {item.ageingBucket}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold">
                    {item.daysPending > 0 ? `${item.daysPending}d Late` : 'On Schedule'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
