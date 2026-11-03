import React from "react";
import { CheckSquare } from "lucide-react";
import { InspectionMaster, InspectionDetailRow, QualityMatrixState } from "../../types/inspection.types";

interface InspectionCommoditySpecsCardProps {
  isEditMode: boolean;
  show3rdAnd4th: boolean;
  setShowAllFourSpecs: (val: boolean) => void;
  detailsList: InspectionDetailRow[];
  handleDetailChange: (index: number, field: string, value: any) => void;
  qualityMatrix: QualityMatrixState;
  updateMatrixVal: (field: keyof QualityMatrixState, colKey: string, type: 'dept' | 'claim' | 'sett', value: any) => void;
  masterData: InspectionMaster;
  setMasterData: React.Dispatch<React.SetStateAction<InspectionMaster>>;
}

export const InspectionCommoditySpecsCard: React.FC<InspectionCommoditySpecsCardProps> = ({
  isEditMode,
  show3rdAnd4th,
  setShowAllFourSpecs,
  detailsList,
  handleDetailChange,
  qualityMatrix,
  updateMatrixVal,
  masterData,
  setMasterData,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
      <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-700" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            INSPECTION DETAILS
          </h2>
        </div>
        {isEditMode && (
          <button
            type="button"
            onClick={() => setShowAllFourSpecs(!show3rdAnd4th)}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
          >
            {show3rdAnd4th ? "- Hide 3rd & 4th Item Specifications" : "+ Show 3rd & 4th Item Specifications"}
          </button>
        )}
      </div>
      <div className="p-5 space-y-6">
        {/* Commodity Spec Blocks (Side-by-Side Cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((idx) => {
            if (idx >= 2 && !show3rdAnd4th) return null;
            const ordinals = ["1st", "2nd", "3rd", "4th"];
            const itemLabel = `${ordinals[idx]} Item Specification`;
            return (
              <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-bold text-blue-900">
                  <span>{itemLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`grade_spec_${idx}`} className="w-16 font-semibold text-slate-600">Grade</label>
                    <input
                      id={`grade_spec_${idx}`}
                      name={`grade_spec_${idx}`}
                      aria-label="Grade"
                      type="text"
                      list="gradesList"
                      value={detailsList[idx]?.arrival_grade || ''}
                      disabled={!isEditMode}
                      onChange={(e) => handleDetailChange(idx, 'arrival_grade', e.target.value)}
                      placeholder="Grade"
                      className="flex-1 h-7 rounded border border-slate-300 px-2 font-bold uppercase disabled:bg-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`area_spec_${idx}`} className="w-16 font-semibold text-slate-600">Area</label>
                    <input
                      id={`area_spec_${idx}`}
                      name={`area_spec_${idx}`}
                      aria-label="Area"
                      type="text"
                      list="areasList"
                      value={detailsList[idx]?.area || ''}
                      disabled={!isEditMode}
                      onChange={(e) => handleDetailChange(idx, 'area', e.target.value)}
                      placeholder="Area"
                      className="flex-1 h-7 rounded border border-slate-300 px-2 uppercase disabled:bg-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`agency_spec_${idx}`} className="w-16 font-semibold text-slate-600">Agency</label>
                    <input
                      id={`agency_spec_${idx}`}
                      name={`agency_spec_${idx}`}
                      aria-label="Agency"
                      type="text"
                      list="agenciesList"
                      value={detailsList[idx]?.agency || ''}
                      disabled={!isEditMode}
                      onChange={(e) => handleDetailChange(idx, 'agency', e.target.value)}
                      placeholder="Agency"
                      className="flex-1 h-7 rounded border border-slate-300 px-2 uppercase disabled:bg-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`marks_spec_${idx}`} className="w-16 font-semibold text-slate-600">Marks</label>
                    <input
                      id={`marks_spec_${idx}`}
                      name={`marks_spec_${idx}`}
                      aria-label="Marks"
                      type="text"
                      list="markasList"
                      value={detailsList[idx]?.marka || ''}
                      disabled={!isEditMode}
                      onChange={(e) => handleDetailChange(idx, 'marka', e.target.value)}
                      placeholder="Marka"
                      className="flex-1 h-7 rounded border border-slate-300 px-2 uppercase disabled:bg-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`crop_yr_spec_${idx}`} className="w-16 font-semibold text-slate-600">Crop Yr.</label>
                    <input
                      id={`crop_yr_spec_${idx}`}
                      name={`crop_yr_spec_${idx}`}
                      aria-label="Crop Yr."
                      type="text"
                      value={detailsList[idx]?.crop_year || '2026-2027'}
                      disabled={!isEditMode}
                      onChange={(e) => handleDetailChange(idx, 'crop_year', e.target.value)}
                      placeholder="2026-2027"
                      className="flex-1 h-7 rounded border border-slate-300 px-2 text-center font-semibold disabled:bg-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`quantity_spec_${idx}`} className="w-16 font-semibold text-slate-600">Quantity</label>
                    <input
                      id={`quantity_spec_${idx}`}
                      name={`quantity_spec_${idx}`}
                      aria-label="Quantity"
                      type="number"
                      value={detailsList[idx]?.quantity || ''}
                      disabled={!isEditMode}
                      onChange={(e) => handleDetailChange(idx, 'quantity', e.target.value)}
                      placeholder="0"
                      className="w-20 h-7 rounded border border-slate-300 px-2 font-bold text-right disabled:bg-slate-100"
                    />
                    <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                      {detailsList[idx]?.unit || 'BALES'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`challan_wt_spec_${idx}`} className="w-28 font-semibold text-slate-600">Challan Gross Wt. MT.</label>
                    <input
                      id={`challan_wt_spec_${idx}`}
                      name={`challan_wt_spec_${idx}`}
                      aria-label="Challan Gross Wt. MT."
                      type="number"
                      step="0.001"
                      value={detailsList[idx]?.challan_gross_wt || ''}
                      disabled={!isEditMode}
                      onChange={(e) => handleDetailChange(idx, 'challan_gross_wt', e.target.value)}
                      placeholder="0.000"
                      className="flex-1 h-7 rounded border border-slate-300 px-2 font-bold text-right text-amber-900 bg-amber-50/30 disabled:bg-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-28 font-semibold text-slate-600">Receipt Gross MT.</label>
                    <input
                      type="number"
                      step="0.001"
                      value={detailsList[idx]?.receipt_gross_wt ?? (detailsList[idx]?.challan_gross_wt || '')}
                      disabled={!isEditMode}
                      onChange={(e) => handleDetailChange(idx, 'receipt_gross_wt', e.target.value)}
                      placeholder="0.000"
                      className="flex-1 h-7 rounded border border-slate-300 px-2 font-bold text-right text-emerald-900 bg-emerald-50/30 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quality Breakdown Matrix Table */}
        <div className="overflow-x-auto border border-blue-200 rounded-lg shadow-sm bg-white">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-[#0e2a4a] text-white font-bold text-center">
              <tr>
                <th rowSpan={2} className="px-3 py-2 border-r border-blue-900 min-w-[140px] text-left">
                  Item
                </th>
                <th colSpan={3} className="px-2 py-1.5 border-r border-blue-900 border-b border-blue-900 bg-blue-950">
                  1st (From Final Arrival)
                </th>
                <th colSpan={3} className="px-2 py-1.5 border-r border-blue-900 border-b border-blue-900 bg-blue-900">
                  2nd (From Final Arrival)
                </th>
                <th colSpan={3} className="px-2 py-1.5 border-r border-blue-900 border-b border-blue-900 bg-blue-950">
                  3rd (From Final Arrival)
                </th>
                <th colSpan={3} className="px-2 py-1.5 border-b border-blue-900 bg-blue-900">
                  4th (From Final Arrival)
                </th>
              </tr>
              <tr className="bg-[#133863] text-[10.5px] uppercase">
                <th className="px-2 py-1 border-r border-blue-800">Dept %</th>
                <th className="px-2 py-1 border-r border-blue-800">Claim %</th>
                <th className="px-2 py-1 border-r border-blue-900">Sett %</th>

                <th className="px-2 py-1 border-r border-blue-800">Dept %</th>
                <th className="px-2 py-1 border-r border-blue-800">Claim %</th>
                <th className="px-2 py-1 border-r border-blue-900">Sett %</th>

                <th className="px-2 py-1 border-r border-blue-800">Dept %</th>
                <th className="px-2 py-1 border-r border-blue-800">Claim %</th>
                <th className="px-2 py-1 border-r border-blue-900">Sett %</th>

                <th className="px-2 py-1 border-r border-blue-800">Dept %</th>
                <th className="px-2 py-1 border-r border-blue-800">Claim %</th>
                <th className="px-2 py-1">Sett %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
              {/* Row 1: Grade Down */}
              <tr className="hover:bg-blue-50/50">
                <td className="px-3 py-1.5 border-r border-slate-200 flex items-center gap-1.5 font-bold text-blue-900">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Grade Down</span>
                </td>
                {['1st', '2nd', '3rd', '4th'].map((col, idx) => (
                  <React.Fragment key={idx}>
                    <td className="p-1 border-r border-slate-200"><input id={`qm_gd_dept_${idx}`} aria-label="Grade Down Dept" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.grade_down?.[col]?.dept ?? detailsList[idx]?.actual_grade_down ?? (idx === 0 ? masterData.actual_grade_down : '')} onChange={(e) => { updateMatrixVal('grade_down', col, 'dept', e.target.value); handleDetailChange(idx, 'actual_grade_down', e.target.value); if(idx===0) setMasterData(m => ({...m, actual_grade_down: Number(e.target.value)})); }} className="w-full h-7 rounded border border-slate-200 text-center font-bold disabled:bg-slate-100" /></td>
                    <td className="p-1 border-r border-slate-200"><input id={`qm_gd_claim_${idx}`} aria-label="Grade Down Claim" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.grade_down?.[col]?.claim ?? detailsList[idx]?.claim_grade_down ?? (idx === 0 ? masterData.claim_grade_down : '')} onChange={(e) => { updateMatrixVal('grade_down', col, 'claim', e.target.value); handleDetailChange(idx, 'claim_grade_down', e.target.value); if(idx===0) setMasterData(m => ({...m, claim_grade_down: Number(e.target.value)})); }} className="w-full h-7 rounded border border-slate-200 text-center font-bold text-amber-700 bg-amber-50/40 disabled:bg-slate-100" /></td>
                    <td className={`p-1 ${idx < 3 ? 'border-r border-slate-300' : ''}`}><input id={`qm_gd_sett_${idx}`} aria-label="Grade Down Sett" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.grade_down?.[col]?.sett || ''} onChange={(e) => updateMatrixVal('grade_down', col, 'sett', e.target.value)} className="w-full h-7 rounded border border-slate-200 text-center font-bold text-emerald-800 disabled:bg-slate-100" /></td>
                  </React.Fragment>
                ))}
              </tr>

              {/* Row 2: Moisture */}
              <tr className="hover:bg-blue-50/50">
                <td className="px-3 py-1.5 border-r border-slate-200 flex items-center gap-1.5 font-bold text-cyan-900">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  <span>Moisture</span>
                </td>
                {['1st', '2nd', '3rd', '4th'].map((col, idx) => (
                  <React.Fragment key={idx}>
                    <td className="p-1 border-r border-slate-200"><input id={`qm_moist_dept_${idx}`} aria-label="Moisture Dept" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.moisture?.[col]?.dept ?? detailsList[idx]?.actual_moisture ?? (idx === 0 ? masterData.actual_moisture : '')} onChange={(e) => { updateMatrixVal('moisture', col, 'dept', e.target.value); handleDetailChange(idx, 'actual_moisture', e.target.value); if(idx===0) setMasterData(m => ({...m, actual_moisture: Number(e.target.value)})); }} className="w-full h-7 rounded border border-slate-200 text-center font-bold disabled:bg-slate-100" /></td>
                    <td className="p-1 border-r border-slate-200"><input id={`qm_moist_claim_${idx}`} aria-label="Moisture Claim" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.moisture?.[col]?.claim ?? detailsList[idx]?.claim_moisture ?? (idx === 0 ? masterData.claim_moisture : '')} onChange={(e) => { updateMatrixVal('moisture', col, 'claim', e.target.value); handleDetailChange(idx, 'claim_moisture', e.target.value); if(idx===0) setMasterData(m => ({...m, claim_moisture: Number(e.target.value)})); }} className="w-full h-7 rounded border border-slate-200 text-center font-bold text-amber-700 bg-amber-50/40 disabled:bg-slate-100" /></td>
                    <td className={`p-1 ${idx < 3 ? 'border-r border-slate-300' : ''}`}><input id={`qm_moist_sett_${idx}`} aria-label="Moisture Sett" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.moisture?.[col]?.sett || ''} onChange={(e) => updateMatrixVal('moisture', col, 'sett', e.target.value)} className="w-full h-7 rounded border border-slate-200 text-center font-bold text-emerald-800 disabled:bg-slate-100" /></td>
                  </React.Fragment>
                ))}
              </tr>

              {/* Row 3: Dust */}
              <tr className="hover:bg-blue-50/50">
                <td className="px-3 py-1.5 border-r border-slate-200 flex items-center gap-1.5 font-bold text-purple-900">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>Dust</span>
                </td>
                {['1st', '2nd', '3rd', '4th'].map((col, idx) => (
                  <React.Fragment key={idx}>
                    <td className="p-1 border-r border-slate-200"><input id={`qm_dust_dept_${idx}`} aria-label="Dust Dept" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.dust?.[col]?.dept ?? detailsList[idx]?.actual_dust ?? (idx === 0 ? masterData.actual_dust : '')} onChange={(e) => { updateMatrixVal('dust', col, 'dept', e.target.value); handleDetailChange(idx, 'actual_dust', e.target.value); if(idx===0) setMasterData(m => ({...m, actual_dust: Number(e.target.value)})); }} className="w-full h-7 rounded border border-slate-200 text-center font-bold disabled:bg-slate-100" /></td>
                    <td className="p-1 border-r border-slate-200"><input id={`qm_dust_claim_${idx}`} aria-label="Dust Claim" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.dust?.[col]?.claim ?? detailsList[idx]?.claim_dust ?? (idx === 0 ? masterData.claim_dust : '')} onChange={(e) => { updateMatrixVal('dust', col, 'claim', e.target.value); handleDetailChange(idx, 'claim_dust', e.target.value); if(idx===0) setMasterData(m => ({...m, claim_dust: Number(e.target.value)})); }} className="w-full h-7 rounded border border-slate-200 text-center font-bold text-amber-700 bg-amber-50/40 disabled:bg-slate-100" /></td>
                    <td className={`p-1 ${idx < 3 ? 'border-r border-slate-300' : ''}`}><input id={`qm_dust_sett_${idx}`} aria-label="Dust Sett" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.dust?.[col]?.sett || ''} onChange={(e) => updateMatrixVal('dust', col, 'sett', e.target.value)} className="w-full h-7 rounded border border-slate-200 text-center font-bold text-emerald-800 disabled:bg-slate-100" /></td>
                  </React.Fragment>
                ))}
              </tr>

              {/* Row 4: NCV % */}
              <tr className="hover:bg-blue-50/50">
                <td className="px-3 py-1.5 border-r border-slate-200 flex items-center gap-1.5 font-bold text-emerald-900">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>NCV %</span>
                </td>
                {['1st', '2nd', '3rd', '4th'].map((col, idx) => (
                  <React.Fragment key={idx}>
                    <td className="p-1 border-r border-slate-200"><input id={`qm_ncv_dept_${idx}`} aria-label="NCV Dept" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.moc?.[col]?.dept ?? detailsList[idx]?.actual_ncv ?? (idx === 0 ? masterData.actual_ncv : '')} onChange={(e) => { updateMatrixVal('moc', col, 'dept', e.target.value); handleDetailChange(idx, 'actual_ncv', e.target.value); if(idx===0) setMasterData(m => ({...m, actual_ncv: Number(e.target.value)})); }} className="w-full h-7 rounded border border-slate-200 text-center font-bold disabled:bg-slate-100" /></td>
                    <td className="p-1 border-r border-slate-200"><input id={`qm_ncv_claim_${idx}`} aria-label="NCV Claim" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.moc?.[col]?.claim ?? detailsList[idx]?.claim_ncv ?? (idx === 0 ? masterData.claim_ncv : '')} onChange={(e) => { updateMatrixVal('moc', col, 'claim', e.target.value); handleDetailChange(idx, 'claim_ncv', e.target.value); if(idx===0) setMasterData(m => ({...m, claim_ncv: Number(e.target.value)})); }} className="w-full h-7 rounded border border-slate-200 text-center font-bold text-amber-700 bg-amber-50/40 disabled:bg-slate-100" /></td>
                    <td className={`p-1 ${idx < 3 ? 'border-r border-slate-300' : ''}`}><input id={`qm_ncv_sett_${idx}`} aria-label="NCV Sett" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.moc?.[col]?.sett || ''} onChange={(e) => updateMatrixVal('moc', col, 'sett', e.target.value)} className="w-full h-7 rounded border border-slate-200 text-center font-bold text-emerald-800 disabled:bg-slate-100" /></td>
                  </React.Fragment>
                ))}
              </tr>

              {/* Row 5: P.O Rate (Qtl) */}
              <tr className="hover:bg-blue-50/50">
                <td className="px-3 py-1.5 border-r border-slate-200 flex items-center gap-1.5 font-bold text-amber-900">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>P.O Rate (Qtl)</span>
                </td>
                {['1st', '2nd', '3rd', '4th'].map((col, idx) => (
                  <React.Fragment key={idx}>
                    <td className="p-1 border-r border-slate-200"><input id={`qm_porate_dept_${idx}`} aria-label="PO Rate Dept" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.po_rate?.[col]?.dept ?? detailsList[idx]?.rate ?? ''} onChange={(e) => { updateMatrixVal('po_rate', col, 'dept', e.target.value); handleDetailChange(idx, 'rate', e.target.value); }} className="w-full h-7 rounded border border-slate-200 text-center font-bold disabled:bg-slate-100" /></td>
                    <td className="p-1 border-r border-slate-200"><input id={`qm_porate_claim_${idx}`} aria-label="PO Rate Claim" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.po_rate?.[col]?.claim || ''} onChange={(e) => updateMatrixVal('po_rate', col, 'claim', e.target.value)} className="w-full h-7 rounded border border-slate-200 text-center font-bold text-amber-700 bg-amber-50/40 disabled:bg-slate-100" /></td>
                    <td className={`p-1 ${idx < 3 ? 'border-r border-slate-300' : ''}`}><input id={`qm_porate_sett_${idx}`} aria-label="PO Rate Sett" type="number" step="0.1" disabled={!isEditMode} value={qualityMatrix.po_rate?.[col]?.sett || ''} onChange={(e) => updateMatrixVal('po_rate', col, 'sett', e.target.value)} className="w-full h-7 rounded border border-slate-200 text-center font-bold text-emerald-800 disabled:bg-slate-100" /></td>
                  </React.Fragment>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Insp. Remarks */}
        <div className="flex items-center gap-3">
          <label htmlFor="insp_remarks_card" className="w-28 font-bold text-slate-700 text-xs">Insp. Remarks</label>
          <input
            id="insp_remarks_card"
            aria-label="Insp. Remarks"
            type="text"
            name="insp_remarks"
            value={(masterData as any).insp_remarks || masterData.remarks || ''}
            disabled={!isEditMode}
            onChange={(e) => setMasterData(m => ({ ...m, insp_remarks: e.target.value, remarks: e.target.value }))}
            placeholder="Enter Inspection Remarks..."
            className="flex-1 h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
          />
        </div>
      </div>
    </div>
  );
};
