import React from "react";
import { X, Calculator, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

export function StockRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-white border border-gray-300 p-1.5 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)] ">
      <span className="text-[10px] font-extrabold text-gray-600 uppercase italic">{label}</span>
      <span className="text-xl font-black font-sans tabular-nums text-slate-800">{value}</span>
    </div>
  );
}

export interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveStock: {
    jute: number;
    tossa: number;
    btwill: number;
    estValue: number;
  };
  entries: any[];
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  liveStock,
  entries,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
      <div className="bg-[#FBCFCB] border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.35)] w-full max-w-2xl rounded-sm p-4">
        <div className="flex justify-between items-center pb-2 border-b-2 border-gray-400 mb-4 text-slate-800">
          <div className="flex items-center gap-1.5 font-bold">
            <Calculator className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-wide">
              Dynamic Stock Valuation & Ledger Balances
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-black hover:bg-slate-100 p-1 border border-slate-350 bg-[#FBCFCB]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-3 border border-slate-350 rounded-sm">
            <h4 className="text-[10px] font-extrabold uppercase italic tracking-wide text-indigo-950 mb-2 border-b pb-1">
              Stock Breakdown & Constants
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-indigo-50 border border-indigo-200 p-2">
                <span className="text-[8px] font-bold text-indigo-700 block uppercase">Jute Bales</span>
                <span className="text-sm font-sans font-black text-slate-800">
                  {liveStock.jute.toLocaleString("en-IN")} Bags
                </span>
                <span className="text-[8px] text-gray-500 block font-bold mt-1">
                  Est ₹{(liveStock.jute * 180).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-2">
                <span className="text-[8px] font-bold text-emerald-700 block uppercase">Tossa Bags</span>
                <span className="text-sm font-sans font-black text-slate-800">
                  {liveStock.tossa.toLocaleString("en-IN")} Bags
                </span>
                <span className="text-[8px] text-gray-500 block font-bold mt-1">
                  Est ₹{(liveStock.tossa * 150).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2">
                <span className="text-[8px] font-bold text-amber-700 block uppercase">B-Twill Bags</span>
                <span className="text-sm font-sans font-black text-slate-800">
                  {liveStock.btwill.toLocaleString("en-IN")} Bags
                </span>
                <span className="text-[8px] text-gray-500 block font-bold mt-1">
                  Est ₹{(liveStock.btwill * 110).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 border border-slate-350 rounded-sm">
              <h4 className="text-[10px] font-extrabold uppercase italic tracking-wide text-indigo-950 mb-2 border-b pb-1">
                Ledger Aggregate Metrics
              </h4>
              <div className="space-y-1.5 text-xs text-slate-800 font-bold">
                <div className="flex justify-between">
                  <span>Total Records:</span>
                  <span className="font-mono text-indigo-900">{entries.length} Entries</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Quantities Added (Return):</span>
                  <span className="font-mono text-emerald-900">
                    +
                    {entries
                      .filter((e) => e.voucher_type === "return")
                      .reduce((s, e) => s + (e.quantity || 0), 0)
                      .toLocaleString("en-IN")}{" "}
                    Bags
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Quantities Issued:</span>
                  <span className="font-mono text-rose-900">
                    -
                    {entries
                      .filter((e) => e.voucher_type === "issue")
                      .reduce((s, e) => s + (e.quantity || 0), 0)
                      .toLocaleString("en-IN")}{" "}
                    Bags
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Quantities Transferred:</span>
                  <span className="font-mono text-blue-900">
                    {entries
                      .filter((e) => e.voucher_type === "transfer")
                      .reduce((s, e) => s + (e.quantity || 0), 0)
                      .toLocaleString("en-IN")}{" "}
                    Bags
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-3 border border-slate-350 rounded-sm flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-extrabold uppercase italic tracking-wide text-indigo-950 mb-2 border-b pb-1">
                  Combined Godown Asset Estimate
                </h4>
                <p className="text-[9px] font-bold text-gray-400 leading-relaxed uppercase">
                  This reflects active standard material metrics computed relative to standard baseline margins inside designated warehouses.
                </p>
              </div>
              <div className="text-right border-t pt-2 mt-2">
                <span className="text-[9px] font-black uppercase tracking-tight block text-slate-400">
                  Total Net Inventory Valuation
                </span>
                <span className="text-2xl font-sans font-black text-indigo-950 italic">
                  ₹ {Math.round(liveStock.estValue).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-950 hover:bg-slate-900 text-white border border-indigo-900 px-4 py-1.5 text-[10px] uppercase font-bold tracking-tight rounded-sm cursor-pointer shadow-sm"
          >
            Confirm & Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export interface BulkTransferWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  godowns: any[];
  bulkSourceCode: string;
  setBulkSourceCode: (val: string) => void;
  bulkDestCode: string;
  setBulkDestCode: (val: string) => void;
  bulkItemType: string;
  setBulkItemType: (val: string) => void;
  bulkQty: number;
  setBulkQty: (val: number) => void;
  bulkRate: number;
  setBulkRate: (val: number) => void;
  bulkOperator: string;
  setBulkOperator: (val: string) => void;
  bulkNarration: string;
  setBulkNarration: (val: string) => void;
  onAssessImpact: () => void;
}

export const BulkTransferWizardModal: React.FC<BulkTransferWizardModalProps> = ({
  isOpen,
  onClose,
  godowns,
  bulkSourceCode,
  setBulkSourceCode,
  bulkDestCode,
  setBulkDestCode,
  bulkItemType,
  setBulkItemType,
  bulkQty,
  setBulkQty,
  bulkRate,
  setBulkRate,
  bulkOperator,
  setBulkOperator,
  bulkNarration,
  setBulkNarration,
  onAssessImpact,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
      <div className="bg-[#FBCFCB] border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.35)] w-full max-w-lg rounded-sm p-4">
        <div className="flex justify-between items-center pb-2 border-b-2 border-gray-400 mb-4 text-slate-800">
          <div className="flex items-center gap-1.5 font-bold">
            <ArrowLeftRight className="h-5 w-5 text-indigo-900" />
            <span className="text-xs font-black uppercase tracking-wide">
              Bulk Inter-Godown Transfer Wizard
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-black hover:bg-slate-100 p-1 border border-slate-350 bg-[#FBCFCB]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="source_godown_modal" className="text-[9.5px] font-bold text-gray-600 uppercase">
                Source Godown
              </label>
              <select
                id="source_godown_modal"
                name="source_godown"
                aria-label="Source Godown"
                className="w-full bg-white border border-gray-400 p-1 text-xs font-bold outline-none uppercase"
                value={bulkSourceCode}
                onChange={(e) => setBulkSourceCode(e.target.value)}
              >
                {godowns.map((g) => (
                  <option key={g.gdn_code} value={g.gdn_code}>
                    {g.gdn_name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="destination_godown_modal" className="text-[9.5px] font-bold text-gray-600 uppercase">
                Destination Godown
              </label>
              <select
                id="destination_godown_modal"
                name="destination_godown"
                aria-label="Destination Godown"
                className="w-full bg-white border border-gray-400 p-1 text-xs font-bold outline-none uppercase"
                value={bulkDestCode}
                onChange={(e) => setBulkDestCode(e.target.value)}
              >
                {godowns.map((g) => (
                  <option key={g.gdn_code} value={g.gdn_code}>
                    {g.gdn_name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="material_item_type_modal" className="text-[9.5px] font-bold text-gray-600 uppercase">
                Material Item Type
              </label>
              <select
                id="material_item_type_modal"
                name="material_item_type"
                aria-label="Material Item Type"
                className="w-full bg-white border border-gray-400 p-1 text-xs font-bold outline-none"
                value={bulkItemType}
                onChange={(e) => setBulkItemType(e.target.value)}
              >
                <option value="Jute Bales">Jute Bales</option>
                <option value="Tossa Bags">Tossa Bags</option>
                <option value="B-Twill Bags">B-Twill Bags</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="quantity_bags_modal" className="text-[9.5px] font-bold text-gray-600 uppercase">
                Quantity (Bags)
              </label>
              <input
                id="quantity_bags_modal"
                name="quantity_bags"
                aria-label="Quantity (Bags)"
                type="number"
                min="1"
                className="w-full bg-white border border-gray-400 p-1 text-xs font-bold outline-none text-right"
                value={bulkQty}
                onChange={(e) => setBulkQty(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="est_rate_modal" className="text-[9.5px] font-bold text-gray-600 uppercase">
                Est. Rate per Pc
              </label>
              <input
                id="est_rate_modal"
                name="est_rate_per_pc"
                aria-label="Est. Rate per Pc"
                type="number"
                step="0.01"
                className="w-full bg-white border border-gray-400 p-1 text-xs font-bold outline-none text-right"
                value={bulkRate}
                onChange={(e) => setBulkRate(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="responsible_operator_modal" className="text-[9.5px] font-bold text-gray-600 uppercase">
                Responsible Operator ID
              </label>
              <input
                id="responsible_operator_modal"
                name="responsible_operator_id"
                aria-label="Responsible Operator ID"
                type="text"
                className="w-full bg-[#ffffd0] border border-gray-400 p-1 text-xs font-bold outline-none"
                value={bulkOperator}
                onChange={(e) => setBulkOperator(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="narration_modal" className="text-[9.5px] font-bold text-gray-600 uppercase">
              Narration / Internal Remarks
            </label>
            <textarea
              id="narration_modal"
              name="narration_internal_remark"
              aria-label="Narration / Internal Remarks"
              rows={2}
              className="w-full bg-white border border-gray-400 p-1 text-xs outline-none uppercase font-semibold text-[#000]"
              value={bulkNarration}
              onChange={(e) => setBulkNarration(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-1.5 font-sans">
          <button
            type="button"
            onClick={onClose}
            className="bg-neutral-200 border border-slate-400 hover:bg-neutral-300 text-slate-800 font-bold px-4 py-1.5 text-[10px] uppercase rounded-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAssessImpact}
            className="bg-indigo-900 border border-indigo-900 hover:bg-slate-900 text-white font-bold px-4 py-1.5 text-[10px] uppercase rounded-sm cursor-pointer shadow-sm"
          >
            Assess Stock Impact »
          </button>
        </div>
      </div>
    </div>
  );
};
