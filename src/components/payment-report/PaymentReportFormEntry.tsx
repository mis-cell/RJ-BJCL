import React from 'react';
import { 
  Wallet, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Save, 
  X 
} from 'lucide-react';
import { cn, formatIndianCurrency, calculate93PctPaidAmount } from '../../lib/utils';
import { 
  PaymentMaster, 
  PaymentDetailColumn 
} from '../../types/payment.types';
import { 
  getColWtMt, 
  getColQtyQtl, 
  getColSettPct, 
  getColDeduction, 
  getColDeductionExplanation, 
  getColSettRate, 
  getColAmount,
  hasDetailColData,
  calculateNetPaidAmountAfterDeductions
} from '../../utils/paymentCalculations';
import { SearchablePoSelect } from '../payment/SearchablePoSelect';
import { SearchableMrSelect } from '../payment/SearchableMrSelect';

export interface PaymentReportFormEntryProps {
  isEdit: boolean;
  masterData: PaymentMaster;
  setMasterData: React.Dispatch<React.SetStateAction<PaymentMaster>>;
  selectedPoNo: string;
  setSelectedPoNo: (poNo: string) => void;
  selectedMrNo: string;
  setSelectedMrNo: (mrNo: string) => void;
  eligiblePos: any[];
  purchaseOrders: any[];
  saudaCheckPoints: any[];
  availableArrivals: any[];
  verifiedArrivals: any[];
  paymentList: PaymentMaster[];
  showAllPos: boolean;
  setShowAllPos: (show: boolean) => void;
  selectedPoData: any;
  detailCols: PaymentDetailColumn[];
  setDetailCols: React.Dispatch<React.SetStateAction<PaymentDetailColumn[]>>;
  gradeMasterList: any[];
  areaMasterList: any[];
  agencyMasterList: any[];
  loading: boolean;
  errorMessage: string;
  setErrorMessage: (msg: string) => void;
  handlePoSelection: (poNo: string) => void;
  handleMrSelection: (mrNo: string) => void;
  handleSavePayment: () => void;
  onCancel: () => void;
  isPoEligibleForPaymentLocal: (po: any) => boolean;
  findMatchingPo: (poNo: string, list: any[]) => any;
  handelTnordate: (e: any, masterData: PaymentMaster) => void;
}

export const PaymentReportFormEntry: React.FC<PaymentReportFormEntryProps> = ({
  isEdit,
  masterData,
  setMasterData,
  selectedPoNo,
  setSelectedPoNo,
  selectedMrNo,
  setSelectedMrNo,
  eligiblePos,
  purchaseOrders,
  saudaCheckPoints,
  availableArrivals,
  verifiedArrivals,
  paymentList,
  showAllPos,
  selectedPoData,
  detailCols,
  setDetailCols,
  gradeMasterList,
  areaMasterList,
  agencyMasterList,
  loading,
  errorMessage,
  setErrorMessage,
  handlePoSelection,
  handleMrSelection,
  handleSavePayment,
  onCancel,
  isPoEligibleForPaymentLocal,
  findMatchingPo,
  handelTnordate
}) => {
  const displayPos = showAllPos ? purchaseOrders : eligiblePos;
  const selectedArrival = verifiedArrivals.find(a => (a.mr_no === selectedMrNo || a.final_arrival_no === selectedMrNo));
  const inspectionPoNo = selectedArrival?.po_no || selectedArrival?.mill_po_no || '';
  const matchedFinalPo = inspectionPoNo ? findMatchingPo(inspectionPoNo, purchaseOrders) : null;
  const matchedScpPo = (!matchedFinalPo && inspectionPoNo) ? findMatchingPo(inspectionPoNo, saudaCheckPoints) : null;
  const isPoNotInFinal = Boolean(selectedMrNo && inspectionPoNo && !matchedFinalPo);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-600" />
            {isEdit ? 'Edit Payment Voucher' : 'New Payment Voucher Entry'}
          </h3>
          <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
            Voucher: {masterData.voucher_no}
          </span>
        </div>

        {/* CONTRACT P.O & VERIFIED M.R REFERENCE PANEL */}
        <div className="bg-gradient-to-r from-slate-50 via-purple-50/50 to-indigo-50/50 p-3.5 rounded-xl border border-purple-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-black uppercase text-purple-950 tracking-wide">
                P.O & Linked Verified M.R Reference
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                {eligiblePos.length} Eligible P.O Records (Pending Payment)
              </span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                {availableArrivals.length} Unpaid M.R Records ({verifiedArrivals.length} Total Verified)
              </span>
            </div>
          </div>

          {/* PO and Inspection Selector Logic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* P.O Selector */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-purple-900">
                <label className="flex items-center gap-1.5">
                  <span>P.O</span>
                  {selectedPoNo && <span className="text-purple-700 font-mono font-bold">({selectedPoNo})</span>}
                </label>
                <span className="text-[10px] font-semibold text-purple-700">
                  {eligiblePos.length} Pending Payment
                </span>
              </div>
              <SearchablePoSelect
                selectedPoNo={selectedPoNo}
                onSelectPo={handlePoSelection}
                displayPos={displayPos}
                matchedFinalPo={matchedFinalPo}
                isPoEligibleForPayment={isPoEligibleForPaymentLocal}
                verifiedArrivals={verifiedArrivals}
                paymentList={paymentList}
                currentVoucherNo={isEdit ? masterData.voucher_no : undefined}
              />
            </div>

            {/* Verified M.R & Inspection Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-emerald-900 flex items-center justify-between">
                <span>Inspection</span>
                {selectedMrNo && <span className="text-emerald-700 font-mono font-bold">M.R: {selectedMrNo}</span>}
              </label>
              <SearchableMrSelect
                selectedMrNo={selectedMrNo}
                onSelectMr={handleMrSelection}
                verifiedArrivals={availableArrivals}
                allArrivals={verifiedArrivals}
                selectedPoNo={selectedPoNo}
              />
            </div>
          </div>

          {/* Notice if Inspection P.O is in Check Point and not in P.O list */}
          {isPoNotInFinal && (
            <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-start gap-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-bold flex items-center gap-2">
                  <span>Inspection P.O ({inspectionPoNo}) is NOT in P.O list yet</span>
                  <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                    Status: In Sauda Check Point
                  </span>
                </div>
                <div className="text-[11px] text-amber-800 mt-0.5">
                  {matchedScpPo ? (
                    <span>
                      This P.O is currently located in <strong>Sauda Check Point / Temporary P.O</strong> (Sauda: {matchedScpPo.sauda_no || matchedScpPo.po_no}). Once mismatches are cleared and approved in Sauda Check Point, click <strong>&quot;Pass ✓&quot;</strong> to promote it to P.O.
                    </span>
                  ) : (
                    <span>
                      This P.O has not yet been passed/promoted to <strong>P.O</strong> (purchase_master). You can still proceed with Inspection details, or select an existing P.O using &quot;Show All&quot;.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active PO / MR Summary Linkage Banner */}
          {(selectedPoData || selectedMrNo || masterData.po_no || masterData.mr_no) ? (
            <div className="bg-white/90 p-2.5 rounded-lg border border-purple-200 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-700 shadow-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 text-[11px]">Contract Active Linkage:</span>
                {masterData.po_no && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-mono font-bold rounded border border-purple-300 text-[10px]">
                    P.O: {masterData.po_no}
                  </span>
                )}
                {masterData.mr_no && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-mono font-bold rounded border border-emerald-300 text-[10px]">
                    M.R: {masterData.mr_no}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] flex-wrap">
                <div><span className="text-slate-400">Supplier:</span> <strong className="text-slate-900">{masterData.supplier || masterData.party_name || '-'}</strong></div>
                <div><span className="text-slate-400">Broker:</span> <strong className="text-slate-900">{masterData.broker || '-'}</strong></div>
                <div><span className="text-slate-400">Lorry / Vehicle:</span> <strong className="text-slate-900">{masterData.lorry_number || '-'}</strong></div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/90 p-2 rounded-lg border border-amber-200 text-xs flex items-center gap-2 text-amber-800 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Please select a <strong>P.O</strong> or <strong>Inspection</strong> record. At least one selection is required to save a payment record.</span>
            </div>
          )}
        </div>

        {/* Header Form Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label htmlFor="voucher_no_1963" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Voucher No *</label>
            <input
              id="voucher_no_1963"
              name="voucher_no"
              aria-label="Voucher No *"
              type="text"
              value={masterData.voucher_no}
              onChange={e => setMasterData({ ...masterData, voucher_no: e.target.value })}
              className="w-full p-2 font-mono font-bold border border-slate-300 rounded bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="payment_date_1973" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Payment Date *</label>
            <input
              id="payment_date_1973"
              name="payment_date"
              aria-label="Payment Date *"
              type="date"
              value={masterData.payment_date}
              onChange={e => setMasterData({ ...masterData, payment_date: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label htmlFor="selected_m_r_no_1983" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Selected M.R No</label>
            <input
              id="selected_m_r_no_1983"
              name="selected_m_r_no"
              aria-label="Selected M.R No"
              type="text"
              value={masterData.mr_no || selectedMrNo}
              onChange={e => {
                setMasterData({ ...masterData, mr_no: e.target.value });
                setSelectedMrNo(e.target.value);
              }}
              placeholder="M.R / Arrival No"
              className="w-full p-2 border border-slate-300 rounded bg-emerald-50/40 font-mono font-bold text-slate-800"
            />
          </div>

          <div>
            <label htmlFor="selected_p_o_no_1997" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Selected P.O No</label>
            <input
              id="selected_p_o_no_1997"
              name="selected_p_o_no"
              aria-label="Selected P.O No"
              type="text"
              value={masterData.po_no || selectedPoNo}
              onChange={e => {
                setMasterData({ ...masterData, po_no: e.target.value });
                setSelectedPoNo(e.target.value);
              }}
              placeholder="Purchase Order No"
              className="w-full p-2 border border-slate-300 rounded bg-purple-50/40 font-mono font-bold text-slate-800"
            />
          </div>

          <div>
            <label htmlFor="party_supplier_name_2011" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Party / Supplier Name *</label>
            <input
              id="party_supplier_name_2011"
              name="party_supplier_name"
              aria-label="Party / Supplier Name *"
              type="text"
              value={masterData.party_name || masterData.supplier}
              onChange={e => setMasterData({ ...masterData, party_name: e.target.value, supplier: e.target.value })}
              placeholder="Supplier / Party Name"
              className="w-full p-2 border border-slate-300 rounded font-semibold"
            />
          </div>

          <div>
            <label htmlFor="broker_name_2022" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Broker Name</label>
            <input
              id="broker_name_2022"
              name="broker_name"
              aria-label="Broker Name"
              type="text"
              value={masterData.broker}
              onChange={e => setMasterData({ ...masterData, broker: e.target.value })}
              placeholder="Broker Name"
              className="w-full p-2 border border-slate-300 rounded"
            />
          </div>

          <div>
            <label htmlFor="payment_mode_2033" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Payment Mode</label>
            <select
              id="payment_mode_2033"
              name="payment_mode"
              aria-label="Payment Mode"
              value={(masterData as any).payment_mode || 'Bank Transfer (NEFT/RTGS)'}
              onChange={e => setMasterData({ ...masterData, payment_mode: e.target.value } as any)}
              className="w-full p-2 border border-slate-300 rounded"
            >
              <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Demand Draft">Demand Draft</option>
            </select>
          </div>

          <div>
            <label htmlFor="ref_utr_cheque_no_2048" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Ref / UTR / Cheque No</label>
            <input
              id="ref_utr_cheque_no_2048"
              name="ref_utr_cheque_no"
              aria-label="Ref / UTR / Cheque No"
              type="text"
              value={(masterData as any).reference_no || ''}
              onChange={e => setMasterData({ ...masterData, reference_no: e.target.value } as any)}
              placeholder="Transaction Reference No"
              className="w-full p-2 border border-slate-300 rounded font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-purple-900 mb-1 flex items-center justify-between">
              <span>Advance Payment Done? *</span>
              <span className={cn(
                "text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase",
                (masterData.advance_payment_done || 'Yes') === 'Yes'
                  ? "bg-green-100 text-green-800"
                  : "bg-slate-200 text-slate-700"
              )}>
                {(masterData.advance_payment_done || 'Yes') === 'Yes' ? 'ADVANCE DONE' : 'NO ADVANCE'}
              </span>
            </label>
            <select
              id="masterdata_advance_paymen_2069"
              name="masterdata_advance_paymen"
              aria-label="masterdata advance paymen"
              value={masterData.advance_payment_done || 'Yes'}
              onChange={e => setMasterData({ ...masterData, advance_payment_done: e.target.value })}
              className={cn(
                "w-full p-2 border rounded font-black text-xs transition-colors",
                (masterData.advance_payment_done || 'Yes') === 'Yes'
                  ? "bg-green-50 text-green-950 border-green-400 focus:ring-2 focus:ring-green-500"
                  : "bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-purple-500"
              )}
            >
              <option value="Yes">Yes </option>
              <option value="No">No </option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-purple-900 mb-1 flex items-center justify-between">
              <span>Payment from</span>
            </label>
            <select
              id="masterdata_advance_paymen_from"
              name="masterdata_advance_paymen_from"
              aria-label="masterdata advance paymen"
              value={masterData.advance_payment_from || '1'}
              onChange={e => setMasterData({ ...masterData, advance_payment_from: e.target.value })}
              className="w-full p-2 border rounded font-black text-xs transition-colors"
            >
              <option value="1">From Bank </option>
              <option value="2">RXIL </option>
              <option value="3">TReDS </option>
              <option value="4">Invoice Mart </option>
            </select>
          </div>

          {masterData.advance_payment_from !== '1' && (
            <>
              <div>
                <label htmlFor="payment_settle_date_1973" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Payment Settlement Date *</label>
                <input
                  id="payment_settle_date_1973"
                  name="payment_settle_date"
                  aria-label="Payment settle Date *"
                  type="date"
                  value={masterData.payment_settlementdate || ''}
                  onChange={e => setMasterData({ ...masterData, payment_settlementdate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label htmlFor="tenor_2048" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tenor</label>
                <input
                  id="tenor_2048"
                  name="ref_utr_cheque_no"
                  aria-label="tenor"
                  type="text"
                  value={masterData.tenor || ''}
                  onChange={(e) => handelTnordate(e, masterData)}
                  placeholder="Transaction Reference No"
                  className="w-full p-2 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label htmlFor="repayment_date_1973" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Repayment Date </label>
                <input
                  id="repayment_date_1973"
                  name="repayment_date"
                  aria-label="Repayment Date"
                  type="date"
                  value={masterData.repayment_date || ""}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-purple-500"
                  readOnly={true}
                />
              </div>
            </>
          )}
        </div>

        {/* Financial Amounts & Settlement Panel */}
        <div className="p-3 bg-gradient-to-r from-slate-50 via-purple-50/20 to-amber-50/20 border border-slate-200 rounded-lg space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Payable Net Amount */}
            <div>
              <label htmlFor="payable_net_amount_2222" className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                Payable Net Amount (₹)
              </label>
              <input
                id="payable_net_amount_2222"
                name="payable_net_amount"
                aria-label="Payable Net Amount (₹)"
                type="number"
                step="1"
                value={Math.round(masterData.payable_amt || 0)}
                onChange={e => {
                  const val = Math.round(parseFloat(e.target.value) || 0);
                  const defaultPaid = calculateNetPaidAmountAfterDeductions(
                    val,
                    masterData.summary_delivery_claim,
                    masterData.summary_deduction_amount,
                    masterData.val_ex_short
                  );
                  setMasterData({
                    ...masterData,
                    payable_amt: val,
                    total_amount: val as any,
                    paid_amount: defaultPaid
                  } as any);
                }}
                className="w-full p-2 font-black text-sm border border-slate-300 rounded bg-white text-slate-900 shadow-xs focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[10px] text-slate-500 font-medium">
                Full Invoice Value: {formatIndianCurrency(Math.round(masterData.payable_amt || 0), true, 0)}
              </span>
            </div>

            {/* Paid Amount (= 93% of Payable Net Amount - Delivery Claim (-) - Total Deductions & Penalties - Extra & Short) */}
            <div>
              <label htmlFor="masterdata_paid_amount_2261" className="block text-[10px] font-bold uppercase text-emerald-900 mb-1">
                Paid Amount (₹)
              </label>
              <input
                id="masterdata_paid_amount_2261"
                name="masterdata_paid_amount"
                aria-label="masterdata paid amount"
                type="number"
                step="1"
                value={Math.round((masterData as any).paid_amount || 0)}
                onChange={e => setMasterData({ ...masterData, paid_amount: Math.round(parseFloat(e.target.value) || 0) } as any)}
                className="w-full p-2 font-black text-sm border border-emerald-400 rounded bg-emerald-50/70 text-emerald-950 focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
              <span className="text-[10px] text-emerald-700 font-bold">
                {masterData.payable_amt > 0
                  ? `${formatIndianCurrency(Math.round((masterData as any).paid_amount || 0), true, 0)} (${(((Math.round((masterData as any).paid_amount || 0) / Math.round(masterData.payable_amt)) * 100)).toFixed(1)}% of bill)`
                  : '93% of Payable Net − Delivery Claim − Deductions − Extra & Short'}
              </span>
            </div>

            {/* Pending Balance for Final Settlement */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/80 p-2.5 rounded-lg border border-amber-300 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Pending Amount
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 border border-amber-300">
                  {masterData.payable_amt > 0
                    ? `${(((Math.round(masterData.payable_amt) - Math.round((masterData as any).paid_amount || 0)) / Math.round(masterData.payable_amt)) * 100).toFixed(1)}%`
                    : '0.0%'}
                </span>
              </div>
              <div className="text-base font-black text-amber-950 font-mono my-0.5">
                {formatIndianCurrency(Math.max(0, Math.round(masterData.payable_amt || 0) - Math.round((masterData as any).paid_amount || 0)), true, 0)}
              </div>
            </div>

            {/* Bill / Invoice No */}
            <div>
              <label htmlFor="bill_invoice_no_2299" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Bill / Invoice No</label>
              <input
                id="bill_invoice_no_2299"
                name="bill_invoice_no"
                aria-label="Bill / Invoice No"
                type="text"
                value={masterData.payable_bill_no || ''}
                onChange={e => setMasterData({ ...masterData, payable_bill_no: e.target.value })}
                placeholder="Supplier Bill No"
                className="w-full p-2 border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-purple-500"
              />
              <span className="text-[10px] text-slate-400 font-medium">Invoice Reference</span>
            </div>

            {/* Remarks */}
            <div>
              <label htmlFor="remarks_2312" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Remarks</label>
              <input
                id="remarks_2312"
                name="remarks"
                aria-label="Remarks"
                type="text"
                value={masterData.remarks || ''}
                onChange={e => setMasterData({ ...masterData, remarks: e.target.value })}
                placeholder="Payment Remarks"
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-purple-500"
              />
              <span className="text-[10px] text-slate-400 font-medium">Optional Payment Notes</span>
            </div>
          </div>

          {/* Deductions Breakdown Bar for Paid Amount Calculation */}
          <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-white/90 px-2.5 py-1.5 rounded border border-rose-200 flex items-center justify-between">
              <div>
                <span className="block text-[9px] font-black uppercase text-rose-800">Delivery Claim (-)</span>
                <span className="text-[9px] text-slate-500">Sauda Check Point & Temp Arrival</span>
              </div>
              <span className="font-mono font-black text-xs text-rose-700">
                -{formatIndianCurrency(Number(masterData.summary_delivery_claim) || 0)}
              </span>
            </div>

            <div className="bg-white/90 px-2.5 py-1.5 rounded border border-amber-200 flex items-center justify-between">
              <div>
                <span className="block text-[9px] font-black uppercase text-amber-900">Total Deductions & Penalties</span>
                <span className="text-[9px] text-slate-500">
                  {masterData.summary_deduction_type ? `Mill Inspection (${masterData.summary_deduction_type})` : 'Mill Inspection Section'}
                </span>
              </div>
              <span className="font-mono font-black text-xs text-amber-800">
                -{formatIndianCurrency(Number(masterData.summary_deduction_amount) || 0)}
              </span>
            </div>

            <div className="bg-white/90 px-2.5 py-1.5 rounded border border-orange-200 flex items-center justify-between">
              <div>
                <span className="block text-[9px] font-black uppercase text-orange-900">Extra & Short</span>
                <span className="text-[9px] text-slate-500">Sauda Excess Weight Deduction</span>
              </div>
              <span className="font-mono font-black text-xs text-orange-800">
                -{formatIndianCurrency(Number(masterData.val_ex_short) || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* 4-Column Specification Grid */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-2.5 bg-slate-100 border-b border-slate-200 text-xs font-black uppercase text-slate-800 flex items-center justify-between">
            <span>Details</span>
          </div>
          <div className="p-3 overflow-x-auto">
            <datalist id="grade-options-list">
              {gradeMasterList.map((g, i) => (
                <option key={i} value={g.grade_name}>{g.grade_code ? `${g.grade_code} - ${g.grade_name}` : g.grade_name}</option>
              ))}
            </datalist>
            <datalist id="area-options-list">
              {areaMasterList.map((a, i) => (
                <option key={i} value={a.area_name}>{a.area_code ? `${a.area_code} - ${a.area_name}` : a.area_name}</option>
              ))}
            </datalist>
            <datalist id="agency-options-list">
              {agencyMasterList.map((ag, i) => (
                <option key={i} value={ag.agency_name}>{ag.agency_code ? `${ag.agency_code} - ${ag.agency_name}` : ag.agency_name}</option>
              ))}
            </datalist>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-[10px] uppercase font-bold text-slate-600">
                  <th className="p-2 w-10">Col</th>
                  <th className="p-2">Grade</th>
                  <th className="p-2">Area</th>
                  <th className="p-2">Agency</th>
                  <th className="p-2 w-20">Qty</th>
                  <th className="p-2 w-24">Weight</th>
                  <th className="p-2 w-24">Rate (₹/Qtl)</th>
                  <th className="p-2 w-20 bg-emerald-50/70 text-emerald-800">Sett (%)</th>
                  <th className="p-2 w-24 bg-amber-50/70 text-amber-900">Grade Down</th>
                  <th className="p-2 w-24 bg-blue-50/70 text-blue-900">Sett Rate</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!detailCols.some(c => hasDetailColData(c)) ? (
                  <tr>
                    <td colSpan={11} className="p-4 text-center text-slate-400 italic text-xs">
                      No material grade breakdown rows with data. Select a P.O or Inspection record to populate grade details.
                    </td>
                  </tr>
                ) : detailCols.map((col, idx) => {
                  if (!hasDetailColData(col)) return null;

                  const settPct = getColSettPct(col);
                  const deduction = getColDeduction(col);
                  const settRate = getColSettRate(col);
                  const qtyQtl = getColQtyQtl(col);
                  const rowAmount = getColAmount(col);

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-500">{col.col_index}</td>
                      <td className="p-2">
                        <input
                          id={`rep_grade_col_${idx}`}
                          name={`rep_grade_col_${idx}`}
                          aria-label="Grade"
                          type="text"
                          list="grade-options-list"
                          value={col.grade}
                          readOnly
                          placeholder="Grade (e.g. TD5)"
                          className="w-full p-1 border border-slate-200 bg-slate-100 text-slate-500 rounded text-xs font-semibold cursor-not-allowed"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          id={`rep_area_col_${idx}`}
                          name={`rep_area_col_${idx}`}
                          aria-label="Area"
                          type="text"
                          list="area-options-list"
                          value={col.area}
                          readOnly
                          placeholder="Area (e.g. DAISEE)"
                          className="w-full p-1 border border-slate-200 bg-slate-100 text-slate-500 rounded text-xs font-semibold cursor-not-allowed"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          id={`rep_agency_col_${idx}`}
                          name={`rep_agency_col_${idx}`}
                          aria-label="Agency"
                          type="text"
                          list="agency-options-list"
                          value={col.agency}
                          readOnly
                          placeholder="Agency (e.g. AMBAGAN)"
                          className="w-full p-1 border border-slate-200 bg-slate-100 text-slate-500 rounded text-xs font-semibold cursor-not-allowed"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          id={`rep_quantity_col_${idx}`}
                          name={`rep_quantity_col_${idx}`}
                          aria-label="Col quantity"
                          type="number"
                          value={col.quantity || ''}
                          onChange={e => {
                            const updated = [...detailCols];
                            updated[idx].quantity = parseFloat(e.target.value) || 0;
                            setDetailCols(updated);
                          }}
                          className="w-20 p-1 border rounded text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          id={`rep_arr_qty_wt_col_${idx}`}
                          name={`rep_arr_qty_wt_col_${idx}`}
                          aria-label="Col Weight MT"
                          type="number"
                          step="0.001"
                          value={col.arr_qty_wt || ''}
                          onChange={e => {
                            const updated = [...detailCols];
                            const newWt = parseFloat(e.target.value) || 0;
                            updated[idx].arr_qty_wt = newWt;
                            const qQtl = Number((newWt * 10).toFixed(3));
                            const sRate = getColSettRate(updated[idx]);
                            updated[idx].quantity_qtl = qQtl;
                            updated[idx].sett_rate = sRate;
                            updated[idx].deduction_rate = getColDeduction(updated[idx]);
                            updated[idx].amount = Number((qQtl * sRate).toFixed(2));
                            setDetailCols(updated);
                            const newTotal = Math.round(updated.reduce((sum, c) => sum + getColAmount(c), 0));
                            if (newTotal > 0) {
                              setMasterData(prev => {
                                const newPaid = calculateNetPaidAmountAfterDeductions(
                                  newTotal,
                                  prev.summary_delivery_claim,
                                  prev.summary_deduction_amount,
                                  prev.val_ex_short
                                );
                                return {
                                  ...prev,
                                  total_amount: newTotal,
                                  payable_amt: newTotal,
                                  net_amt: newTotal,
                                  paid_amount: newPaid
                                } as any;
                              });
                            }
                          }}
                          className="w-24 p-1 border rounded text-xs font-mono"
                        />
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                          {qtyQtl > 0 ? `${qtyQtl} Qtl` : ''}
                        </div>
                      </td>
                      <td className="p-2">
                        <input
                          id={`rep_rate_value_col_${idx}`}
                          name={`rep_rate_value_col_${idx}`}
                          aria-label="Col Original Rate"
                          type="number"
                          step="0.01"
                          value={col.rate_value || ''}
                          onChange={e => {
                            const updated = [...detailCols];
                            const newRate = parseFloat(e.target.value) || 0;
                            updated[idx].rate_value = newRate;
                            const ded = getColDeduction(updated[idx]);
                            const sRate = Math.max(0, Number((newRate - ded).toFixed(2)));
                            const qQtl = getColQtyQtl(updated[idx]);
                            updated[idx].deduction_rate = ded;
                            updated[idx].sett_rate = sRate;
                            updated[idx].quantity_qtl = qQtl;
                            updated[idx].amount = Number((qQtl * sRate).toFixed(2));
                            setDetailCols(updated);
                            const newTotal = Math.round(updated.reduce((sum, c) => sum + getColAmount(c), 0));
                            if (newTotal > 0) {
                              setMasterData(prev => {
                                const newPaid = calculateNetPaidAmountAfterDeductions(
                                  newTotal,
                                  prev.summary_delivery_claim,
                                  prev.summary_deduction_amount,
                                  prev.val_ex_short
                                );
                                return {
                                  ...prev,
                                  total_amount: newTotal,
                                  payable_amt: newTotal,
                                  net_amt: newTotal,
                                  paid_amount: newPaid
                                } as any;
                              });
                            }
                          }}
                          className="w-24 p-1 border rounded text-xs font-mono"
                        />
                      </td>
                      {/* Sett (%) */}
                      <td className="p-2 bg-emerald-50/30">
                        <div className="flex flex-col">
                          <input
                            id={`rep_sett_pct_col_${idx}`}
                            name={`rep_sett_pct_col_${idx}`}
                            aria-label="Settlement Percentage"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={col.sett_pct !== undefined && col.sett_pct !== null ? col.sett_pct : ((col.gd_claim > 0 ? col.gd_claim : col.gd_sett) || '')}
                            onChange={e => {
                              const updated = [...detailCols];
                              const newSettPct = parseFloat(e.target.value) || 0;
                              updated[idx].sett_pct = newSettPct;
                              const origRate = Number(updated[idx].rate_value) || 0;
                              const ded = getColDeduction(updated[idx]);
                              const sRate = Math.max(0, Number((origRate - ded).toFixed(2)));
                              const qQtl = getColQtyQtl(updated[idx]);
                              updated[idx].deduction_rate = ded;
                              updated[idx].sett_rate = sRate;
                              updated[idx].quantity_qtl = qQtl;
                              updated[idx].amount = Number((qQtl * sRate).toFixed(2));
                              setDetailCols(updated);
                              const newTotal = Math.round(updated.reduce((sum, c) => sum + getColAmount(c), 0));
                              if (newTotal > 0) {
                                setMasterData(prev => {
                                  const newPaid = calculateNetPaidAmountAfterDeductions(
                                    newTotal,
                                    prev.summary_delivery_claim,
                                    prev.summary_deduction_amount,
                                    prev.val_ex_short
                                  );
                                  return {
                                    ...prev,
                                    total_amount: newTotal,
                                    payable_amt: newTotal,
                                    net_amt: newTotal,
                                    paid_amount: newPaid
                                  } as any;
                                });
                              }
                            }}
                            placeholder="0"
                            title={`Settlement % (Populated from Inspection Details Grade Down % Claim: ${col.gd_claim || 0}%)`}
                            className="w-16 p-1 border border-emerald-300 rounded text-xs font-bold text-center bg-white text-emerald-950 focus:ring-1 focus:ring-emerald-500"
                          />
                          {col.gd_claim > 0 && (
                            <span className="text-[9px] text-amber-700 font-semibold mt-0.5" title={`Inspection Details Grade Down % Claim: ${col.gd_claim}%`}>
                              Claim: {col.gd_claim}%
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Deduction (₹/Qtl) */}
                      <td className="p-2 bg-amber-50/30">
                        <div 
                          className="w-24 p-1 rounded text-xs font-mono font-bold text-amber-900 bg-amber-100/60 text-right border border-amber-200 cursor-help"
                          title={getColDeductionExplanation(col) || `Deduction = ₹${deduction.toFixed(2)}/Qtl`}
                        >
                          ₹{deduction.toFixed(2)}
                        </div>
                      </td>
                      {/* Sett Rate (₹/Qtl) */}
                      <td className="p-2 bg-blue-50/30">
                        <div 
                          className="w-24 p-1 rounded text-xs font-mono font-bold text-blue-900 bg-blue-100/60 text-right border border-blue-200"
                          title={`Sett Rate = ₹${(Number(col.rate_value) || 0).toFixed(2)} − ₹${deduction.toFixed(2)} = ₹${settRate.toFixed(2)}/Qtl`}
                        >
                          ₹{settRate.toFixed(2)}
                        </div>
                      </td>
                      {/* Amount (₹) */}
                      <td className="p-2 text-right">
                        <div 
                          className="font-bold text-slate-800 text-xs font-mono"
                          title={`${qtyQtl.toFixed(2)} Qtl × ₹${settRate.toFixed(2)}/Qtl = ₹${rowAmount.toFixed(2)}`}
                        >
                          {formatIndianCurrency(rowAmount)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inline Error Message */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-800 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="p-1 hover:bg-red-100 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSavePayment}
            disabled={loading}
            className="px-5 py-2 text-xs font-black text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Payment Record'}
          </button>
        </div>
      </div>
    </div>
  );
};
