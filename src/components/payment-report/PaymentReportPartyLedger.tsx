import React from 'react';
import { BookOpen, FileText, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PaginationControls } from '../PaginationControls';
import { PaymentMaster } from '../../types/payment.types';

export interface PaymentReportPartyLedgerProps {
  partyList: string[];
  selectedLedgerParty: string;
  setSelectedLedgerParty: (party: string) => void;
  partyLedgerRecords: PaymentMaster[];
  partyTotalPayable: number;
  partyTotalPaid: number;
  partyTotalPending: number;
  ledgerCurrentPage: number;
  ledgerPageSize: number;
  setLedgerCurrentPage: (page: number) => void;
  setLedgerPageSize: (size: number) => void;
  onBackToDashboard: () => void;
}

export const PaymentReportPartyLedger: React.FC<PaymentReportPartyLedgerProps> = ({
  partyList,
  selectedLedgerParty,
  setSelectedLedgerParty,
  partyLedgerRecords,
  partyTotalPayable,
  partyTotalPaid,
  partyTotalPending,
  ledgerCurrentPage,
  ledgerPageSize,
  setLedgerCurrentPage,
  setLedgerPageSize,
  onBackToDashboard
}) => {
  return (
    <div className="space-y-4">
      {/* Party Ledger Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 sm:min-w-[260px] w-full sm:w-auto">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label htmlFor="select_party_supplier_led_1661" className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
              Select Party / Supplier Ledger Account
            </label>
            <select
              id="select_party_supplier_led_1661"
              name="select_party_supplier_led"
              aria-label="Select Party / Supplier Ledger Account"
              value={selectedLedgerParty}
              onChange={e => setSelectedLedgerParty(e.target.value)}
              className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-slate-50 text-slate-800"
            >
              <option value="">-- All Parties / Consolidated Ledger --</option>
              {partyList.map(party => (
                <option key={party} value={party}>{party}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToDashboard}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        </div>
      </div>

      {/* Party Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-500">Party Selected</p>
          <h4 className="text-sm font-black text-purple-900 truncate mt-0.5">
            {selectedLedgerParty || 'Consolidated (All Parties)'}
          </h4>
          <p className="text-[9px] text-slate-400 mt-1">{partyLedgerRecords.length} Payment Transactions</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-500">Total Invoice / Payable Value</p>
          <h4 className="text-base font-black text-slate-800 mt-0.5">
            ₹ {partyTotalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h4>
          <p className="text-[9px] text-slate-400 mt-1">Gross Contract Bill Value</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-500">Total Amount Paid</p>
          <h4 className="text-base font-black text-emerald-700 mt-0.5">
            ₹ {partyTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h4>
          <p className="text-[9px] text-emerald-600 font-semibold mt-1">Total Cleared Disbursed</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 rounded-xl border border-amber-300 shadow-sm">
          <p className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Net Pending / Retention Balance
          </p>
          <h4 className="text-base font-black text-amber-900 mt-0.5">
            ₹ {partyTotalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h4>
          <p className="text-[9px] text-amber-700 font-bold mt-1">Outstanding Retention Payable</p>
        </div>
      </div>

      {/* Party Itemized Ledger Statement Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-300" />
            <h3 className="text-xs font-black uppercase tracking-wider">
              Itemized Party Ledger Statement — {selectedLedgerParty || 'All Suppliers'}
            </h3>
          </div>
          <span className="text-[10px] text-purple-200 font-semibold">
            Updated Real-Time
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-black text-slate-600">
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Voucher No</th>
                <th className="p-2.5">Party / Supplier</th>
                <th className="p-2.5">M.R No</th>
                <th className="p-2.5">Payment Mode</th>
                <th className="p-2.5 text-center">Advance Done?</th>
                <th className="p-2.5 text-right">Bill / Payable (₹)</th>
                <th className="p-2.5 text-right">Paid Amount (₹)</th>
                <th className="p-2.5 text-right">Pending Balance (₹)</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {partyLedgerRecords.length > 0 ? (
                partyLedgerRecords.slice((ledgerCurrentPage - 1) * ledgerPageSize, ledgerCurrentPage * ledgerPageSize).map((p, idx) => {
                  const payable = Number(p.payable_amt || (p as any).total_amount || 0);
                  const paid = Number((p as any).paid_amount || 0);
                  const pending = payable - paid;
                  const isAdv = (p.advance_payment_done || 'No').toLowerCase() === 'yes';
                  return (
                    <tr key={p.payment_id || p.voucher_no || idx} className="hover:bg-purple-50/30">
                      <td className="p-2.5 font-medium text-slate-600">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="p-2.5 font-bold font-mono text-purple-900">{p.voucher_no}</td>
                      <td className="p-2.5 font-semibold text-slate-800">{p.party_name || p.supplier || '-'}</td>
                      <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                        <div>{p.po_no || '-'}</div>
                        {p.mr_no && <div className="text-[9px] text-slate-400">MR: {p.mr_no}</div>}
                      </td>
                      <td className="p-2.5 text-slate-600">{(p as any).payment_mode || 'Bank Transfer'}</td>
                      <td className="p-2.5 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                          isAdv ? "bg-green-100 text-green-800 border-green-300" : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {isAdv ? '✓ YES' : 'NO'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-700">
                        ₹ {payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-emerald-700">
                        ₹ {paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right font-black text-amber-800">
                        ₹ {pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-center">
                        {(() => {
                          const totalVal = Number(p.payable_amt || (p as any).total_amount || 0);
                          const paidVal = Number((p as any).paid_amount || 0);
                          let statusText = 'Pending';
                          let badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300';

                          if (totalVal > 0 && paidVal >= totalVal - 0.01) {
                            statusText = 'Fully Settled';
                            badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                          } else if (paidVal > 0) {
                            statusText = 'Partially Settled';
                            badgeStyle = 'bg-sky-100 text-sky-800 border-sky-300';
                          } else {
                            statusText = 'Pending';
                            badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300';
                          }

                          return (
                            <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1 shadow-2xs", badgeStyle)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", statusText === 'Fully Settled' ? 'bg-emerald-600' : statusText === 'Partially Settled' ? 'bg-sky-600' : 'bg-amber-600')} />
                              {statusText}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 italic text-xs">
                    No ledger transactions found for the selected party.
                  </td>
                </tr>
              )}
            </tbody>
            {partyLedgerRecords.length > 0 && (
              <tfoot>
                <tr className="bg-purple-50 font-black text-xs text-purple-950 border-t-2 border-purple-200">
                  <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider">
                    Consolidated Ledger Total:
                  </td>
                  <td className="p-2.5 text-right font-black text-slate-900">
                    ₹ {partyTotalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-right font-black text-emerald-800">
                    ₹ {partyTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-right font-black text-amber-900">
                    ₹ {partyTotalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-2">
          <PaginationControls
            currentPage={ledgerCurrentPage}
            totalItems={partyLedgerRecords.length}
            pageSize={ledgerPageSize}
            onPageChange={setLedgerCurrentPage}
            onPageSizeChange={setLedgerPageSize}
          />
        </div>
      </div>
    </div>
  );
};
