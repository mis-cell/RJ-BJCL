import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Percent,
  Scissors,
  Truck,
  Layers,
  Award,
  AlertTriangle,
  PieChart,
  Briefcase,
  UserCheck,
  DollarSign,
  Clock,
  RefreshCcw,
  Download,
  Printer
} from 'lucide-react';
import LegacyLayout from '../components/LegacyLayout';
import {
  loadAndProcessSystemReportData,
  calculateReportMetrics,
  ReportFilterCriteria,
  ReportTransactionLine,
  SystemReportDataset
} from '../services/systemReportEngine';
import { exportToCSV } from '../utils/exportHelpers';

import { ReportFilterBar } from '../components/system-reports/ReportFilterBar';
import { Priority1Dashboard } from '../components/system-reports/Priority1Dashboard';
import { Priority2Analysis } from '../components/system-reports/Priority2Analysis';
import { Priority3Operations } from '../components/system-reports/Priority3Operations';
import { ExceptionAuditView } from '../components/system-reports/ExceptionAuditView';
import { ContributionView } from '../components/system-reports/ContributionView';
import { DrillDownModal, DrillDownViewMode } from '../components/system-reports/DrillDownModal';
import { SimpleReportView } from '../components/system-reports/SimpleReportView';
import { AllPoReportView } from '../components/system-reports/AllPoReportView';
import { NewCustomReportsView, NewReportTab } from '../components/system-reports/NewCustomReportsView';

import { screenDraftService } from '../services/screenDraftService';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';

export type ReportNavSection = 
  | 'dashboard'
  | 'business_analysis'
  | 'premium_analysis'
  | 'deduction_claim'
  | 'sauda_checkpoints'
  | 'all_po'
  | 'performance_ranking'
  | 'exception_abnormal'
  | 'business_contribution'
  | 'outstanding_po'
  | 'mr_advance_eligible'
  | 'mr_apmc_details'
  | 'mr_delivery_claim';

interface ReportsProps {
  onClose?: () => void;
  initialReportType?: string;
}

export default function Reports({ onClose }: ReportsProps) {
  const [viewMode, setViewMode] = useState<'simple' | 'management'>('simple');
  const [activeSection, setActiveSection] = useState<ReportNavSection>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  
  // Master transactions and filters
  const [allTransactions, setAllTransactions] = useState<ReportTransactionLine[]>([]);
  const [allPoSummary, setAllPoSummary] = useState<SystemReportDataset['allPoSummary']>({
    records: [],
    totalCount: 0,
    totalQuantityMT: 0,
    totalGrossValue: 0,
    saudaDeskCount: 0,
    saudaDeskMT: 0,
    checkPointCount: 0,
    checkPointMT: 0,
    finalPoCount: 0,
    finalPoMT: 0
  });
  const [masterLists, setMasterLists] = useState<SystemReportDataset['masterLists']>({
    brokers: [],
    suppliers: [],
    agencies: [],
    areas: [],
    grades: [],
    months: [],
    financialYears: [],
    saudas: [],
    pos: []
  });

  const [filters, setFilters] = useState<ReportFilterCriteria>(() => 
    screenDraftService.getFilters('system_reports', {})
  );

  useEffect(() => {
    screenDraftService.saveFilters('system_reports', filters);
  }, [filters]);

  // Drill-down Modal State
  const [drillDownInfo, setDrillDownInfo] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    transactions: ReportTransactionLine[];
    viewMode?: DrillDownViewMode;
  }>({
    isOpen: false,
    title: '',
    transactions: [],
    viewMode: 'transactions'
  });

  // Broker Settlement Map for Deductions & Claims
  const [brokerSettlementMap, setBrokerSettlementMap] = useState<SystemReportDataset['brokerSettlementMap']>({});

  // Month Inspection Summaries for Pipeline Reports
  const [monthSummaries, setMonthSummaries] = useState<any[]>([]);

  // Load Data with non-blanking background refresh
  const loadData = async (forceRefresh = false) => {
    // Keep previously loaded data visible during background refreshes
    if (allTransactions.length === 0) {
      setLoading(true);
    }
    try {
      const { allTransactions: txns, masterLists: lists, allPoSummary: poSum, brokerSettlementMap: bMap } = 
        await loadAndProcessSystemReportData(forceRefresh);
      setAllTransactions(txns);
      setMasterLists(lists);
      if (poSum) setAllPoSummary(poSum);
      if (bMap) setBrokerSettlementMap(bMap);
    } catch (err) {
      console.error('Error loading system report dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  useLiveAutoRefresh(() => {
    loadData(true);
  }, [], {
    tables: ['sauda_master', 'purchase_master', 'temporary_material_received', 'final_arrival', 'material_inspection', 'payment_master', 'm_r_settlement'],
    skipInitialLoad: true
  });

  // Filter transactions dynamically
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const match = 
          t.saudaNo.toLowerCase().includes(q) ||
          t.poNo.toLowerCase().includes(q) ||
          t.supplier.toLowerCase().includes(q) ||
          t.broker.toLowerCase().includes(q) ||
          t.area.toLowerCase().includes(q) ||
          t.grade.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (filters.financialYear && t.financialYear !== filters.financialYear) return false;
      if (filters.month && t.month !== filters.month) return false;
      if (filters.broker && t.broker !== filters.broker) return false;
      if (filters.supplier && t.supplier !== filters.supplier) return false;
      if (filters.agency && t.agency !== filters.agency) return false;
      if (filters.area && t.area !== filters.area) return false;
      if (filters.grade && t.grade !== filters.grade) return false;
      if (filters.saudaStatus && t.saudaStatus !== filters.saudaStatus) return false;

      if (filters.dateFrom) {
        if (new Date(t.date) < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo) {
        if (new Date(t.date) > new Date(filters.dateTo + 'T23:59:59')) return false;
      }

      return true;
    });
  }, [allTransactions, filters]);

  // Aggregated Metrics
  const metrics = useMemo(() => {
    return calculateReportMetrics(filteredTransactions);
  }, [filteredTransactions]);

  const dataset: SystemReportDataset = {
    transactions: allTransactions,
    filtered: filteredTransactions,
    allPoSummary,
    brokerSettlementMap,
    masterLists,
    metrics
  };

  const handleOpenDrillDown = (title: string, txns: ReportTransactionLine[], viewMode?: DrillDownViewMode) => {
    setDrillDownInfo({
      isOpen: true,
      title,
      subtitle: `Viewing underlying records (Filtered)`,
      transactions: txns,
      viewMode: viewMode || 'transactions'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!filteredTransactions.length) return;
    const headers = [
      'Txn ID', 'Date', 'Sauda No', 'PO No', 'Supplier', 'Broker', 'Agency', 'Area', 'Grade',
      'Qty (MT)', 'Purchase Rate', 'Base Rate', 'Gross Value', 'Premium', 'Deductions', 'Effective Cost'
    ];
    const rows = filteredTransactions.map(t => [
      t.txnId, t.date, t.saudaNo, t.poNo, t.supplier, t.broker, t.agency, t.area, t.grade,
      t.quantityMT, t.purchaseRate, t.baseRate, t.grossPurchaseValue, t.premiumAmount, t.deductionAmount, t.effectiveCost
    ]);
    exportToCSV(
      `system_report_${activeSection}_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  };

  return (
    <LegacyLayout title="Report" onClose={onClose}>
      <div className="space-y-4 font-sans text-slate-800">
        
        {/* ================= HEADER BAR ================= */}
        <div className="bg-gradient-to-r from-[#D94B5A] via-[#E85A5A] to-[#D94B5A] text-white p-4 rounded-2xl shadow-md border border-[#F06D6C] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl">📊</span>
              <h2 className="text-lg font-black uppercase tracking-wider text-white">
                REPORT
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Mode Switcher Toggle */}
            <div className="flex items-center bg-[#D94B5A] p-1 rounded-xl border border-[#F06D6C] text-xs font-black shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('simple')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'simple'
                    ? 'bg-gradient-to-b from-white to-[#FDE7E6] text-[#D94B5A] shadow-md font-black border border-white'
                    : 'text-white hover:text-white hover:bg-[#F06D6C]/50'
                }`}
              >
                <span>Summary</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('management')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'management'
                    ? 'bg-gradient-to-b from-white to-[#FDE7E6] text-[#D94B5A] shadow-md font-black border border-white'
                    : 'text-white hover:text-white hover:bg-[#F06D6C]/50'
                }`}
              >
                <span>Analysis</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={loading}
              className="px-3 py-2 bg-[#F48F8B] hover:bg-[#F06D6C] text-white text-xs font-bold rounded-xl border border-[#E85A5A] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Reload database"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-[#FDE7E6] hover:bg-white text-[#D94B5A] text-xs font-black rounded-xl border border-[#FBCFCB] transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 bg-[#E85A5A] hover:bg-[#F06D6C] text-white text-xs font-bold rounded-xl border border-[#F48F8B] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* ================= VIEW MODE CONDITIONAL RENDERING ================= */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-[#FBCFCB] p-16 text-center text-slate-400 space-y-3 shadow-xs">
            <RefreshCcw className="w-9 h-9 animate-spin text-[#D94B5A] mx-auto" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Loading Records...
            </h3>
          </div>
        ) : viewMode === 'simple' ? (
          /* SIMPLE VIEW FOR UNDER-LEVEL USER */
          <SimpleReportView
            dataset={dataset}
            onOpenManagementView={() => setViewMode('management')}
          />
        ) : (
          /* MANAGEMENT ANALYSIS (PRIORITY 1 TO 4) */
          <div className="space-y-4">
            {/* SECTION 18: REPORT NAVIGATION STRUCTURE */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#D94B5A] border border-[#F06D6C] rounded-2xl shadow-md">
              {[
                { id: 'dashboard' as const, label: '1. Dashboard', icon: LayoutDashboard, badge: 'Priority 1' },
                { id: 'business_analysis' as const, label: '2. Business Analysis', icon: BarChart3, badge: 'P2' },
                { id: 'premium_analysis' as const, label: '3. Premium Analysis', icon: Percent, badge: 'P2' },
                { id: 'deduction_claim' as const, label: '4. Deduction & Claim', icon: Scissors, badge: 'P3' },
                { id: 'sauda_checkpoints' as const, label: '5. Checkpoints Pipeline', icon: Truck, badge: 'P3' },
                { id: 'all_po' as const, label: '6. ALL PO', icon: Layers, badge: `${allPoSummary.totalCount || 0}` },
                { id: 'performance_ranking' as const, label: '7. Performance Ranking', icon: Award, badge: 'P2' },
                { id: 'exception_abnormal' as const, label: '8. Exception / Abnormal', icon: AlertTriangle, badge: `${metrics.abnormalCount}` },
                { id: 'business_contribution' as const, label: '9. Contribution & Pareto', icon: PieChart, badge: 'P9' },
                { id: 'outstanding_po' as const, label: '10. Outstanding P.O List', icon: Briefcase, badge: 'PO' },
                { id: 'mr_advance_eligible' as const, label: '11. MR Eligible for Advance', icon: UserCheck, badge: 'Advance' },
                { id: 'mr_apmc_details' as const, label: '12. MR Wise APMC Details', icon: DollarSign, badge: 'APMC' },
                { id: 'mr_delivery_claim' as const, label: '13. MR Wise Delivery Claim', icon: Clock, badge: 'Claim' },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-b from-white to-[#FDE7E6] text-[#D94B5A] font-black shadow-md border border-white'
                        : 'text-white hover:bg-[#F06D6C]/50 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#D94B5A]' : 'text-[#FBCFCB]'}`} />
                    <span>{tab.label}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-[#D94B5A] text-white' : 'bg-[#FBCFCB] text-[#D94B5A]'
                    }`}>
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* SECTION 19: STANDARD FILTER BAR */}
            <ReportFilterBar
              filters={filters}
              masterLists={masterLists}
              onFilterChange={setFilters}
              onReset={() => setFilters({})}
              filteredCount={filteredTransactions.length}
              totalCount={allTransactions.length}
            />

            {/* 1. Dashboard (Priority 1) */}
            {activeSection === 'dashboard' && (
              <Priority1Dashboard dataset={dataset} onDrillDown={handleOpenDrillDown} />
            )}

            {/* 2. Business Analysis (Priority 2) */}
            {activeSection === 'business_analysis' && (
              <Priority2Analysis dataset={dataset} onDrillDown={handleOpenDrillDown} defaultSubTab="business" />
            )}

            {/* 3. Premium Analysis (Priority 2) */}
            {activeSection === 'premium_analysis' && (
              <Priority2Analysis dataset={dataset} onDrillDown={handleOpenDrillDown} defaultSubTab="premium" />
            )}

            {/* 5. Deduction & Claim (Priority 3) */}
            {activeSection === 'deduction_claim' && (
              <Priority3Operations dataset={dataset} onDrillDown={handleOpenDrillDown} defaultSubTab="quality" />
            )}

            {/* 6. Sauda / PO Checkpoints (Priority 3) */}
            {activeSection === 'sauda_checkpoints' && (
              <Priority3Operations dataset={dataset} onDrillDown={handleOpenDrillDown} defaultSubTab="pipeline" />
            )}

            {/* ALL PO Master Report (sauda_master, sauda_check_point, purchase_master) */}
            {activeSection === 'all_po' && (
              <AllPoReportView dataset={dataset} onDrillDown={handleOpenDrillDown} />
            )}

            {/* 7. Performance Ranking (Priority 2) */}
            {activeSection === 'performance_ranking' && (
              <Priority2Analysis dataset={dataset} onDrillDown={handleOpenDrillDown} defaultSubTab="ranking" />
            )}

            {/* 8. Exception / Abnormal (Priority 1-D / 8) */}
            {activeSection === 'exception_abnormal' && (
              <ExceptionAuditView dataset={dataset} onDrillDown={handleOpenDrillDown} />
            )}

            {/* 9. Business Contribution (Priority 9) */}
            {activeSection === 'business_contribution' && (
              <ContributionView dataset={dataset} onDrillDown={handleOpenDrillDown} />
            )}

            {/* 10-13. Main Report Sections (Outstanding PO, MR Advance Eligible, MR APMC Details, MR Delivery Claim) */}
            {(activeSection === 'outstanding_po' ||
              activeSection === 'mr_advance_eligible' ||
              activeSection === 'mr_apmc_details' ||
              activeSection === 'mr_delivery_claim') && (
              <NewCustomReportsView initialTab={activeSection} filters={filters} />
            )}

          </div>
        )}

        {/* ================= DRILL-DOWN MODAL ================= */}
        {drillDownInfo.isOpen && (
          <DrillDownModal
            title={drillDownInfo.title}
            subtitle={drillDownInfo.subtitle}
            transactions={drillDownInfo.transactions}
            viewMode={drillDownInfo.viewMode}
            onClose={() => setDrillDownInfo(prev => ({ ...prev, isOpen: false }))}
          />
        )}

      </div>
    </LegacyLayout>
  );
}
