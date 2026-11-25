import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { SystemReportDataset, ReportTransactionLine } from '../../services/systemReportEngine';
import { FunnelChart } from '../reports/charts/FunnelChart';
import { SankeyFlowChart } from '../reports/charts/SankeyFlowChart';

interface Priority3OperationsProps {
  dataset: SystemReportDataset;
  onDrillDown: (title: string, txns: ReportTransactionLine[]) => void;
  defaultSubTab?: 'pipeline' | 'quality' | 'payment';
}

export const Priority3Operations: React.FC<Priority3OperationsProps> = ({
  dataset,
  onDrillDown
}) => {
  const { filtered } = dataset;
  const [stageFilter, setStageFilter] = useState<'all' | 'pending_arrival' | 'pending_insp' | 'pending_pay' | 'pending_sett' | 'exception'>('all');

  const totalPos = filtered.length;

  // Same PO population tracked strictly by PO count across stages (Sauda -> Receipt -> Inspection -> Payment -> Settlement)
  const stageMetrics = useMemo(() => {
    const receiptDone = filtered.filter(t => t.hasFinalArrival || t.arrivedWeightMT > 0).length;
    const inspDone = filtered.filter(t => t.inspectionStatus === 'COMPLETED' || t.hasInspection).length;
    const payDone = filtered.filter(t => t.paymentStatus === 'PAID' || t.paidAmount > 0).length;
    const settDone = filtered.filter(t => t.settlementStatus === 'SETTLED').length;
    const exceptionCount = filtered.filter(t => t.isAbnormal || t.hasMismatch).length;
    const fullyReceivedClean = filtered.filter(t => t.arrivalStatus === 'COMPLETED' && !t.isAbnormal && !t.hasMismatch).length;
    const inTransitOrPending = Math.max(0, totalPos - fullyReceivedClean - exceptionCount);

    const pct = (n: number, base: number) => (base > 0 ? Number(((n / base) * 100).toFixed(1)) : 0);

    const funnelStages = [
      { id: 'sauda', name: '1. Sauda / PO Booked', volume: totalPos, unit: 'POs', conversionPct: 100, overallPct: 100, color: '#0f172a' },
      { id: 'receipt', name: '2. Material Receipt', volume: receiptDone, unit: 'POs', conversionPct: pct(receiptDone, totalPos), overallPct: pct(receiptDone, totalPos), dropOffVolume: totalPos - receiptDone, dropOffPct: pct(totalPos - receiptDone, totalPos), color: '#0284c7' },
      { id: 'inspection', name: '3. Mill Inspection', volume: inspDone, unit: 'POs', conversionPct: pct(inspDone, Math.max(1, receiptDone)), overallPct: pct(inspDone, totalPos), dropOffVolume: Math.max(0, receiptDone - inspDone), dropOffPct: pct(Math.max(0, receiptDone - inspDone), Math.max(1, receiptDone)), color: '#0f766e' },
      { id: 'payment', name: '4. Payment Disbursed', volume: payDone, unit: 'POs', conversionPct: pct(payDone, Math.max(1, inspDone)), overallPct: pct(payDone, totalPos), dropOffVolume: Math.max(0, inspDone - payDone), dropOffPct: pct(Math.max(0, inspDone - payDone), Math.max(1, inspDone)), color: '#d97706' },
      { id: 'settlement', name: '5. Final Settlement', volume: settDone, unit: 'POs', conversionPct: pct(settDone, Math.max(1, payDone)), overallPct: pct(settDone, totalPos), dropOffVolume: Math.max(0, payDone - settDone), dropOffPct: pct(Math.max(0, payDone - settDone), Math.max(1, payDone)), color: '#7c3aed' }
    ];

    const stackedStageCounts = [
      { stage: 'Receipt', completed: receiptDone, pending: Math.max(0, totalPos - receiptDone) },
      { stage: 'Inspection', completed: inspDone, pending: Math.max(0, totalPos - inspDone) },
      { stage: 'Payment', completed: payDone, pending: Math.max(0, totalPos - payDone) },
      { stage: 'Settlement', completed: settDone, pending: Math.max(0, totalPos - settDone) }
    ];

    const sankeyNodes = [
      { id: 'all_pos', name: 'Booked POs', category: 'source' as const, value: totalPos, unit: 'POs', color: '#0f172a' },
      { id: 'received', name: 'Received Clean', category: 'intermediate' as const, value: fullyReceivedClean, unit: 'POs', color: '#0f766e' },
      { id: 'pending', name: 'Pending / In-Transit', category: 'intermediate' as const, value: inTransitOrPending, unit: 'POs', color: '#d97706' },
      { id: 'exception', name: 'Exception / Flagged', category: 'intermediate' as const, value: exceptionCount, unit: 'POs', color: '#D94B5A' },
      { id: 'settled', name: 'Settled Closed', category: 'target' as const, value: settDone, unit: 'POs', color: '#4f46e5' },
      { id: 'open_fin', name: 'Open Financial', category: 'target' as const, value: Math.max(0, totalPos - settDone), unit: 'POs', color: '#64748b' }
    ];

    const sankeyLinks = [
      { source: 'all_pos', target: 'received', value: fullyReceivedClean, label: 'Clean Receipt' },
      { source: 'all_pos', target: 'pending', value: inTransitOrPending, label: 'Pending Delivery' },
      { source: 'all_pos', target: 'exception', value: exceptionCount, label: 'Flagged Audit' },
      { source: 'received', target: 'settled', value: Math.min(fullyReceivedClean, settDone), label: 'Closed' },
      { source: 'received', target: 'open_fin', value: Math.max(0, fullyReceivedClean - settDone), label: 'Awaiting Settlement' },
      { source: 'pending', target: 'open_fin', value: inTransitOrPending, label: 'Open PO' },
      { source: 'exception', target: 'open_fin', value: exceptionCount, label: 'Under Review' }
    ].filter(l => l.value > 0);

    return { funnelStages, stackedStageCounts, sankeyNodes, sankeyLinks, receiptDone, inspDone, payDone, settDone, exceptionCount };
  }, [filtered, totalPos]);

  const visibleDeals = useMemo(() => {
    return filtered.filter(t => {
      if (stageFilter === 'pending_arrival') return t.pendingWeightMT > 0.01;
      if (stageFilter === 'pending_insp') return t.inspectionStatus !== 'COMPLETED';
      if (stageFilter === 'pending_pay') return t.paymentStatus !== 'PAID';
      if (stageFilter === 'pending_sett') return t.settlementStatus !== 'SETTLED';
      if (stageFilter === 'exception') return t.isAbnormal || t.hasMismatch;
      return true;
    });
  }, [filtered, stageFilter]);

  return (
    <div className="space-y-5 font-sans">
      {/* ROW 1: Funnel Chart + Completed vs Pending Stacked Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelChart
          title="PO Lifecycle Conversion Funnel"
          subtitle="Same PO population tracked by PO count from Sauda booking to Final Settlement"
          stages={stageMetrics.funnelStages}
          onStageClick={(stage) => {
            if (stage.id === 'receipt') setStageFilter('pending_arrival');
            else if (stage.id === 'inspection') setStageFilter('pending_insp');
            else if (stage.id === 'payment') setStageFilter('pending_pay');
            else if (stage.id === 'settlement') setStageFilter('pending_sett');
            else setStageFilter('all');
          }}
        />

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-2">
          <div className="pb-2 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Completed vs Pending POs by Stage
            </h4>
            <p className="text-[11px] text-slate-500">Operational backlog comparison across all 4 downstream checkpoints</p>
          </div>
          <div style={{ width: '100%', height: 290 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageMetrics.stackedStageCounts} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} />
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} POs`, name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="completed" stackId="st" name="Completed POs" fill="#0f766e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pending" stackId="st" name="Pending POs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 2: Sankey Flow Split (Received / Pending / Exception paths) */}
      <SankeyFlowChart
        title="PO Population Flow Split (Received · Pending · Exception)"
        subtitle="Shows how booked POs branch into clean receipt, pending delivery, or flagged exception paths"
        mode="pipeline"
        nodes={stageMetrics.sankeyNodes}
        links={stageMetrics.sankeyLinks}
      />

      {/* STAGE-WISE DEAL TRACKER TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-black uppercase text-slate-900">
              Checkpoint Lifecycle Register ({visibleDeals.length} POs)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {[
              { id: 'all' as const, label: `All (${totalPos})` },
              { id: 'pending_arrival' as const, label: `Pending Receipt` },
              { id: 'pending_insp' as const, label: `Pending Insp` },
              { id: 'pending_pay' as const, label: `Pending Payment` },
              { id: 'pending_sett' as const, label: `Pending Settlement` },
              { id: 'exception' as const, label: `Exceptions (${stageMetrics.exceptionCount})` }
            ].map(tab => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setStageFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  stageFilter === tab.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-900 text-white font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">PO No</th>
                <th className="p-2.5">Supplier / Broker</th>
                <th className="p-2.5 text-right">Contract MT</th>
                <th className="p-2.5 text-right">Received MT</th>
                <th className="p-2.5 text-right">Pending MT</th>
                <th className="p-2.5 text-center">Receipt</th>
                <th className="p-2.5 text-center">Inspection</th>
                <th className="p-2.5 text-center">Payment</th>
                <th className="p-2.5 text-center">Settlement</th>
                <th className="p-2.5 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px] text-slate-700">
              {visibleDeals.slice(0, 120).map((t, idx) => (
                <tr
                  key={t.txnId || idx}
                  onClick={() => onDrillDown(`Checkpoint Audit: ${t.poNo}`, [t])}
                  className="hover:bg-slate-50 transition cursor-pointer"
                >
                  <td className="p-2.5 whitespace-nowrap text-slate-500">{t.date || '—'}</td>
                  <td className="p-2.5 font-bold text-slate-900">{t.poNo}</td>
                  <td className="p-2.5 font-sans max-w-[180px] truncate">
                    <span className="font-bold text-slate-900 block truncate">{t.supplier}</span>
                    <span className="text-[10px] text-slate-500">{t.broker}</span>
                  </td>
                  <td className="p-2.5 text-right font-bold">{t.quantityMT.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-bold text-teal-700">{t.arrivedWeightMT.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-bold text-amber-700">{t.pendingWeightMT.toFixed(2)}</td>
                  <td className="p-2.5 text-center font-sans text-[10px] font-bold">
                    <span className={t.arrivalStatus === 'COMPLETED' ? 'text-teal-700' : t.arrivalStatus === 'IN_TRANSIT' ? 'text-blue-700' : 'text-slate-400'}>
                      {t.arrivalStatus}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-sans text-[10px] font-bold">
                    <span className={t.inspectionStatus === 'COMPLETED' ? 'text-teal-700' : 'text-amber-700'}>
                      {t.inspectionStatus}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-sans text-[10px] font-bold">
                    <span className={t.paymentStatus === 'PAID' ? 'text-teal-700' : t.paymentStatus === 'PARTIAL' ? 'text-amber-700' : 'text-slate-400'}>
                      {t.paymentStatus}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-sans text-[10px] font-bold">
                    <span className={t.settlementStatus === 'SETTLED' ? 'text-indigo-700' : 'text-slate-400'}>
                      {t.settlementStatus}
                    </span>
                  </td>
                  <td className="p-2.5 text-center text-slate-400">
                    <ChevronRight className="w-4 h-4 mx-auto" />
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
