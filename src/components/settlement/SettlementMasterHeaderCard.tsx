import React from "react";
import { RefreshCcw, Eye, FileSpreadsheet, Scale } from "lucide-react";
import { LegacyFieldset } from "../LegacyLayout";
import SearchableSelect from "../SearchableSelect";
import { SettlementMaster, SettlementDetailColumn } from "../../types/settlement.types";

export interface SettlementMasterHeaderCardProps {
  masterData: SettlementMaster;
  handleMasterChange: (field: keyof SettlementMaster, value: any) => void;
  selectedPoNo: string;
  handlePoNoSelection: (poNo: string, skipValidation?: boolean) => void;
  handleProceedWithMrNo: (mrNo: string, forceSync?: boolean) => Promise<void>;
  poOptions: Array<{ value: string; label: string; details?: string }>;
  faOptionsForSelectedPo: Array<{ value: string; label: string; details?: string }>;
  handleManualRefresh: () => void;
  handleOpenViewSettlement: (mrNo: string) => void;
  handleExportExcelForSelectedPo: () => void;
  loading: boolean;
  paymentValidationInfo: { mrNo: string; poNo: string; paidAmount: number; voucherNo: string; advanceDone?: string } | null;
  detailCols: SettlementDetailColumn[];
  calculateWeightedRatePerMT: (cols: SettlementDetailColumn[]) => number;
}

export const SettlementMasterHeaderCard: React.FC<SettlementMasterHeaderCardProps> = ({
  masterData,
  handleMasterChange,
  selectedPoNo,
  handlePoNoSelection,
  handleProceedWithMrNo,
  poOptions,
  faOptionsForSelectedPo,
  handleManualRefresh,
  handleOpenViewSettlement,
  handleExportExcelForSelectedPo,
  loading,
  paymentValidationInfo,
  detailCols,
  calculateWeightedRatePerMT,
}) => {
  const [focusedWtField, setFocusedWtField] = React.useState<string | null>(null);
  const [rawWtInput, setRawWtInput] = React.useState<string>("");

  const getFormattedWtValue = (field: "challan_weight" | "supplier_net_wt" | "electronic_scale_net") => {
    if (focusedWtField === field) {
      return rawWtInput;
    }
    const num = Number(masterData[field]);
    return num > 0 ? num.toFixed(3) : "";
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Control Center Toolbar */}
      <div className="bg-[#FBCFCB] p-3 border-2 border-white shadow-[2px_2px_0_0_rgba(0,0,0,0.15)] space-y-3">
        <div className="flex items-center gap-4 flex-wrap text-xs">
          {/* PO Number Searchable Dropdown */}
          <div className="flex items-center gap-2 bg-white border border-gray-400 p-1 rounded-sm">
            <span className="font-extrabold text-slate-800 uppercase text-[10px] tracking-tight shrink-0">
              Final P.O:
            </span>
            <div className="w-[260px] sm:w-[320px]">
              <SearchableSelect
                id="selectedpono_ctrl"
                name="selectedpono"
                value={selectedPoNo}
                onChange={(newPo) => handlePoNoSelection(newPo, false)}
                options={poOptions}
                placeholder="-- SEARCH / SELECT FINAL P.O --"
                compact={true}
                inputClassName="font-mono text-xs font-bold text-blue-800 bg-white border-0 py-0.5"
              />
            </div>
          </div>

          {/* MR Searchable Dropdown - Sourced from payment_master (mr_no & po_no) */}
          <div className="flex items-center gap-2 bg-white border border-gray-400 p-1 rounded-sm">
            <span className="font-extrabold text-slate-800 uppercase text-[10px] tracking-tight shrink-0">
              MR:
            </span>
            <div className="w-[220px] sm:w-[280px]">
              <SearchableSelect
                id="masterdata_mr_no_ctrl"
                name="masterdata_mr_no"
                value={masterData.mr_no}
                onChange={(mrVal) => {
                  handleMasterChange("mr_no", mrVal);
                  handleProceedWithMrNo(mrVal);
                }}
                options={faOptionsForSelectedPo}
                placeholder={selectedPoNo ? "-- CHOOSE MR --" : "-- SELECT MR --"}
                compact={true}
                inputClassName="font-mono text-xs font-bold text-rose-800 bg-white border-0 py-0.5"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (masterData.mr_no) {
                handleProceedWithMrNo(masterData.mr_no, true);
              }
            }}
            className="bg-[#FBCFCB] hover:bg-white text-[10px] uppercase font-black px-4 py-2 border border-gray-400 cursor-pointer shadow-xs active:translate-y-px rounded"
          >
            Force Sync MR
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-extrabold uppercase px-3.5 py-2 border border-emerald-500 shadow-sm active:translate-y-px flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 rounded"
            title="Refresh all database records"
          >
            <RefreshCcw className={`h-3.5 w-3.5 text-emerald-200 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>

          {masterData.mr_no && (
            <button
              type="button"
              onClick={() => handleOpenViewSettlement(masterData.mr_no)}
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-[10px] font-extrabold uppercase px-3.5 py-1.5 border border-indigo-500 shadow-sm active:translate-y-px flex items-center gap-1.5 transition-colors cursor-pointer"
              title="View printable settlement statement"
            >
              <Eye className="h-3.5 w-3.5 text-indigo-200" />
              <span>View Statement</span>
            </button>
          )}

          {selectedPoNo && (
            <button
              type="button"
              onClick={handleExportExcelForSelectedPo}
              className="bg-emerald-850 hover:bg-emerald-750 text-white text-[10px] font-extrabold uppercase px-3.5 py-1.5 border border-emerald-600 shadow-sm active:translate-y-px flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-300" />
              <span>Export P.O. to Excel</span>
            </button>
          )}

          {loading && <span className="text-[10px] font-bold text-blue-800 italic animate-pulse">Syncing...</span>}
        </div>
      </div>

      {/* Identity Fields Card */}
      <LegacyFieldset legend="Basic MR Arrival Identity Records (PO Aligned Checkpoint)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-bold p-1">
          {paymentValidationInfo && (
            <div className="col-span-4 bg-emerald-50 border border-emerald-300 text-emerald-900 px-2 py-1.5 text-[10px] font-bold rounded flex items-center justify-between mb-1">
              <span>
                ✓ <strong>Payment Module Validated (`payment_master`)</strong>: MR: {paymentValidationInfo.mrNo} | P.O: {paymentValidationInfo.poNo} | Voucher: {paymentValidationInfo.voucherNo}
                {paymentValidationInfo.advanceDone ? ` | Advance Done: ${paymentValidationInfo.advanceDone}` : ""}
              </span>
              <span className="font-mono bg-emerald-200 px-1.5 py-0.5 rounded text-emerald-950 font-black">
                Paid Amount (On/Ac Adv): ₹{paymentValidationInfo.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex flex-col">
            <label htmlFor="m_r_no_header_card" className="text-gray-500 text-[8px] uppercase font-black text-rose-900">
              MR No (From Payment)
            </label>
            <SearchableSelect
              id="m_r_no_header_card"
              name="m_r_no_from_final_m_r"
              value={masterData.mr_no}
              onChange={(mrVal) => {
                handleMasterChange("mr_no", mrVal);
                handleProceedWithMrNo(mrVal);
              }}
              options={faOptionsForSelectedPo}
              placeholder={selectedPoNo ? "-- Select MR --" : "-- Select MR --"}
              compact={true}
              inputClassName="font-mono font-bold text-rose-800 text-[11px] py-1"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="date_header_card" className="text-gray-500 text-[8px] uppercase">
              Arrival Date
            </label>
            <input
              id="date_header_card"
              name="date"
              aria-label="Arrival Date"
              type="date"
              className="bg-white border border-gray-400 p-1 font-mono text-center"
              value={masterData.arrival_date || masterData.sett_date || ""}
              onChange={(e) => {
                handleMasterChange("arrival_date", e.target.value);
                handleMasterChange("sett_date", e.target.value);
              }}
            />
          </div>

          <div className="flex flex-col col-span-2">
            <label htmlFor="p_o_type_header_card" className="text-gray-500 text-[8px] uppercase">
              P.O. Type
            </label>
            <input
              id="p_o_type_header_card"
              name="p_o_type"
              aria-label="P.O. Type"
              type="text"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 font-sans cursor-not-allowed"
              placeholder="e.g. MILL_PO"
              value={masterData.po_type}
            />
          </div>

          <div className="flex flex-col col-span-2">
            <label htmlFor="broker_name_header_card" className="text-gray-500 text-[8px] uppercase">
              Broker Name
            </label>
            <input
              id="broker_name_header_card"
              name="broker_name"
              aria-label="Broker Name"
              type="text"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 font-sans text-slate-800 cursor-not-allowed"
              value={masterData.broker}
            />
          </div>

          <div className="flex flex-col col-span-2">
            <label htmlFor="supplier_name_header_card" className="text-gray-500 text-[8px] uppercase">
              Supplier Name
            </label>
            <input
              id="supplier_name_header_card"
              name="suppler_name"
              aria-label="Supplier Name"
              type="text"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 font-sans text-slate-800 cursor-not-allowed"
              value={masterData.supplier}
            />
          </div>

          <div className="flex flex-col col-span-2">
            <label htmlFor="chn_supplier_header_card" className="text-gray-500 text-[8px] uppercase">
              Chn..Supplier
            </label>
            <input
              id="chn_supplier_header_card"
              name="chn_supplier"
              aria-label="Chn..Supplier"
              type="text"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 font-sans cursor-not-allowed"
              value={masterData.chn_supplier}
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="p_o_no_header_card" className="text-gray-500 text-[8px] uppercase font-black text-indigo-900">
              P.O. No. (From Final P.O)
            </label>
            <input
              id="p_o_no_header_card"
              name="p_o_no_from_final_p_o"
              aria-label="P.O. No. (From Final P.O)"
              type="text"
              readOnly
              disabled
              placeholder="-- Select Final P.O --"
              className="bg-slate-100 border border-gray-400 p-1 font-mono font-bold text-indigo-900 text-[11px] cursor-not-allowed"
              value={selectedPoNo || masterData.po_no || ""}
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="p_o_date_header_card" className="text-gray-500 text-[8px] uppercase">
              P.O Date
            </label>
            <input
              id="p_o_date_header_card"
              name="p_o_date"
              aria-label="P.O Date"
              type="date"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 font-mono text-center cursor-not-allowed"
              value={masterData.po_date}
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="lorry_number_header_card" className="text-gray-500 text-[8px] uppercase">
              Lorry Number
            </label>
            <input
              id="lorry_number_header_card"
              name="lorry_number"
              aria-label="Lorry Number"
              type="text"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 font-mono uppercase cursor-not-allowed"
              value={masterData.lorry_number}
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="detention_days_header_card" className="text-gray-500 text-[8px] uppercase">
              Detention Days
            </label>
            <input
              id="detention_days_header_card"
              name="detention_days"
              aria-label="Detention Days"
              type="number"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 font-mono text-center cursor-not-allowed"
              value={masterData.detention_days}
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="arrival_no_header_card" className="text-gray-500 text-[8px] uppercase">
              Arrival No.
            </label>
            <input
              id="arrival_no_header_card"
              name="arrival_no"
              aria-label="Arrival No."
              type="text"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 font-mono cursor-not-allowed"
              value={masterData.arrival_no}
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="arrival_date_header_card" className="text-gray-500 text-[8px] uppercase">
              Arrival Date
            </label>
            <input
              id="arrival_date_header_card"
              name="arrival_date"
              aria-label="Arrival Date"
              type="date"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 font-mono text-center cursor-not-allowed"
              value={masterData.arrival_date || masterData.sett_date || ""}
            />
          </div>

          <div className="flex flex-col">
            <div className="group relative flex items-center gap-1">
              <label htmlFor="actual_apmc_fees_header_card" className="text-slate-500 text-[8px] uppercase font-bold">
                Actual APMC Fees (1%)
              </label>
              <span className="text-[7.5px] font-black bg-[#D94B5A] text-white rounded-full w-3 h-3 inline-flex items-center justify-center font-serif cursor-help">i</span>
              <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 w-72 bg-slate-900 text-white p-2.5 text-[8.5px] rounded border border-slate-700 shadow-xl leading-normal font-normal normal-case">
                <p className="text-yellow-300 font-bold">Actual APMC Fees (1%) Formula</p>
                <p className="mt-0.5 text-slate-200 font-mono text-[8px]">1% × (Material Value − Delivery Claim − Deduction Amount − Ded Claim Total − Excess/Short)</p>
                <p className="mt-1 text-slate-400 text-[8px]">Calculated as 1% of the adjusted Material Value after all applicable claims, quality deductions, and weight adjustments (Rounded).</p>
              </div>
            </div>
            <input
              id="actual_apmc_fees_header_card"
              name="actual_apmc_fees"
              aria-label="Actual APMC Fees (1%)"
              type="number"
              step="1"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 text-right font-mono cursor-not-allowed"
              value={masterData.actual_apmc_fees !== undefined && masterData.actual_apmc_fees !== null ? Math.round(Number(masterData.actual_apmc_fees)) : ""}
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="arival_apmc_fees_header_card" className="text-slate-500 text-[8px] uppercase">
              Arival APMC Fees
            </label>
            <input
              id="arival_apmc_fees_header_card"
              name="arival_apmc_fees"
              aria-label="Arival APMC Fees"
              type="number"
              readOnly
              disabled
              className="bg-slate-100 border border-gray-400 p-1 text-right font-mono cursor-not-allowed"
              value={masterData.arival_apmc_fees !== undefined && masterData.arival_apmc_fees !== null ? masterData.arival_apmc_fees : ""}
            />
          </div>

          <div className="flex flex-col col-span-2">
            <label htmlFor="remarks_narration_header_card" className="text-slate-500 text-[8px] uppercase">
              Remarks / Narration
            </label>
            <textarea
              id="remarks_narration_header_card"
              name="remarks_narration"
              aria-label="Remarks / Narration"
              className="bg-white border border-gray-400 p-1 text-xs font-sans h-[35px]"
              value={masterData.remarks}
              onChange={(e) => handleMasterChange("remarks", e.target.value)}
            />
          </div>

          {/* Auto-H.O Settlement layout check checkbox */}
          <div className="flex items-center gap-2 border border-dashed border-gray-400 bg-[#e1dfda] px-2 py-1 col-span-2">
            <input
              name="checkbox"
              aria-label="checkbox"
              type="checkbox"
              id="auto_ho_id_card"
              checked={masterData.auto_ho_settlement}
              onChange={(e) => handleMasterChange("auto_ho_settlement", e.target.checked)}
              className="h-3.5 w-3.5 text-blue-900 border-gray-400"
            />
            <label htmlFor="auto_ho_id_card" className="text-[10px] font-black uppercase text-gray-700 cursor-pointer">
              Auto H.O. Settlement Archival
            </label>
          </div>

          {/* 4 Custom Checklist Weight Fields (Read-Only from Arrival / Inspection) */}
          <div className="flex flex-col">
            <label className="text-blue-900 font-extrabold text-[8px] uppercase">Challan Weight (MT)</label>
            <input
              id="challan_weight_header_card"
              name="challan_weight"
              aria-label="Challan Weight"
              type="text"
              readOnly
              disabled
              placeholder="0.000"
              className="bg-blue-50 border border-blue-300 p-1 font-mono font-bold text-right text-blue-900 cursor-not-allowed"
              value={getFormattedWtValue("challan_weight")}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-teal-900 font-extrabold text-[8px] uppercase">Supplier Net Wt (MT)</label>
            <input
              id="supplier_net_wt_header_card"
              name="supplier_net_wt"
              aria-label="Supplier Net Wt"
              type="text"
              readOnly
              disabled
              placeholder="0.000"
              className="bg-teal-50 border border-teal-300 p-1 font-mono font-bold text-right text-teal-950 cursor-not-allowed"
              value={getFormattedWtValue("supplier_net_wt")}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-purple-900 font-extrabold text-[8px] uppercase">Electronic Scale Net (MT)</label>
            <input
              id="electronic_scale_net_header_card"
              name="electronic_scale_net"
              aria-label="Electronic Scale Net"
              type="text"
              readOnly
              disabled
              placeholder="0.000"
              className="bg-purple-50 border border-purple-300 p-1 font-mono font-bold text-right text-purple-950 cursor-not-allowed"
              value={getFormattedWtValue("electronic_scale_net")}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-rose-900 font-extrabold text-[8px] uppercase">Payment Status</label>
            <select
              id="masterdata_payment_status_header_card"
              name="masterdata_payment_status"
              aria-label="Payment Status"
              className="bg-rose-50 border border-rose-300 p-1 text-xs font-bold text-rose-900"
              value={masterData.payment_status || "Pending"}
              onChange={(e) => handleMasterChange("payment_status", e.target.value)}
            >
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Settled">Settled</option>
            </select>
          </div>
        </div>
      </LegacyFieldset>

      {/* Sub-bar: Wt. / Ded.Wt */}
      <div className="bg-[#bce0bc] border-t border-b border-gray-500 p-1.5 flex items-center justify-between gap-4 text-[10px] font-black">
        <div className="flex items-center gap-2 text-emerald-950">
          <Scale className="h-4 w-4 shrink-0 text-emerald-900" />
          <span>Wt. / Ded.Wt. (M.Ton.):</span>
        </div>
        <div className="flex gap-2">
          <input
            id="wt_ded_wt_1_header_card"
            name="wt_ded_wt_1"
            aria-label="Wt Ded Wt 1"
            type="number"
            readOnly
            disabled
            placeholder="0.000"
            className="w-16 bg-slate-100 border border-gray-400 text-right p-0.5 font-mono text-[10px] cursor-not-allowed"
            value={masterData.wt_ded_wt_1 || ""}
          />
          <input
            id="wt_ded_wt_2_header_card"
            name="wt_ded_wt_2"
            aria-label="Wt Ded Wt 2"
            type="number"
            readOnly
            disabled
            placeholder="0.000"
            className="w-16 bg-slate-100 border border-gray-400 text-right p-0.5 font-mono text-[10px] cursor-not-allowed"
            value={masterData.wt_ded_wt_2 || ""}
          />
          <input
            id="wt_ded_wt_3_header_card"
            name="wt_ded_wt_3"
            aria-label="Wt Ded Wt 3"
            type="number"
            readOnly
            disabled
            placeholder="0.000"
            className="w-16 bg-slate-100 border border-gray-400 text-right p-0.5 font-mono text-[10px] cursor-not-allowed"
            value={masterData.wt_ded_wt_3 || ""}
          />
        </div>

        <div className="h-4 w-px bg-emerald-800" />

        <div className="flex items-center gap-2">
          <span className="text-gray-700">Rate/m.T</span>
          <input
            id="rate_qntl_calc_header_card"
            name="rate_qntl"
            aria-label="Rate per MT"
            type="number"
            step="0.01"
            readOnly
            disabled
            className="w-20 bg-slate-100 border border-gray-400 text-right p-0.5 font-mono text-[10px] font-bold text-slate-900 cursor-not-allowed"
            value={masterData.rate_qntl || calculateWeightedRatePerMT(detailCols) || ""}
          />
        </div>
      </div>
    </div>
  );
};

export default SettlementMasterHeaderCard;
