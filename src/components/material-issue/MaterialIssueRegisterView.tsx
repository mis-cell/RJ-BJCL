import React from 'react';
import { 
  Layers, 
  Calendar, 
  Search, 
  FileSpreadsheet, 
  X, 
  RefreshCw, 
  Plus, 
  FileText, 
  Printer, 
  Edit, 
  Trash2, 
  Check 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PaginationControls } from '../PaginationControls';
import { canEditOrDelete } from '../../lib/permissions';

export interface MaterialIssueRegisterViewProps {
  savedIssues: any[];
  savedDetails: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  startDateFilter: string;
  setStartDateFilter: (val: string) => void;
  endDateFilter: string;
  setEndDateFilter: (val: string) => void;
  selectedRecordId: string | null;
  setSelectedRecordId: (id: string | null) => void;
  loading: boolean;
  successToast: string | null;
  setSuccessToast: (msg: string | null) => void;
  listCurrentPage: number;
  listPageSize: number;
  setListCurrentPage: (p: number) => void;
  setListPageSize: (s: number) => void;
  fetchRecords: () => void;
  handleExportCSV: () => void;
  handleNew: () => void;
  setViewState: (s: 'list' | 'entry') => void;
  loadIssueIntoForm: (r: any) => void;
  handlePreparePrint: (r: any) => void;
  handleDashboardDelete: (issueNo: string) => void;
}

export function MaterialIssueRegisterView({
  savedIssues,
  savedDetails,
  searchQuery,
  setSearchQuery,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  selectedRecordId,
  setSelectedRecordId,
  loading,
  successToast,
  setSuccessToast,
  listCurrentPage,
  listPageSize,
  setListCurrentPage,
  setListPageSize,
  fetchRecords,
  handleExportCSV,
  handleNew,
  setViewState,
  loadIssueIntoForm,
  handlePreparePrint,
  handleDashboardDelete
}: MaterialIssueRegisterViewProps) {
  // Filtered records based on searchQuery, startDateFilter, and endDateFilter
  const filteredRecords = savedIssues.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || (
      (r.issue_no || '').toLowerCase().includes(q) ||
      (r.department || '').toLowerCase().includes(q) ||
      (r.godown || '').toLowerCase().includes(q) ||
      (r.destination_godown || '').toLowerCase().includes(q) ||
      (r.requisition_no || '').toLowerCase().includes(q) ||
      (r.issue_type || '').toLowerCase().includes(q) ||
      (r.stock_group || '').toLowerCase().includes(q) ||
      (r.remarks || '').toLowerCase().includes(q)
    );

    let matchDateRange = true;
    if (startDateFilter && r.date) {
      matchDateRange = matchDateRange && (r.date >= startDateFilter);
    }
    if (endDateFilter && r.date) {
      matchDateRange = matchDateRange && (r.date <= endDateFilter);
    }

    return matchSearch && matchDateRange;
  });

  const filteredIssuesCount = filteredRecords.length;
  
  let totalBalesVal = 0;
  let totalWeightMtVal = 0;

  filteredRecords.forEach(r => {
    const rDetails = savedDetails.filter(d => d.issue_no === r.issue_no);
    totalBalesVal += rDetails.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const totalWeightKgs = rDetails.reduce((sum, item) => sum + (Number(item.weight_kgs) || 0), 0);
    totalWeightMtVal += totalWeightKgs / 1000;
  });

  // Group by Date for Date Wise Summary Card
  const dateWiseMap: { [date: string]: { count: number; packets: number; weight: number } } = {};
  savedIssues.forEach(r => {
    const d = r.date || 'No Date';
    if (!dateWiseMap[d]) {
      dateWiseMap[d] = { count: 0, packets: 0, weight: 0 };
    }
    dateWiseMap[d].count += 1;
    const rDetails = savedDetails.filter(det => det.issue_no === r.issue_no);
    dateWiseMap[d].packets += rDetails.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const kgs = rDetails.reduce((sum, item) => sum + (Number(item.weight_kgs) || 0), 0);
    dateWiseMap[d].weight += (kgs / 1000);
  });

  const dateWiseList = Object.entries(dateWiseMap)
    .map(([date, st]) => ({ date, ...st }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 font-bold text-[11px] text-slate-800">
      {/* Success Toast banner */}
      {successToast && (
        <div className="bg-emerald-50 text-emerald-950 px-3.5 py-2.5 border border-emerald-400 rounded flex items-center justify-between shadow-md">
          <span className="flex items-center gap-1.5 font-black uppercase text-[10px]">
            <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />
            {successToast}
          </span>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-950 font-bold uppercase text-[9px] cursor-pointer">
            [ Dismiss ]
          </button>
        </div>
      )}

      {/* TWO WIDGET PANELS GRID */}
      <div className="grid grid-cols-12 gap-4">
        {/* Card 1: Operational Overview */}
        <div className="col-span-12 md:col-span-4">
          <div className="h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Operational Overview
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                  Current Summary
                </p>
              </div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Filtered Loads
                </p>
                <p className="mt-1 text-lg font-black text-slate-800">
                  {filteredIssuesCount}
                  <span className="ml-1 text-[10px] font-bold text-slate-500">
                    Slips
                  </span>
                </p>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Total Packets
                </p>
                <p className="mt-1 text-lg font-black text-blue-700">
                  {totalBalesVal.toLocaleString()}
                  <span className="ml-1 text-[10px] font-bold text-blue-500">
                    Bales
                  </span>
                </p>
              </div>

              <div className="col-span-2 rounded-lg border border-red-100 bg-red-50/40 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      Total Net Weight
                    </p>
                    <p className="mt-1 text-xl font-black text-red-700">
                      {totalWeightMtVal.toFixed(3)}
                      <span className="ml-1 text-[11px] font-bold text-red-500">
                        MT
                      </span>
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-sm font-black text-red-600">
                      MT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Date Wise Total Issue Report */}
        <div className="col-span-12 md:col-span-8">
          <div className="h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Date Wise Total Issue Report
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    Global Summary
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                Latest Days
              </span>
            </div>

            <div className="flex-1 px-4 pt-3">
              <div className="border border-slate-200 rounded-lg overflow-hidden h-[125px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        Issue Date
                      </th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        Voucher Count
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        Total Bales
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        Net Weight
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dateWiseList.map((rep) => {
                      const isSelectedDate =
                        startDateFilter === rep.date &&
                        endDateFilter === rep.date;

                      return (
                        <tr
                          key={rep.date}
                          className={cn(
                            "cursor-pointer transition-all hover:bg-blue-50",
                            isSelectedDate && "bg-blue-50"
                          )}
                          onClick={() => {
                            setStartDateFilter(rep.date);
                            setEndDateFilter(rep.date);
                          }}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "w-2 h-2 rounded-full bg-indigo-500",
                                  isSelectedDate && "bg-red-500 animate-pulse"
                                )}
                              />
                              <span className="text-[11px] font-bold text-slate-700">
                                {new Date(rep.date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center justify-center min-w-[45px] px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700">
                              {rep.count} Slips
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-[11px] font-black text-indigo-700">
                            {rep.packets}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-[11px] font-black text-red-600">
                              {rep.weight.toFixed(3)}
                              <span className="ml-1 text-[9px] font-bold text-red-400">
                                MT
                              </span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {dateWiseList.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-8 text-slate-400 uppercase font-semibold text-[10px]"
                        >
                          No historical calendar data loaded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 mt-2 border-t border-slate-100 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 font-medium">
                Click on any date row to filter that day&apos;s files in the ledger.
              </span>
              {(startDateFilter || endDateFilter) && (
                <button
                  onClick={() => {
                    setStartDateFilter('');
                    setEndDateFilter('');
                  }}
                  className="self-start sm:self-auto px-3 py-1.5 rounded-md border border-red-200 bg-white text-red-600 text-[10px] font-bold hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer"
                >
                  Clear Date Filter{' '}
                  {startDateFilter === endDateFilter
                    ? `(${new Date(startDateFilter).toLocaleDateString('en-GB')})`
                    : `(${startDateFilter} to ${endDateFilter})`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER STRIP */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-1 min-w-[250px] items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            id="search_by_issue_no_depart_1952"
            name="search_by_issue_no_depart"
            aria-label="Search by Issue No, Department, Godown, Stock Group..."
            className="flex-1 bg-transparent text-xs px-3 py-2 outline-none font-semibold uppercase text-slate-700 placeholder:text-slate-400"
            placeholder="Search by Issue No, Department, Godown, Stock Group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="px-3 border-l border-slate-200 flex items-center justify-center bg-white">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-black uppercase text-slate-400">
              From
            </span>
            <input
              id="startdatefilter_1965"
              name="startdatefilter"
              aria-label="startdatefilter"
              type="date"
              className="bg-white rounded-md border border-slate-200 text-xs px-2 py-1.5 outline-none font-bold text-slate-700 focus:border-blue-400"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
            />
          </div>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-1">
            <span className="text-[9px] font-black uppercase text-slate-400">
              To
            </span>
            <input
              id="enddatefilter_1972"
              name="enddatefilter"
              aria-label="enddatefilter"
              type="date"
              className="bg-white rounded-md border border-slate-200 text-xs px-2 py-1.5 outline-none font-bold text-slate-700 focus:border-blue-400"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
            />
          </div>

          {(startDateFilter || endDateFilter) && (
            <button
              onClick={() => {
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="ml-1 w-7 h-7 rounded-md bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Clear date range"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow cursor-pointer active:scale-95"
            title="Download filtered records as CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <button
            onClick={() => {
              setSearchQuery('');
              setStartDateFilter('');
              setEndDateFilter('');
            }}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Clear Search & Filters"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>

          <button
            onClick={fetchRecords}
            className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-wait"
            disabled={loading}
            title="Refresh database records"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ACTION TOOLBAR */}
      <div className="flex flex-wrap items-stretch justify-end gap-2 my-3 p-2 rounded-xl border border-slate-200 bg-slate-50">
        <button 
          type="button"
          onClick={() => {
            handleNew();
            setViewState('entry');
          }}
          className="group min-w-[125px] h-[58px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-md bg-white/15 group-hover:bg-white/20 flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-bold leading-tight">
              New Issue
            </span>
            <span className="text-[8px] uppercase tracking-wider text-blue-100">
              Create Slip
            </span>
          </div>
        </button>

        <button 
          type="button"
          onClick={handleExportCSV}
          className="group min-w-[125px] h-[58px] px-4 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 flex items-center justify-center">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-bold leading-tight">
              Export CSV
            </span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400">
              Download Data
            </span>
          </div>
        </button>

        <button 
          type="button"
          onClick={fetchRecords}
          className="group min-w-[125px] h-[58px] px-4 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 flex items-center justify-center">
            <RefreshCw className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-bold leading-tight">
              Refresh
            </span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400">
              Database
            </span>
          </div>
        </button>

        <button 
          type="button"
          onClick={() => {
            if (selectedRecordId) {
              const target = savedIssues.find(r => r.issue_no === selectedRecordId);
              if (target) {
                loadIssueIntoForm(target);
              }
            } else {
              alert("Please select a record from the ledger table first.");
            }
          }}
          className="group min-w-[150px] h-[58px] px-4 rounded-lg bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 group-hover:bg-amber-100 flex items-center justify-center">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-bold leading-tight">
              Open Slip
            </span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400">
              Selected Record
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (selectedRecordId) {
              const target = savedIssues.find(r => r.issue_no === selectedRecordId);
              if (target) {
                handlePreparePrint(target);
              }
            } else {
              alert("Please select a record from the ledger table first.");
            }
          }}
          className="group min-w-[150px] h-[58px] px-4 rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3 active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-md bg-white/10 group-hover:bg-white/15 flex items-center justify-center">
            <Printer className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-bold leading-tight">
              Print Slip
            </span>
            <span className="text-[8px] uppercase tracking-wider text-slate-300">
              Selected Record
            </span>
          </div>
        </button>
      </div>

      {/* TOTAL SUMMARY COUNTER LABEL */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Double-click any voucher in the ledger below to load it into the form
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-indigo-100 bg-white px-3 py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Total Filtered Weight
          </span>
          <span className="text-[12px] font-black tabular-nums text-indigo-700">
            {totalWeightMtVal.toFixed(3)}
            <span className="ml-1 text-[9px] text-indigo-400">
              MT
            </span>
          </span>
        </div>
      </div>

      {/* REGISTER LEDGER TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="overflow-x-auto max-h-[420px] rounded-lg border border-slate-200">
          <table className="w-full min-w-[950px] text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-800 text-white">
              <tr className="h-10 border-b border-slate-700">
                <th className="px-3 text-center font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">
                  Voucher Date
                </th>
                <th className="px-3 text-center font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">
                  Issue No
                </th>
                <th className="px-3 text-center font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">
                  Buyer / Dept
                </th>
                <th className="px-3 text-left font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">
                  Destination Godown
                </th>
                <th className="px-3 text-left font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">
                  Source P.O. Number
                </th>
                <th className="px-3 text-left font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">
                  Stock Group
                </th>
                <th className="px-3 text-center font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">
                  Issue Type
                </th>
                <th className="px-3 text-center font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">
                  Shift
                </th>
                <th className="px-3 text-right font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">
                  Qty
                </th>
                <th className="px-3 text-right font-bold text-[10px] uppercase tracking-wide whitespace-nowrap bg-red-900/40">
                  Net Weight (M.T)
                </th>
                <th className="px-3 text-center font-bold text-[10px] uppercase tracking-wide whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredRecords.slice((listCurrentPage - 1) * listPageSize, listCurrentPage * listPageSize).map((r, idx) => {
                const isSelected = selectedRecordId === r.issue_no;
                const formattedDate = r.date
                  ? new Date(r.date).toLocaleDateString('en-GB')
                  : '--';
                const rDetails = savedDetails.filter(d => d.issue_no === r.issue_no);
                const bales = rDetails.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
                const weightMt = rDetails.reduce((sum, item) => sum + (Number(item.weight_kgs) || 0), 0) / 1000;

                return (
                  <tr
                    key={r.issue_no || idx}
                    onClick={() => setSelectedRecordId(r.issue_no || null)}
                    onDoubleClick={() => {
                      setSelectedRecordId(r.issue_no || null);
                      loadIssueIntoForm(r);
                    }}
                    className={cn(
                      "h-11 cursor-pointer group transition-colors duration-150",
                      "hover:bg-blue-50/70",
                      isSelected
                        ? "bg-indigo-50 border-y border-indigo-200 text-indigo-950"
                        : idx % 2 === 0
                          ? "bg-white text-slate-700"
                          : "bg-slate-50/60 text-slate-700"
                    )}
                  >
                    <td className={cn(
                      "text-center px-3 whitespace-nowrap border-r border-slate-100 font-semibold",
                      isSelected ? "text-indigo-700" : "text-slate-500"
                    )}>
                      {formattedDate}
                    </td>

                    <td className="text-center px-3 border-r border-slate-100 font-black text-slate-800 uppercase whitespace-nowrap">
                      {r.issue_no}
                    </td>

                    <td className="text-center px-3 border-r border-slate-100 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex px-2 py-1 rounded-md text-[9px] font-bold uppercase",
                        isSelected ? "bg-indigo-100 text-indigo-800" : "bg-blue-50 text-blue-700"
                      )}>
                        {r.department || '--'}
                      </span>
                    </td>

                    <td className="px-3 truncate uppercase font-sans font-semibold text-left border-r border-slate-100 whitespace-nowrap max-w-[200px] text-slate-700">
                      {r.destination_godown || r.godown || '--'}
                    </td>

                    <td className={cn(
                      "px-3 truncate uppercase font-sans font-semibold text-left border-r border-slate-100 whitespace-nowrap max-w-[180px]",
                      isSelected ? "text-indigo-800" : "text-slate-600"
                    )}>
                      {r.requisition_no || '--'}
                    </td>

                    <td className="px-3 truncate uppercase font-sans text-left border-r border-slate-100 whitespace-nowrap max-w-[150px] text-slate-500">
                      {r.stock_group || '--'}
                    </td>

                    <td className="text-center border-r border-slate-100 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                        {r.issue_type || '--'}
                      </span>
                    </td>

                    <td className="text-center border-r border-slate-100 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center justify-center min-w-[24px] px-2 py-1 rounded-md text-[9px] font-black border",
                        isSelected ? "bg-indigo-100 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-600"
                      )}>
                        {r.mill_shift || 'A'}
                      </span>
                    </td>

                    <td className={cn(
                      "text-right px-3 font-black tabular-nums border-r border-slate-100 whitespace-nowrap",
                      isSelected ? "text-indigo-700" : "text-blue-600"
                    )}>
                      {bales}
                    </td>

                    <td className={cn(
                      "text-right px-3 font-black tabular-nums border-r border-slate-100 whitespace-nowrap",
                      isSelected ? "bg-red-100/60 text-red-800" : "bg-red-50/40 text-red-600"
                    )}>
                      {weightMt.toFixed(3)}
                    </td>

                    <td className="text-center px-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center items-center gap-1">
                        {canEditOrDelete() && (
                          <button
                            onClick={() => loadIssueIntoForm(r)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors cursor-pointer"
                            title="Open & Edit Voucher"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handlePreparePrint(r)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors cursor-pointer"
                          title="Print Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {canEditOrDelete() && (
                          <button
                            onClick={() => handleDashboardDelete(r.issue_no)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                            title="Delete Voucher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center py-14 text-slate-400 font-bold uppercase text-[10px]"
                  >
                    No saved material issue vouchers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2">
          <PaginationControls
            currentPage={listCurrentPage}
            totalItems={filteredRecords.length}
            pageSize={listPageSize}
            onPageChange={setListCurrentPage}
            onPageSizeChange={setListPageSize}
          />
        </div>
      </div>
    </div>
  );
}
