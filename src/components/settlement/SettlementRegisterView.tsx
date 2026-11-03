import React, { useState, useMemo } from "react";
import {
  FileCheck,
  Plus,
  Search,
  X,
  DollarSign,
  Scale,
  RefreshCcw,
  Calculator,
  FileSpreadsheet,
  Eye,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import LegacyLayout from "../LegacyLayout";
import { PaginationControls } from "../PaginationControls";
import { parseRecordDate } from "../../services/dashboardCalculationService";
import { cn, formatIndianCurrency } from "../../lib/utils";

export interface SettlementRegisterViewProps {
  settledList: any[];
  filteredSettles: any[];
  inspections: any[];
  loading: boolean;
  searchFilter: string;
  setSearchFilter: (term: string) => void;
  onOpenCreate: () => void;
  onExportCsv: () => void;
  onRefresh: () => void;
  onOpenView: (mrNo: string) => void;
  onEdit: (mrNo: string) => Promise<void> | void;
  onDelete: (mrNo: string) => void;
  onRevert: (mrNo: string, poNo: string) => void;
  canEditOrDelete: () => boolean;
  isL5OrAdmin: () => boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  onClose?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function sanitizeDateVal(d: any): string {
  if (!d) return '';
  const str = String(d).trim();
  if (!str) return '';
  // Reject corrupt or zero-padded years like 0009-09-12 or 0000-00-00
  if (/^000\d/.test(str) || /^00\d{2}/.test(str)) return '';
  return str;
}

function getSettlementDate(item: any): string {
  if (!item) return '';
  return (
    sanitizeDateVal(item.sett_date) ||
    sanitizeDateVal(item.arrival_date) ||
    sanitizeDateVal(item.payable_bill_date) ||
    sanitizeDateVal(item.po_date) ||
    sanitizeDateVal(item.audit_date) ||
    sanitizeDateVal(item.date) ||
    sanitizeDateVal(item.created_at) ||
    ''
  );
}

function getInspectionDate(item: any): string {
  if (!item) return '';
  return (
    sanitizeDateVal(item.arrival_date) ||
    sanitizeDateVal(item.date) ||
    sanitizeDateVal(item.unloading_date) ||
    sanitizeDateVal(item.mr_date) ||
    sanitizeDateVal(item.created_at) ||
    ''
  );
}

export const SettlementRegisterView: React.FC<SettlementRegisterViewProps> = ({
  settledList,
  filteredSettles,
  inspections,
  loading,
  searchFilter,
  setSearchFilter,
  onOpenCreate,
  onExportCsv,
  onRefresh,
  onOpenView,
  onEdit,
  onDelete,
  onRevert,
  canEditOrDelete,
  isL5OrAdmin,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  onClose,
}) => {
  // Extract all available years from settled records and inspections
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYr = new Date().getFullYear();
    years.add(currentYr);

    settledList.forEach(s => {
      const d = getSettlementDate(s);
      const parsed = parseRecordDate(d);
      if (parsed.isValid && parsed.year >= 2000 && parsed.year <= 2100) {
        years.add(parsed.year);
      }
    });

    inspections.forEach(i => {
      const d = getInspectionDate(i);
      const parsed = parseRecordDate(d);
      if (parsed.isValid && parsed.year >= 2000 && parsed.year <= 2100) {
        years.add(parsed.year);
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [settledList, inspections]);

  // Year and Month selection state
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return availableYears.length > 0 ? availableYears[0] : new Date().getFullYear();
  });

  const activeYear = availableYears.includes(selectedYear) ? selectedYear : (availableYears[0] || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Filter records based on selected Year & Month
  const yearMonthFilteredSettles = useMemo(() => {
    return settledList.filter(s => {
      const d = getSettlementDate(s);
      const parsed = parseRecordDate(d);
      
      if (!parsed.isValid || parsed.year === 0) {
        return selectedMonth === null;
      }

      if (parsed.year !== activeYear) return false;
      if (selectedMonth !== null && parsed.month !== selectedMonth) return false;
      return true;
    });
  }, [settledList, activeYear, selectedMonth]);

  // Filter inspections in active scope for pending audits calculation
  const scopedInspections = useMemo(() => {
    return inspections.filter(i => {
      const d = getInspectionDate(i);
      const parsed = parseRecordDate(d);
      if (!parsed.isValid || parsed.year === 0) {
        return selectedMonth === null;
      }
      if (parsed.year !== activeYear) return false;
      if (selectedMonth !== null && parsed.month !== selectedMonth) return false;
      return true;
    });
  }, [inspections, activeYear, selectedMonth]);

  // Scoped metrics for top KPI cards
  const totalSettledOutflow = useMemo(() => {
    return yearMonthFilteredSettles.reduce((sum, item) => sum + (Number(item.payable_amt) || 0), 0);
  }, [yearMonthFilteredSettles]);

  const avgBillValue = useMemo(() => {
    return yearMonthFilteredSettles.length > 0 ? totalSettledOutflow / yearMonthFilteredSettles.length : 0;
  }, [yearMonthFilteredSettles, totalSettledOutflow]);

  const pendingAuditsCount = useMemo(() => {
    return Math.max(0, scopedInspections.length - yearMonthFilteredSettles.length);
  }, [scopedInspections, yearMonthFilteredSettles]);

  // Search filter across settled records
  const finalFilteredSettles = useMemo(() => {
    // If a search query is active, search across all settled records so no matched MR is hidden by year filters
    let filtered = searchFilter.trim() ? settledList : yearMonthFilteredSettles;

    // Date filter
    if (startDateFilter || endDateFilter) {
      filtered = filtered.filter((s) => {
        const dStr = getSettlementDate(s);
        if (!dStr) return false;

        const settleDate = String(dStr).slice(0, 10);

        if (startDateFilter && settleDate < startDateFilter) {
          return false;
        }

        if (endDateFilter && settleDate > endDateFilter) {
          return false;
        }

        return true;
      });
    }

    // Search filter
    if (searchFilter.trim()) {
      const term = searchFilter.toLowerCase().trim();
      const termDigits = term.replace(/[^0-9]/g, '').replace(/^0+/, '');

      filtered = filtered.filter((s) => {
        const mrStr = String(s.mr_no || '').toLowerCase();
        const poStr = String(s.po_no || '').toLowerCase();
        const supStr = String(s.supplier || '').toLowerCase();
        const brokStr = String(s.broker || '').toLowerCase();
        const lorryStr = String(s.lorry_number || '').toLowerCase();
        const billStr = String(s.payable_bill_no || s.voucher_no || '').toLowerCase();
        const arrStr = String(s.arrival_no || '').toLowerCase();

        // Direct substring search
        if (
          mrStr.includes(term) ||
          poStr.includes(term) ||
          supStr.includes(term) ||
          brokStr.includes(term) ||
          lorryStr.includes(term) ||
          billStr.includes(term) ||
          arrStr.includes(term)
        ) {
          return true;
        }

        // Robust digit token matching (e.g., '1058' matching 'MR01058' or '01058')
        if (termDigits.length >= 2) {
          const mrDigits = mrStr.replace(/[^0-9]/g, '').replace(/^0+/, '');
          const poDigits = poStr.replace(/[^0-9]/g, '').replace(/^0+/, '');
          const billDigits = billStr.replace(/[^0-9]/g, '').replace(/^0+/, '');
          const arrDigits = arrStr.replace(/[^0-9]/g, '').replace(/^0+/, '');

          if (
            mrDigits.includes(termDigits) ||
            poDigits.includes(termDigits) ||
            billDigits.includes(termDigits) ||
            arrDigits.includes(termDigits)
          ) {
            return true;
          }
        }

        return false;
      });
    }

    return filtered;
  }, [
    yearMonthFilteredSettles,
    searchFilter,
    startDateFilter,
    endDateFilter
  ]);

  const activeScopeLabel = selectedMonth !== null
    ? `${MONTH_NAMES[selectedMonth]} ${activeYear}`
    : `FY / Year ${activeYear} (All Months)`;

  return (
    <LegacyLayout title="Settlement" subtitle="" onClose={onClose}>
      <div className="space-y-4">
        {/* Aesthetic Top Stats Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                Settlement KPI Summary
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                {activeScopeLabel}
              </span>
            </div>

            {selectedMonth !== null && (
              <button
                onClick={() => setSelectedMonth(null)}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                Reset to All Months ({activeYear})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            {/* ARCHIVED SETTLEMENTS */}
            <div className="group relative overflow-hidden bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute left-0 top-0 h-full w-1 bg-rose-500" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Archived Settlements
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-800 font-mono">
                    {yearMonthFilteredSettles.length}
                    <span className="ml-1 text-xs font-bold text-slate-500">
                      Accounts
                    </span>
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{activeScopeLabel}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 border border-rose-100 text-rose-600 shrink-0">
                  <FileCheck className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* TOTAL SETTLED OUTFLOW */}
            <div className="group relative overflow-hidden bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Settled Outflow
                  </p>
                  <p className="mt-1 text-lg font-black text-emerald-700 font-mono truncate">
                    ₹ {formatIndianCurrency(totalSettledOutflow)}
                  </p>
                  <p className="text-[9px] text-emerald-600 mt-0.5">Authoritative Net Settle Value</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* AVERAGE BILL VALUE */}
            <div className="group relative overflow-hidden bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Avg Bill Value
                  </p>
                  <p className="mt-1 text-lg font-black text-indigo-700 font-mono truncate">
                    ₹ {formatIndianCurrency(avgBillValue)}
                  </p>
                  <p className="text-[9px] text-indigo-500 mt-0.5">Per M.R. Settlement Account</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                  <Calculator className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* PENDING AUDITS */}
            <div className="group relative overflow-hidden bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Pending Audits
                  </p>
                  <p className="mt-1 text-xl font-black text-amber-700 font-mono">
                    {pendingAuditsCount}
                    <span className="ml-1 text-xs font-bold text-slate-500">
                      Materials
                    </span>
                  </p>
                  <p className="text-[9px] text-amber-600 mt-0.5">Unsettled Arrivals</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 border border-amber-100 text-amber-600 shrink-0">
                  <Scale className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Controls */}
        <div className="flex bg-[#F7AFA8] p-3 border border-[#D94B5A] rounded-lg gap-3 items-center flex-wrap shadow-md">
          {/* SEARCH */}
          <div className="flex bg-white border border-white/30 rounded-md flex-1 min-w-[280px] overflow-hidden shadow-sm">
            <input
              id="query_by_m_r_no_supplier__register"
              name="query_by_m_r_no_supplier_"
              aria-label="Query by M.R. No., Supplier Name, Broker, P.O. No..."
              className="flex-1 text-xs px-3 outline-none py-2 font-sans font-semibold text-slate-700 placeholder:text-slate-400"
              placeholder="Query by M.R. No., Supplier Name, Broker, P.O. No..."
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
            <button className="bg-[#D94B5A] px-3 border-l border-[#F7AFA8] hover:bg-[#0b2b18] transition-colors cursor-pointer" type="button">
              <Search className="h-4 w-4 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg px-2.5 py-1.5">
              
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                From:
              </span>

              <input
                id="startdatefilter_register"
                name="startdatefilter"
                aria-label="Start date filter"
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none"
              />

              <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                To:
              </span>

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

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onOpenCreate}
              type="button"
              className="bg-yellow-400 border border-[#1B5E20] rounded-md px-3.5 py-2 text-[10px] uppercase font-bold text-slate-900 flex items-center gap-1.5 hover:bg-yellow-300 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-slate-900" />
              Create Settlement
            </button>

            <button
              onClick={onExportCsv}
              type="button"
              className="bg-white border border-white/50 rounded-md px-3.5 py-2 text-[10px] uppercase font-bold text-slate-700 flex items-center gap-1.5 hover:bg-blue-50 hover:text-blue-700 shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
              Export CSV
            </button>

            <button
              onClick={() => {
                setStartDateFilter("");
                setEndDateFilter("");
                setSearchFilter("");
              }}
              type="button"
              className="bg-white border border-white/50 rounded-md px-3 py-2 text-[10px] uppercase font-bold text-slate-700 flex items-center gap-1.5 hover:bg-rose-50 hover:text-rose-700 shadow-sm transition-all cursor-pointer"
              title="Clear Search"
            >
              <X className="h-3.5 w-3.5 text-rose-600" />
              Clear
            </button>

            <button
              onClick={onRefresh}
              type="button"
              className="bg-[#D94B5A] hover:bg-[#0b2b18] text-white border border-white/30 rounded-md px-3.5 py-2 text-[10px] uppercase font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              disabled={loading}
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Active Filter Notification Ribbon (if Month is filtered) */}
        {selectedMonth !== null && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 px-3 flex items-center justify-between text-xs font-bold text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>
                Showing {MONTH_NAMES[selectedMonth]} {activeYear} ({finalFilteredSettles.length} Settlements found)
              </span>
            </div>
            <button
              onClick={() => setSelectedMonth(null)}
              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300 text-[10px] uppercase font-black tracking-wider transition-colors cursor-pointer"
            >
              Clear Month Filter (View All)
            </button>
          </div>
        )}

        {/* List Table Grid of settlements */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans min-w-[1000px]">
              <colgroup>
                <col className="w-24" />  {/* M.R. NO. */}
                <col className="w-28" />  {/* AUDIT DATE */}
                <col className="w-44" />  {/* P.O. NO. */}
                <col className="min-w-[160px]" /> {/* SUPPLIER NAME */}
                <col className="min-w-[150px]" /> {/* BROKER NAME */}
                <col className="w-28" />  {/* LORRY NUMBER */}
                <col className="w-32" />  {/* SETTLED AMT */}
                <col className="w-36" />  {/* BILL NO / DATE */}
                <col className="w-24" />  {/* STATUS */}
                <col className="w-28" />  {/* ACTIONS */}
              </colgroup>
              <thead>
                <tr className="bg-[#F7AFA8] text-[10px] font-black uppercase text-white tracking-wide">
                  <th className="px-2.5 py-2 border-r border-white/20 whitespace-nowrap">
                    M.R. No.
                  </th>
                  <th className="px-2.5 py-2 border-r border-white/20 whitespace-nowrap">
                    Audit Date
                  </th>
                  <th className="px-2.5 py-2 border-r border-white/20 whitespace-nowrap">
                    P.O. No.
                  </th>
                  <th className="px-2.5 py-2 border-r border-white/20 whitespace-nowrap">
                    Supplier Name
                  </th>
                  <th className="px-2.5 py-2 border-r border-white/20 whitespace-nowrap">
                    Broker Name
                  </th>
                  <th className="px-2.5 py-2 border-r border-white/20 whitespace-nowrap">
                    Lorry Number
                  </th>
                  <th className="px-2.5 py-2 border-r border-white/20 text-right whitespace-nowrap">
                    Settled Amt
                  </th>
                  <th className="px-2.5 py-2 border-r border-white/20 whitespace-nowrap">
                    Bill No | Date
                  </th>
                  <th className="px-2.5 py-2 border-r border-white/20 text-center whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-2.5 py-2 text-center whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 font-medium">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-8 text-xs font-bold text-slate-500 uppercase tracking-widest italic animate-pulse"
                    >
                      Retrieving Accounts settlement ledger logs from Supabase ...
                    </td>
                  </tr>
                ) : finalFilteredSettles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-8 text-xs font-bold text-slate-400 italic"
                    >
                      No Settled M.R. Records discovered for {activeScopeLabel}.
                    </td>
                  </tr>
                ) : (
                  finalFilteredSettles
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((row) => (
                      <tr
                        key={row.settlement_id || row.mr_no}
                        onDoubleClick={() => onEdit(row.mr_no)}
                        className="hover:bg-emerald-50/70 text-[11px] font-sans transition-colors duration-150 cursor-pointer select-none"
                        title="Double-click to open in Edit mode"
                      >
                        <td className="px-2.5 py-2 border-r border-slate-100 font-bold text-rose-700 whitespace-nowrap">
                          {row.mr_no}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-100 text-slate-600 whitespace-nowrap">
                          {new Date(row.sett_date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-100 font-semibold text-slate-700 whitespace-nowrap">
                          {row.po_no}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-100 text-slate-800 uppercase font-bold whitespace-nowrap truncate max-w-[220px]">
                          {row.supplier}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-100 text-slate-600 whitespace-nowrap truncate max-w-[180px]">
                          {row.broker}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-100 font-mono text-slate-700 whitespace-nowrap">
                          {row.lorry_number ? row.lorry_number.toUpperCase() : ""}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-100 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                          ₹{" "}
                          {Number(row.payable_amt).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-100 font-mono text-slate-500 whitespace-nowrap">
                          {row.payable_bill_no
                            ? `${row.payable_bill_no} | ${new Date(row.payable_bill_date).toLocaleDateString('en-GB') || ""}`
                            : "-"}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-100 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wide ${
                              row.payment_status === "Paid"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : row.payment_status === "Settled"
                                ? "bg-blue-100 text-blue-800 border border-blue-300"
                                : row.payment_status === "Partially Paid"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-rose-100 text-rose-700 border border-rose-300"
                            }`}
                          >
                            {row.payment_status || "Pending"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onOpenView(row.mr_no)}
                              type="button"
                              className="bg-emerald-50 hover:bg-emerald-700 hover:text-white border border-emerald-300 text-emerald-700 rounded px-2 py-1 font-bold text-[9px] uppercase transition-all cursor-pointer flex items-center gap-1"
                              title="View full settlement details & deduction breakdown table"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>

                            {canEditOrDelete() && (
                              <button
                                onClick={() => onDelete(row.mr_no)}
                                type="button"
                                className="bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-300 text-rose-600 rounded px-2 py-1 font-bold text-[9px] uppercase transition-all cursor-pointer"
                                title="Delete Settlement record"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2 p-2 border-t border-slate-100">
            <PaginationControls
              currentPage={currentPage}
              totalItems={finalFilteredSettles.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      </div>
    </LegacyLayout>
  );
};

export default SettlementRegisterView;
