import React from 'react';
import { Database } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ReportOutput } from './types';

interface PurchaseOrderSummaryTableProps {
  reportOutput: ReportOutput;
  activePoReportKey: string;
}

export const PurchaseOrderSummaryTable: React.FC<PurchaseOrderSummaryTableProps> = ({
  reportOutput,
  activePoReportKey
}) => {
  return (
    <div className="bg-white border-2 border-gray-400 p-2.5 shadow-[2px_2px_0_0_rgba(0,0,0,0.15)] rounded-sm space-y-2">
      <div className="flex justify-between items-center px-1">
        <div className="text-[10px] font-black text-slate-800 uppercase flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-indigo-900" />
          <span>Compiled Data Rows &amp; Ledger Log</span>
        </div>
        <span className="text-[8.5px] font-bold text-gray-500 font-mono">
          Showing {reportOutput.rows.length} records
        </span>
      </div>

      <div className="border border-gray-300 max-h-80 overflow-y-auto overflow-x-auto">
        <table className="w-full border-collapse text-[9.5px] font-mono text-left">
          <thead className="bg-[#1e293b] text-white sticky top-0 uppercase tracking-tighter text-[9px]">
            <tr>
              <th className="p-2 border-r border-slate-700 w-8 text-center">#</th>
              {reportOutput.headers.map((h, idx) => (
                <th key={idx} className="p-2 border-r border-slate-700 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reportOutput.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={reportOutput.headers.length + 1}
                  className="p-8 text-center text-gray-400 italic bg-slate-50"
                >
                  No data records match chosen operational constraints.
                </td>
              </tr>
            ) : (
              reportOutput.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={cn(
                    "hover:bg-indigo-50/70 transition-colors font-semibold",
                    rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  )}
                >
                  <td className="p-1.5 px-2 border-r border-gray-200 text-center text-gray-400">
                    {rIdx + 1}
                  </td>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={cn(
                        "p-1.5 px-2 border-r border-gray-200 whitespace-nowrap",
                        cIdx === 0 ? "font-bold text-slate-900" : "text-slate-700"
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
