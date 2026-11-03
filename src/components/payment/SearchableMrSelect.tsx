import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getLinkedMrsForPo } from '../../utils/paymentCalculations';

export interface SearchableMrSelectProps {
  selectedMrNo: string;
  onSelectMr: (mrNo: string) => void;
  verifiedArrivals: any[];
  allArrivals?: any[];
  selectedPoNo: string;
}

export const SearchableMrSelect: React.FC<SearchableMrSelectProps> = ({
  selectedMrNo,
  onSelectMr,
  verifiedArrivals,
  allArrivals,
  selectedPoNo
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

  const baseList = selectedPoNo
    ? getLinkedMrsForPo(selectedPoNo, verifiedArrivals)
    : verifiedArrivals;

  const normalizedSearch = searchTerm.toLowerCase().trim();


  const filteredList = baseList.filter((arr) => {
    const mrNo = String(
      arr.mr_no || arr.final_arrival_no || arr.arrival_no || ""
    ).toLowerCase();

    // Show only MR series
    if (!mrNo.startsWith("mr")) return false;

    if (!normalizedSearch) return true;

    const supp = String(arr.supplier || arr.supplier_name || "").toLowerCase();
    const poNo = String(arr.po_no || arr.mill_po_no || "").toLowerCase();
    const lorry = String(arr.lorry_number || "").toLowerCase();

    return (
      mrNo.includes(normalizedSearch) ||
      supp.includes(normalizedSearch) ||
      poNo.includes(normalizedSearch) ||
      lorry.includes(normalizedSearch)
    );
  });

  /* const filteredList = baseList.filter(arr => {
    if (!normalizedSearch) return true;zz
    const mrNo = String(arr.mr_no || arr.final_arrival_no || arr.arrival_no || '').toLowerCase();
    const supp = String(arr.supplier || arr.supplier_name || '').toLowerCase();
    const poNo = String(arr.po_no || arr.mill_po_no || '').toLowerCase();
    const lorry = String(arr.lorry_number || '').toLowerCase();
    return mrNo.includes(normalizedSearch) || supp.includes(normalizedSearch) || poNo.includes(normalizedSearch) || lorry.includes(normalizedSearch);
  }); */

  const masterListToFind = allArrivals || verifiedArrivals;
  const selectedArr = masterListToFind.find(a => {
    const arrMr = String(a.mr_no || a.final_arrival_no || a.arrival_no || a.temporary_arrival_no || a.amad_no || '').trim().toUpperCase();
    const target = String(selectedMrNo).trim().toUpperCase();
    return Boolean(target && (arrMr === target || arrMr.replace(/^MR0*/, '') === target.replace(/^MR0*/, '')));
  });

  const getLabel = () => {
    if (selectedArr) {
      const mr = selectedArr.mr_no || selectedArr.final_arrival_no || selectedArr.arrival_no || selectedArr.temporary_arrival_no || selectedMrNo;
      const supp = selectedArr.supplier || selectedArr.supplier_name || selectedArr.party_name || 'N/A';
      const po = selectedArr.po_no || selectedArr.mill_po_no || 'N/A';
      const lorry = (selectedArr.lorry_number || selectedArr.lorry_no) ? ` | Lorry: ${selectedArr.lorry_number || selectedArr.lorry_no}` : '';
      return `M.R: ${mr} | Supplier: ${supp} | P.O: ${po}${lorry}`;
    }
    if (selectedMrNo) {
      return `M.R: ${selectedMrNo}`;
    }
    return '-- Choose or Search Inspection --';
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          "w-full p-2 border rounded-lg bg-white font-semibold text-slate-900 shadow-sm flex items-center justify-between gap-2 cursor-pointer transition-all text-xs select-none",
          isOpen ? "border-emerald-600 ring-2 ring-emerald-400/30" : "border-emerald-300 hover:border-emerald-400",
          selectedMrNo ? "bg-emerald-50/30" : ""
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Search className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className={cn("truncate font-medium", selectedMrNo ? "text-emerald-900 font-bold" : "text-slate-500")}>
            {getLabel()}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedMrNo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectMr('');
                setSearchTerm('');
              }}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronRight className={cn("w-4 h-4 text-emerald-500 transition-transform duration-200", isOpen ? "rotate-90" : "rotate-0")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-emerald-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-emerald-100 bg-emerald-50/60 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search M.R No, Supplier, P.O, Lorry..."
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

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
            <div
              onClick={() => {
                onSelectMr('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className="p-2.5 hover:bg-slate-50 cursor-pointer text-slate-500 italic font-medium flex items-center justify-between"
            >
              <span>-- Clear Selection --</span>
            </div>

            {filteredList.map((arr, i) => {
              const mr = arr.mr_no || arr.final_arrival_no || arr.arrival_no;
              const isSelected = selectedMrNo === mr;

              return (
                <div
                  key={i}
                  onClick={() => {
                    onSelectMr(mr);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={cn(
                    "p-2.5 cursor-pointer hover:bg-emerald-50/80 transition-colors flex items-center justify-between gap-2",
                    isSelected ? "bg-emerald-100/70 font-bold text-emerald-950" : "text-slate-800"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-slate-900">M.R: {mr}</span>
                      {arr.lorry_number && (
                        <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded font-mono">
                          Lorry: {arr.lorry_number}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">
                      Supplier: <strong className="text-slate-800">{arr.supplier || arr.supplier_name || 'N/A'}</strong> | P.O: {arr.po_no || arr.mill_po_no || 'N/A'}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="p-4 text-center text-slate-500 text-xs italic">
                No Inspection matching &quot;{searchTerm}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
