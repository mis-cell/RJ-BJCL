import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Download, 
  Printer, 
  Droplets, 
  FileSpreadsheet,
  Layers,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  Scale,
  Copy,
  Check
} from 'lucide-react';
import { cn, formatIndianCurrency } from '../lib/utils';
import { 
  InspectionRecord, 
  PendingStageRecord, 
  exportPendingPoListCsv 
} from '../services/dashboardCalculationService';

export type DrilldownTabType = 
  | 'pipeline' 
  | 'pending_fmr' 
  | 'pending_insp' 
  | 'pending_paym' 
  | 'pending_sett' 
  | 'inspections' 
  | 'payments' 
  | 'settlements';

interface InspectionDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  inspections: InspectionRecord[];
  payments?: any[];
  settlements?: any[];
  pendingFmrList?: PendingStageRecord[];
  pendingInspectionList?: PendingStageRecord[];
  pendingPaymentList?: PendingStageRecord[];
  pendingSettlementList?: PendingStageRecord[];
  allPendingPipelineList?: PendingStageRecord[];
  initialTab?: DrilldownTabType;
}

export default function InspectionDrilldownModal({
  isOpen,
  onClose,
  title,
  subtitle,
  inspections = [],
  payments = [],
  settlements = [],
  pendingFmrList = [],
  pendingInspectionList = [],
  pendingPaymentList = [],
  pendingSettlementList = [],
  allPendingPipelineList = [],
  initialTab = 'pipeline'
}: InspectionDrilldownModalProps) {
  const [activeTab, setActiveTab] = useState<DrilldownTabType>(initialTab || 'pipeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [moistureFilter, setMoistureFilter] = useState<'ALL' | 'NORMAL' | 'HIGH'>('ALL');
  const [claimFilter, setClaimFilter] = useState<'ALL' | 'WITH_CLAIM' | 'NO_CLAIM'>('ALL');
  const [premiumFilter, setPremiumFilter] = useState<'ALL' | 'PREMIUM_ONLY' | 'NON_PREMIUM'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [copiedPo, setCopiedPo] = useState<string | null>(null);

  // Sync initial tab when opened
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
      setCurrentPage(1);
      setSearchTerm('');
    }
  }, [isOpen, initialTab]);

  const handleCopyPo = (po: string) => {
    if (!po || po === 'N/A') return;
    navigator.clipboard.writeText(po);
    setCopiedPo(po);
    setTimeout(() => setCopiedPo(null), 2000);
  };

  // Compile combined pending records if not provided
  const combinedPending = useMemo(() => {
    if (allPendingPipelineList && allPendingPipelineList.length > 0) return allPendingPipelineList;
    return [
      ...pendingFmrList,
      ...pendingInspectionList,
      ...pendingPaymentList,
      ...pendingSettlementList
    ];
  }, [allPendingPipelineList, pendingFmrList, pendingInspectionList, pendingPaymentList, pendingSettlementList]);

  // Current active pending list based on tab
  const currentPendingDataset = useMemo(() => {
    switch (activeTab) {
      case 'pending_fmr':
        return pendingFmrList;
      case 'pending_insp':
        return pendingInspectionList;
      case 'pending_paym':
        return pendingPaymentList;
      case 'pending_sett':
        return pendingSettlementList;
      case 'pipeline':
      default:
        return combinedPending;
    }
  }, [activeTab, pendingFmrList, pendingInspectionList, pendingPaymentList, pendingSettlementList, combinedPending]);

  // Filtered Pending records
  const filteredPendingRecords = useMemo(() => {
    return currentPendingDataset.filter(r => {
      if (stageFilter !== 'ALL' && r.stage !== stageFilter) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match = 
          (r.poNo && r.poNo.toLowerCase().includes(q)) ||
          (r.mrNo && r.mrNo.toLowerCase().includes(q)) ||
          (r.supplier && r.supplier.toLowerCase().includes(q)) ||
          (r.broker && r.broker.toLowerCase().includes(q)) ||
          (r.vehicleNo && r.vehicleNo.toLowerCase().includes(q)) ||
          (r.status && r.status.toLowerCase().includes(q)) ||
          (r.pendingAction && r.pendingAction.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [currentPendingDataset, stageFilter, searchTerm]);

  // Pending Stats
  const pendingStats = useMemo(() => {
    const uniquePos = new Set(filteredPendingRecords.map(r => r.cleanPoNo).filter(Boolean));
    const totalBales = filteredPendingRecords.reduce((sum, r) => sum + (r.bales || 0), 0);
    const totalWeightMt = filteredPendingRecords.reduce((sum, r) => sum + (r.weightMt || 0), 0);
    const totalAmount = filteredPendingRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    return {
      totalRecords: filteredPendingRecords.length,
      uniquePoCount: uniquePos.size,
      totalBales,
      totalWeightMt,
      totalAmount
    };
  }, [filteredPendingRecords]);

  // Filtered Inspections dataset
  const filteredInspections = useMemo(() => {
    return inspections.filter(r => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match = 
          r.mrNo.toLowerCase().includes(q) ||
          (r.poNo && r.poNo.toLowerCase().includes(q)) ||
          r.supplier.toLowerCase().includes(q) ||
          r.broker.toLowerCase().includes(q) ||
          r.vehicleNo.toLowerCase().includes(q) ||
          r.juteGrade.toLowerCase().includes(q) ||
          (r.premium && r.premium.toLowerCase().includes(q)) ||
          r.remarks.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (gradeFilter !== 'ALL' && r.juteGrade.toUpperCase() !== gradeFilter.toUpperCase()) return false;
      if (moistureFilter === 'NORMAL' && r.actualMoisture > 15) return false;
      if (moistureFilter === 'HIGH' && r.actualMoisture <= 15) return false;
      if (claimFilter === 'WITH_CLAIM' && r.totalClaimAmount <= 0 && r.claimMoisture <= 0 && r.claimDust <= 0 && r.claimGradeDown <= 0) return false;
      if (claimFilter === 'NO_CLAIM' && (r.totalClaimAmount > 0 || r.claimMoisture > 0 || r.claimDust > 0 || r.claimGradeDown > 0)) return false;
      if (premiumFilter === 'PREMIUM_ONLY' && !r.isPremium) return false;
      if (premiumFilter === 'NON_PREMIUM' && r.isPremium) return false;
      return true;
    });
  }, [inspections, searchTerm, gradeFilter, moistureFilter, claimFilter, premiumFilter]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    if (!payments || payments.length === 0) return [];
    if (!searchTerm) return payments;
    const q = searchTerm.toLowerCase();
    return payments.filter(p => {
      const vNo = String(p.voucher_no || p.payment_no || '').toLowerCase();
      const mrNo = String(p.mr_no || p.arrival_no || '').toLowerCase();
      const poNo = String(p.po_no || '').toLowerCase();
      const supp = String(p.supplier_name || p.supplier || '').toLowerCase();
      const brok = String(p.broker_name || p.broker || '').toLowerCase();
      return vNo.includes(q) || mrNo.includes(q) || poNo.includes(q) || supp.includes(q) || brok.includes(q);
    });
  }, [payments, searchTerm]);

  // Filtered Settlements
  const filteredSettlements = useMemo(() => {
    if (!settlements || settlements.length === 0) return [];
    if (!searchTerm) return settlements;
    const q = searchTerm.toLowerCase();
    return settlements.filter(s => {
      const mrNo = String(s.mr_no || s.arrival_no || '').toLowerCase();
      const poNo = String(s.po_no || '').toLowerCase();
      const supp = String(s.supplier_name || s.supplier || '').toLowerCase();
      const brok = String(s.broker_name || s.broker || '').toLowerCase();
      return mrNo.includes(q) || poNo.includes(q) || supp.includes(q) || brok.includes(q);
    });
  }, [settlements, searchTerm]);

  // Active dataset size and pagination
  const activeCount = useMemo(() => {
    if (['pipeline', 'pending_fmr', 'pending_insp', 'pending_paym', 'pending_sett'].includes(activeTab)) {
      return filteredPendingRecords.length;
    }
    if (activeTab === 'inspections') return filteredInspections.length;
    if (activeTab === 'payments') return filteredPayments.length;
    return filteredSettlements.length;
  }, [activeTab, filteredPendingRecords, filteredInspections, filteredPayments, filteredSettlements]);

  const totalPages = Math.max(1, Math.ceil(activeCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedPending = filteredPendingRecords.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedInspections = filteredInspections.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedPayments = filteredPayments.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedSettlements = filteredSettlements.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Export Pending CSV
  const handleExportPendingCsv = (dataset: PendingStageRecord[], defaultName?: string) => {
    exportPendingPoListCsv(dataset, defaultName || `Pending_PO_Pipeline_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Export Inspection CSV
  const handleExportInspectionCsv = () => {
    const headers = [
      "MR No",
      "Date",
      "PO / Contract Ref",
      "Supplier",
      "Broker",
      "Vehicle No",
      "Grade",
      "Weight (MT)",
      "Actual Moisture %",
      "Claim Moisture %",
      "Actual Dust %",
      "Claim Dust %",
      "Actual Grade Down %",
      "Claim Grade Down %",
      "Chotta & Habi Jabi (Kg)",
      "Premium (Sauda Check Point)",
      "Premium Amount (INR)",
      "Moisture Claim (INR)",
      "Total Deductions (INR)",
      "Status",
      "Remarks"
    ];

    const rows = filteredInspections.map(r => [
      `"${r.mrNo}"`,
      `"${r.date}"`,
      `"${r.poNo || ''}"`,
      `"${r.supplier.replace(/"/g, '""')}"`,
      `"${r.broker.replace(/"/g, '""')}"`,
      `"${r.vehicleNo}"`,
      `"${r.juteGrade}"`,
      r.weightMt.toFixed(3),
      r.actualMoisture.toFixed(1),
      r.claimMoisture.toFixed(1),
      r.actualDust.toFixed(1),
      r.claimDust.toFixed(1),
      r.actualGradeDown.toFixed(1),
      r.claimGradeDown.toFixed(1),
      r.totalChottaHabijabiKg.toFixed(1),
      `"${r.premium || (r.isPremium ? 'Yes' : 'No')}"`,
      r.premiumAmount > 0 ? r.premiumAmount.toFixed(2) : (r.premiumRate > 0 ? (r.premiumRate * r.weightMt * 10).toFixed(2) : '0.00'),
      r.moistureDeductionAmount.toFixed(2),
      r.totalClaimAmount.toFixed(2),
      `"${r.status}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inspection_Summary_Data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const isPendingTab = ['pipeline', 'pending_fmr', 'pending_insp', 'pending_paym', 'pending_sett'].includes(activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-[#FDE7E6] border-2 border-[#F7AFA8] rounded-2xl shadow-2xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="bg-[#D94B5A] text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-[#FBCFCB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-black tracking-wide flex items-center gap-2">
                <span>{title || "Monthly Operational & Pending P.O. Tracking"}</span>
              </h2>
              {subtitle && (
                <p className="text-xs text-emerald-200/90 font-sans mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPendingTab ? (
              <>
                <button
                  onClick={() => handleExportPendingCsv(filteredPendingRecords, `Pending_PO_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 border border-emerald-400/30 rounded-xl text-xs font-black text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Download Current Filtered Pending P.O.s CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Pending P.O. CSV</span>
                </button>

                <button
                  onClick={() => handleExportPendingCsv(combinedPending, `All_Pending_Pipeline_POs_${new Date().toISOString().slice(0, 10)}.csv`)}
                  className="hidden md:flex px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Download All 4 Pipeline Stages Combined CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                  <span>All Stages CSV</span>
                </button>
              </>
            ) : activeTab === 'inspections' ? (
              <button
                onClick={handleExportInspectionCsv}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Download filtered records as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            ) : null}

            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Print Report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-900/80 text-white transition-colors cursor-pointer border border-white/20"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs: Pipeline, Pending Stages, Completed */}
        <div className="bg-[#F7AFA8] px-3 pt-1 pb-0 flex items-center gap-1.5 border-b border-emerald-900/60 shrink-0 overflow-x-auto select-none scrollbar-none">
          
          {/* Tab 1: Combined Pipeline */}
          <button
            onClick={() => { setActiveTab('pipeline'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-t border-x whitespace-nowrap shrink-0",
              activeTab === 'pipeline'
                ? "bg-[#FDE7E6] text-[#D94B5A] border-[#FDE7E6] shadow-sm font-extrabold"
                : "bg-white/10 text-white/80 hover:bg-white/20 border-transparent"
            )}
          >
            <span>📊 All Pending Pipeline</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
              activeTab === 'pipeline' ? "bg-amber-100 text-amber-900 font-black" : "bg-white/20 text-white"
            )}>
              {combinedPending.length}
            </span>
          </button>

          {/* Tab 2: MR -> FMR */}
          <button
            onClick={() => { setActiveTab('pending_fmr'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-t border-x whitespace-nowrap shrink-0",
              activeTab === 'pending_fmr'
                ? "bg-[#FDE7E6] text-[#D94B5A] border-[#FDE7E6] shadow-sm font-extrabold"
                : "bg-white/10 text-white/80 hover:bg-white/20 border-transparent"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>1. MR ➔ Final MR</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
              activeTab === 'pending_fmr' ? "bg-amber-100 text-amber-950 font-black" : "bg-amber-400/20 text-amber-200"
            )}>
              {pendingFmrList.length}
            </span>
          </button>

          {/* Tab 3: Final MR -> Insp */}
          <button
            onClick={() => { setActiveTab('pending_insp'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-t border-x whitespace-nowrap shrink-0",
              activeTab === 'pending_insp'
                ? "bg-[#FDE7E6] text-[#D94B5A] border-[#FDE7E6] shadow-sm font-extrabold"
                : "bg-white/10 text-white/80 hover:bg-white/20 border-transparent"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            <span>2. Final MR ➔ INSP</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
              activeTab === 'pending_insp' ? "bg-orange-100 text-orange-950 font-black" : "bg-orange-400/20 text-orange-200"
            )}>
              {pendingInspectionList.length}
            </span>
          </button>

          {/* Tab 4: Insp -> Paym */}
          <button
            onClick={() => { setActiveTab('pending_paym'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-t border-x whitespace-nowrap shrink-0",
              activeTab === 'pending_paym'
                ? "bg-[#FDE7E6] text-[#D94B5A] border-[#FDE7E6] shadow-sm font-extrabold"
                : "bg-white/10 text-white/80 hover:bg-white/20 border-transparent"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            <span>3. INSP ➔ Payment</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
              activeTab === 'pending_paym' ? "bg-yellow-100 text-yellow-950 font-black" : "bg-yellow-400/20 text-yellow-200"
            )}>
              {pendingPaymentList.length}
            </span>
          </button>

          {/* Tab 5: Paym -> Sett */}
          <button
            onClick={() => { setActiveTab('pending_sett'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-t border-x whitespace-nowrap shrink-0",
              activeTab === 'pending_sett'
                ? "bg-[#FDE7E6] text-[#D94B5A] border-[#FDE7E6] shadow-sm font-extrabold"
                : "bg-white/10 text-white/80 hover:bg-white/20 border-transparent"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span>4. Paym ➔ Sett</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
              activeTab === 'pending_sett' ? "bg-purple-100 text-purple-950 font-black" : "bg-purple-400/20 text-purple-200"
            )}>
              {pendingSettlementList.length}
            </span>
          </button>

          {/* Completed History Tabs */}
          <div className="h-5 w-px bg-white/20 mx-1 shrink-0"></div>

          <button
            onClick={() => { setActiveTab('inspections'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-t border-x whitespace-nowrap shrink-0",
              activeTab === 'inspections'
                ? "bg-[#FDE7E6] text-[#D94B5A] border-[#FDE7E6] shadow-sm font-extrabold"
                : "bg-white/10 text-white/80 hover:bg-white/20 border-transparent"
            )}
          >
            <span>Inspections</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
              activeTab === 'inspections' ? "bg-blue-100 text-blue-900 font-bold" : "bg-white/20 text-white"
            )}>
              {inspections.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('payments'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-t border-x whitespace-nowrap shrink-0",
              activeTab === 'payments'
                ? "bg-[#FDE7E6] text-[#D94B5A] border-[#FDE7E6] shadow-sm font-extrabold"
                : "bg-white/10 text-white/80 hover:bg-white/20 border-transparent"
            )}
          >
            <span>Payments</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
              activeTab === 'payments' ? "bg-emerald-100 text-emerald-900 font-bold" : "bg-white/20 text-white"
            )}>
              {payments.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('settlements'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-t border-x whitespace-nowrap shrink-0",
              activeTab === 'settlements'
                ? "bg-[#FDE7E6] text-[#D94B5A] border-[#FDE7E6] shadow-sm font-extrabold"
                : "bg-white/10 text-white/80 hover:bg-white/20 border-transparent"
            )}
          >
            <span>Settlements</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
              activeTab === 'settlements' ? "bg-purple-100 text-purple-900 font-bold" : "bg-white/20 text-white"
            )}>
              {settlements.length}
            </span>
          </button>
        </div>

        {/* PENDING STAGE BANNER & STATS */}
        {isPendingTab && (
          <div className="bg-white border-b border-[#FBCFCB] px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 text-xs font-sans shadow-2xs">
            <div className="bg-amber-50/60 border border-amber-200/80 p-2.5 rounded-xl">
              <span className="text-[9.5px] text-amber-900 font-bold block uppercase tracking-wider">Pending P.O. Numbers</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono font-black text-amber-950 text-base">{pendingStats.uniquePoCount}</span>
                <span className="text-[10px] font-bold text-amber-800">Unique P.O.(s)</span>
              </div>
            </div>

            <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-2.5 rounded-xl">
              <span className="text-[9.5px] text-slate-500 font-bold block uppercase tracking-wider">Pending Gate / MR Lots</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono font-black text-[#D94B5A] text-base">{pendingStats.totalRecords}</span>
                <span className="text-[10px] font-semibold text-slate-600">MR Records</span>
              </div>
            </div>

            <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-2.5 rounded-xl">
              <span className="text-[9.5px] text-slate-500 font-bold block uppercase tracking-wider">Pending Volume</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono font-black text-emerald-900 text-base">{pendingStats.totalBales.toLocaleString()}</span>
                <span className="text-[10px] font-semibold text-slate-600">Bales • {pendingStats.totalWeightMt.toFixed(2)} MT</span>
              </div>
            </div>

            <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-2.5 rounded-xl">
              <span className="text-[9.5px] text-slate-500 font-bold block uppercase tracking-wider">Estimated Value</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono font-black text-indigo-950 text-base">
                  {pendingStats.totalAmount > 0 ? `₹${formatIndianCurrency(pendingStats.totalAmount)}` : 'On Contract Basis'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar: Search and Filters */}
        <div className="bg-[#FDE7E6] p-3 border-b border-[#FBCFCB] flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder={isPendingTab ? "Search by P.O. No, MR No, Supplier, Broker, Lorry..." : "Search records..."}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#FBCFCB] rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#F7AFA8] shadow-2xs font-medium"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline font-semibold cursor-pointer shrink-0"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'pipeline' && (
              <select
                value={stageFilter}
                onChange={(e) => { setStageFilter(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1.5 bg-white border border-[#FBCFCB] rounded-xl text-xs font-bold text-slate-800 shadow-2xs cursor-pointer focus:outline-none"
              >
                <option value="ALL">All 4 Pending Stages</option>
                <option value="MR_TO_FMR">1. MR ➔ Final MR (Below FMR)</option>
                <option value="FMR_TO_INSP">2. Final MR ➔ Mill Inspection</option>
                <option value="INSP_TO_PAYM">3. Inspection ➔ Payment</option>
                <option value="PAYM_TO_SETT">4. Payment ➔ Settlement</option>
              </select>
            )}

            {isPendingTab && (
              <button
                onClick={() => handleExportPendingCsv(filteredPendingRecords, `Pending_PO_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`)}
                className="px-3 py-1.5 bg-[#F7AFA8] hover:bg-[#2c4728] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Download CSV for Current View"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span>Export CSV ({filteredPendingRecords.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Table Area */}
        <div className="flex-1 overflow-auto bg-white p-3">
          
          {/* 1. PENDING STAGES TABLE (P.O. Centric) */}
          {isPendingTab ? (
            paginatedPending.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-[#D94B5A] text-white sticky top-0 text-[10.5px] font-black uppercase tracking-wider z-10">
                  <tr>
                    <th className="p-2.5 border-r border-emerald-900/60">P.O. Number</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Stage & Pipeline Gap</th>
                    <th className="p-2.5 border-r border-emerald-900/60">MR / Arrival No</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Date</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Supplier</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Broker</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Vehicle / Lorry</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-right">Bales</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-right">Weight (MT)</th>
                    <th className="p-2.5">Action Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {paginatedPending.map((r, idx) => {
                    const isCopied = copiedPo === r.poNo;
                    return (
                      <tr key={r.id || idx} className="hover:bg-amber-50/40 transition-colors">
                        {/* P.O. Number */}
                        <td className="p-2.5 font-mono font-black text-indigo-950 whitespace-nowrap border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                              {r.poNo || 'N/A'}
                            </span>
                            {r.poNo && r.poNo !== 'N/A' && (
                              <button
                                onClick={() => handleCopyPo(r.poNo)}
                                className="p-1 hover:bg-indigo-100 rounded text-slate-500 hover:text-indigo-900 transition-colors cursor-pointer"
                                title="Copy P.O. Number"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Stage Badge */}
                        <td className="p-2.5 whitespace-nowrap border-r border-slate-200">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase border inline-flex items-center gap-1",
                            r.stage === 'MR_TO_FMR' ? "bg-amber-100 text-amber-900 border-amber-300" :
                            r.stage === 'FMR_TO_INSP' ? "bg-orange-100 text-orange-900 border-orange-300" :
                            r.stage === 'INSP_TO_PAYM' ? "bg-yellow-100 text-yellow-900 border-yellow-300" :
                            "bg-purple-100 text-purple-900 border-purple-300"
                          )}>
                            <span>{r.stageLabel}</span>
                          </span>
                        </td>

                        {/* MR No */}
                        <td className="p-2.5 font-mono font-bold text-slate-800 whitespace-nowrap border-r border-slate-200">
                          {r.mrNo || '—'}
                        </td>

                        {/* Date */}
                        <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap border-r border-slate-200">
                          {r.date || '—'}
                        </td>

                        {/* Supplier */}
                        <td className="p-2.5 font-bold text-slate-900 max-w-xs truncate border-r border-slate-200">
                          {r.supplier}
                        </td>

                        {/* Broker */}
                        <td className="p-2.5 text-slate-700 max-w-[120px] truncate border-r border-slate-200">
                          {r.broker}
                        </td>

                        {/* Vehicle */}
                        <td className="p-2.5 font-mono text-slate-700 whitespace-nowrap border-r border-slate-200">
                          {r.vehicleNo || '—'}
                        </td>

                        {/* Bales */}
                        <td className="p-2.5 font-mono font-bold text-right text-slate-900 whitespace-nowrap border-r border-slate-200">
                          {r.bales > 0 ? r.bales.toLocaleString() : '—'}
                        </td>

                        {/* Weight MT */}
                        <td className="p-2.5 font-mono font-black text-right text-emerald-900 whitespace-nowrap border-r border-slate-200">
                          {r.weightMt > 0 ? r.weightMt.toFixed(3) : '—'}
                        </td>

                        {/* Action Required */}
                        <td className="p-2.5 text-slate-700 font-semibold text-[10.5px]">
                          <span className="text-amber-900 font-bold bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200 inline-block">
                            {r.pendingAction}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-slate-500 font-sans">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-bold text-slate-800">No Pending P.O.s in this Stage</p>
                <p className="text-xs text-slate-500 mt-1">All records have smoothly progressed to subsequent workflow stages.</p>
              </div>
            )
          ) : activeTab === 'inspections' ? (
            /* 2. COMPLETED INSPECTIONS TABLE */
            paginatedInspections.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-[#D94B5A] text-white sticky top-0 text-[10.5px] font-black uppercase tracking-wider z-10">
                  <tr>
                    <th className="p-2.5 border-r border-emerald-900/60">MR No</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Date</th>
                    <th className="p-2.5 border-r border-emerald-900/60">P.O. Reference</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Supplier</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Broker</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Grade</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-right">Net Wt (MT)</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-center">Moisture %</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-center">Dust %</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-center">Grade Down %</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-right">Premium (₹)</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-right">Total Claims (₹)</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {paginatedInspections.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap border-r border-slate-200">{r.mrNo}</td>
                      <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap border-r border-slate-200">{r.date}</td>
                      <td className="p-2.5 font-mono text-indigo-950 font-bold whitespace-nowrap border-r border-slate-200">{r.poNo || '—'}</td>
                      <td className="p-2.5 font-bold text-slate-900 max-w-xs truncate border-r border-slate-200">{r.supplier}</td>
                      <td className="p-2.5 text-slate-700 max-w-[120px] truncate border-r border-slate-200">{r.broker}</td>
                      <td className="p-2.5 font-bold text-slate-800 whitespace-nowrap border-r border-slate-200">{r.juteGrade}</td>
                      <td className="p-2.5 font-mono font-black text-right text-emerald-900 whitespace-nowrap border-r border-slate-200">{r.weightMt.toFixed(3)}</td>
                      <td className="p-2.5 font-mono text-center whitespace-nowrap border-r border-slate-200">
                        {r.actualMoisture.toFixed(1)}% {r.claimMoisture > 0 && <span className="text-rose-700 font-bold">({r.claimMoisture.toFixed(1)}%)</span>}
                      </td>
                      <td className="p-2.5 font-mono text-center whitespace-nowrap border-r border-slate-200">{r.actualDust.toFixed(1)}%</td>
                      <td className="p-2.5 font-mono text-center whitespace-nowrap border-r border-slate-200">{r.actualGradeDown.toFixed(1)}%</td>
                      <td className="p-2.5 font-mono text-right whitespace-nowrap border-r border-slate-200">
                        {r.isPremium || r.premiumAmount > 0 || r.premiumRate > 0 ? (
                          <span className="font-bold text-amber-950 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] inline-block text-right">
                            {r.premiumAmount > 0 ? `₹${formatIndianCurrency(r.premiumAmount)}` : `+₹${r.premiumRate}/Qtl`}
                            {r.premiumRate > 0 && r.premiumAmount > 0 && (
                              <span className="text-[9px] text-amber-800 block font-semibold">(@ ₹{r.premiumRate}/Qtl)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-right text-rose-800 whitespace-nowrap border-r border-slate-200">₹{formatIndianCurrency(r.totalClaimAmount)}</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {r.status || 'Inspected'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-slate-400">No inspection records found.</div>
            )
          ) : activeTab === 'payments' ? (
            /* 3. PAYMENTS TABLE */
            paginatedPayments.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-[#D94B5A] text-white sticky top-0 text-[10.5px] font-black uppercase tracking-wider z-10">
                  <tr>
                    <th className="p-2.5 border-r border-emerald-900/60">Voucher No</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Date</th>
                    <th className="p-2.5 border-r border-emerald-900/60">P.O. Reference</th>
                    <th className="p-2.5 border-r border-emerald-900/60">MR / Arrival No</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Supplier</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Broker</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-right">Paid Amount (₹)</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {paginatedPayments.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">{p.voucher_no || p.payment_no || '—'}</td>
                      <td className="p-2.5 font-mono text-slate-600 border-r border-slate-200">{p.date || p.payment_date || '—'}</td>
                      <td className="p-2.5 font-mono font-bold text-indigo-950 border-r border-slate-200">{p.po_no || '—'}</td>
                      <td className="p-2.5 font-mono text-slate-800 border-r border-slate-200">{p.mr_no || p.arrival_no || '—'}</td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">{p.supplier_name || p.supplier || '—'}</td>
                      <td className="p-2.5 text-slate-700 border-r border-slate-200">{p.broker_name || p.broker || '—'}</td>
                      <td className="p-2.5 font-mono font-black text-right text-emerald-900 border-r border-slate-200">
                        ₹{formatIndianCurrency(p.paid_amount || p.net_payable_amount || p.amount || 0)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {p.status || 'Paid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-slate-400">No payment records found.</div>
            )
          ) : (
            /* 4. SETTLEMENTS TABLE */
            paginatedSettlements.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-[#D94B5A] text-white sticky top-0 text-[10.5px] font-black uppercase tracking-wider z-10">
                  <tr>
                    <th className="p-2.5 border-r border-emerald-900/60">MR No</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Audit / Sett Date</th>
                    <th className="p-2.5 border-r border-emerald-900/60">P.O. Reference</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Supplier</th>
                    <th className="p-2.5 border-r border-emerald-900/60">Broker</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-right">Settled Wt (MT)</th>
                    <th className="p-2.5 border-r border-emerald-900/60 text-right">Net Value (₹)</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {paginatedSettlements.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">{s.mr_no || s.arrival_no || '—'}</td>
                      <td className="p-2.5 font-mono text-slate-600 border-r border-slate-200">{s.audit_date || s.sett_date || s.date || '—'}</td>
                      <td className="p-2.5 font-mono font-bold text-indigo-950 border-r border-slate-200">{s.po_no || '—'}</td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">{s.supplier_name || s.supplier || '—'}</td>
                      <td className="p-2.5 text-slate-700 border-r border-slate-200">{s.broker_name || s.broker || '—'}</td>
                      <td className="p-2.5 font-mono font-black text-right text-emerald-900 border-r border-slate-200">
                        {Number(s.electronic_scale_net || s.quantity || s.weight || 0).toFixed(3)}
                      </td>
                      <td className="p-2.5 font-mono font-black text-right text-purple-900 border-r border-slate-200">
                        ₹{formatIndianCurrency(s.net_payable_amount || s.amount || s.total_value || 0)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300">
                          {s.status || 'Settled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-slate-400">No settlement records found.</div>
            )
          )}
        </div>

        {/* Pagination & Footer */}
        <div className="bg-[#FDE7E6] p-3 border-t border-[#FBCFCB] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="text-slate-600 font-semibold text-xs">
            Showing <span className="font-bold text-slate-900">{Math.min(activeCount, (safePage - 1) * pageSize + 1)}</span> to <span className="font-bold text-slate-900">{Math.min(activeCount, safePage * pageSize)}</span> of <span className="font-bold text-slate-900">{activeCount}</span> records
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold text-xs">Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border border-[#FBCFCB] rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
              className="px-2.5 py-1 bg-white border border-[#FBCFCB] rounded-lg font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              Previous
            </button>
            <span className="font-mono font-bold text-xs text-[#D94B5A]">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
              className="px-2.5 py-1 bg-white border border-[#FBCFCB] rounded-lg font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
