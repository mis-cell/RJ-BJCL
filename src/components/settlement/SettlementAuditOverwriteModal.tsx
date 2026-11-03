import React from "react";
import { AlertTriangle, Save } from "lucide-react";

export interface SettlementAuditOverwriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  auditOverwriteInfo: {
    activeWeight: number;
    allowedWeight: number;
    selectedPoNo: string;
    targetMrNo?: string;
  } | null;
  fallbackMrNo?: string;
}

export const SettlementAuditOverwriteModal: React.FC<SettlementAuditOverwriteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  auditOverwriteInfo,
  fallbackMrNo,
}) => {
  if (!isOpen || !auditOverwriteInfo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-amber-500 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
            <AlertTriangle className="h-5 w-5 text-white animate-bounce" />
            <span>Audit Block Override Confirmation</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-amber-100 font-bold text-lg leading-none cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-3 text-slate-800 text-xs">
          <div className="bg-amber-50 border border-amber-300 rounded p-3 space-y-1.5">
            <p className="font-bold text-amber-950 text-sm">
              Settlement weight exceeds PO pending received balance limit.
            </p>
            <p className="text-amber-800 text-xs leading-relaxed">
              The calculated pending received limit for this PO is smaller than the current settlement weight. Review the comparative values below:
            </p>
          </div>

          {/* Data comparison grid */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-3 rounded text-xs">
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold block">Purchase Order No:</span>
              <span className="font-mono font-bold text-slate-900">{auditOverwriteInfo.selectedPoNo}</span>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold block">M.R Number:</span>
              <span className="font-mono font-bold text-rose-700">{auditOverwriteInfo.targetMrNo || fallbackMrNo || 'N/A'}</span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="text-gray-500 text-[10px] uppercase font-bold block">Calculated Pending Limit:</span>
              <span className="font-mono font-extrabold text-blue-700 text-sm">{auditOverwriteInfo.allowedWeight.toFixed(3)} MT</span>
            </div>
            <div className="bg-white p-2 rounded border border-amber-300 bg-amber-50/50">
              <span className="text-amber-800 text-[10px] uppercase font-bold block">Current Settlement Weight:</span>
              <span className="font-mono font-extrabold text-rose-700 text-sm">{auditOverwriteInfo.activeWeight.toFixed(3)} MT</span>
            </div>
            <div className="col-span-2 bg-rose-50 border border-rose-200 p-2 rounded flex justify-between items-center">
              <span className="text-rose-800 font-bold text-[11px]">Weight Overage / Excess:</span>
              <span className="font-mono font-black text-rose-900 text-sm">
                +{(auditOverwriteInfo.activeWeight - auditOverwriteInfo.allowedWeight).toFixed(3)} MT
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 bg-slate-100 p-2.5 rounded border border-slate-200 leading-normal">
            <span className="font-bold text-slate-800">Overwrite Authorization Action:</span> Clicking <strong>&quot;Overwrite &amp; Save&quot;</strong> will bypass the audit threshold, finalize the settlement in the database, and mark the associated Purchase Order &amp; Material Arrival records as settled.
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-slate-100 px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel &amp; Review
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black rounded text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? "Saving..." : "Overwrite & Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettlementAuditOverwriteModal;
