import React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ArrivalDetailRow } from '../../types';

export interface TemporaryArrivalGridProps {
  details: ArrivalDetailRow[];
  unitName?: string;
  grades: any[];
  agencies: any[];
  markas: any[];
  formDataArea?: string;
  onAddRow: () => void;
  onDeleteRow: () => void;
  onDeleteRowAt?: (index: number) => void;
  onDetailChange: (index: number, field: keyof ArrivalDetailRow, value: any) => void;
}

export const TemporaryArrivalGrid: React.FC<TemporaryArrivalGridProps> = ({
  details,
  unitName,
  grades,
  agencies,
  markas,
  formDataArea,
  onAddRow,
  onDeleteRow,
  onDeleteRowAt,
  onDetailChange
}) => {
  const [focusedNettoIdx, setFocusedNettoIdx] = React.useState<number | null>(null);
  const [editingNettoVal, setEditingNettoVal] = React.useState<string>('');

  const formatThreeDecimals = (val: any): string => {
    const num = Number(val);
    if (val === '' || val === null || val === undefined || isNaN(num)) return '0.000';
    return num.toFixed(3);
  };

  return (
    <div className="w-full rounded-xl border border-[#F7AFA8] bg-white shadow-md overflow-hidden mt-5">
      {/* Header */}
      <div className="bg-[#D94B5A] text-white px-4 py-2 flex items-center justify-between border-b border-[#FBCFCB]">
        <h3 className="text-sm font-bold tracking-wide uppercase">
          Arrival Item Details
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAddRow}
            className="bg-[#FBCFCB] hover:bg-[#D94B5A] text-white font-bold px-2.5 py-0.5 text-[10px] rounded flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs border border-[#FDE7E6]/40"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto">
        <table className="w-full table-fixed min-w-[950px] border-collapse text-left text-[11px] font-sans">
          <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
            <tr className="bg-slate-800 text-white font-bold uppercase text-[9px]/tight text-center">
              <th className="p-1 border border-gray-400 w-10 shrink-0" rowSpan={2}>Srl</th>
              <th className="p-1 border border-gray-400 text-center w-52" colSpan={2}>Receipt Grade</th>
              <th className="p-1 border border-gray-400 w-24" rowSpan={2}>Crop Year</th>
              <th className="p-1 border border-gray-400 w-28" rowSpan={2}>Challan Grade</th>
              <th className="p-1 border border-gray-400 text-center w-48" colSpan={2}>Agency</th>
              <th className="p-1 border border-gray-400 text-center w-48" colSpan={2}>Challan Marka</th>
              <th className="p-1 border border-gray-400 w-24" rowSpan={2}>Netto (M.T)</th>
              <th className="p-1 border border-gray-400 w-32" colSpan={2}>Quantity</th>
              <th className="p-1 border border-gray-400 w-36" rowSpan={2}>Remarks</th>
              <th className="p-1 border border-gray-400 w-20 text-center" rowSpan={2}>Action</th>
            </tr>
            <tr className="bg-slate-200 text-black font-extrabold text-[8px] text-center border-b border-gray-400">
              <th className="p-0.5 border border-gray-400 w-16">Code</th>
              <th className="p-0.5 border border-gray-400 w-36">Name</th>
              <th className="p-0.5 border border-gray-400 w-14">Code</th>
              <th className="p-0.5 border border-gray-400 w-34">Name</th>
              <th className="p-0.5 border border-gray-400 w-14">Code</th>
              <th className="p-0.5 border border-gray-400 w-34">Name</th>
              <th className="p-0.5 border border-gray-400 w-16">Chln</th>
              <th className="p-0.5 border border-gray-400 w-16">Rcpt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {details.map((detail, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors h-7 text-[10.5px]">
                {/* Srl */}
                <td className="p-1 text-center font-bold text-gray-900 border border-gray-300 bg-slate-100 w-10">
                  {detail.srl_no}
                </td>

                {/* Receipt Grade Code */}
                <td className="p-0.5 border border-gray-300 w-16 bg-white text-center">
                  <input
                    type="text"
                    value={detail.receipt_grade_code || ''}
                    onChange={(e) => onDetailChange(idx, 'receipt_grade_code', e.target.value)}
                    placeholder="Code"
                    className="w-full bg-white text-center font-bold text-gray-900 outline-none uppercase font-mono h-6 border-0 focus:border-blue-500"
                  />
                </td>

                {/* Receipt Grade Name */}
                <td className="p-0.5 border border-gray-300 w-36">
                  <input
                    list={`grade-list-${idx}`}
                    type="text"
                    value={detail.receipt_grade_name || ''}
                    onChange={(e) => onDetailChange(idx, 'receipt_grade_name', e.target.value)}
                    placeholder="Select Grade"
                    className="w-full h-6 px-1 bg-white border border-gray-300 text-left font-bold text-gray-900 text-xs uppercase outline-none focus:border-blue-500"
                  />

                  <datalist id={`grade-list-${idx}`}>
                    {grades
                      .slice()
                      .filter((g, index, arr) =>
                        arr.findIndex(
                          item =>
                            (item.grade_name || '').trim().toLowerCase() ===
                            (g.grade_name || '').trim().toLowerCase()
                        ) === index
                      )
                      .sort((a, b) =>
                        (a.grade_name || '').localeCompare(b.grade_name || '')
                      )
                      .map(g => (
                        <option
                          key={g.id || g.grade_code || g.grade_name}
                          value={g.grade_name || g.grade_code}
                        />
                      ))}
                  </datalist>
                </td>

                {/* Crop Year */}
                <td className="p-0.5 border border-gray-300 w-24">
                  <select
                    value={detail.crop_year || '2026-27'}
                    onChange={(e) => onDetailChange(idx, 'crop_year', e.target.value)}
                    className="w-full bg-white border border-gray-300 p-0 text-center font-bold text-gray-900 outline-none h-6 text-xs font-semibold"
                  >
                    {detail.crop_year && !['2026-27', '2025-26', '2024-25', '2027-28', '2028-29'].includes(detail.crop_year) && (
                      <option value={detail.crop_year}>{detail.crop_year}</option>
                    )}
                    <option value="2026-27">2026-27</option>
                    <option value="2025-26">2025-26</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2027-28">2027-28</option>
                    <option value="2028-29">2028-29</option>
                  </select>
                </td>

                {/* Challan Grade Name */}
                <td className="p-0.5 border border-gray-300 w-28">
                  <input
                    type="text"
                    value={detail.challan_grade_name}
                    onChange={(e) => onDetailChange(idx, 'challan_grade_name', e.target.value)}
                    className="w-full bg-transparent border-0 p-0 outline-none px-1"
                  />
                </td>

                {/* Agency Code */}
                <td className="p-0.5 border border-gray-300 w-14 bg-white text-center">
                  <input
                    type="text"
                    value={detail.agency_code || ''}
                    onChange={(e) => onDetailChange(idx, 'agency_code', e.target.value)}
                    placeholder="--"
                    className="w-full bg-white text-center font-bold text-gray-800 outline-none uppercase font-mono border-0 h-6"
                  />
                </td>

                {/* Agency Name */}
                <td className="p-0.5 border border-gray-300 w-34">
                  <input
                    list="agencies_list"
                    placeholder={
                      !formDataArea || !formDataArea.trim()
                        ? "Select Area First"
                        : agencies.length === 0
                        ? "No Agency Found for Selected Area"
                        : "Type/Select Agency..."
                    }
                    disabled={!formDataArea || !formDataArea.trim() || agencies.length === 0}
                    value={detail.agency_name || ''}
                    onChange={(e) => onDetailChange(idx, 'agency_name', e.target.value)}
                    className="w-full bg-white text-left font-bold text-gray-900 outline-none px-1 h-6 uppercase font-mono border-0 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </td>

                {/* Challan Marka Code */}
                <td className="p-0.5 border border-gray-300 w-14 bg-white text-center">
                  <input
                    type="text"
                    value={detail.challan_marka_code || ''}
                    onChange={(e) => onDetailChange(idx, 'challan_marka_code', e.target.value)}
                    placeholder="--"
                    className="w-full bg-white text-center font-bold text-gray-800 outline-none uppercase font-mono h-6 border-0"
                  />
                </td>

                {/* Challan Marka Name */}
                <td className="p-0.5 border border-gray-300 w-34">
                  <input
                    list="markas_list"
                    placeholder="Type/Select Marka..."
                    value={detail.challan_marka_name || ''}
                    onChange={(e) => onDetailChange(idx, 'challan_marka_name', e.target.value)}
                    className="w-full bg-white text-left font-bold text-gray-900 outline-none px-1 h-6 uppercase font-mono border-0"
                  />
                </td>

                {/* Netto Pnto */}
                <td className="p-0.5 border border-gray-300 w-24">
                  {(() => {
                    const rowUnit = (detail.unit || unitName || 'BALES').toString().trim().toUpperCase();
                    const isBales = rowUnit === 'BALES' || rowUnit.includes('BALE') || rowUnit === 'DRUMS' || rowUnit.includes('DRUM');
                    const isFocused = !isBales && focusedNettoIdx === idx;
                    const displayVal = isFocused ? editingNettoVal : formatThreeDecimals(detail.netto_pnto);
                    return (
                      <input
                        id={`netto_pnto_main_${idx}`}
                        name={`netto_pnto_main_${idx}`}
                        aria-label="Netto M.T"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.000"
                        readOnly={isBales}
                        value={displayVal}
                        onFocus={(e) => {
                          if (!isBales) {
                            setFocusedNettoIdx(idx);
                            const num = Number(detail.netto_pnto);
                            setEditingNettoVal(!isNaN(num) && num > 0 ? num.toFixed(3) : '');
                            setTimeout(() => e.target.select(), 0);
                          }
                        }}
                        onChange={(e) => {
                          if (!isBales) {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
                              setEditingNettoVal(val);
                              onDetailChange(idx, 'netto_pnto', val === '' ? 0 : Number(val));
                            }
                          }
                        }}
                        onBlur={() => {
                          if (!isBales) {
                            const parsed = parseFloat(editingNettoVal);
                            const finalNum = !isNaN(parsed) && parsed > 0 ? Number(parsed.toFixed(3)) : 0;
                            onDetailChange(idx, 'netto_pnto', finalNum);
                            setFocusedNettoIdx(null);
                          }
                        }}
                        title={isBales ? "Auto-calculated: (RCPT / Total RCPT) * Final Weight" : "Enter Netto Weight"}
                        className={cn(
                          "w-full p-0 text-right font-bold font-mono outline-none pr-1 transition-colors",
                          isBales
                            ? "bg-amber-50/90 border border-amber-300 text-amber-950 cursor-not-allowed"
                            : "bg-white border border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        )}
                      />
                    );
                  })()}
                </td>

                {/* Quantity Chln */}
                <td className="p-0.5 border border-gray-300 w-16">
                  <input
                    type="number"
                    step="1"
                    placeholder="0"
                    value={detail.quantity_chln !== undefined && detail.quantity_chln !== null ? detail.quantity_chln : 0}
                    onChange={(e) => {
                      const val = e.target.value;
                      onDetailChange(idx, 'quantity_chln', val === '' ? 0 : Number(val));
                    }}
                    className="w-full bg-white border border-blue-200 p-0 text-center font-bold text-blue-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </td>

                {/* Quantity Rcpt */}
                <td className="p-0.5 border border-gray-300 w-16">
                  <input
                    type="number"
                    step="1"
                    placeholder="0"
                    value={detail.quantity_rcpt !== undefined && detail.quantity_rcpt !== null ? detail.quantity_rcpt : 0}
                    onChange={(e) => {
                      const val = e.target.value;
                      onDetailChange(idx, 'quantity_rcpt', val === '' ? 0 : Number(val));
                    }}
                    className="w-full bg-white border border-indigo-200 p-0 text-center font-bold text-indigo-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </td>

                {/* Remarks */}
                <td className="p-0.5 border border-gray-300 w-36">
                  <input
                    type="text"
                    value={detail.remarks}
                    onChange={(e) => onDetailChange(idx, 'remarks', e.target.value)}
                    className="w-full bg-transparent border-0 p-0 text-left outline-none px-1"
                  />
                </td>

                {/* Individual Row Delete Button */}
                <td className="p-0.5 border border-gray-300 text-center w-20 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => onDeleteRowAt ? onDeleteRowAt(idx) : onDeleteRow()}
                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[9.5px] font-bold rounded transition-all cursor-pointer border border-rose-700 shadow-2xs active:scale-95 inline-flex items-center gap-1 justify-center"
                    title={`Delete Row ${detail.srl_no}`}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </td>
              </tr>
            ))}
            <tr className="h-9 bg-slate-100 font-bold border-t-2 border-slate-300">
              <td
                colSpan={9}
                className="text-right px-3 uppercase text-[11px] font-black text-slate-700 border-r border-slate-300"
              >
                Summary Totals:
              </td>
              <td className="px-2 text-right font-black text-slate-900 border-r border-slate-300 bg-emerald-100">
                {details
                  .reduce((sum, detail) => sum + (Number(detail.netto_pnto) || 0), 0)
                  .toFixed(3)}
              </td>
              <td className="px-2 text-right font-black text-blue-900 border-r border-slate-300 bg-blue-100">
                {details
                  .reduce((sum, detail) => sum + (Number(detail.quantity_chln) || 0), 0)
                  .toLocaleString('en-IN')}
              </td>
              <td className="px-2 text-right font-black text-rose-700 border-r border-slate-300">
              </td>
              <td colSpan={2} className="px-2 text-slate-500 text-[10px]">
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <datalist id="agencies_list">
        {agencies.map((a, aIdx) => {
          const agName = a.agency_name || a.AGENCY_NAME || a.name || '';
          const agCode = a.agency_code || a.AGENCY_CODE || a.code || '';
          return (
            <option key={a.id || `${agCode}_${aIdx}`} value={agName}>
              {agCode ? `Code: ${agCode}` : ''}
            </option>
          );
        })}
      </datalist>

      <datalist id="markas_list">
        {markas.map((m, mIdx) => (
          <option key={m.id || m.marka_code || mIdx} value={m.marka_name || m.name || m.mark_name} />
        ))}
      </datalist>
    </div>
  );
};
