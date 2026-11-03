import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { FinalArrivalRecord } from './finalArrivalTypes';
import { LegacyFieldset, LegacyButton } from '../LegacyLayout';

interface FinalArrivalDetailSlipModalProps {
  selectedRecord: FinalArrivalRecord | null;
  onClose: () => void;
}

export function FinalArrivalDetailSlipModal({
  selectedRecord,
  onClose
}: FinalArrivalDetailSlipModalProps) {
  return (
    <AnimatePresence>
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="w-full max-w-3xl bg-[#FBCFCB] border-t-white border-l-white border-b-slate-900 border-r-slate-900 border-2 shadow-[4px_4px_16px_rgba(0,0,0,0.35)] font-sans text-xs"
          >
            {/* Header */}
            <div className="bg-indigo-950 text-white px-3 py-1.5 flex justify-between items-center h-10 border-b border-black/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider italic">
                  Finalized Stock Entry Voucher - [FA No: {selectedRecord.final_arrival_no}]
                </span>
              </div>
              <button 
                onClick={onClose}
                className="bg-[#FBCFCB] hover:bg-red-700 hover:text-white text-black px-2 py-0.5 border-t-white border-l-white border-b-slate-800 border-r-slate-800 border-2 text-xs font-black cursor-pointer"
              >
                ✖
              </button>
            </div>

            {/* Slips Body */}
            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto font-sans">
              
              <div className="bg-white border border-gray-400 p-3 shadow-inner space-y-1">
                <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Enterprise Final Materials Desk</div>
                <div className="text-xl font-bold font-mono tracking-tight text-red-900">FINAL ARRIVAL RECORD #{selectedRecord.final_arrival_no}</div>
                <div className="text-[10px] text-slate-600 font-medium">
                  This finalized arrival slip is compiled post-inspection. It registers verified material stock additions against active mill purchase sauda/ruka.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <LegacyFieldset legend="Document & Dispatch Logistics">
                  <div className="grid grid-cols-12 gap-x-2 gap-y-1.5 text-[11px] items-center">
                    <span className="col-span-5 font-bold text-gray-600">Arrival Date:</span>
                    <span className="col-span-7 font-mono font-bold text-indigo-950 bg-white p-1 border border-gray-300 text-center">
                      {selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString('en-GB') : 'N/A'}
                    </span>

                    <span className="col-span-5 font-bold text-gray-600">Inspection MR No:</span>
                    <span className="col-span-7 font-mono font-black text-emerald-800 bg-emerald-50 p-1 border border-emerald-300 text-center">
                      {selectedRecord.mr_no || 'DIRECT REGISTER'}
                    </span>

                    <span className="col-span-12 my-0.5 border-b border-dashed border-gray-300"></span>

                    <span className="col-span-5 font-bold text-gray-600">Associated Purchase PO:</span>
                    <span className="col-span-7 font-mono font-bold text-amber-900 bg-amber-50/20 p-1 border border-amber-300 text-center">
                      {selectedRecord.po_no || 'N/A'}
                    </span>

                    <span className="col-span-5 font-bold text-gray-600">Financial Year:</span>
                    <span className="col-span-7 font-mono font-extrabold text-slate-700 bg-white p-1 border border-gray-300 text-center">
                      {selectedRecord.financial_year}
                    </span>

                    <span className="col-span-12 my-0.5 border-b border-dashed border-gray-300"></span>

                    <span className="col-span-5 font-bold text-gray-600">Consignment Note:</span>
                    <span className="col-span-7 font-mono font-bold text-slate-900 bg-white p-1 border border-gray-300 text-center">
                      {selectedRecord.consignment_note || selectedRecord.consignment_note_no || (selectedRecord as any).consignment_notice_no || 'N/A'}
                    </span>

                    <span className="col-span-5 font-bold text-gray-600">Challan / RR No:</span>
                    <span className="col-span-7 font-mono font-bold text-slate-900 bg-white p-1 border border-gray-300 text-center">
                      {selectedRecord.challan_railway_receipt_no || selectedRecord.challan_rr_no || 'N/A'}
                    </span>
                  </div>
                </LegacyFieldset>

                <LegacyFieldset legend="Stakeholder Information & Lorry">
                  <div className="grid grid-cols-12 gap-x-2 gap-y-1.5 text-[11px] items-center">
                    <span className="col-span-4 font-bold text-gray-600">Challan Supplier:</span>
                    <span className="col-span-8 font-serif font-black text-indigo-950 bg-white p-1 border border-gray-300 truncate uppercase">
                      {selectedRecord.challan_supplier || 'N/A'}
                    </span>

                    <span className="col-span-4 font-bold text-gray-600">Ledger Acc Supp:</span>
                    <span className="col-span-8 font-serif font-black text-indigo-950 bg-white p-1 border border-gray-300 truncate uppercase">
                      {selectedRecord.supplier || 'N/A'}
                    </span>

                    <span className="col-span-4 font-bold text-gray-600">Broker:</span>
                    <span className="col-span-8 font-sans font-bold text-slate-800 bg-white p-1 border border-gray-300 truncate uppercase">
                      {selectedRecord.broker || 'DIRECT'}
                    </span>

                    <span className="col-span-12 my-0.5 border-b border-dashed border-gray-300"></span>

                    <span className="col-span-4 font-bold text-gray-600">Lorry Number:</span>
                    <span className="col-span-8 font-mono font-black text-red-800 bg-red-50 p-1 border border-red-200 text-center uppercase">
                      {(selectedRecord.lorry_number || (selectedRecord as any).lorry_no || (selectedRecord as any).vehicle_no) || 'N/A'}
                    </span>
                  </div>
                </LegacyFieldset>
              </div>

              {/* Weigh bridges */}
              <LegacyFieldset legend="Enterprise Weigh Bridge Compilations">
                <div className="grid grid-cols-3 gap-3 font-mono text-[11px]">
                  <div className="bg-blue-50/40 border border-blue-200 p-2 text-center rounded space-y-0.5">
                    <p className="text-[9px] font-sans font-bold text-blue-900 uppercase">Challan Weight</p>
                    <p className="text-sm font-black text-blue-950">{selectedRecord.challan_material_weight || 0} MT</p>
                  </div>
                  <div className="bg-emerald-50/40 border border-emerald-200 p-2 text-center rounded space-y-0.5">
                    <p className="text-[9px] font-sans font-bold text-emerald-900 uppercase">Supplier Net Weight</p>
                    <p className="text-sm font-black text-emerald-950">{selectedRecord.supplier_net_weight || 0} MT</p>
                  </div>
                  <div className="bg-purple-50/40 border border-purple-200 p-2 text-center rounded space-y-0.5">
                    <p className="text-[9px] font-sans font-bold text-purple-900 uppercase">Electronic Net Weight</p>
                    <p className="text-sm font-black text-purple-950">{selectedRecord.electronic_net_weight || 0} MT</p>
                  </div>
                </div>
              </LegacyFieldset>

              {/* Grid Item Details */}
              {selectedRecord.grid_details && (
                <LegacyFieldset legend="Material Grade Specifications Summary">
                  <div className="border border-gray-300 max-h-40 overflow-y-auto">
                    <table className="w-full text-[10px] border-collapse bg-white">
                      <thead className="bg-gray-100 sticky top-0 font-sans border-b border-gray-300">
                        <tr className="h-6 text-gray-700">
                          <th className="px-2 border-r border-gray-300 font-bold text-center w-10">Srl</th>
                          <th className="px-2 border-r border-gray-300 font-bold text-center w-16">Grade Code</th>
                          <th className="px-2 border-r border-gray-300 font-bold text-left">Grade Name</th>
                          <th className="px-2 border-r border-gray-300 font-bold text-center w-16">Crop Yr</th>
                          <th className="px-2 border-r border-gray-300 font-bold text-left">Marka Name</th>
                          <th className="px-2 border-r border-gray-300 font-bold text-right w-24">Netto Weight (MT)</th>
                          <th className="px-2 font-bold text-right w-24">Receipt (Bags)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-mono">
                        {(() => {
                          try {
                            const list = typeof selectedRecord.grid_details === 'string' 
                              ? (selectedRecord.grid_details === 'undefined' || selectedRecord.grid_details === 'null' ? [] : JSON.parse(selectedRecord.grid_details === "undefined" ? "null" : selectedRecord.grid_details)) 
                              : selectedRecord.grid_details;
                            
                            if (!Array.isArray(list)) return null;

                            return list.map((item: any, i: number) => (
                              <tr key={i} className="h-6 hover:bg-slate-50">
                                <td className="text-center font-bold text-gray-500 border-r border-gray-200">{item.srl_no || (i + 1)}</td>
                                <td className="text-center font-bold text-slate-800 border-r border-gray-200">{item.receipt_grade_code || '--'}</td>
                                <td className="px-2 border-r border-gray-200 text-indigo-950 font-bold uppercase">{item.receipt_grade_name || item.challan_grade_name || '--'}</td>
                                <td className="text-center border-r border-gray-200">{item.crop_year || '--'}</td>
                                <td className="px-2 border-r border-gray-200 uppercase">{item.challan_marka_name || '--'}</td>
                                <td className="text-right pr-2 font-black text-blue-900 border-r border-gray-200">{item.netto_pnto ? Number(item.netto_pnto).toFixed(3) : '0.000'}</td>
                                <td className="text-right pr-2 font-semibold text-amber-950">{item.quantity_rcpt || 0}</td>
                              </tr>
                            ));
                          } catch (e) {
                            return <tr><td colSpan={7} className="text-center py-2">Failed to parse detailed lists</td></tr>;
                          }
                        })()}
                      </tbody>
                    </table>
                  </div>
                </LegacyFieldset>
              )}

              {/* Remarks */}
              {selectedRecord.remarks && (
                <div className="p-2 border border-gray-400 bg-white font-mono text-[10px] text-gray-600 leading-snug">
                  <span className="font-bold text-gray-800">REMARKS & ADVICE NOTES: </span>
                  {selectedRecord.remarks}
                </div>
              )}

            </div>

            {/* Footer bar */}
            <div className="bg-[#FBCFCB] p-2 flex justify-end gap-2 border-t border-gray-400">
              <LegacyButton
                onClick={onClose}
                variant="default"
              >
                OK, Close Details
              </LegacyButton>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
