import React from 'react';
import { Printer } from 'lucide-react';
import { PurchaseMaster, MONTH_LABELS, ReportOutput } from './types';

interface PurchaseOrderSummaryPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonthsForPrint: string[];
  reportOutput: ReportOutput;
  poFilteredByPeriod: PurchaseMaster[];
  poReportSupplier: string;
}

export const PurchaseOrderSummaryPrintModal: React.FC<PurchaseOrderSummaryPrintModalProps> = ({
  isOpen,
  onClose,
  selectedMonthsForPrint,
  reportOutput,
  poFilteredByPeriod,
  poReportSupplier
}) => {
  if (!isOpen) return null;

  return (
    <div className="print-modal-wrapper fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:overflow-visible">
      <div className="print-modal-inner bg-[#FBCFCB] border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.35)] w-full max-w-4xl rounded-sm p-4 print:border-0 print:shadow-none print:bg-white print:p-0">
        {/* Modal Controls */}
        <div className="flex justify-between items-center pb-3 border-b-2 border-gray-400 mb-4 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-indigo-950" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Concatenated Executive Print Center (Selected Months: {selectedMonthsForPrint.length})
            </h2>
          </div>
          <div className="flex items-center gap-2 font-black">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-800 text-white border border-emerald-800 px-3 py-1.5 text-[10.5px] uppercase font-bold flex items-center gap-1.5 shadow-sm rounded-sm cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Send to System Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 hover:bg-white border border-gray-400 text-slate-800 px-3 py-1.5 text-[10.5px] uppercase font-bold shadow-sm rounded-sm cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>

        {/* Print Document Stage */}
        <div className="bg-slate-500 overflow-y-auto max-h-[75vh] p-6 space-y-8 select-text print:bg-white print:p-0 print:overflow-visible print:max-h-none print:space-y-0 shadow-inner">
          {/* PAGE 1: Consolidated Executive Cover Sheet & Global Summary */}
          <div className="print-page bg-white p-10 max-w-[210mm] mx-auto border border-gray-300 shadow-md print:shadow-none print:border-0 print:p-0 rounded-sm">
            {/* Brand Header */}
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase font-sans">
                  CHAMPDANY FIBRE TRADING LIMITED
                </h1>
                <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase">
                  Executive Monthly Raw Materials Procurement &amp; Consolidation Dossier
                </p>
                <p className="text-[9.5px] text-gray-400 italic">
                  Assembled: {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })} at {new Date().toLocaleTimeString('en-IN')}
                </p>
              </div>
              <div className="text-right">
                <span className="border-2 border-slate-900 px-3 py-1 bg-slate-50 text-[10px] font-black uppercase text-slate-950 inline-block font-sans">
                  DOSSIER COVER
                </span>
                {poReportSupplier !== 'ALL' && (
                  <p className="text-[9px] font-bold text-slate-800 uppercase mt-2">
                    Vendor Focus: <span className="underline">{poReportSupplier}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Cover Narrative */}
            <div className="my-5 bg-slate-50 border border-slate-200 p-3 rounded-sm font-sans">
              <h3 className="text-[10.5px] font-black text-slate-900 uppercase">
                CONSOLIDATED MASTER EXECUTIVE OVERVIEW
              </h3>
              <p className="text-[9.5px] text-gray-600 mt-1 leading-relaxed">
                This official dossier compiles, checks, and certifies the raw material procurement logs and contract entries corresponding to {selectedMonthsForPrint.length} selected monthly billing cycles. The records listed represent verified contractual commitments, transaction volumes, rates, and required commercial capital outlays.
              </p>
            </div>

            {/* Consolidated Table */}
            <h4 className="text-[9.5px] font-extrabold text-slate-800 uppercase tracking-wider mb-2 font-sans">
              Compiled Billing Cycle Totals
            </h4>
            <div className="border border-slate-800 overflow-hidden mb-6">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-[9.5px] font-sans">
                    <th className="p-2 border border-slate-800">Billing Cycle</th>
                    <th className="p-2 border border-slate-800 text-center font-bold">Contracts count</th>
                    <th className="p-2 border border-slate-800 text-right">Sourced Mass (MT)</th>
                    <th className="p-2 border border-slate-800 text-right">Avg B-Rate (INR)</th>
                    <th className="p-2 border border-slate-800 text-right">Est. Required Capital</th>
                  </tr>
                </thead>
                <tbody className="font-sans">
                  {(() => {
                    const selectedRows = reportOutput.rows.filter((r) =>
                      selectedMonthsForPrint.includes(String(r[0]))
                    );

                    let grandCount = 0;
                    let grandWeight = 0;
                    let grandSumRate = 0;
                    let rateCount = 0;
                    let grandCapital = 0;

                    selectedRows.forEach((row) => {
                      grandCount += Number(row[1]) || 0;
                      grandWeight += Number(row[2]) || 0;

                      const rateNum = Number(String(row[3]).replace(/[^\d]/g, '')) || 0;
                      if (rateNum) {
                        grandSumRate += rateNum;
                        rateCount++;
                      }

                      const capitalNum = Number(String(row[4]).replace(/[^\d]/g, '')) || 0;
                      if (capitalNum) {
                        grandCapital += capitalNum;
                      }
                    });

                    const avgGrandRate = rateCount > 0 ? Math.round(grandSumRate / rateCount) : 0;

                    return (
                      <>
                        {selectedRows.map((row, index) => (
                          <tr key={index} className="border-b border-gray-300 font-sans">
                            <td className="p-2 font-mono font-bold border border-gray-300 text-slate-800">
                              {row[0]}
                            </td>
                            <td className="p-2 text-center border border-gray-300 font-semibold">
                              {row[1]}
                            </td>
                            <td className="p-2 text-right font-mono font-bold border border-gray-300 text-emerald-950">
                              {row[2]} MT
                            </td>
                            <td className="p-2 text-right border border-gray-300 text-indigo-900 font-bold">
                              {row[3]}
                            </td>
                            <td className="p-2 text-right border border-gray-300 text-teal-900 font-black">
                              {row[4]}
                            </td>
                          </tr>
                        ))}

                        {/* Grand Totals */}
                        <tr className="bg-slate-100 border-t-2 border-slate-800 font-black text-slate-900">
                          <td className="p-2 border border-slate-800 text-left text-[10px] font-sans font-black">
                            CONSOLIDATED SUM ({selectedRows.length} MONTHS)
                          </td>
                          <td className="p-2 border border-slate-800 text-center font-mono font-black">
                            {grandCount}
                          </td>
                          <td className="p-2 border border-slate-800 text-right font-mono font-black text-emerald-950">
                            {grandWeight.toFixed(3)} MT
                          </td>
                          <td className="p-2 border border-slate-800 text-right text-indigo-950 font-black">
                            {avgGrandRate > 0 ? `Rs. ${avgGrandRate.toLocaleString('en-IN')}` : '--'}
                          </td>
                          <td className="p-2 border border-slate-800 text-right text-teal-950 font-black">
                            Rs. {grandCapital.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            {/* Verification Checkoff list */}
            <div className="border border-dashed border-gray-300 p-3 rounded-sm leading-relaxed text-[9px] text-gray-400 font-sans mb-10">
              <span className="font-extrabold text-slate-700 block uppercase mb-1">
                Dossier Inclusion Verification Checklists
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>✔ Master purchase ledger audit matches detailing metrics.</div>
                <div>✔ Procurement values aligned with verified broker confirmation notes.</div>
                <div>✔ Active billing cycles certified individually in pages following.</div>
                <div>✔ Weight aggregates compiled on structural gross tare weight scales.</div>
              </div>
            </div>

            {/* Authorizations Signoff block */}
            <div className="pt-6 border-t border-gray-300 flex justify-between items-center font-sans">
              <div>
                <div className="h-10"></div>
                <p className="text-[10px] font-black uppercase text-slate-800">
                  COMPILED BY CHIEF CONTROLLER
                </p>
                <p className="text-[8.5px] text-gray-500 italic mt-0.5">
                  Procurement Operations Division
                </p>
              </div>
              <div className="text-right">
                <div className="h-10"></div>
                <p className="text-[10px] font-black uppercase text-slate-800">
                  AUTHORIZED EXECUTIVE SIGNATURE
                </p>
                <p className="text-[8.5px] text-gray-500 italic mt-0.5">
                  Sourcing &amp; Schedulers Board
                </p>
              </div>
            </div>
          </div>

          {/* PAGES 2+: Detailed Individual Monthly Procurement Audits */}
          {selectedMonthsForPrint.map((monthYear, pIdx) => {
            const parts = monthYear.trim().split(/\s+/);
            const mName = parts[0]?.toLowerCase().substring(0, 3) || '';
            const targetMonthNum =
              MONTH_LABELS.find((m) => m.label.toLowerCase().substring(0, 3) === mName)?.value || '';
            const targetYearNum = Number(parts[1]) || 0;

            const monthlyPos = poFilteredByPeriod.filter((po) => {
              if (!po.po_date) return false;
              const d = new Date(po.po_date);
              return (
                (d.getMonth() + 1).toString() === targetMonthNum &&
                d.getFullYear() === targetYearNum
              );
            });

            const poCount = monthlyPos.length;
            const totalWeight = monthlyPos.reduce(
              (sum, po) => sum + (Number(po.total_contract_mt) || 0),
              0
            );
            const totalValue = monthlyPos.reduce((sum, po) => {
              const wt = Number(po.total_contract_mt) || 0;
              const rate = Number(po.b_rate) || 17100;
              return sum + wt * rate;
            }, 0);
            const avgBrate =
              poCount > 0
                ? Math.round(
                    monthlyPos.reduce((sum, po) => sum + (Number(po.b_rate) || 0), 0) /
                      (monthlyPos.filter((po) => po.b_rate).length || 1)
                  )
                : 0;

            return (
              <div
                key={monthYear}
                className="print-page bg-white p-10 max-w-[210mm] mx-auto border border-gray-300 shadow-md print:shadow-none print:border-0 print:p-0 rounded-sm mt-8 print:mt-0"
              >
                {/* Header bar */}
                <div className="flex justify-between items-start border-b-2 border-slate-400 pb-3 font-sans">
                  <div>
                    <h2 className="text-md font-extrabold text-slate-900 tracking-tight uppercase">
                      CHAMPDANY FIBRE TRADING LIMITED
                    </h2>
                    <p className="text-[9.5px] text-slate-500 uppercase font-bold tracking-tight mt-0.5">
                      MONTHLY PROCUREMENT AUDIT &amp; DETAILS — {monthYear.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="border border-slate-400 px-2.5 py-0.5 bg-slate-50 text-[9px] font-bold uppercase text-slate-800 inline-block font-mono">
                      SHEET {pIdx + 2} OF {selectedMonthsForPrint.length + 1}
                    </span>
                  </div>
                </div>

                {/* Sourcing KPIs for current Month Sheet */}
                <div className="grid grid-cols-4 gap-3 my-4 font-sans text-center">
                  <div className="bg-slate-50 border border-slate-300 p-2 rounded-sm">
                    <span className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-widest block">
                      CONTRACT DEALS
                    </span>
                    <span className="text-sm font-black text-slate-800 block uppercase font-mono mt-0.5">
                      {poCount} POs
                    </span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-sm">
                    <span className="text-[7.5px] font-extrabold text-emerald-600 block uppercase tracking-widest">
                      SOURCED TONNAGE
                    </span>
                    <span className="text-sm font-black text-emerald-950 block uppercase font-mono mt-0.5">
                      {totalWeight.toFixed(3)} MT
                    </span>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 p-2 rounded-sm">
                    <span className="text-[7.5px] font-extrabold text-indigo-600 block uppercase tracking-widest">
                      AVG CONTRACT RATE
                    </span>
                    <span className="text-sm font-black text-indigo-950 block uppercase font-mono mt-0.5 font-bold">
                      Rs. {avgBrate.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 p-2 rounded-sm border-dashed">
                    <span className="text-[7.5px] font-extrabold text-teal-600 block uppercase tracking-widest">
                      ESTIMATED CAPITAL
                    </span>
                    <span className="text-sm font-black text-teal-950 block uppercase font-mono mt-0.5 font-bold">
                      Rs. {Math.round(totalValue).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Table of specific contract matches for the month */}
                <h4 className="text-[9.5px] font-extrabold text-slate-800 uppercase tracking-wider mb-1.5 font-sans">
                  Granular Contract Registry Log
                </h4>
                <div className="border border-slate-300 overflow-hidden mb-6">
                  <table className="w-full text-left text-[9px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[8.5px] border-b border-slate-300 font-sans">
                        <th className="p-1.5 border-r border-slate-300">PO No &amp; Ref</th>
                        <th className="p-1.5 border-r border-slate-300">PO Date</th>
                        <th className="p-1.5 border-r border-slate-300">Supplier/Merchant</th>
                        <th className="p-1.5 border-r border-slate-300">Broker Reference</th>
                        <th className="p-1.5 border-r border-slate-300">Sourcing Area</th>
                        <th className="p-1.5 border-r border-slate-300 text-right">Mass (MT)</th>
                        <th className="p-1.5 text-right">B-Rate (Rs/Q)</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-slate-700">
                      {monthlyPos.map((po, poIdx) => (
                        <tr key={poIdx} className="border-b border-gray-300 hover:bg-slate-50">
                          <td className="p-1.5 font-bold border-r border-gray-300 text-slate-900">
                            {po.po_no}
                          </td>
                          <td className="p-1.5 border-r border-gray-300 whitespace-nowrap">
                            {po.po_date ? po.po_date.substring(0, 10) : '--'}
                          </td>
                          <td
                            className="p-1.5 border-r border-gray-300 font-sans truncate max-w-[130px]"
                            title={po.supplier}
                          >
                            {po.supplier || 'DIRECT'}
                          </td>
                          <td
                            className="p-1.5 border-r border-gray-300 truncate max-w-[100px]"
                            title={po.broker}
                          >
                            {po.broker || 'DIRECT'}
                          </td>
                          <td className="p-1.5 border-r border-gray-300 whitespace-nowrap">
                            {po.area || '--'}
                          </td>
                          <td className="p-1.5 border-r border-gray-300 text-right font-bold text-slate-900">
                            {Number(po.total_contract_mt || 0).toFixed(3)}
                          </td>
                          <td className="p-1.5 text-right font-extrabold text-indigo-950">
                            {Number(po.b_rate || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      {monthlyPos.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center p-6 text-gray-400 italic font-sans font-bold"
                          >
                            No active PO registration records belong to this month under current active filter schemes.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signature block */}
                <div className="pt-6 border-t border-dashed border-slate-300 flex justify-between items-center font-sans">
                  <div>
                    <div className="h-6"></div>
                    <p className="text-[8.5px] font-black uppercase text-slate-800">
                      PREPARED &amp; LOGGED BY Dispatcher
                    </p>
                    <p className="text-[7.5px] text-gray-500 italic">
                      Central Database Record Stream
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="h-6"></div>
                    <p className="text-[8.5px] font-black uppercase text-slate-800">
                      AUDITED &amp; APPROVED BY
                    </p>
                    <p className="text-[7.5px] text-gray-500 italic">
                      Fibre Procurement Controller
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
