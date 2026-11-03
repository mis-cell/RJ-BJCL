import React, { useState } from 'react';
import { 
  X, 
  ChevronDown, 
  Search, 
  Printer, 
  Plus, 
  RefreshCcw, 
  Download, 
  Clock, 
  Check, 
  AlertTriangle, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Lock, 
  Unlock, 
  UserCheck, 
  Trash2, 
  TrendingUp, 
  ClipboardList,
  BarChart3
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '../../lib/utils';
import { PaginationControls } from '../PaginationControls';
import { calculateWeightTolerance } from '../../lib/weightTolerance';
import { getCurrentUserContext, isUserAdmin, isL5OrAdmin, isUserId2, isLevel4OrAbove } from '../../lib/permissions';
import { PoHistogramHistoryModal } from './PoHistogramHistoryModal';

export interface PurchaseOrderRegisterViewProps {
  isArchiveView: boolean;
  isTempPo: boolean;
  onClose?: () => void;
  statusFilter: 'all' | 'pending' | 'completed' | 'short' | 'excess' | 'cancelled';
  setStatusFilter: (status: any) => void;
  lorryStatusFilter?: 'all' | 'open' | 'closed';
  setLorryStatusFilter?: (status: 'all' | 'open' | 'closed') => void;
  wtStatusFilter?: 'all' | 'pending_arrival' | 'tolerable' | 'short' | 'excess';
  setWtStatusFilter?: (status: 'all' | 'pending_arrival' | 'tolerable' | 'short' | 'excess') => void;
  totalPendingPos: number;
  totalGeneratedPos: number;
  totalCompletedPos: number;
  totalShortPos: number;
  totalExcessPos: number;
  cumulativeWeight: number;
  statusPieData: any[];
  STATUS_COLORS: string[];
  scopedPos: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  selectedMonth?: string | null;
  setSelectedMonth?: (monthKey: string | null) => void;
  handleCsvDownload: () => void;
  fetchPosAndMasters: () => void;
  loading: boolean;
  handleGlobalAdd: () => void;
  selectedPoNo: string;
  setSelectedPoNo: (poNo: string) => void;
  poList: any[];
  handlePrintPo: (po: any) => void;
  handleDeletePo: (poNo: string) => void;
  handleSort: (col: string) => void;
  renderSortIndicator: (col: string) => React.ReactNode;
  sortedPos: any[];
  filteredPos: any[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  handleLoadSelectedPo: (item: any) => void;
  isPoMismatchResolved: (item: any) => boolean;
  setClosedNoticePo: (po: any) => void;
  openReopenAuthModal: (po: any) => void;
  setAuditViewPo: (po: any) => void;
  handleCloseSauda: (po: any) => void;
  allPayments: any[];
  allSettlements: any[];
  checkIsAdvancePaymentDone: (item: any, paymentsList: any[]) => boolean;
  checkIsSettlementDone: (item: any, settlementsList: any[]) => boolean;
  setExcessShortModalPo: (po: any) => void;
  handlePassToFinal: (item: any) => void;
  actionMenu: any;
  setActionMenu: (menu: any) => void;
  canEditOrDelete: () => boolean;
  sattaBaseRates?: any[];
  allTempArrivals?: any[];
  allInspections?: any[];
}

export const PurchaseOrderRegisterView: React.FC<PurchaseOrderRegisterViewProps> = ({
  isArchiveView,
  isTempPo,
  onClose,
  statusFilter,
  setStatusFilter,
  lorryStatusFilter = 'all',
  setLorryStatusFilter,
  wtStatusFilter = 'all',
  setWtStatusFilter,
  totalPendingPos,
  totalGeneratedPos,
  totalCompletedPos,
  totalShortPos,
  totalExcessPos,
  cumulativeWeight,
  statusPieData,
  STATUS_COLORS,
  scopedPos,
  searchTerm,
  setSearchTerm,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedMonth = null,
  setSelectedMonth,
  handleCsvDownload,
  fetchPosAndMasters,
  loading,
  handleGlobalAdd,
  selectedPoNo,
  setSelectedPoNo,
  poList,
  handlePrintPo,
  handleDeletePo,
  handleSort,
  renderSortIndicator,
  sortedPos,
  filteredPos,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  handleLoadSelectedPo,
  isPoMismatchResolved,
  setClosedNoticePo,
  openReopenAuthModal,
  setAuditViewPo,
  handleCloseSauda,
  allPayments,
  allSettlements,
  checkIsAdvancePaymentDone,
  checkIsSettlementDone,
  setExcessShortModalPo,
  handlePassToFinal,
  actionMenu,
  setActionMenu,
  canEditOrDelete,
  sattaBaseRates = [],
  allTempArrivals = [],
  allInspections = []
}) => {
  const [histogramModalPo, setHistogramModalPo] = useState<any | null>(null);
  const [localLorryFilter, setLocalLorryFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [localWtFilter, setLocalWtFilter] = useState<'all' | 'pending_arrival' | 'tolerable' | 'short' | 'excess'>('all');

  const activeLorryFilter = setLorryStatusFilter ? lorryStatusFilter : localLorryFilter;
  const updateLorryFilter = (val: 'all' | 'open' | 'closed') => {
    if (setLorryStatusFilter) setLorryStatusFilter(val);
    else setLocalLorryFilter(val);
  };

  const activeWtFilter = setWtStatusFilter ? wtStatusFilter : localWtFilter;
  const updateWtFilter = (val: 'all' | 'pending_arrival' | 'tolerable' | 'short' | 'excess') => {
    if (setWtStatusFilter) setWtStatusFilter(val);
    else setLocalWtFilter(val);
  };

  const normalizeDateYMD = (d: any) => {
    if (!d) return '';
    const str = String(d).trim();
    if (str.length >= 10 && str[4] === '-' && str[7] === '-') return str.slice(0, 10);
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return str.slice(0, 10);
  };

  const sortedBaseRates = React.useMemo(() => {
    const baseList = sattaBaseRates || [];
    return baseList
      .map((b: any) => ({
        ymd: normalizeDateYMD(b.start_date || b.start || b.date || ''),
        rate: Number(b.base_rate || b.rate || 0)
      }))
      .filter((b: any) => b.ymd && b.rate > 0)
      .sort((a: any, b: any) => b.ymd.localeCompare(a.ymd));
  }, [sattaBaseRates]);

  const getTd5BaseRateForDate = (dateStr: string): number => {
    const targetYmd = normalizeDateYMD(dateStr);
    if (targetYmd) {
      for (let i = 0; i < sortedBaseRates.length; i++) {
        if (sortedBaseRates[i].ymd <= targetYmd) {
          return sortedBaseRates[i].rate;
        }
      }
    }
    return sortedBaseRates[0]?.rate || 13500;
  };

  const handleRowDoubleClick = (item: any) => {
    const isVoid = item.status === 'cancelled';
    if (isVoid) return;

    const userCtx = getCurrentUserContext();
    const isUser002Only = isUserId2(userCtx) && !isLevel4OrAbove(userCtx);
    if (isUser002Only && isTempPo) {
      return;
    }

    const currentUserRole = (userCtx?.userRole || (userCtx as any)?.role || 'USER').toUpperCase();
    const currentUserLevel = (userCtx?.userLevel || (userCtx as any)?.level || 'L1').toUpperCase();
    const isAdminUser =
      isUserAdmin(userCtx) ||
      currentUserRole === 'ADMIN' ||
      currentUserRole === 'ADMINISTRATOR' ||
      Boolean((userCtx as any)?.isAdmin) ||
      currentUserLevel === 'ADMIN' ||
      currentUserLevel === 'L5' ||
      isL5OrAdmin();

    const contractLorries = item.contract_lorries || item.total_no_of_lorries || 1;
    const receivedLorries = item.received_lorries || 0;
    const isClosed =
      !item.is_reopened &&
      Boolean(item.is_closed || item.status === 'closed' || (contractLorries > 0 && receivedLorries >= contractLorries));

    if (isClosed && !isAdminUser) {
      if (setClosedNoticePo) setClosedNoticePo(item);
      return;
    }

    handleLoadSelectedPo(item);
  };

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    updateLorryFilter('all');
    updateWtFilter('all');
    if (setSelectedMonth) setSelectedMonth(null);
  };

  const paginatedPos = sortedPos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-2">
      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Card 1: Active Pending P.O. */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={cn(
            'rounded-xl px-3 py-2 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between cursor-pointer border',
            statusFilter === 'pending'
              ? 'bg-rose-100/90 border-rose-400 ring-1 ring-rose-400/50'
              : 'bg-gradient-to-br from-rose-50 via-white to-rose-50/60 border-rose-200'
          )}
          title="Filter table by Active Pending P.O."
        >
          <div>
            <p className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">Active Pending P.O.</p>
            <p className="text-lg sm:text-xl font-black text-rose-950 font-mono tabular-nums tracking-tight">{totalPendingPos}</p>
          </div>
          <div className="p-2 bg-rose-100/80 border border-rose-200 rounded-lg text-rose-600">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        {/* Card 2: Total Generated POs */}
        <div
          onClick={() => setStatusFilter('all')}
          className={cn(
            'rounded-xl px-3 py-2 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between cursor-pointer border',
            statusFilter === 'all'
              ? 'bg-blue-100/90 border-blue-400 ring-1 ring-blue-400/50'
              : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50/60 border-blue-200'
          )}
          title="Show all generated P.O records"
        >
          <div>
            <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">Total Generated POs</p>
            <p className="text-lg sm:text-xl font-black text-blue-950 font-mono tabular-nums tracking-tight">{totalGeneratedPos}</p>
          </div>
          <div className="p-2 bg-blue-100/80 border border-blue-200 rounded-lg text-blue-600">
            <ClipboardList className="h-4 w-4" />
          </div>
        </div>

        {/* Card 3: Cumulative PO Weight */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between border border-emerald-200">
          <div>
            <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Cumulative PO Weight</p>
            <p className="text-lg sm:text-xl font-black text-emerald-950 font-mono tabular-nums tracking-tight">
              {cumulativeWeight.toFixed(2)} <span className="text-xs font-bold text-emerald-700">MT</span>
            </p>
          </div>
          <div className="p-2 bg-emerald-100/80 border border-emerald-200 rounded-lg text-emerald-600">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>

        {/* Card 4: Status Mix */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50/60 rounded-xl px-3 py-1.5 shadow-2xs flex items-center justify-between gap-2 border border-purple-200">
          <div className="flex-1 min-w-[85px]">
            <p className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider mb-0.5">Status Mix</p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setStatusFilter('pending')}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer text-[10px] font-bold',
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', statusFilter === 'pending' ? 'bg-white' : 'bg-amber-500')} />
                <span>Pending ({totalPendingPos})</span>
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer text-[10px] font-bold',
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', statusFilter === 'completed' ? 'bg-white' : 'bg-emerald-500')} />
                <span>Completed ({totalCompletedPos})</span>
              </button>
            </div>
          </div>
          <div className="w-12 h-10 relative flex justify-center items-center shrink-0">
            {scopedPos.length === 0 ? (
              <div className="text-purple-400 text-[8.5px] font-bold">No Data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={48} minHeight={38}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={8}
                    outerRadius={16}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index]} stroke="#c084fc" strokeWidth={1} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #c084fc',
                      color: '#1e1b4b',
                      fontSize: '9px',
                      borderRadius: '8px',
                      padding: '2px 6px'
                    }}
                    itemStyle={{ padding: 0, color: '#1e1b4b' }}
                    formatter={(value: any, name: any) => [`${value} POs`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Compact Single-Row / Dual-Zone Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs flex flex-wrap items-center justify-between gap-1.5">
        {/* Left: Search + Dropdown Filters + Date Range + Search/Reset */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {/* Search by PO/PTF No or Broker */}
          <div className="relative min-w-[200px] sm:w-[230px] flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              id="search_by_po_no_broker_na_2911"
              name="search_by_po_no_broker_na"
              aria-label="Search by PO/PTF No or Broker..."
              className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D94B5A] focus:border-[#D94B5A] transition-all"
              placeholder="Search PO / PTF No or Broker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 text-[11px]">
            <span className="text-[9px] font-bold text-slate-500 uppercase">From</span>
            <input
              id="startdate_2921"
              name="startdate"
              aria-label="From Date"
              type="date"
              className="bg-white border border-slate-200 rounded px-1 py-0.5 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#D94B5A]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-[9px] font-bold text-slate-500 uppercase">To</span>
            <input
              id="enddate_2923"
              name="enddate"
              aria-label="To Date"
              type="date"
              className="bg-white border border-slate-200 rounded px-1 py-0.5 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#D94B5A]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            aria-label="Status Filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:border-[#D94B5A] cursor-pointer"
            title="Filter by Status"
          >
            <option value="all">Status: All ({totalGeneratedPos})</option>
            <option value="pending">Pending ({totalPendingPos})</option>
            <option value="completed">Completed ({totalCompletedPos})</option>
            <option value="short">Short Wt ({totalShortPos})</option>
            <option value="excess">Excess Wt ({totalExcessPos})</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Lorry Status Filter */}
          <select
            aria-label="Lorry Status Filter"
            value={activeLorryFilter}
            onChange={(e) => updateLorryFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:border-[#D94B5A] cursor-pointer"
            title="Filter by Lorry Status"
          >
            <option value="all">Lorry: All</option>
            <option value="open">Lorry: Open</option>
            <option value="closed">Lorry: Closed</option>
          </select>

          {/* WT Status Filter */}
          <select
            aria-label="WT Status Filter"
            value={activeWtFilter}
            onChange={(e) => updateWtFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:border-[#D94B5A] cursor-pointer"
            title="Filter by Weight Status"
          >
            <option value="all">WT Status: All</option>
            <option value="pending_arrival">Pending Arrival</option>
            <option value="tolerable">Tolerable</option>
            <option value="short">Short Weight</option>
            <option value="excess">Excess Weight</option>
          </select>

          {/* Search & Reset Buttons */}
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            className="bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Apply Search & Filters"
          >
            <Search className="h-3 w-3" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={handleResetAllFilters}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Reset all search and filter criteria"
          >
            <X className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Right: Primary Action Buttons (New Manual P.O, Export Excel, Refresh) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isTempPo && (
            <button
              type="button"
              onClick={handleGlobalAdd}
              className="bg-[#D94B5A] hover:bg-[#be3b49] text-white px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
              title="Create Manual P.O (PTF)"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>New Manual P.O (PTF)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCsvDownload}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
            title="Export filtered records to Excel / CSV"
          >
            <Download className="h-3 w-3 text-white" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={fetchPosAndMasters}
            disabled={loading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Refresh records"
          >
            <RefreshCcw className={cn('h-3 w-3 text-slate-600', loading && 'animate-spin')} />
            <span className="hidden xl:inline">{loading ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Desktop & Laptop Compact 14-Column Single-Screen Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-2xs overflow-x-auto overflow-y-auto max-h-[calc(100vh-235px)] min-h-[380px] w-full">
        <table className="w-full table-fixed min-w-[1180px] xl:min-w-0 border-collapse text-[11px] text-slate-900">
          <thead className="bg-[#FDE7E6] sticky top-0 z-20 border-b-2 border-[#D94B5A] shadow-2xs">
            <tr className="h-9 text-[#111111] text-[10.5px] font-black uppercase tracking-tight select-none">
              {/* 1. PO / PTF No */}
              <th
                onClick={() => handleSort('po_no')}
                className="w-[8.5%] px-2 py-2 text-left border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by PO / PTF No"
              >
                <div className="flex items-center gap-0.5 truncate">
                  <span>PO / PTF No</span>
                  {renderSortIndicator('po_no')}
                </div>
              </th>

              {/* 2. Date */}
              <th
                onClick={() => handleSort('date')}
                className="w-[6.2%] px-1.5 py-2 text-center border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by Date"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>Date</span>
                  {renderSortIndicator('date')}
                </div>
              </th>

              {/* 3. Type */}
              <th
                onClick={() => handleSort('type')}
                className="w-[6.8%] px-1.5 py-2 text-center border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by Type"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>Type</span>
                  {renderSortIndicator('type')}
                </div>
              </th>

              {/* 4. Broker */}
              <th
                onClick={() => handleSort('broker')}
                className="w-[12.5%] px-2 py-2 text-left border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by Broker"
              >
                <div className="flex items-center gap-0.5 truncate">
                  <span>Broker</span>
                  {renderSortIndicator('broker')}
                </div>
              </th>

              {/* 5. Unit */}
              <th
                onClick={() => handleSort('unit')}
                className="w-[4.5%] px-1 py-2 text-center border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by Unit"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>Unit</span>
                  {renderSortIndicator('unit')}
                </div>
              </th>

              {/* 6. Count */}
              <th
                onClick={() => handleSort('total_units')}
                className="w-[4.5%] px-1.5 py-2 text-right border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by Count"
              >
                <div className="flex items-center justify-end gap-0.5">
                  <span>Count</span>
                  {renderSortIndicator('total_units')}
                </div>
              </th>

              {/* 7. Weight */}
              <th
                onClick={() => handleSort('weight')}
                className="w-[11%] px-2 py-2 text-right border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by Weight (Received / Total Contract MT)"
              >
                <div className="flex items-center justify-end gap-0.5">
                  <span>Weight</span>
                  {renderSortIndicator('weight')}
                </div>
              </th>

              {/* 8. Status */}
              <th
                onClick={() => handleSort('status')}
                className="w-[6.8%] px-1.5 py-2 text-center border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by Status"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>Status</span>
                  {renderSortIndicator('status')}
                </div>
              </th>

              {/* 9. Lorry Status */}
              <th
                onClick={() => handleSort('closed_open')}
                className="w-[7.5%] px-1.5 py-2 text-center border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by Lorry Status (Open / Closed)"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>Lorry Status</span>
                  {renderSortIndicator('closed_open')}
                </div>
              </th>

              {/* 10. WT Status */}
              <th
                onClick={() => handleSort('excess_short')}
                className="w-[9.5%] px-1.5 py-2 text-center border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by WT Status"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>WT Status</span>
                  {renderSortIndicator('excess_short')}
                </div>
              </th>

              {/* 11. Pass/MIS */}
              <th
                onClick={() => handleSort('pass_mismatch')}
                className="w-[6.2%] px-1.5 py-2 text-center border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by Pass / Mismatch"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>Pass/MIS</span>
                  {renderSortIndicator('pass_mismatch')}
                </div>
              </th>

              {/* 12. Stage */}
              <th
                onClick={() => handleSort('stage')}
                className="w-[8.8%] px-1.5 py-2 text-center border-r border-rose-200/80 whitespace-nowrap cursor-pointer hover:bg-[#FBCFCB] transition-colors group"
                title="Sort by Process Stage"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>Stage</span>
                  {renderSortIndicator('stage')}
                </div>
              </th>

              {/* 13. Chart */}
              <th
                className="w-[3.2%] px-1 py-2 text-center border-r border-rose-200/80 whitespace-nowrap bg-[#FBCFCB]/60"
                title="P.O. Histogram & Consignment Analytics"
              >
                <span>Chart</span>
              </th>

              {/* 14. Actions */}
              <th className="w-[4.0%] px-1.5 py-2 text-center whitespace-nowrap bg-[#FDE7E6]">
                <span>Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/80">
            {paginatedPos.map((item, idx) => {
              const isSelected = selectedPoNo === item.po_no;
              const isVoid = item.status === 'cancelled';

              const contract = parseFloat(item.total_contract_mt || 0) || 0;
              const rcvd = Number(item.received_weight_mt || 0);
              const unit = item.purchase_unit_name || item.unit_type || item.unit || 'BALES';
              const tol = item.weight_tolerance || calculateWeightTolerance(contract, rcvd, unit);
              const pct = contract > 0 ? Math.min(100, Math.max(0, (rcvd / contract) * 100)) : 0;

              const contractLorries = item.contract_lorries || item.total_no_of_lorries || 1;
              const receivedLorries = item.received_lorries || 0;
              const isClosed =
                !item.is_reopened &&
                Boolean(item.is_closed || item.status === 'closed' || (contractLorries > 0 && receivedLorries >= contractLorries));
              const isCompleted =
                !item.is_reopened &&
                Boolean(tol.isCompleted || isClosed || item.status === 'completed' || item.status === 'settled');

              const isResolved = isPoMismatchResolved(item);
              const stage =
                item.workflow_stage ||
                (item.pass_status === 'pass' ? 'final_po' : item.pass_status) ||
                'temp_arrival_pending';
              const isMismatch =
                !isResolved &&
                (stage === 'mismatch' ||
                  (item.mismatch_fields && item.mismatch_fields.length > 0) ||
                  Boolean(item.has_mismatch));

              let openRemarksData = item.open_remarks;
              if (typeof openRemarksData === 'string') {
                try {
                  openRemarksData = JSON.parse(openRemarksData);
                } catch (e) {}
              }

              return (
                <tr
                  key={item.po_no}
                  onClick={() => setSelectedPoNo(item.po_no)}
                  onDoubleClick={() => handleRowDoubleClick(item)}
                  className={cn(
                    'h-9 cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-[#FDE7E6]/90 text-slate-950'
                      : isVoid
                      ? 'bg-rose-50/40 text-slate-400 line-through decoration-rose-400/50'
                      : idx % 2 === 0
                      ? 'bg-white hover:bg-rose-50/40'
                      : 'bg-slate-50/60 hover:bg-rose-50/40'
                  )}
                >
                  {/* 1. PO / PTF No */}
                  <td
                    className={cn(
                      'px-2 py-1 font-mono font-bold text-[11px] whitespace-nowrap truncate border-r border-slate-200/80 select-text',
                      isVoid ? 'text-rose-400' : 'text-slate-900'
                    )}
                    title={item.po_no}
                  >
                    {item.po_no}
                  </td>

                  {/* 2. Date */}
                  <td className="px-1.5 py-1 text-center font-mono tabular-nums text-[10.5px] text-slate-700 whitespace-nowrap border-r border-slate-200/80">
                    {new Date(item.po_date).toLocaleDateString('en-GB') || new Date(item.date).toLocaleDateString('en-GB') || new Date(item.created_at).toLocaleDateString('en-GB') || '-'}
                  </td>

                  {/* 3. Type */}
                  <td className="px-1.5 py-1 text-center whitespace-nowrap border-r border-slate-200/80">
                    <span
                      className={cn(
                        'inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-tight leading-none border',
                        item.ptf_no
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      )}
                    >
                      {item.ptf_no ? 'PTF ENTRY' : 'SAUDA LINKED'}
                    </span>
                  </td>

                  {/* 4. Broker (truncate with full name on hover) */}
                  <td
                    className="px-2 py-1 uppercase font-semibold text-[10.5px] text-slate-900 truncate border-r border-slate-200/80"
                    title={item.broker || '-'}
                  >
                    {item.broker || '-'}
                  </td>

                  {/* 5. Unit */}
                  <td className="px-1 py-1 text-center font-bold uppercase text-[10px] text-slate-700 whitespace-nowrap border-r border-slate-200/80">
                    {unit}
                  </td>

                  {/* 6. Count */}
                  <td className="px-1.5 py-1 text-right font-mono tabular-nums font-bold text-[11px] text-slate-900 whitespace-nowrap border-r border-slate-200/80">
                    {item.total_units || 0}
                  </td>

                  {/* 7. Weight (13.360 / 13.360 MT + Red/Grey thin progress bar) */}
                  <td
                    className="px-2 py-1 border-r border-slate-200/80 whitespace-nowrap"
                    title={`Received: ${rcvd.toFixed(3)} MT / Contract: ${contract.toFixed(3)} MT (${pct.toFixed(1)}%)`}
                  >
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center justify-end gap-0.5 font-mono tabular-nums text-[10px] leading-tight">
                        <span className={cn('font-bold', isCompleted ? 'text-rose-700' : 'text-slate-900')}>
                          {rcvd.toFixed(3)}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="font-semibold text-slate-700">{contract.toFixed(3)} MT</span>
                      </div>
                      <div className="mt-1 w-full h-1 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            isCompleted ? 'bg-[#D94B5A]' : 'bg-slate-400'
                          )}
                          style={{ width: `${isCompleted ? 100 : pct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 8. Status (Pending — Orange, Completed — Green) */}
                  <td className="px-1.5 py-1 text-center whitespace-nowrap border-r border-slate-200/80">
                    {isVoid ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Cancelled
                      </span>
                    ) : isMismatch ? (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-300"
                        title="Active Mismatch awaiting resolution"
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                        <span>Mismatch</span>
                      </span>
                    ) : isClosed ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>

                  {/* 9. Lorry Status (OPEN (0/1), CLOSED (1/1) — Force Close/Reopen moved to Actions) */}
                  <td className="px-1.5 py-1 text-center whitespace-nowrap border-r border-slate-200/80">
                    <div className="inline-flex items-center justify-center gap-1">
                      {isClosed ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setClosedNoticePo(item);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono tabular-nums font-bold bg-slate-800 text-amber-300 border border-slate-700 hover:bg-slate-700 transition-colors"
                          title={`CLOSED (${receivedLorries}/${contractLorries} Lorries). Use Actions menu to Reopen.`}
                        >
                          <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span>CLOSED ({receivedLorries}/{contractLorries})</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono tabular-nums font-bold bg-emerald-50 text-emerald-800 border border-emerald-300"
                          title={`OPEN (${receivedLorries}/${contractLorries} Lorries). Use Actions menu to Force Close.`}
                        >
                          <Unlock className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                          <span>OPEN ({receivedLorries}/{contractLorries})</span>
                        </span>
                      )}
                      {openRemarksData && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAuditViewPo(item);
                          }}
                          className="p-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                          title={`Reopened by ${openRemarksData.opened_by} — Click to view audit log`}
                        >
                          <UserCheck className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* 10. WT Status */}
                  <td className="px-1.5 py-1 text-center whitespace-nowrap border-r border-slate-200/80">
                    {(() => {
                      if (rcvd <= 0) {
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExcessShortModalPo(item);
                            }}
                            className="text-[10px] text-slate-400 font-medium italic hover:text-[#D94B5A] transition-colors cursor-pointer"
                            title="No arrival weight recorded yet"
                          >
                            Pending Arrival
                          </button>
                        );
                      }

                      const diffStr = `${tol.diffMt >= 0 ? '+' : ''}${tol.diffMt.toFixed(3)} MT`;

                      if (tol.isWithinTolerance) {
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExcessShortModalPo(item);
                            }}
                            className="inline-flex flex-col items-center justify-center leading-tight cursor-pointer group"
                            title={`Weight Difference: ${diffStr} (Within ±${tol.toleranceMt.toFixed(2)} MT tolerance)`}
                          >
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 group-hover:bg-emerald-100 transition-colors">
                              Tolerable (±{tol.toleranceMt.toFixed(2)} MT)
                            </span>
                            <span className="text-[8px] font-mono tabular-nums text-slate-500 mt-0.5">
                              Diff: {diffStr}
                            </span>
                          </button>
                        );
                      }

                      const saudaDateStr =
                        item.s_date || item.po_date || item.date || item.contract_date || item.created_at?.slice(0, 10) || '';
                      const arrivalDateStr =
                        item.last_arrival_date ||
                        item.arrival_date ||
                        saudaDateStr;

                      const saudaTd5Rate =
                        parseFloat(item.b_rate || 0) > 0 ? parseFloat(item.b_rate) : getTd5BaseRateForDate(saudaDateStr);
                      const arrivalTd5Rate = getTd5BaseRateForDate(arrivalDateStr);
                      const td5RateDiff = Math.abs((arrivalTd5Rate || 0) - (saudaTd5Rate || 0));

                      if (tol.isOverDelivery) {
                        const excessMt = Math.max(0, tol.excessOverToleranceMt || 0);
                        const excessQtl = Math.max(0, tol.excessOverToleranceQtl || 0);
                        const excessRateDiff = (saudaTd5Rate || 0) > (arrivalTd5Rate || 0)
                          ? ((saudaTd5Rate || 0) - (arrivalTd5Rate || 0))
                          : 0;
                        const rawPenalty = excessRateDiff * excessQtl;
                        const penaltyAmount = isNaN(rawPenalty) || rawPenalty < 0 ? 0 : Math.round(rawPenalty * 100) / 100;

                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExcessShortModalPo(item);
                            }}
                            className="inline-flex flex-col items-center justify-center leading-tight cursor-pointer"
                            title={`Excess Weight: +${excessMt.toFixed(3)} MT | Diff: ${diffStr} | ${penaltyAmount > 0 ? `Penalty: ₹${penaltyAmount.toLocaleString()}` : 'Applicable for Sauda (₹0 Deduction)'}`}
                          >
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono tabular-nums font-bold bg-purple-50 text-purple-900 border border-purple-300">
                              +{excessMt.toFixed(2)} MT Excess
                            </span>
                            <span className={cn(
                              "text-[8px] font-mono tabular-nums font-semibold mt-0.5",
                              penaltyAmount > 0 ? "text-rose-700" : "text-emerald-700"
                            )}>
                              {penaltyAmount > 0 ? `Pen: ₹${penaltyAmount.toLocaleString()}` : 'Sauda Rate (₹0)'}
                            </span>
                          </button>
                        );
                      }

                      if (tol.isUnderDelivery) {
                        const shortMt = Math.max(0, tol.shortUnderToleranceMt || 0);
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExcessShortModalPo(item);
                            }}
                            className="inline-flex flex-col items-center justify-center leading-tight cursor-pointer"
                            title={`Short Weight: -${shortMt.toFixed(3)} MT | Diff: ${diffStr}`}
                          >
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono tabular-nums font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              -{shortMt.toFixed(2)} MT Short
                            </span>
                            <span className="text-[8px] font-mono tabular-nums text-amber-700 mt-0.5">
                              Diff: {diffStr}
                            </span>
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExcessShortModalPo(item);
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-pointer"
                          title={`Exact Weight (Diff: ${diffStr})`}
                        >
                          Exact (0.00 MT)
                        </button>
                      );
                    })()}
                  </td>

                  {/* 11. Pass/MIS */}
                  <td className="px-1.5 py-1 text-center whitespace-nowrap border-r border-slate-200/80">
                    {isMismatch ? (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-300"
                        title="Mismatch / Fail Case"
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                        <span>Fail</span>
                      </span>
                    ) : isClosed ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                        <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span>Pass</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Pending
                      </span>
                    )}
                  </td>

                  {/* 12. Stage */}
                  <td className="px-1.5 py-1 text-center whitespace-nowrap border-r border-slate-200/80">
                    {(() => {
                      const isAdvDone = checkIsAdvancePaymentDone(item, allPayments);
                      const isSettlementDone = checkIsSettlementDone(item, allSettlements);

                      if (!isAdvDone) {
                        return (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-700 bg-slate-100 border border-slate-300">
                            <Clock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            <span>Advance Pending</span>
                          </span>
                        );
                      }

                      if (!isClosed) {
                        return (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-300">
                            <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            <span>Lorry Pending</span>
                          </span>
                        );
                      }

                      if (!isSettlementDone) {
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExcessShortModalPo(item);
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 cursor-pointer transition-colors"
                            title="Click to open Weight & Settlement details"
                          >
                            <Clock className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                            <span>Settlement Pending</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isTempPo) handlePassToFinal(item);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-[#D94B5A] hover:bg-[#be3b49] text-white shadow-2xs cursor-pointer transition-all active:scale-95"
                          title="Pass to Final P.O"
                        >
                          <Check className="w-2.5 h-2.5 text-white stroke-[3] shrink-0" />
                          <span>Pass → Final P.O</span>
                        </button>
                      );
                    })()}
                  </td>

                  {/* 13. Chart */}
                  <td className="px-1 py-1 text-center whitespace-nowrap border-r border-slate-200/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistogramModalPo(item);
                      }}
                      className="p-1 rounded-md border border-rose-200 bg-[#FDE7E6] hover:bg-[#FBCFCB] text-[#D94B5A] transition-all inline-flex items-center justify-center cursor-pointer active:scale-95"
                      title={`View P.O. Analytics & Consignment Chart (${item.po_no})`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#D94B5A]" />
                    </button>
                  </td>

                  {/* 14. Actions */}
                  <td className="px-1 py-1 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setActionMenu(
                          actionMenu && actionMenu.item.po_no === item.po_no
                            ? null
                            : { item, x: r.right, y: r.bottom }
                        );
                      }}
                      className={cn(
                        'px-2 py-0.5 rounded-md border font-bold text-[10px] inline-flex items-center justify-center gap-0.5 transition-colors cursor-pointer shadow-2xs',
                        isVoid
                          ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800'
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                      )}
                      title="Open Actions Menu"
                    >
                      <span>Actions</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredPos.length === 0 && (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-500 uppercase font-bold italic text-xs">
                  {loading ? (
                    <div className="inline-flex items-center gap-2 text-[#D94B5A] not-italic font-extrabold">
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                      <span>Loading Sauda Check Point records...</span>
                    </div>
                  ) : (
                    'No Purchase Orders found matching the current filters.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Card View (< md) */}
      <div className="md:hidden space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-0.5">
        {paginatedPos.map((item) => {
          const isSelected = selectedPoNo === item.po_no;
          const isVoid = item.status === 'cancelled';
          const contract = parseFloat(item.total_contract_mt || 0) || 0;
          const rcvd = Number(item.received_weight_mt || 0);
          const unit = item.purchase_unit_name || item.unit_type || item.unit || 'BALES';
          const tol = item.weight_tolerance || calculateWeightTolerance(contract, rcvd, unit);
          const pct = contract > 0 ? Math.min(100, Math.max(0, (rcvd / contract) * 100)) : 0;

          const contractLorries = item.contract_lorries || item.total_no_of_lorries || 1;
          const receivedLorries = item.received_lorries || 0;
          const isClosed =
            !item.is_reopened &&
            Boolean(item.is_closed || item.status === 'closed' || (contractLorries > 0 && receivedLorries >= contractLorries));
          const isCompleted =
            !item.is_reopened &&
            Boolean(tol.isCompleted || isClosed || item.status === 'completed' || item.status === 'settled');

          const isResolved = isPoMismatchResolved(item);
          const stage =
            item.workflow_stage ||
            (item.pass_status === 'pass' ? 'final_po' : item.pass_status) ||
            'temp_arrival_pending';
          const isMismatch =
            !isResolved &&
            (stage === 'mismatch' ||
              (item.mismatch_fields && item.mismatch_fields.length > 0) ||
              Boolean(item.has_mismatch));

          const isAdvDone = checkIsAdvancePaymentDone(item, allPayments);
          const isSettlementDone = checkIsSettlementDone(item, allSettlements);

          return (
            <div
              key={item.po_no}
              onClick={() => setSelectedPoNo(item.po_no)}
              onDoubleClick={() => handleRowDoubleClick(item)}
              className={cn(
                'rounded-xl border p-3 shadow-2xs space-y-2 text-xs transition-colors',
                isSelected ? 'bg-[#FDE7E6]/50 border-[#D94B5A]' : 'bg-white border-slate-200'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-black text-slate-900 text-sm truncate">{item.po_no}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0',
                      item.ptf_no
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    )}
                  >
                    {item.ptf_no ? 'PTF ENTRY' : 'SAUDA LINKED'}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-500 shrink-0">
                  {item.po_date || item.date || item.created_at?.slice(0, 10) || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="truncate font-semibold text-slate-800" title={item.broker}>
                  <span className="text-slate-400 font-normal mr-1">Broker:</span>
                  {item.broker || '-'}
                </div>
                <div className="font-mono font-bold text-slate-800 shrink-0">
                  {item.total_units || 0} {unit}
                </div>
              </div>

              {/* Weight Progress */}
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/80">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-slate-500 font-sans font-semibold">Weight:</span>
                  <span>
                    <strong className={isCompleted ? 'text-rose-700' : 'text-slate-900'}>{rcvd.toFixed(3)}</strong> /{' '}
                    {contract.toFixed(3)} MT
                  </span>
                </div>
                <div className="mt-1 w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', isCompleted ? 'bg-[#D94B5A]' : 'bg-slate-400')}
                    style={{ width: `${isCompleted ? 100 : pct}%` }}
                  />
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {isClosed ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    Completed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                    Pending
                  </span>
                )}

                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono font-bold border',
                    isClosed
                      ? 'bg-slate-800 text-amber-300 border-slate-700'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  )}
                >
                  {isClosed ? `CLOSED (${receivedLorries}/${contractLorries})` : `OPEN (${receivedLorries}/${contractLorries})`}
                </span>

                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setExcessShortModalPo(item);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
                >
                  {rcvd <= 0
                    ? 'Pending Arrival'
                    : tol.isWithinTolerance
                    ? `Tolerable (±${tol.toleranceMt.toFixed(2)} MT)`
                    : tol.isOverDelivery
                    ? `+${Math.max(0, tol.excessOverToleranceMt || 0).toFixed(2)} MT Excess`
                    : `-${Math.max(0, tol.shortUnderToleranceMt || 0).toFixed(2)} MT Short`}
                </span>

                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold border',
                    isMismatch
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : isClosed
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  )}
                >
                  {isMismatch ? 'Fail' : isClosed ? 'Pass' : 'Pending'}
                </span>
              </div>

              {/* Footer: Stage, Chart, Actions */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                <div>
                  {!isAdvDone ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      Advance Pending
                    </span>
                  ) : !isClosed ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      Lorry Pending
                    </span>
                  ) : !isSettlementDone ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExcessShortModalPo(item);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300"
                    >
                      Settlement Pending
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isTempPo) handlePassToFinal(item);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D94B5A] text-white"
                    >
                      Pass → Final P.O
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHistogramModalPo(item);
                    }}
                    className="p-1.5 rounded-lg border border-rose-200 bg-[#FDE7E6] text-[#D94B5A]"
                    title="Open Chart"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setActionMenu(
                        actionMenu && actionMenu.item.po_no === item.po_no
                          ? null
                          : { item, x: r.right, y: r.bottom }
                      );
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg border font-bold text-[10px] inline-flex items-center gap-1',
                      isVoid
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-white border-slate-300 text-slate-800'
                    )}
                  >
                    <span>Actions</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPos.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-bold text-xs uppercase italic">
            No Purchase Orders found matching the current filters.
          </div>
        )}
      </div>

      {/* Pagination / Footer Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-2xs flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Cumulative Weight:</span>
            <span className="text-xs font-black text-slate-900 font-mono tabular-nums">
              {filteredPos.reduce((acc, s) => acc + parseFloat(s.total_contract_mt || 0), 0).toFixed(3)} MT
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Closed P.O.s:</span>
            <span className="text-xs font-black text-emerald-700 font-mono tabular-nums">
              {filteredPos.filter((p) => p.pending === false || p.pending === 'No' || p.is_closed).length} Closed
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Records:</span>
            <span className="text-xs font-black text-slate-900 font-mono tabular-nums">{filteredPos.length} POs</span>
          </div>
        </div>
        <div className="flex-1 max-w-xl">
          <PaginationControls
            currentPage={currentPage}
            totalItems={sortedPos.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Histogram Lifecycle & Story Modal */}
      {histogramModalPo && (
        <PoHistogramHistoryModal
          isOpen={Boolean(histogramModalPo)}
          onClose={() => setHistogramModalPo(null)}
          po={histogramModalPo}
          allPayments={allPayments}
          allSettlements={allSettlements}
          allArrivals={allTempArrivals}
          allInspections={allInspections}
        />
      )}
    </div>
  );
};
