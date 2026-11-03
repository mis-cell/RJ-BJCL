import React, { useState, useMemo } from 'react';
import { 
  compileReportData, 
  CompiledReportData 
} from '../../services/reportCalculations';
import { ReportFilterBar, ReportFilters } from './ReportFilterBar';
import { PercentageKPISection } from './PercentageKPISection';
import { TraceableKpiModal } from './TraceableKpiModal';
import { ReconciliationReportModal } from './ReconciliationReportModal';
import { BrokerPercentageReport } from './BrokerPercentageReport';
import { AreaPercentageReport } from './AreaPercentageReport';
import { SupplierPercentageReport } from './SupplierPercentageReport';
import { MonthWisePerformanceReport } from './MonthWisePerformanceReport';
import { GradeItemPercentageReport } from './GradeItemPercentageReport';
import { ActivePendingLedger } from './ActivePendingLedger';
import { POSummaryPercentageEngine } from './POSummaryPercentageEngine';
import { DeliveryComplianceMatrix } from './DeliveryComplianceMatrix';
import { FinancialCostAnalytics } from './FinancialCostAnalytics';
import { FullPipelineAuditReport } from './FullPipelineAuditReport';
import { ReportChartsDeck } from './ReportChartsDeck';
import { 
  BarChart3, 
  PieChart, 
  Users, 
  MapPin, 
  UserCheck, 
  Calendar, 
  Package, 
  Clock, 
  FileCheck, 
  ShieldCheck, 
  DollarSign, 
  GitCommit,
  Layers,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

interface PercentageWiseAnalyticsSectionProps {
  saudaData: any[];
  poData: any[];
  poDetails?: any[];
  mrData?: any[];
  tempMRData?: any[];
  paymentData?: any[];
  scpData?: any[];
}

export type AnalyticsSubTab = 
  | 'overview'
  | 'broker'
  | 'area'
  | 'supplier'
  | 'monthly'
  | 'grade'
  | 'pending_ledger'
  | 'po_lifecycle'
  | 'compliance'
  | 'financial'
  | 'audit'
  | 'audit_reconciliation';

export const PercentageWiseAnalyticsSection: React.FC<PercentageWiseAnalyticsSectionProps> = ({
  saudaData,
  poData,
  poDetails = [],
  mrData = [],
  tempMRData = [],
  paymentData = [],
  scpData = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('overview');
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  const [showReconciliationModal, setShowReconciliationModal] = useState<boolean>(false);

  const [filters, setFilters] = useState<ReportFilters>({
    financialYear: 'ALL',
    month: 'ALL',
    startDate: '',
    endDate: '',
    supplier: 'ALL',
    broker: 'ALL',
    area: 'ALL',
    grade: 'ALL',
    status: 'ALL',
    searchTerm: ''
  });

  // Extract distinct filter options
  const filterOptions = useMemo(() => {
    const suppliers = new Set<string>();
    const brokers = new Set<string>();
    const areas = new Set<string>();
    const financialYears = new Set<string>();

    poData.forEach(p => {
      if (p.supplier) suppliers.add(p.supplier.trim());
      if (p.broker) brokers.add(p.broker.trim());
      if (p.area) areas.add(p.area.trim());
      if (p.financial_year) financialYears.add(p.financial_year.trim());
    });

    scpData.forEach(s => {
      if (s.supplier) suppliers.add(s.supplier.trim());
      if (s.broker) brokers.add(s.broker.trim());
      if (s.area) areas.add(s.area.trim());
      if (s.financial_year) financialYears.add(s.financial_year.trim());
    });

    saudaData.forEach(s => {
      if (s.supplier) suppliers.add(s.supplier.trim());
      if (s.broker) brokers.add(s.broker.trim());
      if (s.area) areas.add(s.area.trim());
      if (s.financial_year) financialYears.add(s.financial_year.trim());
    });

    return {
      suppliers: Array.from(suppliers).sort(),
      brokers: Array.from(brokers).sort(),
      areas: Array.from(areas).sort(),
      financialYears: Array.from(financialYears).sort()
    };
  }, [saudaData, poData, scpData]);

  // Compile full analytical dataset with Sauda Desk checkpoint alignment
  const compiledData: CompiledReportData = useMemo(() => {
    return compileReportData(saudaData, poData, poDetails, mrData, tempMRData, paymentData, filters, scpData);
  }, [saudaData, poData, poDetails, mrData, tempMRData, paymentData, filters, scpData]);

  const SUB_TABS: { key: AnalyticsSubTab; label: string; icon: any; count?: number | string }[] = [
    { key: 'overview', label: '1. Executive KPI & Charts', icon: BarChart3 },
    { key: 'broker', label: '2. Broker Performance', icon: UserCheck, count: `${compiledData.brokerSummary.length}` },
    { key: 'area', label: '3. Area Logistics', icon: MapPin, count: `${compiledData.areaSummary.length}` },
    { key: 'supplier', label: '4. Supplier Scorecard', icon: Users, count: `${compiledData.supplierSummary.length}` },
    { key: 'monthly', label: '5. Month-Wise Matrix', icon: Calendar, count: `${compiledData.monthWisePerformance.length}` },
    { key: 'grade', label: '6. Grade & Quality', icon: Package, count: `${compiledData.gradeItemSummary.length}` },
    { key: 'pending_ledger', label: '7. Active Pending Ledger', icon: Clock, count: `${compiledData.activePendingLedger.length}` },
    { key: 'po_lifecycle', label: '8. PO vs MR Engine', icon: FileCheck, count: `${compiledData.poSummaryEngine.rows.length}` },
    { key: 'compliance', label: '9. Delivery Compliance', icon: ShieldCheck, count: `${compiledData.deliveryCompliance.length}` },
    { key: 'financial', label: '10. Financial & Cost', icon: DollarSign, count: `${compiledData.financialAnalytics.paymentCompletionPct}%` },
    { key: 'audit', label: '11. Pipeline Audit', icon: GitCommit, count: `${compiledData.fullPipelineAudit.length}` },
    { key: 'audit_reconciliation', label: '12. Reconciliation Audit', icon: ShieldCheck, count: `${compiledData.reconciliationReport?.length || 7} KPIs` },
  ];

  return (
    <div className="space-y-4">
      {/* Universal Filter Bar */}
      <ReportFilterBar 
        filters={filters}
        onFilterChange={setFilters}
        suppliers={filterOptions.suppliers}
        brokers={filterOptions.brokers}
        areas={filterOptions.areas}
        financialYears={filterOptions.financialYears}
      />

      {/* Standard KPI Cards Section with Traceable Clicks */}
      <PercentageKPISection 
        kpis={compiledData.kpis} 
        onCardClick={(kpiKey) => setSelectedKpi(kpiKey)}
        onOpenReconciliation={() => setShowReconciliationModal(true)}
      />

      {/* Sub-Tab Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-sm flex flex-wrap items-center gap-1.5" id="percentage-sub-tabs-container">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`tab-analytics-${tab.key}`}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 font-black scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold leading-none ${
                  isActive ? 'bg-emerald-800 text-emerald-100 border border-emerald-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Viewport */}
      <div className="transition-all duration-200">
        {activeSubTab === 'overview' && (
          <div className="space-y-4">
            <ReportChartsDeck reportData={compiledData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BrokerPercentageReport brokerSummary={compiledData.brokerSummary.slice(0, 10)} />
              <AreaPercentageReport areaSummary={compiledData.areaSummary.slice(0, 10)} />
            </div>
          </div>
        )}

        {activeSubTab === 'broker' && (
          <BrokerPercentageReport brokerSummary={compiledData.brokerSummary} />
        )}

        {activeSubTab === 'area' && (
          <AreaPercentageReport areaSummary={compiledData.areaSummary} />
        )}

        {activeSubTab === 'supplier' && (
          <SupplierPercentageReport supplierSummary={compiledData.supplierSummary} />
        )}

        {activeSubTab === 'monthly' && (
          <MonthWisePerformanceReport monthWisePerformance={compiledData.monthWisePerformance} />
        )}

        {activeSubTab === 'grade' && (
          <GradeItemPercentageReport gradeItemSummary={compiledData.gradeItemSummary} />
        )}

        {activeSubTab === 'pending_ledger' && (
          <ActivePendingLedger 
            activePendingLedger={compiledData.activePendingLedger}
            ageingDistribution={compiledData.ageingDistribution}
          />
        )}

        {activeSubTab === 'po_lifecycle' && (
          <POSummaryPercentageEngine poSummaryEngine={compiledData.poSummaryEngine} />
        )}

        {activeSubTab === 'compliance' && (
          <DeliveryComplianceMatrix deliveryCompliance={compiledData.deliveryCompliance} />
        )}

        {activeSubTab === 'financial' && (
          <FinancialCostAnalytics 
            financialAnalytics={compiledData.financialAnalytics} 
            fullPipelineAudit={compiledData.fullPipelineAudit}
            monthWisePerformance={compiledData.monthWisePerformance}
          />
        )}

        {activeSubTab === 'audit' && (
          <FullPipelineAuditReport fullPipelineAudit={compiledData.fullPipelineAudit} kpis={compiledData.kpis} />
        )}

        {activeSubTab === 'audit_reconciliation' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      Integrity Audit
                    </span>
                    <span className="text-slate-400 text-xs">•</span>
                    <span className="text-slate-500 text-xs">Live Source-Table Reconciliation</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    System Report Metric Discrepancy Reconciliation
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    Side-by-side reconciliation between previous buggy dashboard figures and the corrected, live-reconciled metrics. Click any KPI card above to view the exact underlying records.
                  </p>
                </div>

                <button
                  onClick={() => setShowReconciliationModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Open Full Reconciliation View
                </button>
              </div>

              {/* Grid of Reconciled KPIs */}
              <div className="grid grid-cols-1 gap-3.5">
                {compiledData.reconciliationReport.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-black text-slate-900 text-xs">{item.metricName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Source: {item.sourceTable}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                      <div className="bg-rose-50 border border-rose-200 rounded p-2 text-rose-950">
                        <div className="text-[10px] font-sans text-rose-600 uppercase font-bold">Old Discrepant Value</div>
                        <div className="font-bold text-xs mt-0.5">{item.oldValue}</div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-300 rounded p-2 text-emerald-950">
                        <div className="text-[10px] font-sans text-emerald-700 uppercase font-bold">Corrected Reconciled Value</div>
                        <div className="font-bold text-xs mt-0.5">{item.correctedValue}</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 font-sans leading-relaxed bg-white border border-slate-200/80 rounded p-2">
                      <span className="font-bold text-slate-900">Cause of Difference: </span>
                      {item.causeOfDifference}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                      <div>
                        <span className="font-semibold text-slate-600">Formula: </span>
                        <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">{item.formula}</code>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Rules: </span>
                        <span>{item.statusRules}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Traceable Records Modal Dialog */}
      {selectedKpi && (
        <TraceableKpiModal 
          details={compiledData.traceableRecords[selectedKpi] || null}
          onClose={() => setSelectedKpi(null)}
        />
      )}

      {/* Reconciliation Report Modal Dialog */}
      {showReconciliationModal && (
        <ReconciliationReportModal 
          reportItems={compiledData.reconciliationReport || []}
          onClose={() => setShowReconciliationModal(false)}
        />
      )}
    </div>
  );
};
