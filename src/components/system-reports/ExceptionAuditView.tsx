import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Download, 
  Printer, 
  Filter, 
  RefreshCw, 
  Eye, 
  X, 
  Info,
  Calendar,
  Layers,
  Scale,
  DollarSign
} from 'lucide-react';
import { SystemReportDataset, ReportTransactionLine } from '../../services/systemReportEngine';
import { 
  analyzeBrokerSuspiciousData, 
  BrokerSuspicionSummary, 
  SuspiciousAnomalyRecord 
} from '../../services/brokerSuspicionService';
import { dbModule } from '../../services/dbModule';
import { cn, formatIndianCurrency } from '../../lib/utils';

interface ExceptionAuditViewProps {
  dataset: SystemReportDataset;
  onDrillDown: (title: string, txns: ReportTransactionLine[]) => void;
  initialBroker?: string;
}

export const ExceptionAuditView: React.FC<ExceptionAuditViewProps> = ({
  dataset,
  onDrillDown,
  initialBroker
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [summaries, setSummaries] = useState<BrokerSuspicionSummary[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<SuspiciousAnomalyRecord | null>(null);

  // Filters
  const [selectedBroker, setSelectedBroker] = useState<string>(initialBroker || 'ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [anomalyTypeFilter, setAnomalyTypeFilter] = useState<string>('ALL');
  const [workflowStageFilter, setWorkflowStageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Status overrides stored locally
  const [statusOverrides, setStatusOverrides] = useState<Record<string, SuspiciousAnomalyRecord['verificationStatus']>>({});

  // Load latest data across all tables
  const loadAbnormalData = async () => {
    setLoading(true);
    try {
      const [
        saudas,
        pos,
        scp,
        farr,
        insp,
        payments,
        settlements
      ] = await Promise.all([
        dbModule.fetchAll('sauda_master').catch(() => []),
        dbModule.fetchAll('purchase_master').catch(() => []),
        dbModule.fetchAll('sauda_check_point').catch(() => []),
        dbModule.fetchAll('final_arrival').catch(() => []),
        dbModule.fetchAll('material_inspection').catch(() => []),
        dbModule.fetchAll('payment_master').catch(() => []),
        dbModule.fetchAll('settlement_master').catch(() => [])
      ]);

      const result = analyzeBrokerSuspiciousData({
        saudas,
        pos,
        saudaCheckPoints: scp,
        finalArrivals: farr,
        inspections: insp,
        paymentRecords: payments,
        settlements
      });

      setSummaries(result);
    } catch (err) {
      console.error('Error analyzing abnormal data records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAbnormalData();
  }, []);

  // Update broker if initialBroker changes
  useEffect(() => {
    if (initialBroker) {
      setSelectedBroker(initialBroker);
    }
  }, [initialBroker]);

  // Flatten all anomaly records across all brokers
  const allAnomalies = useMemo(() => {
    const list: SuspiciousAnomalyRecord[] = [];
    summaries.forEach(s => {
      s.anomalies.forEach(a => list.push(a));
    });
    return list;
  }, [summaries]);

  // Master broker list for filter dropdown
  const brokerOptions = useMemo(() => {
    const set = new Set<string>();
    summaries.forEach(s => {
      if (s.anomalyCount > 0) set.add(s.brokerName);
    });
    return Array.from(set).sort();
  }, [summaries]);

  // Filtered anomalies
  const filteredAnomalies = useMemo(() => {
    return allAnomalies.filter(item => {
      if (selectedBroker !== 'ALL' && item.brokerName.toUpperCase() !== selectedBroker.toUpperCase()) {
        return false;
      }
      if (severityFilter !== 'ALL' && item.severity !== severityFilter) {
        return false;
      }
      if (anomalyTypeFilter !== 'ALL' && item.anomalyType !== anomalyTypeFilter) {
        return false;
      }
      if (workflowStageFilter !== 'ALL' && item.workflowStage !== workflowStageFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.brokerName.toLowerCase().includes(q) ||
          item.saudaNo.toLowerCase().includes(q) ||
          item.poNo.toLowerCase().includes(q) ||
          item.mrNo.toLowerCase().includes(q) ||
          item.detectionReason.toLowerCase().includes(q) ||
          item.anomalyType.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allAnomalies, selectedBroker, severityFilter, anomalyTypeFilter, workflowStageFilter, searchQuery]);

  // KPI Calculations
  const highSeverityCount = filteredAnomalies.filter(a => a.severity === 'High').length;
  const duplicateCount = filteredAnomalies.filter(a => a.anomalyType === 'Exact Duplicate Transaction').length;
  const weightMismatchCount = filteredAnomalies.filter(a => a.anomalyType === 'Contract vs Arrived Weight Mismatch').length;
  const rateDiscrepancyCount = filteredAnomalies.filter(a => a.anomalyType === 'Zero or Missing Rate' || a.anomalyType === 'Unusual Rate Variance').length;

  const handleExportCSV = () => {
    if (!filteredAnomalies.length) return;
    const headers = [
      'Sl No', 'Broker Name', 'MR Number', 'Sauda Number', 'P.O. Number', 'Transaction Date',
      'Contract Weight (MT)', 'Temporary Arrival Weight (MT)', 'Final Arrival Weight (MT)', 'Mill Inspection Weight (MT)',
      'Sauda B Rate (₹/Qtl)', 'Deduction Type', 'Deduction Qty or Pct', 'Deduction Amount (₹)',
      'Expected Value', 'Actual Value', 'Difference', 'Abnormality Type', 'Detection Reason', 'Severity', 'Verification Status'
    ];
    const rows = filteredAnomalies.map((a, idx) => {
      const vStatus = statusOverrides[a.id] || a.verificationStatus;
      return [
        idx + 1,
        `"${a.brokerName}"`,
        `"${a.mrNo || '—'}"`,
        `"${a.saudaNo || '—'}"`,
        `"${a.poNo || '—'}"`,
        `"${a.transactionDate || '—'}"`,
        a.contractWeight > 0 ? a.contractWeight.toFixed(2) : '—',
        a.tempArrivalWeight > 0 ? a.tempArrivalWeight.toFixed(2) : '—',
        a.finalArrivalWeight > 0 ? a.finalArrivalWeight.toFixed(2) : '—',
        a.millInspectionWeight > 0 ? a.millInspectionWeight.toFixed(2) : '—',
        a.saudaRate > 0 ? a.saudaRate : '—',
        `"${a.deductionType || '—'}"`,
        `"${a.deductionQtyOrPct || '—'}"`,
        a.deductionAmount > 0 ? a.deductionAmount : '—',
        `"${a.expectedValue}"`,
        `"${a.actualValue}"`,
        `"${a.difference}"`,
        `"${a.anomalyType}"`,
        `"${a.detectionReason.replace(/"/g, '""')}"`,
        a.severity,
        vStatus
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `abnormal_data_analysis_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      
      {/* ================= HEADER BAR ================= */}
      <div className="p-4 bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white rounded-2xl border border-rose-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-600/30 border border-rose-500 flex items-center justify-center text-rose-300 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                8. SAUDA / P.O. WISE ABNORMAL DATA ANALYSIS
              </h3>
              <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                20-Field Audit Active
              </span>
            </div>
            <p className="text-xs text-rose-200/90 mt-0.5">
              Deep-layer business analysis identifying duplicates, calculation errors, weight discrepancies, and missing rates
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={loadAbnormalData}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            title="Re-run deep anomaly scan"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Re-Scan</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black rounded-xl border border-yellow-300 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ================= KPI CARDS RIBBON ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Flagged Records</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">{filteredAnomalies.length}</span>
          <span className="text-[10px] text-slate-400">across {brokerOptions.length} brokers</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs bg-rose-50/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">High Severity Alerts</span>
          <span className="text-xl font-black text-rose-700 font-mono mt-0.5 block">{highSeverityCount}</span>
          <span className="text-[10px] text-rose-600/80">Immediate review required</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Weight Mismatches</span>
          <span className="text-xl font-black text-amber-800 font-mono mt-0.5 block">{weightMismatchCount}</span>
          <span className="text-[10px] text-slate-500">Contract vs Arrived &gt;25%</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">Rate / Price Discrepancies</span>
          <span className="text-xl font-black text-blue-800 font-mono mt-0.5 block">{rateDiscrepancyCount}</span>
          <span className="text-[10px] text-slate-500">Zero rates &amp; variance &gt;30%</span>
        </div>
      </div>

      {/* ================= FILTER TOOLBAR ================= */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search MR, PO, Sauda, Broker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-800 w-52 sm:w-64"
            />
          </div>

          {/* Broker Filter */}
          <select
            value={selectedBroker}
            onChange={(e) => setSelectedBroker(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="ALL">All Brokers ({brokerOptions.length})</option>
            {brokerOptions.map((b, idx) => (
              <option key={idx} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="ALL">All Severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium Severity</option>
            <option value="Low">Low Severity</option>
          </select>

          {/* Anomaly Type Filter */}
          <select
            value={anomalyTypeFilter}
            onChange={(e) => setAnomalyTypeFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 max-w-[200px]"
          >
            <option value="ALL">All Anomaly Types</option>
            <option value="Exact Duplicate Transaction">Exact Duplicate Transaction</option>
            <option value="Contract vs Arrived Weight Mismatch">Contract vs Arrived Weight Mismatch</option>
            <option value="Zero or Missing Rate">Zero or Missing Rate</option>
            <option value="Unusual Rate Variance">Unusual Rate Variance</option>
            <option value="Deduction Calculation Discrepancy">Deduction Calculation Discrepancy</option>
            <option value="Missing MR Number or Orphaned Arrival">Missing MR Number or Orphaned Arrival</option>
            <option value="Zero Contract Weight">Zero Contract Weight</option>
          </select>

          {/* Workflow Stage Filter */}
          <select
            value={workflowStageFilter}
            onChange={(e) => setWorkflowStageFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="ALL">All Workflow Stages</option>
            <option value="Sauda Desk">Sauda Desk</option>
            <option value="Sauda Check Point">Sauda Check Point</option>
            <option value="Temporary Arrival">Temporary Arrival</option>
            <option value="Final Arrival">Final Arrival</option>
            <option value="Mill Inspection">Mill Inspection</option>
            <option value="Settlement">Settlement</option>
            <option value="Payment">Payment</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {(selectedBroker !== 'ALL' || severityFilter !== 'ALL' || anomalyTypeFilter !== 'ALL' || workflowStageFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedBroker('ALL');
                setSeverityFilter('ALL');
                setAnomalyTypeFilter('ALL');
                setWorkflowStageFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
          <span className="text-[11px] font-bold text-slate-500">
            Showing <strong>{filteredAnomalies.length}</strong> of <strong>{allAnomalies.length}</strong>
          </span>
        </div>
      </div>

      {/* ================= 20-COLUMN ABNORMAL DATA TABLE ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="uppercase tracking-wider">
            Detailed Abnormal Data Analysis Register
          </span>
          <span className="text-[11px] text-slate-500 font-normal">
            Click any row to open the complete rationale inspection and update verification status
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-rose-600 mx-auto" />
            <span className="text-xs font-bold uppercase tracking-wider block">
              Executing Multi-Table Business Rules Scan...
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <th className="p-2.5">1. Broker Name</th>
                  <th className="p-2.5">2. MR No.</th>
                  <th className="p-2.5">3. Sauda No.</th>
                  <th className="p-2.5">4. P.O. No.</th>
                  <th className="p-2.5">5. Date</th>
                  <th className="p-2.5 text-right">6. Contract Wt</th>
                  <th className="p-2.5 text-right">7. Temp Arr Wt</th>
                  <th className="p-2.5 text-right">8. Final Arr Wt</th>
                  <th className="p-2.5 text-right">9. Mill Insp Wt</th>
                  <th className="p-2.5 text-right">10. Sauda B Rate</th>
                  <th className="p-2.5">11. Deduction Type</th>
                  <th className="p-2.5">12. Deduct Qty/%</th>
                  <th className="p-2.5 text-right">13. Deduct Amt</th>
                  <th className="p-2.5">14. Expected Value</th>
                  <th className="p-2.5">15. Actual Value</th>
                  <th className="p-2.5">16. Difference</th>
                  <th className="p-2.5">17. Abnormality Type</th>
                  <th className="p-2.5">18. Detection Reason</th>
                  <th className="p-2.5 text-center">19. Severity</th>
                  <th className="p-2.5 text-center">20. Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                {filteredAnomalies.length > 0 ? (
                  filteredAnomalies.map((item, idx) => {
                    const vStatus = statusOverrides[item.id] || item.verificationStatus;
                    const sevBadge =
                      item.severity === 'High'
                        ? 'bg-rose-600 text-white'
                        : item.severity === 'Medium'
                        ? 'bg-amber-600 text-white'
                        : 'bg-blue-600 text-white';

                    const statusBadge =
                      vStatus === 'Verified Legitimate'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : vStatus === 'Corrected'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300';

                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedAnomaly(item)}
                        className="hover:bg-rose-50/60 transition cursor-pointer select-none"
                      >
                        <td className="p-2.5 font-bold font-sans text-slate-900 max-w-[150px] truncate" title={item.brokerName}>
                          {item.brokerName}
                        </td>
                        <td className="p-2.5 font-bold text-blue-700">{item.mrNo || '—'}</td>
                        <td className="p-2.5 font-bold text-emerald-950">{item.saudaNo || '—'}</td>
                        <td className="p-2.5 font-bold text-slate-900">{item.poNo || '—'}</td>
                        <td className="p-2.5 text-slate-500">{item.transactionDate || '—'}</td>
                        <td className="p-2.5 text-right font-bold">
                          {item.contractWeight > 0 ? `${item.contractWeight.toFixed(2)} MT` : '—'}
                        </td>
                        <td className="p-2.5 text-right">
                          {item.tempArrivalWeight > 0 ? `${item.tempArrivalWeight.toFixed(2)} MT` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">
                          {item.finalArrivalWeight > 0 ? `${item.finalArrivalWeight.toFixed(2)} MT` : '—'}
                        </td>
                        <td className="p-2.5 text-right">
                          {item.millInspectionWeight > 0 ? `${item.millInspectionWeight.toFixed(2)} MT` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {item.saudaRate > 0 ? `₹${item.saudaRate.toLocaleString('en-IN')}` : '₹0.00'}
                        </td>
                        <td className="p-2.5 font-sans max-w-[120px] truncate">{item.deductionType || '—'}</td>
                        <td className="p-2.5 font-sans">{item.deductionQtyOrPct || '—'}</td>
                        <td className="p-2.5 text-right font-bold text-rose-700">
                          {item.deductionAmount > 0 ? `₹${item.deductionAmount.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-2.5 font-sans text-slate-600 max-w-[140px] truncate" title={item.expectedValue}>
                          {item.expectedValue}
                        </td>
                        <td className="p-2.5 font-sans font-bold text-rose-800 max-w-[140px] truncate" title={item.actualValue}>
                          {item.actualValue}
                        </td>
                        <td className="p-2.5 font-sans font-bold text-amber-800 max-w-[110px] truncate" title={item.difference}>
                          {item.difference}
                        </td>
                        <td className="p-2.5 font-sans font-bold text-slate-800">
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                            {item.anomalyType}
                          </span>
                        </td>
                        <td className="p-2.5 font-sans max-w-[200px] truncate text-slate-600" title={item.detectionReason}>
                          {item.detectionReason}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase", sevBadge)}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border", statusBadge)}>
                            {vStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={20} className="p-12 text-center text-slate-400 font-sans">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <span className="text-xs font-bold uppercase tracking-wider block text-slate-700">
                        No abnormal records match current filter criteria.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= FULL RECORD RATIONALE MODAL ================= */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-600/30 border border-rose-400 rounded-xl text-rose-300">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider">
                    {selectedAnomaly.anomalyType}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Audit Slip: {selectedAnomaly.saudaNo} / {selectedAnomaly.poNo} (Broker: {selectedAnomaly.brokerName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="h-8 w-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Detection Box */}
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                    Detection Condition &amp; Exact Reason
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                    selectedAnomaly.severity === 'High' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                  )}>
                    {selectedAnomaly.severity} Severity
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 leading-relaxed">
                  {selectedAnomaly.detectionReason}
                </p>
              </div>

              {/* 20-Field Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">1. Broker Name</span>
                  <span className="font-bold text-slate-900">{selectedAnomaly.brokerName}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">2. MR Number</span>
                  <span className="font-bold text-blue-700">{selectedAnomaly.mrNo || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">3. Sauda Number</span>
                  <span className="font-bold text-emerald-950">{selectedAnomaly.saudaNo || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">4. P.O. Number</span>
                  <span className="font-bold text-slate-900">{selectedAnomaly.poNo || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">5. Transaction Date</span>
                  <span>{selectedAnomaly.transactionDate || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">6. Contract Weight</span>
                  <span className="font-bold">{selectedAnomaly.contractWeight > 0 ? `${selectedAnomaly.contractWeight.toFixed(2)} MT` : '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">7. Temp Arrival Wt</span>
                  <span>{selectedAnomaly.tempArrivalWeight > 0 ? `${selectedAnomaly.tempArrivalWeight.toFixed(2)} MT` : '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">8. Final Arrival Wt</span>
                  <span className="font-bold text-emerald-700">{selectedAnomaly.finalArrivalWeight > 0 ? `${selectedAnomaly.finalArrivalWeight.toFixed(2)} MT` : '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">9. Mill Insp Wt</span>
                  <span>{selectedAnomaly.millInspectionWeight > 0 ? `${selectedAnomaly.millInspectionWeight.toFixed(2)} MT` : '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">10. Sauda B Rate</span>
                  <span className="font-bold text-slate-900">{selectedAnomaly.saudaRate > 0 ? `₹${selectedAnomaly.saudaRate.toLocaleString('en-IN')}/Qtl` : '₹0.00'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">11. Deduction Type</span>
                  <span className="font-sans">{selectedAnomaly.deductionType || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">12. Deduct Qty / %</span>
                  <span className="font-sans">{selectedAnomaly.deductionQtyOrPct || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">13. Deduction Amount</span>
                  <span className="font-bold text-rose-700">{selectedAnomaly.deductionAmount > 0 ? `₹${selectedAnomaly.deductionAmount.toLocaleString('en-IN')}` : '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">Workflow Stage</span>
                  <span className="font-bold text-slate-900">{selectedAnomaly.workflowStage}</span>
                </div>
              </div>

              {/* Expected vs Actual Math */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">14. Expected Value</span>
                  <span className="font-bold text-emerald-950 font-mono mt-0.5 block">{selectedAnomaly.expectedValue}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">15. Actual Value</span>
                  <span className="font-bold text-rose-800 font-mono mt-0.5 block">{selectedAnomaly.actualValue}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">16. Discrepancy / Difference</span>
                  <span className="font-black text-amber-800 font-mono mt-0.5 block">{selectedAnomaly.difference}</span>
                </div>
              </div>

              {/* Recommended Action & Status Selector */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Recommended Audit Action:</span>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">
                    {selectedAnomaly.recommendedAction}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-800">
                    Update 20. Verification Status:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(['Pending Review', 'Under Investigation', 'Verified Legitimate', 'Corrected'] as const).map(st => {
                      const currentStatus = statusOverrides[selectedAnomaly.id] || selectedAnomaly.verificationStatus;
                      const isSelected = currentStatus === st;
                      return (
                        <button
                          key={st}
                          onClick={() => setStatusOverrides(prev => ({ ...prev, [selectedAnomaly.id]: st }))}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border",
                            isSelected 
                              ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                          )}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
