import React, { useState } from "react";
import { Calculator, Settings2 } from "lucide-react";
import { LegacyFieldset } from "../LegacyLayout";
import {
  SettlementDetailColumn,
  SettlementMaster,
  getColWtMt,
  getColAmount,
  getEffectiveColSettRate,
  isSettlementApmcExempt,
} from "../../types/settlement.types";
import { calculateSattaDeduction } from "../../utils/paymentCalculations";

export interface SettlementSpecificationsGridProps {
  detailCols: SettlementDetailColumn[];
  handleColChange: (index: number, field: keyof SettlementDetailColumn, value: any) => void;
  visibleSpecCols: number[];
  visibleDeductionCols: number[];
  showAllSpecCols: boolean;
  setShowAllSpecCols: (val: boolean) => void;
  showAllDeductionCols: boolean;
  setShowAllDeductionCols: (val: boolean) => void;
  masterData: SettlementMaster;
  selectedPoData: any;
  calculateWeightedRatePerMT: (cols: SettlementDetailColumn[]) => number;
  gradeMasterList?: { code: string; name: string }[];
  areaMasterList?: string[];
  agencyMasterList?: string[];
  activePoItems?: any[];
  sattaDiffsList?: any[];
}

export const SettlementSpecificationsGrid: React.FC<SettlementSpecificationsGridProps> = ({
  detailCols,
  handleColChange,
  visibleSpecCols,
  visibleDeductionCols,
  showAllSpecCols,
  setShowAllSpecCols,
  showAllDeductionCols,
  setShowAllDeductionCols,
  masterData,
  selectedPoData,
  calculateWeightedRatePerMT,
  gradeMasterList = [],
  areaMasterList = [],
  agencyMasterList = [],
  activePoItems = [],
  sattaDiffsList = [],
}) => {
  const [expandedColIndex, setExpandedColIndex] = useState<number | null>(null);

  const visibleRows = detailCols.filter((c) => visibleSpecCols.includes(c.col_index));

  return (
    <div className="space-y-3">
      {/* Grid 1: Details Table matching Payment Operations -> Details */}
      <LegacyFieldset legend="Details">
        <div className="flex items-center justify-between pb-1.5 px-1">
          <span className="text-[9.5px] text-gray-600 font-bold uppercase tracking-wider">
            Material Specification &amp; Settlement Details{" "}
            {visibleSpecCols.length < 4 ? `(${visibleSpecCols.length} Active with Arr. Wt)` : ""}
          </span>
          <button
            type="button"
            onClick={() => setShowAllSpecCols(!showAllSpecCols)}
            className="text-[9px] px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold cursor-pointer transition-colors shadow-2xs"
          >
            {showAllSpecCols ? "Hide Unarrived Columns" : "Show All 4 Columns"}
          </button>
        </div>

        <div className="bg-white border border-gray-400 shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-[10px]">
            <thead>
              <tr className="bg-[#e4dfd8] border-b border-gray-400 text-center font-black uppercase text-gray-800">
                <th className="p-1.5 border-r border-gray-300 w-10">Col</th>
                <th className="p-1.5 border-r border-gray-300 w-24">Grade</th>
                <th className="p-1.5 border-r border-gray-300 w-24">Area</th>
                <th className="p-1.5 border-r border-gray-300 w-24">Agency</th>
                <th className="p-1.5 border-r border-gray-300 w-16">Qty</th>
                <th className="p-1.5 border-r border-gray-300 w-20">Weight</th>
                <th className="p-1.5 border-r border-gray-300 w-20">Rate (₹/Qtl)</th>
                <th className="p-1.5 border-r border-gray-300 w-16">Premium</th>
                <th className="p-1.5 border-r border-gray-300 w-20 text-blue-900 bg-blue-50/40">Sett (%)</th>
                <th className="p-1.5 border-r border-gray-300 w-24 text-rose-800 bg-rose-50/30">Grade Down</th>
                <th className="p-1.5 border-r border-gray-300 w-20 text-indigo-900 bg-indigo-50/30">Sett Rate</th>
                <th className="p-1.5 w-24 text-emerald-900 bg-emerald-50/30">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 font-bold text-center">
              {visibleRows.map((col) => {
                const colIdx = col.col_index;
                const wtMt = getColWtMt(col);
                const qtyQtl = Number(col.quantity_qtl) > 0 ? Number(col.quantity_qtl) : wtMt * 10;
                const rateVal = Number(col.rate_value) || 0;
                const premVal = Number(col.premium) || 0;
                const settPctVal =
                  col.sett_pct !== undefined && col.sett_pct !== null && !isNaN(Number(col.sett_pct))
                    ? Number(col.sett_pct)
                    : Number(col.gd_sett) > 0
                    ? Number(col.gd_sett)
                    : Number(col.gd_claim) || 0;

                const calcObj = calculateSattaDeduction(
                  {
                    ...col,
                    rate_value: rateVal,
                    sett_pct: settPctVal,
                    lower_grade: col.lower_grade || col.target_lower_grade,
                    lower_grade_rate: col.lower_grade_rate,
                    all_cols: detailCols,
                    po_items: activePoItems.length > 0 ? activePoItems : col.po_items
                  },
                  sattaDiffsList
                );

                const dedVal =
                  col.deduction_rate !== undefined && col.deduction_rate !== null && !isNaN(Number(col.deduction_rate))
                    ? Number(col.deduction_rate)
                    : calcObj.deduction;

                const settRateVal =
                  col.sett_rate !== undefined && col.sett_rate !== null && Number(col.sett_rate) > 0
                    ? Number(col.sett_rate)
                    : getEffectiveColSettRate({ ...col, deduction_rate: dedVal, sett_pct: settPctVal });

                const amtVal =
                  col.amount !== undefined && col.amount !== null && Number(col.amount) > 0
                    ? Number(col.amount)
                    : getColAmount({ ...col, deduction_rate: dedVal, sett_rate: settRateVal, sett_pct: settPctVal });

                return (
                  <tr key={colIdx} className="hover:bg-slate-50 transition-colors">
                    {/* Col */}
                    <td className="p-1 border-r border-gray-200 bg-slate-100 font-black text-gray-600">
                      Col {colIdx}
                    </td>

                    {/* Grade */}
                    <td className="p-0.5 border-r border-gray-200">
                      {gradeMasterList.length > 0 ? (
                        <select
                          aria-label={`Grade Col ${colIdx}`}
                          disabled
                          className="w-full p-1 bg-transparent text-center font-black outline-none cursor-not-allowed appearance-none"
                          value={col.grade || ""}
                          onChange={(e) => handleColChange(colIdx, "grade", e.target.value)}
                        >
                          <option value="">-- Select --</option>
                          {col.grade &&
                            !gradeMasterList.some(
                              (g) => g.name === col.grade || g.code === col.grade
                            ) && <option value={col.grade}>{col.grade}</option>}
                          {gradeMasterList.map((g, i) => (
                            <option key={i} value={g.name}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`grade_name_col_${colIdx}`}
                          name={`grade_name_col_${colIdx}`}
                          aria-label={`Grade Name Col ${colIdx}`}
                          type="text"
                          readOnly
                          disabled
                          className="w-full bg-transparent p-1 outline-none text-center font-black text-slate-800 cursor-not-allowed"
                          placeholder="Grade"
                          value={col.grade || ""}
                          onChange={(e) => handleColChange(colIdx, "grade", e.target.value)}
                        />
                      )}
                    </td>

                    {/* Area */}
                    <td className="p-0.5 border-r border-gray-200">
                      {areaMasterList.length > 0 ? (
                        <select
                          aria-label={`Area Col ${colIdx}`}
                          disabled
                          className="w-full p-1 bg-transparent text-center outline-none cursor-not-allowed appearance-none"
                          value={col.area || ""}
                          onChange={(e) => handleColChange(colIdx, "area", e.target.value)}
                        >
                          <option value="">-- Select --</option>
                          {col.area && !areaMasterList.includes(col.area) && (
                            <option value={col.area}>{col.area}</option>
                          )}
                          {areaMasterList.map((a, i) => (
                            <option key={i} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`area_col_${colIdx}`}
                          name={`area_col_${colIdx}`}
                          aria-label={`Area Col ${colIdx}`}
                          type="text"
                          readOnly
                          disabled
                          className="w-full bg-transparent p-1 outline-none text-center cursor-not-allowed"
                          placeholder="Area"
                          value={col.area || ""}
                          onChange={(e) => handleColChange(colIdx, "area", e.target.value)}
                        />
                      )}
                    </td>

                    {/* Agency */}
                    <td className="p-0.5 border-r border-gray-200">
                      {agencyMasterList.length > 0 ? (
                        <select
                          aria-label={`Agency Col ${colIdx}`}
                          disabled
                          className="w-full p-1 bg-transparent text-center outline-none cursor-not-allowed appearance-none"
                          value={col.agency || ""}
                          onChange={(e) => handleColChange(colIdx, "agency", e.target.value)}
                        >
                          <option value="">-- Select --</option>
                          {col.agency && !agencyMasterList.includes(col.agency) && (
                            <option value={col.agency}>{col.agency}</option>
                          )}
                          {agencyMasterList.map((ag, i) => (
                            <option key={i} value={ag}>
                              {ag}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`agency_col_${colIdx}`}
                          name={`agency_col_${colIdx}`}
                          aria-label={`Agency Col ${colIdx}`}
                          type="text"
                          readOnly
                          disabled
                          className="w-full bg-transparent p-1 outline-none text-center cursor-not-allowed"
                          placeholder="Agency"
                          value={col.agency || ""}
                          onChange={(e) => handleColChange(colIdx, "agency", e.target.value)}
                        />
                      )}
                    </td>

                    {/* Qty */}
                    <td className="p-0.5 border-r border-gray-200">
                      <input
                        id={`quantity_col_${colIdx}`}
                        name={`quantity_col_${colIdx}`}
                        aria-label={`Quantity Col ${colIdx}`}
                        type="number"
                        readOnly
                        disabled
                        className="w-full p-1 bg-transparent text-center font-mono outline-none cursor-not-allowed"
                        value={col.quantity || ""}
                        onChange={(e) =>
                          handleColChange(colIdx, "quantity", parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>

                    {/* Weight */}
                    <td className="p-0.5 border-r border-gray-200">
                      <div className="flex flex-col items-center">
                        <input
                          id={`arr_qty_wt_col_${colIdx}`}
                          name={`arr_qty_wt_col_${colIdx}`}
                          aria-label={`Weight Col ${colIdx}`}
                          type="number"
                          step="0.001"
                          readOnly
                          disabled
                          className="w-full p-0.5 bg-transparent text-center font-mono font-black outline-none cursor-not-allowed"
                          value={col.arr_qty_wt || ""}
                          onChange={(e) =>
                            handleColChange(colIdx, "arr_qty_wt", parseFloat(e.target.value) || 0)
                          }
                        />
                        {qtyQtl > 0 && (
                          <span className="text-[8px] font-mono text-gray-500 bg-gray-100 px-1 rounded">
                            {qtyQtl.toFixed(2)} Qtl
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rate (₹/Qtl) */}
                    <td className="p-0.5 border-r border-gray-200">
                      <input
                        id={`recon_rate_${colIdx}`}
                        name={`recon_rate_${colIdx}`}
                        aria-label={`Rate Col ${colIdx}`}
                        type="number"
                        readOnly
                        disabled
                        className="w-full p-1 bg-transparent text-center font-mono text-blue-900 font-black outline-none cursor-not-allowed"
                        value={col.rate_value || ""}
                        onChange={(e) =>
                          handleColChange(colIdx, "rate_value", parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>

                    {/* Premium (₹/Qtl) */}
                    <td className="p-0.5 border-r border-gray-200 bg-amber-50/20">
                      <input
                        id={`premium_col_${colIdx}`}
                        name={`premium_col_${colIdx}`}
                        aria-label={`Premium Col ${colIdx}`}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        readOnly
                        disabled
                        className="w-full p-1 bg-transparent text-center font-mono text-amber-900 font-black outline-none cursor-not-allowed"
                        value={Number(col.premium) > 0 ? col.premium : ""}
                        onChange={(e) =>
                          handleColChange(colIdx, "premium", parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>

                    {/* Sett (%) */}
                    <td className="p-0.5 border-r border-gray-200 bg-blue-50/20">
                      <div className="flex flex-col items-center">
                        <input
                          id={`sett_pct_col_${colIdx}`}
                          name={`sett_pct_col_${colIdx}`}
                          aria-label={`Sett Pct Col ${colIdx}`}
                          type="number"
                          step="0.1"
                          placeholder="0%"
                          readOnly
                          disabled
                          className="w-full p-0.5 bg-transparent text-center font-mono text-blue-900 font-black outline-none cursor-not-allowed"
                          value={settPctVal || ""}
                          onChange={(e) =>
                            handleColChange(colIdx, "sett_pct", parseFloat(e.target.value) || 0)
                          }
                        />
                        {Number(col.gd_claim) > 0 && (
                          <span
                            className="text-[7.5px] font-mono text-slate-500 bg-slate-100 px-1 rounded leading-tight"
                            title="Inspection Claim %"
                          >
                            Claim: {col.gd_claim}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Grade Down */}
                    <td className="p-1 border-r border-gray-200 bg-rose-50/15">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center justify-center gap-1 w-full">
                          <input
                            id={`deduction_rate_col_${colIdx}`}
                            name={`deduction_rate_col_${colIdx}`}
                            aria-label={`Grade Down Col ${colIdx}`}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            readOnly
                            disabled
                            className="w-16 p-0.5 bg-slate-50 border border-rose-200 rounded text-center font-mono text-rose-700 font-black outline-none cursor-not-allowed text-[10px]"
                            value={dedVal || ""}
                            onChange={(e) =>
                              handleColChange(
                                colIdx,
                                "deduction_rate",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>

                        {settPctVal > 0 && calcObj.targetGradeName && (
                          <div className="text-[8px] font-mono text-rose-800 bg-rose-100/70 px-1 py-0.5 rounded leading-tight text-center w-full">
                            ↘ {calcObj.targetGradeName} @ ₹{calcObj.lowerRate} (Δ₹{calcObj.diff} ×{" "}
                            {settPctVal}%)
                          </div>
                        )}

                        {expandedColIndex === colIdx && (
                          <div className="mt-1 p-1.5 bg-white border border-rose-300 rounded shadow-sm w-full text-left space-y-1 z-10">
                            <div className="text-[8px] font-black uppercase text-rose-900 border-b border-rose-100 pb-0.5">
                              Lower Grade Override
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[7.5px] text-gray-500 uppercase font-bold">
                                Lower Grade:
                              </label>
                              <select
                                aria-label="Lower Grade Override"
                                className="w-full p-0.5 text-[9px] border border-gray-300 rounded bg-slate-50 font-bold"
                                value={col.lower_grade || calcObj.targetGradeName || ""}
                                onChange={(e) =>
                                  handleColChange(colIdx, "lower_grade", e.target.value)
                                }
                              >
                                <option value="">Auto ({calcObj.targetGradeName || "Next"})</option>
                                {gradeMasterList.map((g, idx) => (
                                  <option key={idx} value={g.name}>
                                    {g.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[7.5px] text-gray-500 uppercase font-bold">
                                Lower Rate (₹/Qtl):
                              </label>
                              <input
                                aria-label="Lower Grade Rate Override"
                                type="number"
                                className="w-full p-0.5 text-[9px] border border-gray-300 rounded font-mono font-bold text-center"
                                placeholder={String(calcObj.lowerRate || 0)}
                                value={col.lower_grade_rate ?? calcObj.lowerRate ?? ""}
                                onChange={(e) =>
                                  handleColChange(
                                    colIdx,
                                    "lower_grade_rate",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Sett Rate */}
                    <td className="p-1 border-r border-gray-200 font-mono text-indigo-900 bg-indigo-50/20 font-black">
                      ₹{settRateVal.toFixed(2)}
                    </td>

                    {/* Amount */}
                    <td className="p-1 font-mono text-emerald-900 bg-emerald-50/20 font-black">
                      ₹
                      {amtVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </LegacyFieldset>

      {/* Recon Rate, Rate / m.T & Actual APMC Fees Clean Summary Card */}
      {(() => {
        const activeColsForCalc = visibleSpecCols;
        const grandTotal = activeColsForCalc.reduce((sum, idx) => sum + getColAmount(detailCols[idx - 1]), 0);
        const isExemptArea = isSettlementApmcExempt(detailCols, selectedPoData);
        const apmc1Pct = isExemptArea ? 0 : grandTotal * 0.01;
        const weightedRateMt = calculateWeightedRatePerMT(detailCols);
        const totalWtMt = activeColsForCalc.reduce((sum, idx) => sum + getColWtMt(detailCols[idx - 1]), 0);

        return (
          <div className="mt-2 bg-[#f8fafc] border border-indigo-200 rounded p-2.5 shadow-sm text-slate-800">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5 mb-2">
              <div className="flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-indigo-700" />
                <h4 className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-950">
                  Calculation Breakdown Summary
                </h4>
              </div>
              <span className="text-[8.5px] text-indigo-900 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Rate / m.T = Total Amount ÷ Total Weight ({totalWtMt.toFixed(3)} MT)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 text-center text-xs">
              {activeColsForCalc.map((idx) => {
                const col = detailCols[idx - 1];
                const colAmt = getColAmount(col);
                const wt = getColWtMt(col);
                return (
                  <div key={idx} className="bg-white border border-slate-200 rounded p-1.5 flex flex-col justify-between">
                    <span className="text-[8.5px] font-bold text-slate-500 uppercase">
                      Col {idx} {col?.grade ? `(${col.grade})` : ""} Amt
                    </span>
                    <span className="my-0.5 font-mono font-bold text-slate-900 text-xs">
                      ₹{colAmt.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                    </span>
                    <span className="text-[7.5px] text-slate-500 font-mono">{wt.toFixed(3)} MT</span>
                  </div>
                );
              })}

              <div className="bg-[#eef7f2] border border-emerald-300 rounded p-1.5 flex flex-col justify-between">
                <span className="text-[8.5px] font-black text-emerald-900 uppercase">Grand Total</span>
                <span className="my-0.5 font-mono font-black text-emerald-950 text-xs">
                  ₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                </span>
                <span className="text-[7.5px] text-emerald-700 font-mono">Sum of Recon Amts</span>
              </div>

              <div className="bg-[#eef4ff] border border-blue-300 rounded p-1.5 flex flex-col justify-between">
                <span className="text-[8.5px] font-black text-blue-900 uppercase">Rate / m.T</span>
                <span className="my-0.5 font-mono font-black text-blue-950 text-xs">
                  ₹{weightedRateMt.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                </span>
                <span className="text-[7.5px] text-blue-700 font-mono">Weighted / MT</span>
              </div>

              <div className="bg-[#fffbeb] border border-amber-300 rounded p-1.5 flex flex-col justify-between">
                <span className="text-[8.5px] font-black text-amber-900 uppercase">Actual APMC Fees</span>
                <span className="my-0.5 font-mono font-black text-amber-950 text-xs">
                  ₹{apmc1Pct.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                </span>
                <span className="text-[7.5px] text-amber-700 font-mono">1% of Total</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Grid 2: Claims Subdivided Grid Layout */}
      <LegacyFieldset legend="Active Deductions / Claims Audit Sheet (Moisture, Dust, Grade Down, NCV & L.Dely claims)">
        <div className="flex items-center justify-between pb-1 px-1">
          <span className="text-[9.5px] text-gray-600 font-bold uppercase tracking-wider">
            {visibleDeductionCols.length > 0
              ? `Audit Columns (${visibleDeductionCols.length} Active with Claim > 0)`
              : "No columns with active claims (Total Claim = 0)"}
          </span>
          <button
            type="button"
            onClick={() => setShowAllDeductionCols(!showAllDeductionCols)}
            className="text-[9px] px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold cursor-pointer transition-colors shadow-2xs"
          >
            {showAllDeductionCols ? "Hide 0% Claim Columns" : "Show All Columns to Edit Claims"}
          </button>
        </div>

        {visibleDeductionCols.length === 0 ? (
          <div className="p-4 text-center bg-slate-50 border border-gray-300 rounded text-slate-500 text-xs">
            <p className="font-semibold text-gray-600 mb-1">All columns currently have Total Claim = 0.00% (No Deductions).</p>
            <p className="text-[11px] text-gray-400">Columns with 0 claim are hidden. Click below if you need to view or manually enter deduction percentages.</p>
            <button
              type="button"
              onClick={() => setShowAllDeductionCols(true)}
              className="mt-2 text-xs px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-300 font-bold cursor-pointer transition-colors"
            >
              Show All Columns to Enter Claims
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-400 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-[#ffd2ce] border-b border-gray-400 font-extrabold uppercase text-[#dc2626] text-center">
                  <th className="px-2 py-1.5 border-r border-gray-300 w-28 text-[10px]">Deductions</th>
                  {visibleDeductionCols.map((idx) => (
                    <th key={idx} colSpan={3} className="px-2 py-1.5 border-r border-gray-300 text-[10.5px]">
                      Col {idx} - {detailCols[idx - 1]?.grade || "Empty Spec"}
                    </th>
                  ))}
                </tr>

                <tr className="bg-[#fff1f0] border-b border-gray-400 font-black uppercase text-gray-700 text-[9px] text-center">
                  <th className="px-1.5 py-1 border-r border-gray-300">Metric</th>
                  {visibleDeductionCols.map((idx) => (
                    <React.Fragment key={idx}>
                      <th className="px-1 py-1 border-r border-gray-200 text-rose-850 font-bold">Claim (%)</th>
                      <th className="px-1 py-1 border-r border-gray-200 text-blue-900 font-bold">SETT (%)</th>
                      <th className="px-1 py-1 border-r border-gray-300 text-emerald-800 font-extrabold bg-emerald-50/60">Final (%)</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 font-black text-center font-mono">
                {/* Grade Down */}
                <tr className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 border-r border-gray-200 bg-slate-100 uppercase text-gray-600 font-sans text-[9px] text-left font-bold">
                    Grade Down (%)
                  </td>
                  {visibleDeductionCols.map((idx) => {
                    const gdVal =
                      Number(detailCols[idx - 1]?.gd_sett) > 0
                        ? Number(detailCols[idx - 1]?.gd_sett)
                        : Number(detailCols[idx - 1]?.gd_claim || 0);
                    return (
                      <React.Fragment key={idx}>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            id={`detailcols_${idx}_gd_claim`}
                            name={`detailcols_${idx}_gd_claim`}
                            aria-label={`detailcols ${idx} gd claim`}
                            type="number"
                            step="0.1"
                            readOnly
                            disabled
                            className="w-full text-center bg-transparent outline-none font-bold text-slate-900 text-[10.5px] p-0.5 cursor-not-allowed rounded"
                            value={detailCols[idx - 1]?.gd_claim || ""}
                            onChange={(e) => handleColChange(idx, "gd_claim", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            id={`detailcols_${idx}_gd_sett`}
                            name={`detailcols_${idx}_gd_sett`}
                            aria-label={`detailcols ${idx} gd sett`}
                            type="number"
                            step="0.1"
                            readOnly
                            disabled
                            className="w-full text-center bg-transparent outline-none font-bold text-blue-900 text-[10.5px] p-0.5 cursor-not-allowed rounded"
                            value={detailCols[idx - 1]?.gd_sett ?? 0}
                            onChange={(e) => handleColChange(idx, "gd_sett", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-300 text-emerald-800 bg-emerald-50/40 font-black text-[10.5px]">
                          {gdVal.toFixed(1)}%
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>

                {/* Moisture */}
                <tr className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 border-r border-gray-200 bg-slate-100 uppercase text-gray-600 font-sans text-[9px] text-left font-bold">
                    Moisture (%)
                  </td>
                  {visibleDeductionCols.map((idx) => {
                    const mVal =
                      Number(detailCols[idx - 1]?.moist_sett) > 0
                        ? Number(detailCols[idx - 1]?.moist_sett)
                        : Number(detailCols[idx - 1]?.moist_claim || 0);
                    return (
                      <React.Fragment key={idx}>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            id={`detailcols_${idx}_moist_claim`}
                            name={`detailcols_${idx}_moist_claim`}
                            aria-label={`detailcols ${idx} moist claim`}
                            type="number"
                            step="0.1"
                            readOnly
                            disabled
                            className="w-full text-center bg-transparent outline-none font-bold text-slate-900 text-[10.5px] p-0.5 cursor-not-allowed rounded"
                            value={detailCols[idx - 1]?.moist_claim || ""}
                            onChange={(e) => handleColChange(idx, "moist_claim", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            id={`detailcols_${idx}_moist_sett`}
                            name={`detailcols_${idx}_moist_sett`}
                            aria-label={`detailcols ${idx} moist sett`}
                            type="number"
                            step="0.1"
                            readOnly
                            disabled
                            className="w-full text-center bg-transparent outline-none font-bold text-blue-900 text-[10.5px] p-0.5 cursor-not-allowed rounded"
                            value={detailCols[idx - 1]?.moist_sett ?? 0}
                            onChange={(e) => handleColChange(idx, "moist_sett", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-300 text-emerald-800 bg-emerald-50/40 font-black text-[10.5px]">
                          {mVal.toFixed(2)}%
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>

                {/* Dust */}
                <tr className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 border-r border-gray-200 bg-slate-100 uppercase text-gray-600 font-sans text-[9px] text-left font-bold">
                    Dust (%)
                  </td>
                  {visibleDeductionCols.map((idx) => {
                    const dVal =
                      Number(detailCols[idx - 1]?.dust_sett) > 0
                        ? Number(detailCols[idx - 1]?.dust_sett)
                        : Number(detailCols[idx - 1]?.dust_claim || 0);
                    return (
                      <React.Fragment key={idx}>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            id={`detailcols_${idx}_dust_claim`}
                            name={`detailcols_${idx}_dust_claim`}
                            aria-label={`detailcols ${idx} dust claim`}
                            type="number"
                            step="0.1"
                            readOnly
                            disabled
                            className="w-full text-center bg-transparent outline-none font-bold text-slate-900 text-[10.5px] p-0.5 cursor-not-allowed rounded"
                            value={detailCols[idx - 1]?.dust_claim || ""}
                            onChange={(e) => handleColChange(idx, "dust_claim", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            id={`detailcols_${idx}_dust_sett`}
                            name={`detailcols_${idx}_dust_sett`}
                            aria-label={`detailcols ${idx} dust sett`}
                            type="number"
                            step="0.1"
                            readOnly
                            disabled
                            className="w-full text-center bg-transparent outline-none font-bold text-blue-900 text-[10.5px] p-0.5 cursor-not-allowed rounded"
                            value={detailCols[idx - 1]?.dust_sett ?? 0}
                            onChange={(e) => handleColChange(idx, "dust_sett", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-300 text-emerald-800 bg-emerald-50/40 font-black text-[10.5px]">
                          {dVal.toFixed(2)}%
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>

                {/* NCV */}
                <tr className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 border-r border-gray-200 bg-slate-100 uppercase text-gray-600 font-sans text-[9px] text-left font-bold">
                    NCV (%)
                  </td>
                  {visibleDeductionCols.map((idx) => {
                    const nVal =
                      Number(detailCols[idx - 1]?.ncv_sett) > 0
                        ? Number(detailCols[idx - 1]?.ncv_sett)
                        : Number(detailCols[idx - 1]?.ncv_claim || 0);
                    return (
                      <React.Fragment key={idx}>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            id={`detailcols_${idx}_ncv_claim`}
                            name={`detailcols_${idx}_ncv_claim`}
                            aria-label={`detailcols ${idx} ncv claim`}
                            type="number"
                            step="0.1"
                            readOnly
                            disabled
                            className="w-full text-center bg-transparent outline-none font-bold text-slate-900 text-[10.5px] p-0.5 cursor-not-allowed rounded"
                            value={detailCols[idx - 1]?.ncv_claim || ""}
                            onChange={(e) => handleColChange(idx, "ncv_claim", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            id={`detailcols_${idx}_ncv_sett`}
                            name={`detailcols_${idx}_ncv_sett`}
                            aria-label={`detailcols ${idx} ncv sett`}
                            type="number"
                            step="0.1"
                            readOnly
                            disabled
                            className="w-full text-center bg-transparent outline-none font-bold text-blue-900 text-[10.5px] p-0.5 cursor-not-allowed rounded"
                            value={detailCols[idx - 1]?.ncv_sett ?? 0}
                            onChange={(e) => handleColChange(idx, "ncv_sett", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-300 text-emerald-800 bg-emerald-50/40 font-black text-[10.5px]">
                          {nVal.toFixed(2)}%
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>

                {/* PO / Late Dely */}
                <tr className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 border-r border-gray-200 bg-slate-100 uppercase text-gray-600 font-sans text-[9px] text-left font-bold leading-none">
                    PO/Grade/A/L.Dely (Amt)
                  </td>
                  {visibleDeductionCols.map((idx) => {
                    const poVal =
                      Number(detailCols[idx - 1]?.po_grade_sett) > 0
                        ? Number(detailCols[idx - 1]?.po_grade_sett)
                        : Number(detailCols[idx - 1]?.po_grade_claim || 0);
                    return (
                      <React.Fragment key={idx}>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            id={`detailcols_${idx}_po_grade_claim`}
                            name={`detailcols_${idx}_po_grade_claim`}
                            aria-label={`detailcols ${idx} po grade claim`}
                            type="number"
                            step="0.1"
                            readOnly
                            disabled
                            className="w-full text-center bg-transparent outline-none font-bold text-slate-900 text-[10.5px] p-0.5 cursor-not-allowed rounded"
                            value={detailCols[idx - 1]?.po_grade_claim || ""}
                            onChange={(e) => handleColChange(idx, "po_grade_claim", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-200">
                          <input
                            id={`detailcols_${idx}_po_grade_sett`}
                            name={`detailcols_${idx}_po_grade_sett`}
                            aria-label={`detailcols ${idx} po grade sett`}
                            type="number"
                            step="0.1"
                            readOnly
                            disabled
                            className="w-full text-center bg-transparent outline-none font-bold text-blue-900 text-[10.5px] p-0.5 cursor-not-allowed rounded"
                            value={detailCols[idx - 1]?.po_grade_sett ?? 0}
                            onChange={(e) => handleColChange(idx, "po_grade_sett", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-300 text-emerald-800 bg-emerald-50/40 font-black text-[10.5px]">
                          {poVal.toFixed(1)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>

                {/* Remarks */}
                <tr className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 border-r border-gray-200 bg-slate-100 uppercase text-gray-600 font-sans text-[9px] text-left font-bold">
                    Remarks
                  </td>
                  {visibleDeductionCols.map((idx) => (
                    <td key={idx} colSpan={3} className="p-1 border-r border-gray-300">
                      <input
                        id={`audit_remarks_${idx}`}
                        name={`audit_remarks_${idx}`}
                        aria-label="Audit remarks..."
                        type="text"
                        className="w-full bg-transparent p-0.5 outline-none font-sans font-medium text-left px-2 text-[9.5px]"
                        placeholder="Audit remarks..."
                        value={detailCols[idx - 1]?.remark || ""}
                        onChange={(e) => handleColChange(idx, "remark", e.target.value)}
                      />
                    </td>
                  ))}
                </tr>

                {/* Total Claim */}
                <tr className="bg-rose-50/70 hover:bg-rose-100">
                  <td className="px-2 py-1.5 border-r border-gray-200 text-red-900 uppercase font-sans text-[9px] text-left font-bold">
                    Total Claim
                  </td>
                  {visibleDeductionCols.map((idx) => {
                    const col = detailCols[idx - 1];
                    const isColActive =
                      (Number(col?.quantity) || 0) > 0 ||
                      (Number(col?.arr_qty_wt) || 0) > 0 ||
                      (Number(col?.wt_quantity) || 0) > 0;
                    const gdVal = Number(col?.gd_sett) > 0 ? Number(col?.gd_sett) : Number(col?.gd_claim || 0);
                    const mVal = Number(col?.moist_sett) > 0 ? Number(col?.moist_sett) : Number(col?.moist_claim || 0);
                    const dVal = Number(col?.dust_sett) > 0 ? Number(col?.dust_sett) : Number(col?.dust_claim || 0);
                    const nVal = Number(col?.ncv_sett) > 0 ? Number(col?.ncv_sett) : Number(col?.ncv_claim || 0);
                    const totalClaimVal = gdVal + mVal + dVal + nVal;
                    return (
                      <td
                        key={idx}
                        colSpan={3}
                        className="px-2 py-1.5 border-r border-gray-300 text-center font-black text-red-700 bg-red-100/50 text-[11px]"
                      >
                        {isColActive ? `${totalClaimVal.toFixed(2)}%` : "0.0%"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </LegacyFieldset>
    </div>
  );
};

export default SettlementSpecificationsGrid;
