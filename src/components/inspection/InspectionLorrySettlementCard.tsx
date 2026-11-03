import React from "react";
import { Truck } from "lucide-react";
import { InspectionMaster } from "../../types/inspection.types";
import { formatIndianCurrency } from "../../lib/utils";

interface InspectionLorrySettlementCardProps {
  masterData: InspectionMaster;
  isEditMode: boolean;
  handleMasterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  syncAdvanceFromPaymentOperations: (interactive?: boolean) => void;
  paymentOpsInfo: {
    source?: string;
    voucherNo?: string;
    paidAmount?: number;
    totalBill?: number;
  };
  handleSyncSettlementAmount: () => void;
}

export const InspectionLorrySettlementCard: React.FC<InspectionLorrySettlementCardProps> = ({
  masterData,
  isEditMode,
  handleMasterChange,
  syncAdvanceFromPaymentOperations,
  paymentOpsInfo,
  handleSyncSettlementAmount,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
      <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex items-center gap-2">
        <Truck className="w-4 h-4 text-blue-700" />
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          LORRY & SETTLEMENT DETAILS
        </h2>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
          {/* Left Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="w-36 font-semibold text-slate-700">Lorry Returned <span className="text-red-500">*</span></label>
              <select
                id="lorry_returned_field"
                aria-label="lorry returned"
                name="lorry_returned"
                value={(masterData as any).lorry_returned || 'No'}
                disabled={!isEditMode}
                onChange={handleMasterChange}
                className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium disabled:bg-slate-100"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-36 font-semibold text-slate-700">Unloading Date <span className="text-red-500">*</span></label>
              <input
                id="unloading_date_field"
                aria-label="unloading date"
                type="date"
                name="unloading_date"
                value={masterData.unloading_date || ''}
                disabled={!isEditMode}
                onChange={handleMasterChange}
                className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium disabled:bg-slate-100"
              >
              </input>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <label className="w-36 font-semibold text-slate-700">Advance Amount <span className="text-red-500">*</span></label>
                <div className="relative flex items-center">
                  <span className="absolute left-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    id="advance_amount_field"
                    aria-label="0.00"
                    type="number"
                    step="0.01"
                    name="advance_amount"
                    value={(masterData as any).advance_amount || ''}
                    disabled={!isEditMode}
                    onChange={handleMasterChange}
                    placeholder="0.00"
                    className="w-28 h-8 rounded border border-emerald-300 pl-5 pr-2 font-black text-emerald-950 bg-emerald-50/70 text-right disabled:bg-slate-100"
                  />
                </div>
                <button
                  type="button"
                  disabled={!isEditMode}
                  onClick={() => syncAdvanceFromPaymentOperations(true)}
                  title="Fetch Paid Amount (93.0% of total bill) from Payment Operations"
                  className="px-2 py-1 h-8 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <span>⚡ 93% Paid Amt</span>
                </button>
              </div>
              <span className="font-semibold text-slate-600 shrink-0 text-[11px]">On-Account Advance</span>
              <input
                id="on_account_advance_amount_field"
                aria-label="Enter Amount"
                type="number"
                name="on_account_advance_amount"
                value={(masterData as any).on_account_advance_amount || ''}
                disabled={!isEditMode}
                onChange={handleMasterChange}
                placeholder="Enter Amount"
                className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-semibold text-right disabled:bg-slate-100"
              />
            </div>
            <div className="pl-36 text-[10px] -mt-2 mb-1">
              {paymentOpsInfo?.source === 'payment_master' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300">
                  ✓ From Payment Ops ({paymentOpsInfo.voucherNo || 'Voucher'}): <strong>{formatIndianCurrency(paymentOpsInfo.paidAmount || 0)}</strong>
                  {(paymentOpsInfo.totalBill || 0) > 0 && (
                    <span className="text-emerald-900 font-normal">
                      ({(((paymentOpsInfo.paidAmount || 0) / (paymentOpsInfo.totalBill || 1)) * 100).toFixed(1)}% of bill {formatIndianCurrency(paymentOpsInfo.totalBill || 0)})
                    </span>
                  )}
                </span>
              ) : (paymentOpsInfo?.totalBill || 0) > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  Payment Ops standard: <strong className="text-emerald-800">93% of bill ({formatIndianCurrency(paymentOpsInfo.totalBill || 0)}) [Floor rounded to ₹1,000] = {formatIndianCurrency(paymentOpsInfo.paidAmount || 0)}</strong>
                </span>
              ) : (
                <span className="text-slate-400 italic">
                  Payment Operations &rarr; Paid Amount (93% of total bill rounded down to nearest ₹1,000)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="arrival_remarks_field" className="w-36 font-semibold text-slate-700">Arrival Remarks</label>
              <input
                id="arrival_remarks_field"
                aria-label="Arrival Remarks"
                type="text"
                name="arrival_remarks"
                value={(masterData as any).arrival_remarks || masterData.remarks || ''}
                disabled={!isEditMode}
                onChange={handleMasterChange}
                placeholder="Enter Arrival Remarks"
                className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium disabled:bg-slate-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-36 font-semibold text-slate-700">Consignment No. <span className="text-red-500">*</span></label>
              <input
                id="consignment_no_field"
                aria-label="Consignment Number"
                type="text"
                name="consignment_no"
                value={(masterData as any).consignment_no || ''}
                disabled={!isEditMode}
                onChange={handleMasterChange}
                placeholder="Consignment Number"
                className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium uppercase disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="w-48 font-semibold text-slate-700">Lorry Returned from Other Mill <span className="text-red-500">*</span></label>
              <select
                id="lorry_returned_other_mill_field"
                aria-label="lorry returned other mill"
                name="lorry_returned_other_mill"
                value={(masterData as any).lorry_returned_other_mill || 'No'}
                disabled={!isEditMode}
                onChange={handleMasterChange}
                className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium disabled:bg-slate-100"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-48 font-semibold text-slate-700">M.R. Print Date <span className="text-red-500">*</span></label>
              <input
                id="mr_print_date_field"
                aria-label="mr print date"
                type="date"
                name="mr_print_date"
                value={(masterData as any).mr_print_date || masterData.mr_date || ''}
                disabled={!isEditMode}
                onChange={handleMasterChange}
                className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium disabled:bg-slate-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-48 font-semibold text-slate-700">Sent For Settlement Date <span className="text-red-500">*</span></label>
              <input
                id="sent_settlement_date_field"
                aria-label="sent settlement date"
                type="date"
                name="sent_settlement_date"
                value={(masterData as any).sent_settlement_date || ''}
                disabled={!isEditMode}
                onChange={handleMasterChange}
                className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium disabled:bg-slate-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-48 font-semibold text-slate-700">Settlement Amount <span className="text-red-500">*</span></label>
              <div className="flex-1 relative flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <span className="absolute left-2.5 text-slate-500 font-bold">₹</span>
                  <input
                    id="settlement_amount_field"
                    aria-label="0.00"
                    type="number"
                    name="settlement_amount"
                    value={(masterData as any).settlement_amount || ''}
                    disabled={!isEditMode}
                    onChange={handleMasterChange}
                    placeholder="0.00"
                    className="w-full h-8 rounded border border-slate-300 pl-7 pr-2.5 font-bold text-right disabled:bg-slate-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSyncSettlementAmount}
                  className="px-2.5 h-8 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                  title="Sync Settlement Amount from Settlement Section (Settled Amt)"
                >
                  <span>🔄 Sync</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-48 font-semibold text-slate-700">Arival APMC Fees</label>
              <div className="flex-1 relative flex items-center">
                <span className="absolute left-2.5 text-slate-500 font-bold">₹</span>
                <input
                  id="arival_apmc_fees_field"
                  aria-label="Arival APMC Fees"
                  type="number"
                  step="0.01"
                  name="arival_apmc_fees"
                  value={(masterData as any).arival_apmc_fees || ''}
                  disabled={!isEditMode}
                  onChange={handleMasterChange}
                  placeholder="0.00"
                  className="w-full h-8 rounded border border-slate-300 pl-7 pr-2.5 font-bold text-right bg-amber-50/40 text-amber-900 disabled:bg-slate-100"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-48 font-semibold text-slate-700">Consignment Date <span className="text-red-500">*</span></label>
              <input
                id="consignment_date_field"
                aria-label="consignment date"
                type="date"
                name="consignment_date"
                value={(masterData as any).consignment_date || masterData.arrival_date || ''}
                disabled={!isEditMode}
                onChange={handleMasterChange}
                className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
