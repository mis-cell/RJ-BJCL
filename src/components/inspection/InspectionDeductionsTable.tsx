import React from "react";
import { Percent, Plus, Trash2 } from "lucide-react";
import { DeductionRow, MatchedAutoDeduction } from "../../types/inspection.types";

interface InspectionDeductionsTableProps {
  deductionRows: DeductionRow[];
  deductionMasterList: any[];
  totalDeductionAmount: number;
  matchedDeductions?: MatchedAutoDeduction[];
  baleAudit?: {
    totalBales: number;
    totalReceiptGrossWtMt: number;
    totalWeightKg: number;
    avgKgPerBale: number;
  };
  onAddDeductionRow: () => void;
  onRemoveDeductionRow: (index: number) => void;
  onDeductionChange: (index: number, field: keyof DeductionRow, val: any) => void;
  onDeductionTypeChange: (index: number, typeName: string) => void;
}

export const InspectionDeductionsTable: React.FC<InspectionDeductionsTableProps> = ({
  deductionRows,
  deductionMasterList,
  totalDeductionAmount,
  onAddDeductionRow,
  onRemoveDeductionRow,
  onDeductionChange,
  onDeductionTypeChange,
}) => {
  const calculatedTotalAmount = deductionRows.reduce(
    (sum, r) => sum + (Number(r.deduction_amount) || 0),
    0
  );
  const effectiveTotalAmount = calculatedTotalAmount > 0 ? calculatedTotalAmount : (Number(totalDeductionAmount) || 0);
  const calculatedTotalQty = deductionRows.reduce((sum, r) => sum + (Number(r.deduction_qty) || 0), 0);

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-rose-100 text-rose-700 rounded-md border border-rose-200">
            <Percent className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
            Deduction Details &amp; Penalties
          </h2>
          <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-rose-200">
            {deductionRows.length} {deductionRows.length === 1 ? "Option" : "Options"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {effectiveTotalAmount > 0 && (
            <div className="bg-rose-50 text-rose-900 border border-rose-200 px-2.5 py-0.5 rounded-md text-xs font-black flex items-center gap-1">
              <span className="text-[10px] font-bold text-rose-700 uppercase">Total Claim:</span>
              <span className="font-mono text-xs text-rose-900">
                -₹{Number(effectiveTotalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onAddDeductionRow}
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deduction</span>
          </button>
        </div>
      </div>

      <div className="p-3 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
              <th className="py-1.5 px-2.5 w-10 text-center">#</th>
              <th className="py-1.5 px-2.5">Deduction Type</th>
              <th className="py-1.5 px-2.5 w-32 text-right">Deduction Rate (₹)</th>
              <th className="py-1.5 px-2.5 w-28 text-right">QTL</th>
              <th className="py-1.5 px-2.5 w-36 text-right">Deduction Amount (-)</th>
              <th className="py-1.5 px-2 w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deductionRows.map((dRow, idx) => (
              <tr key={dRow.id || idx} className="hover:bg-rose-50/30 transition-colors">
                <td className="py-1.5 px-2.5 text-center font-bold text-slate-500">
                  {idx + 1}
                </td>
                <td className="py-1.5 px-2.5">
                  <select
                    value={dRow.deduction_type || ""}
                    onChange={(e) => onDeductionTypeChange(idx, e.target.value)}
                    className="bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 rounded-md px-2 py-1 font-sans text-xs font-bold text-slate-800 w-full shadow-2xs outline-none"
                  >
                    <option value="">-- SELECT DEDUCTION TYPE --</option>
                    {dRow.deduction_type && !deductionMasterList.some(d => d.deduction === dRow.deduction_type) && (
                      <option value={dRow.deduction_type}>
                        {dRow.deduction_type}
                      </option>
                    )}
                    {deductionMasterList.map((d, dIdx) => (
                      <option key={dIdx} value={d.deduction}>
                        {d.deduction} {d.rate_per_unit ? `(₹${d.rate_per_unit}/Unit)` : d.rate_per_qntl ? `(₹${d.rate_per_qntl}/Qtl)` : ""}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 px-2.5 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={dRow.deduction_rate || ""}
                    onChange={(e) => onDeductionChange(idx, "deduction_rate", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-white border border-slate-300 rounded-md px-2 py-1 text-right font-mono font-bold text-xs text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-none w-full"
                  />
                </td>
                <td className="py-1.5 px-2.5 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={dRow.deduction_qty !== undefined && dRow.deduction_qty !== null ? dRow.deduction_qty : 0}
                    onChange={(e) => onDeductionChange(idx, "deduction_qty", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-white border border-slate-300 rounded-md px-2 py-1 text-right font-mono font-bold text-xs text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-none w-full"
                  />
                </td>
                <td className="py-1.5 px-2.5 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={dRow.deduction_amount || ""}
                    onChange={(e) => onDeductionChange(idx, "deduction_amount", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-rose-50 border border-rose-300 rounded-md px-2 py-1 text-right font-mono font-black text-xs text-rose-800 shadow-2xs focus:outline-none w-full"
                  />
                </td>
                <td className="py-1.5 px-2 text-center">
                  {deductionRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveDeductionRow(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors inline-flex items-center justify-center cursor-pointer"
                      title="Remove deduction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-100/90">
            <tr className="font-extrabold text-slate-800">
              <td colSpan={3} className="py-2 px-2.5 text-right uppercase text-[11px] tracking-wide text-slate-700">
                Total Deductions &amp; Penalties:
              </td>
              <td className="py-2 px-2.5 text-right font-mono font-black text-xs text-slate-900">
                {calculatedTotalQty.toFixed(2)}
              </td>
              <td className="py-2 px-2.5 text-right">
                <span className="inline-block w-full bg-rose-100 text-rose-900 border border-rose-300 rounded px-2 py-1 font-mono font-black text-xs text-right shadow-2xs">
                  -₹{Number(effectiveTotalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
};
