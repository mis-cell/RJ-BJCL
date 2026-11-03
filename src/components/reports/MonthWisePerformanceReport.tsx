import React, { useState } from 'react';
import { CompiledReportData } from '../../services/reportCalculations';
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  ArrowRight, 
  Clock, 
  DollarSign, 
  Layers, 
  ArrowUpDown 
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportHelpers';

interface MonthWisePerformanceReportProps {
  monthWisePerformance: CompiledReportData['monthWisePerformance'];
}

export const MonthWisePerformanceReport: React.FC<MonthWisePerformanceReportProps> = ({ monthWisePerformance }) => {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const handleExport = () => {
    const headers = [
      'Month',
      'Opening Pending (MT)',
      'New Contracted (MT)',
      'Total Available (MT)',
      'Delivered (MT)',
      'Closing Pending (MT)',
      'Delivered %',
      'Pending %',
      'Completed Contracts',
      'Partial Contracts',
      'Not Started Contracts',
      'Avg Rate (INR)',
      'Procurement Value (INR)',
      'On-Time %',
      'Delayed %',
      'Settlement %',
      'Payment %'
    ];

    const rows = monthWisePerformance.map(m => [
      m.monthLabel,
      m.openingPendingMT,
      m.newContractedMT,
      m.totalAvailableMT,
      m.deliveredMT,
      m.closingPendingMT,
      `${m.deliveredPct}%`,
      `${m.pendingPct}%`,
      m.fullyCompletedCount,
      m.partialCount,
      m.notStartedCount,
      m.avgRate,
      m.procurementValue,
      `${m.onTimePct}%`,
      `${m.delayedPct}%`,
      `${m.settlementPct}%`,
      `${m.paymentPct}%`
    ]);

    exportToCSV(`Month_Wise_Sauda_Performance_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const selectedMonthData = monthWisePerformance.find(m => m.monthKey === selectedMonth);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
              Month-Wise Sauda Contract & Delivery Performance Matrix
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Monthly carry-forward ledger: Opening Pending + New Contracted = Total Available − Delivered = Closing Pending
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

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
            <thead className="bg-slate-800 text-white sticky top-0 text-[9px] uppercase tracking-wider font-mono z-10">
              <tr>
                <th className="p-2.5 px-3 border-r border-slate-700">Month</th>
                <th className="p-2.5 text-right border-r border-slate-700">Opening Pending</th>
                <th className="p-2.5 text-right border-r border-slate-700">New Contracted</th>
                <th className="p-2.5 text-right border-r border-slate-700 bg-slate-900 font-bold">Total Available</th>
                <th className="p-2.5 text-right border-r border-slate-700 text-emerald-300">Delivered (MT)</th>
                <th className="p-2.5 text-right border-r border-slate-700 text-amber-300">Closing Pending</th>
                <th className="p-2.5 text-right border-r border-slate-700">Delivered %</th>
                <th className="p-2.5 text-right border-r border-slate-700">Pending %</th>
                <th className="p-2.5 text-center border-r border-slate-700">Contracts (F/P/N)</th>
                <th className="p-2.5 text-right border-r border-slate-700">Avg Rate</th>
                <th className="p-2.5 text-right border-r border-slate-700">On-Time %</th>
                <th className="p-2.5 text-right border-r border-slate-700">Settled %</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {monthWisePerformance.map((m) => {
                const isSelected = selectedMonth === m.monthKey;
                return (
                  <tr 
                    key={m.monthKey}
                    onClick={() => setSelectedMonth(isSelected ? null : m.monthKey)}
                    className={`hover:bg-emerald-50/40 transition-colors cursor-pointer ${
                      isSelected ? 'bg-emerald-50/80 font-bold border-l-4 border-l-emerald-600' : 'even:bg-slate-50/50'
                    }`}
                  >
                    <td className="p-2.5 px-3 font-sans font-bold text-slate-800 border-r border-slate-100">
                      {m.monthLabel}
                    </td>
                    <td className="p-2.5 text-right text-slate-600 border-r border-slate-100">{m.openingPendingMT.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-slate-900 border-r border-slate-100 font-semibold">{m.newContractedMT.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-slate-950 border-r border-slate-100 font-black bg-slate-50/80">{m.totalAvailableMT.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-emerald-800 border-r border-slate-100 font-bold">{m.deliveredMT.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-amber-800 border-r border-slate-100 font-bold">{m.closingPendingMT.toLocaleString()}</td>
                    <td className="p-2.5 text-right border-r border-slate-100">
                      <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                        {m.deliveredPct}%
                      </span>
                    </td>
                    <td className="p-2.5 text-right border-r border-slate-100">
                      <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                        {m.pendingPct}%
                      </span>
                    </td>
                    <td className="p-2.5 text-center text-slate-600 border-r border-slate-100 text-[10px]">
                      {m.fullyCompletedCount} / {m.partialCount} / {m.notStartedCount}
                    </td>
                    <td className="p-2.5 text-right text-slate-800 border-r border-slate-100">₹{m.avgRate}</td>
                    <td className="p-2.5 text-right text-slate-800 border-r border-slate-100 font-bold">{m.onTimePct}%</td>
                    <td className="p-2.5 text-right text-emerald-800 border-r border-slate-100 font-bold">{m.settlementPct}%</td>
                    <td className="p-2.5 text-center">
                      <button className="text-[10px] text-emerald-700 font-sans font-bold hover:underline">
                        {isSelected ? 'Close' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {monthWisePerformance.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400 italic">
                    No monthly performance records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Month Carry-Forward & Reconciled Audit Sheet */}
      {selectedMonthData && (
        <div className="bg-slate-900 text-white border border-slate-800 rounded-lg p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                MONTHLY RECONCILIATION & CARRY-FORWARD ANALYSIS
              </div>
              <h4 className="text-base font-black uppercase text-white tracking-wide">
                {selectedMonthData.monthLabel}
              </h4>
            </div>
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Close Breakdown
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-slate-800 p-2.5 rounded border border-slate-700">
              <span className="text-[9px] text-slate-400 uppercase block">Same-Month Delivered</span>
              <span className="text-base font-bold text-emerald-400">{selectedMonthData.sameMonthDeliveredMT} MT</span>
            </div>
            <div className="bg-slate-800 p-2.5 rounded border border-slate-700">
              <span className="text-[9px] text-slate-400 uppercase block">Prev-Month Pending Cleared</span>
              <span className="text-base font-bold text-cyan-400">{selectedMonthData.prevMonthDeliveredMT} MT</span>
            </div>
            <div className="bg-slate-800 p-2.5 rounded border border-slate-700">
              <span className="text-[9px] text-slate-400 uppercase block">Carried Forward to Next Month</span>
              <span className="text-base font-bold text-amber-400">{selectedMonthData.carriedForwardMT} MT</span>
            </div>
            <div className="bg-slate-800 p-2.5 rounded border border-slate-700">
              <span className="text-[9px] text-slate-400 uppercase block">Overdue Pending Volume</span>
              <span className="text-base font-bold text-rose-400">{selectedMonthData.overduePendingMT} MT</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
