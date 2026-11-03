import React from "react";
import { AlertTriangle } from "lucide-react";

interface SettlementDeleteModalProps {
  mrNo: string | null;
  onClose: () => void;
  onConfirm: (mrNo: string) => void;
}

export const SettlementDeleteModal: React.FC<SettlementDeleteModalProps> = ({
  mrNo,
  onClose,
  onConfirm,
}) => {
  if (!mrNo) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border-2 border-rose-500 rounded-xl shadow-2xl max-w-md w-full overflow-hidden font-sans">
        <div className="bg-[#D94B5A] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-200" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              Confirm Settlement Deletion
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-sm font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-700 font-semibold leading-relaxed">
            Are you sure you want to permanently delete the Settlement record for M.R. No.{" "}
            <span className="font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {mrNo}
            </span>
            ?
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(mrNo)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettlementDeleteModal;
