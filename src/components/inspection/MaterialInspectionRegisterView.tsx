import React from "react";
import {
  Search,
  Plus,
  X,
  RefreshCcw,
  Printer,
  FileSpreadsheet,
  Edit,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { PaginationControls } from "../PaginationControls";
import { enforceEditOrDeletePermission, canEditOrDelete } from "../../lib/permissions";
import { safeRenderText } from "../../types/inspection.types";

export interface MaterialInspectionRegisterViewProps {
  savedInspections: any[];
  filteredSavedInspections: any[];
  filteredPendingMrList: any[];
  arrivalVouchers: any[];
  purchaseOrders: any[];
  finalArrivals: any[];
  searchFilter: string;
  setSearchFilter: (s: string) => void;
  arrivalStartDate: string;
  setArrivalStartDate: (s: string) => void;
  arrivalEndDate: string;
  setArrivalEndDate: (s: string) => void;
  currentTab: "inspections" | "pending_mr";
  setCurrentTab: (t: "inspections" | "pending_mr") => void;
  visibleColumns: Record<string, boolean>;
  setVisibleColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedMrNos: string[];
  setSelectedMrNos: React.Dispatch<React.SetStateAction<string[]>>;
  printedInspections: Record<string, boolean>;
  expandedMrNo: string | null;
  setExpandedMrNo: React.Dispatch<React.SetStateAction<string | null>>;
  expandedDetails: Record<string, any[]>;
  handleToggleExpand: (row: any) => Promise<void>;
  loadInspectionIntoForm: (row: any) => void;
  setIsEditMode: (b: boolean) => void;
  setViewMode: (mode: "dashboard" | "entry") => void;
  handlePreparePrintInspection: (row: any, e?: React.MouseEvent) => void;
  handleBatchPrint: () => void;
  handleExportCsv: () => void;
  handleRefreshDatabase: () => void;
  deleteInspectionPermanently: (row: any) => Promise<void>;
  loadSavedInspectionsList: () => Promise<void>;
  setSuccessMessage: (msg: string) => void;
  setLoading: (b: boolean) => void;
  loading: boolean;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  pendingCurrentPage: number;
  setPendingCurrentPage: (p: number) => void;
  pendingPageSize: number;
  setPendingPageSize: (s: number) => void;
  initialMasterState: () => any;
  createEmptyRow: (srl: number) => any;
  setMasterData: React.Dispatch<React.SetStateAction<any>>;
  setDetailsList: React.Dispatch<React.SetStateAction<any[]>>;
  setErrorMessage: (m: string) => void;
  handleAutoFillFromVoucher: (v: any) => void;
}

export const MaterialInspectionRegisterView: React.FC<MaterialInspectionRegisterViewProps> = ({
  savedInspections,
  filteredSavedInspections,
  filteredPendingMrList,
  arrivalVouchers,
  purchaseOrders,
  finalArrivals,
  searchFilter,
  setSearchFilter,
  arrivalStartDate,
  setArrivalStartDate,
  arrivalEndDate,
  setArrivalEndDate,
  currentTab,
  setCurrentTab,
  visibleColumns,
  setVisibleColumns,
  selectedMrNos,
  setSelectedMrNos,
  printedInspections,
  expandedMrNo,
  setExpandedMrNo,
  expandedDetails,
  handleToggleExpand,
  loadInspectionIntoForm,
  setIsEditMode,
  setViewMode,
  handlePreparePrintInspection,
  handleBatchPrint,
  handleExportCsv,
  handleRefreshDatabase,
  deleteInspectionPermanently,
  loadSavedInspectionsList,
  setSuccessMessage,
  setLoading,
  loading,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  pendingCurrentPage,
  setPendingCurrentPage,
  pendingPageSize,
  setPendingPageSize,
  initialMasterState,
  createEmptyRow,
  setMasterData,
  setDetailsList,
  setErrorMessage,
  handleAutoFillFromVoucher,
}) => {
  const [isColumnMenuOpen, setIsColumnMenuOpen] = React.useState(false);
  const columnMenuRef = React.useRef<HTMLDivElement>(null);

  const totalInspections = savedInspections.length;
  const avgMoisture =
    totalInspections > 0
      ? savedInspections.reduce(
          (sum, item) => sum + (Number(item.actual_moisture) || 0),
          0,
        ) / totalInspections
      : 0;
  const avgDust =
    totalInspections > 0
      ? savedInspections.reduce(
          (sum, item) => sum + (Number(item.actual_dust) || 0),
          0,
        ) / totalInspections
      : 0;

  const totalContractWeight = purchaseOrders.reduce((sum, po) => sum + (Number(po.total_contract_mt) || 0), 0);
  const totalPendingWeight = purchaseOrders.reduce((sum, po) => sum + (Number(po.pending_received) || 0), 0);
  const totalReceivedWeight = Math.max(0, totalContractWeight - totalPendingWeight);

  const getVoucherForInspection = (row: any) => {
    if (!row.arrival_no) return null;
    return arrivalVouchers.find(
      (v) => (v.temporary_arrival_no || v.amad_no || '').trim().toLowerCase() === (row.arrival_no || '').trim().toLowerCase()
    );
  };

  return (
    <div className="w-full px-2 space-y-3 font-sans max-w-full">
      {/* Dashboard KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3 w-full min-w-0">
        {/* Quality Audits */}
        <div className="relative overflow-hidden rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute left-0 top-0 h-full w-1 bg-blue-600" />
          <p className="text-[9px] font-bold uppercase tracking-wide text-blue-600">
            Quality Audits
          </p>
          <p className="mt-2 text-xl font-mono font-black text-blue-900">
            {totalInspections}
          </p>
          <span className="text-[9px] font-semibold text-blue-500">
            Reports Completed
          </span>
        </div>

        {/* Moisture */}
        <div className="relative overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute left-0 top-0 h-full w-1 bg-emerald-600" />
          <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700">
            Moisture Profile
          </p>
          <p className="mt-2 text-xl font-mono font-black text-emerald-800">
            {avgMoisture.toFixed(2)}
            <span className="ml-1 text-xs">%</span>
          </p>
          <span className="text-[9px] font-semibold text-emerald-600">
            Avg Actual
          </span>
        </div>

        {/* Dust */}
        <div className="relative overflow-hidden rounded-lg border border-rose-200 bg-rose-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute left-0 top-0 h-full w-1 bg-rose-600" />
          <p className="text-[9px] font-bold uppercase tracking-wide text-rose-700">
            Dust Profiling
          </p>
          <p className="mt-2 text-xl font-mono font-black text-rose-800">
            {avgDust.toFixed(2)}
            <span className="ml-1 text-xs">%</span>
          </p>
          <span className="text-[9px] font-semibold text-rose-600">
            Avg Actual
          </span>
        </div>

        {/* Total Contract */}
        <div className="relative overflow-hidden rounded-lg border border-sky-200 bg-sky-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute left-0 top-0 h-full w-1 bg-sky-600" />
          <p className="text-[9px] font-bold uppercase tracking-wide text-sky-700">
            P.O. Contract
          </p>
          <p className="mt-2 text-lg font-mono font-black text-sky-900">
            {totalContractWeight.toFixed(3)}
          </p>
          <span className="text-[9px] font-semibold text-sky-600">
            Total MT
          </span>
        </div>

        {/* Received */}
        <div className="relative overflow-hidden rounded-lg border border-green-200 bg-green-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute left-0 top-0 h-full w-1 bg-green-600" />
          <p className="text-[9px] font-bold uppercase tracking-wide text-green-700">
            P.O. Received
          </p>
          <p className="mt-2 text-lg font-mono font-black text-green-900">
            {totalReceivedWeight.toFixed(3)}
          </p>
          <span className="text-[9px] font-semibold text-green-600">
            Received MT
          </span>
        </div>

        {/* Pending */}
        <div className="relative overflow-hidden rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute left-0 top-0 h-full w-1 bg-amber-600" />
          <p className="text-[9px] font-bold uppercase tracking-wide text-amber-700">
            P.O. Pending
          </p>
          <p className="mt-2 text-lg font-mono font-black text-amber-900">
            {totalPendingWeight.toFixed(3)}
          </p>
          <span className="text-[9px] font-semibold text-amber-600">
            Outstanding MT
          </span>
        </div>
      </div>

      {/* Top Filter & Action Bar */}
      <div className="flex items-center gap-2.5 flex-wrap rounded-lg border border-slate-300 bg-[#F7AFA8] p-2 shadow-sm w-full min-w-0">
        <div className="flex flex-1 min-w-0 sm:min-w-[260px] w-full sm:w-auto overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            id="search_m_r_no_supplier_na_mat"
            name="search_m_r_no_supplier_na"
            aria-label="Search M.R. No, Supplier name, Broker name, P.O. No..."
            className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Search M.R. No, Supplier name, Broker name, P.O. No..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
          <button className="border-l border-slate-200 bg-slate-50 px-3 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700">
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Arrival Date Range Picker */}
        <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-wide text-slate-500">
            Arrival
          </span>
          <input
            id="arrivalstartdate_mat"
            name="arrivalstartdate"
            aria-label="arrivalstartdate"
            type="date"
            value={arrivalStartDate}
            onChange={(e) => setArrivalStartDate(e.target.value)}
            className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10.5px] font-mono font-bold text-slate-700 outline-none focus:border-blue-400"
          />
          <span className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            To
          </span>
          <input
            id="arrivalenddate_mat"
            name="arrivalenddate"
            aria-label="arrivalenddate"
            type="date"
            value={arrivalEndDate}
            onChange={(e) => setArrivalEndDate(e.target.value)}
            className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10.5px] font-mono font-bold text-slate-700 outline-none focus:border-blue-400"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              setSearchFilter("");
              setArrivalStartDate("");
              setArrivalEndDate("");
            }}
            className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-95 cursor-pointer"
          >
            <X className="h-3.5 w-3.5 text-slate-500" />
            Clear
          </button>

          <button
            onClick={handleRefreshDatabase}
            title="Refresh database records"
            disabled={loading}
            className="flex items-center gap-1 rounded-md border border-emerald-700 bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:cursor-wait disabled:opacity-50 cursor-pointer"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Navigation Sub-toolbar */}
      <div className="flex items-center justify-between border-b border-gray-400 pb-1.5 pt-1 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentTab("inspections")}
            className={`px-3 py-1 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 border transition-all cursor-pointer rounded-t ${
              currentTab === "inspections"
                ? "bg-[#D94B5A] text-white border-[#F7AFA8] shadow-sm"
                : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
            }`}
          >
            <span>All Inspections</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentTab === "inspections" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {filteredSavedInspections.length}
            </span>
          </button>

          <button
            onClick={() => setCurrentTab("pending_mr")}
            className={`px-3 py-1 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 border transition-all cursor-pointer rounded-t ${
              currentTab === "pending_mr"
                ? "bg-[#D94B5A] text-white border-[#F7AFA8] shadow-sm"
                : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
            }`}
          >
            <span>Pending M.R. (Arrivals)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentTab === "pending_mr" ? "bg-amber-400 text-slate-900" : "bg-amber-100 text-amber-800"
            }`}>
              {filteredPendingMrList.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Column Visibility Menu */}
          {currentTab === "inspections" && (
            <div className="relative" ref={columnMenuRef}>
              <button
                onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-2.5 py-1 text-[11px] font-bold rounded shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Columns</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isColumnMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-300 rounded shadow-xl p-2.5 z-50 text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="font-black text-[10px] uppercase text-slate-400 border-b pb-1 mb-1">
                    Toggle Table Columns
                  </div>
                  {Object.entries(visibleColumns).map(([key, isVis]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={isVis}
                        onChange={(e) =>
                          setVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))
                        }
                        className="cursor-pointer"
                      />
                      <span className="capitalize font-medium text-slate-700">
                        {key.replace(/_/g, " ")}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Batch Print Button */}
          {currentTab === "inspections" && selectedMrNos.length > 0 && (
            <button
              onClick={handleBatchPrint}
              className="bg-purple-700 hover:bg-purple-800 text-white font-black text-[11px] uppercase px-3 py-1 rounded shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Selected ({selectedMrNos.length})</span>
            </button>
          )}

          {/* Export CSV Button */}
          {currentTab === "inspections" && (
            <button
              onClick={handleExportCsv}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[11px] uppercase px-3 py-1 rounded shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          {/* New Quality Inspection Button */}
          <button
            onClick={() => {
              const freshMaster = initialMasterState();
              setMasterData(freshMaster);
              setDetailsList([1, 2, 3, 4, 5].map(createEmptyRow));
              setIsEditMode(true);
              setErrorMessage("");
              setSuccessMessage("");
              setViewMode("entry");
            }}
            className="bg-[#F7AFA8] hover:bg-[#123920] text-white font-black text-[11px] uppercase px-3.5 py-1 rounded shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-amber-300" />
            <span>+ New Inspection</span>
          </button>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="overflow-x-auto border border-slate-300 shadow-sm rounded-lg bg-white">
        <table className="w-full border-collapse text-[11px]">
          <thead className="bg-[#D94B5A] text-white font-extrabold uppercase">
            {currentTab === "inspections" ? (
              <tr className="border-b border-gray-400 text-white h-8 font-black uppercase text-center">
                {visibleColumns.select && (
                  <th className="px-2 border-r border-gray-300 w-10 text-center">
                    <input
                      id="checkbox_select_all_mat"
                      name="checkbox_select_all"
                      aria-label="Select all"
                      type="checkbox"
                      checked={
                        filteredSavedInspections.length > 0 &&
                        selectedMrNos.length === filteredSavedInspections.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMrNos(filteredSavedInspections.map(i => i.mr_no));
                        } else {
                          setSelectedMrNos([]);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </th>
                )}
                {visibleColumns.mr_no && (
                  <th className="px-3 text-left border-r border-gray-300 w-32">
                    M.R. No.
                  </th>
                )}
                {visibleColumns.mr_date && (
                  <th className="px-2 border-r border-gray-300 w-24">
                    M.R. Date
                  </th>
                )}
                {visibleColumns.supplier && (
                  <th className="px-4 text-left border-r border-gray-300">
                    Supplier / Merchant
                  </th>
                )}
                {visibleColumns.broker && (
                  <th className="px-4 text-left border-r border-gray-300">
                    Broker Name
                  </th>
                )}
                {visibleColumns.po_ref && (
                  <th className="px-3 border-r border-gray-300 w-28">
                    P.O. Ref
                  </th>
                )}
                {visibleColumns.moisture && (
                  <th className="px-2 border-r border-gray-300 w-20">
                    Moist %
                  </th>
                )}
                {visibleColumns.weft_dust && (
                  <th className="px-2 border-r border-gray-300 w-20">
                    Dust %
                  </th>
                )}
                {visibleColumns.ncv && (
                  <th className="px-2 border-r border-gray-300 w-20">
                    NCV %
                  </th>
                )}
                {visibleColumns.detn_days && (
                  <th className="px-2 border-r border-gray-300 w-16">
                    Detn
                  </th>
                )}
                {visibleColumns.arrival_no && (
                  <th className="px-2 border-r border-gray-300 w-28">
                    Arrival No.
                  </th>
                )}
                {visibleColumns.unloading && (
                  <th className="px-3 border-r border-gray-300 w-24">
                    Unloading
                  </th>
                )}
                {visibleColumns.print_status && (
                  <th className="px-3 border-r border-gray-300 w-24">
                    Print Status
                  </th>
                )}
                {visibleColumns.lorry_number && (
                  <th className="px-3 border-r border-gray-300 w-28">
                    Lorry Number
                  </th>
                )}
                {visibleColumns.gate_entry_time && (
                  <th className="px-3 border-r border-gray-300 w-28">
                    Gate Entry Time
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="px-3 text-center">Actions</th>
                )}
              </tr>
            ) : (
              <tr className="border-b border-gray-400 text-slate-800 h-8 font-black uppercase text-center bg-slate-100">
                <th className="px-3 text-left border-r border-gray-300 w-28">M.R. / Arrival No.</th>
                <th className="px-3 border-r border-gray-300 w-28">Arrival Date</th>
                <th className="px-3 border-r border-gray-300 w-32">P.O. Reference</th>
                <th className="px-4 text-left border-r border-gray-300">Supplier / Merchant</th>
                <th className="px-4 text-left border-r border-gray-300">Broker Name</th>
                <th className="px-3 border-r border-gray-300 w-24 text-right">Qty</th>
                <th className="px-3 border-r border-gray-300 w-24 text-right">Weight</th>
                <th className="px-3 border-r border-gray-300 w-32 text-center">Status</th>
                <th className="px-3 text-center w-36">Actions</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-200 font-bold bg-white text-slate-800">
            {currentTab === "inspections" ? (
              filteredSavedInspections.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((row, idx) => {
                const activeColSpanCount = Object.values(visibleColumns).filter(Boolean).length;
                return (
                  <React.Fragment key={row.id || row.mr_no || `insp-${idx}`}>
                    <tr
                      onClick={() => {
                        loadInspectionIntoForm(row);
                        handleToggleExpand(row);
                      }}
                      onDoubleClick={() => {
                        if (canEditOrDelete()) {
                          loadInspectionIntoForm(row);
                          setIsEditMode(true);
                          setViewMode("entry");
                        }
                      }}
                      title="Click to toggle expand / Double-click to instantly edit this report"
                      className={`h-9 cursor-pointer transition-colors ${
                        (row as any).is_return_lorry || (Number((row as any).received_weight_mt) > 0 && Number((row as any).received_weight_mt) < 5 && row.po_no)
                          ? "bg-red-100/90 hover:bg-red-200/80 border-l-4 border-l-red-600 text-red-950"
                          : expandedMrNo === row.mr_no
                          ? "bg-amber-50 hover:bg-amber-100/50"
                          : idx % 2 === 0
                          ? "bg-white hover:bg-amber-100/50"
                          : "bg-slate-50/50 hover:bg-amber-100/50"
                      }`}
                    >
                      {visibleColumns.select && (
                        <td
                          className="px-2 text-center border-r border-slate-200 w-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            id={`checkbox_row_${row.mr_no || idx}`}
                            name="checkbox_row"
                            aria-label="Select inspection"
                            type="checkbox"
                            checked={selectedMrNos.includes(row.mr_no)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMrNos((prev) => [...prev, row.mr_no]);
                              } else {
                                setSelectedMrNos((prev) =>
                                  prev.filter((no) => no !== row.mr_no)
                                );
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </td>
                      )}
                      {visibleColumns.mr_no && (
                        <td className={`px-3 font-extrabold border-r border-slate-200 ${(row as any).is_return_lorry ? "text-red-900" : "text-[#0d47a1]"}`}>
                          <div className="flex flex-col gap-0.5">
                            <span>{row.mr_no}</span>
                            {((row as any).is_return_lorry || (Number((row as any).received_weight_mt) > 0 && Number((row as any).received_weight_mt) < 5 && row.po_no)) && (
                              <span className="inline-block bg-red-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded w-fit">
                                RETURN LORRY {Number((row as any).received_weight_mt) > 0 ? `(${Number((row as any).received_weight_mt).toFixed(3)} MT)` : "(< 5 MT)"}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.mr_date && (
                        <td className="px-2 text-center font-mono border-r border-slate-200">
                          {row.mr_date}
                        </td>
                      )}
                      {visibleColumns.supplier && (
                        <td className="px-4 font-bold uppercase truncate max-w-[200px] border-r border-slate-200">
                          {safeRenderText(row.supplier_name || row.supplier)}
                        </td>
                      )}
                      {visibleColumns.broker && (
                        <td className="px-4 font-bold uppercase truncate max-w-[150px] border-r border-slate-200">
                          {safeRenderText(row.broker_name || row.broker)}
                        </td>
                      )}
                      {visibleColumns.po_ref && (() => {
                        const hasFinalArrival = row.po_no && finalArrivals.some(
                          fa => fa.po_no && String(fa.po_no).trim().toUpperCase() === String(row.po_no).trim().toUpperCase()
                        );
                        const isRet = Boolean((row as any).is_return_lorry || (row as any).return_po_no);
                        return (
                          <td className="px-3 text-center border-r border-slate-200">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className={`font-mono font-bold ${isRet ? "text-red-800 font-black" : "text-stone-600"}`}>
                                {(row as any).return_po_no ? String((row as any).return_po_no).replace(/^#+/, '') : (row.po_no ? String(row.po_no).replace(/^#+/, '') : "-")}
                              </span>
                              {isRet && ((row as any).reference_po_no || row.po_no) && (
                                <span className="inline-block bg-red-200 text-red-900 border border-red-400 text-[8px] font-black uppercase px-1 rounded tracking-wider leading-normal">
                                  Ref: {String((row as any).reference_po_no || row.po_no).replace(/^#+/, '')}
                                </span>
                              )}
                              {hasFinalArrival && (
                                <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8px] font-black uppercase px-1 rounded tracking-wider leading-normal shadow-xs" title="Final received data exists in Final Arrival Register">
                                  ✓ FINAL RECEIVED
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })()}
                      {visibleColumns.moisture && (
                        <td className="px-2 text-center font-black font-mono text-emerald-850 border-r border-slate-200">
                          {row.actual_moisture ? `${row.actual_moisture} %` : "-"}
                        </td>
                      )}
                      {visibleColumns.weft_dust && (
                        <td className="px-2 text-center font-mono text-orange-850 border-r border-slate-200">
                          {row.actual_dust ? `${row.actual_dust} %` : "-"}
                        </td>
                      )}
                      {visibleColumns.ncv && (
                        <td className="px-2 text-center font-mono text-stone-700 border-r border-slate-200">
                          {row.actual_ncv ? `${row.actual_ncv} %` : "-"}
                        </td>
                      )}
                      {visibleColumns.detn_days && (
                        <td className="px-2 text-center font-mono border-r border-slate-200">
                          {row.detention_days ?? 0}
                        </td>
                      )}
                      {visibleColumns.arrival_no && (
                        <td className="px-2 text-center font-mono uppercase text-sky-850 border-r border-slate-200">
                          {row.arrival_no || "-"}
                        </td>
                      )}
                      {visibleColumns.unloading && (
                        <td className="px-3 text-center font-mono border-r border-slate-200">
                          {row.unloading_date || "-"}
                        </td>
                      )}
                      {visibleColumns.print_status && (
                        <td className="px-3 text-center border-r border-slate-200">
                          {printedInspections[row.mr_no] ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                              Printed
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-550 border border-slate-200 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                              Pending
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.lorry_number && (
                        <td className="px-3 border-r border-slate-200 font-mono text-slate-700">
                          {row.lorry_number || (getVoucherForInspection(row) as any)?.lorry_number || (getVoucherForInspection(row) as any)?.lorry_no || (getVoucherForInspection(row) as any)?.vehicle_no || "-"}
                        </td>
                      )}
                      {visibleColumns.gate_entry_time && (
                        <td className="px-3 border-r border-gray-300 font-mono text-slate-600">
                          {getVoucherForInspection(row)?.created_at 
                            ? new Date(getVoucherForInspection(row).created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                            : "-"}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td
                          className="px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-center gap-2">
                            {/* Edit Icon Button */}
                            {canEditOrDelete() && (
                              <button
                                onClick={() => {
                                  loadInspectionIntoForm(row);
                                  setIsEditMode(true);
                                  setViewMode("entry");
                                }}
                                className="p-1 hover:bg-blue-100 text-blue-700 rounded transition-all active:scale-90 cursor-pointer"
                                title="Edit Inspection (Double-click row to edit directly)"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            
                            {/* Print Icon Button */}
                            <button
                              onClick={(e) => handlePreparePrintInspection(row, e)}
                              className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition-all active:scale-90 cursor-pointer"
                              title="Print Quality Audit Slip"
                            >
                              <Printer className="h-4 w-4" />
                            </button>

                            {/* Delete Icon Button */}
                            {canEditOrDelete() && (
                              <button
                                onClick={async () => {
                                  if (!enforceEditOrDeletePermission("Delete")) return;
                                  const targetLabel = row.mr_no || row.po_no || 'this record';
                                  if (
                                    confirm(
                                      `Are you sure you want to delete Inspection record ${targetLabel}? This will remove it completely from all inspection tables.`,
                                    )
                                  ) {
                                    try {
                                      setLoading(true);
                                      await deleteInspectionPermanently(row);
                                      await loadSavedInspectionsList();
                                      setSuccessMessage(`Inspection record ${targetLabel} deleted successfully from all tables.`);
                                    } catch (err: any) {
                                      alert("Delete failed: " + err.message);
                                    } finally {
                                      setLoading(false);
                                    }
                                  }
                                }}
                                className="p-1 hover:bg-rose-100 text-rose-700 rounded transition-all active:scale-90 cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Expandable panel row */}
                    {expandedMrNo === row.mr_no && (
                      <tr className="bg-amber-50/15">
                        <td colSpan={activeColSpanCount} className="p-3 bg-[#fdfaf2] border-b border-gray-400">
                          <div className="bg-white border-2 border-[#808080] p-4 shadow-inner">
                            <div className="flex items-center justify-between border-b border-dashed border-gray-300 pb-2 mb-3">
                              <span className="text-xs font-black text-blue-950 uppercase tracking-widest flex items-center gap-1.5 animate-fade-in">
                                🔍 Expanded Quality & Grade Allocation Audit [M.R. No: {row.mr_no}]
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setExpandedMrNo(null); }}
                                className="text-stone-400 hover:text-stone-750 text-xs font-black uppercase tracking-tight cursor-pointer"
                              >
                                Hide Details
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold leading-normal">
                              {/* Column 1: Moisture Profile */}
                              <div className="bg-emerald-50/50 p-2.5 border border-emerald-200 rounded">
                                <h5 className="font-black text-emerald-800 uppercase text-[9px] tracking-wider mb-1.5">💧 Moisture Profile (Actual vs Clm)</h5>
                                <div className="space-y-1 text-[11px]">
                                  <div className="flex justify-between">
                                    <span className="text-slate-550">Actual Moisture:</span>
                                    <span className="font-mono font-black text-emerald-950">{row.actual_moisture ? `${row.actual_moisture}%` : "-"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-550">Claim Moisture:</span>
                                    <span className="font-mono font-bold text-slate-700">{row.claim_moisture ? `${row.claim_moisture}%` : "-"}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-emerald-100 pt-1 mt-1 font-bold">
                                    <span className="text-slate-550">Variance/Excess:</span>
                                    <span className="font-mono text-[#d32f2f]">
                                      {row.actual_moisture && row.claim_moisture ? `${(row.actual_moisture - row.claim_moisture).toFixed(2)}%` : "0.00%"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Impurities / NCV */}
                              <div className="bg-orange-50/50 p-2.5 border border-orange-200 rounded">
                                <h5 className="font-black text-orange-850 uppercase text-[9px] tracking-wider mb-1.5">🍂 Dust & NCV Profile</h5>
                                <div className="space-y-1 text-[11px]">
                                  <div className="flex justify-between">
                                    <span className="text-slate-550">Actual Dust:</span>
                                    <span className="font-mono font-bold text-orange-950">{row.actual_dust ? `${row.actual_dust}%` : "-"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-550">Average NCV %:</span>
                                    <span className="font-mono font-bold text-stone-800">{row.actual_ncv ? `${row.actual_ncv}%` : "-"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-550">Unloading Period:</span>
                                    <span className="font-mono font-bold text-slate-700">{row.unloading_date || "-"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Column 3: Logistics & Reference */}
                              <div className="bg-sky-50/50 p-2.5 border border-sky-200 rounded">
                                <h5 className="font-black text-sky-850 uppercase text-[9px] tracking-wider mb-1.5">📋 Logistics & Reference</h5>
                                <div className="space-y-1 text-[11px]">
                                  <div className="flex justify-between">
                                    <span className="text-slate-550">Lorry Number:</span>
                                    <span className="font-mono font-black text-slate-800">{row.lorry_number || (getVoucherForInspection(row) as any)?.lorry_number || (getVoucherForInspection(row) as any)?.lorry_no || (getVoucherForInspection(row) as any)?.vehicle_no || "-"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-550">Gate Entry:</span>
                                    <span className="font-mono font-bold text-slate-650">
                                      {getVoucherForInspection(row)?.created_at ? new Date(getVoucherForInspection(row).created_at).toLocaleString() : "-"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-550">Mill P.O. Number:</span>
                                    <span className="font-mono font-bold text-sky-900">{row.mill_po_no || "-"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Column 4: Remarks */}
                              <div className="bg-slate-50 p-2.5 border border-slate-200 rounded">
                                <h5 className="font-black text-slate-500 uppercase text-[9px] tracking-wider mb-1.5">💬 Technician Remarks</h5>
                                <p className="text-[11px] text-slate-700 italic leading-relaxed whitespace-pre-wrap break-words bg-white p-1.5 border border-slate-100 rounded min-h-[50px]">
                                  {row.remarks || "(No custom remarks reported for this cargo)"}
                                </p>
                              </div>
                            </div>

                            {/* Itemized Grade Allotment List */}
                            <div className="mt-4 bg-[#f8f9fa] border border-[#FBCFCB] p-3 rounded-sm">
                              <h6 className="font-black text-slate-750 uppercase text-[9px] tracking-wider mb-2 flex items-center gap-1">
                                🏷️ Itemized Component Allocations & Color Grades
                              </h6>
                              {expandedDetails[row.mr_no] ? (
                                expandedDetails[row.mr_no].length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-[10.5px] font-semibold border-collapse">
                                    <thead>
                                      <tr className="bg-slate-200 text-slate-700 font-extrabold uppercase text-[9px] border-b border-slate-300">
                                        <th className="p-1 px-2">Srl No.</th>
                                        <th className="p-1">Arrival Grade / Color Spec</th>
                                        <th className="p-1">Stock Grade Code</th>
                                        <th className="p-1">Stock Grade Name</th>
                                        <th className="p-1">Milled Area/Zone</th>
                                        <th className="p-1">Milled Agency</th>
                                        <th className="p-1">Marka/Code</th>
                                        <th className="p-1">Crop Year</th>
                                        <th className="p-1">Lot No</th>
                                        <th className="p-1 text-right">Qty</th>
                                        <th className="p-1">Unit</th>
                                        <th className="p-1 text-right">Challan Gross Wt</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {expandedDetails[row.mr_no].map((d) => (
                                        <tr key={d.id || d.srl_no} className="hover:bg-slate-105/50 font-medium">
                                          <td className="p-1 px-2 font-mono text-[10px] text-slate-450">{safeRenderText(d.srl_no)}</td>
                                          <td className="p-1 text-indigo-700 font-bold uppercase">{safeRenderText(d.arrival_grade, "N/A")}</td>
                                          <td className="p-1 font-mono text-emerald-800 font-black">{safeRenderText(d.stock_grade_code)}</td>
                                          <td className="p-1 uppercase text-slate-600">{safeRenderText(d.stock_grade_name)}</td>
                                          <td className="p-1 uppercase text-slate-650">{safeRenderText(d.area)}</td>
                                          <td className="p-1 uppercase text-slate-650">{safeRenderText(d.agency)}</td>
                                          <td className="p-1 font-mono text-stone-605">{safeRenderText(d.marka)}</td>
                                          <td className="p-1 font-mono text-slate-500">{safeRenderText(d.crop_year)}</td>
                                          <td className="p-1 font-mono text-slate-700">{safeRenderText(d.lot)}</td>
                                          <td className="p-1 font-mono text-right font-bold text-sky-905">{safeRenderText(d.quantity)}</td>
                                          <td className="p-1 text-slate-500">{safeRenderText(d.unit, "BALES")}</td>
                                          <td className="p-1 font-mono text-right font-medium text-slate-600">{safeRenderText(d.challan_gross_wt)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-[10px] italic text-slate-450 uppercase py-1">No split components parsed for this record.</p>
                              )
                            ) : (
                              <div className="flex items-center gap-1.5 py-1">
                                <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-slate-550 border-t-transparent rounded-full"></span>
                                <span className="text-[10.5px] italic text-slate-450 uppercase font-black tracking-wider animate-pulse">Synchronizing allocations ...</span>
                              </div>
                            )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              filteredPendingMrList.slice((pendingCurrentPage - 1) * pendingPageSize, pendingCurrentPage * pendingPageSize).map((row, idx) => {
                const arrivalDateFormatted = row.date ? new Date(row.date).toLocaleDateString("en-GB") : "--";
                const bales = Number(row.total_packets || row.packets || 0);
                const weightMt = Number(row.weight_qtl || row.weight || 0) / 10;
                const arrivalVal = row.temporary_arrival_no || row.amad_no;

                return (
                  <tr
                    key={row.id || row.temporary_arrival_no || row.arrival_no || `pending-${idx}`}
                    className={`h-9 hover:bg-amber-50/50 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    {/* M.R. / Arrival No. */}
                    <td className="px-3 font-extrabold text-[#b45309] border-r border-slate-200">
                      {safeRenderText(arrivalVal)}
                    </td>

                    {/* Arrival Date */}
                    <td className="px-3 text-center font-mono border-r border-slate-200 text-stone-600">
                      {arrivalDateFormatted}
                    </td>

                    {/* P.O. Reference */}
                    <td className="px-3 text-center font-mono text-stone-600 border-r border-slate-200">
                      {row.po_no ? String(row.po_no).replace(/^#+/, '') : "-"}
                    </td>

                    {/* Supplier */}
                    <td className="px-4 font-bold uppercase truncate max-w-[200px] border-r border-slate-200">
                      {safeRenderText(row.supplier || row.supplier_name)}
                    </td>

                    {/* Broker */}
                    <td className="px-4 font-semibold uppercase truncate max-w-[150px] border-r border-slate-200 text-slate-650">
                      {safeRenderText(row.broker || row.broker_name)}
                    </td>

                    {/* Bales */}
                    <td className="px-3 text-right font-mono text-blue-700 border-r border-slate-200">
                      {bales}
                    </td>

                    {/* Weight */}
                    <td className="px-3 text-right font-mono text-red-700 border-r border-slate-200">
                      {weightMt.toFixed(3)}
                    </td>

                    {/* Status */}
                    <td className="px-3 text-center border-r border-slate-200">
                      <span className="bg-amber-50 text-amber-700 border border-amber-250 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse">
                        ⏳ PENDING INSPECTION
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 text-center">
                      <button
                        onClick={() => {
                          const freshMaster = initialMasterState();
                          setMasterData({
                            ...freshMaster,
                            arrival_no: arrivalVal
                          });
                          setDetailsList([1, 2, 3, 4, 5].map(createEmptyRow));
                          setIsEditMode(true);
                          setErrorMessage("");
                          setSuccessMessage("");
                          setViewMode("entry");

                          handleAutoFillFromVoucher(row);
                        }}
                        className="bg-[#0d47a1] hover:bg-blue-800 text-white font-black text-[9px] uppercase px-3 py-1 shadow-[1px_1px_0_0_black] border border-white active:shadow-[inset_1px_1px_0_0_black] rounded cursor-pointer transition-colors"
                      >
                        🔬 Inspect Quality
                      </button>
                    </td>
                  </tr>
                );
              })
            )}

            {/* Empty State */}
            {((currentTab === "inspections" && filteredSavedInspections.length === 0) ||
              (currentTab === "pending_mr" && filteredPendingMrList.length === 0)) && (
              <tr>
                <td
                  colSpan={currentTab === "inspections" ? Object.values(visibleColumns).filter(Boolean).length : 9}
                  className="py-16 text-center text-gray-500 font-bold uppercase text-[11px] leading-relaxed bg-white"
                >
                  {currentTab === "inspections" 
                    ? "No Registered Quality Inspections Found matching the criteria."
                    : "No Pending Material Arrival Records found. All Arrivals have recorded Quality Inspections."}
                </td>
              </tr>
            )}

            {/* Blank spacer rows */}
            {Array.from({
              length: Math.max(
                0,
                8 - (currentTab === "inspections" ? filteredSavedInspections.length : filteredPendingMrList.length)
              ),
            }).map((_, i) => (
              <tr key={`spacer-${i}`} className="h-9 border-b border-gray-100 opacity-25">
                <td colSpan={currentTab === "inspections" ? Object.values(visibleColumns).filter(Boolean).length : 9}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2">
        <PaginationControls
          currentPage={currentTab === "inspections" ? currentPage : pendingCurrentPage}
          totalItems={currentTab === "inspections" ? filteredSavedInspections.length : filteredPendingMrList.length}
          pageSize={currentTab === "inspections" ? pageSize : pendingPageSize}
          onPageChange={currentTab === "inspections" ? setCurrentPage : setPendingCurrentPage}
          onPageSizeChange={currentTab === "inspections" ? setPageSize : setPendingPageSize}
        />
      </div>
    </div>
  );
};
