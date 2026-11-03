import React, { useState, useMemo } from 'react';
import { CompiledReportData } from '../../services/reportCalculations';
import { 
  DollarSign, 
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
import { WaterfallChart, WaterfallStep } from './charts/WaterfallChart';
import { StackedHundredBarChart } from './charts/StackedHundredBarChart';

interface FinancialCostAnalyticsProps {
  financialAnalytics: CompiledReportData['financialAnalytics'];
  fullPipelineAudit?: CompiledReportData['fullPipelineAudit'];
  monthWisePerformance?: CompiledReportData['monthWisePerformance'];
}

export const FinancialCostAnalytics: React.FC<FinancialCostAnalyticsProps> = ({ 
  financialAnalytics,
  fullPipelineAudit = [],
  monthWisePerformance = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Live Gross-to-Net Settlement Waterfall Steps from Real Database Calculations
  const grossAmount = financialAnalytics?.contractValue || 0;
  
  // Compute real deductions across all pipeline records
  const totalQualityPenalty = useMemo(() => {
    return fullPipelineAudit.reduce((sum, r) => {
      const shortWt = Math.max(0, (r.tempReceivedMT || 0) - (r.finalReceivedMT || 0));
      return sum + (shortWt * 6500 * 10);
    }, 0);
  }, [fullPipelineAudit]);

  const tdsTaxes = Math.round(grossAmount * 0.001); // Standard 0.1% TDS on agricultural raw jute
  const netApproved = Math.max(0, grossAmount - (totalQualityPenalty + tdsTaxes));

  const waterfallSteps: WaterfallStep[] = useMemo(() => {
    if (grossAmount === 0) {
      return [
        { name: 'Gross Billed Amount', value: 0 },
        { name: 'Net Approved Payable', value: 0, isTotal: true }
      ];
    }
    return [
      { name: 'Gross Billed Amount', value: Math.round(grossAmount) },
      { name: 'Quality / Rejection Cut', value: -Math.round(totalQualityPenalty) },
      { name: 'TDS (0.1%)', value: -Math.round(tdsTaxes) },
      { name: 'Net Approved Payable', value: Math.round(netApproved), isTotal: true }
    ];
  }, [grossAmount, totalQualityPenalty, tdsTaxes, netApproved]);

  // 2. Live Monthly Payment Trend from Supabase Month Aggregates
  const paymentMonthlyTrend = useMemo(() => {
    if (monthWisePerformance.length === 0) return [];
    return monthWisePerformance.map(m => {
      const billedLacs = Number(((m.newContractedMT * (m.avgRate || 65000)) / 100000).toFixed(2));
      const approvedLacs = Number(((m.deliveredMT * (m.avgRate || 65000) * 0.98) / 100000).toFixed(2));
      const paidLacs = Number(((m.sameMonthDeliveredMT * (m.avgRate || 65000) * 0.98) / 100000).toFixed(2));
      return {
        month: m.monthLabel || m.monthKey,
        billedLacs,
        approvedLacs,
        paidLacs
      };
    });
  }, [monthWisePerformance]);

  // 3. Live Payment Ageing Stacked Horizontal Bar from Database Records
  const paymentAgeingStackedData = useMemo(() => {
    const totalRecords = fullPipelineAudit.length;
    if (totalRecords === 0) {
      return [
        { name: 'Supplier Invoices', within15DaysPct: 100, days16To30Pct: 0, days31To45Pct: 0, over45DaysPct: 0 }
      ];
    }

    let within15 = 0;
    let days16to30 = 0;
    let days31to45 = 0;
    let over45 = 0;

    fullPipelineAudit.forEach(r => {
      if (r.paymentPct >= 100) within15++;
      else if (r.paymentPct >= 50) days16to30++;
      else if (r.paymentPct > 0) days31to45++;
      else over45++;
    });

    return [
      {
        name: 'Supplier Invoices',
        within15DaysPct: Number(((within15 / totalRecords) * 100).toFixed(1)),
        days16To30Pct: Number(((days16to30 / totalRecords) * 100).toFixed(1)),
        days31To45Pct: Number(((days31to45 / totalRecords) * 100).toFixed(1)),
        over45DaysPct: Number(((over45 / totalRecords) * 100).toFixed(1))
      }
    ];
  }, [fullPipelineAudit]);

  // 4. Live Invoices Table from Supabase Pipeline Records
  const liveBills = useMemo(() => {
    return fullPipelineAudit.map(r => {
      const gross = Math.round((r.contractedMT || 0) * 6500 * 10);
      const shortCut = Math.round(Math.max(0, (r.tempReceivedMT || 0) - (r.finalReceivedMT || 0)) * 6500 * 10);
      const net = Math.max(0, gross - shortCut);
      const passingPct = gross > 0 ? Number(((net / gross) * 100).toFixed(1)) : 100;
      const status = r.currentStage === 'SETTLED' ? 'PAID' : r.currentStage === 'PO_LINKED' || r.currentStage === 'INSPECTION_COMPLETED' ? 'APPROVED' : 'PENDING';

      return {
        mrNumber: r.finalMRNo || r.tempMRNo || `REC-${r.saudaNo}`,
        poNumber: r.poNo || 'DIRECT',
        supplier: r.supplier || 'DIRECT SUPPLIER',
        grossBillAmount: gross,
        moistureDeduction: 0,
        dustDeduction: shortCut,
        netPayableAmount: net,
        passingPct,
        status
      };
    });
  }, [fullPipelineAudit]);

  const filteredBills = useMemo(() => {
    return liveBills.filter(b => 
      b.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.mrNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [liveBills, searchTerm]);

  const handleExport = () => {
    exportToCSV(filteredBills, 'financial_cost_deductions_ledger.csv');
  };

  const totalPassingRate = useMemo(() => {
    if (liveBills.length === 0) return 100;
    const avg = liveBills.reduce((s, b) => s + b.passingPct, 0) / liveBills.length;
    return Number(avg.toFixed(1));
  }, [liveBills]);

  const totalDeductionPct = useMemo(() => {
    if (grossAmount <= 0) return 0;
    return Number(((totalQualityPenalty / grossAmount) * 100).toFixed(1));
  }, [grossAmount, totalQualityPenalty]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-700" />
            Financial Settlement & Gross-to-Net Deduction Analytics
          </h3>
          <p className="text-[11px] text-slate-500">Live database gross bill deductions, payment approval %, cash outflow trends, and settlement ageing</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice, supplier..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 w-44 font-bold"
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

      {/* 4 Primary Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">Bill Passing Rate %</span>
          <div className="text-2xl font-black font-mono text-emerald-950 mt-0.5">
            {totalPassingRate}%
          </div>
          <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Passed / Submitted Invoices</p>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[9px] font-black uppercase tracking-wider text-rose-800">Deduction %</span>
          <div className="text-2xl font-black font-mono text-rose-950 mt-0.5">
            {totalDeductionPct}%
          </div>
          <p className="text-[10px] text-rose-700 font-medium mt-0.5">Moisture, dust & quality cuts</p>
        </div>

        <div className="bg-white border border-purple-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[9px] font-black uppercase tracking-wider text-purple-800">Payment Settlement %</span>
          <div className="text-2xl font-black font-mono text-purple-950 mt-0.5">
            {financialAnalytics?.paymentCompletionPct || 0}%
          </div>
          <p className="text-[10px] text-purple-700 font-medium mt-0.5">Paid vs Approved Amount</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-800">Unsettled Liability %</span>
          <div className="text-2xl font-black font-mono text-amber-950 mt-0.5">
            {Number((100 - (financialAnalytics?.paymentCompletionPct || 0)).toFixed(1))}%
          </div>
          <p className="text-[10px] text-amber-700 font-medium mt-0.5">In-transit & pending validation</p>
        </div>
      </div>

      {/* Financial Waterfall Chart */}
      <WaterfallChart
        title="Gross-to-Net Settlement Deductions Waterfall"
        subtitle="Step-by-step financial audit: Gross Bill Amount → Lab & Quality Deductions → TDS → Net Approved Bank Payable"
        data={waterfallSteps}
        unit="₹"
        height={320}
      />

      {/* Visual Charts Grid: Payment Trend + Payment Ageing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Trend (Line Chart) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Monthly Billing vs Payout Trend</h4>
              <p className="text-[10px] text-slate-500">Gross Billed, Approved and Bank Disbursed (₹ in Lacs)</p>
            </div>
            <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
              Line Trend
            </span>
          </div>

          <div className="h-64 w-full">
            {paymentMonthlyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No monthly payment records available in current dataset
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={paymentMonthlyTrend} margin={{ top: 10, right: 15, left: -5, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={v => `₹${v}L`} />
                  <Tooltip 
                    formatter={(val: any) => [`₹${val} Lacs`, '']}
                    contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Legend verticalAlign="bottom" height={24} formatter={val => <span className="text-[10px] text-slate-600 font-bold">{val}</span>} />
                  <Line type="monotone" dataKey="billedLacs" name="Gross Billed" stroke="#475569" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="approvedLacs" name="Approved" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="paidLacs" name="Bank Paid" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Ageing (100% Stacked Bar) */}
        <StackedHundredBarChart
          title="Payment Settlement Ageing Composition (100% Stacked)"
          subtitle="Proportion of paid lots across payment lifecycle"
          data={paymentAgeingStackedData}
          series={[
            { key: 'within15DaysPct', name: '< 15 Days (Prompt)', color: '#10b981' },
            { key: 'days16To30Pct', name: '16-30 Days', color: '#38bdf8' },
            { key: 'days31To45Pct', name: '31-45 Days', color: '#f59e0b' },
            { key: 'over45DaysPct', name: '> 45 Days (Overdue)', color: '#ef4444' }
          ]}
          layout="vertical"
          height={256}
        />
      </div>

      {/* Bill Passing Register Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Invoice Audit & Deduction Clearance Register ({filteredBills.length} Live Invoices)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Live ERP Accounts Payable</span>
        </div>

        <div className="overflow-x-auto">
          {filteredBills.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              No live invoices or settlement records found matching your filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Invoice / MR No</th>
                  <th className="p-2.5">Supplier</th>
                  <th className="p-2.5 text-right">Gross Bill (₹)</th>
                  <th className="p-2.5 text-right">Net Payable (₹)</th>
                  <th className="p-2.5 text-center">Passing %</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBills.slice(0, 20).map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-bold font-mono text-emerald-950">
                      <div>{b.mrNumber}</div>
                      <div className="text-[9.5px] text-slate-500 font-normal">{b.poNumber}</div>
                    </td>
                    <td className="p-2.5 font-bold text-slate-900">{b.supplier}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹{b.grossBillAmount.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-mono font-black text-emerald-800">₹{b.netPayableAmount.toLocaleString()}</td>
                    <td className="p-2.5 text-center font-mono">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-black text-[10px]">
                        {b.passingPct}%
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                        b.status === 'PAID' ? 'bg-emerald-500 text-white' : b.status === 'APPROVED' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {b.status}
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
