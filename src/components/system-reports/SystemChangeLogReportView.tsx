import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { RefreshCw, Download, Search, Clock, ArrowRight, History } from 'lucide-react';
import { fetchAppAuditLogs, AppAuditLogEntry } from '../../services/auditLogService';
import { HorizontalRankBarChart } from '../reports/charts/HorizontalRankBarChart';
import { HeatmapChart } from '../reports/charts/HeatmapChart';

const formatTimestamp = (raw?: string) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const toDateKey = (raw?: string) => {
  if (!raw) return '';
  const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export const SystemChangeLogReportView: React.FC = () => {
  const [logs, setLogs] = useState<AppAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [barMode, setBarMode] = useState<'section' | 'user'>('section');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAppAuditLogs({ limit: 1500 });
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load System Change Logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const sections = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.module || 'General'))).sort();
  }, [logs]);

  const users = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.user_name || 'System User'))).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter(l => {
      if (sectionFilter !== 'ALL' && (l.module || 'General') !== sectionFilter) return false;
      if (userFilter !== 'ALL' && (l.user_name || 'System User') !== userFilter) return false;
      if (q) {
        const hay = `${l.user_name} ${l.module} ${l.record_id} ${l.field_label || l.field_name} ${l.old_value} ${l.new_value} ${l.remarks || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, searchQuery, sectionFilter, userFilter]);

  // 1. Daily Line Chart (Edit trends over time)
  const dailyTrendData = useMemo(() => {
    const map = new Map<string, number>();
    filteredLogs.forEach(l => {
      const dk = toDateKey(l.timestamp || l.created_at);
      if (dk) map.set(dk, (map.get(dk) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, edits]) => ({ date, edits }));
  }, [filteredLogs]);

  // 2. Horizontal Bar (Changes by Section or User)
  const horizontalBarData = useMemo(() => {
    const map = new Map<string, number>();
    filteredLogs.forEach(l => {
      const key = barMode === 'section' ? (l.module || 'General') : (l.user_name || 'System User');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([label, value]) => ({
        label,
        fullName: label,
        value,
        annotation: `${value} edits`,
        color: barMode === 'section' ? '#0f766e' : '#D94B5A'
      }));
  }, [filteredLogs, barMode]);

  // 3. Heatmap (Section x Date — last 12 active dates)
  const heatmapData = useMemo(() => {
    const dateSet = new Set<string>();
    const rowSet = new Set<string>();
    filteredLogs.forEach(l => {
      const dk = toDateKey(l.timestamp || l.created_at);
      if (dk) dateSet.add(dk);
      rowSet.add(l.module || 'General');
    });
    const cols = Array.from(dateSet).sort().slice(-12);
    const colAllowed = new Set(cols);
    const cells: Array<{ row: string; col: string; value: number }> = [];
    filteredLogs.forEach(l => {
      const dk = toDateKey(l.timestamp || l.created_at);
      if (dk && colAllowed.has(dk)) {
        cells.push({ row: l.module || 'General', col: dk, value: 1 });
      }
    });
    return {
      rows: Array.from(rowSet).sort(),
      cols,
      cells
    };
  }, [filteredLogs]);

  // 4. Record Timeline (for selected PO / MR / Record ID)
  const recordOptions = useMemo(() => {
    const counts = new Map<string, number>();
    filteredLogs.forEach(l => {
      const rec = String(l.record_id || '').trim();
      if (rec && rec !== '—') counts.set(rec, (counts.get(rec) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 80);
  }, [filteredLogs]);

  const activeTimelineRecord = selectedRecordId || (recordOptions[0]?.[0] || '');

  const timelineEntries = useMemo(() => {
    if (!activeTimelineRecord) return [];
    return filteredLogs
      .filter(l => String(l.record_id || '').trim() === activeTimelineRecord)
      .sort((a, b) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime());
  }, [filteredLogs, activeTimelineRecord]);

  const handleExportCSV = () => {
    const headers = ['Username', 'Time', 'Section', 'Record', 'Action', 'Field', 'Previous Value', 'New Value'];
    const rows = filteredLogs.map(l => [
      `"${String(l.user_name || 'System').replace(/"/g, '""')}"`,
      `"${formatTimestamp(l.timestamp || l.created_at)}"`,
      `"${String(l.module || '').replace(/"/g, '""')}"`,
      `"${String(l.record_id || '').replace(/"/g, '""')}"`,
      `"${String(l.action || 'UPDATE')}"`,
      `"${String(l.field_label || l.field_name || '').replace(/"/g, '""')}"`,
      `"${String(l.old_value ?? '—').replace(/"/g, '""')}"`,
      `"${String(l.new_value ?? '—').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `System_Change_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 font-sans text-slate-800">
      {/* Header + Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-[#D94B5A]" />
            <span>System Change Log &amp; Audit Analytics (Updates Only)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Tracks Edit &amp; Update modifications on existing records only (new inserts excluded) — daily trends, operator activity, heatmap, timeline &amp; ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PO, MR, user, field..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800 w-52"
            />
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Sections ({sections.length})</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Users ({users.length})</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <button
            type="button"
            onClick={loadLogs}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Logged Changes</span>
          <span className="text-xl font-black font-mono tabular-nums text-slate-900 mt-0.5 block">{filteredLogs.length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Active Operators</span>
          <span className="text-xl font-black font-mono tabular-nums text-teal-800 mt-0.5 block">
            {new Set(filteredLogs.map(l => l.user_name || 'System')).size}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Sections Modified</span>
          <span className="text-xl font-black font-mono tabular-nums text-slate-900 mt-0.5 block">
            {new Set(filteredLogs.map(l => l.module || 'General')).size}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Distinct Records Touched</span>
          <span className="text-xl font-black font-mono tabular-nums text-[#D94B5A] mt-0.5 block">
            {new Set(filteredLogs.map(l => l.record_id).filter(Boolean)).size}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
          Loading system change logs...
        </div>
      ) : (
        <>
          {/* ROW 1: Daily Line Chart + Horizontal Bar (by Section or User) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Daily Edit Activity Trend
                </h4>
                <p className="text-[11px] text-slate-500">Number of recorded field updates per day (last 30 active days)</p>
              </div>
              <div style={{ width: '100%', height: 270 }}>
                {dailyTrendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No daily activity found.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrendData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} allowDecimals={false} />
                      <Tooltip
                        formatter={(val: any) => [`${val} edits`, 'Changes']}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                      />
                      <Line type="monotone" dataKey="edits" stroke="#D94B5A" strokeWidth={2.5} dot={{ r: 3.5, fill: '#D94B5A' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <HorizontalRankBarChart
              title={barMode === 'section' ? 'Changes by Section' : 'Changes by Operator / User'}
              subtitle="Distribution of audit edits across modules or operators"
              data={horizontalBarData}
              valueFormatter={(v) => `${v} edits`}
              height={270}
              rightSlot={
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBarMode('section')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      barMode === 'section' ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    By Section
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarMode('user')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      barMode === 'user' ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    By User
                  </button>
                </div>
              }
            />
          </div>

          {/* ROW 2: Heatmap (Section x Date) */}
          <HeatmapChart
            title="Section × Date Edit Activity Heatmap"
            subtitle="Concentrations of edits by module across recent active dates"
            rows={heatmapData.rows}
            cols={heatmapData.cols}
            cells={heatmapData.cells}
            colorScheme="teal"
          />

          {/* ROW 3: Record Timeline (Selected PO / MR) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Selected Record Timeline (PO / MR History)
                </h4>
                <p className="text-[11px] text-slate-500">Inspect chronological operator edits with before and after values</p>
              </div>
              <select
                value={activeTimelineRecord}
                onChange={(e) => setSelectedRecordId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 min-w-[220px]"
              >
                {recordOptions.length === 0 ? (
                  <option value="">No records logged</option>
                ) : (
                  recordOptions.map(([rec, cnt]) => (
                    <option key={rec} value={rec}>
                      {rec} ({cnt} edit{cnt > 1 ? 's' : ''})
                    </option>
                  ))
                )}
              </select>
            </div>

            {timelineEntries.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Select a record to view its edit timeline.
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {timelineEntries.map((entry, idx) => (
                  <div key={entry.id || idx} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 text-xs">
                    <div className="mt-0.5 text-slate-400 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {entry.user_name || 'System'} · <span className="text-slate-600 font-semibold">{entry.module}</span> · <span className="text-[#D94B5A]">{entry.field_label || entry.field_name}</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {formatTimestamp(entry.timestamp || entry.created_at)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                        <span className="text-slate-500 line-through">{String(entry.old_value ?? '—')}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-bold text-teal-800">{String(entry.new_value ?? '—')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ROW 4: Detailed Change Log Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-900">
                Detailed Change Log Ledger ({filteredLogs.length} entries)
              </span>
              <span className="text-[11px] text-slate-500">Click any record ID to jump to its timeline above</span>
            </div>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Username</th>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Section</th>
                    <th className="p-2.5">Record</th>
                    <th className="p-2.5">Field</th>
                    <th className="p-2.5">Previous Value</th>
                    <th className="p-2.5">New Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        No change log entries match the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.slice(0, 300).map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{log.user_name || 'System'}</td>
                        <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">{formatTimestamp(log.timestamp || log.created_at)}</td>
                        <td className="p-2.5 font-semibold text-slate-700 whitespace-nowrap">{log.module || 'General'}</td>
                        <td className="p-2.5 font-mono font-bold">
                          <button
                            type="button"
                            onClick={() => setSelectedRecordId(String(log.record_id || '').trim())}
                            className="text-[#D94B5A] hover:underline cursor-pointer"
                          >
                            {log.record_id || '—'}
                          </button>
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">{log.field_label || log.field_name || '—'}</td>
                        <td className="p-2.5 font-mono text-slate-500 max-w-[220px] truncate" title={String(log.old_value ?? '—')}>
                          {String(log.old_value ?? '—')}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-teal-800 max-w-[260px] truncate" title={String(log.new_value ?? '—')}>
                          {String(log.new_value ?? '—')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
