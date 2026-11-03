import React, { useState } from 'react';
import {
  Truck, Clock, CheckCircle2, AlertTriangle, Scale, ShieldCheck,
  CreditCard, ChevronRight, ArrowRight
} from 'lucide-react';
import { SystemReportDataset, ReportTransactionLine } from '../../services/systemReportEngine';

interface Priority3OperationsProps {
  dataset: SystemReportDataset;
  onDrillDown: (title: string, txns: ReportTransactionLine[]) => void;
  defaultSubTab?: 'pipeline' | 'quality' | 'payment';
}

export const Priority3Operations: React.FC<Priority3OperationsProps> = ({
  dataset,
  onDrillDown,
  defaultSubTab = 'pipeline'
}) => {
  const { filtered, metrics } = dataset;
  const [subTab, setSubTab] = useState<'pipeline' | 'quality' | 'payment'>(defaultSubTab);

  return (
    <div className="space-y-4 font-sans">
      
      {/* Sub-tabs for Priority 3 */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        {[
          { id: 'pipeline' as const, label: '6. Sauda / PO Pipeline Checkpoints' },
          { id: 'quality' as const, label: 'Quality & Inspection Reports' },
          { id: 'payment' as const, label: 'Payment & Settlement Control' }
        ].map(t => (
          <button
            type="button"
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition cursor-pointer ${
              subTab === t.id
                ? 'bg-[#D94B5A] text-white shadow-sm border border-[#FBCFCB]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: SAUDA CHECKPOINT FULL PIPELINE */}
      {subTab === 'pipeline' && (
        <div className="space-y-4">
          
          {/* Pipeline Stage Tracker Visual Ribbon */}
          <div className="p-4 bg-[#D94B5A] text-white rounded-2xl shadow-sm space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FBCFCB] font-mono">
              OPERATIONAL LIFECYCLE: SAUDA → AMAD → FINAL ARRIVAL → INSPECTION → PAYMENT → SETTLEMENT
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
              {[
                { stage: '1. Sauda Contract', count: `${metrics.totalSaudaCount} Saudas`, sub: 'Contract Booked', color: 'bg-emerald-800' },
                { stage: '2. Amad / Gate Inward', count: `${filtered.filter(t => t.arrivalStatus !== 'PENDING').length} Inward`, sub: `${metrics.temporaryArrivalPendingCount} Pending`, color: 'bg-emerald-800' },
                { stage: '3. Final Arrival / WB', count: `${metrics.arrivedMT.toFixed(1)} MT`, sub: `${metrics.pendingDeliveryMT.toFixed(1)} MT Bal`, color: 'bg-emerald-700' },
                { stage: '4. Mill Inspection', count: `${filtered.filter(t => t.inspectionStatus === 'COMPLETED').length} Lab Tested`, sub: `${metrics.millInspectionPendingCount} Pending`, color: 'bg-emerald-700' },
                { stage: '5. Payment Operation', count: `₹${(metrics.totalPayment / 100000).toFixed(1)}L Paid`, sub: `${metrics.paymentPendingCount} Pending`, color: 'bg-teal-800' },
                { stage: '6. Settlement Closed', count: `${filtered.filter(t => t.settlementStatus === 'SETTLED').length} Closed`, sub: `${metrics.settlementPendingCount} Pending`, color: 'bg-teal-900' }
              ].map((s, idx) => (
                <div key={idx} className={`${s.color} p-2.5 rounded-xl border border-white/10 space-y-0.5`}>
                  <span className="text-[9px] font-bold text-white/70 uppercase block">{s.stage}</span>
                  <div className="text-xs font-black text-white font-mono">{s.count}</div>
                  <span className="text-[8.5px] text-emerald-200 block">{s.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delayed / Pending Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-950">
                Active Operational Deals & Pipeline Delivery Progress
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Click deal to view full checkpoint audit
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Sauda No</th>
                    <th className="p-2.5">PO No</th>
                    <th className="p-2.5">Supplier / Broker</th>
                    <th className="p-2.5 text-right">Contract MT</th>
                    <th className="p-2.5 text-right">Arrived MT</th>
                    <th className="p-2.5 text-right">Pending MT</th>
                    <th className="p-2.5 text-center">Arrival Status</th>
                    <th className="p-2.5 text-center">Inspection</th>
                    <th className="p-2.5 text-center">Payment</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filtered.slice(0, 50).map((t, idx) => (
                    <tr 
                      key={t.txnId || idx}
                      onClick={() => onDrillDown(`Checkpoint: ${t.saudaNo} / ${t.poNo}`, [t])}
                      className="hover:bg-emerald-50/40 transition cursor-pointer font-mono text-[11px]"
                    >
                      <td className="p-2 whitespace-nowrap text-slate-500">{t.date}</td>
                      <td className="p-2 font-bold text-emerald-950">{t.saudaNo}</td>
                      <td className="p-2 text-slate-700">{t.poNo}</td>
                      <td className="p-2 max-w-[150px] truncate">
                        <span className="font-bold block">{t.supplier}</span>
                        <span className="text-[9.5px] text-slate-400 font-normal">{t.broker}</span>
                      </td>
                      <td className="p-2 text-right font-bold">{t.quantityMT.toFixed(2)}</td>
                      <td className="p-2 text-right text-emerald-700 font-bold">{t.arrivedWeightMT.toFixed(2)}</td>
                      <td className="p-2 text-right text-amber-700 font-bold">{t.pendingWeightMT.toFixed(2)}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          t.arrivalStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          t.arrivalStatus === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.arrivalStatus}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          t.inspectionStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.inspectionStatus}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          t.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          t.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.paymentStatus}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <ChevronRight className="w-4 h-4 text-emerald-600 mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: QUALITY REPORTS */}
      {subTab === 'quality' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Quality Deductions</span>
              <div className="text-base font-black text-rose-700 font-mono mt-1">₹{metrics.totalDeduction.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">High Moisture Lots (&gt;18%)</span>
              <div className="text-base font-black text-blue-700 font-mono mt-1">{metrics.highMoistureCount} Lots</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Grade Down Demotions</span>
              <div className="text-base font-black text-amber-700 font-mono mt-1">{metrics.gradeDownCount} Lots</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Claims Initiated</span>
              <div className="text-base font-black text-slate-800 font-mono mt-1">₹{metrics.totalClaim.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase text-slate-700">
              Inspection Quality Audit Register
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Sauda / PO</th>
                    <th className="p-2.5">Supplier</th>
                    <th className="p-2.5">Grade</th>
                    <th className="p-2.5 text-right">Moisture %</th>
                    <th className="p-2.5 text-right">Deduction (₹)</th>
                    <th className="p-2.5 text-right">Grade Down (MT)</th>
                    <th className="p-2.5 text-center">Quality Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filtered.filter(t => t.deductionAmount > 0 || t.moisturePct > 18).slice(0, 40).map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-slate-500">{t.date}</td>
                      <td className="p-2 font-bold text-slate-900">{t.poNo}</td>
                      <td className="p-2 max-w-[150px] truncate">{t.supplier}</td>
                      <td className="p-2 font-bold">{t.grade}</td>
                      <td className="p-2 text-right">
                        <span className={t.moisturePct > 18 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                          {t.moisturePct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2 text-right text-rose-700 font-bold">₹{t.deductionAmount.toLocaleString()}</td>
                      <td className="p-2 text-right text-amber-700">{t.gradeDownQty > 0 ? `${t.gradeDownQty} MT` : '-'}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          t.deductionAmount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {t.deductionAmount > 0 ? 'Deduction Applied' : 'Accepted Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PAYMENT REPORTS */}
      {subTab === 'payment' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Disbursed Payments</span>
              <div className="text-base font-black text-emerald-800 font-mono mt-1">₹{metrics.totalPayment.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Pending Settlement Dues</span>
              <div className="text-base font-black text-amber-700 font-mono mt-1">
                ₹{filtered.reduce((acc, t) => acc + t.pendingPayable, 0).toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Claims Settled</span>
              <div className="text-base font-black text-slate-800 font-mono mt-1">₹{metrics.totalSettlement.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Pending Vouchers</span>
              <div className="text-base font-black text-blue-700 font-mono mt-1">{metrics.paymentPendingCount} Deals</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase text-slate-700">
              Supplier Payment & Settlement Ledger
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Sauda / PO</th>
                    <th className="p-2.5">Supplier</th>
                    <th className="p-2.5 text-right">Landed Cost</th>
                    <th className="p-2.5 text-right">Paid Amount</th>
                    <th className="p-2.5 text-right">Pending Balance</th>
                    <th className="p-2.5 text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filtered.slice(0, 40).map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-slate-500">{t.date}</td>
                      <td className="p-2 font-bold text-slate-900">{t.poNo}</td>
                      <td className="p-2 max-w-[150px] truncate">{t.supplier}</td>
                      <td className="p-2 text-right font-bold">₹{t.effectiveCost.toLocaleString()}</td>
                      <td className="p-2 text-right text-emerald-700 font-bold">₹{t.paidAmount.toLocaleString()}</td>
                      <td className="p-2 text-right text-amber-700 font-bold">₹{t.pendingPayable.toLocaleString()}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          t.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          t.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
