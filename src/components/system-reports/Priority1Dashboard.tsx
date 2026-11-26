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
  const [showAllPoRegister, setShowAllPoRegister] = useState(false);
  const [showFormulaGuide, setShowFormulaGuide] = useState(false);

  // 1. Completion % for Half-Doughnut
  const receivedPct = useMemo(() => {
    if (metrics.totalQuantityMT <= 0) return 0;
    return Math.min(100, (metrics.arrivedMT / metrics.totalQuantityMT) * 100);
  }, [metrics.arrivedMT, metrics.totalQuantityMT]);

  // 2. Parts of 1 Total (Received / In-Transit / Pending MT) for Doughnut
  const fulfillmentParts = useMemo(() => {
    const inTransitMT = filtered.reduce((sum, t) => sum + (t.inTransitWeightMT || 0), 0);
    const receivedMT = Math.max(0, metrics.arrivedMT);
    const rawPendingMT = Math.max(0, metrics.totalQuantityMT - receivedMT - inTransitMT);
    return [
      { name: 'Received MT', value: Number(receivedMT.toFixed(2)), color: DOUGHNUT_COLORS[0] },
      { name: 'In Transit MT', value: Number(inTransitMT.toFixed(2)), color: DOUGHNUT_COLORS[1] },
      { name: 'Pending MT', value: Number(rawPendingMT.toFixed(2)), color: DOUGHNUT_COLORS[2] }
    ].filter(p => p.value > 0);
  }, [filtered, metrics.arrivedMT, metrics.totalQuantityMT]);

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
          Executive Summary · {filtered.length} Active Contracts (Void/Cancelled &amp; Duplicate Saudas Excluded)
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
            Executive Overview — Card Formula &amp; Database Source Logic
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="p-2">Card / Chart</th>
                  <th className="p-2">Formula</th>
                  <th className="p-2">Database Tables Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="p-2 font-bold text-slate-900">Contracted Volume</td>
                  <td className="p-2 font-mono">SUM(total_contract_mt) across deduplicated active POs &amp; unpromoted Saudas</td>
                  <td className="p-2">sauda_check_point, purchase_master, sauda_master</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Purchase Value &amp; Avg Rate</td>
                  <td className="p-2 font-mono">SUM(Contract MT × Weighted PO Rate/Qtl × 10); Avg Rate = Σ(MT × Rate) / Σ(MT)</td>
                  <td className="p-2">sauda_check_point_details, purchase_detail_master, sauda_check_point</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Disbursed Payment &amp; Settled</td>
                  <td className="p-2 font-mono">SUM(paid_amount) per PO; Settled = SUM(value_amt) deduplicated per MR</td>
                  <td className="p-2">payment_master, mr_settlement_master</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Total Premium</td>
                  <td className="p-2 font-mono">SUM(explicit MR premium amounts) matched by exact PO number</td>
                  <td className="p-2">payment_master, payment_details</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Total Deductions</td>
                  <td className="p-2 font-mono">SUM(MAX(inspection deduction, settlement less + short/excess) + PO short/excess)</td>
                  <td className="p-2">material_inspection, mr_settlement_master, sauda_check_point_deductions</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Flagged Deals</td>
                  <td className="p-2 font-mono">Count of POs with active Mismatch, Overdue (&gt;0.5 MT pending past due date), Moisture &gt;18%, Grade Down &gt;0, or High Deduction (&gt;3%)</td>
                  <td className="p-2">material_mismatch, satta_mismatch, material_inspection, sauda_check_point</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-900">Contracted MT Received %</td>
                  <td className="p-2 font-mono">(Deduplicated Received MT ÷ Contracted MT) × 100 across Final Arrival, Mill Inspection &amp; Settlement</td>
                  <td className="p-2">final_arrival, material_inspection, material_inspection_details, mr_settlement_master</td>
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
          onClick={() => onDrillDown('All Contracted Sauda / P.O. Quantity', filtered, 'sauda_quantity')}
          className="text-left bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Contracted Volume</span>
          <div className="text-lg font-black font-mono tabular-nums text-slate-900 mt-1">
            {metrics.totalQuantityMT.toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT
          </div>
          <span className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{metrics.totalPOCount} POs · {metrics.totalBrokerCount} Brokers</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDrillDown('Gross Purchase Value Ledger', filtered)}
          className="text-left bg-slate-900 text-white border border-slate-800 hover:bg-slate-800 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Purchase Value</span>
          <div className="text-lg font-black font-mono tabular-nums text-white mt-1">
            ₹{(metrics.totalPurchaseValue / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[11px] text-emerald-300 font-mono mt-1 block">
            Avg ₹{Math.round(metrics.weightedPurchaseRate).toLocaleString('en-IN')}/Qtl
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDrillDown('Disbursed Payment Contracts', filtered.filter(t => t.paidAmount > 0))}
          className="text-left bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Disbursed Payment</span>
          <div className="text-lg font-black font-mono tabular-nums text-teal-800 mt-1">
            ₹{(metrics.totalPayment / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Settled: ₹{(metrics.totalSettlement / 10000000).toFixed(2)} Cr
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDrillDown('Premium Paid Contracts', filtered.filter(t => t.premiumAmount > 0))}
          className="text-left bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Total Premium</span>
          <div className="text-lg font-black font-mono tabular-nums text-amber-900 mt-1">
            ₹{Math.round(metrics.totalPremium).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {metrics.premiumMRCount} MRs with premium
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDrillDown('Contracts With Deductions', filtered.filter(t => t.deductionAmount > 0))}
          className="text-left bg-white border border-slate-200 hover:border-rose-400 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Total Deductions</span>
          <div className="text-lg font-black font-mono tabular-nums text-rose-800 mt-1">
            ₹{Math.round(metrics.totalDeduction).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Quality, weight &amp; claims
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDrillDown('Flagged / Exception Contracts', filtered.filter(t => t.isAbnormal || t.hasMismatch))}
          className="text-left bg-white border border-rose-200 hover:border-rose-400 rounded-xl p-3.5 shadow-2xs transition cursor-pointer group"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Flagged Deals</span>
          <div className="text-lg font-black font-mono tabular-nums text-rose-900 mt-1">
            {metrics.abnormalCount} <span className="text-xs font-semibold text-slate-400">/ {filtered.length}</span>
          </div>
          <span className="text-[11px] text-rose-600 mt-1 block">
            {metrics.delayedCount} overdue · {metrics.highMoistureCount} high moist
          </span>
        </button>
      </div>

      {/* ================= PRIMARY DASHBOARD CHARTS (HALF-DOUGHNUT, DOUGHNUT, MONTHLY LINE) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 1. Half-Doughnut: % of Contracted MT Received */}
        <div className="lg:col-span-3">
          <HalfDoughnutChart
            title="Contracted MT Received"
            subtitle="Overall physical receipt completion"
            percentage={receivedPct}
            primaryLabel="Received MT"
            primaryValue={`${metrics.arrivedMT.toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT`}
            secondaryLabel="Contracted MT"
            secondaryValue={`${metrics.totalQuantityMT.toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT`}
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
              Share of total contracted MT across Received, In Transit &amp; Pending
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
                const share = metrics.totalQuantityMT > 0 ? (part.value / metrics.totalQuantityMT) * 100 : 0;
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
                Chronological procurement volume and physical receipt pace
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
            <p className="text-[11px] text-slate-500">Click any metric to inspect underlying contracts</p>
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
            { label: 'Suppliers', value: String(metrics.totalSupplierCount), sub: 'Unique parties', onClick: () => onDrillDown('Unique Sourcing Suppliers', filtered, 'suppliers') },
            { label: 'Brokers', value: String(metrics.totalBrokerCount), sub: 'Active brokers', onClick: () => onDrillDown('Unique Sourcing Brokers', filtered, 'brokers') },
            { label: 'Agencies', value: String(metrics.totalAgencyCount), sub: 'Purchasing desks', onClick: () => onDrillDown('Unique Purchasing Agencies', filtered, 'agencies') },
            { label: 'Areas', value: String(metrics.totalAreaCount), sub: 'Jute belts', onClick: () => onDrillDown('Unique Sourcing Areas', filtered, 'areas') },
            { label: 'Grades', value: String(metrics.totalGradeCount), sub: 'Quality grades', onClick: () => onDrillDown('Unique Quality Grades', filtered, 'grades') },
            { label: 'Pending Arrival', value: `${metrics.temporaryArrivalPendingCount}`, sub: `${metrics.pendingDeliveryMT.toFixed(1)} MT bal`, onClick: () => onDrillDown('Pending Delivery Contracts', filtered.filter(t => t.pendingWeightMT > 0.01)) },
            { label: 'Inspection Pending', value: `${metrics.millInspectionPendingCount}`, sub: 'Lab queue', onClick: () => onDrillDown('Mill Inspection Pending', filtered.filter(t => t.inspectionStatus === 'PENDING')) },
            { label: 'Settlement Pending', value: `${metrics.settlementPendingCount}`, sub: 'Open clearance', onClick: () => onDrillDown('Settlement Pending Contracts', filtered.filter(t => t.settlementStatus !== 'SETTLED')) }
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
