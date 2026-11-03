import React from 'react';
import { 
  CheckCircle2, 
  X, 
  Lock, 
  RefreshCcw, 
  Clock, 
  FileText, 
  Printer, 
  History, 
  Edit 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Sauda } from '../../types';
import SaudaPrintSlip from '../SaudaPrintSlip';

interface SaudaApprovalModalProps {
  approvingSauda: Sauda | null;
  onClose: () => void;
  onConfirmApprove: () => void;
  isApprovingLoading: boolean;
}

export function SaudaApprovalModal({
  approvingSauda,
  onClose,
  onConfirmApprove,
  isApprovingLoading
}: SaudaApprovalModalProps) {
  if (!approvingSauda) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-black">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Confirm Sauda Approval</h3>
              <p className="text-xs text-slate-500 font-medium">User 010 – Final Checker & Approver Review</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contract Summary Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sauda Order No</span>
              <span className="text-sm font-black text-slate-900">#{approvingSauda.sauda_no}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contract Date</span>
              <span className="font-bold text-slate-800">{new Date(approvingSauda.date).toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Broker</span>
              <span className="font-extrabold text-slate-800 truncate block">{approvingSauda.broker}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supplier</span>
              <span className="font-extrabold text-slate-800 truncate block">{approvingSauda.supplier}</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Wt</span>
              <span className="font-black text-slate-900 font-mono">{Number(approvingSauda.total_wt_in_ton || 0).toFixed(3)} MT</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Basic Rate</span>
              <span className="font-black text-rose-700 font-mono">₹{Number(approvingSauda.b_rate || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Maker ID</span>
              <span className="font-black text-indigo-700">{approvingSauda.submitted_by || approvingSauda.user_id || 'User 002'}</span>
            </div>
          </div>

          {approvingSauda.resubmission_count && approvingSauda.resubmission_count > 0 ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-[11px] font-bold text-indigo-900 flex items-center justify-between">
              <span>Resubmission Cycle:</span>
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-mono text-xs">
                Version {(approvingSauda.resubmission_count || 0) + 1}
              </span>
            </div>
          ) : null}
        </div>

        {/* Permanent Lock Warning Callout */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5">
          <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-950 font-medium leading-relaxed">
            <span className="font-extrabold uppercase tracking-wide text-amber-900 block mb-0.5">
              Permanent Lock Warning:
            </span>
            Once confirmed, this Sauda entry will be <strong className="font-black underline">permanently locked</strong> against editing, deletion, or resubmission by all application users (including User 002, User 010, and Admin).
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isApprovingLoading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmApprove}
            disabled={isApprovingLoading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isApprovingLoading ? (
              <>
                <RefreshCcw className="h-4 w-4 animate-spin" />
                <span>Approving & Locking...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-amber-300" />
                <span>Confirm Final Approval</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SaudaRejectionModalProps {
  rejectingSauda: Sauda | null;
  onClose: () => void;
  onConfirmReject: () => void;
  isRejectingLoading: boolean;
  rejectionRemarksInput: string;
  setRejectionRemarksInput: (val: string) => void;
  rejectionError: string | null;
  setRejectionError: (val: string | null) => void;
}

export function SaudaRejectionModal({
  rejectingSauda,
  onClose,
  onConfirmReject,
  isRejectingLoading,
  rejectionRemarksInput,
  setRejectionRemarksInput,
  rejectionError,
  setRejectionError,
}: SaudaRejectionModalProps) {
  if (!rejectingSauda) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-800 rounded-xl font-black">
              <X className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Reject Sauda Entry</h3>
              <p className="text-xs text-slate-500 font-medium">Return entry to User 002 for necessary corrections</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Target Entry Summary */}
        <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 text-xs flex justify-between items-center">
          <div>
            <span className="font-extrabold text-slate-900 block">Sauda #{rejectingSauda.sauda_no}</span>
            <span className="text-slate-500 text-[11px]">{rejectingSauda.broker} • {rejectingSauda.supplier}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Maker</span>
            <span className="font-extrabold text-indigo-700">{rejectingSauda.submitted_by || 'User 002'}</span>
          </div>
        </div>

        {/* Mandatory Rejection Remarks Textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-slate-900 flex items-center justify-between">
            <span>Rejection Remarks (Mandatory) *</span>
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">Required for User 002</span>
          </label>
          <textarea
            rows={4}
            value={rejectionRemarksInput}
            onChange={(e) => {
              setRejectionRemarksInput(e.target.value);
              if (rejectionError) setRejectionError(null);
            }}
            placeholder="Explain clearly what needs correction (e.g. incorrect rate ₹14,200 instead of ₹14,000, supplier name mismatch, delivery date out of range)..."
            className={cn(
              "w-full bg-slate-50 border rounded-xl p-3 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white",
              rejectionError
                ? "border-rose-500 focus:ring-2 focus:ring-rose-200"
                : "border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            )}
          />
          {rejectionError && (
            <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-0.5">
              <span>⚠</span>
              <span>{rejectionError}</span>
            </p>
          )}
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            These remarks will be displayed to User 002 in their Sauda Entry form so they can make the appropriate corrections and resubmit.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isRejectingLoading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmReject}
            disabled={isRejectingLoading}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isRejectingLoading ? (
              <>
                <RefreshCcw className="h-4 w-4 animate-spin" />
                <span>Rejecting Entry...</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                <span>Confirm Rejection & Return</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SaudaDetailsModalProps {
  viewingDetailsSauda: Sauda | null;
  onClose: () => void;
  isUser10: boolean;
  isUser2: boolean;
  isUserAdmin: () => boolean;
  handlePrint: (s: Sauda) => void;
  setAuditRecordId: (id?: string) => void;
  setAuditModalOpen: (open: boolean) => void;
  handleEdit: (s: Sauda) => void;
  handleMarkCheck: (s: Sauda) => void;
  handleMarkReject: (s: Sauda) => void;
  isApprovedSauda: (s: Sauda) => boolean;
  isRejectedSauda: (s: Sauda) => boolean;
  isDraftSauda: (s: Sauda) => boolean;
  isPendingUncheckedSauda: (s: Sauda) => boolean;
}

export function SaudaDetailsModal({
  viewingDetailsSauda,
  onClose,
  isUser10,
  isUser2,
  isUserAdmin,
  handlePrint,
  setAuditRecordId,
  setAuditModalOpen,
  handleEdit,
  handleMarkCheck,
  handleMarkReject,
  isApprovedSauda,
  isRejectedSauda,
  isDraftSauda,
  isPendingUncheckedSauda,
}: SaudaDetailsModalProps) {
  if (!viewingDetailsSauda) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 flex justify-between items-center shrink-0 border-b border-slate-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black !text-white">Sauda Contract Details – #{viewingDetailsSauda.sauda_no}</h3>
              <p className="text-xs text-slate-300 font-medium">
                Date: {new Date(viewingDetailsSauda.date).toLocaleDateString('en-GB')} • Session: {viewingDetailsSauda.session || '-'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/60">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Approval Status:</span>
              {isApprovedSauda(viewingDetailsSauda) ? (
                <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Approved (Permanently Locked)</span>
                  <Lock className="w-3.5 h-3.5 text-emerald-200" />
                </span>
              ) : isRejectedSauda(viewingDetailsSauda) ? (
                <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1">
                  <X className="w-3.5 h-3.5" />
                  <span>Rejected</span>
                </span>
              ) : isDraftSauda(viewingDetailsSauda) ? (
                <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-slate-200 text-slate-800 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Draft (Not Submitted)</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Pending Approval (User 010 Review)</span>
                </span>
              )}
            </div>

            {viewingDetailsSauda.resubmission_count && viewingDetailsSauda.resubmission_count > 0 ? (
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
                Resubmitted (Version {(viewingDetailsSauda.resubmission_count || 0) + 1})
              </span>
            ) : null}
          </div>

          {/* Rejection Remarks Callout (if rejected) */}
          {isRejectedSauda(viewingDetailsSauda) && viewingDetailsSauda.rejection_remarks && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 text-rose-950 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-900 uppercase tracking-wide">
                <X className="w-4 h-4 text-rose-600" />
                <span>Rejection Remarks from User 010 (Checker):</span>
              </div>
              <p className="text-xs font-bold pl-5 leading-relaxed bg-white/70 p-2 rounded-lg border border-rose-200">
                "{viewingDetailsSauda.rejection_remarks}"
              </p>
            </div>
          )}

          {/* Full Print Slip Preview */}
          <SaudaPrintSlip sauda={viewingDetailsSauda} isPreview={true} />

          {/* Workflow Audit Details */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 shadow-2xs">
            <div>
              <span className="font-bold block text-slate-400 uppercase text-[9px]">Maker (User ID)</span>
              <span className="font-extrabold text-slate-800">{viewingDetailsSauda.submitted_by || viewingDetailsSauda.user_id || 'User 002'}</span>
            </div>
            <div>
              <span className="font-bold block text-slate-400 uppercase text-[9px]">Submitted At</span>
              <span className="font-medium text-slate-700">
                {viewingDetailsSauda.submitted_at ? new Date(viewingDetailsSauda.submitted_at).toLocaleString('en-GB') : '-'}
              </span>
            </div>
            <div>
              <span className="font-bold block text-slate-400 uppercase text-[9px]">Checker / Approver</span>
              <span className="font-extrabold text-slate-800">{viewingDetailsSauda.approved_by || viewingDetailsSauda.checked_by || viewingDetailsSauda.rejected_by || '-'}</span>
            </div>
            <div>
              <span className="font-bold block text-slate-400 uppercase text-[9px]">Approved / Reviewed At</span>
              <span className="font-medium text-slate-700">
                {viewingDetailsSauda.approved_at
                  ? new Date(viewingDetailsSauda.approved_at).toLocaleString('en-GB')
                  : viewingDetailsSauda.rejected_at
                    ? new Date(viewingDetailsSauda.rejected_at).toLocaleString('en-GB')
                    : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-3.5 border-t border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrint(viewingDetailsSauda)}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuditRecordId(viewingDetailsSauda.sauda_id || viewingDetailsSauda.sauda_no);
                setAuditModalOpen(true);
              }}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <History className="h-4 w-4 text-slate-600" />
              <span>Audit History</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isRejectedSauda(viewingDetailsSauda) && (isUser2 || isUserAdmin()) && (
              <button
                type="button"
                onClick={() => {
                  const target = viewingDetailsSauda;
                  onClose();
                  handleEdit(target);
                }}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit className="h-4 w-4" />
                <span>Edit & Resubmit</span>
              </button>
            )}

            {isUser10 && isPendingUncheckedSauda(viewingDetailsSauda) && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingDetailsSauda;
                    onClose();
                    handleMarkReject(target);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingDetailsSauda;
                    onClose();
                    handleMarkCheck(target);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 text-amber-300" />
                  <span>Approve</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
