import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Download, 
  FileSpreadsheet, 
  ExternalLink, 
  Database, 
  Calculator, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Filter
} from 'lucide-react';
import { TraceableKpiDetails, TraceableRecordItem } from '../../services/reportCalculations';

interface TraceableKpiModalProps {
  details: TraceableKpiDetails | null;
  onClose: () => void;
}

export const TraceableKpiModal: React.FC<TraceableKpiModalProps> = ({ details, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  if (!details) return null;

  // Extract distinct types & statuses for quick filters
  const distinctTypes = useMemo(() => {
    const set = new Set<string>();
    details.records.forEach(r => { if (r.type) set.add(r.type); });
    return Array.from(set).sort();
  }, [details]);

  const distinctStatuses = useMemo(() => {
    const set = new Set<string>();
    details.records.forEach(r => { if (r.status) set.add(r.status); });
    return Array.from(set).sort();
  }, [details]);

  // Filter records based on user search and filters
  const filteredRecords = useMemo(() => {
    return details.records.filter(r => {
      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      return (
        r.recordNo?.toLowerCase().includes(q) ||
        r.party?.toLowerCase().includes(q) ||
        r.broker?.toLowerCase().includes(q) ||
        r.area?.toLowerCase().includes(q) ||
        r.grade?.toLowerCase().includes(q) ||
        r.sourceTable?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q)
      );
    });
  }, [details, searchTerm, typeFilter, statusFilter]);

  // Subtotal quantity of visible filtered records
  const filteredTotalQuantity = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  }, [filteredRecords]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredRecords.length) return;

    const headers = ['Record No', 'Type', 'Date', 'Delivery Date', 'Party / Supplier', 'Broker', 'Area', 'Grade', 'Quantity', 'Unit', 'Rate', 'Amount', 'Status', 'Source Table'];
    const rows = filteredRecords.map(r => [
      `"${r.recordNo || ''}"`,
      `"${r.type || ''}"`,
      `"${r.date || ''}"`,
      `"${r.deliveryDate || ''}"`,
      `"${(r.party || '').replace(/"/g, '""')}"`,
      `"${(r.broker || '').replace(/"/g, '""')}"`,
      `"${(r.area || '').replace(/"/g, '""')}"`,
      `"${r.grade || ''}"`,
      r.quantity || 0,
      `"${r.unit || ''}"`,
      r.rate || '',
      r.amount || '',
      `"${r.status || ''}"`,
      `"${r.sourceTable || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${details.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
        id="traceable-kpi-modal-dialog"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                Traceable KPI Audit
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-300 text-xs flex items-center gap-1 font-mono">
                <Database className="w-3 h-3 text-emerald-400" />
                {details.sourceTable}
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              {details.title}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-3xl leading-relaxed">
              {details.description}
            </p>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Calculation Logic & Metadata Strip */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 text-xs grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-start gap-2">
            <Calculator className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Calculation Formula</div>
              <div className="text-[11px] font-mono text-slate-800 font-semibold">{details.formula}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Refresh & Sync Behavior</div>
              <div className="text-[11px] text-slate-700 font-medium">{details.refreshBehavior}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Filter className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Active Scope & Filters</div>
              <div className="text-[11px] text-slate-700">{details.filterNotes || 'Consistent across all active filters'}</div>
            </div>
          </div>
        </div>

        {/* Control Bar: Search & Export */}
        <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by contract no, party name, broker, area, grade..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {distinctTypes.length > 1 && (
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
              >
                <option value="ALL">All Types ({distinctTypes.length})</option>
                {distinctTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}

            {distinctStatuses.length > 1 && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                {distinctStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600 font-medium">
              Showing <span className="font-bold text-slate-900">{filteredRecords.length}</span> of <span className="font-bold text-slate-900">{details.records.length}</span> records
            </div>
            <button
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Traceable Records Table */}
        <div className="flex-1 overflow-auto bg-slate-50/50">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No records found matching current criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search term or adjusting category filters.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-200 z-10 shadow-xs">
                <tr>
                  <th className="px-3.5 py-2.5">#</th>
                  <th className="px-3.5 py-2.5">Record No / ID</th>
                  <th className="px-3.5 py-2.5">Type</th>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Party / Supplier</th>
                  <th className="px-3.5 py-2.5">Broker</th>
                  <th className="px-3.5 py-2.5">Area</th>
                  <th className="px-3.5 py-2.5">Grade</th>
                  <th className="px-3.5 py-2.5 text-right">Quantity</th>
                  <th className="px-3.5 py-2.5 text-right">Rate / Val</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5 text-center">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 bg-white font-normal text-slate-700">
                {filteredRecords.map((r, idx) => (
                  <tr key={`${r.id}-${idx}`} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-3.5 py-2 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                    <td className="px-3.5 py-2 font-mono font-bold text-slate-900">
                      {r.link ? (
                        <a 
                          href={r.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1"
                        >
                          {r.recordNo}
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </a>
                      ) : (
                        r.recordNo
                      )}
                    </td>
                    <td className="px-3.5 py-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.type?.includes('PTF') ? 'bg-purple-100 text-purple-800' :
                        r.type?.includes('Sauda') ? 'bg-blue-100 text-blue-800' :
                        r.type?.includes('Arrival') ? 'bg-emerald-100 text-emerald-800' :
                        r.type?.includes('Checkpoint') ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {r.date || '--'}
                    </td>
                    <td className="px-3.5 py-2 font-semibold text-slate-800 max-w-[200px] truncate" title={r.party}>
                      {r.party || 'DIRECT'}
                    </td>
                    <td className="px-3.5 py-2 text-slate-600 max-w-[140px] truncate" title={r.broker}>
                      {r.broker || 'DIRECT'}
                    </td>
                    <td className="px-3.5 py-2 text-slate-500 text-[11px]">
                      {r.area || 'DIRECT'}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-[11px] text-slate-600">
                      {r.grade || 'TD-5'}
                    </td>
                    <td className="px-3.5 py-2 font-mono font-bold text-right text-slate-900 whitespace-nowrap">
                      {typeof r.quantity === 'number' ? r.quantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : r.quantity}
                      <span className="text-[10px] font-normal text-slate-500 ml-1">{r.unit}</span>
                    </td>
                    <td className="px-3.5 py-2 font-mono text-right text-slate-700 whitespace-nowrap">
                      {r.rate ? `₹${r.rate}` : r.amount ? `₹${(r.amount / 100000).toFixed(2)}L` : '--'}
                    </td>
                    <td className="px-3.5 py-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        r.status?.toLowerCase().includes('on-time') || r.status?.toLowerCase().includes('accept') || r.status?.toLowerCase().includes('cleared') || r.status?.toLowerCase().includes('completed')
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status?.toLowerCase().includes('delay') || r.status?.toLowerCase().includes('overdue')
                          ? 'bg-amber-100 text-amber-800'
                          : r.status?.toLowerCase().includes('cancel') || r.status?.toLowerCase().includes('reject')
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-center text-[10px] font-mono text-slate-400">
                      {r.sourceTable}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer Summary */}
        <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400">Aggregate Count:</span>{' '}
              <span className="font-mono font-bold text-emerald-400">{filteredRecords.length} records</span>
            </div>
            {filteredTotalQuantity > 0 && (
              <div>
                <span className="text-slate-400">Filtered Subtotal:</span>{' '}
                <span className="font-mono font-bold text-amber-300">
                  {filteredTotalQuantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} {details.aggregateUnit}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-1.5 rounded-lg transition-colors font-medium"
            >
              Close Traceability View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
