import React, { useState } from 'react';
import { 
  PaymentDetailColumn, 
  PaymentMaster 
} from '../../types/payment.types';
import { 
  getColSettPct, 
  getColDeduction, 
  getColDeductionResult,
  getColDeductionExplanation, 
  getColSettRate, 
  getColQtyQtl, 
  getColAmount,
  hasDetailColData,
  calculateNetPaidAmountAfterDeductions
} from '../../utils/paymentCalculations';
import { formatIndianCurrency } from '../../lib/utils';
import { getNextLowerGrade, normalizeGrade } from '../../services/sattaRateService';
import { Settings2, ArrowDownRight, CheckCircle2, Info } from 'lucide-react';

export interface PaymentDetailGridProps {
  detailCols: PaymentDetailColumn[];
  setDetailCols: React.Dispatch<React.SetStateAction<PaymentDetailColumn[]>>;
  setMasterData: React.Dispatch<React.SetStateAction<PaymentMaster>>;
  gradeMasterList: any[];
  areaMasterList: any[];
  agencyMasterList: any[];
  activePoItems?: any[];
  sattaDiffsList?: any[];
}

export function PaymentDetailGrid({
  detailCols,
  setDetailCols,
  setMasterData,
  gradeMasterList,
  areaMasterList,
  agencyMasterList,
  activePoItems = [],
  sattaDiffsList = []
}: PaymentDetailGridProps) {
  const [editingColIdx, setEditingColIdx] = useState<number | null>(null);

  // Helper to update column with active context and recalculate master totals
  const updateColumnAndTotals = (newCols: PaymentDetailColumn[]) => {
    // Ensure all columns have linked context
    const enriched = newCols.map(c => ({
      ...c,
      po_items: activePoItems.length > 0 ? activePoItems : c.po_items,
      all_cols: newCols
    }));

    setDetailCols(enriched);

    const newTotal = Math.round(enriched.reduce((sum, c) => sum + getColAmount(c, sattaDiffsList, activePoItems), 0));
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
        };
      });
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
      <div className="p-3 bg-gradient-to-r from-slate-100 via-emerald-50/40 to-slate-100 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
          Details
        </span>
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
              <th className="p-2 w-24 bg-emerald-50/70 text-emerald-900">Premium</th>
              <th className="p-2 w-20 bg-emerald-50/70 text-emerald-800">Sett (%)</th>
              <th className="p-2 min-w-[140px] bg-amber-50/80 text-amber-900 border-l border-amber-200">
                Grade Down
              </th>
              <th className="p-2 w-24 bg-blue-50/70 text-blue-900">Sett Rate</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!detailCols.some(c => hasDetailColData(c)) ? (
              <tr>
                <td colSpan={12} className="p-4 text-center text-slate-400 italic text-xs">
                  No material grade breakdown rows with data. Select a P.O or Inspection record to populate grade details.
                </td>
              </tr>
            ) : detailCols.map((col, idx) => {
              if (!hasDetailColData(col)) return null;

              // Ensure col has linked po_items and all_cols
              const colWithContext = {
                ...col,
                po_items: (col.po_items && col.po_items.length > 0) ? col.po_items : activePoItems,
                all_cols: detailCols
              };

              const settPct = getColSettPct(colWithContext);
              const deductionRes = getColDeductionResult(colWithContext, sattaDiffsList, activePoItems);
              const deduction = deductionRes.deduction;
              const settRate = getColSettRate(colWithContext, sattaDiffsList, activePoItems);
              const qtyQtl = getColQtyQtl(colWithContext);
              const rowAmount = getColAmount(colWithContext, sattaDiffsList, activePoItems);

              const currentGradeNorm = normalizeGrade(col.grade) || 'TD5';
              const defaultNextLower = getNextLowerGrade(currentGradeNorm) || 'TD6';
              const targetLower = col.target_lower_grade || col.lower_grade || defaultNextLower;

              return (
                <React.Fragment key={idx}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 font-bold text-slate-500">{col.col_index}</td>
                    <td className="p-2">
                      <input
                        id={`grade_col_${idx}`}
                        name={`grade_col_${idx}`}
                        aria-label="Grade"
                        type="text"
                        list="grade-options-list"
                        value={col.grade}
                        readOnly
                        placeholder="Grade (e.g. TD5)"
                        className="w-full p-1 border border-slate-200 bg-slate-100 text-slate-700 rounded text-xs font-bold cursor-not-allowed"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        id={`area_col_${idx}`}
                        name={`area_col_${idx}`}
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
                        id={`agency_col_${idx}`}
                        name={`agency_col_${idx}`}
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
                        id={`quantity_col_${idx}`}
                        name={`quantity_col_${idx}`}
                        aria-label="Col quantity"
                        type="number"
                        value={col.quantity || ''}
                        onChange={e => {
                          const updated = [...detailCols];
                          updated[idx].quantity = parseFloat(e.target.value) || 0;
                          updateColumnAndTotals(updated);
                        }}
                        className="w-20 p-1 border rounded text-xs font-mono text-center"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        id={`arr_qty_wt_col_${idx}`}
                        name={`arr_qty_wt_col_${idx}`}
                        aria-label="Col Weight MT"
                        type="number"
                        step="0.001"
                        value={col.arr_qty_wt || ''}
                        onChange={e => {
                          const updated = [...detailCols];
                          const newWt = parseFloat(e.target.value) || 0;
                          updated[idx].arr_qty_wt = newWt;
                          const qQtl = Number((newWt * 10).toFixed(3));
                          updated[idx].quantity_qtl = qQtl;
                          const sRate = getColSettRate(updated[idx], sattaDiffsList, activePoItems);
                          const ded = getColDeduction(updated[idx], sattaDiffsList, activePoItems);
                          updated[idx].deduction_rate = ded;
                          updated[idx].sett_rate = sRate;
                          updated[idx].amount = Number((qQtl * sRate).toFixed(2));
                          updateColumnAndTotals(updated);
                        }}
                        className="w-24 p-1 border rounded text-xs font-mono text-right"
                      />
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5 text-right">
                        {qtyQtl > 0 ? `${qtyQtl} Qtl` : ''}
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        id={`rate_value_col_${idx}`}
                        name={`rate_value_col_${idx}`}
                        aria-label="Col Original Rate"
                        type="number"
                        step="0.01"
                        value={col.rate_value || ''}
                        onChange={e => {
                          const updated = [...detailCols];
                          const newRate = parseFloat(e.target.value) || 0;
                          updated[idx].rate_value = newRate;
                          updated[idx].po_items = activePoItems;
                          updated[idx].all_cols = updated;
                          const ded = getColDeduction(updated[idx], sattaDiffsList, activePoItems);
                          const prem = Number(updated[idx].premium) || 0;
                          const sRate = Math.max(0, Number((newRate + prem - ded).toFixed(2)));
                          const qQtl = getColQtyQtl(updated[idx]);
                          updated[idx].deduction_rate = ded;
                          updated[idx].sett_rate = sRate;
                          updated[idx].quantity_qtl = qQtl;
                          updated[idx].amount = Number((qQtl * sRate).toFixed(2));
                          updateColumnAndTotals(updated);
                        }}
                        className="w-24 p-1 border rounded text-xs font-mono font-bold text-right"
                      />
                    </td>
                    {/* Premium (₹/Qtl) - Populated from Sauda Check Point / PO line items */}
                    <td className="p-2 bg-emerald-50/30">
                      <input
                        id={`premium_col_${idx}`}
                        name={`premium_col_${idx}`}
                        aria-label="Col Premium Rate"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={col.premium !== undefined && col.premium !== null && col.premium !== 0 ? col.premium : ''}
                        onChange={e => {
                          const updated = [...detailCols];
                          const newPrem = parseFloat(e.target.value) || 0;
                          updated[idx].premium = newPrem;
                          updated[idx].po_items = activePoItems;
                          updated[idx].all_cols = updated;
                          const origRate = Number(updated[idx].rate_value) || 0;
                          const ded = getColDeduction(updated[idx], sattaDiffsList, activePoItems);
                          const sRate = Math.max(0, Number((origRate + newPrem - ded).toFixed(2)));
                          const qQtl = getColQtyQtl(updated[idx]);
                          updated[idx].deduction_rate = ded;
                          updated[idx].sett_rate = sRate;
                          updated[idx].quantity_qtl = qQtl;
                          updated[idx].amount = Number((qQtl * sRate).toFixed(2));
                          updateColumnAndTotals(updated);
                        }}
                        title={`Premium (₹/Qtl) from Sauda Check Point: ₹${Number(col.premium || 0).toFixed(2)}`}
                        className="w-24 p-1 border border-emerald-300 rounded text-xs font-mono font-bold text-right bg-white text-emerald-950 focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    {/* Sett (%) - populated from Inspection Details -> Grade Down % -> Claim */}
                    <td className="p-2 bg-emerald-50/30">
                      <div className="flex flex-col">
                        <input
                          id={`sett_pct_col_${idx}`}
                          name={`sett_pct_col_${idx}`}
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
                            updated[idx].po_items = activePoItems;
                            updated[idx].all_cols = updated;
                            const origRate = Number(updated[idx].rate_value) || 0;
                            const prem = Number(updated[idx].premium) || 0;
                            const ded = getColDeduction(updated[idx], sattaDiffsList, activePoItems);
                            const sRate = Math.max(0, Number((origRate + prem - ded).toFixed(2)));
                            const qQtl = getColQtyQtl(updated[idx]);
                            updated[idx].deduction_rate = ded;
                            updated[idx].sett_rate = sRate;
                            updated[idx].quantity_qtl = qQtl;
                            updated[idx].amount = Number((qQtl * sRate).toFixed(2));
                            updateColumnAndTotals(updated);
                          }}
                          placeholder="0"
                          title={`Settlement % (Populated from Inspection Details Grade Down % Claim: ${col.gd_claim || 0}%)`}
                          className="w-16 p-1 border border-emerald-300 rounded text-xs font-bold text-center bg-white text-emerald-950 focus:ring-1 focus:ring-emerald-500"
                        />
                        {col.gd_claim > 0 && (
                          <span className="text-[9px] text-amber-700 font-semibold mt-0.5 text-center" title={`Inspection Details Grade Down % Claim: ${col.gd_claim}%`}>
                            Claim: {col.gd_claim}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Deduction (₹/Qtl) = (Rate of Contracted Grade − Rate of Lower Grade) * Sett % / 100 */}
                    <td className="p-2 bg-amber-50/40 border-l border-amber-200">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingColIdx(editingColIdx === idx ? null : idx)}
                            title="Click to view or override Grade Down rate differential from Sauda Check Point"
                            className="p-0.5 hover:bg-amber-200/80 rounded text-amber-800 transition-colors"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          <div 
                            className="w-24 p-1 rounded text-xs font-mono font-black text-amber-950 bg-amber-100 text-right border border-amber-300 cursor-help"
                            title={deductionRes.explanation || `Deduction = ₹${deduction.toFixed(2)}/Qtl`}
                          >
                            ₹{deduction.toFixed(2)}
                          </div>
                        </div>

                        {/* Breakdown pill showing: TD5 ↓ TD6 @ ₹13,300 (Diff ₹200 × 40%) */}
                        {deduction > 0 && deductionRes.lowerGrade && (
                          <span 
                            className="text-[9px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300 mt-1 whitespace-nowrap flex items-center gap-0.5"
                            title={deductionRes.explanation}
                          >
                            <ArrowDownRight className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                            <span>{deductionRes.lowerGrade} @ ₹{Number(deductionRes.lowerDiff).toFixed(0)}</span>
                            <span className="text-amber-700">(Δ₹{Number(deductionRes.gradeDiff).toFixed(0)} × {deductionRes.settPct}%)</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Sett Rate (₹/Qtl) = Original Rate + Premium - Deduction */}
                    <td className="p-2 bg-blue-50/30">
                      <div 
                        className="w-24 p-1 rounded text-xs font-mono font-bold text-blue-900 bg-blue-100/60 text-right border border-blue-200"
                        title={`Sett Rate = (Rate: ₹${(Number(col.rate_value) || 0).toFixed(2)} + Premium: ₹${(Number(col.premium) || 0).toFixed(2)}) − Deduction: ₹${deduction.toFixed(2)} = ₹${settRate.toFixed(2)}/Qtl`}
                      >
                        ₹{settRate.toFixed(2)}
                      </div>
                    </td>
                    {/* Amount (₹) = Quantity (Qtl) * Sett Rate (₹/Qtl) */}
                    <td className="p-2 text-right">
                      <div 
                        className="font-bold text-slate-800 text-xs font-mono"
                        title={`${qtyQtl.toFixed(2)} Qtl × ₹${settRate.toFixed(2)}/Qtl = ₹${rowAmount.toFixed(2)}`}
                      >
                        {formatIndianCurrency(rowAmount)}
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Grade Down Override / Fine-Tuning Drawer */}
                  {editingColIdx === idx && (
                    <tr className="bg-amber-100/40 border-y border-amber-300">
                      <td colSpan={12} className="p-2.5">
                        <div className="bg-white p-3 rounded-lg border border-amber-300 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <span className="font-extrabold text-amber-950 uppercase text-[10px] tracking-wider block">
                              ⚙️ Grade Down Differential Details — Col {col.col_index} ({col.grade || 'TD5'})
                            </span>
                            <div className="text-[11px] text-slate-700">
                              {deductionRes.explanation || 'Calculated using Sauda Check Point Purchase Order Details Items Table Matrix'}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-0.5">
                                Lower Grade
                              </label>
                              <input
                                type="text"
                                value={col.target_lower_grade || deductionRes.lowerGrade || ''}
                                placeholder={defaultNextLower}
                                onChange={e => {
                                  const updated = [...detailCols];
                                  updated[idx].target_lower_grade = e.target.value.toUpperCase();
                                  updated[idx].po_items = activePoItems;
                                  updated[idx].all_cols = updated;
                                  const ded = getColDeduction(updated[idx], sattaDiffsList, activePoItems);
                                  const origRate = Number(updated[idx].rate_value) || 0;
                                  const prem = Number(updated[idx].premium) || 0;
                                  const sRate = Math.max(0, Number((origRate + prem - ded).toFixed(2)));
                                  const qQtl = getColQtyQtl(updated[idx]);
                                  updated[idx].deduction_rate = ded;
                                  updated[idx].sett_rate = sRate;
                                  updated[idx].quantity_qtl = qQtl;
                                  updated[idx].amount = Number((qQtl * sRate).toFixed(2));
                                  updateColumnAndTotals(updated);
                                }}
                                className="w-20 p-1 border rounded text-xs font-bold text-center bg-slate-50"
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-0.5">
                                Lower Rate (₹/Qtl)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder={deductionRes.lowerDiff > 0 ? String(deductionRes.lowerDiff) : "0.00"}
                                value={col.lower_grade_rate || ''}
                                onChange={e => {
                                  const updated = [...detailCols];
                                  const rVal = parseFloat(e.target.value) || 0;
                                  updated[idx].lower_grade_rate = rVal > 0 ? rVal : undefined;
                                  updated[idx].po_items = activePoItems;
                                  updated[idx].all_cols = updated;
                                  const ded = getColDeduction(updated[idx], sattaDiffsList, activePoItems);
                                  const origRate = Number(updated[idx].rate_value) || 0;
                                  const prem = Number(updated[idx].premium) || 0;
                                  const sRate = Math.max(0, Number((origRate + prem - ded).toFixed(2)));
                                  const qQtl = getColQtyQtl(updated[idx]);
                                  updated[idx].deduction_rate = ded;
                                  updated[idx].sett_rate = sRate;
                                  updated[idx].quantity_qtl = qQtl;
                                  updated[idx].amount = Number((qQtl * sRate).toFixed(2));
                                  updateColumnAndTotals(updated);
                                }}
                                className="w-28 p-1 border rounded text-xs font-mono font-bold text-right bg-slate-50"
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-0.5">
                                Override Deduction (₹/Qtl)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={col.deduction_rate !== undefined ? col.deduction_rate : ''}
                                onChange={e => {
                                  const updated = [...detailCols];
                                  const manualDed = parseFloat(e.target.value) || 0;
                                  updated[idx].deduction_rate = manualDed;
                                  const origRate = Number(updated[idx].rate_value) || 0;
                                  const prem = Number(updated[idx].premium) || 0;
                                  const sRate = Math.max(0, Number((origRate + prem - manualDed).toFixed(2)));
                                  const qQtl = getColQtyQtl(updated[idx]);
                                  updated[idx].sett_rate = sRate;
                                  updated[idx].quantity_qtl = qQtl;
                                  updated[idx].amount = Number((qQtl * sRate).toFixed(2));
                                  updateColumnAndTotals(updated);
                                }}
                                className="w-28 p-1 border border-amber-300 rounded text-xs font-mono font-bold text-right bg-amber-50"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => setEditingColIdx(null)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer mt-3"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
