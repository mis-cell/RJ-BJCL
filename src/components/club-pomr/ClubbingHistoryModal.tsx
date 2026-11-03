import React from 'react';
import { History, Download, X, Search, Printer, Trash2 } from 'lucide-react';
import { PaginationControls } from '../PaginationControls';
import { ClubbingRecord } from '../../types/clubPomr.types';

interface ClubbingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredHistory: ClubbingRecord[];
  historySearch: string;
  setHistorySearch: (val: string) => void;
  historyPage: number;
  setHistoryPage: (val: number) => void;
  historyPageSize: number;
  setHistoryPageSize: (val: number) => void;
  setPrintingClub: (item: ClubbingRecord) => void;
  handleDeleteClubbingRecord: (record: ClubbingRecord) => void;
  deletingClubId: string | null;
}

export const ClubbingHistoryModal: React.FC<ClubbingHistoryModalProps> = ({
  isOpen,
  onClose,
  filteredHistory,
  historySearch,
  setHistorySearch,
  historyPage,
  setHistoryPage,
  historyPageSize,
  setHistoryPageSize,
  setPrintingClub,
  handleDeleteClubbingRecord,
  deletingClubId
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-indigo-200 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col font-sans overflow-hidden max-h-[92vh] animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="bg-indigo-950 text-white p-4 px-6 flex justify-between items-center border-b border-indigo-900">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-indigo-300" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Manual Clubbed P.O & MR History (`clubbed_pomr`)
              </h3>
              <p className="text-[9.5px] text-indigo-200 font-mono uppercase tracking-tight mt-0.5">
                Showing only records manually clubbed in this console ({filteredHistory.length} records)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                const csvContent =
                  'data:text/csv;charset=utf-8,' +
                  [
                    'Club ID,Date,Final MR No,Temp Arrival No,P.O / Sauda No,P.O Date,Supplier,Broker,Area,Lorry No,Lorry Progress,PO Weight (MT),MR Weight (MT),Variance %,Remarks'
                  ]
                    .concat(
                      filteredHistory.map(
                        c =>
                          `"${c.id}","${c.clubbedAt}","${c.finalArrivalNo}","${c.tempArrivalNo}","${c.poNo}","${c.poDate}","${c.supplier}","${c.broker}","${c.area}","${c.lorryNumber}","${c.receivedLorriesCount}/${c.totalPoLorries}","${c.totalPoWeight}","${c.totalReceivedWeight}","${c.variancePct.toFixed(2)}","${(c.remarks || '').replace(/"/g, '""')}"`
                      )
                    )
                    .join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute(
                  'download',
                  `BJCL-Manual-Clubbed-POMR-History-${new Date().toISOString().split('T')[0]}.csv`
                );
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 border border-indigo-700 rounded-lg text-[10px] font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-indigo-900/50 rounded-lg transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Toolbar inside History Modal */}
        <div className="p-3 px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search History by MR No, Temp No, P.O No, Supplier, Lorry..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full text-xs font-semibold pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-[10px] font-extrabold uppercase text-slate-500">
            Supabase Table: <code className="text-indigo-700 font-mono">clubbed_pomr</code>
          </span>
        </div>

        {/* History Table */}
        <div className="p-4 px-6 overflow-y-auto flex-1">
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-700">
                  <th className="p-3 pl-4">Clubbed Date</th>
                  <th className="p-3">Final MR No.</th>
                  <th className="p-3">Temp Arrival No.</th>
                  <th className="p-3">Bound P.O. No.</th>
                  <th className="p-3">Party & Broker</th>
                  <th className="p-3">Area / Yard</th>
                  <th className="p-3">Lorry No.</th>
                  <th className="p-3 text-center">Lorries (Recv / Total)</th>
                  <th className="p-3 text-right">P.O Wt</th>
                  <th className="p-3 text-right">MR Wt</th>
                  <th className="p-3 text-right">Variance %</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400 text-xs font-bold">
                      No manual clubbing records found.
                    </td>
                  </tr>
                ) : (
                  filteredHistory
                    .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 pl-4 font-mono text-[11px] text-slate-600">
                          {item.clubbedAt?.split('T')[0] || item.arrivalDate}
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-700">
                          {item.finalArrivalNo}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {item.tempArrivalNo || '—'}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">
                          {item.poNo}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 uppercase">{item.supplier}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{item.broker}</div>
                        </td>
                        <td className="p-3 font-bold text-slate-700">{item.area || '—'}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{item.lorryNumber || '—'}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700">
                            {item.receivedLorriesCount} / {item.totalPoLorries}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-700">
                          {item.totalPoWeight?.toFixed(2)} MT
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-700">
                          {item.totalReceivedWeight?.toFixed(2)} MT
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-700">
                          {item.variancePct?.toFixed(2)}%
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setPrintingClub(item)}
                              className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded border border-indigo-200 transition cursor-pointer"
                              title="Print binding receipt"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClubbingRecord(item)}
                              disabled={deletingClubId === item.id}
                              className="p-1.5 text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition cursor-pointer disabled:opacity-50"
                              title="Unbind / Delete clubbing record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            <PaginationControls
              currentPage={historyPage}
              totalItems={filteredHistory.length}
              pageSize={historyPageSize}
              onPageChange={setHistoryPage}
              onPageSizeChange={setHistoryPageSize}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-3.5 px-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider rounded-lg transition cursor-pointer"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};
