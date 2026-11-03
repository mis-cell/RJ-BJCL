import React from "react";
import { SettlementMaster, SettlementDeductionItem } from "../../types/settlement.types";

export interface SettlementDeductionsTableProps {
  masterData: SettlementMaster;
}

export const SettlementDeductionsTable: React.FC<SettlementDeductionsTableProps> = ({ masterData }) => {
  let deds: SettlementDeductionItem[] = [];
  if (Array.isArray(masterData.deductions) && masterData.deductions.length > 0) {
    deds = masterData.deductions;
  } else if (typeof (masterData.deductions as any) === "string" && (masterData.deductions as any).trim() !== "") {
    try {
      const parsed = JSON.parse(masterData.deductions as any);
      if (Array.isArray(parsed) && parsed.length > 0) deds = parsed;
    } catch (e) {}
  }

  if (deds.length === 0) {
    const dType = masterData.summary_deduction_type || "";
    const dRate = Number(masterData.summary_deduction_rate) || 0;
    const dQty = Number(masterData.summary_deduction_qty) || (dRate > 0 ? 1 : 0);
    const dAmt = Number(masterData.summary_deduction_amount) || dRate * dQty;

    if (dType.includes("\n") || dType.includes(",") || dType.includes(";")) {
      const parts = dType.split(/[\n,;]+/).map((s: string) => s.trim()).filter(Boolean);
      deds = parts.map((part: string, idx: number) => {
        let rowRate = 0;
        let rowQty = 1;
        let rowAmt = 0;
        const amtMatch = part.match(/₹\s*([0-9.]+)/i);
        const rateMatch = part.match(/@\s*₹?\s*([0-9.]+)/i) || part.match(/₹\s*([0-9.]+)/i);
        const qtyMatch = part.match(/([0-9.]+)\s*@/i) || part.match(/([0-9.]+)\s*(?:bales|units|nos|qntl)/i);
        if (amtMatch) rowAmt = parseFloat(amtMatch[1]) || 0;
        if (rateMatch) rowRate = parseFloat(rateMatch[1]) || 0;
        if (qtyMatch) rowQty = parseFloat(qtyMatch[1]) || 1;
        if (rowAmt === 0 && rowRate > 0) rowAmt = rowRate * rowQty;
        const cleanType = part.replace(/\(.*\)/g, "").replace(/@.*/g, "").replace(/₹.*/g, "").trim() || part;
        return {
          deduction_type: cleanType,
          deduction_rate: rowRate || (idx === 0 ? dRate : 0),
          deduction_qty: rowQty || (idx === 0 ? dQty : 1),
          deduction_amount: rowAmt || (idx === 0 ? dAmt : 0),
        };
      });
    } else if (dType && !dType.includes("-- SELECT") && (dRate > 0 || dAmt > 0)) {
      deds = [
        {
          deduction_type: dType,
          deduction_rate: dRate,
          deduction_qty: dQty || 1,
          deduction_amount: dAmt || dRate * (dQty || 1),
        },
      ];
    }
  }

  return (
    <div className="flex flex-col col-span-2 space-y-1">
      <div className="border border-[#cbd5e1] rounded-lg overflow-hidden bg-white shadow-xs">
        <table className="w-full text-xs text-left border-collapse font-sans">
          <thead>
            <tr className="bg-[#eef3f9] border-b-2 border-[#2563eb] text-[11px] font-black uppercase text-slate-800 tracking-wider">
              <th className="py-2.5 px-4 border-r border-[#cbd5e1] text-left w-7/12">
                DEDUCTION TYPE
              </th>
              <th className="py-2.5 px-4 border-r border-[#cbd5e1] text-center w-3/12">
                DEDUCTION RATE (₹)
              </th>
              <th className="py-2.5 px-4 text-center w-2/12">QTY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#cbd5e1]">
            {deds.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-3.5 px-4 text-center text-xs font-semibold text-slate-400 italic bg-slate-50/40">
                  No Deductions or Penalties Applied (₹0.00)
                </td>
              </tr>
            ) : (
              deds.map((dItem, dIdx) => {
                const rate = Number(dItem.deduction_rate) || 0;
                const qty = Number(dItem.deduction_qty) || (rate > 0 ? 1 : 0);
                return (
                  <tr key={dIdx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 border-r border-[#cbd5e1] font-bold text-xs text-slate-900 uppercase">
                      {dItem.deduction_type || "-"}
                    </td>
                    <td className="py-3 px-4 border-r border-[#cbd5e1] text-center font-mono font-bold text-xs text-slate-900">
                      ₹{rate}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-xs text-slate-900">
                      {qty}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettlementDeductionsTable;
