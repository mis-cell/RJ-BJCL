import React from 'react';
import { Link, X, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ManualClubbingBindModalProps {
  selectedArrivalForBind: any;
  onClose: () => void;
  chosenPoForBind: any;
  setChosenPoForBind: (val: any) => void;
  showAllPOsInModal: boolean;
  setShowAllPOsInModal: (val: boolean) => void;
  modalPoSearch: string;
  setModalPoSearch: (val: string) => void;
  getMatchingPOsForModal: () => any[];
  handleConfirmBinding: () => Promise<void>;
  loading: boolean;
  clubbingRemarks: string;
  setClubbingRemarks: (val: string) => void;
}

export const ManualClubbingBindModal: React.FC<ManualClubbingBindModalProps> = ({
  selectedArrivalForBind,
  onClose,
  chosenPoForBind,
  setChosenPoForBind,
  showAllPOsInModal,
  setShowAllPOsInModal,
  modalPoSearch,
  setModalPoSearch,
  getMatchingPOsForModal,
  handleConfirmBinding,
  loading,
  clubbingRemarks,
  setClubbingRemarks
}) => {
  if (!selectedArrivalForBind) return null;

  const matchingPOs = getMatchingPOsForModal();

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-indigo-200 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col font-sans overflow-hidden max-h-[92vh] animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="bg-indigo-950 text-white p-4 flex justify-between items-center px-6 border-b border-indigo-900">
          <div className="flex items-center gap-2.5">
            <Link className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Select Open P.O / Sauda Contract for Binding
              </h3>
              <p className="text-[9.5px] text-indigo-200 font-mono uppercase tracking-tight mt-0.5">
                Multi-Lorry Sauda Contracts Remain Open Until All Lorries Are Tagged • Updates Final Arrival, Temporary Arrival & Mill Inspection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-indigo-900/50 rounded-lg transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Target MR Card */}
          <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 block mb-2">
              Target Final Arrival (MR) Record to Bind
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">Final MR No:</span>
                <span className="font-mono font-black text-indigo-800">
                  {selectedArrivalForBind.final_arrival_no || selectedArrivalForBind.mr_no}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">Temp Arrival (Amad):</span>
                <span className="font-mono font-bold text-slate-700">
                  {selectedArrivalForBind.temporary_arrival_no || selectedArrivalForBind.arrival_no || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">Arrival Date:</span>
                <span className="font-mono text-slate-700">
                  {selectedArrivalForBind.arrival_date || selectedArrivalForBind.mr_date || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">Lorry No:</span>
                <span className="font-mono font-bold text-slate-700">
                  {selectedArrivalForBind.lorry_number || selectedArrivalForBind.lorry_no || '—'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-500 font-bold block">Supplier Name:</span>
                <span className="font-bold text-slate-800 uppercase">
                  {selectedArrivalForBind.supplier_name || selectedArrivalForBind.supplier || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">Broker Name:</span>
                <span className="font-bold text-slate-700">
                  {selectedArrivalForBind.broker_name || selectedArrivalForBind.broker || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">Area / Yard:</span>
                <span className="font-bold text-slate-700">{selectedArrivalForBind.area || '—'}</span>
              </div>
            </div>
          </div>

          {/* Matching Criteria & Search Bar inside Modal */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                Available Open Purchase Orders (Sauda Check Point / Purchase Master)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                  {matchingPOs.length} Found
                </span>
              </span>

              {/* Toggle to show All Open POs vs Strict Match */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                <span className="text-[10px] font-bold text-slate-500">
                  {showAllPOsInModal ? (
                    <span className="text-amber-700 font-bold">Showing ALL open POs (Unfiltered)</span>
                  ) : (
                    <span className="text-emerald-700 font-bold">Filtering by: {selectedArrivalForBind.broker_name || selectedArrivalForBind.broker}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllPOsInModal(!showAllPOsInModal)}
                  className="px-2.5 py-1 text-[9.5px] font-extrabold uppercase rounded border border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
                >
                  {showAllPOsInModal ? 'Filter by Broker/Yard' : 'Show All Open P.Os'}
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search POs by P.O No, Sauda No, Supplier, Broker, Area, Grade..."
                value={modalPoSearch}
                onChange={(e) => setModalPoSearch(e.target.value)}
                className="w-full text-xs font-semibold pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Available POs List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
            {matchingPOs.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-500 bg-slate-50">
                No open Purchase Orders found matching the criteria.
                {!showAllPOsInModal && (
                  <button
                    type="button"
                    onClick={() => setShowAllPOsInModal(true)}
                    className="block mx-auto mt-2 text-indigo-700 underline font-extrabold text-xs"
                  >
                    Click to view all open P.Os in database
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-700 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 pl-3 w-8">Select</th>
                    <th className="p-2.5">P.O. / Sauda No</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Supplier & Broker</th>
                    <th className="p-2.5">Area & Grade</th>
                    <th className="p-2.5 text-center">Lorries (Received / Total)</th>
                    <th className="p-2.5 text-right pr-3">Total Qty (MT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matchingPOs.map((po) => {
                    const isSelected = chosenPoForBind?.po_no === po.po_no;
                    const totalLorries = Number(po.total_lorries || po.lorries || 1);
                    const receivedCount = Number(po.received_lorries_count || 0);
                    const isFullyReceived = receivedCount >= totalLorries && totalLorries > 0;

                    return (
                      <tr
                        key={po.po_no}
                        onClick={() => setChosenPoForBind(po)}
                        className={cn(
                          'cursor-pointer transition select-none',
                          isSelected ? 'bg-indigo-100/70 border-l-4 border-indigo-700 font-semibold' : 'hover:bg-slate-50'
                        )}
                      >
                        <td className="p-2.5 pl-3">
                          <input
                            type="radio"
                            name="selected_po_radio"
                            checked={isSelected}
                            onChange={() => setChosenPoForBind(po)}
                            className="cursor-pointer text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-2.5 font-mono font-bold text-indigo-900">
                          {po.po_no}
                          {po.sauda_no && po.sauda_no !== po.po_no && (
                            <span className="block text-[9.5px] font-semibold text-slate-500">Ref: {po.sauda_no}</span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 text-[11px]">{po.po_date || po.s_date || '—'}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-800 uppercase">{po.supplier_name || po.supplier || '—'}</div>
                          <div className="text-[10px] text-slate-500">{po.broker_name || po.broker || '—'}</div>
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-800">{po.area || '—'}</div>
                          <div className="text-[10px] text-slate-500 font-semibold">{po.quality || po.grade || '—'}</div>
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-black',
                              isFullyReceived
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            )}
                          >
                            {receivedCount} / {totalLorries} Lorries
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800 pr-3">
                          {(Number(po.contract_quantity || po.approx_quantity || po.quantity || 0)).toFixed(2)} MT
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Clubbing Remarks & Audit Narration */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Audit Binding Narration / Remarks:
            </label>
            <input
              type="text"
              placeholder="e.g. Bound against Sauda contract Lorry 2 of 5, Quality matched at mill..."
              value={clubbingRemarks}
              onChange={(e) => setClubbingRemarks(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <div className="text-xs text-slate-600">
            {chosenPoForBind ? (
              <span>
                Selected P.O: <strong className="font-mono text-indigo-900 font-black">{chosenPoForBind.po_no}</strong> (
                {chosenPoForBind.supplier_name || chosenPoForBind.supplier})
              </span>
            ) : (
              <span className="italic text-slate-400">Please choose a Purchase Order above to proceed</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmBinding}
              disabled={!chosenPoForBind || loading}
              className={cn(
                'px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-black uppercase text-[10.5px] tracking-wider rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer',
                (!chosenPoForBind || loading) && 'opacity-50 cursor-not-allowed hover:bg-indigo-700'
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirm & Bind (Update Final Arrival, Temp Arrival & Mill Inspection)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
