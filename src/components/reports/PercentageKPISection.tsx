import React from 'react';
import { CompiledReportData } from '../../services/reportCalculations';
import { 
  FileText, 
  Scale, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  XCircle, 
  Truck,
  ArrowUpRight,
  PieChart as PieChartIcon,
  HelpCircle,
  FileCheck2,
  ExternalLink
} from 'lucide-react';

interface PercentageKPISectionProps {
  kpis: CompiledReportData['kpis'];
  onCardClick?: (kpiType: string) => void;
  onOpenReconciliation?: () => void;
}

export const PercentageKPISection: React.FC<PercentageKPISectionProps> = ({ 
  kpis, 
  onCardClick,
  onOpenReconciliation 
}) => {
  return (
    <div className="space-y-3.5">
      {/* Traceability & Integrity Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Traceable Engine Active
          </span>
          <span className="text-slate-500 text-[11px]">
            Sauda & PTF strictly separated • Every card is clickable for record audit
          </span>
        </div>

        {onOpenReconciliation && (
          <button
            onClick={onOpenReconciliation}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700 transition-colors shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reconciliation Audit Report (7 KPIs)</span>
          </button>
        )}
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {/* Total Contracts (Sauda + PTF Separated) */}
        <div 
          onClick={() => onCardClick?.('total_contracts')}
          className="bg-white border border-slate-200 rounded-lg p-3 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group relative"
          title="Click to view all underlying contracts and records"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Total Contracts</span>
            <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight">{kpis.totalContracts}</div>
          
          {/* Explicit Sauda vs PTF separation */}
          <div className="mt-1 flex items-center gap-1 text-[10px]">
            <span 
              onClick={(e) => { e.stopPropagation(); onCardClick?.('sauda_contracts'); }}
              className="bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors cursor-pointer"
              title="Click to trace Sauda contracts"
            >
              {kpis.totalSaudaContracts ?? 0} Sauda
            </span>
            <span className="text-slate-300">•</span>
            <span 
              onClick={(e) => { e.stopPropagation(); onCardClick?.('ptf_contracts'); }}
              className="bg-purple-50 text-purple-800 font-bold px-1.5 py-0.5 rounded hover:bg-purple-100 transition-colors cursor-pointer"
              title="Click to trace PTF contracts"
            >
              {kpis.totalPtfContracts ?? 0} PTF
            </span>
          </div>

          <div className="text-[9px] text-slate-400 font-medium mt-1 flex items-center justify-between border-t border-slate-100 pt-1">
            <span>{kpis.fullyDeliveredContracts} completed ({kpis.fullyDeliveredPct}%)</span>
            <span className="text-emerald-600 group-hover:underline flex items-center gap-0.5 font-bold">Trace &rarr;</span>
          </div>
        </div>

        {/* Contracted Weight */}
        <div 
          onClick={() => onCardClick?.('contracted_wt')}
          className="bg-white border border-slate-200 rounded-lg p-3 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
          title="Click to trace contracted tonnage across active contracts"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Contracted Wt</span>
            <Scale className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
            {kpis.contractedWeightMT.toLocaleString()} <span className="text-xs font-normal text-slate-500">MT</span>
          </div>
          
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-600 font-medium">
            <span className="text-blue-700 font-semibold">{(kpis.saudaContractedMT ?? 0).toLocaleString()} MT Sauda</span>
            <span className="text-slate-300">•</span>
            <span className="text-purple-700 font-semibold">{(kpis.ptfContractedMT ?? 0).toLocaleString()} MT PTF</span>
          </div>

          <div className="text-[9px] text-slate-400 font-medium mt-1 flex items-center justify-between border-t border-slate-100 pt-1">
            <span>Active procurement volume</span>
            <span className="text-emerald-600 group-hover:underline flex items-center gap-0.5 font-bold">Trace &rarr;</span>
          </div>
        </div>

        {/* Delivered Weight & % (Final Arrival Section Data) */}
        <div 
          onClick={() => onCardClick?.('delivered_wt')}
          className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
          title="Click to view verified weighbridge arrivals strictly from Final Arrival Section"
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">Delivered Wt (Final Arrival)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-950 font-mono tracking-tight">
            {kpis.deliveredWeightMT.toLocaleString()} <span className="text-xs font-normal text-emerald-700">MT</span>
          </div>

          <div className="text-[10px] text-emerald-800 font-bold mt-1 flex items-center justify-between">
            <span>Delivered: {kpis.deliveredPct}%</span>
            <span 
              className="bg-emerald-200/80 px-1 py-0.2 rounded text-[9px] text-emerald-900 font-medium"
              title="Verified strictly from Final Arrival Section data"
            >
              Final Arrival Section
            </span>
          </div>

          <div className="text-[9px] text-emerald-700 font-medium mt-1 flex items-center justify-between border-t border-emerald-200/60 pt-1">
            <span>{kpis.totalArrivalsCount ?? 0} Verified Final Arrivals</span>
            <span className="text-emerald-800 group-hover:underline flex items-center gap-0.5 font-bold">Trace &rarr;</span>
          </div>
        </div>

        {/* Pending Weight & % */}
        <div 
          onClick={() => onCardClick?.('pending_wt')}
          className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          title="Click to view contracts awaiting mill arrival delivery"
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-800">Pending Wt</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-950 font-mono tracking-tight">
            {kpis.pendingWeightMT.toLocaleString()} <span className="text-xs font-normal text-amber-700">MT</span>
          </div>

          <div className="text-[10px] text-amber-800 font-bold mt-1 flex items-center justify-between">
            <span>To Deliver: {kpis.pendingPct}%</span>
            <span className="bg-amber-200/70 px-1 py-0.2 rounded text-[9px]">
              {(kpis.saudaPendingMT ?? 0).toLocaleString()} MT Sauda
            </span>
          </div>

          <div className="text-[9px] text-amber-700 font-medium mt-1 flex items-center justify-between border-t border-amber-200/60 pt-1">
            <span>Physical Mill Pending</span>
            <span className="text-amber-800 group-hover:underline flex items-center gap-0.5 font-bold">Trace &rarr;</span>
          </div>
        </div>

        {/* On-Time Delivery % (Audited from Temporary Arrival Date vs Sauda Check Point Delivery To) */}
        <div 
          onClick={() => onCardClick?.('on_time')}
          className="bg-white border border-slate-200 rounded-lg p-3 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
          title="Click to view on-time vs delayed lorry arrivals (Temporary Date vs Sauda Check Point Delivery To)"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">On-Time Delivery</span>
            <Truck className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight">{kpis.onTimePct}%</div>

          <div className="text-[10px] text-slate-600 font-medium mt-1 flex items-center justify-between">
            <span className="text-emerald-700 font-semibold">{(kpis.onTimeDeliveredMT ?? 0).toLocaleString()} MT On-Time</span>
            <span className="text-amber-700 font-semibold">Delayed: {kpis.delayedPct}%</span>
          </div>

          <div className="text-[9px] text-slate-400 font-medium mt-1 flex items-center justify-between border-t border-slate-100 pt-1">
            <span>Temporary Date vs Delivery To</span>
            <span className="text-emerald-600 group-hover:underline flex items-center gap-0.5 font-bold">Trace &rarr;</span>
          </div>
        </div>

        {/* Payment Completion & Settlement % */}
        <div 
          onClick={() => onCardClick?.('payment_pct')}
          className="bg-white border border-slate-200 rounded-lg p-3 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
          title="Click to view payment vouchers and invoiced bill passing clearance"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Billing & Payment</span>
            <DollarSign className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
            {(kpis.billPassingRatePct ?? 0).toFixed(1)}%
          </div>

          <div className="text-[10px] text-slate-600 font-medium mt-1 flex items-center justify-between">
            <span className="text-emerald-700 font-bold">Bill Passed</span>
            <span className="text-slate-500">₹{((kpis.finalPaymentTotal || 0) / 100000).toFixed(2)}L Bank Paid</span>
          </div>

          <div className="text-[9px] text-slate-400 font-medium mt-1 flex items-center justify-between border-t border-slate-100 pt-1">
            <span>Passing & Vouchers</span>
            <span className="text-emerald-600 group-hover:underline flex items-center gap-0.5 font-bold">Trace &rarr;</span>
          </div>
        </div>
      </div>

      {/* Progress Bar with Exact Stacked Visual Representation */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black uppercase text-slate-700 tracking-wider text-[11px] flex items-center gap-1.5">
            <PieChartIcon className="w-3.5 h-3.5 text-emerald-700" />
            Overall Sauda Progress & Weight Distribution
          </span>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span 
              onClick={() => onCardClick?.('delivered_wt')}
              className="flex items-center gap-1 text-emerald-700 cursor-pointer hover:underline"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
              Mill Delivered: {kpis.deliveredPct}% ({kpis.deliveredWeightMT.toLocaleString()} MT)
            </span>
            <span 
              onClick={() => onCardClick?.('pending_wt')}
              className="flex items-center gap-1 text-amber-700 cursor-pointer hover:underline"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              Pending: {kpis.pendingPct}% ({kpis.pendingWeightMT.toLocaleString()} MT)
            </span>
            {kpis.excessWeightMT > 0 && (
              <span className="flex items-center gap-1 text-indigo-700">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                Excess: {kpis.excessPct}% ({kpis.excessWeightMT.toLocaleString()} MT)
              </span>
            )}
            {kpis.cancelledWeightMT > 0 && (
              <span className="flex items-center gap-1 text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                Cancelled: {kpis.cancelledPct}% ({kpis.cancelledWeightMT.toLocaleString()} MT)
              </span>
            )}
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/80 shadow-inner">
          <div 
            style={{ width: `${Math.min(100, kpis.deliveredPct)}%` }} 
            className="bg-emerald-600 h-full transition-all duration-500 relative cursor-pointer"
            onClick={() => onCardClick?.('delivered_wt')}
            title={`Mill Delivered: ${kpis.deliveredWeightMT} MT (${kpis.deliveredPct}%) - Click to trace`}
          />
          <div 
            style={{ width: `${Math.min(100 - kpis.deliveredPct, kpis.pendingPct)}%` }} 
            className="bg-amber-400 h-full transition-all duration-500 cursor-pointer"
            onClick={() => onCardClick?.('pending_wt')}
            title={`Pending: ${kpis.pendingWeightMT} MT (${kpis.pendingPct}%) - Click to trace`}
          />
          {kpis.cancelledPct > 0 && (
            <div 
              style={{ width: `${kpis.cancelledPct}%` }} 
              className="bg-rose-400 h-full transition-all duration-500"
              title={`Cancelled: ${kpis.cancelledWeightMT} MT (${kpis.cancelledPct}%)`}
            />
          )}
        </div>

        {/* Breakdown Sub-metrics with Traceable Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-[10px] font-mono">
          <div 
            onClick={() => onCardClick?.('avg_rate')}
            className="flex justify-between px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded cursor-pointer transition-colors"
            title="Click to trace contract rates"
          >
            <span className="text-slate-500 font-sans">Avg Contract Rate:</span>
            <span className="font-bold text-slate-800">₹{kpis.avgContractRate.toLocaleString()}/Qtl</span>
          </div>
          <div 
            onClick={() => onCardClick?.('total_value')}
            className="flex justify-between px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded cursor-pointer transition-colors"
            title="Click to trace total contract value"
          >
            <span className="text-slate-500 font-sans">Total Contract Value:</span>
            <span className="font-bold text-slate-800">₹{(kpis.totalContractValue / 100000).toFixed(2)} Lakhs</span>
          </div>
          <div 
            onClick={() => onCardClick?.('delivered_wt')}
            className="flex justify-between px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded cursor-pointer transition-colors"
            title="Click to trace mill arrivals value"
          >
            <span className="text-slate-500 font-sans">Total Dispatched Value:</span>
            <span className="font-bold text-emerald-800">₹{(kpis.totalDispatchedValue / 100000).toFixed(2)} Lakhs</span>
          </div>
          <div 
            onClick={() => onCardClick?.('total_contracts')}
            className="flex justify-between px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded cursor-pointer transition-colors"
            title="Click to trace contract status breakdown"
          >
            <span className="text-slate-500 font-sans">Contracts Status:</span>
            <span className="font-bold text-slate-800">{kpis.fullyDeliveredContracts} Full / {kpis.partiallyDeliveredContracts} Part / {kpis.notStartedContracts} New</span>
          </div>
        </div>
      </div>
    </div>
  );
};

