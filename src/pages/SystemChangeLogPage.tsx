import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCcw,
  Download,
  User,
  ArrowRight,
  Calendar,
  Layers,
  Tag,
  Clock,
  Sparkles,
  FileSpreadsheet,
  X,
  CheckCircle2,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { AppAuditLogEntry, fetchAppAuditLogs, formatAuditValue, getLocalAuditLogs } from '../services/auditLogService';

interface SystemChangeLogPageProps {
  onClose?: () => void;
  onNavigate?: (page: string) => void;
}

export const SystemChangeLogPage: React.FC<SystemChangeLogPageProps> = ({
  onClose,
  onNavigate
}) => {
  const [logs, setLogs] = useState<AppAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      let realData = await fetchAppAuditLogs({
        module: selectedModule !== 'ALL' ? selectedModule : undefined,
        userName: selectedUser !== 'ALL' ? selectedUser : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: searchTerm || undefined,
        limit: 1000
      });

      const combined: AppAuditLogEntry[] = (realData || []).filter(item => item && item.id);
      combined.sort((a, b) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime());
      setLogs(combined);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedModule, selectedUser, dateFrom, dateTo]);

  // Real-time broadcast listener
  useEffect(() => {
    const handleNewLog = () => loadLogs();
    window.addEventListener('app-audit-logged', handleNewLog);
    return () => window.removeEventListener('app-audit-logged', handleNewLog);
  }, []);

  const availableModules = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => { if (l.module) set.add(l.module); });
    return Array.from(set).sort();
  }, [logs]);

  const availableUsers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => { if (l.user_name) set.add(l.user_name); });
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter(l =>
      (l.module || '').toLowerCase().includes(term) ||
      (l.record_id || '').toLowerCase().includes(term) ||
      (l.field_label || l.field_name || '').toLowerCase().includes(term) ||
      (String(l.old_value) || '').toLowerCase().includes(term) ||
      (String(l.new_value) || '').toLowerCase().includes(term) ||
      (l.user_name || '').toLowerCase().includes(term) ||
      (l.remarks || '').toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  const exportToCSV = () => {
    if (!filteredLogs.length) return;
    const headers = ['Timestamp', 'Module', 'Record ID', 'Field Changed', 'Old Value', 'New Value', 'Operator', 'Action', 'Remarks'];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.timestamp || l.created_at || Date.now()).toLocaleString()}"`,
      `"${l.module || ''}"`,
      `"${l.record_id || ''}"`,
      `"${l.field_label || l.field_name || ''}"`,
      `"${formatAuditValue(l.old_value)}"`,
      `"${formatAuditValue(l.new_value)}"`,
      `"${l.user_name || ''}"`,
      `"${l.action || 'UPDATE'}"`,
      `"${l.remarks || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `System_Change_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full bg-[#FDE7E6] flex flex-col font-sans overflow-hidden text-slate-800">
      {/* Header Banner */}
      <div className="bg-[#D94B5A] text-white px-5 py-3 flex items-center justify-between shadow-md shrink-0 border-b border-[#2C4A28]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2C4A28] rounded-lg border border-emerald-600/30 shadow-inner">
            <History className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold uppercase tracking-wide text-amber-100">
                System Change Log & Audit Trail
              </h1>
              <span className="bg-emerald-800/80 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase border border-emerald-600/50">
                Live Audit Active
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 font-medium">
              System-wide modification history, rate adjustments, operator activity, and field-level change audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'timeline' : 'table')}
            className="px-3 py-1.5 bg-[#2C4A28] hover:bg-emerald-800 text-amber-200 text-xs font-bold rounded-md border border-emerald-600/40 cursor-pointer transition flex items-center gap-1.5"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>{viewMode === 'table' ? 'Timeline View' : 'Table View'}</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-md border border-emerald-500/50 cursor-pointer transition flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-900 rounded-lg cursor-pointer transition"
              title="Close System Change Log"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Header Bar */}
      <div className="bg-[#FDE7E6] border-b border-[#FBCFCB] px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white p-3 rounded-lg border border-[#FBCFCB] shadow-xs flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800 border border-emerald-200 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">Total Logged Changes</span>
            <span className="text-lg font-black text-slate-900 font-mono">{filteredLogs.length}</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#FBCFCB] shadow-xs flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-800 border border-amber-200 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">Today's Audit Events</span>
            <span className="text-lg font-black text-slate-900 font-mono">
              {filteredLogs.filter(l => new Date(l.timestamp || l.created_at || 0).toDateString() === new Date().toDateString()).length}
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#FBCFCB] shadow-xs flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-800 border border-indigo-200 shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">Active Operators</span>
            <span className="text-lg font-black text-slate-900 font-mono">{availableUsers.length}</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#FBCFCB] shadow-xs flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700 border border-slate-300 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">Audited Modules</span>
            <span className="text-lg font-black text-slate-900 font-mono">{availableModules.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="px-5 py-3 bg-[#EFE8DA] border-b border-[#D8CEBE] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex items-center bg-white border border-[#C8BEB0] rounded-lg px-3 py-1.5 w-full sm:w-64 text-xs shadow-2xs">
            <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ID, user, module, or value..."
              className="bg-transparent border-none outline-none text-slate-800 w-full font-semibold placeholder:text-slate-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Module Filter */}
          <div className="flex items-center bg-white border border-[#C8BEB0] rounded-lg px-2 py-1 text-xs shadow-2xs">
            <Layers className="h-3.5 w-3.5 text-slate-500 mr-1.5 shrink-0" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-800 font-bold cursor-pointer"
            >
              <option value="ALL">All Modules</option>
              {availableModules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Operator Filter */}
          <div className="flex items-center bg-white border border-[#C8BEB0] rounded-lg px-2 py-1 text-xs shadow-2xs">
            <User className="h-3.5 w-3.5 text-slate-500 mr-1.5 shrink-0" />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-800 font-bold cursor-pointer"
            >
              <option value="ALL">All Operators</option>
              {availableUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1 text-xs bg-white border border-[#C8BEB0] rounded-lg px-2 py-1 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent outline-none text-slate-800 font-semibold cursor-pointer"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent outline-none text-slate-800 font-semibold cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[#F7AFA8] hover:bg-[#2A4B26] text-white text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 p-5 overflow-auto min-h-0">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
            <RefreshCcw className="h-8 w-8 animate-spin text-[#D94B5A]" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider">Loading System Change Audit Logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#FBCFCB] p-12 text-center shadow-xs">
            <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-extrabold uppercase text-slate-700">No Change Log Entries Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting search filters or checking operator activity.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white rounded-xl border border-[#FBCFCB] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#D94B5A] text-white font-black uppercase text-[10px] tracking-wider border-b border-[#2C4A28]">
                  <tr>
                    <th className="p-3 w-40">Timestamp</th>
                    <th className="p-3 w-36">Module / Section</th>
                    <th className="p-3 w-32">Record Reference</th>
                    <th className="p-3 w-44">Field Label</th>
                    <th className="p-3">Before Change</th>
                    <th className="p-3">After Change</th>
                    <th className="p-3 w-32">Operator User</th>
                    <th className="p-3">Remarks / Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                  {filteredLogs.map((log) => {
                    const formattedDate = new Date(log.timestamp || log.created_at || Date.now()).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });

                    return (
                      <tr key={log.id} className="hover:bg-amber-50/50 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-600 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>
                        <td className="p-3 font-sans">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-extrabold uppercase">
                            {log.module}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-indigo-950 whitespace-nowrap">
                          {log.record_id || '—'}
                        </td>
                        <td className="p-3 font-sans font-bold text-slate-900">
                          {log.field_label || log.field_name || 'Record Modification'}
                        </td>
                        <td className="p-3 max-w-xs truncate text-rose-700 bg-rose-50/50 font-bold border-l border-rose-100">
                          {formatAuditValue(log.old_value)}
                        </td>
                        <td className="p-3 max-w-xs truncate text-emerald-800 bg-emerald-50/50 font-bold border-l border-emerald-100">
                          {formatAuditValue(log.new_value)}
                        </td>
                        <td className="p-3 font-sans font-bold text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-500" />
                            <span>{log.user_name || 'ADMIN'}</span>
                          </div>
                        </td>
                        <td className="p-3 font-sans text-slate-600 italic max-w-xs truncate">
                          {log.remarks || 'Standard System Audit'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Timeline View */
          <div className="space-y-4 max-w-4xl mx-auto">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl border border-[#FBCFCB] p-4 shadow-xs relative flex gap-4">
                <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-lg h-fit border border-emerald-200 shrink-0 mt-1">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase bg-[#F7AFA8] text-amber-100 px-2.5 py-0.5 rounded">
                        {log.module}
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        Ref: {log.record_id}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(log.timestamp || log.created_at || Date.now()).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-800 font-sans">
                    {log.field_label || log.field_name || 'Modified Record'}:
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 line-through">
                      {formatAuditValue(log.old_value)}
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-black">
                      {formatAuditValue(log.new_value)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-sans text-slate-500 pt-1">
                    <span>Operator: <strong className="text-slate-800">{log.user_name || 'ADMIN'}</strong> ({log.user_role || 'L5'})</span>
                    {log.remarks && <span className="italic">"{log.remarks}"</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemChangeLogPage;
