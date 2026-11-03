import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PoMismatchAuditTabViewProps {
  dbMismatches: any[];
  dbSattaMismatches: any[];
}

export const PoMismatchAuditTabView: React.FC<PoMismatchAuditTabViewProps> = ({
  dbMismatches,
  dbSattaMismatches,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#FBCFCB] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Database Mismatch Cases & Approval Audit Log</span>
          </h3>
          <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border">
            {dbMismatches.length + dbSattaMismatches.length} Recorded
          </span>
        </div>

        {dbMismatches.length === 0 && dbSattaMismatches.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-medium text-xs">
            No active or logged mismatch cases recorded in Supabase for this P.O. All specifications match cleanly.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#FDE7E6] border-b text-[10px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-2 border-r">Field</th>
                  <th className="p-2 border-r">Expected Value</th>
                  <th className="p-2 border-r">Actual Value</th>
                  <th className="p-2 border-r">Variance / Excess</th>
                  <th className="p-2 border-r">Status</th>
                  <th className="p-2 border-r">Approved By</th>
                  <th className="p-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...dbMismatches, ...dbSattaMismatches].map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-amber-50/50 font-sans">
                    <td className="p-2 font-bold text-[#D94B5A] border-r">{m.field_name || m.mismatch_type || 'General'}</td>
                    <td className="p-2 font-mono text-slate-700 border-r">{m.expected_value || '—'}</td>
                    <td className="p-2 font-mono text-rose-700 font-bold border-r">{m.actual_value || '—'}</td>
                    <td className="p-2 font-mono text-slate-600 border-r">{m.variance || '—'}</td>
                    <td className="p-2 border-r">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase",
                        m.status === 'approved' || m.status === 'resolved' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      )}>
                        {m.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-slate-700 border-r">{m.approved_by || '—'}</td>
                    <td className="p-2 text-slate-600 text-[11px] italic">{m.remarks || m.approval_remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
