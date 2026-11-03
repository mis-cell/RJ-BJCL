import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';

export default function EmailActivityTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    if (supabase) {
      const { data, error } = await supabase.from('mail_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (data && !error) {
        setLogs(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 h-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-light text-[#00bcd4] mb-1">Email Activity</h1>
          <p className="text-[13px] text-gray-500 font-medium">System Communication Logs & SMTP Diagnostics</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Provider</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Recipient</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {log.status === 'Sent' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                      </span>
                    ) : log.status === 'Failed' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {log.provider || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {log.to_email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {log.subject}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-600 max-w-sm truncate" title={log.error_message}>
                    {log.error_message || ''}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                    No email activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
