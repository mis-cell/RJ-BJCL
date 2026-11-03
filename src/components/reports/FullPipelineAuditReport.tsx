import React, { useState, useMemo } from 'react';
import { CompiledReportData } from '../../services/reportCalculations';
import { 
  GitCommit, 
  Search, 
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { exportToCSV } from '../../utils/exportHelpers';
import { FunnelChart, FunnelStage } from './charts/FunnelChart';
import { WaterfallChart, WaterfallStep } from './charts/WaterfallChart';
import { ParetoChart, ParetoItem } from './charts/ParetoChart';

interface FullPipelineAuditReportProps {
  fullPipelineAudit: CompiledReportData['fullPipelineAudit'];
  kpis?: CompiledReportData['kpis'];
}

export const FullPipelineAuditReport: React.FC<FullPipelineAuditReportProps> = ({
  fullPipelineAudit = [],
  kpis
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  const filteredRecords = useMemo(() => {
    return fullPipelineAudit.filter(r => {
      const matchesSearch = 
        r.saudaNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.poNo && r.poNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.finalMRNo && r.finalMRNo.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStage = stageFilter === 'ALL' || r.currentStage === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [fullPipelineAudit, searchTerm, stageFilter]);

  // 1. Live Funnel Stages calculated from database records
  const funnelStages: FunnelStage[] = useMemo(() => {
    const totalContracted = fullPipelineAudit.reduce((sum, r) => sum + (r.contractedMT || 0), 0) || (kpis?.contractedWeightMT || 0);
    const transitCleared = fullPipelineAudit.reduce((sum, r) => {
      return sum + (r.currentStage !== 'SAUDA_CREATED' ? (r.contractedMT || 0) : (r.tempReceivedMT || 0));
    }, 0);
    const arrived = fullPipelineAudit.reduce((sum, r) => sum + (r.tempReceivedMT || 0), 0) || (kpis?.deliveredWeightMT || 0);
    const passed = fullPipelineAudit.reduce((sum, r) => sum + (r.finalReceivedMT || r.tempReceivedMT || 0), 0);
    const poMatched = fullPipelineAudit.reduce((sum, r) => sum + (r.poNo && r.poNo !== 'DIRECT' ? (r.finalReceivedMT || r.tempReceivedMT || 0) : 0), 0);
    const settled = fullPipelineAudit.reduce((sum, r) => sum + (r.settledMT || 0), 0);

    const safeBase = totalContracted > 0 ? totalContracted : 1;

    return [
      {
        id: 's1',
        name: '1. Sauda Contract Placement',
        volume: Number(totalContracted.toFixed(2)),
        unit: 'MT',
        conversionPct: 100,
        overallPct: 100,
        color: '#0284c7'
      },
      {
        id: 's2',
        name: '2. Checkpoint Transit Clearance',
        volume: Number(transitCleared.toFixed(2)),
        unit: 'MT',
        conversionPct: totalContracted > 0 ? Number(((transitCleared / safeBase) * 100).toFixed(1)) : 100,
        overallPct: totalContracted > 0 ? Number(((transitCleared / safeBase) * 100).toFixed(1)) : 100,
        color: '#0d9488'
      },
      {
        id: 's3',
        name: '3. Mill Gate Physical Arrival',
        volume: Number(arrived.toFixed(2)),
        unit: 'MT',
        conversionPct: transitCleared > 0 ? Number(((arrived / transitCleared) * 100).toFixed(1)) : 0,
        overallPct: totalContracted > 0 ? Number(((arrived / safeBase) * 100).toFixed(1)) : 0,
        color: '#16a34a'
      },
      {
        id: 's4',
        name: '4. Lab Quality & Weight Accepted',
        volume: Number(passed.toFixed(2)),
        unit: 'MT',
        conversionPct: arrived > 0 ? Number(((passed / arrived) * 100).toFixed(1)) : 0,
        overallPct: totalContracted > 0 ? Number(((passed / safeBase) * 100).toFixed(1)) : 0,
        color: '#eab308'
      },
      {
        id: 's5',
        name: '5. Matched to Purchase Order',
        volume: Number(poMatched.toFixed(2)),
        unit: 'MT',
        conversionPct: passed > 0 ? Number(((poMatched / passed) * 100).toFixed(1)) : 0,
        overallPct: totalContracted > 0 ? Number(((poMatched / safeBase) * 100).toFixed(1)) : 0,
        color: '#f97316'
      },
      {
        id: 's6',
        name: '6. Payment Settlement & Cleared',
        volume: Number(settled.toFixed(2)),
        unit: 'MT',
        conversionPct: poMatched > 0 ? Number(((settled / poMatched) * 100).toFixed(1)) : 0,
        overallPct: totalContracted > 0 ? Number(((settled / safeBase) * 100).toFixed(1)) : 0,
        color: '#8b5cf6'
      }
    ];
  }, [fullPipelineAudit, kpis]);

  // 2. Live Pipeline Loss & Attrition Waterfall Chart
  const lossWaterfallSteps: WaterfallStep[] = useMemo(() => {
    const totalContracted = fullPipelineAudit.reduce((sum, r) => sum + (r.contractedMT || 0), 0) || (kpis?.contractedWeightMT || 0);
    const unfulfilled = fullPipelineAudit.reduce((sum, r) => {
      const pending = Math.max(0, (r.contractedMT || 0) - (r.tempReceivedMT || 0));
      return sum + pending;
    }, 0);
    const qualityShortage = fullPipelineAudit.reduce((sum, r) => {
      const short = Math.max(0, (r.tempReceivedMT || 0) - (r.finalReceivedMT || 0));
      return sum + short;
    }, 0);
    const settled = Math.max(0, totalContracted - (unfulfilled + qualityShortage));

    if (totalContracted === 0) {
      return [
        { name: 'Initial Contract Volume', value: 0 },
        { name: 'Net Settled Good Fiber', value: 0, isTotal: true }
      ];
    }

    return [
      { name: 'Initial Contract Volume', value: Number(totalContracted.toFixed(2)) },
      { name: 'Pending / Undelivered Volume', value: -Number(unfulfilled.toFixed(2)) },
      { name: 'Quality / Weight Shortage', value: -Number(qualityShortage.toFixed(2)) },
      { name: 'Net Settled Good Fiber', value: Number(settled.toFixed(2)), isTotal: true }
    ];
  }, [fullPipelineAudit, kpis]);

  // 3. Live Pareto Chart for Real Pipeline Exceptions
  const pipelineFailurePareto: ParetoItem[] = useMemo(() => {
    let pendingShortageCount = 0;
    let qualityDiscrepancyCount = 0;
    let unlinkedPOCount = 0;
    let settlementPendingCount = 0;

    fullPipelineAudit.forEach(r => {
      if ((r.contractedMT || 0) > (r.tempReceivedMT || 0)) pendingShortageCount++;
      if (r.weightVarianceMT < 0) qualityDiscrepancyCount++;
      if (!r.poNo || r.poNo === 'DIRECT') unlinkedPOCount++;
      if (r.currentStage !== 'SETTLED') settlementPendingCount++;
    });

    const items: ParetoItem[] = [
      { name: 'Pending Lot Deliveries', countOrVolume: pendingShortageCount },
      { name: 'Gate vs Final Weight Variance', countOrVolume: qualityDiscrepancyCount },
      { name: 'Unlinked PO / Sauda Mapping', countOrVolume: unlinkedPOCount },
      { name: 'Pending Financial Clearance', countOrVolume: settlementPendingCount }
    ].sort((a, b) => b.countOrVolume - a.countOrVolume);

    return items;
  }, [fullPipelineAudit]);

  // 4. Live Monthly Stage Conversion Trends
  const monthlyConversionData = useMemo(() => {
    const monthGroups: Record<string, { total: number; gateArrived: number; labPassed: number; settled: number }> = {};

    fullPipelineAudit.forEach(r => {
      const d = r.lastUpdatedDate ? new Date(r.lastUpdatedDate) : new Date();
      if (isNaN(d.getTime())) return;
      const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mKey = mNames[d.getMonth()];

      if (!monthGroups[mKey]) {
        monthGroups[mKey] = { total: 0, gateArrived: 0, labPassed: 0, settled: 0 };
      }
      monthGroups[mKey].total += (r.contractedMT || 1);
      if ((r.tempReceivedMT || 0) > 0) monthGroups[mKey].gateArrived += (r.tempReceivedMT || 0);
      if ((r.finalReceivedMT || 0) > 0) monthGroups[mKey].labPassed += (r.finalReceivedMT || 0);
      if (r.currentStage === 'SETTLED') monthGroups[mKey].settled += (r.settledMT || r.finalReceivedMT || 0);
    });

    const entries = Object.entries(monthGroups);
    if (entries.length === 0) return [];

    return entries.map(([m, data]) => ({
      month: m,
      saudaToGatePct: data.total > 0 ? Number(((data.gateArrived / data.total) * 100).toFixed(1)) : 100,
      gateToLabPct: data.gateArrived > 0 ? Number(((data.labPassed / data.gateArrived) * 100).toFixed(1)) : 100,
      labToPayPct: data.labPassed > 0 ? Number(((data.settled / data.labPassed) * 100).toFixed(1)) : 100
    }));
  }, [fullPipelineAudit]);

  const handleExport = () => {
    exportToCSV(filteredRecords, 'full_procurement_pipeline_audit.csv');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-emerald-700" />
            End-to-End Procurement Lifecycle & Pipeline Audit Trail
          </h3>
          <p className="text-[11px] text-slate-500">Live multi-stage traceability: Sauda Placement → Checkpoint Clearance → Gate Arrival → Lab Inspection → PO Mapping → Bank Clearance</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 w-44 font-bold"
            />
          </div>

          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 outline-none"
          >
            <option value="ALL">All Stages</option>
            <option value="SAUDA_CREATED">Sauda Created</option>
            <option value="CHECKPOINT_VERIFIED">Checkpoint Verified</option>
            <option value="FINAL_ARRIVAL">Final Gate Arrival</option>
            <option value="INSPECTION_COMPLETED">Inspection Completed</option>
            <option value="PO_LINKED">PO Linked</option>
            <option value="SETTLED">Settled</option>
          </select>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 1. Full Pipeline Stage Funnel */}
      <FunnelChart
        title="Procurement Volume Conversion Funnel (MT)"
        subtitle="Tracking physical jute mass progression across each audit stage"
        stages={funnelStages}
      />

      {/* 2. Visual Split Grid: Pipeline Loss Waterfall & Pareto Rejection Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Loss Waterfall */}
        <WaterfallChart
          title="Procurement Pipeline Volume Loss Breakdown"
          subtitle="Contract Placed → Delivery Losses → Net Settled Good Jute (MT)"
          data={lossWaterfallSteps}
          unit="MT"
          height={280}
        />

        {/* Pareto Causes of Failure */}
        <ParetoChart
          title="Pareto 80/20 Analysis of Pipeline Exceptions"
          subtitle="Top operational discrepancies delaying settlement"
          data={pipelineFailurePareto}
          volumeUnit="Count"
          height={280}
        />
      </div>

      {/* 3. Monthly Conversion Rates Line Chart */}
      {monthlyConversionData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Monthly Stage Conversion Efficiency (%)</h4>
              <p className="text-[10px] text-slate-500">Sauda → Gate Arrival, Gate → Lab Acceptance, Lab → Payment Clearance</p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyConversionData} margin={{ top: 10, right: 15, left: -5, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={v => `${v}%`} />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, '']}
                  contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend verticalAlign="bottom" height={24} formatter={val => <span className="text-[10px] text-slate-600 font-bold">{val}</span>} />
                <Line type="monotone" dataKey="saudaToGatePct" name="Sauda → Gate Arrival %" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="gateToLabPct" name="Gate → Lab Passed %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="labToPayPct" name="Lab → Settled %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Complete Audit Trail Register Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Procurement Lifecycle Master Audit Register ({filteredRecords.length} Live Lots)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Live ERP Audit Ledger</span>
        </div>

        <div className="overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              No audit records found matching your filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Sauda #</th>
                  <th className="p-2.5">Supplier & Broker</th>
                  <th className="p-2.5">Gate Arrival MR</th>
                  <th className="p-2.5">PO Linked</th>
                  <th className="p-2.5 text-right">Contract MT</th>
                  <th className="p-2.5 text-right">Gate Received MT</th>
                  <th className="p-2.5 text-right">Final Received MT</th>
                  <th className="p-2.5 text-center">Current Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.slice(0, 25).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-bold font-mono text-emerald-950">
                      <div>#{r.saudaNo}</div>
                      <div className="text-[9.5px] text-slate-500 font-normal">{r.lastUpdatedDate}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{r.supplier}</div>
                      <div className="text-[10px] text-slate-500">{r.broker}</div>
                    </td>
                    <td className="p-2.5 font-mono text-slate-800">
                      <div>{r.finalMRNo || r.tempMRNo || 'Pending'}</div>
                    </td>
                    <td className="p-2.5 font-mono">
                      {r.poNo && r.poNo !== 'DIRECT' ? (
                        <span className="font-bold text-blue-800">{r.poNo}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {r.contractedMT ? `${r.contractedMT.toFixed(2)} MT` : '0.00 MT'}
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-800 font-bold">
                      {r.tempReceivedMT ? `${r.tempReceivedMT.toFixed(2)} MT` : '--'}
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-900 font-black">
                      {r.finalReceivedMT ? `${r.finalReceivedMT.toFixed(2)} MT` : '--'}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                        r.currentStage === 'SETTLED'
                          ? 'bg-emerald-500 text-white'
                          : r.currentStage === 'PO_LINKED' || r.currentStage === 'INSPECTION_COMPLETED'
                          ? 'bg-blue-500 text-white'
                          : r.currentStage === 'FINAL_ARRIVAL'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-500 text-white'
                      }`}>
                        {r.currentStage.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
