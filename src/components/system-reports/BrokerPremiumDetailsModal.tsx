import React from 'react';
import { XCircle } from 'lucide-react';
import { ReportTransactionLine } from '../../services/systemReportEngine';

interface BrokerPremiumDetailsModalProps {
  broker: string | null;
  onClose: () => void;
  transactions: ReportTransactionLine[];
}

export const BrokerPremiumDetailsModal: React.FC<BrokerPremiumDetailsModalProps> = ({
  broker,
  onClose,
  transactions
}) => {
  if (!broker) return null;

  const target = broker.trim().toLowerCase();
  const matched = transactions.filter(t => (t.broker || 'Direct').trim().toLowerCase() === target);
  const premOnly = matched.filter(t => (t.premiumAmount || 0) > 0);
  const displayList = premOnly.length > 0 ? premOnly : matched;
  const totalPrem = displayList.reduce((acc, t) => acc + (t.premiumAmount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-800/40">
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold block">
              Premium Given / Premium Analysis Report
            </span>
            <h2 className="text-lg font-black tracking-wide flex items-center gap-2 mt-0.5">
              <span className="text-xl">💰</span>
              <span>Broker: {broker}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            title="Close Full-Screen View"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body / Table */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/80 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-emerald-100">
                  <th className="p-3.5 w-14 text-center">#</th>
                  <th className="p-3.5">Broker</th>
                  <th className="p-3.5">MR No</th>
                  <th className="p-3.5">PO No</th>
                  <th className="p-3.5 text-right">Premium Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium font-mono text-[11px]">
                {displayList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-bold font-sans">
                      No premium records found for broker {broker}.
                    </td>
                  </tr>
                ) : (
                  displayList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/40 transition">
                      <td className="p-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-900 font-sans">{item.broker || broker}</td>
                      <td className="p-3.5 font-bold text-slate-800">{item.mrNo || '—'}</td>
                      <td className="p-3.5 font-bold text-slate-800">{item.poNo || item.saudaNo || '—'}</td>
                      <td className="p-3.5 text-right font-black font-mono text-emerald-800 bg-emerald-50/30">
                        +₹{Number(item.premiumAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {displayList.length > 0 && (
                <tfoot>
                  <tr className="bg-emerald-100/70 font-bold text-slate-900 border-t-2 border-emerald-300 text-[11px]">
                    <td className="p-3.5 text-center font-mono font-black">Total</td>
                    <td className="p-3.5 font-sans font-bold" colSpan={3}>
                      Total Records: {displayList.length}
                    </td>
                    <td className="p-3.5 text-right font-black font-mono text-emerald-950 text-xs">
                      +₹{totalPrem.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing premium records for broker: <strong>{broker}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};
