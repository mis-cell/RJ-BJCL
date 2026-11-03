import React from 'react';
import { X, Lock, KeyRound, ShieldCheck, AlertCircle, Eye, EyeOff, Unlock } from 'lucide-react';

interface PoReopenModalProps {
  closedNoticePo: any;
  setClosedNoticePo: (po: any) => void;
  reopenAuthModalPo: any;
  setReopenAuthModalPo: (po: any) => void;
  openReopenAuthModal: (po: any) => void;
  reopenUsername: string;
  setReopenUsername: (val: string) => void;
  reopenPassword: string;
  setReopenPassword: (val: string) => void;
  reopenRemarks: string;
  setReopenRemarks: (val: string) => void;
  showReopenPassword: boolean;
  setShowReopenPassword: (val: boolean) => void;
  reopenError: string;
  isReopening: boolean;
  executeReopenSauda: () => void;
}

export const PoReopenModal: React.FC<PoReopenModalProps> = ({
  closedNoticePo,
  setClosedNoticePo,
  reopenAuthModalPo,
  setReopenAuthModalPo,
  openReopenAuthModal,
  reopenUsername,
  setReopenUsername,
  reopenPassword,
  setReopenPassword,
  reopenRemarks,
  setReopenRemarks,
  showReopenPassword,
  setShowReopenPassword,
  reopenError,
  isReopening,
  executeReopenSauda
}) => {
  return (
    <>
      {/* 1. Closed Notice Modal */}
      {closedNoticePo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center border border-amber-400/30">
                  <Lock className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-white">Sauda is Closed</h3>
                  <p className="text-[11px] text-slate-300 font-mono">Sauda #{closedNoticePo.po_no}</p>
                </div>
              </div>
              <button 
                onClick={() => setClosedNoticePo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">This Sauda is currently CLOSED.</p>
                  <p className="text-amber-800 leading-relaxed">
                    Closed Saudas cannot be edited or modified. To make changes or add lorry arrivals, this Sauda must first be Reopened with Admin or Super User authorization.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Sauda / P.O No:</span>
                  <span className="font-mono font-bold text-slate-800">#{closedNoticePo.po_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Broker:</span>
                  <span className="font-semibold text-slate-800 uppercase">{closedNoticePo.broker || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Contract MT:</span>
                  <span className="font-mono font-bold text-slate-800">{parseFloat(closedNoticePo.total_contract_mt || 0).toFixed(3)} MT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Lorries:</span>
                  <span className="font-semibold text-slate-800">{closedNoticePo.received_lorries ?? 0} of {closedNoticePo.contract_lorries || 1} Received</span>
                </div>
              </div>

              <p className="text-center text-xs font-semibold text-slate-700">
                Would you like to Reopen this Sauda?
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClosedNoticePo(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  No, Keep Closed
                </button>
                <button
                  type="button"
                  onClick={() => openReopenAuthModal(closedNoticePo)}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Yes, Reopen Sauda</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Reopen Authorization Modal */}
      {reopenAuthModalPo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-white">Reopen Sauda Authorization</h3>
                  <p className="text-[11px] text-emerald-200 font-mono">Sauda #{reopenAuthModalPo.po_no}</p>
                </div>
              </div>
              <button 
                onClick={() => setReopenAuthModalPo(null)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form 
              onSubmit={(e) => { e.preventDefault(); executeReopenSauda(); }}
              className="p-5 space-y-4"
            >
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Admin / Super User Authorization Required</span>
                </div>
                <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                  Enter Admin or Super User credentials and provide mandatory remarks. This action will be permanently recorded in Supabase under <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[10.5px]">open_remarks</code> with full audit trail.
                </p>
              </div>

              {reopenError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{reopenError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Authorized User / Admin Username
                  </label>
                  <input
                    type="text"
                    value={reopenUsername}
                    onChange={(e) => setReopenUsername(e.target.value)}
                    placeholder="Enter Admin username (e.g., ADMIN)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Admin / Super User Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showReopenPassword ? "text" : "password"}
                      value={reopenPassword}
                      onChange={(e) => setReopenPassword(e.target.value)}
                      placeholder="Enter Admin Password (e.g. Admin@1234)"
                      autoFocus
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowReopenPassword(!showReopenPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showReopenPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Reason / Remarks for Reopening <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reopenRemarks}
                    onChange={(e) => setReopenRemarks(e.target.value)}
                    placeholder="State reason for reopening this Sauda..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReopenAuthModalPo(null)}
                  disabled={isReopening}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReopening}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isReopening ? (
                    <span>Authorizing & Reopening...</span>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Authorize & Reopen Sauda</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
