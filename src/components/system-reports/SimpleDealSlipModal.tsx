import React from 'react';
import { X, Printer, CheckCircle2, Clock, AlertTriangle, Building2, User, MapPin, Scale, DollarSign, Calendar } from 'lucide-react';
import { ReportTransactionLine } from '../../services/systemReportEngine';

interface SimpleDealSlipModalProps {
  transaction: ReportTransactionLine | null;
  onClose: () => void;
}

export const SimpleDealSlipModal: React.FC<SimpleDealSlipModalProps> = ({
  transaction,
  onClose
}) => {
  if (!transaction) return null;

  const t = transaction;
  const isAllArrived = t.pendingWeightMT <= 0.01;
  const isPaid = t.paymentStatus === 'PAID';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden font-sans print:shadow-none print:border-none print:max-w-none">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-5 flex items-center justify-between print:bg-emerald-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📄</span>
              <h2 className="text-lg font-black tracking-wide uppercase">
                Sauda Deal Executive Slip
              </h2>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              Complete Procurement & Operational Transaction Summary
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slip Body */}
        <div className="p-6 space-y-5 text-slate-800">

          {/* Sauda & PO Pipeline Current Status / Progress */}
          {(() => {
            const isFullComplete = t.pendingWeightMT <= 0.01 && t.paymentStatus === 'PAID';
            const currentStepName = 
              isFullComplete ? 'Full Complete (Settled)' :
              t.paymentStatus === 'PAID' ? 'Step 6: Settlement Closed' :
              t.paidAmount > 0 ? 'Step 5: Payment Operation' :
              (t.moisturePct > 0 || t.deductionAmount > 0) ? 'Step 4: Mill Inspection' :
              t.pendingWeightMT <= 0.01 ? 'Step 3: Final Arrival' :
              t.arrivedWeightMT > 0 ? 'Step 2: Temporary Arrival' : 'Step 1: Sauda Check Point';

            return (
              <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                    <span>🚀</span> Sauda & P.O. Pipeline Status
                  </span>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                    isFullComplete ? 'bg-emerald-400 text-slate-950' : 'bg-amber-400 text-slate-950'
                  }`}>
                    {isFullComplete ? '✓ FULL COMPLETE' : `STOPPED AT: ${currentStepName}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                  {[
                    { step: 1, name: 'Sauda Check', done: true },
                    { step: 2, name: 'Temp Arrival', done: t.arrivedWeightMT > 0 || isFullComplete },
                    { step: 3, name: 'Final Arrival', done: t.pendingWeightMT <= 0.01 || isFullComplete },
                    { step: 4, name: 'Inspection', done: t.moisturePct > 0 || t.deductionAmount > 0 || t.arrivedWeightMT > 0 || isFullComplete },
                    { step: 5, name: 'Payment', done: t.paidAmount > 0 || isFullComplete },
                    { step: 6, name: 'Settlement', done: t.paymentStatus === 'PAID' || isFullComplete }
                  ].map((st, i) => (
                    <div key={i} className={`p-2 rounded-xl border text-center ${
                      st.done ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}>
                      <span className="text-[9px] font-mono block opacity-80">Step {st.step}</span>
                      <strong className="text-[11px] font-bold block mt-0.5 truncate">{st.name}</strong>
                      <span className="text-[10px] mt-1 block font-bold">
                        {st.done ? '🟢 Done' : '⏳ Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          
          {/* Sauda / PO Identification Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Sauda No</span>
              <strong className="text-sm font-black text-emerald-950 font-mono block mt-0.5">
                {t.saudaNo || 'N/A'}
              </strong>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">PO Number</span>
              <strong className="text-sm font-black text-slate-900 font-mono block mt-0.5">
                {t.poNo || 'Pending'}
              </strong>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Date</span>
              <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                {t.date || '-'}
              </strong>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Financial Year</span>
              <strong className="text-sm font-bold text-slate-900 font-mono block mt-0.5">
                {t.financialYear || '-'}
              </strong>
            </div>
          </div>

          {/* Parties & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
              <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">
                Party & Broker Details
              </span>
              <div className="flex items-start gap-2.5">
                <Building2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 font-medium">Supplier / Party:</div>
                  <div className="text-sm font-black text-slate-900">{t.supplier || 'Unassigned'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-1 border-t border-slate-100">
                <User className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 font-medium">Broker:</div>
                  <div className="text-sm font-bold text-slate-900">{t.broker || 'Direct'}</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
              <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">
                Location & Quality
              </span>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 font-medium">Area & Agency:</div>
                  <div className="text-sm font-bold text-slate-900">
                    {t.area || '-'} {t.agency && t.agency !== '-' ? `(${t.agency})` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-1 border-t border-slate-100">
                <Scale className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 font-medium">Grade / Quality:</div>
                  <div className="text-sm font-black text-slate-900">{t.grade || '-'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quantity, Rate & Calculations */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
            <span className="text-[11px] font-black uppercase text-emerald-900 block tracking-wider">
              Weight & Commercial Pricing
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Contract Weight</span>
                <strong className="text-base font-black text-emerald-950 font-mono">
                  {t.quantityMT.toFixed(2)} MT
                </strong>
                <span className="text-[10px] text-slate-500 block">{(t.quantityMT * 10).toFixed(0)} Qtl</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Purchase Rate</span>
                <strong className="text-base font-black text-slate-900 font-mono">
                  ₹{t.purchaseRate.toLocaleString()}
                </strong>
                <span className="text-[10px] text-slate-500 block">/Qtl</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Base Rate</span>
                <strong className="text-base font-black text-slate-700 font-mono">
                  {t.baseRate > 0 ? `₹${t.baseRate.toLocaleString()}` : '-'}
                </strong>
                <span className="text-[10px] text-slate-500 block">
                  {t.rateVariance !== 0 ? `${t.rateVariance > 0 ? '+' : ''}₹${t.rateVariance.toFixed(0)} Variance` : 'At Par'}
                </span>
              </div>

              <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
                <span className="text-[10px] font-bold text-emerald-100 uppercase block">Gross Value</span>
                <strong className="text-base font-black font-mono">
                  ₹{Math.round(t.grossPurchaseValue).toLocaleString()}
                </strong>
                <span className="text-[10px] text-emerald-200 block">Total Deal Value</span>
              </div>
            </div>
          </div>

          {/* Operational Progress: Arrival & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Arrival Progress */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500">
                  Arrival Status
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isAllArrived ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isAllArrived ? '🟢 Fully Arrived' : '🟡 Delivery Pending'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Arrived Weight</span>
                  <strong className="text-sm font-black text-emerald-700 font-mono">
                    {t.arrivedWeightMT.toFixed(2)} MT
                  </strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Pending Weight</span>
                  <strong className={`text-sm font-black font-mono ${t.pendingWeightMT > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {t.pendingWeightMT.toFixed(2)} MT
                  </strong>
                </div>
              </div>
              {t.moisturePct > 0 && (
                <div className="text-xs text-slate-600 pt-1 flex items-center justify-between">
                  <span>Moisture Inspection:</span>
                  <strong className="font-mono text-slate-900">{t.moisturePct.toFixed(1)}%</strong>
                </div>
              )}
            </div>

            {/* Payment Progress */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500">
                  Payment Status
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isPaid ? '🟢 Fully Settled' : (t.paidAmount > 0 ? '🟡 Partial Payment' : '🔴 Unpaid')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Paid Amount</span>
                  <strong className="text-sm font-black text-emerald-700 font-mono">
                    ₹{Math.round(t.paidAmount).toLocaleString()}
                  </strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Pending Balance</span>
                  <strong className={`text-sm font-black font-mono ${t.pendingPayable > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    ₹{Math.round(t.pendingPayable).toLocaleString()}
                  </strong>
                </div>
              </div>
              {t.deductionAmount > 0 && (
                <div className="text-xs text-rose-600 pt-1 flex items-center justify-between font-bold">
                  <span>Deductions Applied:</span>
                  <span className="font-mono">-₹{Math.round(t.deductionAmount).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Alerts / Notes if any */}
          {t.abnormalReasons && t.abnormalReasons.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800">
                <strong className="block font-bold">Operational Flags & Alerts:</strong>
                <span>{t.abnormalReasons.join(' • ')}</span>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>Transaction ID: <strong className="font-mono text-slate-700">{t.txnId}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer"
          >
            Close Slip
          </button>
        </div>

      </div>
    </div>
  );
};
