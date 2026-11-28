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
  const dashboardPipeline = dataset.dashboardPipeline;
  const filteredMillInspections = dataset.filteredMillInspections || [];
  const [stageFilter, setStageFilter] = useState<'all' | 'pending_arrival' | 'pending_insp' | 'pending_pay' | 'pending_sett' | 'exception'>('all');

  const totalPos = filtered.length;

  const stageMetrics = useMemo(() => {
    const pct = (n: number, base: number) => (base > 0 ? Number(((n / base) * 100).toFixed(1)) : 0);

    // 1. PO Lifecycle Conversion Funnel — identical full pipeline numbers as Main Dashboard
    const scpCount = dashboardPipeline ? dashboardPipeline.saudaCheckPointContracts : totalPos;
    const tempCount = dashboardPipeline ? dashboardPipeline.temporaryArrivalsCount : filtered.filter(t => t.hasAmadArrival).length;
    const finalCount = dashboardPipeline ? dashboardPipeline.finalArrivalsCount : filtered.filter(t => t.hasFinalArrival).length;
    const inspCount = dashboardPipeline ? dashboardPipeline.millInspectionCount : filteredMillInspections.length;
    const payCount = dashboardPipeline ? dashboardPipeline.paymentVouchersCount : filtered.filter(t => t.paidAmount > 0).length;
    const settCount = dashboardPipeline ? dashboardPipeline.settlementCount : filtered.filter(t => t.settlementStatus === 'SETTLED').length;

    const baseTop = Math.max(1, scpCount, tempCount);

    const funnelStages = [
      {
        id: 'sauda',
        name: '1. Sauda Check Point Contracts',
        volume: scpCount,
        unit: 'POs',
        conversionPct: 100,
        overallPct: 100,
        color: '#0f172a'
      },
      {
        id: 'temp_arrival',
        name: '2. Temporary Arrival (Inward)',
        volume: tempCount,
        unit: 'MRs',
        conversionPct: pct(tempCount, Math.max(1, scpCount)),
        overallPct: pct(tempCount, baseTop),
        dropOffVolume: Math.max(0, scpCount - tempCount),
        dropOffPct: pct(Math.max(0, scpCount - tempCount), Math.max(1, scpCount)),
        color: '#2563eb'
      },
      {
        id: 'receipt',
        name: '3. Final Arrival (FMR)',
        volume: finalCount,
        unit: 'MRs',
        conversionPct: pct(finalCount, Math.max(1, tempCount)),
        overallPct: pct(finalCount, baseTop),
        dropOffVolume: Math.max(0, tempCount - finalCount),
        dropOffPct: pct(Math.max(0, tempCount - finalCount), Math.max(1, tempCount)),
        color: '#0284c7'
      },
      {
        id: 'inspection',
        name: '4. Mill Inspection',
        volume: inspCount,
        unit: 'MRs',
        conversionPct: pct(inspCount, Math.max(1, finalCount)),
        overallPct: pct(inspCount, baseTop),
        dropOffVolume: Math.max(0, finalCount - inspCount),
        dropOffPct: pct(Math.max(0, finalCount - inspCount), Math.max(1, finalCount)),
        color: '#0f766e'
      },
      {
        id: 'payment',
        name: '5. Payment Disbursed',
        volume: payCount,
        unit: 'Vouchers',
        conversionPct: pct(payCount, Math.max(1, inspCount)),
        overallPct: pct(payCount, baseTop),
        dropOffVolume: Math.max(0, inspCount - payCount),
        dropOffPct: pct(Math.max(0, inspCount - payCount), Math.max(1, inspCount)),
        color: '#d97706'
      },
      {
        id: 'settlement',
        name: '6. Final Settlement',
        volume: settCount,
        unit: 'MRs',
        conversionPct: pct(settCount, Math.max(1, payCount)),
        overallPct: pct(settCount, baseTop),
        dropOffVolume: Math.max(0, payCount - settCount),
        dropOffPct: pct(Math.max(0, payCount - settCount), Math.max(1, payCount)),
        color: '#7c3aed'
      }
    ];

    // 2. Completed vs Pending POs by Stage — strictly from Sauda Check Point (dataset.filtered)
    const receiptDone = filtered.filter(t => t.hasFinalArrival || t.arrivedWeightMT > 0).length;
    const inspDone = filtered.filter(t => t.hasInspection || t.inspectionStatus === 'COMPLETED').length;
    const payDone = filtered.filter(t => t.paymentStatus === 'PAID' || t.paidAmount > 0).length;
    const settDone = filtered.filter(t => t.settlementStatus === 'SETTLED').length;

    const stackedStageCounts = [
      { stage: 'Receipt', completed: receiptDone, pending: Math.max(0, totalPos - receiptDone) },
      { stage: 'Mill Inspection', completed: inspDone, pending: Math.max(0, totalPos - inspDone) },
      { stage: 'Payment', completed: payDone, pending: Math.max(0, totalPos - payDone) },
      { stage: 'Settlement', completed: settDone, pending: Math.max(0, totalPos - settDone) }
    ];

    // 3. PO Population Flow Split — strictly from Sauda Check Point & Mill Inspection
    // Build set of POs that have quality exceptions in Mill Inspection (Grade Down > 0, Excess Moisture > 0, Dust >= 1.5, NCV >= 1.5, CT > 0)
    const flaggedPoSet = new Set<string>();
    filteredMillInspections.forEach(m => {
      const hasDefect =
        m.excessMoisture > 0.05 ||
        m.gradeDownPct > 0.05 ||
        m.dustPct >= 1.5 ||
        m.ncvPct >= 1.5 ||
        m.habijabiChattaRopeKg > 0 ||
        m.hasMismatch;
      if (hasDefect && m.poNo && m.poNo !== '-') {
        flaggedPoSet.add(m.poNo.trim().toUpperCase());
      }
    });

    let inspectedClean = 0;
    let pendingMillInsp = 0;
    let inspectedException = 0;

    filtered.forEach(t => {
      const pk = (t.poNo || '').trim().toUpperCase();
      if (!t.hasInspection) {
        pendingMillInsp += 1;
      } else if (flaggedPoSet.has(pk) || t.hasMismatch || t.isAbnormal) {
        inspectedException += 1;
      } else {
        inspectedClean += 1;
      }
    });

    const settledClean = Math.min(inspectedClean, settDone);
    const settledFromException = Math.min(inspectedException, Math.max(0, settDone - settledClean));

    const sankeyNodes = [
      { id: 'all_pos', name: 'Sauda Check Point POs', category: 'source' as const, value: totalPos, unit: 'POs', color: '#0f172a' },
      { id: 'received', name: 'Mill Inspected Clean', category: 'intermediate' as const, value: inspectedClean, unit: 'POs', color: '#0f766e' },
      { id: 'pending', name: 'Pending Mill Inspection', category: 'intermediate' as const, value: pendingMillInsp, unit: 'POs', color: '#d97706' },
      { id: 'exception', name: 'Mill Insp Quality Flagged', category: 'intermediate' as const, value: inspectedException, unit: 'POs', color: '#D94B5A' },
      { id: 'settled', name: 'Settled Closed', category: 'target' as const, value: settDone, unit: 'POs', color: '#4f46e5' },
      { id: 'open_fin', name: 'Open / Unsettled', category: 'target' as const, value: Math.max(0, totalPos - settDone), unit: 'POs', color: '#64748b' }
    ];

    const sankeyLinks = [
      { source: 'all_pos', target: 'received', value: inspectedClean, label: 'Clean Mill Inspection' },
      { source: 'all_pos', target: 'pending', value: pendingMillInsp, label: 'Not Yet Inspected' },
      { source: 'all_pos', target: 'exception', value: inspectedException, label: 'Quality / Mismatch Flag' },
      { source: 'received', target: 'settled', value: settledClean, label: 'Closed Clean' },
      { source: 'received', target: 'open_fin', value: Math.max(0, inspectedClean - settledClean), label: 'Awaiting Settlement' },
      { source: 'pending', target: 'open_fin', value: pendingMillInsp, label: 'Open PO' },
      { source: 'exception', target: 'settled', value: settledFromException, label: 'Settled w/ Deduction' },
      { source: 'exception', target: 'open_fin', value: Math.max(0, inspectedException - settledFromException), label: 'Under Review' }
    ].filter(l => l.value > 0);

    return {
      funnelStages,
      stackedStageCounts,
      sankeyNodes,
      sankeyLinks,
      receiptDone,
      inspDone,
      payDone,
      settDone,
      exceptionCount: inspectedException
    };
  }, [filtered, totalPos, dashboardPipeline, filteredMillInspections]);

  const visibleDeals = useMemo(() => {
    return filtered.filter(t => {
      if (stageFilter === 'pending_arrival') return !t.hasInspection;
      if (stageFilter === 'pending_insp') return !t.hasInspection;
      if (stageFilter === 'pending_pay') return t.paymentStatus !== 'PAID';
      if (stageFilter === 'pending_sett') return t.settlementStatus !== 'SETTLED';
      if (stageFilter === 'exception') return t.isAbnormal || t.hasMismatch;
      return true;
    });
  }, [filtered, stageFilter]);

  return (
    <div className="space-y-5 font-sans">
      {/* ROW 1: Funnel Chart (Main Dashboard Pipeline) + Completed vs Pending (Sauda Check Point) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelChart
          title="PO Lifecycle Conversion Funnel"
          subtitle="Full live procurement pipeline matching the Main Dashboard across all 6 stages"
          stages={stageMetrics.funnelStages}
          onStageClick={(stage) => {
            if (stage.id === 'receipt' || stage.id === 'temp_arrival') setStageFilter('pending_arrival');
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
            <p className="text-[11px] text-slate-500">Sauda Check Point contracts ({totalPos} POs) tracked across downstream checkpoints</p>
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

      {/* ROW 2: Sankey Flow Split (Sauda Check Point & Mill Inspection) */}
      <SankeyFlowChart
        title="PO Population Flow Split (Received · Pending · Exception)"
        subtitle="Sauda Check Point POs reconciled with Mill Inspection (Clean Inspected · Pending Mill Insp · Quality/Mismatch Exception)"
        mode="pipeline"
        nodes={stageMetrics.sankeyNodes}
        links={stageMetrics.sankeyLinks}
      />

      {/* STAGE-WISE DEAL TRACKER TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-black uppercase text-slate-900">
              Sauda Check Point Lifecycle Register ({visibleDeals.length} POs)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {[
              { id: 'all' as const, label: `All (${totalPos})` },
              { id: 'pending_arrival' as const, label: `Pending Mill Insp` },
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
                <th className="p-2.5 text-right">Mill Insp MT</th>
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
                    <span className={t.hasInspection ? 'text-teal-700' : 'text-amber-700'}>
                      {t.hasInspection ? 'COMPLETED' : 'PENDING'}
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
