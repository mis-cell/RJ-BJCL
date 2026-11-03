import React from "react";
import { ClipboardList, Scale } from "lucide-react";
import { SupabaseAutoCompleteInput } from "./SupabaseAutoCompleteInput";
import { InspectionMaster, InspectionDetailRow, safeRenderText } from "../../types/inspection.types";

interface InspectionBasicInfoCardProps {
  masterData: InspectionMaster;
  isEditMode: boolean;
  handleMasterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setMasterData: React.Dispatch<React.SetStateAction<InspectionMaster>>;
  handleAutoFillFromVoucher: (record: any) => void;
  savedInspections: any[];
  detailsList: InspectionDetailRow[];
  handleDetailChange: (index: number, field: string, value: any) => void;
  totalChallanGrossWt: number;
  totalReceiptGrossWt: number;
  showWeightsBreakdown: boolean;
  setShowWeightsBreakdown: React.Dispatch<React.SetStateAction<boolean>>;
  unitList: string[];
}

export const InspectionBasicInfoCard: React.FC<InspectionBasicInfoCardProps> = ({
  masterData,
  isEditMode,
  handleMasterChange,
  setMasterData,
  handleAutoFillFromVoucher,
  savedInspections,
  detailsList,
  handleDetailChange,
  totalChallanGrossWt,
  totalReceiptGrossWt,
  showWeightsBreakdown,
  setShowWeightsBreakdown,
  unitList,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
      <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-blue-700" />
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          BASIC INFORMATION
        </h2>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-xs">
          {/* Broker * & Date * */}
          <div className="flex items-center gap-2">
            <label className="w-28 font-semibold text-slate-700">Broker <span className="text-red-500">*</span></label>
            <input
              id="broker_name_field"
              aria-label="Broker Name"
              type="text"
              list="brokersList"
              name="broker_name"
              value={masterData.broker_name || ''}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              placeholder="Broker Name"
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-semibold uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 font-semibold text-slate-700">Date <span className="text-red-500">*</span></label>
            <input
              id="mr_date_field"
              aria-label="mr date"
              type="date"
              name="mr_date"
              value={masterData.mr_date || ''}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium focus:border-blue-500 disabled:bg-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 font-semibold text-slate-700">Lorry No. <span className="text-red-500">*</span></label>
            <input
              id="lorry_number_field"
              aria-label="Select Lorry No."
              type="text"
              name="lorry_number"
              value={masterData.lorry_number || ''}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              placeholder="Select Lorry No."
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-semibold uppercase focus:border-blue-500 disabled:bg-slate-100"
            />
          </div>

          {/* Supplier * & Date * */}
          <div className="flex items-center gap-2">
            <label className="w-28 font-semibold text-slate-700">Supplier <span className="text-red-500">*</span></label>
            <input
              id="supplier_name_field"
              aria-label="Supplier Name"
              type="text"
              list="suppliersList"
              name="supplier_name"
              value={masterData.supplier_name || ''}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              placeholder="Supplier Name"
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-semibold uppercase focus:border-blue-500 disabled:bg-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 font-semibold text-slate-700">P.O Date <span className="text-red-500">*</span></label>
            <input
              id="po_date_field"
              aria-label="po date"
              type="date"
              name="po_date"
              value={masterData.po_date || ''}
              readOnly
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none"
              title="P.O. Date is loaded automatically from Sauda Check Point"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 font-semibold text-slate-700">P.O. No.</label>
            <SupabaseAutoCompleteInput
              label="P.O. No."
              name="po_no"
              fieldColumn="po_no"
              value={masterData.po_no}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              onSelectOption={(_val, record) => {
                if (record) handleAutoFillFromVoucher(record);
              }}
              placeholder="P.O. Number"
              savedInspections={savedInspections}
            />
          </div>

          {/* P.O. Remarks & Detention Days */}
          <div className="flex items-center gap-2 lg:col-span-2">
            <label htmlFor="remarks_field" className="w-28 font-semibold text-slate-700">P.O. Remarks</label>
            <input
              id="remarks_field"
              aria-label="P.O. Remarks"
              type="text"
              name="remarks"
              value={masterData.remarks || ''}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              placeholder="Enter P.O. Remarks"
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium focus:border-blue-500 disabled:bg-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="detention_days_field" className="w-24 font-semibold text-slate-700">Detention Days</label>
            <input
              id="detention_days_field"
              aria-label="Detention Days"
              type="number"
              name="detention_days"
              value={masterData.detention_days || ''}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              placeholder="0"
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-bold text-center focus:border-blue-500 disabled:bg-slate-100"
            />
          </div>

          {/* Arrival No. & Date * */}
          <div className="flex items-center gap-2">
            <label className="w-28 font-semibold text-slate-700">Arrival No.</label>
            <SupabaseAutoCompleteInput
              label="Arrival No."
              name="arrival_no"
              fieldColumn="temporary_arrival_no"
              value={masterData.arrival_no}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              onSelectOption={(_val, record) => {
                if (record) handleAutoFillFromVoucher(record);
              }}
              placeholder="Arrival Number"
              savedInspections={savedInspections}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 font-semibold text-slate-700">Date <span className="text-red-500">*</span></label>
            <input
              id="arrival_date_field"
              aria-label="arrival date"
              type="date"
              name="arrival_date"
              value={masterData.arrival_date || ''}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium focus:border-blue-500 disabled:bg-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="mill_po_no_field" className="w-24 font-semibold text-slate-700">Challan Receipt No.</label>
            <input
              id="mill_po_no_field"
              aria-label="Challan Receipt No."
              type="text"
              name="mill_po_no"
              value={masterData.mill_po_no || ''}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              placeholder="Receipt No."
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium disabled:bg-slate-100"
            />
            <button
              type="button"
              onClick={() => setShowWeightsBreakdown(prev => !prev)}
              className={`px-2.5 py-1 ${showWeightsBreakdown ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold text-[10px] rounded shrink-0 transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95`}
              title="Click to toggle Challan Gross Wt. MT. & Receipt Gross breakdown table"
            >
              <Scale className="w-3 h-3" />
              <span>{showWeightsBreakdown ? 'Hide Wt.' : 'Show Wt.'}</span>
            </button>
          </div>

          {/* Date & Way Bill No. */}
          <div className="flex items-center gap-2">
            <label htmlFor="mill_po_date_field" className="w-28 font-semibold text-slate-700">Date</label>
            <input
              id="mill_po_date_field"
              aria-label="Date"
              type="date"
              name="mill_po_date"
              value={masterData.mill_po_date || masterData.arrival_date || ''}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium disabled:bg-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="mr_spcl_print_field" className="w-24 font-semibold text-slate-700">Way Bill No.</label>
            <input
              id="mr_spcl_print_field"
              aria-label="Way Bill No."
              type="text"
              name="mr_spcl_print"
              value={masterData.mr_spcl_print || ''}
              disabled={!isEditMode}
              onChange={handleMasterChange}
              placeholder="Enter Way Bill No."
              className="flex-1 h-8 rounded border border-slate-300 px-2.5 font-medium disabled:bg-slate-100"
            />
          </div>

          {/* Challan Gross Wt. MT. Direct Field & Summation Badge */}
          <div className="flex items-center gap-2 bg-blue-50/80 p-1.5 rounded-lg border border-blue-200">
            <label htmlFor="challan_gross_wt_field" className="w-24 font-black text-blue-950 flex items-center gap-1 text-[11px]">
              <Scale className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>Challan Gross Wt. MT.</span>
            </label>
            <input
              id="challan_gross_wt_field"
              aria-label="Challan Gross Wt. MT."
              type="number"
              step="0.001"
              name="challan_gross_wt"
              value={
                masterData.challan_gross_wt !== undefined && masterData.challan_gross_wt !== null && masterData.challan_gross_wt !== 0
                  ? masterData.challan_gross_wt
                  : totalChallanGrossWt > 0
                  ? Number(totalChallanGrossWt.toFixed(3))
                  : ''
              }
              disabled={!isEditMode}
              onChange={(e) => {
                const v = e.target.value === '' ? 0 : Number(e.target.value);
                setMasterData(prev => ({ ...prev, challan_gross_wt: v }));
              }}
              placeholder="0.000"
              className="flex-1 h-8 rounded border border-blue-300 px-2.5 font-black text-blue-900 bg-white shadow-inner text-right"
            />
            <div className="bg-[#0b2b52] text-amber-300 font-mono font-black text-[11px] px-2 py-1 rounded shadow-sm flex items-center gap-1 shrink-0">
              <span>Sum:</span>
              <span>{totalChallanGrossWt.toFixed(3)} MT</span>
            </div>
          </div>

          {/* Weights Details Table Matrix */}
          {showWeightsBreakdown && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-1 p-3.5 bg-gradient-to-br from-[#0c2340] to-[#07172b] text-white rounded-xl border-2 border-blue-400/80 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2.5 border-b border-blue-500/40">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-emerald-500/20 rounded border border-emerald-400/40">
                    <Scale className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      Weights Breakdown & Summation
                    </span>
                    <p className="text-[10px] text-blue-200">Summation of Challan Gross Wt. MT. & Receipt Gross MT. across all item rows</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="bg-blue-950/90 border border-blue-500/60 px-3 py-1 rounded-lg text-blue-200">
                    Total Challan Gross Wt.: <strong className="text-amber-300 font-black text-sm ml-1">{totalChallanGrossWt.toFixed(3)} MT</strong>
                  </div>
                  <div className="bg-emerald-950/90 border border-emerald-500/60 px-3 py-1 rounded-lg text-emerald-200">
                    Total Receipt Gross: <strong className="text-emerald-300 font-black text-sm ml-1">{totalReceiptGrossWt.toFixed(3)} MT</strong>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-blue-700/60 shadow-inner">
                <table className="w-full text-xs text-left border-collapse bg-[#081b33]">
                  <thead>
                    <tr className="bg-[#10325d] text-white text-[11px] font-black uppercase tracking-wider border-b border-blue-600">
                      <th className="p-2 text-center w-12 border-r border-blue-700">#</th>
                      <th className="p-2 border-r border-blue-700 min-w-[140px]">Grade / Code</th>
                      <th className="p-2 text-center border-r border-blue-700 min-w-[90px]">Unit</th>
                      <th className="p-2 text-right border-r border-blue-700 min-w-[160px] bg-[#143d70] text-amber-300 font-black">
                        Challan Gross Wt. MT.
                      </th>
                      <th className="p-2 text-right min-w-[160px] bg-[#143d70] text-emerald-300 font-black">
                        Receipt Gross MT.
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-900/60 font-semibold text-slate-100">
                    {detailsList.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-900/40 transition-colors">
                        <td className="p-2 text-center font-mono text-blue-300 font-bold border-r border-blue-900/60">{row.srl_no || idx + 1}</td>
                        <td className="p-2 border-r border-blue-900/60">
                          <div className="font-bold text-white uppercase">{row.arrival_grade || row.stock_grade_code || `Item #${idx + 1}`}</div>
                          {row.marka && <div className="text-[10px] text-blue-300">Marka: {row.marka}</div>}
                        </td>
                        <td className="p-1 text-center border-r border-blue-900/60">
                          <select
                            value={row.unit || 'BALES'}
                            disabled={!isEditMode}
                            onChange={(e) => handleDetailChange(idx, 'unit', e.target.value)}
                            className="bg-[#0e2746] text-white border border-blue-600/60 rounded px-2 py-1 text-center font-bold text-xs cursor-pointer focus:ring-1 focus:ring-blue-400"
                          >
                            {Array.from(new Set([...unitList, safeRenderText(row.unit, "BALES")].filter(Boolean))).map((u: any) => {
                              const uStr = safeRenderText(u, "BALES");
                              return <option key={uStr} value={uStr}>{uStr}</option>;
                            })}
                          </select>
                        </td>
                        <td className="p-1 text-right border-r border-blue-900/60 bg-blue-950/40">
                          <input
                            type="number"
                            step="0.001"
                            value={row.challan_gross_wt}
                            disabled={!isEditMode}
                            onChange={(e) => handleDetailChange(idx, 'challan_gross_wt', e.target.value)}
                            placeholder="0"
                            className="w-full bg-[#07182c] border border-amber-500/50 text-amber-300 font-mono font-bold text-right px-2.5 py-1 rounded focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:opacity-60"
                          />
                        </td>
                        <td className="p-1 text-right bg-blue-950/40">
                          <input
                            type="number"
                            step="0.001"
                            value={row.receipt_gross_wt ?? (row.challan_gross_wt || '')}
                            disabled={!isEditMode}
                            onChange={(e) => handleDetailChange(idx, 'receipt_gross_wt', e.target.value)}
                            placeholder="0"
                            className="w-full bg-[#07182c] border border-emerald-500/50 text-emerald-300 font-mono font-bold text-right px-2.5 py-1 rounded focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-60"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#0a1e38] font-bold border-t-2 border-blue-500 text-xs">
                      <td colSpan={3} className="p-2.5 text-right text-blue-200 uppercase tracking-wider font-extrabold">
                        Summation Total (MT):
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-amber-300 text-sm bg-blue-950 border-r border-blue-800">
                        {totalChallanGrossWt.toFixed(3)} MT
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-300 text-sm bg-blue-950">
                        {totalReceiptGrossWt.toFixed(3)} MT
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
