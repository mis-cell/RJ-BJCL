import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getLinkedMrsForPo, isMrAlreadyProcessed } from '../../utils/paymentCalculations';

export interface SearchablePoSelectProps {
  selectedPoNo: string;
  onSelectPo: (poNo: string) => void;
  displayPos: any[];
  matchedFinalPo?: any;
  isPoEligibleForPayment: (po: any) => boolean;
  verifiedArrivals?: any[];
  paymentList?: any[];
  currentVoucherNo?: string;
}

export const SearchablePoSelect: React.FC<SearchablePoSelectProps> = ({
  selectedPoNo,
  onSelectPo,
  displayPos,
  matchedFinalPo,
  isPoEligibleForPayment,
  verifiedArrivals = [],
  paymentList = [],
  currentVoucherNo
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Only eligible POs are available in the base list
  const baseList = displayPos.filter(po => isPoEligibleForPayment(po));
  const normalizedSearch = searchTerm.toLowerCase().trim();

  const filteredList = baseList.filter(po => {
    if (!normalizedSearch) return true;
    const poNo = String(po.po_no || po.ptf_no || po.sauda_no || '').toLowerCase();
    const supp = String(po.supplier || po.party_name || '').toLowerCase();
    const brok = String(po.broker || '').toLowerCase();
    const mt = String(po.total_contract_mt || po.total_amt || '').toLowerCase();
    return poNo.includes(normalizedSearch) || supp.includes(normalizedSearch) || brok.includes(normalizedSearch) || mt.includes(normalizedSearch);
  });

  const selectedPo = displayPos.find(p => (p.po_no || p.ptf_no || p.sauda_no) === selectedPoNo);

  const getLabel = () => {
    if (selectedPoNo && matchedFinalPo && selectedPoNo === matchedFinalPo.po_no) {
      return `✓ Matched P.O: ${matchedFinalPo.po_no} | ${matchedFinalPo.supplier || matchedFinalPo.party_name || 'Supplier'}`;
    }
    if (selectedPo) {
      const pNo = selectedPo.po_no || selectedPo.ptf_no || selectedPo.sauda_no;
      const supp = selectedPo.supplier || selectedPo.party_name || 'Supplier';
      const brok = selectedPo.broker || 'No Broker';
      const mt = selectedPo.total_contract_mt || selectedPo.total_amt || 0;
      return `${pNo} | ${supp} | ${brok} (${mt} MT)`;
    }
    if (selectedPoNo) {
      return `P.O: ${selectedPoNo}`;
    }
    return '-- Choose or Search P.O --';
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          "w-full p-2 border rounded-lg bg-white font-semibold text-slate-900 shadow-sm flex items-center justify-between gap-2 cursor-pointer transition-all text-xs select-none",
          isOpen ? "border-purple-600 ring-2 ring-purple-400/30" : "border-purple-300 hover:border-purple-400",
          selectedPoNo ? "bg-purple-50/30" : ""
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Search className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span className={cn("truncate font-medium", selectedPoNo ? "text-purple-900 font-bold" : "text-slate-500")}>
            {getLabel()}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedPoNo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPo('');
                setSearchTerm('');
              }}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronRight className={cn("w-4 h-4 text-purple-500 transition-transform duration-200", isOpen ? "rotate-90" : "rotate-0")} />
        </div>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-purple-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-purple-100 bg-purple-50/60 flex items-center gap-2">
            <Search className="w-4 h-4 text-purple-600 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Type P.O No, Supplier, Broker to search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs outline-none bg-transparent font-medium text-slate-900 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
            {/* Clear option */}
            <div
              onClick={() => {
                onSelectPo('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className="p-2.5 hover:bg-slate-50 cursor-pointer text-slate-500 italic font-medium flex items-center justify-between"
            >
              <span>-- Clear Selection --</span>
            </div>

            {/* Matched PO highlight (only if eligible) */}
            {matchedFinalPo && isPoEligibleForPayment(matchedFinalPo) && (!normalizedSearch || matchedFinalPo.po_no.toLowerCase().includes(normalizedSearch) || (matchedFinalPo.supplier || '').toLowerCase().includes(normalizedSearch)) && (
              <div
                onClick={() => {
                  onSelectPo(matchedFinalPo.po_no);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={cn(
                  "p-2.5 cursor-pointer font-semibold flex items-center justify-between transition-colors bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border-l-4 border-emerald-500",
                  selectedPoNo === matchedFinalPo.po_no ? "ring-1 ring-emerald-400" : ""
                )}
              >
                <div>
                  <div className="font-bold flex items-center gap-2 text-emerald-900">
                    <span>✓ Matched P.O: {matchedFinalPo.po_no}</span>
                    <span className="bg-emerald-200 text-emerald-900 text-[10px] px-1.5 py-0.2 rounded font-mono font-black">
                      MATCHED INSPECTION
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    {matchedFinalPo.supplier || matchedFinalPo.party_name} | {matchedFinalPo.broker || 'No Broker'} ({matchedFinalPo.total_contract_mt || matchedFinalPo.total_amt || 0} MT)
                  </div>
                </div>
                {selectedPoNo === matchedFinalPo.po_no && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                )}
              </div>
            )}

            {/* Filtered List */}
            {filteredList.map((po, i) => {
              const poNo = po.po_no || po.ptf_no || po.sauda_no;
              if (matchedFinalPo && isPoEligibleForPayment(matchedFinalPo) && poNo === matchedFinalPo.po_no) return null;

              const isSelected = selectedPoNo === poNo;
              const linkedMrs = getLinkedMrsForPo(po, verifiedArrivals);
              const unpaidMrs = linkedMrs.filter(mr => !isMrAlreadyProcessed(mr, paymentList, currentVoucherNo, poNo).isPaid);

              return (
                <div
                  key={i}
                  onClick={() => {
                    onSelectPo(poNo);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={cn(
                    "p-2.5 cursor-pointer hover:bg-purple-50/80 transition-colors flex items-center justify-between gap-2",
                    isSelected ? "bg-purple-100/70 font-bold text-purple-950" : "text-slate-800"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-slate-900">{poNo}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                        {linkedMrs.length > 0 ? `${unpaidMrs.length} Unpaid M.R${unpaidMrs.length > 1 ? 's' : ''} (${linkedMrs.length} Total)` : 'Pending Payment'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">
                      Supplier: <strong className="text-slate-800">{po.supplier || po.party_name || 'N/A'}</strong> | Broker: {po.broker || 'N/A'} ({po.total_contract_mt || po.total_amt || 0} MT)
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                  )}
                </div>
              );
            })}

            {filteredList.length === 0 && (!matchedFinalPo || !isPoEligibleForPayment(matchedFinalPo) || (normalizedSearch && !matchedFinalPo.po_no.toLowerCase().includes(normalizedSearch))) && (
              <div className="p-4 text-center text-slate-500 text-xs italic">
                {searchTerm ? `No eligible P.O matching "${searchTerm}"` : "No eligible P.O records pending payment."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
