import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Check, 
  Lock 
} from 'lucide-react';
import { cn, canApproveMismatch } from '../../lib/utils';
import { PaginationControls } from '../PaginationControls';
import { MaterialMismatchItem } from './mismatchTypes';

interface MaterialMismatchViewProps {
  loading: boolean;
  mismatchList: MaterialMismatchItem[];
  filteredMismatchList: MaterialMismatchItem[];
  filterStatus: 'all' | 'pending' | 'resolved';
  setFilterStatus: (val: 'all' | 'pending' | 'resolved') => void;
  selectedSupplier: string;
  setSelectedSupplier: (val: string) => void;
  selectedBroker: string;
  setSelectedBroker: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  supplierOptions: string[];
  brokerOptions: string[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  remarksMap: Record<string, string>;
  setRemarksMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleResolve: (itemId: string, itemPoNo: string) => void;
}

export const MaterialMismatchView: React.FC<MaterialMismatchViewProps> = ({
  loading,
  mismatchList,
  filteredMismatchList,
  filterStatus,
  setFilterStatus,
  selectedSupplier,
  setSelectedSupplier,
  selectedBroker,
  setSelectedBroker,
  searchQuery,
  setSearchQuery,
  supplierOptions,
  brokerOptions,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  remarksMap,
  setRemarksMap,
  handleResolve
}) => {
  const pendingCount = mismatchList.filter(m => m.status === 'pending').length;
  const resolvedCount = mismatchList.filter(m => m.status === 'resolved').length;

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-300 p-3 rounded-lg shadow-xs space-y-3">
        {/* Top Row: Quick Status Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterStatus('pending')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-extrabold uppercase tracking-wider border transition flex items-center gap-1.5",
                filterStatus === 'pending'
                  ? "bg-rose-700 text-white border-rose-800 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Pending ({pendingCount})</span>
            </button>
            <button
              onClick={() => setFilterStatus('resolved')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-extrabold uppercase tracking-wider border transition flex items-center gap-1.5",
                filterStatus === 'resolved'
                  ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Resolved ({resolvedCount})</span>
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-extrabold uppercase tracking-wider border transition",
                filterStatus === 'all'
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
              )}
            >
              All ({mismatchList.length})
            </button>
          </div>

          {/* Reset Filters */}
          {(selectedSupplier !== 'ALL' || selectedBroker !== 'ALL' || searchQuery || filterStatus !== 'pending') && (
            <button
              onClick={() => {
                setSelectedSupplier('ALL');
                setSelectedBroker('ALL');
                setFilterStatus('pending');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Bottom Row: Dropdown Selectors & Search Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          {/* Status Dropdown */}
          <div>
            <label htmlFor="filter_by_status_685" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5">
              Filter by Status
            </label>
            <select
              id="filter_by_status_685"
              name="filter_by_status"
              aria-label="Filter by Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full text-xs py-1.5 px-2 border border-slate-300 rounded bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
            >
              <option value="pending">Pending Approval</option>
              <option value="resolved">Resolved / Approved</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          {/* Supplier Dropdown */}
          <div>
            <label htmlFor="filter_by_supplier_701" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5">
              Filter by Supplier
            </label>
            <select
              id="filter_by_supplier_701"
              name="filter_by_supplier"
              aria-label="Filter by Supplier"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full text-xs py-1.5 px-2 border border-slate-300 rounded bg-white text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">All Suppliers ({supplierOptions.length})</option>
              {supplierOptions.map((s, idx) => (
                <option key={idx} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Broker Dropdown */}
          <div>
            <label htmlFor="filter_by_broker_718" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5">
              Filter by Broker
            </label>
            <select
              id="filter_by_broker_718"
              name="filter_by_broker"
              aria-label="Filter by Broker"
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="w-full text-xs py-1.5 px-2 border border-slate-300 rounded bg-white text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">All Brokers ({brokerOptions.length})</option>
              {brokerOptions.map((b, idx) => (
                <option key={idx} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Search Input Bar */}
          <div>
            <label htmlFor="search_keyword_737" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5">
              Search Keyword
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 font-bold" />
              <input
                id="search_keyword_737"
                name="search_keyword"
                aria-label="Search Keyword"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="PO, Area, Grade, Discrepancy..."
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-600 text-slate-800 font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Material Mismatch Base Table */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-700 border-t-transparent mx-auto" />
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mt-3">Fetching fresh data from database...</p>
          </div>
        ) : filteredMismatchList.length === 0 ? (
          <div className="p-12 text-center bg-slate-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-sm font-extrabold text-slate-800 uppercase">No Material Mismatches Found</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              All Purchase Orders match their corresponding Material Inspections and arrival receipts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10.5px] tracking-wider">
                  <th className="p-3 border-r border-slate-200">P.O. Number & Date</th>
                  <th className="p-3 border-r border-slate-200">Supplier & Broker</th>
                  <th className="p-3 border-r border-slate-200">Area & Grade</th>
                  <th className="p-3 border-r border-slate-200 bg-indigo-50/50 text-indigo-950 font-black">
                    Remaining Lorries (Contract | Recv | Rem)
                  </th>
                  <th className="p-3 border-r border-slate-200 text-rose-800">Mismatched Fields</th>
                  <th className="p-3 border-r border-slate-200">Status</th>
                  <th className="p-3">Action & Approval Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMismatchList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition align-top">
                    {/* PO Number & Date */}
                    <td className="p-3 border-r border-slate-200 font-mono">
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                        <span>{item.poNo}</span>
                        {item.isClosed && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 shadow-2xs flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-amber-400" />
                            CLOSED
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        Detected: {item.detectedAt}
                      </div>
                      {item.saudaNo && item.saudaNo !== 'N/A' && (
                        <div className="text-[9.5px] text-indigo-700 font-bold mt-0.5">
                          Sauda: {item.saudaNo}
                        </div>
                      )}
                    </td>

                    {/* Supplier & Broker */}
                    <td className="p-3 border-r border-slate-200">
                      <div className="font-bold text-slate-900 uppercase">{item.supplierName}</div>
                      <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                        Broker: <span className="font-semibold text-slate-800">{item.brokerName}</span>
                      </div>
                      {item.challanSupplier && item.challanSupplier !== 'N/A' && (
                        <div className="text-[10px] text-slate-500">Challan Supp: {item.challanSupplier}</div>
                      )}
                    </td>

                    {/* Area & Grade */}
                    <td className="p-3 border-r border-slate-200">
                      <div className="font-bold text-slate-800">{item.area}</div>
                      <div className="text-[11px] text-slate-600 font-medium">Grade: <span className="font-bold">{item.grade}</span></div>
                      {item.agency && item.agency !== 'N/A' && (
                        <div className="text-[10px] text-slate-500">Agency: {item.agency}</div>
                      )}
                    </td>

                    {/* Remaining Lorries Column */}
                    <td className="p-3 border-r border-slate-200 bg-indigo-50/30 min-w-[180px]">
                      <div className="bg-white border border-indigo-200 rounded p-2 text-center shadow-2xs space-y-1">
                        <div className="text-[11px] font-black text-indigo-950">
                          {item.lorryProgress?.totalLorries || 1} Contract | {item.lorryProgress?.receivedLorries || 1} Recv
                        </div>
                        <div className={cn(
                          "text-[10px] font-extrabold px-2 py-0.5 rounded border inline-block",
                          (item.lorryProgress?.remainingLorries ?? 0) > 0 
                            ? "bg-amber-100 text-amber-900 border-amber-300" 
                            : "bg-emerald-100 text-emerald-900 border-emerald-300"
                        )}>
                          {(item.lorryProgress?.remainingLorries ?? 0) > 0 
                            ? `⏳ Waiting For Remaining Lorries (${item.lorryProgress.remainingLorries} Left)` 
                            : "✅ All Lorries Received"}
                        </div>
                      </div>
                    </td>

                    {/* Mismatched Fields Column */}
                    <td className="p-3 border-r border-slate-200 max-w-xs">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.mismatchedFields.map((fieldLabel, idx) => (
                          <span
                            key={idx}
                            className="bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight"
                          >
                            ⚠️ {fieldLabel}
                          </span>
                        ))}
                      </div>

                      {/* Field Discrepancy Breakdown */}
                      {item.mismatchDetailsList && item.mismatchDetailsList.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 space-y-1 text-[10px]">
                          {item.mismatchDetailsList.map((d, dIdx) => (
                            <div key={dIdx} className="flex items-center justify-between text-slate-700">
                              <span className="font-bold text-slate-800">{d.field}:</span>
                              <span className="text-slate-500 line-through mr-1">{d.poValue}</span>
                              <span className="font-extrabold text-rose-700">➔ {d.inspValue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3 border-r border-slate-200">
                      {item.status === 'resolved' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                          Cleared / Approved
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-700" />
                            {item.isClosed ? 'Closed – Mismatch' : 'Pending Approval'}
                          </span>
                          {item.isClosed && (
                            <span className="text-[8.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              P.O Closed
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Action & Remarks */}
                    <td className="p-3 min-w-[220px]">
                      {item.status === 'pending' ? (
                        canApproveMismatch() ? (
                          <div className="space-y-2">
                            <textarea
                              id="enter_approval_remarks_882"
                              name="enter_approval_remarks"
                              aria-label="Enter approval remarks..."
                              rows={2}
                              placeholder="Enter approval remarks..."
                              value={remarksMap[item.id] || ''}
                              onChange={(e) => setRemarksMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                            />
                            <button
                              onClick={() => handleResolve(item.id, item.poNo)}
                              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase px-3 py-1.5 rounded text-[10.5px] tracking-wider transition flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Check className="h-4 w-4" />
                              <span>Approve Mismatch</span>
                            </button>
                          </div>
                        ) : (
                          <div className="bg-slate-100 border border-slate-200 text-slate-600 p-2 rounded text-[10px] font-bold text-center">
                            🔒 L3 / L5 Level User Approval Required
                          </div>
                        )
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 p-2 rounded text-[10px] text-slate-800 space-y-1">
                          <div className="font-extrabold text-emerald-950 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                            <span>Approval Record</span>
                          </div>
                          <div><span className="font-bold">Approved By:</span> {item.resolvedBy || 'L3/L5 User'}</div>
                          <div><span className="font-bold">Approval Level:</span> <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-950 font-black rounded text-[9.5px]">{item.approvalLevel || 'L3/L5'}</span></div>
                          <div><span className="font-bold">Date:</span> {item.resolvedAt || 'N/A'}</div>
                          <div><span className="font-bold">Remarks:</span> "{item.resolutionNotes || 'Approved'}"</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2">
          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredMismatchList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  );
};
