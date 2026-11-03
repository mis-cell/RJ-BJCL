import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FinalArrivalEntryFormData } from './finalArrivalTypes';

interface FinalArrivalEntryHeaderProps {
  formData: FinalArrivalEntryFormData;
  handleInputChange: (field: string, val: any) => void;
  handleAreaChange: (val: string) => void;
  handleSelectTempMrOption: (item: any) => void;
  handleSelectPoOption: (item: any) => void;
  loadDetailsFromAmad: (tempMrNo: string) => void;
  showTempMrDropdown: boolean;
  setShowTempMrDropdown: (show: boolean) => void;
  tempMrOptions: any[];
  showPoDropdown: boolean;
  setShowPoDropdown: (show: boolean) => void;
  combinedPoOptions: any[];
  brokers: any[];
  suppliers: any[];
  areas: any[];
  unitList: string[];
}

export function FinalArrivalEntryHeader({
  formData,
  handleInputChange,
  handleAreaChange,
  handleSelectTempMrOption,
  handleSelectPoOption,
  loadDetailsFromAmad,
  showTempMrDropdown,
  setShowTempMrDropdown,
  tempMrOptions,
  showPoDropdown,
  setShowPoDropdown,
  combinedPoOptions,
  brokers,
  suppliers,
  areas,
  unitList
}: FinalArrivalEntryHeaderProps) {
  return (
    <div className="bg-white rounded-xl border border-[#FBCFCB] shadow-xs p-4 space-y-3.5 text-xs text-slate-800">
      {/* ROW 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
        {/* Temporary M.R No - Searchable Dropdown List */}
        <div className="lg:col-span-1 relative">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Temporary M.R No <span className="text-rose-600 font-black text-sm">*</span></label>
          <div className="flex items-center gap-1 relative">
            <div className="relative flex-1">
              <input
                type="text"
                value={formData.temporary_arrival_no || ''}
                onChange={(e) => {
                  handleInputChange('temporary_arrival_no', e.target.value.toUpperCase());
                  setShowTempMrDropdown(true);
                }}
                onFocus={() => setShowTempMrDropdown(true)}
                onBlur={() => setTimeout(() => setShowTempMrDropdown(false), 200)}
                placeholder="-- SELECT TEMP M.R --"
                className={cn(
                  "w-full h-8 rounded px-2 pr-6 outline-none text-xs font-mono uppercase focus:ring-1 focus:ring-sky-600 transition-colors",
                  formData.temporary_arrival_no 
                    ? "bg-sky-100 border-2 border-sky-400 text-sky-950 font-bold shadow-xs" 
                    : "bg-white border border-slate-300 font-semibold"
                )}
                required
              />
              <div
                className="absolute right-1 top-0 bottom-0 w-5 flex items-center justify-center cursor-pointer text-slate-500 hover:text-slate-800"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowTempMrDropdown(!showTempMrDropdown);
                }}
              >
                <ChevronDown size={14} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadDetailsFromAmad(formData.temporary_arrival_no)}
              className="bg-[#F7AFA8] hover:bg-[#D94B5A] text-white px-2.5 h-8 rounded text-xs font-bold transition-colors cursor-pointer shrink-0 border border-[#FBCFCB]"
            >
              Pick
            </button>

            {showTempMrDropdown && (
              <div className="absolute top-9 left-0 w-[380px] bg-white border border-slate-300 rounded-lg max-h-60 overflow-y-auto z-[9999] shadow-xl">
                {(() => {
                  const search = (formData.temporary_arrival_no || '').trim().toLowerCase();
                  const filteredTempMr = tempMrOptions.filter(opt =>
                    !search ||
                    (opt.temp_mr_no || '').toLowerCase().includes(search) ||
                    (opt.po_no || '').toLowerCase().includes(search) ||
                    (opt.supplier || '').toLowerCase().includes(search) ||
                    (opt.lorry_number || '').toLowerCase().includes(search) ||
                    (opt.display_label || '').toLowerCase().includes(search)
                  );

                  if (filteredTempMr.length === 0) {
                    return (
                      <div className="p-3 text-xs text-slate-500 italic text-center">
                        No matching Temporary M.R records found
                      </div>
                    );
                  }

                  return filteredTempMr.map((opt, idx) => (
                    <div
                      key={opt.id || idx}
                      className="px-3 py-2 text-xs font-mono cursor-pointer hover:bg-emerald-50 border-b border-slate-100 last:border-b-0 flex flex-col gap-0.5"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectTempMrOption(opt);
                      }}
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <span>{opt.temp_mr_no}</span>
                          {opt.po_no && (
                            <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-1 rounded">
                              PO {opt.po_no}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ✨ From Temporary MR
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span className="truncate">{opt.supplier}</span>
                        {opt.lorry_number && <span className="font-semibold text-slate-700 shrink-0">🚛 {opt.lorry_number}</span>}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Temporary Date <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            type="date"
            value={formData.temporary_arrival_date || ''}
            onChange={(e) => handleInputChange('temporary_arrival_date', e.target.value)}
            required
            className={cn(
              "w-full h-8 rounded px-2 outline-none text-xs transition-colors",
              formData.temporary_arrival_date 
                ? "bg-sky-100 border-2 border-sky-400 text-sky-950 font-bold shadow-xs" 
                : "bg-white border border-slate-300 text-slate-800"
            )}
          />
        </div>

        {/* Arrival No (Fixed MR0 prefix + user number input) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Arrival No <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            type="text"
            value={
              formData.arrival_no?.startsWith('MR0')
                ? formData.arrival_no
                : `MR0${String(formData.arrival_no || '').replace(/^(MR0?|AR0?|FA-?)/i, '').replace(/[^0-9]/g, '')}`
            }
            onChange={(e) => handleInputChange('arrival_no', e.target.value)}
            onKeyDown={(e) => {
              const target = e.currentTarget;
              const start = target.selectionStart ?? 0;
              const end = target.selectionEnd ?? 0;
              if ((e.key === 'Backspace' && start <= 3 && end <= 3) || (e.key === 'Delete' && start < 3)) {
                e.preventDefault();
              }
            }}
            onClick={(e) => {
              const target = e.currentTarget;
              if ((target.selectionStart ?? 0) < 3) {
                target.setSelectionRange(3, Math.max(3, target.selectionEnd ?? 3));
              }
            }}
            onFocus={(e) => {
              const target = e.currentTarget;
              setTimeout(() => {
                if ((target.selectionStart ?? 0) < 3) {
                  const len = target.value.length;
                  target.setSelectionRange(len, len);
                }
              }, 0);
            }}
            required
            className="w-full h-8 bg-red-50/30 border border-red-500 rounded px-2 outline-none text-xs font-mono font-bold text-red-600 focus:border-red-700"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Arrival Date <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            type="date"
            value={formData.date || ''}
            onChange={(e) => handleInputChange('date', e.target.value)}
            required
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs text-slate-800 focus:border-[#D94B5A]"
          />
        </div>

        {/* P.O No. */}
        <div className="relative">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">P.O No.</label>
          <div className="relative">
            <input
              type="text"
              value={formData.po_no || ''}
              onChange={(e) => {
                handleInputChange('po_no', e.target.value);
                setShowPoDropdown(true);
              }}
              onFocus={() => setShowPoDropdown(true)}
              onBlur={() => setTimeout(() => setShowPoDropdown(false), 200)}
              placeholder="-- SELECT P.O. --"
              className={cn(
                "w-full h-8 rounded px-2 outline-none text-xs font-mono uppercase pr-6 transition-colors",
                formData.po_no 
                  ? "bg-sky-100 border-2 border-sky-400 text-sky-950 font-bold shadow-xs" 
                  : "bg-white border border-slate-300"
              )}
            />
            <div
              className="absolute right-1 top-0 bottom-0 w-6 flex items-center justify-center cursor-pointer text-slate-500"
              onMouseDown={(e) => { e.preventDefault(); setShowPoDropdown(!showPoDropdown); }}
            >
              <ChevronDown size={14} />
            </div>
            {showPoDropdown && (
              <div className="absolute top-9 left-0 w-[420px] bg-white border-2 border-indigo-600 rounded-lg max-h-60 overflow-y-auto z-[9999] shadow-2xl">
                {(() => {
                  const search = (formData.po_no || '').trim().toLowerCase();
                  const filteredPos = combinedPoOptions.filter(opt =>
                    !search ||
                    String(opt.po_no || '').toLowerCase().includes(search) ||
                    String(opt.supplier || '').toLowerCase().includes(search) ||
                    String(opt.broker || '').toLowerCase().includes(search) ||
                    String(opt.temp_mr_no || '').toLowerCase().includes(search) ||
                    String(opt.display_label || '').toLowerCase().includes(search)
                  );

                  if (filteredPos.length === 0) {
                    return (
                      <div className="p-3 text-xs text-slate-500 italic text-center">
                        No matching P.O. records found
                      </div>
                    );
                  }

                  return filteredPos.map((opt, idx) => (
                    <div
                      key={opt.id || idx}
                      className="px-2.5 py-1.5 text-xs font-mono cursor-pointer hover:bg-indigo-50 hover:text-indigo-900 uppercase border-b border-slate-100 last:border-b-0 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectPoOption(opt);
                      }}
                    >
                      <div className="flex items-center justify-between font-bold text-indigo-950">
                        <span className="flex items-center gap-1.5">
                          <span>P.O. {opt.po_no}</span>
                          {opt.is_reopened ? (
                            <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-sans font-bold">
                              REOPENED ({opt.received_lorries || 0}/{opt.contract_lorries || 1} Lorry)
                            </span>
                          ) : (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-sans normal-case">
                              Sauda Check Point
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">{opt.po_date || ''}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2 mt-0.5">
                        <span className="truncate">Supp: <strong className="text-slate-800">{opt.supplier || 'N/A'}</strong></span>
                        <span className="shrink-0 font-semibold text-emerald-700">{opt.total_contract_mt || opt.quantity || 0} MT</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>

        {/* PO Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">P.O Date</label>
          <input
            type="date"
            value={formData.po_date || ''}
            onChange={(e) => handleInputChange('po_date', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs text-slate-800 focus:border-[#D94B5A]"
          />
        </div>

        {/* JCI */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">JCI</label>
          <select
            value={formData.jci || 'No'}
            onChange={(e) => handleInputChange('jci', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs font-semibold focus:border-[#D94B5A]"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>
      </div>

      {/* ROW 2: Suppliers and Transporters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Challan Supplier */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Challan Supplier <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            list="challan-supplier-list"
            type="text"
            required
            value={formData.challan_supplier || ''}
            onChange={(e) => handleInputChange('challan_supplier', e.target.value.toUpperCase())}
            placeholder="Search / Enter Challan Supplier"
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs uppercase focus:border-[#D94B5A]"
          />
          <datalist id="challan-supplier-list">
            {suppliers.map((s, idx) => (
              <option key={idx} value={s.supp_name || s.name} />
            ))}
          </datalist>
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            list="supplier-list"
            type="text"
            value={formData.supplier || ''}
            onChange={(e) => handleInputChange('supplier', e.target.value.toUpperCase())}
            placeholder="Search / Enter Supplier"
            required
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs uppercase focus:border-[#D94B5A]"
          />
          <datalist id="supplier-list">
            {suppliers.map((s, idx) => (
              <option key={idx} value={s.supp_name || s.name} />
            ))}
          </datalist>
        </div>

        {/* Broker */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Broker <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            list="broker-list"
            type="text"
            value={formData.broker || ''}
            required
            onChange={(e) => handleInputChange('broker', e.target.value.toUpperCase())}
            placeholder="Search / Enter Broker"
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs uppercase focus:border-[#D94B5A]"
          />
          <datalist id="broker-list">
            {brokers.map((b, idx) => (
              <option key={idx} value={b.brok_name || b.name} />
            ))}
          </datalist>
        </div>

        {/* Transporter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Transporter Name</label>
          <input
            type="text"
            value={formData.transporter_name || ''}
            onChange={(e) => handleInputChange('transporter_name', e.target.value)}
            placeholder="Enter Transporter"
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs focus:border-[#D94B5A]"
          />
        </div>
      </div>

      {/* ROW 3: Challan, Lorry, PAN, Consignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Challan/RR No */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Challan No & Date.</label>
          <input
            type="text"
            value={formData.challan_rr_no || formData.challan_railway_receipt_no || ''}
            onChange={(e) => handleInputChange('challan_rr_no', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs font-mono uppercase focus:border-[#D94B5A]"
          />
        </div>

        {/* Challan/RR Date */}
        <div className="hidden">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Challan No & Date.
          </label>
          <input
            type="date"
            value={formData.challan_rr_date || ''}
            onChange={(e) => handleInputChange('challan_rr_date', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs text-slate-800 focus:border-[#D94B5A]"
          />
        </div>

        {/* Lorry Number */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Lorry Number <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            type="text"
            required
            value={formData.lorry_number.toUpperCase() || ''}
            onChange={(e) => handleInputChange('lorry_number', e.target.value.toUpperCase())}
            placeholder="WB-XX-XXXX"
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs font-mono font-bold uppercase focus:border-[#D94B5A]"
          />
        </div>

        {/* PAN / Part No */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">PAN / Part No</label>
          <input
            type="text"
            value={formData.pan_no || formData.part_no || ''}
            onChange={(e) => handleInputChange('pan_no', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs font-mono uppercase focus:border-[#D94B5A]"
          />
        </div>

        {/* Consignment Note */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Consignment Note</label>
          <input
            type="text"
            value={formData.consignment_note || formData.consignment_note_no || ''}
            onChange={(e) => handleInputChange('consignment_note', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs font-mono uppercase focus:border-[#D94B5A]"
          />
        </div>

        {/* Consignment Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Consignment Date</label>
          <input
            type="date"
            value={formData.consignment_note_date || ''}
            onChange={(e) => handleInputChange('consignment_note_date', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs text-slate-800 focus:border-[#D94B5A]"
          />
        </div>
      </div>

      {/* ROW 4: DI, Invoice, PTF, Area, Unit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
        {/* DI No */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">DI No</label>
          <input
            type="text"
            value={formData.di_no || ''}
            onChange={(e) => handleInputChange('di_no', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs font-mono uppercase focus:border-[#D94B5A]"
          />
        </div>

        {/* DI Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">DI Date</label>
          <input
            type="date"
            value={formData.di_date || ''}
            onChange={(e) => handleInputChange('di_date', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs text-slate-800 focus:border-[#D94B5A]"
          />
        </div>

        {/* Invoice No */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice No</label>
          <input
            type="text"
            value={formData.invoice_no || ''}
            onChange={(e) => handleInputChange('invoice_no', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs font-mono uppercase focus:border-[#D94B5A]"
          />
        </div>

        {/* Invoice Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Date</label>
          <input
            type="date"
            value={formData.invoice_date || ''}
            onChange={(e) => handleInputChange('invoice_date', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs text-slate-800 focus:border-[#D94B5A]"
          />
        </div>

        {/* PTF */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">PTF</label>
          <select
            value={formData.ptf || 'No'}
            onChange={(e) => handleInputChange('ptf', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs font-semibold focus:border-[#D94B5A]"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        {/* Area */}
        <div className="lg:col-span-2">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Area <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
          required
            list="area-list"
            type="text"
            value={formData.arrival_area_name || formData.area || ''}
            onChange={(e) => handleAreaChange(e.target.value)}
            placeholder="Search / Enter Area"
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs uppercase focus:border-[#D94B5A]"
          />
          <datalist id="area-list">
            {areas.map((a, idx) => (
              <option key={idx} value={a.area_name} />
            ))}
          </datalist>
        </div>

        {/* Unit */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit <span className="text-rose-600 font-black text-sm">*</span></label>
          <select
          required
            value={formData.unit_name || 'BALES'}
            onChange={(e) => handleInputChange('unit_name', e.target.value)}
            className="w-full h-8 bg-white border border-slate-300 rounded px-2 outline-none text-xs font-bold uppercase focus:border-[#D94B5A]"
          >
            {unitList.map((u, idx) => (
              <option key={idx} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
