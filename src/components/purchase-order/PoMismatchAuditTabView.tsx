import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isMaterialMismatchApproved } from '../../lib/contractRelationshipEngine';

export interface PoMismatchAuditTabViewProps {
  dbMismatches: any[];
  dbSattaMismatches: any[];
}

export const PoMismatchAuditTabView: React.FC<PoMismatchAuditTabViewProps> = ({
  dbMismatches,
  dbSattaMismatches,
}) => {
  const combined = [...dbMismatches, ...dbSattaMismatches];
  const approvedCount = combined.filter((m) => isMaterialMismatchApproved(m)).length;
  const pendingCount = combined.length - approvedCount;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#FBCFCB] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
          <h3 className="text-sm font-serif font-black text-[#D94B5A] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Material & Satta Mismatch Audit Log (MR-Wise & Database)</span>
          </h3>
          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            {pendingCount > 0 && (
              <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300">
                {pendingCount} Pending
              </span>
            )}
            {approvedCount > 0 && (
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                {approvedCount} Approved
              </span>
            )}
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
              {combined.length} Total
            </span>
          </div>
        </div>

        {combined.length === 0 ? (
          <div className="py-8 text-center text-emerald-700 font-medium text-xs flex flex-col items-center gap-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <span>No active or logged mismatch cases found for this P.O. All specifications match cleanly.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#FDE7E6] border-b text-[10px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-2 border-r">M.R. No.</th>
                  <th className="p-2 border-r">Field / Discrepancy</th>
                  <th className="p-2 border-r">Expected (Sauda)</th>
                  <th className="p-2 border-r">Actual (Inspection)</th>
                  <th className="p-2 border-r">Variance / Detail</th>
                  <th className="p-2 border-r">Status</th>
                  <th className="p-2 border-r">Approved By</th>
                  <th className="p-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combined.map((m, idx) => {
                  const approved = isMaterialMismatchApproved(m);
                  const mrLabel = m.mr_no || m.arrival_no || 'P.O. Level';
                  const fieldLabel = m.field_name || m.field || m.mismatched_fields || m.mismatch_type || 'General';
                  const varianceLabel = m.variance || m.difference || m.mismatchLabel || '—';
                  const statusLabel = approved
                    ? String(m.status || 'APPROVED').toUpperCase()
                    : String(m.status || 'PENDING').toUpperCase();
                  return (
                    <tr key={m.id || `${mrLabel}-${fieldLabel}-${idx}`} className="hover:bg-amber-50/50 font-sans">
                      <td className="p-2 font-mono font-bold text-slate-800 border-r whitespace-nowrap">
                        <div>{mrLabel}</div>
                        {m.source === 'live' && (
                          <span className="text-[9px] font-sans font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">
                            Live MR Check
                          </span>
                        )}
                      </td>
                      <td className="p-2 font-bold text-[#D94B5A] border-r">{fieldLabel}</td>
                      <td className="p-2 font-mono text-slate-700 border-r">{m.expected_value || '—'}</td>
                      <td className="p-2 font-mono text-rose-700 font-bold border-r">{m.actual_value || '—'}</td>
                      <td className="p-2 text-slate-600 border-r text-[11px]">{varianceLabel}</td>
                      <td className="p-2 border-r whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase',
                            approved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          )}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-slate-700 border-r">{m.approved_by || '—'}</td>
                      <td className="p-2 text-slate-600 text-[11px] italic">{m.remarks || m.approval_remarks || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
