import React from 'react';
import { Search, X, Plus, FileSpreadsheet, Printer } from 'lucide-react';

interface FinalArrivalFilterToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  startDateFilter: string;
  setStartDateFilter: (date: string) => void;
  endDateFilter: string;
  setEndDateFilter: (date: string) => void;
  onNewArrival: () => void;
  onExportCsv: () => void;
  onPrintSelected: () => void;
}

export function FinalArrivalFilterToolbar({
  searchQuery,
  setSearchQuery,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  onNewArrival,
  onExportCsv,
  onPrintSelected
}: FinalArrivalFilterToolbarProps) {
  return (
    <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="search_by_fa_no_mr_no_po"
          name="search_by_fa_no_mr_no_po"
          aria-label="Search by FA No, MR No, PO No, Supplier Name, Lorry..."
          type="text"
          placeholder="Search by FA No, MR No, PO No, Supplier Name, Lorry..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#F7AFA8]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Date Filters */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <div className="flex items-center gap-1.5 bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase">From:</span>
          <input
            id="startdatefilter_register"
            name="startdatefilter"
            aria-label="Start date filter"
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 outline-none"
          />
          <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">To:</span>
          <input
            id="enddatefilter_register"
            name="enddatefilter"
            aria-label="End date filter"
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 outline-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
        <button
          onClick={onNewArrival}
          className="bg-[#F7AFA8] hover:bg-[#D94B5A] text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-[#FBCFCB]"
        >
          <Plus className="w-3.5 h-3.5" /> New Final M.R
        </button>
        <button
          onClick={onExportCsv}
          className="bg-[#FDE7E6] hover:bg-[#FBCFCB] border border-[#F7AFA8] text-[#D94B5A] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
        </button>
        <button
          onClick={onPrintSelected}
          className="bg-white hover:bg-[#FDE7E6] border border-[#FBCFCB] text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" /> Print Selected
        </button>
      </div>
    </div>
  );
}
