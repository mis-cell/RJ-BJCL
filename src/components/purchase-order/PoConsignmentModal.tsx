import React from 'react';
import { X, Truck } from 'lucide-react';

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
  const linkedInsps = allInspections.filter((i: any) => exactMatch(i.po_no, targetPo));

  const contractMt = Number(po.total_contract_mt) || 0;
  const totalFinalMt = linkedFinals.reduce((sum: number, f: any) => sum + (Number(f.weight_qtl || f.weight || 0) / 10), 0);
  const totalTempMt = linkedTemps.reduce((sum: number, t: any) => sum + (Number(t.weight_qtl || t.weight || 0) / 10), 0);

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
            <span className="text-slate-500 block">Gate Inward Weight</span>
            <span className="font-bold text-blue-700 text-sm">{totalTempMt.toFixed(3)} MT</span>
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
                  <th className="p-2">Arrival/MR No</th>
                  <th className="p-2">Lorry No</th>
                  <th className="p-2">Date</th>
                  <th className="p-2 text-right">Net Wt (MT)</th>
                  <th className="p-2">Inspection Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linkedTemps.map((t: any, idx: number) => {
                  const mrNo = t.temporary_arrival_no || t.amad_no || 'N/A';
                  const insp = linkedInsps.find((i: any) => i.temporary_arrival_no === mrNo || i.po_no === targetPo);
                  const wt = (Number(t.weight_qtl || t.weight || t.netto_mt || 0) / 10).toFixed(3);
                  return (
                    <tr key={`temp_${idx}`} className="hover:bg-slate-50">
                      <td className="p-2 font-semibold text-blue-700">Gate Arrival</td>
                      <td className="p-2 font-mono">{mrNo}</td>
                      <td className="p-2 font-mono">{t.lorry_number || 'N/A'}</td>
                      <td className="p-2">{t.arrival_date || t.date || 'N/A'}</td>
                      <td className="p-2 text-right font-mono font-bold">{wt}</td>
                      <td className="p-2">
                        {insp ? (
                          <span className="text-emerald-700 font-bold">Passed</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Pending Inspection</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {linkedFinals.map((f: any, idx: number) => {
                  const wt = (Number(f.weight_qtl || f.weight || 0) / 10).toFixed(3);
                  return (
                    <tr key={`final_${idx}`} className="hover:bg-slate-50 bg-emerald-50/30">
                      <td className="p-2 font-semibold text-emerald-700">Final MR Inward</td>
                      <td className="p-2 font-mono font-bold">{f.arrival_no || f.mr_no || 'N/A'}</td>
                      <td className="p-2 font-mono">{f.lorry_number || 'N/A'}</td>
                      <td className="p-2">{f.arrival_date || f.date || 'N/A'}</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800">{wt}</td>
                      <td className="p-2">
                        <span className="text-emerald-700 font-bold">Completed</span>
                      </td>
                    </tr>
                  );
                })}
                {linkedTemps.length === 0 && linkedFinals.length === 0 && (
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
