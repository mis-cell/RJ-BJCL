import React from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  RefreshCw, 
  Calendar, 
  Edit, 
  Trash2 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PaginationControls } from '../PaginationControls';
import { DateWiseStockStat } from './types';

export interface MonthlyClosingStockViewProps {
  filteredClosingStocks: any[];
  dateWiseClosingList: DateWiseStockStat[];
  startDateFilter: string;
  setStartDateFilter: (val: string) => void;
  endDateFilter: string;
  setEndDateFilter: (val: string) => void;
  selectedClosingStockId: string | null;
  setSelectedClosingStockId: (id: string | null) => void;
  closingCurrentPage: number;
  setClosingCurrentPage: (p: number) => void;
  closingPageSize: number;
  setClosingPageSize: (s: number) => void;
  totalClosingBales: number;
  totalClosingWt: number;
  totalClosingValue: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onNewRecord: () => void;
  onExportCSV: () => void;
  onPrintSlip: () => void;
  onReload: () => void;
  onEditClosing: (row: any) => void;
  onDeleteClosing: (id: string, name: string) => void;
}

export const MonthlyClosingStockView: React.FC<MonthlyClosingStockViewProps> = ({
  filteredClosingStocks,
  dateWiseClosingList,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  selectedClosingStockId,
  setSelectedClosingStockId,
  closingCurrentPage,
  setClosingCurrentPage,
  closingPageSize,
  setClosingPageSize,
  totalClosingBales,
  totalClosingWt,
  totalClosingValue,
  searchQuery,
  setSearchQuery,
  onNewRecord,
  onExportCSV,
  onPrintSlip,
  onReload,
  onEditClosing,
  onDeleteClosing
}) => {
  return (
    <div className="space-y-3">
      {/* Action Toolbar */}
      <div className="flex items-center gap-2 w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 shadow-sm">
        {/* New Record */}
        <button
          onClick={onNewRecord}
          className="h-8 px-3.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-white rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 stroke-[3]" />
          New Monthly Record
        </button>

        {/* Export */}
        <button
          onClick={onExportCSV}
          title="Download active ledger records as CSV format"
          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Export CSV
        </button>

        {/* Print */}
        <button
          onClick={onPrintSlip}
          className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5 text-slate-600" />
          Print Slip
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 mx-0.5" />

        {/* Search */}
        <div className="flex items-center flex-1 min-w-0 h-8 bg-slate-50 border border-slate-300 rounded-md overflow-hidden focus-within:border-[#F7AFA8] focus-within:ring-1 focus-within:ring-[#F7AFA8]/20 transition-all">
          <div className="flex items-center justify-center w-8 h-full bg-slate-100 border-r border-slate-200 shrink-0">
            <Search className="h-3.5 w-3.5 text-slate-500" />
          </div>

          <input
            id="searchquery_closing"
            name="searchquery"
            aria-label="searchquery"
            className="flex-1 min-w-0 h-full bg-transparent px-2.5 text-[11px] font-semibold text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Search monthly closing ledger latest stock (e.g. Rate, Bales, Variety, Remarks)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="h-full px-2 text-[9px] font-extrabold uppercase text-red-600 hover:bg-red-50 border-l border-slate-200 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Reload */}
        <button
          onClick={onReload}
          className="h-8 px-3 bg-slate-700 hover:bg-slate-800 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
          title="Reload records"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reload
        </button>
      </div>

      {/* Monthly Closing Stocks Ledger Grid layout */}
      <div className="space-y-5 animate-in fade-in duration-100">
        {/* ========================================================= */}
        {/* 1. DATE WISE STOCK REPORT - FULL WIDTH SINGLE BLOCK */}
        {/* ========================================================= */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#F7AFA8] px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-white/10 border border-white/20 flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-white" />
              </div>

              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-white">
                  Date Wise Stock Report
                </div>

                <div className="text-[8px] text-emerald-100 font-semibold">
                  Monthly inventory summary
                </div>
              </div>
            </div>

            <span className="text-[8px] uppercase tracking-wider font-black text-white bg-white/10 border border-white/20 px-2 py-1 rounded">
              Latest Days
            </span>
          </div>

          {/* Date Report Table */}
          <div className="p-3">
            <div className="bg-slate-50 rounded-md border border-slate-200 overflow-hidden">
              <div className="max-h-[220px] overflow-y-auto">
                <table className="w-full text-left text-[9px] border-collapse font-mono">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 sticky top-0 font-black text-slate-500 uppercase">
                      <th className="px-3 py-2 border-r border-slate-200">
                        Stock Date
                      </th>
                      <th className="px-3 py-2 text-center border-r border-slate-200">
                        Entries
                      </th>
                      <th className="px-3 py-2 text-right border-r border-slate-200">
                        Physical Bales
                      </th>
                      <th className="px-3 py-2 text-right border-r border-slate-200">
                        Weight (MT)
                      </th>
                      <th className="px-3 py-2 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {dateWiseClosingList.map((rep) => {
                      const isSelectedDate =
                        startDateFilter === rep.date &&
                        endDateFilter === rep.date;

                      return (
                        <tr
                          key={rep.date}
                          onClick={() => {
                            setStartDateFilter(rep.date);
                            setEndDateFilter(rep.date);
                          }}
                          className={cn(
                            "cursor-pointer transition-colors h-9",
                            isSelectedDate
                              ? "bg-emerald-50"
                              : "bg-white hover:bg-slate-50"
                          )}
                        >
                          {/* Date */}
                          <td className="px-3 font-bold text-slate-700">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full inline-block",
                                  isSelectedDate
                                    ? "bg-red-500 animate-pulse"
                                    : "bg-[#F7AFA8]"
                                )}
                              />
                              {new Date(rep.date).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </div>
                          </td>

                          {/* Entries */}
                          <td className="px-3 text-center font-black text-slate-700 border-l border-slate-100">
                            {rep.count}
                          </td>

                          {/* Bales */}
                          <td className="px-3 text-right font-black text-[#D94B5A] border-l border-slate-100">
                            {rep.quantity.toLocaleString()}
                          </td>

                          {/* Weight */}
                          <td className="px-3 text-right font-black text-emerald-700 border-l border-slate-100">
                            {(rep.weight / 10).toFixed(2)} MT
                          </td>

                          {/* Action */}
                          <td className="px-3 text-right border-l border-slate-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStartDateFilter(rep.date);
                                setEndDateFilter(rep.date);
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all cursor-pointer",
                                isSelectedDate
                                  ? "bg-[#D94B5A] text-white"
                                  : "bg-emerald-50 text-[#D94B5A] hover:bg-[#F7AFA8] hover:text-white"
                              )}
                            >
                              {isSelectedDate ? "Selected" : "View"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {dateWiseClosingList.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-8 text-slate-400 uppercase font-bold text-[9px]"
                        >
                          No closing calendar data loaded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[8px] text-slate-400 font-bold">
                Click any date to load that day's closing stock records.
              </span>

              {(startDateFilter || endDateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDateFilter("");
                    setEndDateFilter("");
                  }}
                  className="px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-black text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. CLOSING STOCK RECORDS - SECOND BLOCK */}
        {/* ========================================================= */}
        <div>
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-[#F7AFA8] px-4 py-2.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black text-white uppercase tracking-wider">
                  Closing Stock Records
                </div>

                <div className="text-[8px] text-emerald-100 font-semibold mt-0.5">
                  Monthly inventory closing details
                </div>
              </div>

              <div className="bg-white/10 border border-white/20 rounded px-2 py-1">
                <span className="text-[8px] font-black text-white uppercase">
                  {filteredClosingStocks.length} Records
                </span>
              </div>
            </div>

            {/* Main Table */}
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full border-collapse text-[10px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 h-9 text-slate-600 uppercase text-left text-[9px]">
                    <th className="px-3 border-r border-slate-200 w-24">Date</th>
                    <th className="px-3 border-r border-slate-200 min-w-[150px]">Godown / Location</th>
                    <th className="px-3 border-r border-slate-200">Commodity</th>
                    <th className="px-3 border-r border-slate-200">Variety</th>
                    <th className="px-3 border-r border-slate-200">Grade Code</th>
                    <th className="px-3 border-r border-slate-200 text-right">Physical Bales</th>
                    <th className="px-3 border-r border-slate-200 text-right">Weight (MT)</th>
                    <th className="px-3 border-r border-slate-200 text-right">Rate / MT</th>
                    <th className="px-3 border-r border-slate-200 text-right">Total Value (Rs.)</th>
                    <th className="px-2 text-center w-20">Actions</th>
                  </tr>
                </thead>

                <tbody className="font-bold text-slate-800">
                  {filteredClosingStocks.length > 0 ? (
                    filteredClosingStocks
                      .slice((closingCurrentPage - 1) * closingPageSize, closingCurrentPage * closingPageSize)
                      .map((row, i) => {
                        const isSelected = selectedClosingStockId === row.id;

                        return (
                          <tr
                            key={row.id || i}
                            onClick={() => setSelectedClosingStockId(row.id || null)}
                            onDoubleClick={() => onEditClosing(row)}
                            className={cn(
                              "h-9 border-b border-slate-100 cursor-pointer transition-all",
                              isSelected
                                ? "bg-[#D94B5A] text-white"
                                : i % 2 === 0
                                  ? "bg-white hover:bg-emerald-50"
                                  : "bg-slate-50/60 hover:bg-emerald-50"
                            )}
                          >
                            <td className="px-3 font-mono">{row.stock_date}</td>
                            <td className="px-3 font-extrabold uppercase truncate max-w-[180px]">
                              {row.godown || "-"}
                            </td>
                            <td className="px-3 uppercase">{row.commodity || "RAW JUTE"}</td>
                            <td className="px-3 uppercase font-extrabold">{row.variety || "TOSSA"}</td>
                            <td className="px-3 uppercase font-black">{row.grade || "-"}</td>
                            <td className="px-3 text-right font-mono">
                              {Number(row.no_of_bales).toLocaleString()}
                            </td>
                            <td className="px-3 text-right font-mono">
                              {(Number(row.weight_qtl) / 10).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-3 text-right font-mono">
                              ₹ {(Number(row.rate_per_qtl) * 10).toFixed(2)}
                            </td>
                            <td className="px-3 text-right font-mono text-xs font-black">
                              ₹{" "}
                              {Number(row.total_value).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center items-center gap-1">
                                <button
                                  onClick={() => onEditClosing(row)}
                                  title="Edit Closing Record"
                                  className="h-6 w-6 flex items-center justify-center rounded-md text-[#D94B5A] hover:bg-emerald-100 cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteClosing(row.id, `${row.grade} @ ${row.godown}`)}
                                  title="Delete Closing Record"
                                  className="h-6 w-6 flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-20 text-center text-slate-400 uppercase italic tracking-wider"
                      >
                        No Monthly Opening Stock records reported.
                        <br />
                        <span className="text-[9px]">Use "New Monthly Record" to register.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-2">
              <PaginationControls
                currentPage={closingCurrentPage}
                totalItems={filteredClosingStocks.length}
                pageSize={closingPageSize}
                onPageChange={setClosingCurrentPage}
                onPageSizeChange={setClosingPageSize}
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. SUMMARY BLOCK - UNDER CLOSING STOCK TABLE */}
          {/* ========================================================= */}
          <div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 shadow-sm">
              <div className="text-[8px] font-black text-slate-400 uppercase">Record Entries</div>
              <div className="mt-1 text-sm font-black text-slate-800">
                {filteredClosingStocks.length}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 shadow-sm">
              <div className="text-[8px] font-black text-slate-400 uppercase">Total Bales</div>
              <div className="mt-1 text-sm font-black text-[#D94B5A]">
                {totalClosingBales.toLocaleString()}
                <span className="text-[8px] ml-1 text-slate-400">BALES</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 shadow-sm">
              <div className="text-[8px] font-black text-slate-400 uppercase">Total Weight</div>
              <div className="mt-1 text-sm font-black text-emerald-700">
                {(totalClosingWt / 10).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
                <span className="text-[8px] ml-1 text-slate-400">MT</span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 shadow-sm">
              <div className="text-[8px] font-black text-emerald-700 uppercase">Store Asset Value</div>
              <div className="mt-1 text-sm font-black text-[#D94B5A]">
                ₹{" "}
                {totalClosingValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
