import React from 'react';
import { 
  ClipboardList, 
  UserCheck, 
  Calendar, 
  Search, 
  FileSpreadsheet, 
  RefreshCw 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PO_REPORTS } from './types';

interface PurchaseOrderSummaryFiltersProps {
  poReportYear: string;
  setPoReportYear: (y: string) => void;
  financialYears: string[];
  poReportSupplier: string;
  setPoReportSupplier: (s: string) => void;
  reportSuppliersList: string[];
  poReportStartDate: string;
  setPoReportStartDate: (d: string) => void;
  poReportEndDate: string;
  setPoReportEndDate: (d: string) => void;
  poReportSearch: string;
  setPoReportSearch: (s: string) => void;
  activePoReportKey: string;
  setActivePoReportKey: (k: string) => void;
  handleExportCSV: () => void;
  fetchPurchaseOrders: () => void;
  loading: boolean;
  onClearFilters: () => void;
}

export const PurchaseOrderSummaryFilters: React.FC<PurchaseOrderSummaryFiltersProps> = ({
  poReportYear,
  setPoReportYear,
  financialYears,
  poReportSupplier,
  setPoReportSupplier,
  reportSuppliersList,
  poReportStartDate,
  setPoReportStartDate,
  poReportEndDate,
  setPoReportEndDate,
  poReportSearch,
  setPoReportSearch,
  activePoReportKey,
  setActivePoReportKey,
  handleExportCSV,
  fetchPurchaseOrders,
  loading,
  onClearFilters
}) => {
  return (
    <>
      {/* Top Filter Bar */}
      <div className="bg-[#e4e0d8] p-2.5 border-2 border-white shadow-[2px_2px_0_0_rgba(0,0,0,0.15)] flex flex-wrap items-end gap-3 rounded-sm">
        {/* Financial/Calendar Year */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-700 uppercase italic leading-none block ml-1 flex items-center gap-1">
            <ClipboardList className="h-3 w-3 text-teal-800" />
            <span>Financial/Calendar Year</span>
          </label>
          <div className="flex bg-white border border-gray-400 p-px">
            <select
              id="poreportyear_1695"
              name="poreportyear"
              aria-label="Financial/Calendar Year"
              value={poReportYear}
              onChange={(e) => setPoReportYear(e.target.value)}
              className="p-1 px-1.5 text-[11px] font-black outline-none w-36 bg-white cursor-pointer"
            >
              <option value="ALL">-- ALL YEARS --</option>
              {financialYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Merchant / Supplier Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-700 uppercase italic leading-none block ml-1 flex items-center gap-1">
            <UserCheck className="h-3 w-3 text-emerald-800" />
            <span>Merchant / Supplier</span>
          </label>
          <div className="flex bg-white border border-gray-400 p-px">
            <select
              id="poreportsupplier_1715"
              name="poreportsupplier"
              aria-label="Merchant / Supplier"
              value={poReportSupplier}
              onChange={(e) => setPoReportSupplier(e.target.value)}
              className="p-1 px-1.5 text-[11px] font-black outline-none w-44 bg-white cursor-pointer"
            >
              <option value="ALL">-- ALL SUPPLIERS --</option>
              {reportSuppliersList.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Start */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-700 uppercase italic leading-none block ml-1 flex items-center gap-1">
            <Calendar className="h-3 w-3 text-amber-800" />
            <span>Start Date</span>
          </label>
          <div className="flex bg-white border border-gray-400 p-px">
            <input
              id="poreportstartdate_1735"
              name="poreportstartdate"
              aria-label="Start Date"
              type="date"
              value={poReportStartDate}
              onChange={(e) => setPoReportStartDate(e.target.value)}
              className="p-0.5 px-1.5 text-[11px] font-black outline-none w-32 bg-white"
            />
          </div>
        </div>

        {/* Date Range End */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-700 uppercase italic leading-none block ml-1 flex items-center gap-1">
            <Calendar className="h-3 w-3 text-amber-800" />
            <span>End Date</span>
          </label>
          <div className="flex bg-white border border-gray-400 p-px">
            <input
              id="poreportenddate_1751"
              name="poreportenddate"
              aria-label="End Date"
              type="date"
              value={poReportEndDate}
              onChange={(e) => setPoReportEndDate(e.target.value)}
              className="p-0.5 px-1.5 text-[11px] font-black outline-none w-32 bg-white"
            />
          </div>
        </div>

        {/* In-Report Search */}
        <div className="flex-grow space-y-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-gray-700 uppercase italic leading-none block ml-1 flex items-center gap-1">
            <Search className="h-3 w-3 text-slate-800" />
            <span>In-Report Search Filters</span>
          </label>
          <div className="flex bg-white border border-gray-400 p-px">
            <input
              id="query_inside_selection_1767"
              name="query_inside_selection"
              aria-label="Query inside selection..."
              className="flex-1 p-1 text-[11px] font-black outline-none tracking-tight placeholder:text-gray-400"
              placeholder="Query inside selection..."
              value={poReportSearch}
              onChange={(e) => setPoReportSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-[1.5px_1.5px_0_0_black] cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export (CSV)</span>
          </button>

          <button
            type="button"
            onClick={onClearFilters}
            className="bg-rose-700 hover:bg-rose-900 text-white px-2.5 py-1.5 text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-[1px_1px_0_0_black] cursor-pointer"
            title="Reset all Advanced Report filters"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={fetchPurchaseOrders}
            disabled={loading}
            className="bg-[#FBCFCB] border border-white hover:bg-white px-3 py-1.5 text-[10px] font-bold uppercase flex items-center gap-1 shadow-[1px_1px_0_0_black] cursor-pointer"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </button>
        </div>
      </div>
    </>
  );
};

export const PurchaseOrderReportSidebar: React.FC<{
  activePoReportKey: string;
  setActivePoReportKey: (k: string) => void;
}> = ({ activePoReportKey, setActivePoReportKey }) => {
  return (
    <div className="col-span-12 lg:col-span-4 bg-[#FBCFCB] border-2 border-white p-2 flex flex-col shadow-[2px_2px_0_0_rgba(0,0,0,0.15)] h-auto lg:max-h-[500px] overflow-y-auto">
      <div className="text-[9.5px] font-black text-slate-900 border-b border-gray-400 pb-1.5 mb-2 uppercase tracking-tight">
        Select Sourcing Report Format
      </div>
      <div className="space-y-1">
        {PO_REPORTS.map((r) => {
          const isActive = activePoReportKey === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setActivePoReportKey(r.key)}
              className={cn(
                "w-full text-left p-2.5 text-[10px] font-bold flex flex-col justify-start rounded-sm transition-all border cursor-pointer",
                isActive
                  ? "bg-indigo-950 text-white border-slate-950 shadow-inner"
                  : "bg-[#FBCFCB] hover:bg-white text-slate-800 border-gray-300"
              )}
            >
              <span className="uppercase text-[10px] font-black tracking-tight">
                {r.name}
              </span>
              <span
                className={cn(
                  "text-[8px] font-medium mt-0.5 leading-normal",
                  isActive ? "text-slate-300" : "text-gray-500"
                )}
              >
                {r.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
