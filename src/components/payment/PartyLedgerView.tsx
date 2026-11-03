import React, { useMemo } from 'react';
import { BookOpen, Printer, ArrowLeft, Clock, FileText } from 'lucide-react';
import { PaymentMaster } from '../../types/payment.types';
import { cn, formatIndianCurrency, formatIndianCompactCurrency } from '../../lib/utils';
import { PaginationControls } from '../PaginationControls';

export interface PartyLedgerViewProps {
  paymentList: PaymentMaster[];
  verifiedArrivals: any[];
  selectedLedgerParty: string;
  setSelectedLedgerParty: (party: string) => void;
  ledgerCurrentPage: number;
  setLedgerCurrentPage: (p: number) => void;
  ledgerPageSize: number;
  setLedgerPageSize: (ps: number) => void;
  onExportPartyLedgerPdf: () => void;
  onBack: () => void;
}

export function PartyLedgerView({
  paymentList,
  verifiedArrivals,
  selectedLedgerParty,
  setSelectedLedgerParty,
  ledgerCurrentPage,
  setLedgerCurrentPage,
  ledgerPageSize,
  setLedgerPageSize,
  onExportPartyLedgerPdf,
  onBack
}: PartyLedgerViewProps) {
  const partyList = useMemo(() => {
    return Array.from(
      new Set(
        paymentList
          .map(p => p.party_name || p.supplier)
          .concat(verifiedArrivals.map(a => a.supplier || a.party_name))
          .filter(Boolean)
      )
    ).sort();
  }, [paymentList, verifiedArrivals]);

  const partyLedgerRecords = useMemo(() => {
    return paymentList.filter(p => {
      if (!selectedLedgerParty) return true;
      const pName = (p.party_name || p.supplier || '').toLowerCase().trim();
      return pName === selectedLedgerParty.toLowerCase().trim();
    });
  }, [paymentList, selectedLedgerParty]);

  const partyTotalPayable = useMemo(() => {
    return partyLedgerRecords.reduce((sum, p) => sum + Number(p.payable_amt || p.total_amount || 0), 0);
  }, [partyLedgerRecords]);

  const partyTotalPaid = useMemo(() => {
    return partyLedgerRecords.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
  }, [partyLedgerRecords]);

  const partyTotalPending = partyTotalPayable - partyTotalPaid;

  return (
    <div className="space-y-4">
      {/* Party Ledger Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 sm:min-w-[260px] w-full sm:w-auto">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label htmlFor="select_party_supplier_ledger" className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
              Select Party / Supplier Ledger Account
            </label>
            <select
              id="select_party_supplier_ledger"
              name="select_party_supplier_ledger"
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
            onClick={onExportPartyLedgerPdf}
            className="px-3 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Export Ledger Statement (PDF)
          </button>
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
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

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm" title={`Exact: ${formatIndianCurrency(partyTotalPayable)}`}>
          <p className="text-[10px] font-bold uppercase text-slate-500">Total Invoice / Payable Value</p>
          <h4 className="text-base font-black text-slate-800 mt-0.5 cursor-default">
            {formatIndianCompactCurrency(partyTotalPayable)}
          </h4>
          <p className="text-[9px] text-slate-400 mt-1">Gross Contract Bill Value</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm" title={`Exact: ${formatIndianCurrency(partyTotalPaid)}`}>
          <p className="text-[10px] font-bold uppercase text-slate-500">Total Amount Paid</p>
          <h4 className="text-base font-black text-emerald-700 mt-0.5 cursor-default">
            {formatIndianCompactCurrency(partyTotalPaid)}
          </h4>
          <p className="text-[9px] text-emerald-600 font-semibold mt-1">Total Cleared Disbursed</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 rounded-xl border border-amber-300 shadow-sm" title={`Exact: ${formatIndianCurrency(partyTotalPending)}`}>
          <p className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Net Pending / Retention Balance
          </p>
          <h4 className="text-base font-black text-amber-900 mt-0.5 cursor-default">
            {formatIndianCompactCurrency(partyTotalPending)}
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
                <th className="p-2.5">Reference P.O / M.R</th>
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
                  const payable = Number(p.payable_amt || p.total_amount || 0);
                  const paid = Number(p.paid_amount || 0);
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
                      <td className="p-2.5 text-slate-600">{p.payment_mode || 'Bank Transfer'}</td>
                      <td className="p-2.5 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                          isAdv ? "bg-green-100 text-green-800 border-green-300" : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {isAdv ? '✓ YES' : 'NO'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-700">
                        {formatIndianCurrency(payable)}
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-emerald-700">
                        {formatIndianCurrency(paid)}
                      </td>
                      <td className="p-2.5 text-right font-black text-amber-800">
                        {formatIndianCurrency(pending)}
                      </td>
                      <td className="p-2.5 text-center">
                        {(() => {
                          const totalVal = Number(p.payable_amt || p.total_amount || 0);
                          const paidVal = Number(p.paid_amount || 0);
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
                    {formatIndianCurrency(partyTotalPayable)}
                  </td>
                  <td className="p-2.5 text-right font-black text-emerald-800">
                    {formatIndianCurrency(partyTotalPaid)}
                  </td>
                  <td className="p-2.5 text-right font-black text-amber-900">
                    {formatIndianCurrency(partyTotalPending)}
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
}
