import React from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BATCH_CODES, GRADES, UNITS, CROPS } from './entryConstants';
import { IssueRouteType, MaterialIssueRowItem, SplitTotals } from './entryTypes';

interface MaterialIssueAllocationTableProps {
  issueRoute: IssueRouteType;
  items: MaterialIssueRowItem[];
  addRow: () => void;
  deleteRow: (idx: number) => void;
  deleteLastRow: () => void;
  updateRow: (idx: number, field: string, val: any) => void;
  splitTotals: SplitTotals;
}

export const MaterialIssueAllocationTable: React.FC<MaterialIssueAllocationTableProps> = ({
  issueRoute,
  items,
  addRow,
  deleteRow,
  deleteLastRow,
  updateRow,
  splitTotals
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <div className="bg-[#F7AFA8] border-b-4 border-[#D94B5A] px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 border border-white/20">
              <Layers className="h-4 w-4 text-white" />
            </div>

            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide">
                Material Issue Details
                {issueRoute === 'factory' && (
                  <span className="ml-1 text-green-200">
                    — Godown to Factory
                  </span>
                )}
              </h3>

              <p className="text-[9px] text-green-100 font-semibold uppercase tracking-[1.5px] mt-0.5">
                Material allocation &amp; issue entry
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 bg-white text-[#D94B5A] hover:bg-green-50 border border-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              Add Row
            </button>

            <button
              type="button"
              onClick={deleteLastRow}
              className="inline-flex items-center gap-1.5 bg-[#D94B5A] hover:bg-[#0b2d18] text-white border border-white/20 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          TABLE AREA
      ========================================================= */}
      <div className="overflow-x-auto bg-slate-50/50">
        <table className="w-full text-center border-collapse min-w-[1250px]">
          {/* =====================================================
              GODOWN HEADER
          ===================================================== */}
          {issueRoute === 'godown' && (
            <thead>
              <tr className="bg-[#D94B5A] text-white text-[10px] uppercase tracking-wide">
                <th className="py-3 px-2 border-r border-white/10 w-12">Srl</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Grade</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Marka</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Area</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Agency</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Crop Year</th>
                <th className="py-3 px-2 border-r border-white/10 w-16">Code</th>
                <th className="py-3 px-2 border-r border-white/10 w-24">Quantity</th>
                <th className="py-3 px-2 border-r border-white/10 w-24">Unit</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Weight (M.T)</th>
                <th className="py-3 px-2 text-left">Stack Position</th>
                <th className="py-3 px-2 w-12 colhide">&nbsp;</th>
              </tr>
            </thead>
          )}

          {/* =====================================================
              MILL HEADER
          ===================================================== */}
          {issueRoute === 'mill' && (
            <thead>
              <tr className="bg-[#D94B5A] text-white text-[10px] uppercase tracking-wide">
                <th className="py-3 px-2 border-r border-white/10 w-12">Srl</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Grade</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Marka</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Area</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Agency</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Crop Year</th>
                <th className="py-3 px-2 border-r border-white/10 w-16">Code</th>
                <th className="py-3 px-2 border-r border-white/10 w-24">Quantity</th>
                <th className="py-3 px-2 border-r border-white/10 w-24">Unit</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Weight (M.T)</th>
                <th className="py-3 px-2 border-r border-green-800 bg-[#D94B5A] w-28">Price / Rate</th>
                <th className="py-3 px-2 border-r border-green-800 bg-[#D94B5A] w-28">Total Amount</th>
                <th className="py-3 px-2 text-left">Buyer Destination</th>
                <th className="py-3 px-2 w-12 colhide">&nbsp;</th>
              </tr>
            </thead>
          )}

          {/* =====================================================
              FACTORY HEADER
          ===================================================== */}
          {issueRoute === 'factory' && (
            <thead>
              <tr className="bg-[#D94B5A] text-white text-[10px] uppercase tracking-wide">
                <th className="py-3 px-2 border-r border-white/10 w-12">Srl</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">I.TG No.</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Grade / Quality</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Area</th>
                <th className="py-3 px-2 border-r border-white/10 w-24">Quantity</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Unit</th>
                <th className="py-3 px-2 border-r border-white/10 w-28">Weight (M.Ton)</th>
                <th className="py-3 px-2 w-12 colhide">&nbsp;</th>
              </tr>
            </thead>
          )}

          {/* =====================================================
              TABLE BODY
          ===================================================== */}
          <tbody>
            {items.map((row, idx) => (
              <tr
                key={idx}
                className={cn(
                  "border-b border-slate-200 transition-all",
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/70",
                  "hover:bg-green-50/50"
                )}
              >
                {/* Serial */}
                <td className="py-2 px-2">
                  <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-green-50 text-[#D94B5A] text-[10px] font-black">
                    {idx + 1}
                  </div>
                </td>

                {/* FACTORY ROUTE */}
                {issueRoute === 'factory' ? (
                  <>
                    {/* I.TG No */}
                    <td className="px-1 py-1.5">
                      <input
                        id={`row_itg_no_${idx}`}
                        name={`row_itg_no_${idx}`}
                        aria-label="row itg no"
                        type="text"
                        value={row.itg_no || ''}
                        onChange={(e) => updateRow(idx, 'itg_no', e.target.value)}
                        className="w-full text-center px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs font-medium"
                      />
                    </td>

                    {/* Grade */}
                    <td className="px-1 py-1.5">
                      <select
                        id={`row_grade_name_${idx}`}
                        name={`row_grade_name_${idx}`}
                        aria-label="row grade name"
                        value={row.grade_name}
                        onChange={(e) => updateRow(idx, 'grade_name', e.target.value)}
                        className="w-full text-center px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs font-bold"
                      >
                        {GRADES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </td>

                    {/* Area */}
                    <td className="px-1 py-1.5">
                      <input
                        id={`row_area_${idx}`}
                        name={`row_area_${idx}`}
                        aria-label="row area"
                        type="text"
                        value={row.area || ''}
                        onChange={(e) => updateRow(idx, 'area', e.target.value)}
                        className="w-full text-center px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs"
                      />
                    </td>
                  </>
                ) : (
                  /* GODOWN / MILL ROUTE */
                  <>
                    {/* Grade */}
                    <td className="px-1 py-1.5">
                      <select
                        id={`row_grade_name_${idx}`}
                        name={`row_grade_name_${idx}`}
                        aria-label="row grade name"
                        value={row.grade_name}
                        onChange={(e) => updateRow(idx, 'grade_name', e.target.value)}
                        className="w-full text-center px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs font-bold"
                      >
                        {GRADES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </td>

                    {/* Marka */}
                    <td className="px-1 py-1.5">
                      <input
                        id={`row_marka_${idx}`}
                        name={`row_marka_${idx}`}
                        aria-label="row marka"
                        type="text"
                        value={row.marka || ''}
                        onChange={(e) => updateRow(idx, 'marka', e.target.value)}
                        className="w-full text-center px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs font-mono"
                      />
                    </td>

                    {/* Area */}
                    <td className="px-1 py-1.5">
                      <input
                        id={`row_area_${idx}`}
                        name={`row_area_${idx}`}
                        aria-label="row area"
                        type="text"
                        value={row.area || ''}
                        onChange={(e) => updateRow(idx, 'area', e.target.value)}
                        className="w-full text-center px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs"
                      />
                    </td>

                    {/* Agency */}
                    <td className="px-1 py-1.5">
                      <input
                        id={`row_agency_${idx}`}
                        name={`row_agency_${idx}`}
                        aria-label="row agency"
                        type="text"
                        value={row.agency || ''}
                        onChange={(e) => updateRow(idx, 'agency', e.target.value)}
                        className="w-full text-center px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs"
                      />
                    </td>

                    {/* Crop Year */}
                    <td className="px-1 py-1.5">
                      <select
                        id={`row_crop_${idx}`}
                        name={`row_crop_${idx}`}
                        aria-label="row crop"
                        value={row.crop}
                        onChange={(e) => updateRow(idx, 'crop', e.target.value)}
                        className="w-full text-center px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs"
                      >
                        {CROPS.map(cr => (
                          <option key={cr} value={cr}>{cr}</option>
                        ))}
                      </select>
                    </td>

                    {/* Code */}
                    <td className="px-1 py-1.5">
                      <select
                        id={`row_code_${idx}`}
                        name={`row_code_${idx}`}
                        aria-label="row code"
                        value={row.code}
                        onChange={(e) => updateRow(idx, 'code', e.target.value)}
                        className="w-full text-center px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs font-bold text-[#D94B5A]"
                      >
                        <option value=""></option>
                        {row.code && !BATCH_CODES[row.code] && (
                          <option value={row.code}>{row.code}</option>
                        )}
                        {Object.keys(BATCH_CODES).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                  </>
                )}

                {/* QUANTITY */}
                <td className="px-1 py-1.5">
                  <input
                    id={`row_qty_${idx}`}
                    name={`row_qty_${idx}`}
                    aria-label="row qty"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={row.qty || ''}
                    onChange={(e) => updateRow(idx, 'qty', parseFloat(e.target.value) || 0)}
                    className="w-full text-right px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs font-black text-[#D94B5A]"
                  />
                </td>

                {/* UNIT */}
                <td className="px-1 py-1.5">
                  <select
                    id={`row_unit_${idx}`}
                    name={`row_unit_${idx}`}
                    aria-label="row unit"
                    value={row.unit}
                    onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                    className="w-full text-center px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs font-bold"
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </td>

                {/* WEIGHT */}
                <td className="px-1 py-1.5">
                  <input
                    id={`row_weight_${idx}`}
                    name={`row_weight_${idx}`}
                    aria-label="row weight"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    value={row.weight_kgs ? row.weight_kgs / 1000 : ''}
                    onChange={(e) => updateRow(idx, 'weight_kgs', (parseFloat(e.target.value) || 0) * 1000)}
                    className="w-full text-right px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs font-black"
                  />
                </td>

                {/* MILL PRICE & AMOUNT */}
                {issueRoute === 'mill' && (
                  <>
                    <td className="px-1 py-1.5 bg-green-50/50">
                      <input
                        id={`row_rate_${idx}`}
                        name={`row_rate_${idx}`}
                        aria-label="row rate"
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={row.rate || ''}
                        onChange={(e) => updateRow(idx, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full text-right px-2 py-1.5 rounded-md border border-green-200 bg-white focus:border-[#F7AFA8] outline-none text-xs font-bold text-[#D94B5A] font-mono"
                      />
                    </td>

                    <td className="px-2 text-right font-mono font-bold text-[#D94B5A] bg-green-50/50 text-xs">
                      {row.qty && row.rate
                        ? (row.qty * row.rate).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })
                        : '0.00'}
                    </td>
                  </>
                )}

                {/* PLACE / DESTINATION */}
                {issueRoute !== 'factory' && (
                  <td className="px-1 py-1.5">
                    <input
                      id={`row_place_${idx}`}
                      name={`row_place_${idx}`}
                      aria-label="Stack / section ref"
                      type="text"
                      placeholder="Stack / section ref"
                      value={row.place || row.location_dest || ''}
                      onChange={(e) => {
                        updateRow(idx, 'place', e.target.value);
                        updateRow(idx, 'location_dest', e.target.value);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-md border border-transparent bg-transparent hover:border-slate-200 focus:bg-white focus:border-[#F7AFA8] outline-none text-xs font-medium"
                    />
                  </td>
                )}

                {/* DELETE ROW */}
                <td className="colhide px-2">
                  <button
                    type="button"
                    title="Delete Row"
                    onClick={() => deleteRow(idx)}
                    className="flex h-7 w-7 items-center justify-center mx-auto rounded-md text-slate-400 hover:text-white hover:bg-rose-600 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          {/* =====================================================
              FOOTER TOTALS
          ===================================================== */}
          <tfoot>
            {/* TOTAL BALES */}
            <tr className="bg-green-50 border-t-2 border-[#F7AFA8] text-[#D94B5A]">
              <td
                className="py-3 px-3 text-right font-black uppercase text-[10px]"
                colSpan={issueRoute === 'factory' ? 4 : 7}
              >
                Total Bales Issued
              </td>

              <td className="text-right px-2 font-mono text-sm font-black">
                {splitTotals.balesQ}
              </td>

              <td className="text-[10px] font-black uppercase">
                BALES
              </td>

              <td className="text-right px-2 font-mono text-sm font-black">
                {splitTotals.balesW.toFixed(3)}
              </td>

              {issueRoute === 'mill' ? (
                <>
                  <td className="text-right px-2 font-mono font-bold text-slate-400">
                    &mdash;
                  </td>
                  <td className="text-right px-2 font-mono font-bold text-[#D94B5A]">
                    {items
                      .filter(it => (it.unit || 'BALES').toUpperCase() === 'BALES')
                      .reduce((sum, it) => sum + ((parseFloat(String(it.qty)) || 0) * (parseFloat(String(it.rate)) || 0)), 0)
                      .toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                  </td>
                  <td colSpan={2} className="colhide" />
                </>
              ) : (
                <td className="colhide" />
              )}
            </tr>

            {/* GRAND TOTAL */}
            <tr className="bg-[#D94B5A] text-white">
              <td
                className="py-3 px-3 text-right font-black uppercase text-[11px]"
                colSpan={issueRoute === 'factory' ? 4 : 7}
              >
                Grand Total
              </td>

              <td className="text-right px-2 font-mono text-sm font-black">
                {splitTotals.grandQ}
              </td>

              <td className="font-bold">
                &mdash;
              </td>

              <td className="text-right px-2 font-mono text-sm font-black">
                {splitTotals.grandW.toFixed(3)}
              </td>

              {issueRoute === 'mill' ? (
                <>
                  <td className="text-right px-2 font-mono font-bold text-green-100">
                    &mdash;
                  </td>
                  <td className="text-right px-2 font-mono font-black text-green-200">
                    ₹{splitTotals.grandAmount.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td colSpan={2} className="colhide" />
                </>
              ) : (
                <td className="colhide" />
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* =========================================================
          BOTTOM ACTION BAR
      ========================================================= */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-green-50 flex items-center justify-center">
              <Plus className="h-3.5 w-3.5 text-[#D94B5A]" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-wide">
                Allocation Rows
              </p>
              <p className="text-[9px] text-slate-400 font-medium">
                Add or remove material issue lines as required.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-wide shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              Add Row
            </button>

            <button
              type="button"
              onClick={deleteLastRow}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-wide transition-all cursor-pointer active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Row
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
