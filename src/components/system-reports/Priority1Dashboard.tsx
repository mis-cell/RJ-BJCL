import React from 'react';
import {
  ChevronRight
} from 'lucide-react';
import { SystemReportDataset, ReportTransactionLine } from '../../services/systemReportEngine';
import { DrillDownViewMode } from './DrillDownModal';

interface Priority1DashboardProps {
  dataset: SystemReportDataset;
  onDrillDown: (title: string, txns: ReportTransactionLine[], viewMode?: DrillDownViewMode) => void;
}

export const Priority1Dashboard: React.FC<Priority1DashboardProps> = ({
  dataset,
  onDrillDown
}) => {
  const { metrics, filtered } = dataset;

  return (
    <div className="space-y-6 font-sans">
      
      {/* ================= SECTION A: SOURCING FOOTPRINT ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Sourcing
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">SAUDA CHECK POINT // PRIORITY 1</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* 1. Total Quantity */}
          <div 
            onClick={() => onDrillDown('Total Sauda Contract Quantity (Sauda Check Point)', filtered, 'sauda_quantity')}
            className="p-3.5 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-500 rounded-xl shadow-xs transition hover:shadow-sm cursor-pointer group flex flex-col justify-between"
          >
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Quantity</span>
            <div className="text-base font-black text-slate-900 mt-1 font-mono truncate">
              {metrics.totalQuantityMT.toFixed(2)} MT
            </div>
            <span className="text-[9px] text-emerald-700 font-bold flex items-center gap-0.5 mt-2 pt-1 border-t border-emerald-100">
              View All Sauda <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          {/* 2. Total PO */}
          <div 
            onClick={() => onDrillDown('Total Generated Purchase Orders (Sauda Check Point)', filtered.filter(t => t.poNo && t.poNo !== 'Pending P.O.' && t.poNo !== '-'), 'pos')}
            className="p-3.5 bg-blue-50/60 hover:bg-blue-50 border border-blue-200 hover:border-blue-500 rounded-xl shadow-xs transition hover:shadow-sm cursor-pointer group flex flex-col justify-between"
          >
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Total PO</span>
            <div className="text-base font-black text-blue-950 mt-1 font-mono">
              {metrics.totalPOCount}
            </div>
            <span className="text-[9px] text-blue-700 font-bold flex items-center gap-0.5 mt-2 pt-1 border-t border-blue-100">
              View All POs <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          {/* 3. Total Supplier */}
          <div 
            onClick={() => onDrillDown('Unique Sourcing Suppliers (Sauda Check Point)', filtered.filter(t => t.supplier && t.supplier !== 'Unassigned Supplier' && t.supplier !== '-'), 'suppliers')}
            className="p-3.5 bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-500 rounded-xl shadow-xs transition hover:shadow-sm cursor-pointer group flex flex-col justify-between"
          >
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Supplier</span>
            <div className="text-base font-black text-indigo-950 mt-1 font-mono">
              {metrics.totalSupplierCount}
            </div>
            <span className="text-[9px] text-indigo-700 font-bold flex items-center gap-0.5 mt-2 pt-1 border-t border-indigo-100">
              View All Suppliers <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          {/* 4. Total Broker */}
          <div 
            onClick={() => onDrillDown('Unique Sourcing Brokers (Sauda Check Point)', filtered.filter(t => t.broker && t.broker !== 'Direct' && t.broker !== '-'), 'brokers')}
            className="p-3.5 bg-purple-50/60 hover:bg-purple-50 border border-purple-200 hover:border-purple-500 rounded-xl shadow-xs transition hover:shadow-sm cursor-pointer group flex flex-col justify-between"
          >
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Broker</span>
            <div className="text-base font-black text-purple-950 mt-1 font-mono">
              {metrics.totalBrokerCount}
            </div>
            <span className="text-[9px] text-purple-700 font-bold flex items-center gap-0.5 mt-2 pt-1 border-t border-purple-100">
              View All Brokers <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          {/* 5. Total Agency */}
          <div 
            onClick={() => onDrillDown('Unique Purchasing Agencies (Sauda Check Point)', filtered.filter(t => t.agency && t.agency !== '-'), 'agencies')}
            className="p-3.5 bg-amber-50/60 hover:bg-amber-50 border border-amber-200 hover:border-amber-500 rounded-xl shadow-xs transition hover:shadow-sm cursor-pointer group flex flex-col justify-between"
          >
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Agency</span>
            <div className="text-base font-black text-amber-950 mt-1 font-mono">
              {metrics.totalAgencyCount}
            </div>
            <span className="text-[9px] text-amber-700 font-bold flex items-center gap-0.5 mt-2 pt-1 border-t border-amber-100">
              View All Agencies <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          {/* 6. Total Area */}
          <div 
            onClick={() => onDrillDown('Unique Sourcing Areas / Belts (Sauda Check Point)', filtered.filter(t => t.area && t.area !== '-'), 'areas')}
            className="p-3.5 bg-teal-50/60 hover:bg-teal-50 border border-teal-200 hover:border-teal-500 rounded-xl shadow-xs transition hover:shadow-sm cursor-pointer group flex flex-col justify-between"
          >
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Area</span>
            <div className="text-base font-black text-teal-950 mt-1 font-mono">
              {metrics.totalAreaCount}
            </div>
            <span className="text-[9px] text-teal-700 font-bold flex items-center gap-0.5 mt-2 pt-1 border-t border-teal-100">
              View All Areas <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          {/* 7. Total Grade */}
          <div 
            onClick={() => onDrillDown('Unique Quality Grades (Sauda Check Point)', filtered.filter(t => t.grade && t.grade !== '-'), 'grades')}
            className="p-3.5 bg-rose-50/60 hover:bg-rose-50 border border-rose-200 hover:border-rose-500 rounded-xl shadow-xs transition hover:shadow-sm cursor-pointer group flex flex-col justify-between"
          >
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Grade</span>
            <div className="text-base font-black text-rose-950 mt-1 font-mono">
              {metrics.totalGradeCount}
            </div>
            <span className="text-[9px] text-rose-700 font-bold flex items-center gap-0.5 mt-2 pt-1 border-t border-rose-100">
              View All Grades <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* ================= SECTION B: FINANCIAL SUMMARY ================= */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Financial
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">LANDED MARGIN ENGINE</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Purchase Value */}
          <div className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-sm">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Purchase Value</span>
            <div className="text-base font-black font-mono mt-1">
              ₹{metrics.totalPurchaseValue.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
              Avg: ₹{metrics.weightedPurchaseRate.toFixed(2)}/Qtl
            </span>
          </div>

          {/* Premium */}
          <div 
            onClick={() => onDrillDown('Premium', filtered.filter(t => t.premiumAmount > 0))}
            className="p-3.5 bg-white border border-amber-200 rounded-xl shadow-sm hover:shadow transition cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-bold text-amber-700 uppercase block">Total Premium Paid</span>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-mono">
                {metrics.premiumMRCount || filtered.filter(t => t.premiumAmount > 0).length} MR{ (metrics.premiumMRCount || filtered.filter(t => t.premiumAmount > 0).length) !== 1 ? 's' : '' }
              </span>
            </div>
            <div className="text-base font-black text-amber-800 font-mono mt-1">
              ₹{metrics.totalPremium.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-700 font-mono mt-1 block">
              {metrics.premiumMRCount || filtered.filter(t => t.premiumAmount > 0).length} MR{ (metrics.premiumMRCount || filtered.filter(t => t.premiumAmount > 0).length) !== 1 ? 's' : '' } with Premium Amount
            </span>
          </div>

          {/* Deduction */}
          <div 
            onClick={() => onDrillDown('Transactions with Deductions', filtered.filter(t => t.deductionAmount > 0))}
            className="p-3.5 bg-white border border-rose-200 rounded-xl shadow-sm hover:shadow transition cursor-pointer"
          >
            <span className="text-[9.5px] font-bold text-rose-700 uppercase block">Total Deductions</span>
            <div className="text-base font-black text-rose-800 font-mono mt-1">
              ₹{metrics.totalDeduction.toLocaleString()}
            </div>
            <span className="text-[10px] text-rose-600 font-mono mt-1 block">
              Moisture & Quality
            </span>
          </div>
        </div>

        {/* Secondary Financial Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2.5">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono flex justify-between items-center">
            <span className="text-slate-500">Disbursed Payment:</span>
            <strong className="text-slate-800">₹{metrics.totalPayment.toLocaleString()}</strong>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono flex justify-between items-center">
            <span className="text-slate-500">Total Claims:</span>
            <strong className="text-slate-800">₹{metrics.totalClaim.toLocaleString()}</strong>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono flex justify-between items-center">
            <span className="text-slate-500">Total Settlements:</span>
            <strong className="text-slate-800">₹{metrics.totalSettlement.toLocaleString()}</strong>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono flex justify-between items-center">
            <span className="text-slate-500">Weighted Base Rate:</span>
            <strong className="text-emerald-800">₹{metrics.weightedBaseRate.toFixed(2)}/Qtl</strong>
          </div>
        </div>
      </div>

      {/* ================= SECTION C: PIPELINE & GATE STATUS ================= */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Pipline
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">FLOW: SAUDA → AMAD → INSP → PAY</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          <div 
            onClick={() => onDrillDown('Sauda Pending Delivery', filtered.filter(t => t.pendingWeightMT > 0))}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-amber-500 transition cursor-pointer"
          >
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Sauda Pending</span>
            <div className="text-sm font-black text-amber-700 font-mono mt-1">
              {metrics.pendingDeliveryMT.toFixed(2)} MT
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">{metrics.saudaPendingCount} Contracts</span>
          </div>

          <div 
            onClick={() => onDrillDown('Temporary Arrival Pending', filtered.filter(t => t.arrivalStatus === 'PENDING'))}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-amber-500 transition cursor-pointer"
          >
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Amad Pending</span>
            <div className="text-sm font-black text-slate-800 font-mono mt-1">
              {metrics.temporaryArrivalPendingCount}
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Gate Entry</span>
          </div>

          <div 
            onClick={() => onDrillDown('Final Arrival Pending', filtered.filter(t => t.arrivalStatus === 'IN_TRANSIT'))}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-amber-500 transition cursor-pointer"
          >
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Final Arrival Pending</span>
            <div className="text-sm font-black text-slate-800 font-mono mt-1">
              {metrics.finalArrivalPendingCount}
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Weighbridge</span>
          </div>

          <div 
            onClick={() => onDrillDown('Mill Inspection Pending', filtered.filter(t => t.inspectionStatus === 'PENDING'))}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-amber-500 transition cursor-pointer"
          >
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Inspection Pending</span>
            <div className="text-sm font-black text-slate-800 font-mono mt-1">
              {metrics.millInspectionPendingCount}
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Quality Lab</span>
          </div>

          <div 
            onClick={() => onDrillDown('Payment Pending', filtered.filter(t => t.paymentStatus !== 'PAID'))}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-amber-500 transition cursor-pointer"
          >
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Payment Pending</span>
            <div className="text-sm font-black text-blue-700 font-mono mt-1">
              {metrics.paymentPendingCount}
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Vouchers</span>
          </div>

          <div 
            onClick={() => onDrillDown('Settlement Pending', filtered.filter(t => t.settlementStatus !== 'SETTLED'))}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-amber-500 transition cursor-pointer"
          >
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Settlement Pending</span>
            <div className="text-sm font-black text-indigo-700 font-mono mt-1">
              {metrics.settlementPendingCount}
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Final Clearance</span>
          </div>
        </div>
      </div>

      {/* ================= SECTION D: EXCEPTION ================= */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-900">
              Exception
            </h3>
          </div>
          <span className="text-[10px] text-rose-600 font-bold font-mono">ACTION REQUIRED</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
          <div 
            onClick={() => onDrillDown('All Abnormal Transactions', filtered.filter(t => t.isAbnormal))}
            className="p-3 bg-rose-50 border border-rose-200 rounded-xl shadow-sm hover:bg-rose-100 transition cursor-pointer"
          >
            <span className="text-[9px] font-black text-rose-800 uppercase block">Abnormal Data</span>
            <div className="text-base font-black text-rose-900 font-mono mt-1">
              {metrics.abnormalCount}
            </div>
            <span className="text-[8.5px] text-rose-600 block mt-0.5">Total Violations</span>
          </div>

          <div 
            onClick={() => onDrillDown('High Deduction Lots', filtered.filter(t => t.deductionPct > 2))}
            className="p-3 bg-white border border-rose-200 rounded-xl shadow-sm hover:bg-rose-50 transition cursor-pointer"
          >
            <span className="text-[9px] font-black text-slate-600 uppercase block">High Deduction</span>
            <div className="text-base font-black text-rose-700 font-mono mt-1">
              {metrics.highDeductionCount}
            </div>
            <span className="text-[8.5px] text-slate-400 block mt-0.5">&gt;2% Cut</span>
          </div>

          <div 
            onClick={() => onDrillDown('High Premium Lots', filtered.filter(t => t.rateVariance > 100))}
            className="p-3 bg-white border border-amber-200 rounded-xl shadow-sm hover:bg-amber-50 transition cursor-pointer"
          >
            <span className="text-[9px] font-black text-slate-600 uppercase block">High Premium</span>
            <div className="text-base font-black text-amber-700 font-mono mt-1">
              {metrics.highPremiumCount}
            </div>
            <span className="text-[8.5px] text-slate-400 block mt-0.5">&gt;₹100/Qtl</span>
          </div>

          <div 
            onClick={() => onDrillDown('High Moisture Lots', filtered.filter(t => t.moisturePct > 18))}
            className="p-3 bg-white border border-blue-200 rounded-xl shadow-sm hover:bg-blue-50 transition cursor-pointer"
          >
            <span className="text-[9px] font-black text-slate-600 uppercase block">High Moisture</span>
            <div className="text-base font-black text-blue-700 font-mono mt-1">
              {metrics.highMoistureCount}
            </div>
            <span className="text-[8.5px] text-slate-400 block mt-0.5">&gt;18.0%</span>
          </div>

          <div 
            onClick={() => onDrillDown('Grade Down Lots', filtered.filter(t => t.gradeDownQty > 0))}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition cursor-pointer"
          >
            <span className="text-[9px] font-black text-slate-600 uppercase block">Grade Down</span>
            <div className="text-base font-black text-slate-800 font-mono mt-1">
              {metrics.gradeDownCount}
            </div>
            <span className="text-[8.5px] text-slate-400 block mt-0.5">Demotions</span>
          </div>

          <div 
            onClick={() => onDrillDown('High Claims', filtered.filter(t => t.claimAmount > 5000))}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition cursor-pointer"
          >
            <span className="text-[9px] font-black text-slate-600 uppercase block">High Claim</span>
            <div className="text-base font-black text-slate-800 font-mono mt-1">
              {metrics.highClaimCount}
            </div>
            <span className="text-[8.5px] text-slate-400 block mt-0.5">&gt;₹5,000</span>
          </div>

          <div 
            onClick={() => onDrillDown('Delayed Overdue Contracts', filtered.filter(t => t.isDelayed))}
            className="p-3 bg-amber-50 border border-amber-300 rounded-xl shadow-sm hover:bg-amber-100 transition cursor-pointer"
          >
            <span className="text-[9px] font-black text-amber-800 uppercase block">Delayed Deals</span>
            <div className="text-base font-black text-amber-800 font-mono mt-1">
              {metrics.delayedCount}
            </div>
            <span className="text-[8.5px] text-amber-700 block mt-0.5">Overdue Delivery</span>
          </div>
        </div>
      </div>

    </div>
  );
};
