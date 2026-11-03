import React from "react";
import { Search, Printer, Edit, Trash2, FileSpreadsheet, ArrowUpDown, ChevronUp, ChevronDown, CheckCircle, Clock, Calendar, X, Filter, Plus, RefreshCw } from "lucide-react";
import { PaginationControls } from "../PaginationControls";
import { InspectionMasterRecord } from "../../types/inspection.types";
import { formatIndianCurrency } from "../../lib/utils";

export interface InspectionRegisterViewProps {
  records?: InspectionMasterRecord[];
  filteredRecords: InspectionMasterRecord[];
  selectedMonthFilter?: string | null;
  setSelectedMonthFilter?: (m: string | null) => void;
  loading: boolean;
  totalInspections: number;
  avgMoisture: string | number;
  totalDeductions: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  startDate?: string;
  setStartDate?: (d: string) => void;
  endDate?: string;
  setEndDate?: (d: string) => void;
  datePreset?: string;
  onDatePresetChange?: (preset: string) => void;
  onClearDateFilter?: () => void;
  sortField: "arrival_date" | "arrival_no" | "status";
  sortOrder: "asc" | "desc";
  onToggleSort: (field: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onExportCsv: () => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  onEditRecord: (rec: InspectionMasterRecord) => void;
  onPrintRecord: (rec: InspectionMasterRecord) => void;
  onDeleteRecord: (mr_no: string) => Promise<void>;
  onOpenNewForm?: () => void;
  onRefresh?: () => void;
}

export const InspectionRegisterView: React.FC<InspectionRegisterViewProps> = ({
  records = [],
  filteredRecords,
  selectedMonthFilter = null,
  setSelectedMonthFilter,
  loading,
  totalInspections,
  avgMoisture,
  totalDeductions,
  searchQuery,
  setSearchQuery,
  startDate = "",
  setStartDate,
  endDate = "",
  setEndDate,
  datePreset = "all",
  onDatePresetChange,
  onClearDateFilter,
  sortField,
  sortOrder,
  onToggleSort,
  statusFilter,
  setStatusFilter,
  onExportCsv,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  onEditRecord,
  onPrintRecord,
  onDeleteRecord,
  onOpenNewForm,
  onRefresh,
}) => {
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const isDateFiltered = Boolean(startDate || endDate || (datePreset && datePreset !== "all"));

  return (
    <div className="space-y-4">
      {/* Top Stats (Light & Colorful) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Total Inspections (Light Indigo/Blue) */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50/60 rounded-xl p-3.5 border border-blue-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <div className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
              <span>Total Inspections</span>
              {isDateFiltered && (
                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold lowercase">
                  filtered
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono tracking-tight mt-0.5">{totalInspections}</div>
          </div>
          <div className="p-2.5 bg-blue-100/80 border border-blue-200 rounded-xl text-blue-600 shadow-xs">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Avg Actual Moisture (Light Emerald/Teal) */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 rounded-xl p-3.5 border border-emerald-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
              <span>Avg Actual Moisture</span>
              {isDateFiltered && (
                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-semibold lowercase">
                  filtered
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono tracking-tight mt-0.5">{avgMoisture}%</div>
          </div>
          <div className="p-2.5 bg-emerald-100/80 border border-emerald-200 rounded-xl text-emerald-600 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Deductions (Light Amber/Orange) */}
        <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50/60 rounded-xl p-3.5 border border-amber-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <div className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
              <span>Total Deductions (₹)</span>
              {isDateFiltered && (
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded font-semibold lowercase">
                  filtered
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono tracking-tight mt-0.5">{formatIndianCurrency(totalDeductions)}</div>
          </div>
          <div className="p-2.5 bg-amber-100/80 border border-amber-200 rounded-xl text-amber-600 shadow-xs">
            <Printer className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search MR No, Supplier, Broker, PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* New Inspection Form & Refresh Buttons beside Search */}
          <div className="flex items-center gap-2">
            {onOpenNewForm && (
              <button
                type="button"
                onClick={onOpenNewForm}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 border border-emerald-400/50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>New Inspection Form</span>
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-95"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-700 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Draft">Draft</option>
          </select>

          {/* Export Button */}
          <button
            onClick={onExportCsv}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <th className="p-3">M.R. No.</th>
                <th
                  className="p-3 cursor-pointer select-none hover:bg-slate-200 transition-colors"
                  onClick={() => onToggleSort("arrival_no")}
                >
                  <div className="flex items-center gap-1">
                    <span>Arrival No.</span>
                    {sortField === "arrival_no" ? (
                      sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer select-none hover:bg-slate-200 transition-colors"
                  onClick={() => onToggleSort("arrival_date")}
                >
                  <div className="flex items-center gap-1">
                    <span>Arrival Date</span>
                    {sortField === "arrival_date" ? (
                      sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="p-3">P.O. No.</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Broker</th>
                <th className="p-3 text-right">Moisture %</th>
                <th className="p-3 text-right">Deduction (₹)</th>
                <th
                  className="p-3 text-center cursor-pointer select-none hover:bg-slate-200 transition-colors"
                  onClick={() => onToggleSort("status")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status</span>
                    {sortField === "status" ? (
                      sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 font-medium">
                    Loading inspection records...
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 font-medium">
                    No inspection records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => {
                  const recAny = r as any;
                  const wtMt = Number(recAny.received_weight_mt || 0);
                  const isReturnRow = Boolean(
                    recAny.is_return_lorry ||
                    recAny.return_po_no ||
                    (wtMt > 0 && wtMt < 5 && r.po_no)
                  );
                  return (
                  <tr
                    key={r.id || r.mr_no || idx}
                    className={
                      isReturnRow
                        ? "bg-red-100/90 hover:bg-red-200/80 border-l-4 border-l-red-600 text-red-950 transition-colors"
                        : "hover:bg-slate-50 transition-colors"
                    }
                  >
                    <td className={`p-3 font-bold ${isReturnRow ? "text-red-900" : "text-blue-900"}`}>
                      <div className="flex flex-col gap-0.5">
                        <span>{r.mr_no}</span>
                        {isReturnRow && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider w-fit shadow-xs">
                            RETURN LORRY {wtMt > 0 ? `(${wtMt.toFixed(3)} MT)` : "(< 5 MT)"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-medium">{r.arrival_no || "-"}</td>
                    <td className={`p-3 font-mono ${isReturnRow ? "text-red-900 font-semibold" : "text-slate-600"}`}>{new Date(r.arrival_date).toLocaleDateString('en-GB') || new Date(r.mr_date).toLocaleDateString('en-GB') || "-"}</td>
                    <td className="p-3 font-mono">
                      {isReturnRow ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-black text-red-800">
                            {recAny.return_po_no ? String(recAny.return_po_no).replace(/^#+/, '') : (r.po_no ? String(r.po_no).replace(/^#+/, '') : "-")}
                          </span>
                          {(recAny.reference_po_no || r.po_no) && (
                            <span className="text-[10px] font-bold text-red-700 bg-red-200/80 px-1.5 py-0.5 rounded w-fit">
                              Ref: {String(recAny.reference_po_no || r.po_no).replace(/^#+/, '')}
                            </span>
                          )}
                        </div>
                      ) : (
                        r.po_no ? String(r.po_no).replace(/^#+/, '') : "-"
                      )}
                    </td>
                    <td className={`p-3 font-bold uppercase truncate max-w-[160px] ${isReturnRow ? "text-red-950" : ""}`}>{r.supplier_name || "-"}</td>
                    <td className={`p-3 uppercase truncate max-w-[140px] ${isReturnRow ? "text-red-900 font-semibold" : "text-slate-600"}`}>{r.broker_name || "-"}</td>
                    <td className={`p-3 text-right font-mono font-bold ${isReturnRow ? "text-red-900" : "text-emerald-800"}`}>{Math.round(r.claim_moisture) ? `${Math.round(r.claim_moisture)}%` : "-"}</td>
                    <td className={`p-3 text-right font-mono ${isReturnRow ? "text-red-900 font-bold" : "text-amber-800"}`}>{formatIndianCurrency(r.deduction_amount || 0)}</td>
                    <td className="p-3 text-center">
                      {isReturnRow ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white shadow-xs">
                          Return Lorry
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {r.status || "Completed"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEditRecord(r)}
                          className="p-1 hover:bg-blue-100 text-blue-700 rounded transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onPrintRecord(r)}
                          className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition-colors cursor-pointer"
                          title="Print"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRecord(r.mr_no)}
                          className="p-1 hover:bg-rose-100 text-rose-700 rounded transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-slate-200">
          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredRecords.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  );
};
