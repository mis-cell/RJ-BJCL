import React from 'react';
import { 
  Calendar, 
  Info, 
  Search, 
  Box, 
  Printer 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import LegacyLayout, { LegacyFieldset } from '../LegacyLayout';
import PrintModal from '../PrintModal';
import { DEFAULT_GODOWNS, GodownMasterItem, GradeMasterItem, AreaMasterItem, UnitMasterItem } from '../../utils/stockSummaryConstants';

export interface StockFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockSubTab: 'opening' | 'closing';
  isEditing: boolean;
  loading: boolean;
  // Opening Form State & Handlers
  formState: any;
  setFormState: React.Dispatch<React.SetStateAction<any>>;
  handleSubmit: (e: React.FormEvent) => void;
  // Closing Form State & Handlers
  closingFormState: any;
  setClosingFormState: React.Dispatch<React.SetStateAction<any>>;
  handleClosingSubmit: (e: React.FormEvent) => void;
  handleClosingFieldChange: (field: string, value: any) => void;
  showCustomGradeClosing: boolean;
  setShowCustomGradeClosing: (show: boolean) => void;
  customGradeValueClosing: string;
  setCustomGradeValueClosing: (val: string) => void;
  // Merged Dropdown Lists
  mergedGodowns: GodownMasterItem[];
  mergedAreas: AreaMasterItem[];
  mergedGrades: GradeMasterItem[];
  mergedUnits: UnitMasterItem[];
}

export const StockFormModal: React.FC<StockFormModalProps> = ({
  isOpen,
  onClose,
  stockSubTab,
  isEditing,
  loading,
  formState,
  setFormState,
  handleSubmit,
  closingFormState,
  setClosingFormState,
  handleClosingSubmit,
  handleClosingFieldChange,
  showCustomGradeClosing,
  setShowCustomGradeClosing,
  customGradeValueClosing,
  setCustomGradeValueClosing,
  mergedGodowns,
  mergedAreas,
  mergedGrades,
  mergedUnits
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FBCFCB] border-2 border-white shadow-[4px_4px_16px_rgba(0,0,0,0.45),inset_1.5px_1.5px_0px_white] w-full max-w-lg flex flex-col rounded shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        
        {/* Old School Windows Titlebar */}
        <div className="bg-[#D94B5A] text-white px-4 py-2 flex items-center justify-between border-b border-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider font-sans">
              {isEditing ? 'Modify Stock Ledger Entry' : 'Add New Store Ledger Row'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-6 w-6 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm font-bold transition-all duration-150 cursor-pointer active:scale-95"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 bg-legacy-bg flex-1 overflow-y-auto max-h-[80vh]">
          {stockSubTab === 'opening' ? (
            /* Opening Stock Input Form elements */
            <LegacyFieldset legend={isEditing ? "🔧 UPDATE OPENING STOCK" : "➕ ADD NEW OPENING RECORD"}>
              <form
                onSubmit={handleSubmit}
                className="space-y-3 font-semibold text-slate-800 text-xs"
              >
                {/* Opening Date */}
                <div>
                  <label
                    htmlFor="formstate_opening_date_2326"
                    className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                  >
                    Opening Date *
                  </label>

                  <div className="flex overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-[#F7AFA8] focus-within:ring-1 focus-within:ring-[#F7AFA8]/20">
                    <div className="px-2.5 bg-slate-50 flex items-center border-r border-slate-200">
                      <Calendar className="h-3.5 w-3.5 text-[#D94B5A]" />
                    </div>

                    <input
                      id="formstate_opening_date_2326"
                      name="formstate_opening_date"
                      aria-label="formstate opening date"
                      type="date"
                      required
                      value={formState.opening_date}
                      onChange={(e) =>
                        setFormState((p: any) => ({
                          ...p,
                          opening_date: e.target.value,
                        }))
                      }
                      className="flex-1 px-2.5 py-2 bg-white outline-none font-bold text-xs text-slate-700"
                    />
                  </div>
                </div>

                {/* Godown */}
                <div>
                  <label
                    htmlFor="godown_2341"
                    className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                  >
                    Godown *
                  </label>

                  <input
                    id="godown_2341"
                    name="godown"
                    aria-label="Godown *"
                    type="text"
                    required
                    list="godown_op_datalist"
                    value={formState.godown}
                    onChange={(e) =>
                      setFormState((p: any) => ({
                        ...p,
                        godown: e.target.value,
                      }))
                    }
                    placeholder="Select or Type Godown..."
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none uppercase font-mono shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                  />

                  <datalist id="godown_op_datalist">
                    {mergedGodowns.map((g, i) => (
                      <option key={i} value={g.gdn_name} />
                    ))}
                  </datalist>
                </div>

                {/* Area Station */}
                <div>
                  <label
                    htmlFor="area_station_2362"
                    className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                  >
                    Area Station *
                  </label>

                  <input
                    id="area_station_2362"
                    name="area_station"
                    aria-label="Area Station *"
                    type="text"
                    required
                    list="area_op_datalist"
                    value={formState.area}
                    onChange={(e) =>
                      setFormState((p: any) => ({
                        ...p,
                        area: e.target.value,
                      }))
                    }
                    placeholder="Select or Type Area..."
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none uppercase font-mono shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                  />

                  <datalist id="area_op_datalist">
                    {mergedAreas.map((a: any, i: number) => {
                      const aName = a.area_name || a.name || "";
                      return <option key={i} value={aName} />;
                    })}
                  </datalist>
                </div>

                {/* Component Grade */}
                <div>
                  <label
                    htmlFor="component_grade_2384"
                    className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                  >
                    Component Grade *
                  </label>

                  <input
                    id="component_grade_2384"
                    name="component_grade"
                    aria-label="Component Grade *"
                    type="text"
                    required
                    list="grade_op_datalist"
                    value={formState.grade}
                    onChange={(e) =>
                      setFormState((p: any) => ({
                        ...p,
                        grade: e.target.value,
                      }))
                    }
                    placeholder="Select or Type Grade..."
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none uppercase font-mono shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                  />

                  <datalist id="grade_op_datalist">
                    {mergedGrades.map((g: any, i: number) => {
                      const gName = g.grade_name || g.name || g.code || "";
                      return <option key={i} value={gName} />;
                    })}
                  </datalist>
                </div>

                {/* JCI Status */}
                <div>
                  <label
                    htmlFor="is_j_c_i_govt_supplied_2406"
                    className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                  >
                    Is J.C.I Govt Supplied? *
                  </label>

                  <select
                    id="is_j_c_i_govt_supplied_2406"
                    name="is_j_c_i_govt_supplied"
                    aria-label="Is J.C.I Govt Supplied? *"
                    required
                    value={formState.jci}
                    onChange={(e) =>
                      setFormState((p: any) => ({
                        ...p,
                        jci: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20 cursor-pointer"
                  >
                    <option value="No">No - Private/Regular Commercial</option>
                    <option value="Yes">Yes - Government JCI</option>
                  </select>
                </div>

                {/* Unit & Quantity */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Unit */}
                  <div>
                    <label
                      htmlFor="unit_master_2423"
                      className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                    >
                      Unit Master *
                    </label>

                    <select
                      id="unit_master_2423"
                      name="unit_master"
                      aria-label="Unit Master *"
                      required
                      value={formState.unit}
                      onChange={(e) =>
                        setFormState((p: any) => ({
                          ...p,
                          unit: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20 uppercase cursor-pointer"
                    >
                      <option value="">-- SELECT UNIT --</option>
                      {mergedUnits.map((u, i) => (
                        <option key={i} value={u.unit_name}>
                          {u.unit_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label
                      htmlFor="quantity_2440"
                      className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                    >
                      Quantity *
                    </label>

                    <input
                      id="quantity_2440"
                      name="quantity"
                      aria-label="Quantity *"
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="0.000"
                      value={formState.quantity}
                      onChange={(e) => {
                        const q = e.target.value;
                        const w = formState.weight;
                        const avg = Number(q) > 0 ? (Number(w) / Number(q)).toFixed(4) : "0.0000";
                        setFormState((p: any) => ({
                          ...p,
                          quantity: q,
                          avg_weight: avg,
                        }));
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none font-mono shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                    />
                  </div>
                </div>

                {/* Weight & Average */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="weight_qtl_2464"
                      className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                    >
                      Weight (Qtl) *
                    </label>

                    <input
                      id="weight_qtl_2464"
                      name="weight_qtl"
                      aria-label="Weight (Qtl) *"
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="0.000"
                      value={formState.weight}
                      onChange={(e) => {
                        const w = e.target.value;
                        const q = formState.quantity;
                        const avg = Number(q) > 0 ? (Number(w) / Number(q)).toFixed(4) : "0.0000";
                        setFormState((p: any) => ({
                          ...p,
                          weight: w,
                          avg_weight: avg,
                        }));
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none font-mono shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="formstate_avg_weight_2484"
                      className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                    >
                      Avg Wt (Qtl/Unit)
                    </label>

                    <input
                      id="formstate_avg_weight_2484"
                      name="formstate_avg_weight"
                      aria-label="formstate avg weight"
                      type="text"
                      disabled
                      value={formState.avg_weight || "0.0000"}
                      className="w-full rounded-md border border-slate-200 bg-slate-100 px-2.5 py-2 font-bold text-xs text-slate-500 outline-none font-mono cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-black text-[10px] uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-md bg-[#F7AFA8] hover:bg-[#D94B5A] border border-[#F7AFA8] text-white font-black uppercase text-[10px] tracking-wider shadow-sm transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Saving..." : "💾 Save Record"}
                  </button>
                </div>
              </form>
            </LegacyFieldset>
          ) : (
            /* Closing Stock Input Form elements */
            <LegacyFieldset legend={isEditing ? "🔧 UPDATE CLOSING INVENTORY" : "➕ RECORD CLOSING STOCK"}>
              <form
                onSubmit={handleClosingSubmit}
                className="space-y-3 font-semibold text-slate-800 text-xs"
              >
                {/* Stock Date */}
                <div>
                  <label
                    htmlFor="closingformstate_stock_da_2535"
                    className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                  >
                    Opening Stock Audit Date *
                  </label>

                  <div className="flex overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-[#F7AFA8] focus-within:ring-1 focus-within:ring-[#F7AFA8]/20">
                    <div className="px-2.5 bg-slate-50 flex items-center border-r border-slate-200">
                      <Calendar className="h-3.5 w-3.5 text-[#D94B5A]" />
                    </div>

                    <input
                      id="closingformstate_stock_da_2535"
                      name="closingformstate_stock_da"
                      aria-label="closingformstate stock da"
                      type="date"
                      required
                      value={closingFormState.stock_date}
                      onChange={(e) =>
                        setClosingFormState((p: any) => ({
                          ...p,
                          stock_date: e.target.value,
                        }))
                      }
                      className="flex-1 px-2.5 py-2 bg-white outline-none font-bold text-xs text-slate-700"
                    />
                  </div>
                </div>

                {/* Godown Location */}
                <div>
                  <label
                    htmlFor="godown_location_2550"
                    className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                  >
                    Godown Location *
                  </label>

                  <select
                    id="godown_location_2550"
                    name="godown_location"
                    aria-label="Godown Location *"
                    required
                    value={closingFormState.godown}
                    onChange={(e) =>
                      setClosingFormState((p: any) => ({
                        ...p,
                        godown: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20 cursor-pointer"
                  >
                    <option value="">-- SELECT STORAGE LOCATION --</option>
                    {mergedGodowns.map((g, i) => (
                      <option key={i} value={g.gdn_name}>
                        {g.gdn_name} {g.gdn_code ? `[${g.gdn_code}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Commodity & Variety */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="commodity_2571"
                      className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                    >
                      Commodity *
                    </label>

                    <input
                      id="commodity_2571"
                      name="commodity"
                      aria-label="Commodity *"
                      type="text"
                      required
                      value={closingFormState.commodity}
                      onChange={(e) =>
                        setClosingFormState((p: any) => ({
                          ...p,
                          commodity: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="variety_2583"
                      className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                    >
                      Variety
                    </label>

                    <input
                      id="variety_2583"
                      name="variety"
                      aria-label="Variety"
                      type="text"
                      value={closingFormState.variety}
                      onChange={(e) =>
                        setClosingFormState((p: any) => ({
                          ...p,
                          variety: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none uppercase shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                      placeholder="e.g. TOSSA"
                    />
                  </div>
                </div>

                {/* Quality Grade */}
                <div>
                  <label
                    htmlFor="quality_grade_rating_2598"
                    className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                  >
                    Quality Grade Rating *
                  </label>

                  <select
                    id="quality_grade_rating_2598"
                    name="quality_grade_rating"
                    aria-label="Quality Grade Rating *"
                    required
                    value={closingFormState.grade}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClosingFormState((p: any) => ({
                        ...p,
                        grade: val,
                      }));

                      if (val === "CUSTOM_MANUAL") {
                        setShowCustomGradeClosing(true);
                      } else {
                        setShowCustomGradeClosing(false);
                        setCustomGradeValueClosing("");
                      }
                    }}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20 cursor-pointer"
                  >
                    <option value="">-- SELECT GRADE --</option>
                    {mergedGrades.map((g: any, i: number) => {
                      const gName = g.grade_name || g.name || g.code || "";
                      return (
                        <option key={i} value={gName}>
                          {gName}
                        </option>
                      );
                    })}
                    <option value="CUSTOM_MANUAL">✍ WRITE CUSTOM SYSTEM GRADE</option>
                  </select>

                  {/* Custom Grade */}
                  {showCustomGradeClosing && (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-1.5">
                      <div className="text-[8px] font-black uppercase tracking-wider text-amber-700 mb-1">
                        Custom Grade
                      </div>

                      <input
                        id="type_custom_jute_grade_na_2624"
                        name="type_custom_jute_grade_na"
                        aria-label="Type custom Jute Grade name..."
                        type="text"
                        required
                        placeholder="Type custom Jute Grade name..."
                        value={customGradeValueClosing}
                        onChange={(e) => setCustomGradeValueClosing(e.target.value)}
                        className="w-full rounded-md border border-amber-300 bg-white px-2 py-2 text-xs font-bold outline-none uppercase text-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                      />
                    </div>
                  )}
                </div>

                {/* Physical Bales & Weight */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="no_of_bales_2641"
                      className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                    >
                      No. of Bales *
                    </label>

                    <input
                      id="no_of_bales_2641"
                      name="no_of_bales"
                      aria-label="No. of Bales *"
                      type="number"
                      required
                      min="0"
                      value={closingFormState.no_of_bales}
                      onChange={(e) => handleClosingFieldChange("no_of_bales", e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none font-mono shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="net_weight_qtl_2655"
                      className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                    >
                      Net Weight (Qtl) *
                    </label>

                    <input
                      id="net_weight_qtl_2655"
                      name="net_weight_qtl"
                      aria-label="Net Weight (Qtl) *"
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={closingFormState.weight_qtl}
                      onChange={(e) => handleClosingFieldChange("weight_qtl", e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none font-mono shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Rate & Asset Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="rate_per_qtl_2674"
                      className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                    >
                      Rate per Qtl *
                    </label>

                    <input
                      id="rate_per_qtl_2674"
                      name="rate_per_qtl"
                      aria-label="Rate per Qtl *"
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={closingFormState.rate_per_qtl}
                      onChange={(e) => handleClosingFieldChange("rate_per_qtl", e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-bold text-xs text-slate-700 outline-none font-mono shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                      placeholder="6500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="asset_book_value_rs_2689"
                      className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                    >
                      Asset Book Value (Rs.)
                    </label>

                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-700 font-black text-[10px]">
                        ₹
                      </span>

                      <input
                        id="asset_book_value_rs_2689"
                        name="asset_book_value_rs"
                        aria-label="Asset Book Value (Rs.)"
                        type="text"
                        disabled
                        value={Number(closingFormState.total_value).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                          }
                        )}
                        className="w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 pl-7 py-2 font-black text-xs outline-none text-right font-mono text-emerald-800 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label
                    htmlFor="remarks_storage_quality_n_2703"
                    className="block mb-1 font-black text-[#D94B5A] uppercase tracking-wider text-[9px]"
                  >
                    Remarks / Storage Quality Notes
                  </label>

                  <input
                    id="remarks_storage_quality_n_2703"
                    name="remarks_storage_quality_n"
                    aria-label="Remarks / Storage quality notes"
                    type="text"
                    value={closingFormState.remarks}
                    onChange={(e) =>
                      setClosingFormState((p: any) => ({
                        ...p,
                        remarks: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 outline-none shadow-sm focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
                    placeholder="e.g. Wet stack audits completed alright."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-black text-[10px] uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-md bg-[#F7AFA8] hover:bg-[#D94B5A] border border-[#F7AFA8] text-white font-black uppercase text-[10px] tracking-wider shadow-sm transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Creating..." : "💾 Register Closing"}
                  </button>
                </div>
              </form>
            </LegacyFieldset>
          )}
        </div>
      </div>
    </div>
  );
};

export const StockOpeningPrintModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  printData: any;
}> = ({ isOpen, onClose, printData }) => {
  return (
    <PrintModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="RETRO OPENING STOCK LEDGER CERTIFICATE"
    >
      {printData && (
        <div className="p-4 bg-[#a0a0a0] flex justify-center overflow-x-auto print:bg-white print:p-0">
          <div className="print-continuous-paper-container flex bg-white shadow-2xl border border-gray-400 select-text pr-px print:shadow-none print:border-none">
            
            {/* Left Tractor Feed band with holes */}
            <div id="tractor-feed-holes-left" className="w-[32px] bg-[#fdfaf2] border-r border-red-200 flex flex-col justify-between py-6 shrink-0 print:hidden">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 bg-[#403c34]/50 rounded-full mx-auto shadow-[inset_1.5px_1.5px_2.5px_rgba(0,0,0,0.7)] opacity-85 border border-amber-900/10"></div>
              ))}
            </div>

            {/* Main Print Slip Sheet */}
            <div id="print-sheet-wrapper" className="w-[840px] bg-white p-6 md:p-8 flex flex-col justify-between select-text text-black print:p-0 print:w-full">
              
              {/* Header */}
              <div>
                <div className="flex justify-between items-start border-b-2 border-dashed border-red-650 pb-4">
                  <div className="text-left max-w-[450px]">
                    <h1 className="font-sans font-black text-2xl tracking-tight text-red-650 leading-none">BALLY JUTE COMPANY LIMITED</h1>
                    <p className="text-[10px] font-bold text-red-700/95 tracking-wide mt-1.5 uppercase font-mono">AUTHORIZED MILL PREMISES</p>
                    <p className="text-[9px] text-gray-500 font-bold font-sans mt-0.5 leading-none">Est. 1890 | Cable: "JUTEMILL" | Fax: +91-33-2654-XXXX</p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-gray-600 bg-gray-50 p-2 border border-gray-300">
                    <p className="font-bold">SYSTEM DOC ID: <span className="text-stone-900 font-black">#OS-{printData.id?.slice(0,6).toUpperCase() || 'N/A'}</span></p>
                    <p className="mt-0.5">PRINT DATE: {new Date().toLocaleDateString('en-GB')}</p>
                    <p className="mt-0.5">TIME RECEIVED: {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>

                {/* Document Title Banner */}
                <div className="my-6 text-center">
                  <div className="inline-block border-2 border-dashed border-red-600 py-1.5 px-6">
                    <h2 className="font-sans font-black text-sm tracking-widest text-red-800 uppercase">
                      MASTER OPENING STOCK CERTIFICATE
                    </h2>
                    <p className="text-[8px] font-mono font-black text-gray-500 tracking-wider mt-0.5 uppercase">
                      AUTHORIZED LEDGER VOUCHER • PERMANENT BOOK STATEMENT
                    </p>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-2 gap-6 font-mono text-xs">
                  <div className="space-y-2 border border-gray-300 p-3 bg-stone-50/50">
                    <p className="border-b border-gray-200 pb-1.5"><span className="text-gray-500 font-bold uppercase block text-[9px]">Ledger Entry Date:</span> <strong className="text-stone-900 font-black">{printData.opening_date}</strong></p>
                    <p className="border-b border-gray-200 pb-1.5"><span className="text-gray-500 font-bold uppercase block text-[9px]">Godown Location:</span> <strong className="text-blue-900 font-black uppercase text-sm">{printData.godown}</strong></p>
                    <p><span className="text-gray-500 font-bold uppercase block text-[9px]">Station / Depot Area:</span> <strong className="text-stone-800 font-bold uppercase">{printData.area || 'MAIN DEPOT'}</strong></p>
                  </div>
                  <div className="space-y-2 border border-gray-300 p-3 bg-stone-50/50">
                    <p className="border-b border-gray-200 pb-1.5"><span className="text-gray-500 font-bold uppercase block text-[9px]">Jute Quality Grade Rating:</span> <strong className="text-red-750 font-black text-sm uppercase">{printData.grade}</strong></p>
                    <p className="border-b border-gray-200 pb-1.5"><span className="text-gray-500 font-bold uppercase block text-[9px]">Government Supplies (JCI):</span> <strong className="text-stone-900 font-bold uppercase">{printData.jci === 'Yes' ? 'YES - GOVT MANDATED ALLOCATION' : 'NO - COMMERCIAL MARKET STOCK'}</strong></p>
                    <p><span className="text-gray-500 font-bold uppercase block text-[9px]">Permanent Unit Master:</span> <strong className="text-stone-800 font-bold uppercase">{printData.unit || 'BALES'}</strong></p>
                  </div>
                </div>

                {/* Large Quantity Statement Panel */}
                <div className="my-6 border border-gray-400 bg-red-50/10 p-4">
                  <div className="grid grid-cols-3 gap-4 text-center divide-x divide-gray-350 bg-stone-50/50 p-2 border border-gray-200">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-red-800 font-sans uppercase tracking-widest block mb-1">Declared Ledger Quantity</span>
                      <span className="text-xl font-black font-mono text-indigo-950 tracking-tight leading-none">
                        {Number(printData.quantity).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 3})}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase mt-1">{printData.unit || 'BALES'}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-red-800 font-sans uppercase tracking-widest block mb-1">Total Book Weight</span>
                      <span className="text-xl font-black font-mono text-teal-900 tracking-tight leading-none">
                        {(Number(printData.weight) / 10).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 3})}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase mt-1">MT</span>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-red-800 font-sans uppercase tracking-widest block mb-1">Average Weight</span>
                      <span className="text-xl font-black font-mono text-amber-950 tracking-tight leading-none">
                        {printData.avg_weight ? (Number(printData.avg_weight) / 10).toFixed(4) : (Number(printData.quantity) > 0 ? ((Number(printData.weight) / Number(printData.quantity)) / 10).toFixed(4) : '0.0000')}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase mt-1">MT/{printData.unit || 'BALES'}</span>
                    </div>
                  </div>
                </div>

                {/* Declaration & Clauses */}
                <div className="text-[9px] text-gray-500 leading-relaxed font-sans font-medium space-y-1 mt-6 border-t border-gray-200 pt-3 text-left">
                  <p>1. CERTIFIED STATEMENT: This represents our permanent opening balance registered into the stock ledger node of the Bally Jute Company Limited on the aforesaid date. This value is legally binding and serves as the official baseline for active inbound mill inspections, Amad arrivals, and physical storage counts.</p>
                  <p>2. CORRECTION CLAUSE: Any revisions to the opening stock metrics require explicit high-level administrator approval and must trigger a permanent trace event log in the secure central audit history.</p>
                </div>
              </div>

              {/* Footer and Signature blocks */}
              <div className="grid grid-cols-12 gap-4 items-end mt-12 border-t border-gray-300 pt-6">
                <div className="col-span-7 text-[8px] text-gray-400 uppercase font-mono font-medium leading-tight text-left">
                  <p className="font-extrabold text-[#2a3088]">SYSTEM AUTH NO: BJ-OS-SYS-{Math.floor(100000 + Math.random() * 900000)}</p>
                  <p className="mt-1">Generated electronically inside the Mill ERP Latest Stock Control Room.</p>
                  <p>Original file persists securely under table reference 'opening_stock'.</p>
                </div>
                <div className="col-span-5 flex flex-col justify-between text-center">
                  <p className="font-black text-[11px] tracking-wide uppercase font-sans text-red-800/90 leading-none">For, BALLY JUTE COMPANY LIMITED</p>
                  <div className="mt-10 flex flex-col items-center">
                    <div className="w-48 border-t border-dashed border-gray-400" />
                    <p className="font-bold text-[9px] mt-1 text-gray-650 uppercase font-sans leading-none tracking-wider font-extrabold">LEDGER MASTER CAPTAIN</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Tractor Feed band with holes */}
            <div id="tractor-feed-holes-right" className="w-[32px] bg-[#fdfaf2] border-l border-[#dcd8cc] flex flex-col justify-between py-6 shrink-0 print:hidden">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 bg-[#403c34]/50 rounded-full mx-auto shadow-[inset_1.5px_1.5px_2.5px_rgba(0,0,0,0.7)] opacity-85 border border-amber-900/10"></div>
              ))}
            </div>

          </div>
        </div>
      )}
    </PrintModal>
  );
};

export const StockClosingPrintModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  printClosingData: any;
}> = ({ isOpen, onClose, printClosingData }) => {
  return (
    <PrintModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="RETRO MONTHLY CLOSING STOCK STANDARD SLIP"
    >
      {printClosingData && (
        <div className="p-4 bg-[#606060] flex justify-center overflow-x-auto print:bg-white print:p-0">
          <div className="print-continuous-paper-container flex bg-white shadow-2xl border border-gray-400 select-text pr-px print:shadow-none print:border-none">
            
            {/* Left Tractor Feed band with holes */}
            <div id="tractor-feed-holes-left" className="w-[32px] bg-[#fdfaf2] border-r border-[#edd8cc] flex flex-col justify-between py-6 shrink-0 print:hidden">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 bg-[#403c34]/50 rounded-full mx-auto shadow-[inset_1.5px_1.5px_2.5px_rgba(0,0,0,0.7)] opacity-85 border border-amber-900/10"></div>
              ))}
            </div>

            {/* Main Print Slip Sheet */}
            <div id="print-sheet-wrapper" className="w-[840px] bg-white p-6 md:p-8 flex flex-col justify-between select-text text-black print:p-0 print:w-full">
              
              {/* Header */}
              <div>
                <div className="flex justify-between items-start border-b-2 border-dashed border-blue-900 pb-4">
                  <div className="text-left max-w-[450px]">
                    <h1 className="font-sans font-black text-2xl tracking-tight text-blue-900 leading-none">BALLY JUTE COMPANY LIMITED</h1>
                    <p className="text-[10px] font-bold text-blue-950/95 tracking-wide mt-1.5 uppercase font-mono">AUTHORIZED MILL PREMISES</p>
                    <p className="text-[9px] text-gray-500 font-bold font-sans mt-0.5 leading-none">Est. 1890 | Cable: "JUTEMILL" | Fax: +91-33-2654-XXXX</p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-gray-600 bg-gray-50 p-2 border border-gray-300">
                    <p className="font-bold">SYSTEM DOC ID: <span className="text-stone-900 font-black">#CS-{printClosingData.id?.slice(0,6).toUpperCase() || 'N/A'}</span></p>
                    <p className="mt-0.5">AUDIT DATE: {printClosingData.stock_date}</p>
                    <p className="mt-0.5">PRINT DATE: {new Date().toLocaleDateString('en-GB')}</p>
                  </div>
                </div>

                {/* Document Title Banner */}
                <div className="my-6 text-center">
                  <div className="inline-block border-2 border-dashed border-red-800 py-1.5 px-6">
                    <h2 className="font-sans font-black text-sm tracking-widest text-red-900 uppercase">
                      MONTHLY INVENTORY CLOSING CERTIFICATE
                    </h2>
                    <p className="text-[8px] font-mono font-black text-gray-500 tracking-wider mt-0.5 uppercase">
                      VALUED ASSET REPORT • OFFICIAL STOCK STATEMENT
                    </p>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-2 gap-6 font-mono text-xs">
                  <div className="space-y-2 border border-gray-300 p-3 bg-stone-50/50 text-left">
                    <p className="border-b border-gray-200 pb-1.5"><span className="text-gray-500 font-bold uppercase block text-[9px]">Stock Valuation Date:</span> <strong className="text-stone-900 font-black">{printClosingData.stock_date}</strong></p>
                    <p className="border-b border-gray-200 pb-1.5"><span className="text-gray-500 font-bold uppercase block text-[9px]">Warehousing Godown:</span> <strong className="text-blue-900 font-black uppercase text-sm">{printClosingData.godown}</strong></p>
                    <p><span className="text-gray-500 font-bold uppercase block text-[9px]">Reported Commodity Code:</span> <strong className="text-stone-800 font-bold uppercase">{printClosingData.commodity || 'RAW JUTE'}</strong></p>
                  </div>
                  <div className="space-y-2 border border-gray-300 p-3 bg-stone-50/50 text-left">
                    <p className="border-b border-gray-200 pb-1.5"><span className="text-gray-500 font-bold uppercase block text-[9px]">Standard Variety:</span> <strong className="text-blue-900 font-black uppercase text-sm">{printClosingData.variety || 'TOSSA'}</strong></p>
                    <p className="border-b border-gray-200 pb-1.5"><span className="text-gray-500 font-bold uppercase block text-[9px]">Associated Jute Grade:</span> <strong className="text-red-750 font-black text-sm uppercase">{printClosingData.grade}</strong></p>
                    <p><span className="text-gray-500 font-bold uppercase block text-[9px]">Auditing Inspector ID:</span> <strong className="text-stone-900 font-bold uppercase">{printClosingData.recorded_by || 'ADMIN'}</strong></p>
                  </div>
                </div>

                {/* Large Quantity Statement Panel */}
                <div className="my-6 border border-gray-400 bg-emerald-50/10 p-4">
                  <div className="grid grid-cols-3 gap-4 text-center divide-x divide-gray-300">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-500 font-sans uppercase tracking-widest block mb-1">Physical Bales</span>
                      <span className="text-2xl font-black font-mono text-indigo-950 tracking-tight leading-none">
                        {Number(printClosingData.no_of_bales).toLocaleString()}
                        <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Bales</span>
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-500 font-sans uppercase tracking-widest block mb-1 font-mono">Net Book Weight</span>
                      <span className="text-2xl font-black font-mono text-teal-900 tracking-tight leading-none">
                        {(Number(printClosingData.weight_qtl) / 10).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">MT</span>
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-500 font-sans uppercase tracking-widest block mb-1 font-mono">Billing Rate</span>
                      <span className="text-2xl font-black font-mono text-yellow-800 tracking-tight leading-none">
                        ₹{(Number(printClosingData.rate_per_qtl) * 10).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">/MT</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Valuation Banner */}
                <div className="my-3 border bg-[#D94B5A]/5 border-blue-900 p-4 text-center select-text">
                  <p className="text-[10px] font-bold text-indigo-900 font-sans uppercase tracking-widest leading-none">Valued Inventory Asset Book Value</p>
                  <p className="text-3xl font-black font-mono text-red-900 tracking-tighter italic mt-1 pb-1">
                    ₹ {Number(printClosingData.total_value).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </p>
                  <p className="text-[9px] font-bold font-sans text-stone-600 mt-1 uppercase leading-none italic">
                    Remarks: {printClosingData.remarks || 'No issues noticed. All stocks registered safely.'}
                  </p>
                </div>

                {/* Declaration & Clauses */}
                <div className="text-[9px] text-gray-500 leading-relaxed font-sans font-medium space-y-1 mt-6 border-t border-gray-200 pt-3 text-left">
                  <p>1. INVENTORY STATEMENT: This standard balance verification certificate is an authorized inventory document under reference 'closing_stock'. Recorded book value asset metrics serve as permanent tax audit records for the Bally Jute Company Limited on physical stock levels.</p>
                  <p>2. CORRECTION FACTOR: Any manually registered discrepancy during storage auditing must trigger formal ledger modifications in compliance with physical counts.</p>
                </div>
              </div>

              {/* Footer and Signature blocks */}
              <div className="grid grid-cols-12 gap-4 items-end mt-12 border-t border-gray-300 pt-6">
                <div className="col-span-7 text-[8px] text-gray-400 uppercase font-mono font-medium leading-tight text-left">
                  <p className="font-extrabold text-[#2a3088]">SYSTEM AUTH NO: BJ-CS-SYS-{Math.floor(100000 + Math.random() * 900000)}</p>
                  <p className="mt-1">Generated electronically inside the Mill ERP Latest Stock Control Room.</p>
                  <p>Store record persists securely under central reference table 'closing_stock'.</p>
                </div>
                <div className="col-span-5 flex flex-col justify-between text-center">
                  <p className="font-black text-[11px] tracking-wide uppercase font-sans text-red-800/90 leading-none">For, BALLY JUTE COMPANY LIMITED</p>
                  <div className="mt-10 flex flex-col items-center">
                    <div className="w-48 border-t border-dashed border-gray-400" />
                    <p className="font-bold text-[9px] mt-1 text-gray-650 uppercase font-sans leading-none tracking-wider font-extrabold">LEDGER MASTER CAPTAIN</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Tractor Feed band with holes */}
            <div id="tractor-feed-holes-right" className="w-[32px] bg-[#fdfaf2] border-l border-[#ecd8cc] flex flex-col justify-between py-6 shrink-0 print:hidden">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 bg-[#403c34]/50 rounded-full mx-auto shadow-[inset_1.5px_1.5px_2.5px_rgba(0,0,0,0.7)] opacity-85 border border-amber-900/10"></div>
              ))}
            </div>

          </div>
        </div>
      )}
    </PrintModal>
  );
};

export const StockCapacityAuditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  filteredSavedStocks: any[];
  getGodownCapacityAndName: (gName: string) => { capacity: number; name: string };
  popupSearchQuery: string;
  setPopupSearchQuery: (q: string) => void;
}> = ({
  isOpen,
  onClose,
  filteredSavedStocks,
  getGodownCapacityAndName,
  popupSearchQuery,
  setPopupSearchQuery
}) => {
  if (!isOpen) return null;

  const gwtTotalQty = filteredSavedStocks.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const gwtTotalWeight = filteredSavedStocks.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const distinctGodowns = Array.from(new Set(filteredSavedStocks.map(r => String(r.godown || '').trim().toUpperCase()).filter(Boolean)));
  const gwtDistinctGodownsCount = distinctGodowns.length;

  const activeGdnCapacityMT = distinctGodowns.reduce((acc, name) => {
    const info = getGodownCapacityAndName(name);
    return acc + info.capacity;
  }, 0);

  const allGdNodes = DEFAULT_GODOWNS.map((g) => {
    const name = g.gdn_name || g.gdn_code;
    const cap = Number(g.gdn_capacity || 600);
    const records = filteredSavedStocks.filter(r => {
      const resolved = getGodownCapacityAndName(r.godown || "");
      return resolved.name.toLowerCase() === name.toLowerCase();
    });
    
    const storedWeight = records.reduce((sum, r) => sum + Number(r.weight || 0), 0);
    const storedQty = records.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    const rawUtil = cap > 0 ? (storedWeight / cap) * 100 : 0;
    
    const gradesMap: { [grade: string]: number } = {};
    records.forEach(r => {
      const gd = r.grade || "Unassigned";
      gradesMap[gd] = (gradesMap[gd] || 0) + Number(r.weight || 0);
    });
    
    const gradeBreakdown = Object.entries(gradesMap)
      .map(([grd, wt]) => `${grd}: ${wt.toFixed(2)} MT`)
      .join(", ");

    return {
      name,
      code: g.gdn_code,
      shortName: g.gdn_short_name || name,
      capacity: cap,
      storedWeight,
      storedQty,
      utilPercent: Math.min(100, rawUtil),
      rawUtil,
      isActive: storedWeight > 0.001,
      gradeBreakdown: gradeBreakdown || "No stocks",
      recordsCount: records.length
    };
  });

  const filteredGdNodes = allGdNodes.filter(node => {
    const q = popupSearchQuery.toLowerCase();
    return (
      node.name.toLowerCase().includes(q) ||
      node.code.toLowerCase().includes(q) ||
      node.gradeBreakdown.toLowerCase().includes(q)
    );
  });

  const totalCapSum = DEFAULT_GODOWNS.reduce((acc, current) => acc + current.gdn_capacity, 0);

  return (
    <div role="dialog" className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#FBCFCB] border-2 border-white shadow-[4px_4px_24px_rgba(0,0,0,0.65)] w-full max-w-4xl p-1 animate-in zoom-in-95 duration-150 flex flex-col rounded-md overflow-hidden">
        
        {/* Retro Windows Title Bar */}
        <div className="bg-[#D94B5A] text-white p-2.5 text-xs font-black uppercase tracking-wider flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#80ffd0]" />
            <span>📊 Jute Godown Capacity & Allocation Audit Registry</span>
          </span>
          <button 
            type="button" 
            onClick={() => {
              onClose();
              setPopupSearchQuery("");
            }}
            className="bg-[#FBCFCB] text-black border border-white hover:bg-red-655 hover:text-white font-extrabold text-[12px] leading-none h-6 w-6 flex items-center justify-center p-0 shadow-[1px_1px_0_0_black]"
            title="Close Audit Registry View"
          >
            ✕
          </button>
        </div>

        {/* Main Content Area */}
        <div className="bg-white p-4 border border-black/10 space-y-4 max-h-[70vh] overflow-y-auto text-slate-800 text-left">
          
          {/* Summary Section with Bento-styled KPI Mini-cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#f1f5f9] p-3 rounded-lg border border-slate-200">
            <div className="bg-white border border-slate-200 p-2 text-center rounded shadow-xs">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Total Active Capacity</span>
              <span className="text-lg font-black text-slate-800">{activeGdnCapacityMT.toLocaleString()} MT</span>
              <span className="text-[8px] text-slate-400 block mt-0.5 font-extrabold">Sum of {gwtDistinctGodownsCount} Active Godowns</span>
            </div>
            <div className="bg-white border border-slate-200 p-2 text-center rounded shadow-xs">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Active Stored Weight</span>
              <span className="text-lg font-black text-emerald-700">{(gwtTotalWeight / 10).toFixed(2)} MT</span>
              <span className="text-[8px] text-emerald-600 block mt-0.5 font-extrabold">{gwtTotalQty.toLocaleString()} Total Bales</span>
            </div>
            <div className="bg-white border border-slate-200 p-2 text-center rounded shadow-xs">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Active Utilization</span>
              <span className="text-lg font-black text-sky-700">
                {activeGdnCapacityMT > 0 ? (((gwtTotalWeight / 10) / activeGdnCapacityMT) * 100).toFixed(1) : "0.0"}%
              </span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                <div 
                  className="bg-sky-600 h-full rounded-full" 
                  style={{ width: `${Math.min(100, activeGdnCapacityMT > 0 ? ((gwtTotalWeight / 10) / activeGdnCapacityMT) * 100 : 0)}%` }}
                />
              </div>
            </div>
            <div className="bg-white border border-slate-200 p-2 text-center rounded shadow-xs">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Absolute Master Cap</span>
              <span className="text-lg font-black text-indigo-900">{totalCapSum.toLocaleString()} MT</span>
              <span className="text-[8px] text-slate-400 block mt-0.5 font-extrabold">All {DEFAULT_GODOWNS.length} Registered Godowns</span>
            </div>
          </div>

          {/* Modal Search Bar filter */}
          <div className="flex items-center gap-2 bg-[#FBCFCB] p-1.5 border border-black/20 shadow-xs">
            <span className="text-[10px] font-black text-slate-700 uppercase shrink-0">Search Godowns:</span>
            <div className="relative flex-1">
              <input 
                id="type_godown_name_code_or__3124" 
                name="type_godown_name_code_or_" 
                aria-label="Type Godown Name, Code, or Material Grade (e.g. M.BOT)..."
                type="text" 
                placeholder="Type Godown Name, Code, or Material Grade (e.g. M.BOT)..." 
                value={popupSearchQuery}
                onChange={(e) => setPopupSearchQuery(e.target.value)}
                className="w-full h-7 bg-white border border-slate-400 px-2 pl-7 text-[10px] font-black focus:outline-hidden text-slate-800 rounded-sm"
              />
              <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-500" />
            </div>
            {popupSearchQuery && (
              <button 
                type="button" 
                onClick={() => setPopupSearchQuery("")}
                className="bg-white border border-slate-300 hover:bg-slate-100 text-[10px] font-black text-slate-600 px-2 h-7 rounded shadow-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Godown Table */}
          <div className="border border-slate-200 overflow-x-auto rounded-md shadow-xs animate-in fade-in duration-200">
            <table className="w-full text-left text-[10px] font-black text-slate-700 min-w-[600px] border-collapse">
              <thead>
                <tr className="bg-[#e4e0d8] border-b border-slate-300 text-slate-950 uppercase text-[9px] tracking-tight">
                  <th className="p-2.5 border-r border-slate-300">Godown Name</th>
                  <th className="p-2.5 border-r border-slate-300 text-center">Status</th>
                  <th className="p-2.5 border-r border-slate-300 text-right">Capacity (MT)</th>
                  <th className="p-2.5 border-r border-slate-300 text-right">Stored Stock (MT)</th>
                  <th className="p-2.5 border-r border-slate-300">Capacity Utilization</th>
                  <th className="p-2.5">Grades Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredGdNodes.length > 0 ? (
                  filteredGdNodes.map((node) => {
                    let badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
                    let progressColor = "bg-emerald-600";
                    if (node.isActive) {
                      badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-250 font-extrabold shadow-xs";
                    }
                    if (node.utilPercent > 75) {
                      progressColor = "bg-amber-600";
                    } 
                    if (node.utilPercent > 90) {
                      progressColor = "bg-rose-600";
                    }

                    return (
                      <tr key={node.name} className={cn("hover:bg-slate-50", node.isActive ? "bg-emerald-50/10" : "")}>
                        <td className="p-2.5 border-r border-slate-200 text-slate-950 font-extrabold flex items-center gap-1.5">
                          <Box className="h-3 w-3 text-indigo-950" />
                          Godown {node.name}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center">
                          <span className={cn("inline-block text-[8px] tracking-wide uppercase px-1.5 py-0.5 rounded border font-black", badgeColor)}>
                            {node.isActive ? "● Active" : "○ Inactive"}
                          </span>
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-right text-slate-900 font-mono">
                          {node.capacity} MT
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-right text-slate-950 font-mono font-black">
                          {node.storedWeight.toFixed(2)} MT
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 h-2 rounded overflow-hidden shadow-inner border border-slate-200">
                              <div 
                                className={cn("h-full rounded transition-all duration-300", progressColor)}
                                style={{ width: `${node.utilPercent}%` }}
                              />
                            </div>
                            <span className="font-mono text-[9px] font-extrabold text-slate-800">
                              {node.utilPercent.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5 text-stone-650 font-sans italic max-w-[200px] truncate" title={node.gradeBreakdown}>
                          {node.gradeBreakdown}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">No godowns match the search criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Popup action strip bar */}
        <div className="bg-[#FBCFCB] py-2 px-4 border-t border-white/60 flex justify-end">
          <button 
            type="button" 
            onClick={() => {
              onClose();
              setPopupSearchQuery("");
            }}
            className="bg-white border-2 border-slate-400 shadow-[1px_1px_0_black] font-black text-[10px] text-slate-800 uppercase px-6 py-1 cursor-pointer active:translate-y-px"
          >
            Done View
          </button>
        </div>

      </div>
    </div>
  );
};

export const StockTransferModal: React.FC<{
  transferRecord: any | null;
  onClose: () => void;
  godowns: any[];
  transferTargetGodown: string;
  setTransferTargetGodown: (g: string) => void;
  transferBales: string;
  setTransferBales: (b: string) => void;
  onExecuteTransfer: () => void;
}> = ({
  transferRecord,
  onClose,
  godowns,
  transferTargetGodown,
  setTransferTargetGodown,
  transferBales,
  setTransferBales,
  onExecuteTransfer
}) => {
  if (!transferRecord) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#FBCFCB] border-2 border-white shadow-2xl w-full max-w-md rounded p-4 space-y-4">
        <div className="bg-[#D94B5A] text-white px-3 py-1 font-mono font-black text-xs flex justify-between items-center">
          <span>🚚 Transfer Stock: {transferRecord.grade}</span>
          <button onClick={onClose} className="text-white hover:text-red-300 font-bold">×</button>
        </div>
        <div className="bg-white p-3 border border-gray-400 space-y-3 text-xs font-bold">
          <div>
            <span className="text-gray-500 block text-[10px]">Current Godown Location:</span>
            <span className="text-indigo-950 uppercase font-black">{transferRecord.godown} ({transferRecord.quantity} Bales)</span>
          </div>
          <div>
            <label className="block text-[10px] text-gray-700 uppercase font-black mb-1">Target Godown / Warehouse:</label>
            <select 
              className="w-full border border-gray-400 p-1.5 outline-none font-bold text-xs bg-white"
              value={transferTargetGodown}
              onChange={(e) => setTransferTargetGodown(e.target.value)}
            >
              <option value="">-- Select Destination Godown --</option>
              {godowns.map((g: any, gi: number) => {
                const gName = g.gdn_name || g.name || g.gdn_code || '';
                if (gName.toUpperCase() === String(transferRecord.godown || '').toUpperCase()) return null;
                return <option key={gi} value={gName}>{gName}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-700 uppercase font-black mb-1">Bales to Transfer:</label>
            <input 
              type="number"
              className="w-full border border-gray-400 p-1.5 outline-none font-bold text-xs"
              placeholder="Enter quantity..."
              value={transferBales}
              onChange={(e) => setTransferBales(e.target.value)}
              max={transferRecord.quantity}
              min={1}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-black rounded text-xs font-bold">Cancel</button>
          <button onClick={onExecuteTransfer} className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded text-xs font-black uppercase">Confirm Transfer</button>
        </div>
      </div>
    </div>
  );
};

export const StockUpdateGodownModal: React.FC<{
  updateGodownRecord: any | null;
  onClose: () => void;
  newGodownName: string;
  setNewGodownName: (name: string) => void;
  onExecuteUpdateGodown: () => void;
}> = ({
  updateGodownRecord,
  onClose,
  newGodownName,
  setNewGodownName,
  onExecuteUpdateGodown
}) => {
  if (!updateGodownRecord) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#FBCFCB] border-2 border-white shadow-2xl w-full max-w-md rounded p-4 space-y-4">
        <div className="bg-[#D94B5A] text-white px-3 py-1 font-mono font-black text-xs flex justify-between items-center">
          <span>📍 Update Godown Location: {updateGodownRecord.grade}</span>
          <button onClick={onClose} className="text-white hover:text-red-300 font-bold">×</button>
        </div>
        <div className="bg-white p-3 border border-gray-400 space-y-3 text-xs font-bold">
          <div>
            <label className="block text-[10px] text-gray-700 uppercase font-black mb-1">New Godown / Warehouse Name:</label>
            <input 
              type="text" 
              className="w-full border border-gray-400 p-1.5 outline-none font-bold text-xs uppercase"
              placeholder="Enter new godown location..."
              value={newGodownName}
              onChange={(e) => setNewGodownName(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-black rounded text-xs font-bold">Cancel</button>
          <button onClick={onExecuteUpdateGodown} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-black uppercase">Update Godown</button>
        </div>
      </div>
    </div>
  );
};

export const StockPdfSummaryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  liveStocks: any[];
  openingStocks: any[];
}> = ({ isOpen, onClose, liveStocks, openingStocks }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-slate-800 shadow-2xl w-full max-w-4xl rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto print:m-0 print:p-0 print:shadow-none">
        <div className="flex justify-between items-center pb-3 border-b-2 border-slate-800 print:hidden">
          <div>
            <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight">📄 Official Stock Summary Report (PDF View)</h2>
            <p className="text-xs font-bold text-slate-600">Hierarchical Breakdown: Grade → Area → Godown</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded font-black text-xs uppercase flex items-center gap-1 shadow cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
            <button onClick={onClose} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded text-xs">Close</button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="space-y-4 text-xs text-slate-900 font-sans print:text-black">
          <div className="text-center space-y-1 pb-4 border-b border-slate-300">
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">RAW JUTE MILLS STOCK SUMMARY REPORT</h1>
            <p className="text-xs font-bold text-slate-600">Generated on: {new Date().toLocaleDateString()} | Hierarchical Breakdown (Grade → Area → Godown)</p>
          </div>

          <div className="border border-slate-400 rounded overflow-hidden">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-400 uppercase font-black text-slate-900 text-left">
                  <th className="p-2 border-r border-slate-300">Grade / Quality</th>
                  <th className="p-2 border-r border-slate-300">Area / Region</th>
                  <th className="p-2 border-r border-slate-300">Godown / Warehouse</th>
                  <th className="p-2 border-r border-slate-300 text-center">JCI Govt</th>
                  <th className="p-2 text-right">Quantity (Bales) & Wt (KG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-bold">
                {liveStocks.map((item, i) => {
                  const gradeRecs = openingStocks.filter((r: any) => String(r.grade || '').trim().toUpperCase() === item.grade.trim().toUpperCase());
                  if (gradeRecs.length === 0) {
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 font-black uppercase">{item.grade}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-400 italic" colSpan={3}>No detailed godown records</td>
                        <td className="p-2 text-right font-mono">{item.balanceQty} Bales</td>
                      </tr>
                    );
                  }
                  return gradeRecs.map((rec: any, ri: number) => (
                    <tr key={`${i}-${ri}`} className="hover:bg-slate-50">
                      {ri === 0 && (
                        <td className="p-2 border-r border-slate-200 font-black uppercase align-top" rowSpan={gradeRecs.length}>
                          {item.grade}
                        </td>
                      )}
                      <td className="p-2 border-r border-slate-200 uppercase">{rec.area || '-'}</td>
                      <td className="p-2 border-r border-slate-200 uppercase font-black">{rec.godown || '-'}</td>
                      <td className="p-2 border-r border-slate-200 text-center">{rec.jci || 'No'}</td>
                      <td className="p-2 text-right font-mono">
                        {rec.quantity || 0} Bales ({(Number(rec.weight || 0) * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} KG)
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-4 flex justify-between text-[10px] text-slate-600 font-bold border-t border-slate-300">
            <span>Authorized Signatory</span>
            <span>Mill Stock Control Department</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
