import React, { memo } from "react";
import { Lock, Sparkles, ChevronUp, ChevronDown, Copy, Trash2 } from "lucide-react";
import { InspectionDetailRow, InspectionMasterRecord } from "../../types/inspection.types";
import {
  isAutoBlocked,
  getFieldInputStyle,
  calculateQtyInMt,
  calculateRowAmount,
  getPremiumMt
} from "../../utils/inspectionCalculations";

interface InspectionDetailRowItemProps {
  row: InspectionDetailRow;
  index: number;
  headerForm: Partial<InspectionMasterRecord>;
  onDetailChange: (index: number, field: keyof InspectionDetailRow, val: any) => void;
  onToggleExpand: (index: number) => void;
  onDuplicateRow: (index: number) => void;
  onDeleteRow: (index: number) => void;
}

export const InspectionDetailRowItem: React.FC<InspectionDetailRowItemProps> = memo(({
  row,
  index,
  headerForm,
  onDetailChange,
  onToggleExpand,
  onDuplicateRow,
  onDeleteRow,
}) => {
  const isArrivalGradeBlocked = isAutoBlocked(row, "arrival_grade");
  const isStockGradeCodeBlocked = isAutoBlocked(row, "stock_grade_code");
  const isStockGradeNameBlocked = isAutoBlocked(row, "stock_grade_name");
  const isAreaBlocked = isAutoBlocked(row, "area");
  const isAgencyBlocked = isAutoBlocked(row, "agency");
  const isMarksBlocked = isAutoBlocked(row, "marks");
  const isCropYearBlocked = isAutoBlocked(row, "crop_year");
  const isLotBlocked = isAutoBlocked(row, "lot");
  const isQuantityBlocked = isAutoBlocked(row, "quantity");
  const isUnitBlocked = isAutoBlocked(row, "unit");
  const isChallanGrossWtBlocked = isAutoBlocked(row, "challan_gross_wt");
  const isReceiptGrossWtBlocked = isAutoBlocked(row, "receipt_gross_wt");
  const isGrossWeightBatchBlocked = isAutoBlocked(row, "gross_weight_batch");
  const isAddWeightBlocked = isAutoBlocked(row, "add_weight");
  const isLessWeightBlocked = isAutoBlocked(row, "less_weight");
  const isReducedWeightBlocked = isAutoBlocked(row, "reduced_weight");
  const isLorryReadMinBlocked = isAutoBlocked(row, "lorry_read_min");
  const isLorryReadMaxBlocked = isAutoBlocked(row, "lorry_read_max");
  const isInspReadMinBlocked = isAutoBlocked(row, "insp_read_min");
  const isInspReadMaxBlocked = isAutoBlocked(row, "insp_read_max");
  const isMoistureActBlocked = isAutoBlocked(row, "moisture_act");
  const isMoistureClaimBlocked = isAutoBlocked(row, "moisture_claim");
  const isDustActBlocked = isAutoBlocked(row, "dust_act");
  const isDustClaimBlocked = isAutoBlocked(row, "dust_claim");
  const isNcvActBlocked = isAutoBlocked(row, "ncv_act");
  const isNcvClaimBlocked = isAutoBlocked(row, "ncv_claim");
  const isGradeDownActBlocked = isAutoBlocked(row, "grade_down_act");
  const isGradeDownClaimBlocked = isAutoBlocked(row, "grade_down_claim");
  const isFinalReceiptWtBlocked = isAutoBlocked(row, "final_receipt_wt");
  const isSettlementMoistureBlocked = isAutoBlocked(row, "settlement_moisture");
  const isSettlementGradeDownBlocked = isAutoBlocked(row, "settlement_grade_down");
  const isSettlementDustBlocked = isAutoBlocked(row, "settlement_dust");
  const isSettlementNcvBlocked = isAutoBlocked(row, "settlement_ncv");
  const isRopesWeightBlocked = isAutoBlocked(row, "ropes_weight");
  const isRopesTotWtGrdBlocked = isAutoBlocked(row, "ropes_tot_wt_grd");
  const isRopesGradeBlocked = isAutoBlocked(row, "ropes_grade");
  const isChottaWeightBlocked = isAutoBlocked(row, "chotta_weight");
  const isChottaTotWtGrdBlocked = isAutoBlocked(row, "chotta_tot_wt_grd");
  const isChottaGradeBlocked = isAutoBlocked(row, "chotta_grade");

  const stickyBgClass = row.expanded
    ? "bg-blue-50"
    : index % 2 === 0
    ? "bg-white"
    : "bg-slate-50";

  return (
    <tr className={`border-b border-slate-200 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/60"} ${row.expanded ? "bg-blue-50/50" : ""}`}>
      {/* Srl No */}
      <td className={`p-2 border-r border-slate-200 text-center font-extrabold text-slate-700 sticky left-0 z-10 ${stickyBgClass}`}>
        <div className="flex items-center justify-center gap-1">
          <span>{index + 1}</span>
          {row.is_auto && (
            <span title="Auto-filled from Arrival / PO">
              <Lock className="w-2.5 h-2.5 text-blue-600 inline" />
            </span>
          )}
        </div>
      </td>

      {/* Arrival Grade */}
      <td className={`p-1.5 border-r border-slate-200 sticky left-[50px] z-10 ${stickyBgClass}`}>
        <input
          type="text"
          readOnly={isArrivalGradeBlocked}
          tabIndex={isArrivalGradeBlocked ? -1 : 0}
          title={isArrivalGradeBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.arrival_grade || ""}
          onChange={(e) => !isArrivalGradeBlocked && onDetailChange(index, "arrival_grade", e.target.value)}
          className={getFieldInputStyle(isArrivalGradeBlocked)}
        />
      </td>

      {/* Stock Grade Code & Name */}
      <td className={`p-1.5 border-r border-slate-200 sticky left-[170px] z-10 ${stickyBgClass}`}>
        <input
          type="text"
          readOnly={isStockGradeCodeBlocked}
          tabIndex={isStockGradeCodeBlocked ? -1 : 0}
          title={isStockGradeCodeBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.stock_grade_code || ""}
          onChange={(e) => !isStockGradeCodeBlocked && onDetailChange(index, "stock_grade_code", e.target.value)}
          className={getFieldInputStyle(isStockGradeCodeBlocked)}
        />
      </td>
      <td className={`p-1.5 border-r border-slate-200 sticky left-[260px] z-10 ${stickyBgClass}`}>
        <input
          type="text"
          readOnly={isStockGradeNameBlocked}
          tabIndex={isStockGradeNameBlocked ? -1 : 0}
          title={isStockGradeNameBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.stock_grade_name || ""}
          onChange={(e) => !isStockGradeNameBlocked && onDetailChange(index, "stock_grade_name", e.target.value)}
          className={getFieldInputStyle(isStockGradeNameBlocked)}
        />
      </td>

      {/* Area & Agency */}
      <td className={`p-1.5 border-r border-slate-200 sticky left-[380px] z-10 ${stickyBgClass} shadow-[3px_0_5px_-2px_rgba(0,0,0,0.12)]`}>
        <input
          type="text"
          readOnly={isAreaBlocked}
          tabIndex={isAreaBlocked ? -1 : 0}
          title={isAreaBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.area || ""}
          onChange={(e) => !isAreaBlocked && onDetailChange(index, "area", e.target.value)}
          className={getFieldInputStyle(isAreaBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="text"
          readOnly={isAgencyBlocked}
          tabIndex={isAgencyBlocked ? -1 : 0}
          title={isAgencyBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.agency || ""}
          onChange={(e) => !isAgencyBlocked && onDetailChange(index, "agency", e.target.value)}
          className={getFieldInputStyle(isAgencyBlocked)}
        />
      </td>

      {/* Marks, Crop Year, Lot */}
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="text"
          readOnly={isMarksBlocked}
          tabIndex={isMarksBlocked ? -1 : 0}
          title={isMarksBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.marks || ""}
          onChange={(e) => !isMarksBlocked && onDetailChange(index, "marks", e.target.value)}
          className={getFieldInputStyle(isMarksBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="text"
          readOnly={isCropYearBlocked}
          tabIndex={isCropYearBlocked ? -1 : 0}
          title={isCropYearBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.crop_year || ""}
          onChange={(e) => !isCropYearBlocked && onDetailChange(index, "crop_year", e.target.value)}
          className={getFieldInputStyle(isCropYearBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="text"
          readOnly={isLotBlocked}
          tabIndex={isLotBlocked ? -1 : 0}
          title={isLotBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.lot || ""}
          onChange={(e) => !isLotBlocked && onDetailChange(index, "lot", e.target.value)}
          className={getFieldInputStyle(isLotBlocked)}
        />
      </td>

      {/* Quantity & Unit */}
      <td className="p-1.5 border-r border-slate-200">
        <div className="flex flex-col gap-0.5">
          <input
            type="number"
            step="1"
            readOnly={isQuantityBlocked}
            tabIndex={isQuantityBlocked ? -1 : 0}
            title={isQuantityBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
            value={row.quantity !== undefined && row.quantity !== null ? row.quantity : 0}
            onChange={(e) => {
              if (isQuantityBlocked) return;
              const val = Number(e.target.value);
              onDetailChange(index, "quantity", val);
            }}
            className={getFieldInputStyle(isQuantityBlocked, "font-bold font-mono text-right")}
          />
          <span className="text-[9px] text-slate-500 font-medium">
            ≈ {calculateQtyInMt(row).toFixed(3)} MT
          </span>
        </div>
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <div className="flex flex-col gap-0.5">
          <input
            type="text"
            readOnly={isUnitBlocked}
            tabIndex={isUnitBlocked ? -1 : 0}
            title={isUnitBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
            value={row.unit || (headerForm as any).unit_name || "BALES"}
            onChange={(e) => !isUnitBlocked && onDetailChange(index, "unit", e.target.value.toUpperCase())}
            className={getFieldInputStyle(isUnitBlocked, "text-center uppercase font-bold")}
          />
        </div>
      </td>

      {/* Weights */}
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.001"
          readOnly={isChallanGrossWtBlocked}
          tabIndex={isChallanGrossWtBlocked ? -1 : 0}
          title={isChallanGrossWtBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={(Number(row.challan_gross_wt) || 0).toFixed(3)}
          onChange={(e) => !isChallanGrossWtBlocked && onDetailChange(index, "challan_gross_wt", Number(e.target.value))}
          className={getFieldInputStyle(isChallanGrossWtBlocked, "font-mono font-bold")}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.001"
          readOnly={isReceiptGrossWtBlocked}
          tabIndex={isReceiptGrossWtBlocked ? -1 : 0}
          title={isReceiptGrossWtBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={(Number(row.receipt_gross_wt) || 0).toFixed(3)}
          onChange={(e) => !isReceiptGrossWtBlocked && onDetailChange(index, "receipt_gross_wt", Number(e.target.value))}
          className={getFieldInputStyle(isReceiptGrossWtBlocked, "font-mono font-bold")}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.001"
          readOnly={isGrossWeightBatchBlocked}
          tabIndex={isGrossWeightBatchBlocked ? -1 : 0}
          title={isGrossWeightBatchBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={(Number(row.gross_weight_batch) || 0).toFixed(3)}
          onChange={(e) => !isGrossWeightBatchBlocked && onDetailChange(index, "gross_weight_batch", Number(e.target.value))}
          className={getFieldInputStyle(isGrossWeightBatchBlocked, "font-mono")}
        />
      </td>
      <td className="p-1.5 border-r border-emerald-200 bg-emerald-50/40">
        <input
          type="number"
          step="0.001"
          readOnly={isAddWeightBlocked}
          tabIndex={isAddWeightBlocked ? -1 : 0}
          title={isAddWeightBlocked ? "Auto-populated (Manual edit blocked)" : "Add Weight M.Ton"}
          value={(Number(row.add_weight) || 0).toFixed(3)}
          onChange={(e) => !isAddWeightBlocked && onDetailChange(index, "add_weight", Number(e.target.value))}
          className={`w-full border border-emerald-300 rounded px-2 py-1 text-xs font-mono font-bold text-center bg-emerald-50/80 text-emerald-950 focus:ring-2 focus:ring-emerald-500 ${isAddWeightBlocked ? "cursor-not-allowed opacity-80" : ""}`}
        />
      </td>
      <td className="p-1.5 border-r border-rose-200 bg-rose-50/40">
        <input
          type="number"
          step="0.001"
          readOnly={isLessWeightBlocked}
          tabIndex={isLessWeightBlocked ? -1 : 0}
          title={isLessWeightBlocked ? "Auto-populated (Manual edit blocked)" : "Less Weight M.Ton"}
          value={(Number(row.less_weight) || 0).toFixed(3)}
          onChange={(e) => !isLessWeightBlocked && onDetailChange(index, "less_weight", Number(e.target.value))}
          className={`w-full border border-rose-300 rounded px-2 py-1 text-xs font-mono font-bold text-center bg-rose-50/80 text-rose-950 focus:ring-2 focus:ring-rose-500 ${isLessWeightBlocked ? "cursor-not-allowed opacity-80" : ""}`}
        />
      </td>
      <td className="p-1.5 border-r border-indigo-200 bg-indigo-50/40">
        <input
          type="number"
          step="0.001"
          readOnly={isReducedWeightBlocked}
          tabIndex={isReducedWeightBlocked ? -1 : 0}
          title={isReducedWeightBlocked ? "Auto-populated (Manual edit blocked)" : "Reduced Weight M.Ton"}
          value={(Number(row.reduced_weight) || 0).toFixed(3)}
          onChange={(e) => !isReducedWeightBlocked && onDetailChange(index, "reduced_weight", Number(e.target.value))}
          className={`w-full border border-indigo-300 rounded px-2 py-1 text-xs font-mono font-bold text-center bg-indigo-50/80 text-indigo-950 focus:ring-2 focus:ring-indigo-500 ${isReducedWeightBlocked ? "cursor-not-allowed opacity-80" : ""}`}
        />
      </td>

      {/* Lorry Read Min / Max / Avg */}
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isLorryReadMinBlocked}
          tabIndex={isLorryReadMinBlocked ? -1 : 0}
          title={isLorryReadMinBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.lorry_read_min !== undefined && row.lorry_read_min !== null && String(row.lorry_read_min) !== "" ? row.lorry_read_min : (row.lorry_moisture_min !== undefined && row.lorry_moisture_min !== null ? row.lorry_moisture_min : 0)}
          onChange={(e) => !isLorryReadMinBlocked && onDetailChange(index, "lorry_read_min", Number(e.target.value))}
          className={getFieldInputStyle(isLorryReadMinBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isLorryReadMaxBlocked}
          tabIndex={isLorryReadMaxBlocked ? -1 : 0}
          title={isLorryReadMaxBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.lorry_read_max !== undefined && row.lorry_read_max !== null && String(row.lorry_read_max) !== "" ? row.lorry_read_max : (row.lorry_moisture_max !== undefined && row.lorry_moisture_max !== null ? row.lorry_moisture_max : 0)}
          onChange={(e) => !isLorryReadMaxBlocked && onDetailChange(index, "lorry_read_max", Number(e.target.value))}
          className={getFieldInputStyle(isLorryReadMaxBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={false}
          tabIndex={-1}
          title="Auto-calculated average (Locked)"
          value={row.lorry_read_avg ?? 0}
          //value={row.lorry_read_avg !== undefined && row.lorry_read_avg !== null && String(row.lorry_read_avg) !== "" && Number(row.lorry_read_avg) > 0 ? row.lorry_read_avg : (row.lorry_moisture_avg !== undefined && row.lorry_moisture_avg !== null && Number(row.lorry_moisture_avg) > 0 ? row.lorry_moisture_avg : ((Number(row.lorry_read_min) > 0 && Number(row.lorry_read_max) > 0) ? Number(((Number(row.lorry_read_min) + Number(row.lorry_read_max)) / 2).toFixed(2)) : (row.lorry_read_min || row.lorry_read_max || 0)))}
          onChange={(e) => onDetailChange(index, "lorry_read_avg", Number(e.target.value))}
          className={getFieldInputStyle(false, "text-blue-900 font-black")}
        />
      </td>

      {/* Insp Read Min / Max / Avg */}
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isInspReadMinBlocked}
          tabIndex={isInspReadMinBlocked ? -1 : 0}
          title={isInspReadMinBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.insp_read_min !== undefined && row.insp_read_min !== null && String(row.insp_read_min) !== "" ? row.insp_read_min : (row.insp_moisture_min !== undefined && row.insp_moisture_min !== null ? row.insp_moisture_min : 0)}
          onChange={(e) => !isInspReadMinBlocked && onDetailChange(index, "insp_read_min", Number(e.target.value))}
          className={getFieldInputStyle(isInspReadMinBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isInspReadMaxBlocked}
          tabIndex={isInspReadMaxBlocked ? -1 : 0}
          title={isInspReadMaxBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.insp_read_max !== undefined && row.insp_read_max !== null && String(row.insp_read_max) !== "" ? row.insp_read_max : (row.insp_moisture_max !== undefined && row.insp_moisture_max !== null ? row.insp_moisture_max : 0)}
          onChange={(e) => !isInspReadMaxBlocked && onDetailChange(index, "insp_read_max", Number(e.target.value))}
          className={getFieldInputStyle(isInspReadMaxBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={false}
          tabIndex={-1}
          title="Auto-calculated average (Locked)"
          value={row.insp_read_avg ?? 0}
          //value={row.insp_read_avg !== undefined && row.insp_read_avg !== null && String(row.insp_read_avg) !== "" && Number(row.insp_read_avg) > 0 ? row.insp_read_avg : (row.insp_moisture_avg !== undefined && row.insp_moisture_avg !== null && Number(row.insp_moisture_avg) > 0 ? row.insp_moisture_avg : ((Number(row.insp_read_min) > 0 && Number(row.insp_read_max) > 0) ? Number(((Number(row.insp_read_min) + Number(row.insp_read_max)) / 2).toFixed(2)) : (row.insp_read_min || row.insp_read_max || row.moisture_act || row.actual_moisture || (headerForm as any)?.actual_moisture || 0)))}
          onChange={(e) => onDetailChange(index, "insp_read_avg", Number(e.target.value))}
          className={getFieldInputStyle(false, "text-blue-900 font-black")}
        />
      </td>

      {/* Moisture Act / Claim */}
      <td className="p-1.5 border-r border-blue-200">
        <input
          type="number"
          step="0.01"
          placeholder="0.00"
          value={
            row.moisture_act !== undefined && row.moisture_act !== null && row.moisture_act !== ""
              ? row.moisture_act
              : (row.actual_moisture !== undefined && row.actual_moisture !== null && row.actual_moisture !== ""
                  ? row.actual_moisture
                  : "")
          }
          onChange={(e) => onDetailChange(index, "moisture_act", e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 bg-white text-blue-950 font-bold text-center"
        />
      </td>
      <td className="p-1.5 border-r border-blue-200">
        <input
          type="number"
          step="0.01"
          placeholder="0.00"
          value={
            row.moisture_claim !== undefined && row.moisture_claim !== null && row.moisture_claim !== ""
              ? row.moisture_claim
              : (row.claim_moisture !== undefined && row.claim_moisture !== null && row.claim_moisture !== ""
                  ? row.claim_moisture
                  : "")
          }
          onChange={(e) => onDetailChange(index, "moisture_claim", e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 bg-white text-indigo-950 font-bold text-center"
        />
      </td>

      {/* Dust Act / Claim */}
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isDustActBlocked}
          tabIndex={isDustActBlocked ? -1 : 0}
          title={isDustActBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={
            row.dust_act !== undefined && row.dust_act !== null && row.dust_act !== "" && Number(row.dust_act) > 0
              ? row.dust_act
              : (row.actual_dust !== undefined && row.actual_dust !== null && row.actual_dust !== "" && Number(row.actual_dust) > 0
                  ? row.actual_dust
                  : ((headerForm as any)?.actual_dust !== undefined && Number((headerForm as any)?.actual_dust) > 0
                      ? (headerForm as any).actual_dust
                      : (Number(row.dust_act) || Number(row.actual_dust) || Number((headerForm as any)?.actual_dust) || 0)))
          }
          onChange={(e) => !isDustActBlocked && onDetailChange(index, "dust_act", Number(e.target.value))}
          className={getFieldInputStyle(isDustActBlocked, "text-amber-900 font-bold")}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isDustClaimBlocked}
          tabIndex={isDustClaimBlocked ? -1 : 0}
          title={isDustClaimBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={
            row.dust_claim !== undefined && row.dust_claim !== null && row.dust_claim !== "" && Number(row.dust_claim) > 0
              ? row.dust_claim
              : (row.claim_dust !== undefined && row.claim_dust !== null && row.claim_dust !== "" && Number(row.claim_dust) > 0
                  ? row.claim_dust
                  : ((headerForm as any)?.claim_dust !== undefined && Number((headerForm as any)?.claim_dust) > 0
                      ? (headerForm as any).claim_dust
                      : (Number(row.dust_claim) || Number(row.claim_dust) || Number((headerForm as any)?.claim_dust) || 0)))
          }
          onChange={(e) => !isDustClaimBlocked && onDetailChange(index, "dust_claim", Number(e.target.value))}
          className={getFieldInputStyle(isDustClaimBlocked, "text-purple-900 font-bold")}
        />
      </td>

      {/* NCV Act / Claim */}
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isNcvActBlocked}
          tabIndex={isNcvActBlocked ? -1 : 0}
          title={isNcvActBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={
            row.ncv_act !== undefined && row.ncv_act !== null && row.ncv_act !== "" && Number(row.ncv_act) > 0
              ? row.ncv_act
              : (row.actual_ncv !== undefined && row.actual_ncv !== null && row.actual_ncv !== "" && Number(row.actual_ncv) > 0
                  ? row.actual_ncv
                  : ((headerForm as any)?.actual_ncv !== undefined && Number((headerForm as any)?.actual_ncv) > 0
                      ? (headerForm as any).actual_ncv
                      : (Number(row.ncv_act) || Number(row.actual_ncv) || Number((headerForm as any)?.actual_ncv) || 0)))
          }
          onChange={(e) => !isNcvActBlocked && onDetailChange(index, "ncv_act", Number(e.target.value))}
          className={getFieldInputStyle(isNcvActBlocked, "text-emerald-900 font-bold")}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isNcvClaimBlocked}
          tabIndex={isNcvClaimBlocked ? -1 : 0}
          title={isNcvClaimBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={
            row.ncv_claim !== undefined && row.ncv_claim !== null && row.ncv_claim !== "" && Number(row.ncv_claim) > 0
              ? row.ncv_claim
              : (row.claim_ncv !== undefined && row.claim_ncv !== null && row.claim_ncv !== "" && Number(row.claim_ncv) > 0
                  ? row.claim_ncv
                  : ((headerForm as any)?.claim_ncv !== undefined && Number((headerForm as any)?.claim_ncv) > 0
                      ? (headerForm as any).claim_ncv
                      : (Number(row.ncv_claim) || Number(row.claim_ncv) || Number((headerForm as any)?.claim_ncv) || 0)))
          }
          onChange={(e) => !isNcvClaimBlocked && onDetailChange(index, "ncv_claim", Number(e.target.value))}
          className={getFieldInputStyle(isNcvClaimBlocked, "text-purple-900 font-bold")}
        />
      </td>

      {/* Grade Down Act / Claim */}
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isGradeDownActBlocked}
          tabIndex={isGradeDownActBlocked ? -1 : 0}
          title={isGradeDownActBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.grade_down_act || 0}
          onChange={(e) => !isGradeDownActBlocked && onDetailChange(index, "grade_down_act", Number(e.target.value))}
          className={getFieldInputStyle(isGradeDownActBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isGradeDownClaimBlocked}
          tabIndex={isGradeDownClaimBlocked ? -1 : 0}
          title={isGradeDownClaimBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.grade_down_claim || 0}
          onChange={(e) => !isGradeDownClaimBlocked && onDetailChange(index, "grade_down_claim", Number(e.target.value))}
          className={getFieldInputStyle(isGradeDownClaimBlocked)}
        />
      </td>

      {/* Final Receipt Wt */}
      <td className="p-1.5 border-r border-slate-200 bg-indigo-50/20">
        <input
          type="number"
          step="0.001"
          readOnly={isFinalReceiptWtBlocked}
          tabIndex={isFinalReceiptWtBlocked ? -1 : 0}
          title={isFinalReceiptWtBlocked ? "Auto-populated (Manual edit blocked)" : "Final Receipt Wt. (Claim) = Reduced Weight - Moisture Claim % - Dust Claim %"}
          value={(() => {
            const baseWt = Number(row.reduced_weight) > 0 ? Number(row.reduced_weight) : (Number(row.receipt_gross_wt) || 0);
            const mClaim = Number(row.moisture_claim) || 0;
            const dClaim = Number(row.dust_claim) || 0;
            let val = 0;
            if (baseWt > 0 && (mClaim > 0 || dClaim > 0)) {
              if (
                row.final_receipt_wt === undefined ||
                row.final_receipt_wt === null ||
                Math.abs(Number(row.final_receipt_wt) - baseWt) < 0.001 ||
                Number(row.final_receipt_wt) <= 0
              ) {
                val = baseWt - ((baseWt * mClaim) / 100) - ((baseWt * dClaim) / 100);
              } else {
                val = Number(row.final_receipt_wt);
              }
            } else {
              val = row.final_receipt_wt !== undefined && row.final_receipt_wt !== null 
                ? Number(row.final_receipt_wt) 
                : baseWt;
            }
            return (Number(val) || 0).toFixed(3);
          })()}
          onChange={(e) => !isFinalReceiptWtBlocked && onDetailChange(index, "final_receipt_wt", Math.round(Number(e.target.value) * 1000) / 1000)}
          className={getFieldInputStyle(isFinalReceiptWtBlocked, "font-mono font-black text-indigo-950 bg-indigo-50/60 text-center")}
        />
      </td>

      {/* Settlement % (Highlighted in Emerald Theme) */}
      <td className="p-1.5 border-r border-emerald-200 bg-emerald-50/40">
        <input
          type="number"
          step="0.01"
          readOnly={isSettlementMoistureBlocked}
          tabIndex={isSettlementMoistureBlocked ? -1 : 0}
          title={isSettlementMoistureBlocked ? "Auto-populated (Manual edit blocked)" : "Mill Settlement % Moisture (Auto-pulled from Act. Moisture)"}
          value={row.settlement_moisture !== undefined && row.settlement_moisture !== null && Number(row.settlement_moisture) > 0 ? row.settlement_moisture : (row.settlement_moisture || 0)}
          onChange={(e) => !isSettlementMoistureBlocked && onDetailChange(index, "settlement_moisture", Number(e.target.value))}
          className={`w-full border border-emerald-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-emerald-500 bg-emerald-50/70 text-emerald-950 font-black text-center ${isSettlementMoistureBlocked ? "cursor-not-allowed opacity-80" : ""}`}
        />
      </td>
      <td className="p-1.5 border-r border-emerald-200 bg-emerald-50/40">
        <input
          type="number"
          step="0.01"
          readOnly={isSettlementGradeDownBlocked}
          tabIndex={isSettlementGradeDownBlocked ? -1 : 0}
          title={isSettlementGradeDownBlocked ? "Auto-populated (Manual edit blocked)" : "Mill Settlement % Gr. Down (Auto-pulled from Act. Grade Down)"}
          value={row.settlement_grade_down !== undefined && row.settlement_grade_down !== null && Number(row.settlement_grade_down) > 0 ? row.settlement_grade_down : (row.settlement_grade_down || 0)}
          onChange={(e) => !isSettlementGradeDownBlocked && onDetailChange(index, "settlement_grade_down", Number(e.target.value))}
          className={`w-full border border-emerald-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-emerald-500 bg-emerald-50/70 text-emerald-950 font-black text-center ${isSettlementGradeDownBlocked ? "cursor-not-allowed opacity-80" : ""}`}
        />
      </td>
      <td className="p-1.5 border-r border-emerald-200 bg-emerald-50/40">
        <input
          type="number"
          step="0.01"
          readOnly={isSettlementDustBlocked}
          tabIndex={isSettlementDustBlocked ? -1 : 0}
          title={isSettlementDustBlocked ? "Auto-populated (Manual edit blocked)" : "Mill Settlement % Dust (Auto-pulled from Act. Dust)"}
          value={row.settlement_dust !== undefined && row.settlement_dust !== null && Number(row.settlement_dust) > 0 ? row.settlement_dust : (row.settlement_dust || 0)}
          onChange={(e) => !isSettlementDustBlocked && onDetailChange(index, "settlement_dust", Number(e.target.value))}
          className={`w-full border border-emerald-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-emerald-500 bg-emerald-50/70 text-emerald-950 font-black text-center ${isSettlementDustBlocked ? "cursor-not-allowed opacity-80" : ""}`}
        />
      </td>
      <td className="p-1.5 border-r border-emerald-200 bg-emerald-50/40">
        <input
          type="number"
          step="0.01"
          readOnly={isSettlementNcvBlocked}
          tabIndex={isSettlementNcvBlocked ? -1 : 0}
          title={isSettlementNcvBlocked ? "Auto-populated (Manual edit blocked)" : "Mill Settlement % NCV (Auto-pulled from Act. NCV)"}
          value={row.settlement_ncv !== undefined && row.settlement_ncv !== null && Number(row.settlement_ncv) > 0 ? row.settlement_ncv : (row.settlement_ncv || 0)}
          onChange={(e) => !isSettlementNcvBlocked && onDetailChange(index, "settlement_ncv", Number(e.target.value))}
          className={`w-full border border-emerald-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-emerald-500 bg-emerald-50/70 text-emerald-950 font-black text-center ${isSettlementNcvBlocked ? "cursor-not-allowed opacity-80" : ""}`}
        />
      </td>

      {/* Ropes */}
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isRopesWeightBlocked}
          tabIndex={isRopesWeightBlocked ? -1 : 0}
          title={isRopesWeightBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.ropes_weight || 0}
          onChange={(e) => !isRopesWeightBlocked && onDetailChange(index, "ropes_weight", Number(e.target.value))}
          className={getFieldInputStyle(isRopesWeightBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isRopesTotWtGrdBlocked}
          tabIndex={isRopesTotWtGrdBlocked ? -1 : 0}
          title={isRopesTotWtGrdBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.ropes_tot_wt_grd || 0}
          onChange={(e) => !isRopesTotWtGrdBlocked && onDetailChange(index, "ropes_tot_wt_grd", Number(e.target.value))}
          className={getFieldInputStyle(isRopesTotWtGrdBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="text"
          readOnly={isRopesGradeBlocked}
          tabIndex={isRopesGradeBlocked ? -1 : 0}
          title={isRopesGradeBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.ropes_grade || ""}
          onChange={(e) => !isRopesGradeBlocked && onDetailChange(index, "ropes_grade", e.target.value)}
          className={getFieldInputStyle(isRopesGradeBlocked)}
        />
      </td>

      {/* Chotta & Habi Jabi */}
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isChottaWeightBlocked}
          tabIndex={isChottaWeightBlocked ? -1 : 0}
          title={isChottaWeightBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.chotta_weight || 0}
          onChange={(e) => !isChottaWeightBlocked && onDetailChange(index, "chotta_weight", Number(e.target.value))}
          className={getFieldInputStyle(isChottaWeightBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="number"
          step="0.01"
          readOnly={isChottaTotWtGrdBlocked}
          tabIndex={isChottaTotWtGrdBlocked ? -1 : 0}
          title={isChottaTotWtGrdBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.chotta_tot_wt_grd || 0}
          onChange={(e) => !isChottaTotWtGrdBlocked && onDetailChange(index, "chotta_tot_wt_grd", Number(e.target.value))}
          className={getFieldInputStyle(isChottaTotWtGrdBlocked)}
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="text"
          readOnly={isChottaGradeBlocked}
          tabIndex={isChottaGradeBlocked ? -1 : 0}
          title={isChottaGradeBlocked ? "Auto-populated (Manual edit blocked)" : undefined}
          value={row.chotta_grade || ""}
          onChange={(e) => !isChottaGradeBlocked && onDetailChange(index, "chotta_grade", e.target.value)}
          className={getFieldInputStyle(isChottaGradeBlocked)}
        />
      </td>

      {/* Tolerable */}
      {/* <td className="p-1.5 border-r border-slate-200">
        <select
          value={row.tolerable || "Yes"}
          onChange={(e) => onDetailChange(index, "tolerable", e.target.value)}
          className="w-full border border-slate-300 rounded px-1.5 py-1 text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </td> */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <input
          type="checkbox"
          checked={row.tolerable === "Yes"}
          onChange={(e) =>
            onDetailChange(index, "tolerable", e.target.checked ? "Yes" : "No")
          }
          className="h-4 w-4 cursor-pointer accent-blue-600"
        />
      </td>

      {/* Premium (Manual Input / Qty in MT) */}
      <td className="p-1.5 border-r border-slate-200 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 w-full">
            <input
              type="text"
              value={row.premium !== undefined && row.premium !== null ? row.premium : (row.is_premium ? "Yes" : "")}
              onChange={(e) => {
                const val = e.target.value;
                onDetailChange(index, "premium", val);
                if (val.trim() !== "" && val.toLowerCase() !== "no") {
                  onDetailChange(index, "is_premium", true);
                } else {
                  onDetailChange(index, "is_premium", false);
                }
              }}
              placeholder={`e.g. 1.000 (Max ${calculateQtyInMt(row).toFixed(3)})`}
              className="w-full border border-slate-300 rounded px-1.5 py-1 text-xs bg-amber-50/40 font-bold text-amber-950 text-center"
              title="Enter numeric MT premium value or Yes (defaults to max available)"
            />
            <button
              type="button"
              onClick={() => {
                const maxMt = calculateQtyInMt(row).toFixed(3);
                const currentPrem = getPremiumMt(row);
                const isFull = currentPrem >= Number(maxMt);
                if (isFull) {
                  onDetailChange(index, "premium", "");
                  onDetailChange(index, "is_premium", false);
                } else {
                  onDetailChange(index, "premium", maxMt);
                  onDetailChange(index, "is_premium", true);
                  onDetailChange(index, "unit", "M.T.");
                }
              }}
              className={`p-1 rounded text-xs transition-all cursor-pointer shrink-0 ${
                getPremiumMt(row) > 0
                  ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                  : "bg-slate-100 hover:bg-amber-100 text-slate-600"
              }`}
              title="Click to fill Max Available MT Premium"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
          {getPremiumMt(row) > 0 && (
            <span className="text-[10px] font-mono font-black text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-inner whitespace-nowrap flex items-center gap-1">
              <span>{getPremiumMt(row).toFixed(3)} MT</span>
              <span className="text-[8px] text-slate-500 font-normal">/ {calculateQtyInMt(row).toFixed(3)} max</span>
            </span>
          )}
        </div>
      </td>

      {/* Amount (₹) */}
      <td className="p-1.5 border-r border-slate-200 text-center min-w-[125px]">
        <div className="flex flex-col items-center gap-1">
          <div className="relative w-full">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
            <input
              type="number"
              step="0.01"
              value={row.amount !== undefined && row.amount !== null ? row.amount : (calculateRowAmount(row) > 0 ? calculateRowAmount(row) : "")}
              onChange={(e) => onDetailChange(index, "amount", parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full border border-slate-300 rounded pl-5 pr-2 py-1 text-xs bg-amber-50/20 font-mono font-bold text-slate-900 text-right focus:ring-1 focus:ring-blue-500"
              title="Amount in ₹"
            />
          </div>
          {calculateRowAmount(row) > 0 && (!row.amount || Number(row.amount) === calculateRowAmount(row)) && (
            <span className="text-[9px] font-mono text-emerald-700 font-bold">
              ₹{calculateRowAmount(row).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </td>

      {/* Remarks */}
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="text"
          value={row.row_remarks || ""}
          onChange={(e) => onDetailChange(index, "row_remarks", e.target.value)}
          className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
          placeholder="Row remarks..."
        />
      </td>
      <td className="p-1.5 border-r border-slate-200">
        <input
          type="text"
          value={row.jqi_remarks || ""}
          onChange={(e) => onDetailChange(index, "jqi_remarks", e.target.value)}
          className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
          placeholder="JCI remarks..."
        />
      </td>

      {/* Row Actions Cell (Unfrozen, Delete Only) */}
      <td className="p-2 text-center border-l border-slate-200">
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => onDeleteRow(index)}
            className="p-1.5 bg-rose-100 hover:bg-rose-200 active:scale-95 text-rose-800 rounded text-xs font-bold cursor-pointer transition-all"
            title="Delete Row"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});
