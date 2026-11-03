import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  FileCheck, 
  Award,
  Search, 
  FileSpreadsheet,
  RefreshCcw, 
  Trash2,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
  X,
  ArrowRight,
  FileText
} from 'lucide-react';
import { PaymentMaster } from '../../types/payment.types';
import { cn, formatIndianCurrency, formatIndianCompactCurrency } from '../../lib/utils';
import { parseRecordDate } from '../../services/dashboardCalculationService';
import { aggregatePremiumsFromTables, filterAggregatedPremiums, normalizeKey } from '../../services/paymentCalculationEngine';
import { PaginationControls } from '../PaginationControls';

export interface PaymentDashboardViewProps {
  paymentList: PaymentMaster[];
  verifiedArrivals: any[];
  purchaseOrders?: any[];
  saudaCheckPoints?: any[];
  searchFilter: string;
  setSearchFilter: (s: string) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  pageSize: number;
  setPageSize: (ps: number) => void;
  loading: boolean;
  onRefresh: () => void;
  onEdit: (p: PaymentMaster) => void;
  onViewLedger: (partyName: string) => void;
  onDelete: (voucherNo: string) => void;
  onExportPdf: (customList?: PaymentMaster[]) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function getPaymentDate(p: PaymentMaster): string {
  return p.payment_date || p.payable_bill_date || p.sett_date || (p as any).payment_settlementdate || p.arrival_date || p.po_date || (p as any).created_at || '';
}

function getArrivalDate(a: any): string {
  return a.arrival_date || a.date || a.unloading_date || a.mr_date || a.gate_entry_date || a.created_at || '';
}

export function PaymentDashboardView({
  paymentList,
  verifiedArrivals,
  purchaseOrders = [],
  saudaCheckPoints = [],
  searchFilter,
  setSearchFilter,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  loading,
  onRefresh,
  onEdit,
  onViewLedger,
  onDelete,
  onExportPdf
}: PaymentDashboardViewProps) {
  // Extract all available years from payment records and arrivals
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYr = new Date().getFullYear();
    years.add(currentYr);

    paymentList.forEach(p => {
      const d = getPaymentDate(p);
      const parsed = parseRecordDate(d);
      if (parsed.isValid && parsed.year >= 2000 && parsed.year <= 2100) {
        years.add(parsed.year);
      }
    });

    verifiedArrivals.forEach(a => {
      const d = getArrivalDate(a);
      const parsed = parseRecordDate(d);
      if (parsed.isValid && parsed.year >= 2000 && parsed.year <= 2100) {
        years.add(parsed.year);
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [paymentList, verifiedArrivals]);
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  // Year and Month selection state
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return availableYears.length > 0 ? availableYears[0] : new Date().getFullYear();
  });

  // Keep selectedYear synced if availableYears updates
  const activeYear = availableYears.includes(selectedYear) ? selectedYear : (availableYears[0] || new Date().getFullYear());

  // Month filter: null = All Months in activeYear, 0-11 = specific month
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Filter records based on selected Year & Month
  const yearMonthFilteredPayments = useMemo(() => {
    return paymentList.filter(p => {
      const d = getPaymentDate(p);
      const parsed = parseRecordDate(d);
      
      // If date is unparseable or year 0, we include it when no specific month is selected or keep in current year
      if (!parsed.isValid || parsed.year === 0) {
        return selectedMonth === null;
      }

      if (parsed.year !== activeYear) return false;
      if (selectedMonth !== null && parsed.month !== selectedMonth) return false;
      return true;
    });
  }, [paymentList, activeYear, selectedMonth]);

  // Verified arrivals in active scope
  const scopedVerifiedArrivals = useMemo(() => {
    return verifiedArrivals.filter(a => {
      const d = getArrivalDate(a);
      const parsed = parseRecordDate(d);
      if (!parsed.isValid || parsed.year === 0) {
        return selectedMonth === null;
      }
      if (parsed.year !== activeYear) return false;
      if (selectedMonth !== null && parsed.month !== selectedMonth) return false;
      return true;
    });
  }, [verifiedArrivals, activeYear, selectedMonth]);

  // Calculate active scope totals (displayed on the top KPI cards)
  const totalPaidSum = useMemo(() => {
    return yearMonthFilteredPayments.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
  }, [yearMonthFilteredPayments]);

  const totalPayableSum = useMemo(() => {
    return yearMonthFilteredPayments.reduce((sum, p) => sum + Number(p.payable_amt || p.total_amount || 0), 0);
  }, [yearMonthFilteredPayments]);

  const totalPendingSum = useMemo(() => {
    return yearMonthFilteredPayments.reduce((sum, p) => {
      const payable = Number(p.payable_amt || p.total_amount || 0);
      const paid = Number(p.paid_amount || 0);
      const pending = payable - paid;
      return sum + (pending > 0 ? pending : 0);
    }, 0);
  }, [yearMonthFilteredPayments]);

  const completedCount = useMemo(() => {
    return yearMonthFilteredPayments.filter(p => {
      const payable = Number(p.payable_amt || p.total_amount || 0);
      const paid = Number(p.paid_amount || 0);
      return (payable > 0 && paid >= payable - 0.01) ||
             (p.status || p.payment_status || '').toLowerCase() === 'completed' ||
             (p.status || p.payment_status || '').toLowerCase() === 'paid';
    }).length;
  }, [yearMonthFilteredPayments]);

  const pendingCount = useMemo(() => {
    return yearMonthFilteredPayments.filter(p => {
      const payable = Number(p.payable_amt || p.total_amount || 0);
      const paid = Number(p.paid_amount || 0);
      return (payable - paid) > 0 || (p.status || p.payment_status || '').toLowerCase() === 'pending';
    }).length;
  }, [yearMonthFilteredPayments]);

  // Robust unified premium aggregation across payment_master and payment_details
  const aggregatedPremiums = useMemo(() => {
    const allDetails = paymentList.flatMap(p => (p as any).details || (p as any).payment_details || (p as any).grid_details || []);
    return aggregatePremiumsFromTables(paymentList, allDetails);
  }, [paymentList]);

  const totalPremiumData = useMemo(() => {
    return filterAggregatedPremiums(aggregatedPremiums, activeYear, selectedMonth);
  }, [aggregatedPremiums, activeYear, selectedMonth]);

  // Combined with text search for the data table
  /* const finalFilteredPayments = useMemo(() => {
    alert('1')
    if (!searchFilter.trim()) return yearMonthFilteredPayments;
    const term = searchFilter.toLowerCase().trim();
    return yearMonthFilteredPayments.filter(p => {
      return (
        (p.voucher_no && p.voucher_no.toLowerCase().includes(term)) ||
        (p.party_name && p.party_name.toLowerCase().includes(term)) ||
        (p.supplier && p.supplier.toLowerCase().includes(term)) ||
        (p.mr_no && p.mr_no.toLowerCase().includes(term)) ||
        (p.po_no && p.po_no.toLowerCase().includes(term)) ||
        (p.reference_no && p.reference_no.toLowerCase().includes(term)) ||
        (p.bank_name && p.bank_name.toLowerCase().includes(term)) ||
        (p.payment_mode && p.payment_mode.toLowerCase().includes(term))
      );
    });
  }, [yearMonthFilteredPayments, searchFilter]); */
  const finalFilteredPayments = useMemo(() => {
    let filtered = yearMonthFilteredPayments;

    // Date filter
    if (startDateFilter || endDateFilter) {
      filtered = filtered.filter((p) => {
        if (!getPaymentDate(p)) return false;

        // Keep only YYYY-MM-DD
        const paymentDate = String(getPaymentDate(p)).slice(0, 10);

        if (startDateFilter && paymentDate < startDateFilter) {
          return false;
        }

        if (endDateFilter && paymentDate > endDateFilter) {
          return false;
        }

        return true;
      });
    }

    // Search filter
    if (searchFilter.trim()) {
      const term = searchFilter.toLowerCase().trim();

      filtered = filtered.filter((p) => {
        return (
          (p.voucher_no && p.voucher_no.toLowerCase().includes(term)) ||
          (p.party_name && p.party_name.toLowerCase().includes(term)) ||
          (p.supplier && p.supplier.toLowerCase().includes(term)) ||
          (p.mr_no && p.mr_no.toLowerCase().includes(term)) ||
          (p.po_no && p.po_no.toLowerCase().includes(term)) ||
          (p.reference_no && p.reference_no.toLowerCase().includes(term)) ||
          (p.bank_name && p.bank_name.toLowerCase().includes(term)) ||
          (p.payment_mode && p.payment_mode.toLowerCase().includes(term))
        );
      });
    }

    return filtered;
  }, [
    yearMonthFilteredPayments,
    searchFilter,
    startDateFilter,
    endDateFilter
  ]);

  // Scope label for UI badges
  const activeScopeLabel = selectedMonth !== null 
    ? `${MONTH_NAMES[selectedMonth]} ${activeYear}` 
    : `FY / Year ${activeYear} (All Months)`;

  const handleExportCsv = () => {
    if (finalFilteredPayments.length === 0) {
      alert("No payment records available to export.");
      return;
    }

    const headers = [
      "Voucher No",
      "Payment Date",
      "Party / Supplier",
      "MR No",
      "PO No",
      "Advance Done",
      "Payable Amount",
      "Paid Amount",
      "Pending / Retention",
      "Premium",
      "Payment Mode",
      "Bank Name",
      "Reference No",
      "Settlement Status",
      "Remarks"
    ];

    const rows = finalFilteredPayments.map(p => {
      const payable = Number(p.payable_amt || p.total_amount || 0);
      const paid = Number(p.paid_amount || 0);
      const pending = payable - paid;
      const isAdvanceYes = (p.advance_payment_done || 'No').toLowerCase() === 'yes';
      const dateStr = getPaymentDate(p);
      const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-IN') : '';

      const cleanMr = normalizeKey(p.mr_no || (p as any).arrival_no);
      const cleanVoucher = normalizeKey(p.voucher_no);
      const mrCleanStripped = cleanMr.replace(/^MR/, '');
      const voucherCleanStripped = cleanVoucher.replace(/^PAY/, '');

      const mrPremSummary = (cleanMr ? aggregatedPremiums.byMrMap.get(cleanMr) : undefined)
        || (cleanVoucher ? aggregatedPremiums.byVoucherMap.get(cleanVoucher) : undefined)
        || (mrCleanStripped ? aggregatedPremiums.byMrMap.get(mrCleanStripped) : undefined)
        || (voucherCleanStripped ? aggregatedPremiums.byVoucherMap.get(voucherCleanStripped) : undefined);

      const directPremFromDetails = Array.isArray((p as any).details)
        ? (p as any).details.reduce((sum: number, d: any) => {
            const qtl = Number(d.quantity_qtl ?? ((Number(d.arr_qty_wt ?? d.wt_quantity ?? 0)) * 10) ?? 0);
            const prem = Number(d.premium ?? d.premium_rate ?? 0);
            const explicitAmt = Number(d.premium_amount ?? d.val_premium_amt ?? 0);
            if (explicitAmt > 0 && Math.abs(explicitAmt - Number(d.amount || 0)) > 1) {
              return sum + explicitAmt;
            }
            return sum + (prem > 0 && qtl > 0 ? prem * qtl : 0);
          }, 0)
        : 0;

      const rowPremium = (mrPremSummary && mrPremSummary.totalPremiumAmount > 0)
        ? mrPremSummary.totalPremiumAmount
        : (directPremFromDetails > 0 ? directPremFromDetails : Number((p as any).val_premium_amt || (p as any).summary_premium_amount || 0));

      let statusText = 'Pending';
      if (payable > 0 && paid >= payable - 0.01) {
        statusText = 'Fully Settled';
      } else if (paid > 0) {
        statusText = 'Partially Settled';
      }

      return [
        `"${p.voucher_no || ''}"`,
        `"${formattedDate}"`,
        `"${(p.party_name || p.supplier || '').replace(/"/g, '""')}"`,
        `"${p.mr_no || ''}"`,
        `"${p.po_no || ''}"`,
        `"${isAdvanceYes ? 'YES' : 'NO'}"`,
        payable.toFixed(2),
        paid.toFixed(2),
        (pending > 0 ? pending : 0).toFixed(2),
        rowPremium.toFixed(2),
        `"${p.payment_mode || ''}"`,
        `"${(p.bank_name || '').replace(/"/g, '""')}"`,
        `"${(p.reference_no || '').replace(/"/g, '""')}"`,
        `"${statusText}"`,
        `"${(p.remarks || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateSuffix = new Date().toISOString().split('T')[0];
    const monthSuffix = selectedMonth !== null ? `_${MONTH_NAMES[selectedMonth]}` : '';
    link.setAttribute('download', `Payment_Operations_${activeYear}${monthSuffix}_${dateSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP EXECUTIVE SUMMARY CARDS (DYNAMIC MONTH-WISE KPI METRICS) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-purple-700" />
              Payment KPI Summary
            </span>
          </div>

          {selectedMonth !== null && (
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Reset to All Months ({activeYear})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Total Vouchers (BJCL Theme Rose) */}
          <div className="bg-gradient-to-br from-rose-50 via-white to-red-50/60 rounded-xl p-3 border border-rose-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Total Vouchers</p>
              <h3 className="text-xl font-black text-rose-950 font-mono mt-0.5 truncate tracking-tight">
                {paymentList.length}
              </h3>
              <p className="text-[9px] text-rose-700 font-semibold mt-0.5 truncate">Vouchers Registered</p>
            </div>
            <div className="p-2.5 bg-rose-100/80 border border-rose-200 rounded-xl text-rose-700 shadow-xs shrink-0 ml-2">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total Paid Amount (Light Emerald/Teal) */}
          <div 
            className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 rounded-xl p-3 border border-emerald-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
            title={`Exact Amount: ${formatIndianCurrency(totalPaidSum)}`}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Total Paid Amount</p>
              <h3 
                className="text-xl font-black text-emerald-950 font-mono mt-0.5 truncate tracking-tight cursor-default"
                title={`Exact: ${formatIndianCurrency(totalPaidSum)}`}
              >
                {formatIndianCompactCurrency(totalPaidSum)}
              </h3>
              <p className="text-[9px] text-emerald-600 font-semibold mt-0.5 truncate">{completedCount} Vouchers Cleared</p>
            </div>
            <div className="p-2.5 bg-emerald-100/80 border border-emerald-200 rounded-xl text-emerald-600 shadow-xs shrink-0 ml-2">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Total Payable Value (Light Purple/Violet) */}
          <div 
            className="bg-gradient-to-br from-purple-50 via-white to-indigo-50/60 rounded-xl p-3 border border-purple-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
            title={`Exact Amount: ${formatIndianCurrency(totalPayableSum)}`}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700">Total Payable Value</p>
              <h3 
                className="text-xl font-black text-purple-950 font-mono mt-0.5 truncate tracking-tight cursor-default"
                title={`Exact: ${formatIndianCurrency(totalPayableSum)}`}
              >
                {formatIndianCompactCurrency(totalPayableSum)}
              </h3>
              <p className="text-[9px] text-purple-600 font-semibold mt-0.5 truncate">Total Gross Invoice Value</p>
            </div>
            <div className="p-2.5 bg-purple-100/80 border border-purple-200 rounded-xl text-purple-600 shadow-xs shrink-0 ml-2">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Pending / Retention (Light Rose) */}
          <div 
            className="bg-gradient-to-br from-rose-50 via-white to-rose-50/60 rounded-xl p-3 border border-rose-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
            title={`Exact Amount: ${formatIndianCurrency(totalPendingSum)}`}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-600" />
                Pending / Retention
              </p>
              <h3 
                className="text-xl font-black text-rose-950 font-mono mt-0.5 truncate tracking-tight cursor-default"
                title={`Exact: ${formatIndianCurrency(totalPendingSum)}`}
              >
                {formatIndianCompactCurrency(totalPendingSum)}
              </h3>
              <p className="text-[9px] text-rose-600 font-semibold mt-0.5 truncate">{pendingCount} Outstanding / Retention</p>
            </div>
            <div className="p-2.5 bg-rose-100/80 border border-rose-200 rounded-xl text-rose-600 shadow-xs shrink-0 ml-2">
              <Clock className="w-5 h-5 text-rose-600" />
            </div>
          </div>

          {/* Card 5: Premium (Light Amber/Orange) */}
          <div 
            className="bg-gradient-to-br from-amber-50 via-white to-orange-50/60 rounded-xl p-3 border border-amber-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
            title={`Exact Amount: ${formatIndianCurrency(totalPremiumData.sum)}`}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Premium</p>
              <h3 
                className="text-xl font-black text-amber-950 font-mono mt-0.5 truncate tracking-tight cursor-default"
                title={`Exact: ${formatIndianCurrency(totalPremiumData.sum)}`}
              >
                {formatIndianCompactCurrency(totalPremiumData.sum)}
              </h3>
              <p className="text-[9px] text-amber-600 font-semibold mt-0.5 truncate">{totalPremiumData.count} MR{totalPremiumData.count !== 1 ? 's' : ''} with Premium</p>
            </div>
            <div className="p-2.5 bg-amber-100/80 border border-amber-200 rounded-xl text-amber-600 shadow-xs shrink-0 ml-2">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH BAR & TOOLBAR */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0 sm:min-w-[240px] w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search_by_voucher_no_payment_dashboard"
            name="search_by_voucher_no_payment_dashboard"
            aria-label="Search by Voucher No, Party Name, M.R No, P.O No, Reference..."
            type="text"
            placeholder="Search by Voucher No, Party Name, M.R No, P.O No, Bank..."
            value={searchFilter}
            onChange={e => {
              setSearchFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export filtered records to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            Export CSV ({finalFilteredPayments.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setStartDateFilter("");
              setEndDateFilter("");
              setSearchFilter("");
            }}
            className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Clear
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Table"
          >
            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin text-purple-600")} />
          </button>
        </div>
      </div>

      {/* Active Filter Notification Ribbon (if Month is filtered) */}
      {selectedMonth !== null && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 px-3 flex items-center justify-between text-xs font-bold text-purple-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-700" />
            <span>
              Showing {MONTH_NAMES[selectedMonth]} {activeYear} ({finalFilteredPayments.length} Payment Vouchers found)
            </span>
          </div>
          <button
            onClick={() => setSelectedMonth(null)}
            className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-300 text-[10px] uppercase font-black tracking-wider transition-colors cursor-pointer"
          >
            Clear Month Filter (View All)
          </button>
        </div>
      )}

      {/* 4. PAYMENT MASTER DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-600" />
            Payment Master Records ({finalFilteredPayments.length})
          </h3>
          <span className="text-[10px] text-slate-500 font-semibold">
            {activeScopeLabel}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] uppercase font-black text-slate-600">
                <th className="p-2.5">Voucher No</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Party / Supplier</th>
                <th className="p-2.5">M.R / P.O Reference</th>
                <th className="p-2.5 text-center">Advance Done?</th>
                <th className="p-2.5 text-right">Payable Amt</th>
                <th className="p-2.5 text-right">Paid Amount</th>
                <th className="p-2.5 text-right">Pending / Retention</th>
                <th className="p-2.5 text-right font-black text-amber-900">Premium</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {finalFilteredPayments.length > 0 ? (
                finalFilteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((p, idx) => {
                  const payable = Number(p.payable_amt || p.total_amount || 0);
                  const paid = Number(p.paid_amount || 0);
                  const pending = payable - paid;
                  const isAdvanceYes = (p.advance_payment_done || 'No').toLowerCase() === 'yes';
                  const dateStr = getPaymentDate(p);

                  const cleanMr = normalizeKey(p.mr_no || (p as any).arrival_no);
                  const cleanVoucher = normalizeKey(p.voucher_no);
                  const mrCleanStripped = cleanMr.replace(/^MR/, '');
                  const voucherCleanStripped = cleanVoucher.replace(/^PAY/, '');

                  const mrPremSummary = (cleanMr ? aggregatedPremiums.byMrMap.get(cleanMr) : undefined)
                    || (cleanVoucher ? aggregatedPremiums.byVoucherMap.get(cleanVoucher) : undefined)
                    || (mrCleanStripped ? aggregatedPremiums.byMrMap.get(mrCleanStripped) : undefined)
                    || (voucherCleanStripped ? aggregatedPremiums.byVoucherMap.get(voucherCleanStripped) : undefined);

                  // Direct calculation from p.details as fallback
                  const directPremFromDetails = Array.isArray((p as any).details)
                    ? (p as any).details.reduce((sum: number, d: any) => {
                        const qtl = Number(d.quantity_qtl ?? ((Number(d.arr_qty_wt ?? d.wt_quantity ?? 0)) * 10) ?? 0);
                        const prem = Number(d.premium ?? d.premium_rate ?? 0);
                        const explicitAmt = Number(d.premium_amount ?? d.val_premium_amt ?? 0);
                        if (explicitAmt > 0 && Math.abs(explicitAmt - Number(d.amount || 0)) > 1) {
                          return sum + explicitAmt;
                        }
                        return sum + (prem > 0 && qtl > 0 ? prem * qtl : 0);
                      }, 0)
                    : 0;

                  const rowPremium = (mrPremSummary && mrPremSummary.totalPremiumAmount > 0)
                    ? mrPremSummary.totalPremiumAmount
                    : (directPremFromDetails > 0 ? directPremFromDetails : Number((p as any).val_premium_amt || (p as any).summary_premium_amount || 0));

                  return (
                    <tr 
                      key={p.payment_id || p.voucher_no || idx} 
                      onDoubleClick={() => onEdit(p)}
                      className="hover:bg-purple-50/60 transition-colors cursor-pointer select-none"
                      title="Double-click to edit record"
                    >
                      <td className="p-2.5 font-bold font-mono text-purple-900">{p.voucher_no}</td>
                      <td className="p-2.5 font-medium text-slate-600">
                        {dateStr ? new Date(dateStr).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {p.party_name || p.supplier || '-'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">
                        <div className="text-[11px] font-bold text-slate-700">{p.mr_no || '-'}</div>
                        {p.po_no && <div className="text-[9px] text-slate-400">P.O: {p.po_no}</div>}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1",
                          isAdvanceYes
                            ? "bg-green-100 text-green-900 border-green-300"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {isAdvanceYes ? '✓ YES' : 'NO'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-700">
                        {formatIndianCurrency(payable)}
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-emerald-700">
                        {formatIndianCurrency(paid)}
                      </td>
                      <td className="p-2.5 text-right">
                        {pending > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {formatIndianCurrency(pending)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                            ₹0 (Cleared)
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-bold">
                        {rowPremium > 0 ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 font-mono shadow-2xs"
                            title={
                              mrPremSummary?.grades && mrPremSummary.grades.length > 0
                                ? mrPremSummary.grades.map(g => `${g.grade}: ${g.quantityQtl} Qtl × ₹${g.premiumRatePerQtl} = ₹${Math.round(g.premiumAmount).toLocaleString('en-IN')}`).join(' | ') + ` | Total: ₹${Math.round(rowPremium).toLocaleString('en-IN')}`
                                : `Total Premium: ₹${Math.round(rowPremium).toLocaleString('en-IN')}`
                            }
                          >
                            ₹{Math.round(rowPremium).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {(() => {
                          const totalVal = Number(p.payable_amt || p.total_amount || 0);
                          const paidVal = Number(p.paid_amount || 0);
                          let statusText = 'Pending';
                          let badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300';

                          if (totalVal > 0 && paidVal >= totalVal - 0.01) {
                            statusText = 'Fully Settled';
                            badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                          } else if (paidVal > 0) {
                            statusText = 'Partially Settled';
                            badgeStyle = 'bg-sky-100 text-sky-800 border-sky-300';
                          } else {
                            statusText = 'Pending';
                            badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300';
                          }

                          return (
                            <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1 shadow-2xs", badgeStyle)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", statusText === 'Fully Settled' ? 'bg-emerald-600' : statusText === 'Partially Settled' ? 'bg-sky-600' : 'bg-amber-600')} />
                              {statusText}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewLedger(p.party_name || p.supplier || '');
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors cursor-pointer"
                            title="View Party Ledger"
                          >
                            Ledger
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(p.voucher_no);
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors cursor-pointer flex items-center gap-1"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 italic text-xs">
                    No payment records found for {activeScopeLabel}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2">
          <PaginationControls
            currentPage={currentPage}
            totalItems={finalFilteredPayments.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  );
}
