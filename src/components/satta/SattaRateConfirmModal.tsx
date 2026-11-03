import React from 'react';
import { AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { formatDateDMY } from './sattaConstants';

interface SattaRateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseRate: number;
  latestRateRecord: any | null;
  startDate: string;
  remarks: string;
  duplicateCheckResult: {
    hasDuplicate: boolean;
    count?: number;
  };
  onExecuteRateUpdate: () => void;
}

export function SattaRateConfirmModal({
  isOpen,
  onClose,
  baseRate,
  latestRateRecord,
  startDate,
  remarks,
  duplicateCheckResult,
  onExecuteRateUpdate,
}: SattaRateConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
      <div className="bg-white border-4 border-[#F7AFA8] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-sans">
        <div className="flex items-center gap-3 border-b pb-3 border-slate-200">
          <AlertCircle className="h-6 w-6 text-[#D94B5A]" />
          <h3 className="text-sm font-black uppercase text-[#D94B5A] tracking-wider">Confirm Published Rate Schedule</h3>
        </div>

        <div className="bg-[#FDE7E6] p-3.5 rounded-xl border border-slate-300 font-mono text-xs space-y-2 uppercase">
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Proposed Base Rate:</span>
            <span className="font-black text-[#D94B5A]">₹{baseRate.toLocaleString()}</span>
          </div>
          {latestRateRecord && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Current Base Rate:</span>
              <span className="font-bold text-slate-600">₹{Number(latestRateRecord.base_rate).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Effective Date:</span>
            <span className="font-black text-[#D94B5A]">{formatDateDMY(startDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Audit Note:</span>
            <span className="font-bold text-slate-700 truncate max-w-[140px]">"{remarks}"</span>
          </div>
        </div>

        {duplicateCheckResult.hasDuplicate ? (
          <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-amber-950 text-xs font-medium">
            ⚠️ Existing records exist on {formatDateDMY(startDate)}. Proceeding will replace previous logs on this date to prevent duplicates.
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-emerald-950 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Validation Passed! Ready to calculate matrix.</span>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 text-xs font-extrabold uppercase">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExecuteRateUpdate}
            className="px-4 py-2 bg-[#D94B5A] text-white rounded-xl shadow hover:bg-[#D94B5A] flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="h-4 w-4 text-[#FDE7E6]" />
            <span>Publish Schedule</span>
          </button>
        </div>
      </div>
    </div>
  );
}
