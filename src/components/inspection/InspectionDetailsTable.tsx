import React from "react";
import { Plus, Printer, Save, Loader2, Sparkles } from "lucide-react";
import {
  InspectionDetailRow,
  InspectionMasterRecord,
  detailFieldsConfig
} from "../../types/inspection.types";
import { InspectionDetailRowItem } from "./InspectionDetailRowItem";
import { InspectionExpandedPanel } from "./InspectionExpandedPanel";

export interface InspectionDetailsTableProps {
  detailRows: InspectionDetailRow[];
  headerForm: Partial<InspectionMasterRecord>;
  isSaving: boolean;
  onDetailChange: (index: number, field: keyof InspectionDetailRow, value: any) => void;
  onToggleExpand: (index: number) => void;
  onDuplicateRow: (index: number) => void;
  onDeleteRow: (index: number) => void;
  onAddRow: () => void;
  onPrintRecord: () => void;
  onSaveForm: () => void;
}

export const InspectionDetailsTable: React.FC<InspectionDetailsTableProps> = ({
  detailRows,
  headerForm,
  isSaving,
  onDetailChange,
  onToggleExpand,
  onDuplicateRow,
  onDeleteRow,
  onAddRow,
  onPrintRecord,
  onSaveForm,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")
      ) {
        e.preventDefault();

        const table = e.currentTarget;
        const focusables = Array.from(
          table.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            "input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly]):not([disabled])"
          )
        ).filter((el) => {
          return (
            el.tabIndex !== -1 &&
            el.getAttribute("readonly") === null &&
            !el.disabled &&
            (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)
          );
        });

        const currentIndex = focusables.indexOf(target as any);
        if (currentIndex !== -1) {
          const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
          if (nextIndex >= 0 && nextIndex < focusables.length) {
            focusables[nextIndex].focus();
            if ("select" in focusables[nextIndex] && typeof focusables[nextIndex].select === "function") {
              focusables[nextIndex].select();
            }
          }
        }
      }
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-extrabold text-slate-900">Inspection Details</h2>
          {/* <span className="bg-blue-100 text-blue-800 text-xs font-extrabold px-3 py-0.5 rounded-full border border-blue-200">
            {detailRows.length} {detailRows.length === 1 ? "Row" : "Rows"}
          </span> */}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onAddRow}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      <style>{`
        .table-scroll::-webkit-scrollbar {
          width: 7px;
          height: 11px;
        }
      `}</style>
      <div className="table-scroll overflow-auto max-h-[calc(100vh-180px)] border-t border-slate-200">
        <table className="min-w-[4300px] w-full text-xs border-collapse" onKeyDown={handleKeyDown}>
          <thead>
            <tr className="bg-[#1e3a8a] text-white text-[12px] font-bold">
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center sticky left-0 bg-[#1e3a8a] z-20 min-w-[50px] w-[50px]">Srl No.</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center sticky left-[50px] bg-[#1e3a8a] z-20 min-w-[120px] w-[120px]">Arrival Grade</th>
              <th colSpan={2} className="p-2 border-r border-white/20 text-center sticky left-[170px] bg-[#1d4ed8] z-20 min-w-[210px] w-[210px]">Stock Grade</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center sticky left-[380px] bg-[#1e3a8a] z-20 min-w-[100px] w-[100px] shadow-[3px_0_5px_-2px_rgba(0,0,0,0.3)]">Area</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[100px]">Agency</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[100px]">Marks</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[100px]">Crop Year</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[100px]">Lot</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[100px]">Quantity</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[100px]">Unit</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[130px]">Challan Gross Wt. MT.</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[130px]">Receipt Gross Wt. MT.</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[130px]">Gross Weight (Batch)</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[120px] bg-gradient-to-b from-[#065f46] to-[#D94B5A] text-white font-extrabold shadow-inner">
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span>Add Weight</span>
                  <span className="text-[9px] font-semibold text-emerald-200">M.Ton</span>
                </div>
              </th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[120px] bg-gradient-to-b from-[#991b1b] to-[#b91c1c] text-white font-extrabold shadow-inner">
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span>Less Weight</span>
                  <span className="text-[9px] font-semibold text-rose-200">M.Ton</span>
                </div>
              </th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[130px] bg-gradient-to-b from-[#3730a3] to-[#4338ca] text-white font-extrabold shadow-inner">
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span>Reduced Weight</span>
                  <span className="text-[9px] font-semibold text-indigo-200">M.Ton</span>
                </div>
              </th>
              <th colSpan={3} className="p-2 border-r border-white/20 text-center bg-[#1e40af]">Lorry Moisture Read (%)</th>
              <th colSpan={3} className="p-2 border-r border-white/20 text-center bg-[#1d4ed8]">Insp. Moisture Read (%)</th>
              <th
                colSpan={2}
                className="p-2 border-r border-blue-300 text-center bg-gradient-to-r from-sky-100 via-blue-100 to-indigo-100 text-blue-950 font-black shadow-inner"
              >
                <div className="flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-700 fill-blue-500" />
                  <span className="tracking-wide">Moisture %</span>
                </div>
              </th>
              <th colSpan={2} className="p-2 border-r border-white/20 text-center bg-[#1d4ed8]">Dust %</th>
              <th colSpan={2} className="p-2 border-r border-white/20 text-center bg-[#1e40af]">NCV %</th>
              <th colSpan={2} className="p-2 border-r border-white/20 text-center bg-[#1d4ed8]">Grade Down %</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[140px]">Final Receipt Wt. (Claim)</th>
              <th colSpan={4} className="p-2 border-r border-emerald-400 text-center bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-black shadow-inner">
                <div className="flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                  <span className="tracking-wide">Mill Settlement %</span>
                </div>
              </th>
              <th colSpan={3} className="p-2 border-r border-white/20 text-center bg-[#1d4ed8]">Ropes</th>
              <th colSpan={3} className="p-2 border-r border-white/20 text-center bg-[#1e40af]">Chotta &amp; Habi Jabi</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[90px]">Tolerable</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[130px] bg-gradient-to-b from-[#1d4ed8] to-[#1e3a8a] text-amber-300">
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className="font-black flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    Premium
                  </span>
                  <span className="text-[9px] font-semibold text-blue-100 opacity-90">(Show Qty in MT)</span>
                </div>
              </th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[125px] bg-gradient-to-b from-[#1e40af] to-[#1e3a8a] text-white font-extrabold shadow-inner">
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span>Amount</span>
                  <span className="text-[9px] font-semibold text-amber-300 font-mono">₹ Total</span>
                </div>
              </th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[140px]">Remarks</th>
              <th rowSpan={2} className="p-2 border-r border-white/20 text-center min-w-[140px]">JCI Remarks</th>
              <th rowSpan={2} className="p-2 text-center min-w-[70px]">Actions</th>
            </tr>
            <tr className="bg-[#243b68] text-white text-[11px]">
              <th className="p-1.5 border-r border-white/10 text-center sticky left-[170px] bg-[#243b68] z-20 min-w-[90px] w-[90px]">Code</th>
              <th className="p-1.5 border-r border-white/10 text-center sticky left-[260px] bg-[#243b68] z-20 min-w-[120px] w-[120px]">Name</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Min</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Max</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Avg</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Min</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Max</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Avg</th>
              <th className="p-1.5 border-r border-blue-500 text-center min-w-[90px] bg-blue-900 text-blue-100 font-black" title="Auto-pulled highest value between Lorry Avg and Insp Avg">Act.</th>
              <th className="p-1.5 border-r border-blue-500 text-center min-w-[90px] bg-blue-900 text-blue-100 font-black" title="Auto-pulled highest value between Lorry Avg and Insp Avg">Claim</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Act.</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Claim</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Act.</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Claim</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Act.</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Claim</th>
              <th className="p-1.5 border-r border-emerald-500 text-center min-w-[90px] bg-emerald-800 text-emerald-100 font-black" title="Auto-pulled from Moisture % Act.">Moisture</th>
              <th className="p-1.5 border-r border-emerald-500 text-center min-w-[90px] bg-emerald-800 text-emerald-100 font-black" title="Auto-pulled from Grade Down % Act.">Gr. Down</th>
              <th className="p-1.5 border-r border-emerald-500 text-center min-w-[90px] bg-emerald-800 text-emerald-100 font-black" title="Auto-pulled from Dust % Act.">Dust</th>
              <th className="p-1.5 border-r border-emerald-500 text-center min-w-[90px] bg-emerald-800 text-emerald-100 font-black" title="Auto-pulled from NCV % Act.">NCV</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Weight (Kg)</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[100px]">Tot. Wt. Grd%</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Grade</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Weight (Kg)</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[100px]">Tot. Wt. Grd%</th>
              <th className="p-1.5 border-r border-white/10 text-center min-w-[90px]">Grade</th>
            </tr>
          </thead>
          <tbody>
            {detailRows.map((row, idx) => (
              <React.Fragment key={idx}>
                <InspectionDetailRowItem
                  row={row}
                  index={idx}
                  headerForm={headerForm}
                  onDetailChange={onDetailChange}
                  onToggleExpand={onToggleExpand}
                  onDuplicateRow={onDuplicateRow}
                  onDeleteRow={onDeleteRow}
                />

                {row.expanded && (
                  <InspectionExpandedPanel
                    row={row}
                    index={idx}
                    configs={detailFieldsConfig}
                    onToggleExpand={onToggleExpand}
                    onDetailChange={onDetailChange}
                  />
                )}
              </React.Fragment>
            ))}

            {/* Final Receipt Total Row */}
            <tr className="border-r border-emerald-600 p-3 text-center font-extrabold text-white">
              <td
                colSpan={9}
                className="p-3 text-right font-extrabold text-emerald-900 bg-slate-100 sticky left-0 z-10 shadow-[3px_0_5px_-2px_rgba(0,0,0,0.12)]"
              >
                Summary Totals:
              </td>
              
              {/* Quantity */}
              <td className="border-x border-emerald-300 bg-emerald-200 p-3 text-center font-extrabold text-emerald-950">
                {detailRows
                  .reduce(
                    (total, item) =>
                      total + (Number(item.quantity) || 0),
                    0
                  )
                  .toFixed(2)}
              </td>

              {/* Unit */}
              <td className="p-3 text-center font-extrabold text-emerald-900 bg-slate-100">
              </td>

              {/* Challan Gross Wt. MT */}
              <td className="border-x border-emerald-300 bg-emerald-200 p-3 text-center font-extrabold text-emerald-950">
                {detailRows
                  .reduce(
                    (total, item) =>
                      total + (Number(item.challan_gross_wt) || 0),
                    0
                  )
                  .toFixed(3)}
              </td>

              {/* Receipt Gross Wt. MT */}
              <td className="border-x border-emerald-300 bg-emerald-200 p-3 text-center font-extrabold text-emerald-950">
                {detailRows
                  .reduce(
                    (total, item) =>
                      total + (Number(item.receipt_gross_wt) || 0),
                    0
                  )
                  .toFixed(3)}
              </td>

              {/* Gross Weight Batch */}
              <td className="border-x border-emerald-300 bg-emerald-200 p-3 text-center font-extrabold text-emerald-950">
                {detailRows
                  .reduce(
                    (total, item) =>
                      total + (Number(item.gross_weight_batch) || 0),
                    0
                  )
                  .toFixed(3)}
              </td>

              {/* Add Weight */}
              <td className="border-x border-emerald-300 bg-emerald-200 p-3 text-center font-extrabold text-emerald-950">
                {detailRows
                  .reduce(
                    (total, item) =>
                      total + (Number(item.add_weight) || 0),
                    0
                  )
                  .toFixed(3)}
              </td>

              {/* Less Weight */}
              <td className="border-x border-emerald-300 bg-emerald-200 p-3 text-center font-extrabold text-emerald-950">
                {detailRows
                  .reduce(
                    (total, item) =>
                      total + (Number(item.less_weight) || 0),
                    0
                  )
                  .toFixed(3)}
              </td>

              {/* Reduced Weight */}
              <td className="border-x border-emerald-300 bg-emerald-200 p-3 text-center font-extrabold text-emerald-950">
                {detailRows
                  .reduce(
                    (total, item) =>
                      total + (Number(item.reduced_weight) || 0),
                    0
                  )
                  .toFixed(3)}
              </td>
              
              {/* Spacer columns */}
              <td
                colSpan={14}
                className="p-3 text-right font-extrabold text-emerald-900 bg-slate-100"
              >
              </td>

              {/* Final Receipt Wt Claim */}
              <td className="border-x border-emerald-300 bg-emerald-200 p-3 text-center font-extrabold text-emerald-950">
                {detailRows
                  .reduce(
                    (total, item) =>
                      total + (Number(item.final_receipt_wt) || 0),
                    0
                  )
                  .toFixed(3)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTER BAR */}
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrintRecord}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            title="Print Marks & Quality Received Mill Copy"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </button>
          <button
            type="button"
            onClick={onSaveForm}
            disabled={isSaving}
            className={`px-5 py-2 font-black text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all ${
              isSaving
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95 cursor-pointer"
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Inspection</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
