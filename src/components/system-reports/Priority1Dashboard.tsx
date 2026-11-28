import React, { useMemo, useState } from 'react';
import { ChevronRight, Table2, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { SystemReportDataset, ReportTransactionLine, groupTransactionsByDimension } from '../../services/systemReportEngine';
import { DrillDownViewMode } from './DrillDownModal';
import { HalfDoughnutChart } from '../reports/charts/HalfDoughnutChart';
import { AllPoReportView } from './AllPoReportView';

interface Priority1DashboardProps {
  dataset: SystemReportDataset;
  onDrillDown: (title: string, txns: ReportTransactionLine[], viewMode?: DrillDownViewMode) => void;
}

const DOUGHNUT_COLORS = ['#0f766e', '#2563eb', '#d97706'];

export const Priority1Dashboard: React.FC<Priority1DashboardProps> = ({
  dataset,
  onDrillDown
}) => {
  const { metrics, filtered } = dataset;
  const eo = dataset.executiveOverview || {
    contractedVolumeMT: metrics.totalQuantityMT,
    scpPoCount: metrics.totalPOCount,
    paymentPayableAmt: metrics.totalPurchaseValue,
    paymentVoucherCount: 0,
    paymentPaidAmt: metrics.totalPayment,
    paymentPremiumAmt: metrics.totalPremium,
    paymentPremiumMrCount: metrics.premiumMRCount,
    shortExcessDeductionAmt: metrics.totalDeduction,
    shortExcessPoCount: 0,
    scpInMillInspectionUniqueCount: filtered.filter(t => t.hasInspection).length,
    scpTotalSaudaCount: filtered.length,
    scpUniqueSuppliers: metrics.totalSupplierCount,
    scpUniqueBrokers: metrics.totalBrokerCount,
    scpUniqueAgencies: metrics.totalAgencyCount,
    scpUniqueAreas: metrics.totalAreaCount,
    scpUniqueGrades: metrics.totalGradeCount,
    pendingArrivalCount: filtered.filter(t => !t.hasInspection).length,
    inspectionPendingCount: metrics.millInspectionPendingCount,
    settlementPendingCount: metrics.settlementPendingCount
  };
  const [showAllPoRegister, setShowAllPoRegister] = useState(false);
  const [showFormulaGuide, setShowFormulaGuide] = useState(false);

  // 1. Completion % for Half-Doughnut (Mill Inspection Received MT vs Sauda Check Point Contracted MT)
  const receivedPct = useMemo(() => {
    if (eo.contractedVolumeMT <= 0) return 0;
    return Math.min(100, (metrics.arrivedMT / eo.contractedVolumeMT) * 100);
  }, [metrics.arrivedMT, eo.contractedVolumeMT]);

  // 2. Parts of 1 Total (Received / In-Transit / Pending MT) for Doughnut
  const fulfillmentParts = useMemo(() => {
    const inTransitMT = filtered.reduce((sum, t) => sum + (t.inTransitWeightMT || 0), 0);
    const receivedMT = Math.max(0, metrics.arrivedMT);
    const rawPendingMT = Math.max(0, eo.contractedVolumeMT - receivedMT - inTransitMT);
    return [
      { name: 'Received MT', value: Number(receivedMT.toFixed(2)), color: DOUGHNUT_COLORS[0] },
      { name: 'In Transit MT', value: Number(inTransitMT.toFixed(2)), color: DOUGHNUT_COLORS[1] },
      { name: 'Pending MT', value: Number(rawPendingMT.toFixed(2)), color: DOUGHNUT_COLORS[2] }
    ].filter(p => p.value > 0);
  }, [filtered, metrics.arrivedMT, eo.contractedVolumeMT]);

  // 3. Monthly Purchased MT Trend for Line Chart
  const monthlyTrendData = useMemo(() => {
    const grouped = groupTransactionsByDimension(filtered, 'month');
    return grouped
      .filter(g => g.key && g.key !== 'UNASSIGNED')
      .map(g => ({
        month: g.key,
        contractedMT: Number(g.quantityMT.toFixed(2)),
        receivedMT: Number(g.arrivedMT.toFixed(2)),
        valueCr: Number((g.purchaseValue / 10000000).toFixed(2))
      }));
  }, [filtered]);

  return (
    <div className="space-y-5 font-sans">
      {/* Formula Transparency Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Executive Summary · {eo.scpPoCount} Active Sauda Check Point Contracts (Void/Cancelled Excluded)
        </span>
        <button
          type="button"
          onClick={() => setShowFormulaGuide(prev => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer transition"
        >
          <Info className="w-3.5 h-3.5 text-[#D94B5A]" />
          <span>{showFormulaGuide ? 'Hide Card Calculation Logic' : 'How Cards Are Calculated'}</span>
        </button>
      </div>

      {showFormulaGuide && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-xs space-y-2">
          <div className="font-black uppercase tracking-wider text-slate-900 text-[11px]">
            Executive Overview — Authoritative Card Formula &amp; Section Mapping
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="p-2">Card / Metric</th>
                  <th className="p-2">Exact Logic</th>
                  <th className="p-2">Authoritative Section / Table</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="p-2 font-bold text-slate-900">Contracted Volume</td>
                  <td className="p-2 font-mono">SUM(total_contract_mt) across active Sauda Check Point POs only</td>
                  <td className="p-2">Sauda Check Point (sauda_check_point)</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Purchase Value</td>
                  <td className="p-2 font-mono">SUM(Payable Amt) across active Payment Operations vouchers</td>
                  <td className="p-2">Payment Operations (payment_master)</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Disbursed Payment</td>
                  <td className="p-2 font-mono">SUM(Paid Amount) across active Payment Operations vouchers</td>
                  <td className="p-2">Payment Operations (payment_master)</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Total Premium</td>
                  <td className="p-2 font-mono">SUM(Premium) &amp; unique MRs with premium from Payment Operations</td>
                  <td className="p-2">Payment Operations (payment_master, payment_details)</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Total Short &amp; Excess Deductions</td>
                  <td className="p-2 font-mono">SUM(Extra &amp; Short Weight &amp; Rate Settlement deductions) per PO</td>
                  <td className="p-2">Sauda Check Point (Extra &amp; Short Weight &amp; Rate Settlement)</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Flagged Deals (SCP vs Mill Insp.)</td>
                  <td className="p-2 font-mono">Unique Sauda Check Point Saudas present in Mill Inspection / Total SCP Saudas</td>
                  <td className="p-2">Sauda Check Point ∩ Mill Inspection</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Suppliers / Brokers / Agencies / Areas / Grades</td>
                  <td className="p-2 font-mono">COUNT(DISTINCT entity) strictly from Sauda Check Point</td>
                  <td className="p-2">Sauda Check Point (sauda_check_point)</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Pending Arrival</td>
                  <td className="p-2 font-mono">COUNT(DISTINCT P.O. No.) in Sauda Check Point NOT present in Mill Inspection</td>
                  <td className="p-2">Sauda Check Point − Mill Inspection</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Inspection Pending</td>
                  <td className="p-2 font-mono">COUNT(DISTINCT M.R. No.) in Final Arrival NOT present in Mill Inspection</td>
                  <td className="p-2">Final Arrival (final_arrival) − Mill Inspection</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Settlement Pending</td>
                  <td className="p-2 font-mono">COUNT(DISTINCT P.O. No.) in Mill Inspection NOT present in Settlement</td>
                  <td className="p-2">Mill Inspection − Settlement (mr_settlement_master)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TOP EXECUTIVE KPI STRIP ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => onDrillDown('Sauda Check Point Contracted Volume', filtered, 'sauda_quantity')}
          className="text-left bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Contracted Volume</span>
          <div className="text-lg font-black font-mono tabular-nums text-slate-900 mt-1">
            {eo.contractedVolumeMT.toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT
          </div>
          <span className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{eo.scpPoCount} POs · {eo.scpUniqueBrokers} Brokers</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDrillDown('Payment Operations — Payable Contracts', filtered)}
          className="text-left bg-slate-900 text-white border border-slate-800 hover:bg-slate-800 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Purchase Value</span>
          <div className="text-lg font-black font-mono tabular-nums text-white mt-1">
            ₹{(eo.paymentPayableAmt / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[11px] text-emerald-300 font-mono mt-1 block">
            {eo.paymentVoucherCount} Payment Vouchers · Payable
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDrillDown('Disbursed Payment Contracts', filtered.filter(t => t.paidAmount > 0))}
          className="text-left bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Disbursed Payment</span>
          <div className="text-lg font-black font-mono tabular-nums text-teal-800 mt-1">
            ₹{(eo.paymentPaidAmt / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Paid Amount · Payment Ops
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDrillDown('Premium Paid Contracts', filtered.filter(t => t.premiumAmount > 0))}
          className="text-left bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Total Premium</span>
          <div className="text-lg font-black font-mono tabular-nums text-amber-900 mt-1">
            ₹{Math.round(eo.paymentPremiumAmt).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {eo.paymentPremiumMrCount} MRs with premium
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDrillDown('Short & Excess Weight/Rate Deduction POs', filtered.filter(t => t.deductionAmount > 0))}
          className="text-left bg-white border border-slate-200 hover:border-rose-400 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Short &amp; Excess Deductions</span>
          <div className="text-lg font-black font-mono tabular-nums text-rose-800 mt-1">
            ₹{Math.round(eo.shortExcessDeductionAmt).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {eo.shortExcessPoCount} POs · Extra &amp; Short Wt/Rate
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDrillDown('Sauda Check Point Contracts Present in Mill Inspection', filtered.filter(t => t.hasInspection))}
          className="text-left bg-white border border-rose-200 hover:border-rose-400 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Flagged Deals</span>
          <div className="text-lg font-black font-mono tabular-nums text-rose-900 mt-1">
            {eo.scpInMillInspectionUniqueCount} <span className="text-xs font-semibold text-slate-400">/ {eo.scpTotalSaudaCount}</span>
          </div>
          <span className="text-[11px] text-rose-600 mt-1 block">
            Unique SCP in Mill Insp · {eo.pendingArrivalCount} open
          </span>
        </button>
      </div>

      {/* ================= PRIMARY DASHBOARD CHARTS (HALF-DOUGHNUT, DOUGHNUT, MONTHLY LINE) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 1. Half-Doughnut: % of Contracted MT Received */}
        <div className="lg:col-span-3">
          <HalfDoughnutChart
            title="Contracted MT Received"
            subtitle="Sauda Check Point vs Mill Inspection"
            percentage={receivedPct}
            primaryLabel="Received MT"
            primaryValue={`${metrics.arrivedMT.toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT`}
            secondaryLabel="Contracted MT"
            secondaryValue={`${eo.contractedVolumeMT.toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT`}
            accentColor="#0f766e"
          />
        </div>

        {/* 2. Doughnut: Received / In-Transit / Pending MT */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Volume Fulfillment Mix
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Share of Sauda Check Point MT across Received, In Transit &amp; Pending
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 pt-2">
            <div className="sm:col-span-7" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fulfillmentParts}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="56%"
                    outerRadius="86%"
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {fulfillmentParts.map((entry, index) => (
                      <Cell key={`mix-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT`, name]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="sm:col-span-5 space-y-2.5 text-xs">
              {fulfillmentParts.map((part) => {
                const share = eo.contractedVolumeMT > 0 ? (part.value / eo.contractedVolumeMT) * 100 : 0;
                return (
                  <div key={part.name} className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: part.color }} />
                      <span>{part.name}</span>
                    </div>
                    <div className="font-mono tabular-nums text-xs font-black text-slate-900 pl-4">
                      {part.value.toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT
                      <span className="text-[10px] font-normal text-slate-500 ml-1.5">({share.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Line Chart: Monthly Purchased MT Trend */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Monthly Purchased vs Received MT Trend
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sauda Check Point contracted MT vs Mill Inspection received MT
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-500">{monthlyTrendData.length} months</span>
          </div>

          <div className="pt-2" style={{ width: '100%', height: 225 }}>
            {monthlyTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No monthly data in current filter range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} tickFormatter={(v) => `${v} MT`} width={58} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT`, name]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Line
                    type="monotone"
                    dataKey="contractedMT"
                    name="Contracted MT"
                    stroke="#D94B5A"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#D94B5A' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="receivedMT"
                    name="Received MT"
                    stroke="#0f766e"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#0f766e' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ================= SOURCING FOOTPRINT & STAGE HEALTH STRIP ================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Sourcing Footprint &amp; Stage Backlog
            </h4>
            <p className="text-[11px] text-slate-500">Unique entities from Sauda Check Point &amp; live stage backlog counts</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllPoRegister(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 transition cursor-pointer"
          >
            <Table2 className="w-3.5 h-3.5 text-[#D94B5A]" />
            <span>{showAllPoRegister ? 'Hide Consolidated PO Register' : `Open Consolidated PO Register (${dataset.allPoSummary.totalCount})`}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
          {[
            { label: 'Suppliers', value: String(eo.scpUniqueSuppliers), sub: 'Unique in SCP', onClick: () => onDrillDown('Unique Sourcing Suppliers (Sauda Check Point)', filtered, 'suppliers') },
            { label: 'Brokers', value: String(eo.scpUniqueBrokers), sub: 'Unique in SCP', onClick: () => onDrillDown('Unique Sourcing Brokers (Sauda Check Point)', filtered, 'brokers') },
            { label: 'Agencies', value: String(eo.scpUniqueAgencies), sub: 'Unique in SCP', onClick: () => onDrillDown('Unique Purchasing Agencies (Sauda Check Point)', filtered, 'agencies') },
            { label: 'Areas', value: String(eo.scpUniqueAreas), sub: 'Unique in SCP', onClick: () => onDrillDown('Unique Sourcing Areas (Sauda Check Point)', filtered, 'areas') },
            { label: 'Grades', value: String(eo.scpUniqueGrades), sub: 'Unique in SCP', onClick: () => onDrillDown('Unique Quality Grades (Sauda Check Point)', filtered, 'grades') },
            { label: 'Pending Arrival', value: `${eo.pendingArrivalCount}`, sub: 'SCP PO not in Mill Insp', onClick: () => onDrillDown('Pending Arrival (SCP P.O. Not Present in Mill Inspection)', filtered.filter(t => !t.hasInspection)) },
            { label: 'Inspection Pending', value: `${eo.inspectionPendingCount}`, sub: 'Final Arr MR not in Insp', onClick: () => onDrillDown('Inspection Pending (Final Arrival Not in Mill Inspection)', filtered.filter(t => t.hasFinalArrival && !t.hasInspection)) },
            { label: 'Settlement Pending', value: `${eo.settlementPendingCount}`, sub: 'Mill Insp PO not Settled', onClick: () => onDrillDown('Settlement Pending (Mill Inspection P.O. Not in Settlement)', filtered.filter(t => t.hasInspection && t.settlementStatus !== 'SETTLED')) }
          ].map(item => (
            <button
              type="button"
              key={item.label}
              onClick={item.onClick}
              className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-white transition cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-slate-500 block">{item.label}</span>
              <span className="text-base font-black font-mono tabular-nums text-slate-900 mt-0.5 block">{item.value}</span>
              <span className="text-[10px] text-slate-500 block truncate">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ================= OPTIONAL CONSOLIDATED PO REGISTER (NO SEPARATE DUPLICATE TAB) ================= */}
      {showAllPoRegister && (
        <div className="pt-1">
          <AllPoReportView dataset={dataset} />
        </div>
      )}
    </div>
  );
};
