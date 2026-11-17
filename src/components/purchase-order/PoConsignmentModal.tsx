import React from 'react';
import { X, Truck } from 'lucide-react';
import {
  buildFinalArrivalIndex,
  getLinkedArrivalKeys,
  mergeArrivalsFinalFirst,
} from '../../utils/arrivalMrResolver';

interface PoConsignmentModalProps {
  po: any;
  onClose: () => void;
  allTempArrivals: any[];
  allFinalArrivals: any[];
  allInspections: any[];
}

export const PoConsignmentModal: React.FC<PoConsignmentModalProps> = ({
  po,
  onClose,
  allTempArrivals,
  allFinalArrivals,
  allInspections
}) => {
  if (!po) return null;

  const targetPo = po.po_no;
  const exactMatch = (po1: any, po2: any) => String(po1 || '').trim().toUpperCase() === String(po2 || '').trim().toUpperCase();
  const linkedTemps = allTempArrivals.filter((a: any) => exactMatch(a.po_no, targetPo));
  const linkedFinals = allFinalArrivals.filter((f: any) => exactMatch(f.po_no, targetPo));
  const faIndex = buildFinalArrivalIndex(allFinalArrivals);
  const consolidatedArrivals = mergeArrivalsFinalFirst(linkedTemps, linkedFinals, faIndex);
  const unfinalizedTemps = consolidatedArrivals.filter((a) => !a._isFinalized);
  const linkedInsps = allInspections.filter((i: any) => exactMatch(i.po_no, targetPo));

  const findLinkedInspection = (arrRow: any) => {
    const arrKeys = new Set(getLinkedArrivalKeys(arrRow, faIndex));
    return allInspections.find((i: any) => {
      const iKeys = getLinkedArrivalKeys(i, faIndex);
      return iKeys.some((k) => arrKeys.has(k));
    }) || linkedInsps.find((i: any) => {
      const iKeys = getLinkedArrivalKeys(i, faIndex);
      return iKeys.some((k) => arrKeys.has(k));
    });
  };

  const contractMt = Number(po.total_contract_mt) || 0;
  const totalFinalMt = linkedFinals.reduce((sum: number, f: any) => sum + (Number(f.weight_qtl || f.weight || 0) / 10), 0);
  const totalPendingTempMt = unfinalizedTemps.reduce((sum: number, t: any) => sum + (Number(t.weight_qtl || t.weight || 0) / 10), 0);

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto font-sans text-slate-900 p-5 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" />
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                1-to-N Consignment Ledger: PO #{po.po_no}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Supplier: <strong>{po.supplier || 'N/A'}</strong> | Broker: <strong>{po.broker || 'N/A'}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contract vs Fulfillment Progress */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block">Total Contract Weight</span>
            <span className="font-bold text-slate-800 text-sm">{contractMt.toFixed(3)} MT</span>
          </div>
          <div>
            <span className="text-slate-500 block">Fulfillment Weight (MR)</span>
            <span className="font-bold text-emerald-700 text-sm">{totalFinalMt.toFixed(3)} MT</span>
          </div>
          <div>
            <span className="text-slate-500 block">Pending Gate Inward (Unfinalized)</span>
            <span className="font-bold text-blue-700 text-sm">{totalPendingTempMt.toFixed(3)} MT</span>
          </div>
        </div>

        {/* Consignment Arrivals Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-2">Linked Lorry Arrivals & Inspection History</h3>
          <div className="border border-slate-200 rounded overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2">Stage</th>
                  <th className="p-2">M.R. / Arrival No</th>
                  <th className="p-2">Lorry No</th>
                  <th className="p-2">Date</th>
                  <th className="p-2 text-right">Net Wt (MT)</th>
                  <th className="p-2">Inspection Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consolidatedArrivals.map((row: any, idx: number) => {
                  const officialNo = row._officialId || row.mr_no || row.final_arrival_no || row.arrival_no || row.temporary_arrival_no || 'N/A';
                  const linkedTemp = row._linkedTempNo || row.temporary_arrival_no || '';
                  const insp = findLinkedInspection(row);
                  const wt = (Number(row.weight_qtl || row.weight || row.netto_mt || 0) / 10).toFixed(3);
                  return (
                    <tr key={`consign_${officialNo}_${idx}`} className={row._isFinalized ? "hover:bg-slate-50 bg-emerald-50/30" : "hover:bg-slate-50"}>
                      <td className={`p-2 font-semibold ${row._isFinalized ? 'text-emerald-700' : 'text-blue-700'}`}>
                        {row._isFinalized ? 'Final MR Inward' : 'Gate Arrival'}
                      </td>
                      <td className="p-2 font-mono font-bold">
                        <span>{officialNo}</span>
                        {row._isFinalized && linkedTemp && linkedTemp.toUpperCase() !== officialNo.toUpperCase() && (
                          <span className="ml-1.5 text-[10px] font-normal text-slate-500">(Temp: {linkedTemp})</span>
                        )}
                      </td>
                      <td className="p-2 font-mono">{row.lorry_number || 'N/A'}</td>
                      <td className="p-2">{row.final_arrival_date || row.arrival_date || row.date || 'N/A'}</td>
                      <td className={`p-2 text-right font-mono font-bold ${row._isFinalized ? 'text-emerald-800' : ''}`}>{wt}</td>
                      <td className="p-2">
                        {insp ? (
                          <span className="text-emerald-700 font-bold">Completed</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Pending Inspection</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {consolidatedArrivals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                      No lorry inward consignments registered for this Purchase Order yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <button 
            type="button"
            onClick={onClose} 
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-md shadow-xs cursor-pointer"
          >
            Close Consignment Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
