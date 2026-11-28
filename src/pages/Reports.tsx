import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Award,
  Percent,
  Truck,
  AlertTriangle,
  Briefcase,
  UserCheck,
  DollarSign,
  Clock,
  Scale,
  TrendingDown,
  History,
  RefreshCcw,
  Download,
  Printer
} from 'lucide-react';
import LegacyLayout from '../components/LegacyLayout';
import {
  loadAndProcessSystemReportData,
  calculateReportMetrics,
  calculateExecutiveOverviewMetrics,
  filterByReportCriteria,
  ReportFilterCriteria,
  ReportTransactionLine,
  PaymentOperationsVoucher,
  MillInspectionQualityRecord,
  FinalArrivalMrRef,
  ShortExcessSummaryItem,
  DashboardPipelineSummary,
  SystemReportDataset
} from '../services/systemReportEngine';
import { exportToCSV } from '../utils/exportHelpers';

import { ReportFilterBar } from '../components/system-reports/ReportFilterBar';
import { Priority1Dashboard } from '../components/system-reports/Priority1Dashboard';
import { UnifiedBusinessAnalysisView } from '../components/system-reports/UnifiedBusinessAnalysisView';
import { Priority3Operations } from '../components/system-reports/Priority3Operations';
import { ExceptionAuditView } from '../components/system-reports/ExceptionAuditView';
import { DrillDownModal, DrillDownViewMode } from '../components/system-reports/DrillDownModal';
import { NewCustomReportsView, NewReportTab } from '../components/system-reports/NewCustomReportsView';
import { SystemChangeLogReportView } from '../components/system-reports/SystemChangeLogReportView';
import { GradeDownReportView } from '../components/system-reports/GradeDownReportView';

import { screenDraftService } from '../services/screenDraftService';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';

export type ReportNavSection =
  | 'dashboard'
  | 'business_analysis'
  | 'performance_ranking'
  | 'premium_analysis'
  | 'sauda_checkpoints'
  | 'exception_abnormal'
  | 'outstanding_po'
  | 'mr_advance_eligible'
  | 'mr_apmc_details'
  | 'mr_delivery_claim'
  | 'short_excess_deduction'
  | 'grade_down_wise'
  | 'change_log';

interface ReportsProps {
  onClose?: () => void;
  initialReportType?: string;
}

const VALID_SECTIONS: ReportNavSection[] = [
  'dashboard',
  'business_analysis',
  'performance_ranking',
  'premium_analysis',
  'sauda_checkpoints',
  'exception_abnormal',
  'outstanding_po',
  'mr_advance_eligible',
  'mr_apmc_details',
  'mr_delivery_claim',
  'short_excess_deduction',
  'grade_down_wise',
  'change_log'
];

const CUSTOM_REPORT_TABS: NewReportTab[] = [
  'outstanding_po',
  'mr_advance_eligible',
  'mr_apmc_details',
  'mr_delivery_claim',
  'short_excess_deduction'
];

export default function Reports({ onClose, initialReportType }: ReportsProps) {
  const [activeSection, setActiveSection] = useState<ReportNavSection>(() => {
    if (initialReportType && VALID_SECTIONS.includes(initialReportType as ReportNavSection)) {
      return initialReportType as ReportNavSection;
    }
    return 'dashboard';
  });
  const [loading, setLoading] = useState<boolean>(true);

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
  const [brokerSettlementMap, setBrokerSettlementMap] = useState<SystemReportDataset['brokerSettlementMap']>({});
  const [paymentOperations, setPaymentOperations] = useState<PaymentOperationsVoucher[]>([]);
  const [millInspections, setMillInspections] = useState<MillInspectionQualityRecord[]>([]);
  const [finalArrivalMrs, setFinalArrivalMrs] = useState<FinalArrivalMrRef[]>([]);
  const [shortExcessItems, setShortExcessItems] = useState<ShortExcessSummaryItem[]>([]);
  const [dashboardPipeline, setDashboardPipeline] = useState<DashboardPipelineSummary | undefined>(undefined);

  const [filters, setFilters] = useState<ReportFilterCriteria>(() =>
    screenDraftService.getFilters('system_reports', {})
  );

  useEffect(() => {
    screenDraftService.saveFilters('system_reports', filters);
  }, [filters]);

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

  const loadData = async (forceRefresh = false) => {
    if (allTransactions.length === 0) {
      setLoading(true);
    }
    try {
      const {
        allTransactions: txns,
        masterLists: lists,
        allPoSummary: poSum,
        brokerSettlementMap: bMap,
        paymentOperations: payOps,
        millInspections: mInsp,
        finalArrivalMrs: fMrs,
        shortExcessItems: seItems,
        dashboardPipeline: dPipe
      } = await loadAndProcessSystemReportData(forceRefresh);
      setAllTransactions(txns);
      setMasterLists(lists);
      if (poSum) setAllPoSummary(poSum);
      if (bMap) setBrokerSettlementMap(bMap);
      setPaymentOperations(payOps || []);
      setMillInspections(mInsp || []);
      setFinalArrivalMrs(fMrs || []);
      setShortExcessItems(seItems || []);
      setDashboardPipeline(dPipe);
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
    tables: [
      'sauda_master',
      'sauda_check_point',
      'sauda_check_point_details',
      'sauda_check_point_deductions',
      'purchase_master',
      'temporary_material_received',
      'final_arrival',
      'material_inspection',
      'mill_inspection_master',
      'mill_inspection_detail',
      'moisture_logic',
      'payment_master',
      'mr_settlement_master',
      'material_mismatch',
      'satta_mismatch'
    ],
    skipInitialLoad: true
  });

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
      if (filters.agency) {
        const matchesDetail = Array.isArray(t.detailAgencies) && t.detailAgencies.includes(filters.agency);
        const parts = (t.agency || '').split(',').map(p => p.trim());
        if (!matchesDetail && t.agency !== filters.agency && !parts.includes(filters.agency)) return false;
      }
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

  const filteredPaymentOperations = useMemo(
    () => filterByReportCriteria(paymentOperations, filters),
    [paymentOperations, filters]
  );

  const filteredMillInspections = useMemo(
    () => filterByReportCriteria(millInspections, filters),
    [millInspections, filters]
  );

  const filteredFinalArrivalMrs = useMemo(
    () => filterByReportCriteria(finalArrivalMrs, filters),
    [finalArrivalMrs, filters]
  );

  const filteredShortExcessItems = useMemo(
    () => filterByReportCriteria(shortExcessItems, filters),
    [shortExcessItems, filters]
  );

  const metrics = useMemo(() => {
    return calculateReportMetrics(filteredTransactions);
  }, [filteredTransactions]);

  const executiveOverview = useMemo(
    () =>
      calculateExecutiveOverviewMetrics({
        transactions: filteredTransactions,
        paymentOperations: filteredPaymentOperations,
        millInspections: filteredMillInspections,
        finalArrivalMrs: filteredFinalArrivalMrs,
        shortExcessItems: filteredShortExcessItems
      }),
    [
      filteredTransactions,
      filteredPaymentOperations,
      filteredMillInspections,
      filteredFinalArrivalMrs,
      filteredShortExcessItems
    ]
  );

  const dataset: SystemReportDataset = {
    transactions: allTransactions,
    filtered: filteredTransactions,
    allPoSummary,
    paymentOperations,
    filteredPaymentOperations,
    millInspections,
    filteredMillInspections,
    finalArrivalMrs,
    filteredFinalArrivalMrs,
    shortExcessItems,
    filteredShortExcessItems,
    dashboardPipeline,
    executiveOverview,
    brokerSettlementMap,
    masterLists,
    metrics
  };

  const handleOpenDrillDown = (title: string, txns: ReportTransactionLine[], viewMode?: DrillDownViewMode) => {
    setDrillDownInfo({
      isOpen: true,
      title,
      subtitle: 'Underlying PO & Sauda records matching active filters',
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
      'Txn ID',
      'Date',
      'Sauda No',
      'PO No',
      'Supplier',
      'Broker',
      'Agency',
      'Area',
      'Grade',
      'Contract Qty (MT)',
      'Received Qty (MT)',
      'In-Transit (MT)',
      'Pending Qty (MT)',
      'Purchase Rate',
      'Base Rate',
      'Gross Value',
      'Premium',
      'Deductions',
      'Effective Cost',
      'Advance Paid',
      'Settled Amount',
      'Settlement Status'
    ];
    const rows = filteredTransactions.map(t => [
      t.txnId,
      t.date,
      t.saudaNo,
      t.poNo,
      t.supplier,
      t.broker,
      t.agency,
      t.area,
      t.grade,
      t.quantityMT.toFixed(3),
      t.arrivedWeightMT.toFixed(3),
      (t.inTransitWeightMT || 0).toFixed(3),
      t.pendingWeightMT.toFixed(3),
      t.purchaseRate,
      t.baseRate,
      Math.round(t.grossPurchaseValue),
      Math.round(t.premiumAmount),
      Math.round(t.deductionAmount),
      Math.round(t.effectiveCost),
      Math.round(t.paidAmount),
      Math.round(t.settledAmount || 0),
      t.settlementStatus
    ]);
    exportToCSV(
      `rj_bjcl_report_${activeSection}_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  };

  const analyticsTabs: Array<{
    id: ReportNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'dashboard', label: 'Executive Overview', icon: LayoutDashboard, badge: `${executiveOverview.scpPoCount}` },
    { id: 'business_analysis', label: 'Business & Dimensions', icon: BarChart3 },
    { id: 'performance_ranking', label: 'Broker Ranking', icon: Award },
    { id: 'premium_analysis', label: 'Premium & Cost Waterfall', icon: Percent },
    { id: 'sauda_checkpoints', label: 'Checkpoints Pipeline', icon: Truck },
    { id: 'exception_abnormal', label: 'Exception / Abnormal', icon: AlertTriangle, badge: `${metrics.abnormalCount}` }
  ];

  const operationalTabs: Array<{
    id: ReportNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'outstanding_po', label: 'Outstanding P.O List', icon: Briefcase },
    { id: 'mr_advance_eligible', label: 'MR Eligible for Advance', icon: UserCheck },
    { id: 'mr_apmc_details', label: 'MR Wise APMC Details', icon: DollarSign },
    { id: 'mr_delivery_claim', label: 'MR Wise Delivery Claim', icon: Clock },
    { id: 'short_excess_deduction', label: 'Short & Excess Deduction', icon: Scale },
    { id: 'grade_down_wise', label: 'Grade Down Wise Report', icon: TrendingDown },
    { id: 'change_log', label: 'System Change Log', icon: History }
  ];

  const isCustomReportActive = CUSTOM_REPORT_TABS.includes(activeSection as NewReportTab);

  return (
    <LegacyLayout title="Report" onClose={onClose}>
      <div className="space-y-4 font-sans text-slate-800">
        {/* ================= UNIFIED REPORT HEADER ================= */}
        <div className="bg-gradient-to-r from-[#D94B5A] via-[#E85A5A] to-[#D94B5A] text-white px-5 py-3.5 rounded-2xl shadow-md border border-[#F06D6C] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-white leading-tight">
              Unified Procurement &amp; Audit Reports
            </h2>
            <p className="text-[11px] font-medium text-[#FDE7E6] mt-0.5">
              Single source of truth across Sauda, PO, Arrival, Mill Inspection, Payment, Settlement &amp; Audit Logs
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={loading}
              className="px-3 py-2 bg-[#F48F8B] hover:bg-[#F06D6C] text-white text-xs font-bold rounded-xl border border-[#E85A5A] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Reload live database records"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-[#FDE7E6] hover:bg-white text-[#D94B5A] text-xs font-black rounded-xl border border-[#FBCFCB] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
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

        {/* ================= UNIFIED COMPACT REPORT NAVIGATION ================= */}
        <div className="bg-white border border-slate-200 rounded-2xl px-2.5 py-2 shadow-xs space-y-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="w-[72px] shrink-0 text-[9px] font-black uppercase tracking-widest text-slate-400 px-1.5">
              Analytics
            </span>
            {analyticsTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all duration-150 flex items-center gap-1 cursor-pointer border whitespace-nowrap ${
                    isActive
                      ? 'bg-[#D94B5A] text-white border-[#D94B5A] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#FDE7E6] hover:text-[#D94B5A] hover:border-[#FBCFCB]'
                  }`}
                >
                  <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-[#D94B5A]'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded tabular-nums leading-none ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-1.5 flex flex-wrap items-center gap-1">
            <span className="w-[72px] shrink-0 text-[9px] font-black uppercase tracking-widest text-slate-400 px-1.5">
              Operations
            </span>
            {operationalTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all duration-150 flex items-center gap-1 cursor-pointer border whitespace-nowrap ${
                    isActive
                      ? 'bg-[#D94B5A] text-white border-[#D94B5A] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#FDE7E6] hover:text-[#D94B5A] hover:border-[#FBCFCB]'
                  }`}
                >
                  <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-[#D94B5A]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400 space-y-3 shadow-xs">
            <RefreshCcw className="w-9 h-9 animate-spin text-[#D94B5A] mx-auto" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Loading Unified Procurement Dataset...
            </h3>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSection !== 'change_log' && (
              <ReportFilterBar
                filters={filters}
                masterLists={masterLists}
                onFilterChange={setFilters}
                onReset={() => setFilters({})}
                filteredCount={filteredTransactions.length}
                totalCount={allTransactions.length}
              />
            )}

            {activeSection === 'dashboard' && (
              <Priority1Dashboard dataset={dataset} onDrillDown={handleOpenDrillDown} />
            )}

            {activeSection === 'business_analysis' && (
              <UnifiedBusinessAnalysisView
                dataset={dataset}
                mode="business"
                onDrillDown={handleOpenDrillDown}
              />
            )}

            {activeSection === 'performance_ranking' && (
              <UnifiedBusinessAnalysisView
                dataset={dataset}
                mode="ranking"
                onDrillDown={handleOpenDrillDown}
              />
            )}

            {activeSection === 'premium_analysis' && (
              <UnifiedBusinessAnalysisView
                dataset={dataset}
                mode="premium"
                onDrillDown={handleOpenDrillDown}
              />
            )}

            {activeSection === 'sauda_checkpoints' && (
              <Priority3Operations dataset={dataset} onDrillDown={handleOpenDrillDown} defaultSubTab="pipeline" />
            )}

            {activeSection === 'exception_abnormal' && (
              <ExceptionAuditView dataset={dataset} onDrillDown={handleOpenDrillDown} />
            )}

            {isCustomReportActive && (
              <NewCustomReportsView
                initialTab={activeSection as NewReportTab}
                filters={filters}
              />
            )}

            {activeSection === 'grade_down_wise' && <GradeDownReportView filters={filters} />}

            {activeSection === 'change_log' && <SystemChangeLogReportView />}
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
