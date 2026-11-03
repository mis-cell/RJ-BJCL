import React from 'react';
import { Printer, X } from 'lucide-react';
import { MONTH_COLS } from './sattaConstants';

interface SattaPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: number;
  rateLookup: Map<string, number>;
  monthlySummaryStats: Array<{
    month: string;
    avg: string | null;
    max: string | null;
    min: string | null;
  }>;
}

export function SattaPrintPreviewModal({
  isOpen,
  onClose,
  selectedYear,
  rateLookup,
  monthlySummaryStats,
}: SattaPrintPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border-2 border-[#FDE7E6] my-auto overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-[#D94B5A] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#FDE7E6] print:hidden">
          <div className="flex items-center gap-2.5">
            <Printer className="h-5 w-5 text-[#FDE7E6]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Print Preview — Satta Chart Base Rate ({selectedYear})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#FDE7E6] hover:bg-[#FBCFCB] text-[#D94B5A] font-black px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Section */}
        <div id="satta-print-area" className="p-6 md:p-8 bg-white text-slate-900 font-sans print:p-0">
          <div className="text-center mb-6 border-b-2 border-slate-900 pb-4">
            <h1 className="text-xl md:text-2xl font-black font-serif tracking-tight text-slate-900 uppercase">
              SATTA CHART BASE RATE
            </h1>
            <div className="text-sm font-bold text-slate-700 mt-1">
              Bally Jute Company Limited • Jute Season Base Rate Schedule
            </div>
            <div className="text-xs font-mono font-bold text-slate-600 mt-0.5">
              Year: {selectedYear} • Source: Supabase Base Rate Master
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse border border-slate-900 text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 font-black uppercase">
                  <th className="py-2 px-2 border-r border-slate-900 w-12 text-slate-900">Date</th>
                  {MONTH_COLS.map((m) => (
                    <th key={m.name} className="py-2 px-2 border-r border-slate-900 text-slate-900">
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400 font-mono text-[11px]">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const dayStr = String(day).padStart(2, '0');
                  return (
                    <tr key={day} className="border-b border-slate-300">
                      <td className="py-1.5 px-2 font-bold bg-slate-50 border-r border-slate-900 text-slate-900">
                        {dayStr}
                      </td>
                      {MONTH_COLS.map((m) => {
                        const targetYear = selectedYear + (m.yearOffset || 0);
                        const dateKey = `${targetYear}-${m.month}-${dayStr}`;
                        const hasDay = day <= m.days;
                        const rateVal = hasDay ? rateLookup.get(dateKey) : null;

                        return (
                          <td key={m.name} className="py-1.5 px-1.5 border-r border-slate-400 text-slate-900">
                            {rateVal && rateVal > 0 ? (
                              <span className="font-bold">{rateVal.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Print Preview Monthly Summary Table */}
          <div className="mt-4 overflow-x-auto">
            <div className="text-[11px] font-black uppercase text-slate-900 mb-1">
              Monthly Base Rate Summary (AVG / MAX / MIN)
            </div>
            <table className="w-full text-center border-collapse border border-slate-900 text-[11px] font-mono">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 font-black">
                  <th className="py-1.5 px-2 border-r border-slate-900 w-12 text-slate-900 text-center">Metric</th>
                  {MONTH_COLS.map((m) => (
                    <th key={m.name} className="py-1.5 px-1.5 border-r border-slate-900 text-slate-900">
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400">
                <tr className="border-b border-slate-300">
                  <td className="py-1 px-2 font-bold bg-slate-50 border-r border-slate-900 text-slate-900">AVG</td>
                  {monthlySummaryStats.map((stat) => (
                    <td key={`print-avg-${stat.month}`} className="py-1 px-1 border-r border-slate-400 font-bold">
                      {stat.avg || '—'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="py-1 px-2 font-bold bg-slate-50 border-r border-slate-900 text-slate-900">MAX</td>
                  {monthlySummaryStats.map((stat) => (
                    <td key={`print-max-${stat.month}`} className="py-1 px-1 border-r border-slate-400 font-bold">
                      {stat.max || '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1 px-2 font-bold bg-slate-50 border-r border-slate-900 text-slate-900">MIN</td>
                  {monthlySummaryStats.map((stat) => (
                    <td key={`print-min-${stat.month}`} className="py-1 px-1 border-r border-slate-400 font-bold">
                      {stat.min || '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500 font-medium print:mt-4">
            <span>Generated by Bally Jute Company Limited ERP Base Rate Module</span>
            <span>Page 1 of 1 • Official Satta Matrix</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Close Preview
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-[#F7AFA8] hover:bg-[#D94B5A] text-white font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow cursor-pointer active:scale-95"
          >
            <Printer className="h-4 w-4 text-[#FDE7E6]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}
