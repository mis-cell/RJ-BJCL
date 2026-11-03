import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  Filter, 
  Download, 
  RefreshCcw, 
  History, 
  User, 
  ArrowRight, 
  Calendar, 
  Layers, 
  Tag, 
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { AppAuditLogEntry, fetchAppAuditLogs } from '../services/auditLogService';
import { cn } from '../lib/utils';

interface UniversalAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialModule?: string;
  initialRecordId?: string;
}

export const UniversalAuditLogModal: React.FC<UniversalAuditLogModalProps> = ({
  isOpen,
  onClose,
  initialModule,
  initialRecordId
}) => {
  const [logs, setLogs] = useState<AppAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>(initialModule || 'ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAppAuditLogs({
        module: selectedModule !== 'ALL' ? selectedModule : undefined,
        userName: selectedUser !== 'ALL' ? selectedUser : undefined,
        recordId: initialRecordId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: searchTerm || undefined,
        limit: 1000
      });
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, selectedModule, selectedUser, dateFrom, dateTo]);

  // Listen to live audit log broadcasts
  useEffect(() => {
    const handleNewLog = () => {
      loadLogs();
    };
    window.addEventListener('app-audit-logged', handleNewLog);
    return () => window.removeEventListener('app-audit-logged', handleNewLog);
  }, []);

  // Compute unique modules and users for filter dropdowns
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.module) set.add(l.module);
    });
    return Array.from(set).sort();
  }, [logs]);

  const availableUsers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.user_name) set.add(l.user_name);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filter logs locally for search term
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter(l => 
      (l.module || '').toLowerCase().includes(term) ||
      (l.record_id || '').toLowerCase().includes(term) ||
      (l.field_label || l.field_name || '').toLowerCase().includes(term) ||
      (l.old_value || '').toLowerCase().includes(term) ||
      (l.new_value || '').toLowerCase().includes(term) ||
      (l.user_name || '').toLowerCase().includes(term) ||
      (l.remarks || '').toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Module', 'Record Ref', 'Field', 'Before Value', 'After Value', 'Changed By User', 'Action', 'Remarks'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      `"${l.module}"`,
      `"${l.record_id}"`,
      `"${l.field_label || l.field_name}"`,
      `"${String(l.old_value).replace(/"/g, '""')}"`,
      `"${String(l.new_value).replace(/"/g, '""')}"`,
      `"${l.user_name}"`,
      `"${l.action}"`,
      `"${(l.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Universal_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#FDE7E6] border-2 border-[#F7AFA8] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="bg-[#D94B5A] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#FDE7E6] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7AFA8] border-2 border-[#FDE7E6] flex items-center justify-center text-[#FDE7E6] shadow-inner">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-black tracking-tight text-white">
                  Universal System Audit & Change Log
                </h2>
                <span className="text-[10px] bg-[#FDE7E6] text-[#D94B5A] font-mono font-black px-2 py-0.5 rounded-full uppercase">
                  {filteredLogs.length} Records
                </span>
              </div>
              <p className="text-[10.5px] font-mono text-emerald-200 font-bold uppercase tracking-wider">
                Tracks all data changes (Before Value → After Value & Changed User) across all modules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              title="Export to CSV"
              className="px-3 py-1.5 bg-[#F7AFA8] hover:bg-[#F06D6C] text-[#FDE7E6] border border-[#FDE7E6]/50 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={loadLogs}
              title="Refresh Logs"
              className="p-1.5 bg-[#F7AFA8] hover:bg-[#F06D6C] text-white border border-[#F06D6C] rounded-lg transition-all cursor-pointer"
            >
              <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin text-[#FDE7E6]")} />
            </button>
            <button
              onClick={onClose}
              title="Close Audit Log"
              className="p-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg transition-all cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white border-b border-[#FBCFCB] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search record, field, values, or user..."
                className="w-full bg-[#FDE7E6] border border-slate-300 text-xs font-medium pl-8 pr-3 py-1.5 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#F7AFA8]"
              />
            </div>

            {/* Module Filter */}
            <div className="flex items-center gap-1.5 bg-[#FDE7E6] px-2.5 py-1 rounded-xl border border-slate-300">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-600 uppercase">Module:</span>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#D94B5A] outline-none cursor-pointer"
              >
                <option value="ALL">All Modules</option>
                {availableModules.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            <div className="flex items-center gap-1.5 bg-[#FDE7E6] px-2.5 py-1 rounded-xl border border-slate-300">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-600 uppercase">User:</span>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#D94B5A] outline-none cursor-pointer"
              >
                <option value="ALL">All Users</option>
                {availableUsers.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filters */}
            <div className="flex items-center gap-1 bg-[#FDE7E6] px-2 py-1 rounded-xl border border-slate-300">
              <Calendar className="w-3 h-3 text-slate-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-[11px] font-mono font-medium outline-none cursor-pointer"
                title="From Date"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-[11px] font-mono font-medium outline-none cursor-pointer"
                title="To Date"
              />
            </div>
          </div>

          {(searchTerm || selectedModule !== 'ALL' || selectedUser !== 'ALL' || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedModule('ALL');
                setSelectedUser('ALL');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Audit Log Table Area */}
        <div className="flex-1 overflow-auto min-h-0 bg-white">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-[#F7AFA8] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Loading Change History...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <History className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-600">No change logs recorded yet for selected filter</span>
              <span className="text-xs text-slate-400">All user edits to Base Rates, Differentials, Inspections, and Sauda will be captured here in real time.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#D94B5A] text-white uppercase text-[10px] font-black tracking-wider sticky top-0 z-10 shadow-xs">
                <tr className="border-b-2 border-[#FDE7E6]">
                  <th className="py-2.5 px-3 border-r border-[#F06D6C] min-w-[140px]">Date & Time</th>
                  <th className="py-2.5 px-3 border-r border-[#F06D6C] min-w-[150px]">Section / Module</th>
                  <th className="py-2.5 px-3 border-r border-[#F06D6C] min-w-[110px]">Record Ref</th>
                  <th className="py-2.5 px-3 border-r border-[#F06D6C] min-w-[150px]">Field / Item</th>
                  <th className="py-2.5 px-3 border-r border-[#F06D6C] min-w-[150px] bg-[#D94B5A] text-rose-200">
                    Before Change Value
                  </th>
                  <th className="py-2.5 px-3 border-r border-[#F06D6C] min-w-[150px] bg-[#E85A5A] text-emerald-200">
                    After Change Value
                  </th>
                  <th className="py-2.5 px-3 border-r border-[#F06D6C] min-w-[130px]">Changed By User</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Remarks / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log, idx) => {
                  const logDate = new Date(log.timestamp || log.created_at || '');
                  const formattedDate = !isNaN(logDate.getTime())
                    ? `${String(logDate.getDate()).padStart(2, '0')}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${logDate.getFullYear()}`
                    : '';
                  const formattedTime = !isNaN(logDate.getTime())
                    ? logDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                    : '';

                  return (
                    <tr 
                      key={log.id || idx}
                      className={cn("hover:bg-amber-50/50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-[#FDE7E6]/60")}
                    >
                      {/* Timestamp */}
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        <div className="font-bold text-[#D94B5A]">{formattedDate}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-[#FDE7E6]" />
                          {formattedTime}
                        </div>
                      </td>

                      {/* Module */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-[10.5px] font-black uppercase tracking-tight">
                          {log.module}
                        </span>
                      </td>

                      {/* Record ID */}
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-bold text-[11px] text-slate-800">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {log.record_id}
                        </span>
                      </td>

                      {/* Field Changed */}
                      <td className="py-2.5 px-3 border-r border-slate-200 font-extrabold text-[#D94B5A]">
                        <div>{log.field_label || log.field_name}</div>
                        <div className="text-[9.5px] font-mono text-slate-400 font-medium">{log.field_name}</div>
                      </td>

                      {/* Before Value */}
                      <td className="py-2.5 px-3 border-r border-slate-200 bg-rose-50/40">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100/80 border border-rose-300 text-rose-950 rounded-lg font-mono font-bold text-[11px] line-through decoration-rose-500">
                          {log.old_value}
                        </div>
                      </td>

                      {/* After Value */}
                      <td className="py-2.5 px-3 border-r border-slate-200 bg-emerald-50/40">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 border border-emerald-400 text-emerald-950 rounded-lg font-mono font-black text-[11.5px] shadow-2xs">
                          {log.new_value}
                        </div>
                      </td>

                      {/* User Name */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#D94B5A] text-amber-300 border border-[#F06D6C] rounded-lg text-[11px] font-black tracking-tight shadow-2xs">
                          <User className="w-3 h-3 text-[#FDE7E6]" />
                          <span>{log.user_name}</span>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {log.remarks || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-[#FDE7E6] border-t border-[#FBCFCB] px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-700">
              Live Audit Engine Active • Any update in any section automatically records Before/After state & User
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            Showing {filteredLogs.length} of {logs.length} logged actions
          </div>
        </div>

      </div>
    </div>
  );
};
