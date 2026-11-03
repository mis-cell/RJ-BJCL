import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface SattaUploadSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: string) => void;
}

export function SattaUploadSuccessModal({
  isOpen,
  onClose,
  onNavigate,
}: SattaUploadSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-emerald-500 space-y-4 text-slate-800 animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 border-2 border-emerald-400 rounded-2xl flex items-center justify-center text-emerald-700 shadow-inner">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-emerald-300">
              Step 1 Complete
            </span>
            <h3 className="text-base font-black uppercase tracking-tight text-emerald-950 mt-0.5">
              Satta Chart Uploaded Successfully
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          The required <strong>Satta Chart</strong> differentials have been saved to Supabase and verified. You may now proceed directly to <strong>NEW SAUDA CONTRACT ENTRY</strong>.
        </p>

        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 text-[11px] text-emerald-900 space-y-1">
          <div className="flex justify-between font-bold">
            <span>Active Status:</span>
            <span className="text-emerald-700 font-extrabold">Verified & Published</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Next Allowed Operation:</span>
            <span className="text-slate-900 font-extrabold">New Sauda Contract Entry</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onNavigate) {
                onNavigate('sauda_entry');
              } else {
                window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'sauda_entry' } }));
              }
            }}
            className="flex-1 bg-[#F7AFA8] hover:bg-[#1f633a] text-amber-300 font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <span>Proceed to NEW SAUDA CONTRACT ENTRY</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Stay on Chart
          </button>
        </div>
      </div>
    </div>
  );
}
