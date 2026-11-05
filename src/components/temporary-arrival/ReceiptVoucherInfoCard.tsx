import React from 'react';
import { ChevronDown, Lock, Unlock } from 'lucide-react';

interface ReceiptVoucherInfoCardProps {
  formData: any;
  handleChange: (e: any) => void;
  purchaseOrders: any[];
  closedSaudaMap: Map<string, { po_no: string; sauda_no?: string; contractLorries: number; receivedLorries: number; isClosed: boolean }>;
  initialData?: any;
  showPoDropdown: boolean;
  setShowPoDropdown: (show: boolean) => void;
  fetchPurchaseOrders: () => void;
  onSelectPo: (po: any) => void;
  suppliers: any[];
  brokers: any[];
}

export const ReceiptVoucherInfoCard: React.FC<ReceiptVoucherInfoCardProps> = ({
  formData,
  handleChange,
  purchaseOrders,
  closedSaudaMap,
  initialData,
  showPoDropdown,
  setShowPoDropdown,
  fetchPurchaseOrders,
  onSelectPo,
  suppliers,
  brokers
}) => {
  const [localChallanNo, setLocalChallanNo] = React.useState('');
  const [localChallanDate, setLocalChallanDate] = React.useState('');
  const prevFullRef = React.useRef(formData.challan_rr_no);

  // Sync state from formData.challan_rr_no ONLY when loaded or changed externally
  React.useEffect(() => {
    const raw = String(formData.challan_rr_no || '').trim();
    if (!raw) {
      setLocalChallanNo('');
      setLocalChallanDate('');
      prevFullRef.current = '';
      return;
    }
    if (prevFullRef.current !== formData.challan_rr_no) {
      prevFullRef.current = formData.challan_rr_no;
      const dateMatch = raw.match(/(\d{2}[-/]\d{2}[-/]\d{2,4})$/);
      if (dateMatch) {
        const dVal = dateMatch[1];
        const nVal = raw.substring(0, raw.length - dVal.length).trim();
        setLocalChallanNo(nVal);
        setLocalChallanDate(dVal);
      } else if (!localChallanNo && !localChallanDate) {
        setLocalChallanNo(raw);
        setLocalChallanDate('');
      }
    }
  }, [formData.challan_rr_no]);

  const syncParentChallan = (no: string, date: string) => {
    const cNo = no.trim();
    const cDate = date.trim();
    const combined = cNo && cDate ? `${cNo} ${cDate}` : (cNo || cDate);
    prevFullRef.current = combined;
    handleChange({ target: { name: 'challan_rr_no', value: combined } });
  };

  const formatDateInput = (val: string): string => {
    const digits = val.replace(/\D/g, "");
    if (digits.length === 6) {
      return `${digits.substring(0, 2)}-${digits.substring(2, 4)}-${digits.substring(4, 6)}`;
    }
    if (digits.length === 8) {
      return `${digits.substring(0, 2)}-${digits.substring(2, 4)}-${digits.substring(6, 8)}`;
    }
    if (digits.length === 4) {
      return `${digits.substring(0, 2)}-${digits.substring(2, 4)}-26`;
    }
    return val;
  };
  return (
    <div className="w-full rounded-xl border border-[#F7AFA8] bg-white shadow-xs overflow-visible relative z-30 mt-3">
      {/* Header */}
      <div className="px-4 py-1.5 bg-[#F7AFA8] border-b border-[#FBCFCB] rounded-t-[11px]">
        <h2 className="text-xs font-bold text-white tracking-wide uppercase">
          Receipt Voucher Info
        </h2>
      </div>

      {/* Body */}
      <div
        className="p-3"
        /* onKeyDownCapture={(e) => {
          if (e.key !== "Enter") return;

          const target = e.target as HTMLElement;

          const skipIds = ["po_no_1094", "jci_1151"];

          // Find all focusable fields inside this Receipt Voucher section
          const fields = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>(
              'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => {
            return (
              el.offsetParent !== null &&
              el.tabIndex !== -1 &&
              !el.hasAttribute("disabled")
            );
          });

          const currentIndex = fields.indexOf(target);

          if (currentIndex === -1) return;

          // Find the next field, skipping PO and JCI
          let nextIndex = currentIndex + 1;

          while (
            nextIndex < fields.length &&
            skipIds.includes(fields[nextIndex].id)
          ) {
            nextIndex++;
          }

          if (nextIndex < fields.length) {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();

            fields[nextIndex].focus();
          }
        }} */
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-1.5">

          {/* LEFT COLUMN */}
          <div className="space-y-1.5">

            {/* Temporary M.R No. */}
            <div className="flex items-center gap-2">
              <label htmlFor="arrival_no_1077" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                Temporary M.R No. <span className="text-rose-600 font-black text-sm">*</span>
              </label>
              <input
                id="arrival_no_1077"
                aria-label="Temporary M.R No."
                type="text"
                name="arrival_no"
                value={formData.arrival_no?.startsWith('AR0') ? formData.arrival_no : `AR0${String(formData.arrival_no || '').replace(/^(AR0?|MR0?)/i, '')}`}
                onChange={handleChange}
                autoComplete="off"
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
                className="flex-1 border border-sky-300 rounded bg-[#FDE7E6] text-sky-950 px-2 h-7 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* P.O Number */}
            <div className="flex items-center gap-2 relative">
              <label htmlFor="po_no_1094" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                P.O. Number <span className="text-rose-600 font-black"></span>
              </label>

              <div className="flex-1 flex gap-1 relative overflow-visible">
                <div className="flex-1 flex relative">
                  <input
                    id="po_no_1094"
                    aria-label="P.O. Number"
                    type="text"
                    name="po_no"
                    value={formData.po_no}
                    onChange={(e) => {
                      handleChange(e);
                      setShowPoDropdown(true);
                    }}
                    onFocus={() => {
                      setShowPoDropdown(true);
                      if (purchaseOrders.length === 0) fetchPurchaseOrders();
                    }}
                    tabIndex={-1}
                    onBlur={() => setTimeout(() => setShowPoDropdown(false), 200)}
                    autoComplete="off"
                    placeholder="-- TYPE OR SELECT P.O. * --"
                    style={{ backgroundColor: '#FFFFFF' }}
                    className="w-full border-2 border-rose-300 rounded bg-white text-slate-900 px-2.5 h-7 font-bold uppercase font-mono text-[11px] pr-7 focus:border-rose-500 focus:outline-none"
                  />

                  <div
                    className="absolute right-0 top-0 bottom-0 w-7 flex items-center justify-center cursor-pointer text-gray-500 hover:text-black"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const nextState = !showPoDropdown;
                      setShowPoDropdown(nextState);
                      if (nextState && purchaseOrders.length === 0) fetchPurchaseOrders();
                    }}
                  >
                    <ChevronDown size={14} />
                  </div>
                </div>

                {(() => {
                  const cleanEntered = String(formData.po_no || '').trim().toUpperCase();
                  const closedItem = closedSaudaMap.get(cleanEntered);
                  if (closedItem && !initialData) {
                    return (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2 py-1 rounded">
                        <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                        <span>Sauda {closedItem.po_no} is CLOSED ({closedItem.receivedLorries}/{closedItem.contractLorries} Lorries Received). Reopen by Admin or Level 4 User is required.</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {showPoDropdown && (
                  <div className="absolute top-8 left-0 min-w-0 sm:min-w-[320px] w-full max-w-[calc(100vw-32px)] sm:max-w-[480px] bg-white border-2 border-indigo-600 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[9999]">
                    {purchaseOrders.length === 0 ? (
                      <div className="p-3 text-xs text-gray-500 italic text-center">
                        No active P.O. records found in sauda_check_point
                      </div>
                    ) : (
                      (() => {
                        const filteredList = purchaseOrders.filter(po => {
                          if (!formData.po_no) return true;
                          const search = formData.po_no.toLowerCase().trim();
                          const poNo = String(po.po_no || '').toLowerCase();
                          const supp = String(po.supplier || po.party_name || po.merchant || '').toLowerCase();
                          const brok = String(po.broker || '').toLowerCase();
                          return poNo.includes(search) || supp.includes(search) || brok.includes(search);
                        });

                        if (filteredList.length === 0) {
                          const searchUpper = (formData.po_no || '').trim().toUpperCase();
                          const closedMatch = Array.from(closedSaudaMap.values()).find(
                            c => c.po_no.toUpperCase().includes(searchUpper) || (c.sauda_no && String(c.sauda_no).toUpperCase().includes(searchUpper))
                          );

                          if (closedMatch) {
                            return (
                              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                  <span>Sauda {closedMatch.po_no} is CLOSED</span>
                                </div>
                                <p className="text-[11px] text-amber-900 leading-snug">
                                  All {closedMatch.contractLorries} contracted {closedMatch.contractLorries === 1 ? 'lorry has' : 'lorries have'} been received ({closedMatch.receivedLorries}/{closedMatch.contractLorries}).
                                </p>
                                <p className="text-[10px] font-semibold text-rose-800 bg-white/80 p-1.5 rounded border border-rose-200">
                                  🔒 Closed Saudas are NOT shown for Temporary Arrival. An Admin or Level 4 user must Reopen this Sauda in Sauda Check Point to record further arrivals.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="p-3 text-xs text-gray-500 italic text-center">
                              No matching active P.O. found for "{formData.po_no}"
                            </div>
                          );
                        }

                        return filteredList.map(po => (
                          <div 
                            key={po.po_id || po.po_no} 
                            className="px-2.5 py-1.5 text-xs font-mono cursor-pointer hover:bg-indigo-50 hover:text-indigo-900 uppercase border-b border-gray-100 last:border-b-0 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onSelectPo(po);
                            }}
                          >
                            <div className="flex items-center justify-between font-bold text-indigo-950">
                              <span className="flex items-center gap-1.5">
                                P.O. {po.po_no}
                                {po.is_reopened ? (
                                  <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-sans font-bold flex items-center gap-0.5">
                                    <Unlock className="w-2.5 h-2.5 text-amber-700" />
                                    <span>REOPENED ({po.received_lorries || 0}/{po.contract_lorries || 1} Lorry)</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-sans normal-case">
                                    Sauda Check Point
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-gray-500 font-normal">{po.po_date || ''}</span>
                            </div>
                            <div className="text-[11px] text-gray-600 flex items-center justify-between gap-2 mt-0.5">
                              <span className="truncate">Supp: <strong className="text-gray-800">{po.supplier || po.party_name || po.merchant || 'N/A'}</strong></span>
                              <span className="shrink-0 font-semibold text-emerald-700">{po.total_contract_mt || po.quantity || 0} MT</span>
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Date */}
            <div className="flex items-center gap-2">
              <label htmlFor="date_1140" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                Temporary Date <span className="text-rose-600 font-black text-sm">*</span>
              </label>

              <div className="flex-1 flex gap-2">
                <input
                  id="date_1140"
                  aria-label="Receipt Date"
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="flex-1 border-2 border-rose-300 rounded bg-[#FDE7E6] text-slate-900 px-2 h-7 text-xs font-bold focus:border-rose-500 focus:outline-none"
                />

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-red-700 text-[10px]">J.C.I</span>

                  <select
                    id="jci_1151"
                    aria-label="jci"
                    name="jci"
                    value={formData.jci}
                    onChange={handleChange}
                    className="border border-gray-400 rounded bg-white px-1.5 h-7 text-xs font-bold"
                    tabIndex={-1}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Challan Supplier */}
            <div className="flex items-center gap-2">
              <label htmlFor="challan_supplier_1171" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                Challan Supplier <span className="text-rose-600 font-black text-sm">*</span>
              </label>

              <div className="flex-1">
                <input
                  id="challan_supplier_1171"
                  aria-label="Challan Supplier"
                  type="text"
                  name="challan_supplier"
                  value={formData.challan_supplier}
                  onChange={handleChange}
                  list="challan_supplier_list"
                  placeholder="-- TYPE OR SELECT CHALLAN SUPPLIER --"
                  required
                  className={`w-full border rounded px-2.5 h-7 uppercase font-bold font-mono text-[11px] ${
                    formData.challan_supplier
                      ? 'bg-[#FDE7E6] border-sky-300 text-sky-950'
                      : 'bg-white border-gray-400'
                  }`}
                />

                <datalist id="challan_supplier_list">
                  {suppliers.map((s) => (
                    <option key={s.id || s.supp_name} value={s.supp_name}>
                      {s.supp_name}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Supplier */}
            <div className="flex items-center gap-2">
              <label htmlFor="supplier_1198" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                Supplier <span className="text-rose-600 font-black text-sm">*</span>
              </label>

              <div className="flex-1">
                <input
                  id="supplier_1198"
                  aria-label="Supplier"
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  list="supplier_list"
                  required
                  placeholder="-- TYPE OR SELECT ACTUAL SUPPLIER --"
                  className={`w-full border rounded px-2.5 h-7 uppercase font-bold font-mono text-[11px] ${
                    formData.supplier
                      ? 'bg-[#FDE7E6] border-sky-300 text-sky-950'
                      : 'bg-white border-gray-400'
                  }`}
                />

                <datalist id="supplier_list">
                  {suppliers.map((s) => (
                    <option key={s.id || s.supp_name} value={s.supp_name}>
                      {s.supp_name}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-1.5">

            {/* Broker */}
            <div className="flex items-center gap-2">
              <label htmlFor="broker_1230" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                Broker <span className="text-rose-600 font-black text-sm">*</span>
              </label>

              <div className="flex-1">
                <input
                  id="broker_1230"
                  aria-label="Broker"
                  type="text"
                  name="broker"
                  value={formData.broker}
                  onChange={handleChange}
                  list="broker_list"
                  placeholder="-- TYPE OR SELECT BROKER --"
                  required
                  className={`w-full border rounded px-2.5 h-7 uppercase font-bold font-mono text-[11px] ${
                    formData.broker ? 'bg-[#FDE7E6] border-sky-300 text-sky-950' : 'bg-white border-gray-400'
                  }`}
                />

                <datalist id="broker_list">
                  <option value="DIRECT" />
                  {brokers.map((b) => (
                    <option key={b.id || b.brok_name} value={b.brok_name}>
                      {b.brok_name}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Transporter */}
            <div className="flex items-center gap-2">
              <label htmlFor="transporter_name_1257" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                Transporter Name
              </label>

              <input
                id="transporter_name_1257"
                aria-label="Transporter Name"
                type="text"
                tabIndex={-1}
                name="transporter_name"
                value={formData.transporter_name}
                onChange={handleChange}
                className="flex-1 border border-gray-400 rounded bg-white px-2.5 h-7 text-xs font-bold"
              />
            </div>

            {/* Challan No & Date (Split into 2 inputs) */}
            <div className="flex items-center gap-2">
              <label htmlFor="challan_no_input" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                Challan No & Date. <span className="text-rose-600 font-black text-sm">*</span>
              </label>

              <div className="flex-1 flex gap-1.5">
                <input
                  id="challan_no_input"
                  aria-label="Challan No"
                  type="text"
                  placeholder="CHALLAN NO"
                  value={localChallanNo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalChallanNo(val);
                    syncParentChallan(val, localChallanDate);
                  }}
                  required
                  className="flex-1 border border-gray-400 rounded bg-white px-2.5 h-7 text-xs font-bold uppercase font-mono"
                />

                <input
                  id="challan_date_input"
                  aria-label="Challan Date"
                  type="text"
                  placeholder="DD-MM-YY"
                  value={localChallanDate}
                  onChange={(e) => {
                    let val = e.target.value;
                    const digits = val.replace(/\D/g, "");
                    if (digits.length === 6 || digits.length === 8) {
                      val = formatDateInput(digits);
                    }
                    setLocalChallanDate(val);
                    syncParentChallan(localChallanNo, val);
                  }}
                  onBlur={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    if (formatted !== e.target.value) {
                      setLocalChallanDate(formatted);
                      syncParentChallan(localChallanNo, formatted);
                    }
                  }}
                  className="w-36 border border-gray-400 rounded bg-white px-2 h-7 text-xs font-bold text-center font-mono"
                />
              </div>
            </div>

            {/* Lorry */}
            <div className="flex items-center gap-2">
              <label htmlFor="lorry_prefix_1288" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                Lorry Number <span className="text-rose-600 font-black text-sm">*</span>
              </label>

              <div className="flex-1 flex gap-1.5">
                <input
                  id="lorry_prefix_1288"
                  aria-label="Lorry Number"
                  type="text"
                  name="lorry_prefix"
                  value={formData.lorry_prefix}
                  onChange={handleChange}
                  placeholder="PREFIX"
                  required
                  className="w-24 text-center uppercase border border-gray-400 rounded h-7 text-xs font-bold"
                />

                <input
                  id="lorry_suffix_1297"
                  aria-label="SUFFIX"
                  type="text"
                  name="lorry_suffix"
                  value={formData.lorry_suffix}
                  onChange={handleChange}
                  placeholder="SUFFIX"
                  required
                  className="flex-1 text-center uppercase border border-gray-400 rounded h-7 text-xs font-bold"
                />
              </div>
            </div>

            {/* Pan */}
            <div className="flex items-center gap-2">
              <label htmlFor="pan_no_1314" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                Pan No.
              </label>

              <input
                id="pan_no_1314"
                aria-label="Pan No."
                type="text"
                name="pan_no"
                tabIndex={-1}
                value={formData.pan_no}
                onChange={handleChange}
                className="flex-1 border border-gray-400 rounded bg-white px-2.5 h-7 text-xs font-bold font-mono"
              />
            </div>

            {/* Arrival Date */}
            <div className="flex items-center gap-2">
              <label htmlFor="lorry_date_1329" className="w-36 text-[10px] font-bold text-gray-800 shrink-0">
                Lorry Arrival Date <span className="text-rose-600 font-black text-sm">*</span>
              </label>

              <input
                id="lorry_date_1329"
                aria-label="Lorry Arrival Date"
                type="date"
                name="lorry_date"
                value={formData.lorry_date}
                onChange={handleChange}
                required
                className="flex-1 border border-gray-400 rounded bg-white px-2 h-7 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#F7AFA8]"
              />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
