import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ArrivalDetailRow } from './finalArrivalTypes';

interface FinalArrivalGridTableProps {
  details: ArrivalDetailRow[];
  handleRowChange: (index: number, field: keyof ArrivalDetailRow, val: any) => void;
  handleAddRow: () => void;
  handleDeleteRow: () => void;
  grades: any[];
  agencies: any[];
  markas: any[];
  unitList: string[];
  totalChallanQuantity: number;
  totalReceiptQuantity: number;
  totalNettoWeight: number;
}

export function FinalArrivalGridTable({
  details,
  handleRowChange,
  handleAddRow,
  handleDeleteRow,
  grades,
  agencies,
  markas,
  unitList,
  totalChallanQuantity,
  totalReceiptQuantity,
  totalNettoWeight
}: FinalArrivalGridTableProps) {
  return (
    <div className="bg-white rounded-xl border border-[#FBCFCB] shadow-xs p-4 space-y-3 text-xs">
      <div className="flex items-center justify-between pb-1 border-b border-[#FBCFCB]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 uppercase tracking-wide text-xs">Receipt Grade Details</span>
          <span className="text-[11px] text-slate-500 font-mono">({details.length} Items Listed)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteRow}
            disabled={details.length <= 1}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Row</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full border-collapse text-xs font-sans min-w-[1200px]">
          <thead className="bg-[#D94B5A] text-white font-serif">
            <tr className="h-8 text-[11px]">
              <th className="px-2 border-r border-[#D94B5A] font-bold text-center w-12">Srl</th>
              <th className="px-2 border-r border-[#D94B5A] font-bold text-center w-28">Receipt Grade</th>
              <th className="px-2 border-r border-[#D94B5A] font-bold text-center w-24">Crop Year</th>
              <th className="px-2 border-r border-[#D94B5A] font-bold text-left w-32">Challan Grade</th>
              <th className="px-2 border-r border-[#D94B5A] font-bold text-left w-36">Agency Name</th>
              <th className="px-2 border-r border-[#D94B5A] font-bold text-left w-32">Marka Name</th>
              <th className="px-2 border-r border-[#D94B5A] font-bold text-right w-24">Challan Qty</th>
              <th className="px-2 border-r border-[#D94B5A] font-bold text-right w-24">Receipt Qty</th>
              <th className="px-2 border-r border-[#D94B5A] font-bold text-right w-28 text-amber-200">Netto (M.T)</th>
              <th className="px-2 border-r border-[#D94B5A] font-bold text-center w-24">Unit</th>
              <th className="px-2 border-r border-[#D94B5A] font-bold text-left w-32">Marks / Phota</th>
              <th className="px-2 font-bold text-left">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono text-xs bg-white">
            {details.map((row, idx) => {
              const isLoose = (row.unit || '').toString().toUpperCase().includes('LOOSE');
              return (
                <tr key={idx} className="h-8 hover:bg-emerald-50/40 transition-colors">
                  {/* Serial */}
                  <td className="text-center font-bold text-slate-500 border-r border-slate-200 bg-slate-50">
                    {row.srl_no || idx + 1}
                  </td>

                  {/* Receipt Grade */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      list={`grade-list-${idx}`}
                      type="text"
                      value={row.receipt_grade_name || row.receipt_grade_code || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = grades.find(g => String(g.grade_code).toUpperCase() === val.toUpperCase() || String(g.grade_name).toUpperCase() === val.toUpperCase());
                        handleRowChange(idx, 'receipt_grade_code', match ? match.grade_code : val);
                        handleRowChange(idx, 'receipt_grade_name', match ? match.grade_name : val);
                      }}
                      placeholder="Select Grade"
                      className="w-full h-6 px-1.5 bg-white border border-slate-200 rounded text-xs uppercase focus:border-[#D94B5A] outline-none"
                    />
                    <datalist id={`grade-list-${idx}`}>
                      {grades.map((g, gIdx) => (
                        <option key={gIdx} value={g.grade_name || g.grade_code} />
                      ))}
                    </datalist>
                  </td>

                  {/* Crop Year */}
                  <td className="p-1 border-r border-slate-200 text-center">
                    <input
                      type="text"
                      value={row.crop_year || '2026-27'}
                      onChange={(e) => handleRowChange(idx, 'crop_year', e.target.value)}
                      className="w-full h-6 px-1 text-center bg-white border border-slate-200 rounded text-xs focus:border-[#D94B5A] outline-none"
                    />
                  </td>

                  {/* Challan Grade */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.challan_grade_name || ''}
                      onChange={(e) => handleRowChange(idx, 'challan_grade_name', e.target.value.toUpperCase())}
                      className="w-full h-6 px-1.5 bg-white border border-slate-200 rounded text-xs uppercase focus:border-[#D94B5A] outline-none"
                    />
                  </td>

                  {/* Agency Name */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      list={`agency-list-${idx}`}
                      type="text"
                      value={row.agency_name || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = agencies.find(a => String(a.agency_code).toUpperCase() === val.toUpperCase() || String(a.agency_name).toUpperCase() === val.toUpperCase());
                        handleRowChange(idx, 'agency_name', match ? match.agency_name : val);
                        handleRowChange(idx, 'agency_code', match ? match.agency_code : '');
                      }}
                      placeholder="Select Agency"
                      className="w-full h-6 px-1.5 bg-white border border-slate-200 rounded text-xs uppercase focus:border-[#D94B5A] outline-none"
                    />
                    <datalist id={`agency-list-${idx}`}>
                      {agencies.map((a, aIdx) => (
                        <option key={aIdx} value={a.agency_name || a.agency_code} />
                      ))}
                    </datalist>
                  </td>

                  {/* Marka Name */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      list={`marka-list-${idx}`}
                      type="text"
                      value={row.challan_marka_name || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = markas.find(m => String(m.marka_code).toUpperCase() === val.toUpperCase() || String(m.marka_name).toUpperCase() === val.toUpperCase());
                        handleRowChange(idx, 'challan_marka_name', match ? match.marka_name : val);
                        handleRowChange(idx, 'challan_marka_code', match ? match.marka_code : '');
                      }}
                      placeholder="Select Marka"
                      className="w-full h-6 px-1.5 bg-white border border-slate-200 rounded text-xs uppercase focus:border-[#D94B5A] outline-none"
                    />
                    <datalist id={`marka-list-${idx}`}>
                      {markas.map((m, mIdx) => (
                        <option key={mIdx} value={m.marka_name || m.marka_code} />
                      ))}
                    </datalist>
                  </td>

                  {/* Challan Qty */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="number"
                      disabled={isLoose}
                      value={isLoose ? 0 : (row.quantity_chln ?? '')}
                      onChange={(e) => handleRowChange(idx, 'quantity_chln', parseFloat(e.target.value) || 0)}
                      className={cn(
                        "w-full h-6 px-1.5 text-right border rounded text-xs font-bold outline-none",
                        isLoose ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white text-slate-800 border-slate-200 focus:border-[#D94B5A]"
                      )}
                    />
                  </td>

                  {/* Receipt Qty */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="number"
                      disabled={isLoose}
                      value={isLoose ? 0 : (row.quantity_rcpt ?? '')}
                      onChange={(e) => handleRowChange(idx, 'quantity_rcpt', parseFloat(e.target.value) || 0)}
                      className={cn(
                        "w-full h-6 px-1.5 text-right border rounded text-xs font-bold outline-none",
                        isLoose ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white text-blue-900 border-slate-200 focus:border-[#D94B5A]"
                      )}
                    />
                  </td>

                  {/* Netto (M.T) */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="0.001"
                      value={row.netto_pnto ?? ''}
                      onChange={(e) => handleRowChange(idx, 'netto_pnto', parseFloat(e.target.value) || 0)}
                      className="w-full h-6 px-1.5 text-right bg-amber-50/40 text-rose-700 border border-amber-200 rounded text-xs font-black outline-none focus:border-[#D94B5A]"
                    />
                  </td>

                  {/* Unit */}
                  <td className="p-1 border-r border-slate-200 text-center">
                    <select
                      value={row.unit || 'BALES'}
                      onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                      className="w-full h-6 px-1 text-center bg-white border border-slate-200 rounded text-xs uppercase font-bold outline-none"
                    >
                      {unitList.map((u, uIdx) => (
                        <option key={uIdx} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>

                  {/* Marks / Phota */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.marks_phota || ''}
                      onChange={(e) => handleRowChange(idx, 'marks_phota', e.target.value)}
                      className="w-full h-6 px-1.5 bg-white border border-slate-200 rounded text-xs outline-none focus:border-[#D94B5A]"
                    />
                  </td>

                  {/* Remarks */}
                  <td className="p-1">
                    <input
                      type="text"
                      value={row.remarks || ''}
                      onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
                      className="w-full h-6 px-1.5 bg-white border border-slate-200 rounded text-xs outline-none focus:border-[#D94B5A]"
                    />
                  </td>
                </tr>
              );
            })}

            {/* TOTALS SUMMARY ROW */}
            <tr className="h-9 bg-slate-100 font-bold border-t-2 border-slate-300">
              <td colSpan={6} className="text-right px-3 uppercase text-[11px] font-black text-slate-700 border-r border-slate-300">
                Summary Totals:
              </td>
              <td className="px-2 text-right font-black text-slate-900 border-r border-slate-300">
                {totalChallanQuantity.toLocaleString()}
              </td>
              <td className="px-2 text-right font-black text-blue-900 border-r border-slate-300">
                {totalReceiptQuantity.toLocaleString()}
              </td>
              <td className="px-2 text-right font-black text-rose-700 border-r border-slate-300">
                {totalNettoWeight.toFixed(3)}
              </td>
              <td colSpan={3} className="px-2 text-slate-500 text-[10px]">
                
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
