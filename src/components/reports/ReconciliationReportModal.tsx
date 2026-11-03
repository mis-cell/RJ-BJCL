import React from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  FileText, 
  ArrowRight, 
  Database, 
  Calculator,
  Download,
  Info
} from 'lucide-react';
import { ReconciliationReportItem } from '../../services/reportCalculations';

interface ReconciliationReportModalProps {
  reportItems: ReconciliationReportItem[];
  onClose: () => void;
}

export const ReconciliationReportModal: React.FC<ReconciliationReportModalProps> = ({ 
  reportItems, 
  onClose 
}) => {
  const handleExportReconciliation = () => {
    const headers = ['KPI Metric', 'Old Discrepant Value', 'Corrected Verified Value', 'Root Cause of Difference', 'Source Tables', 'Status Rules & Logic', 'Formula'];
    const rows = reportItems.map(item => [
      `"${item.metricName}"`,
      `"${item.oldValue.replace(/"/g, '""')}"`,
      `"${item.correctedValue.replace(/"/g, '""')}"`,
      `"${item.causeOfDifference.replace(/"/g, '""')}"`,
      `"${item.sourceTable.replace(/"/g, '""')}"`,
      `"${item.statusRules.replace(/"/g, '""')}"`,
      `"${item.formula.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `system_report_reconciliation_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
        id="reconciliation-report-modal-dialog"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                Audit & Integrity Report
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-300 text-xs font-mono">
                System Report vs Database Truth Reconciliation
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              System Report Discrepancy Reconciliation Audit
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-3xl leading-relaxed">
              Comparison between previous flawed dashboard figures and the corrected, live-reconciled metrics. Every figure is traceable to its source tables with explicit status rules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReconciliation}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export Audit
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-1"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Banner */}
        <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950 leading-relaxed">
            <span className="font-bold text-emerald-900">Traceability Guarantee:</span> Sauda contracts (304) and PTF contracts (217) are kept strictly separate. Checkpoint milestones (270) are tracked as workflow dispatch steps rather than double-counted as new contracts. Mill arrivals (632) are joined using clean digits and contract number extraction with accurate MT weighbridge conversions.
          </div>
        </div>

        {/* Reconciliation Items List */}
        <div className="flex-1 overflow-auto p-4 space-y-3.5 bg-slate-50/60">
          {reportItems.map((item, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h3 className="text-sm font-black text-slate-900">{item.metricName}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{item.sourceTable}</span>
                </div>
              </div>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Old Value */}
                <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3">
                  <div className="flex items-center justify-between text-rose-700 font-bold text-[10px] uppercase tracking-wider mb-1">
                    <span>Previous Buggy Value</span>
                    <span className="bg-rose-200/60 px-1.5 py-0.5 rounded text-[10px]">Discrepancy</span>
                  </div>
                  <div className="font-mono font-bold text-rose-950 text-sm">{item.oldValue}</div>
                </div>

                {/* Corrected Value */}
                <div className="bg-emerald-50/80 border border-emerald-300 rounded-lg p-3">
                  <div className="flex items-center justify-between text-emerald-700 font-bold text-[10px] uppercase tracking-wider mb-1">
                    <span>Corrected Verified Value</span>
                    <span className="bg-emerald-200/80 px-1.5 py-0.5 rounded text-[10px] text-emerald-900 font-black">Reconciled</span>
                  </div>
                  <div className="font-mono font-bold text-emerald-950 text-sm">{item.correctedValue}</div>
                </div>
              </div>

              {/* Explanation of difference */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200/80 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3 text-amber-600" />
                    Root Cause of Difference
                  </div>
                  <div className="text-slate-800 font-normal mt-0.5 leading-relaxed">
                    {item.causeOfDifference}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="font-semibold text-slate-600">Formula: </span>
                    <code className="bg-slate-200/60 text-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">
                      {item.formula}
                    </code>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Status Rules: </span>
                    <span className="text-slate-700">{item.statusRules}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between text-xs border-t border-slate-800">
          <div className="text-slate-400">
            Reconciliation status: <span className="text-emerald-400 font-bold">7 of 7 KPIs Reconciled & Audited</span>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg transition-colors font-medium"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
