import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Check,
  Maximize2,
  Minimize2,
  Search,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PaginationControls } from '../PaginationControls';
import { SattaMismatchItem, SattaGroupedItem } from './mismatchTypes';

interface SattaMismatchViewProps {
  sattaFilterStatus: 'dispute' | 'resolved' | 'ok' | 'all';
  setSattaFilterStatus: (status: 'dispute' | 'resolved' | 'ok' | 'all') => void;
  sattaMismatchList: SattaMismatchItem[];
  expandAllSaudas: (keys: string[]) => void;
  collapseAllSaudas: () => void;
  filteredSattaGroups: SattaGroupedItem[];
  filteredSattaList: SattaMismatchItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loading: boolean;
  sattaCurrentPage: number;
  setSattaCurrentPage: (page: number) => void;
  sattaPageSize: number;
  setSattaPageSize: (size: number) => void;
  expandedSaudaKeys: Record<string, boolean>;
  toggleExpandSauda: (key: string) => void;
  canApproveMismatch: () => boolean;
  remarksMap: Record<string, string>;
  setRemarksMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleResolveSattaGroup: (group: SattaGroupedItem) => Promise<void>;
  savingSattaId: string | null;
}

export const SattaMismatchView: React.FC<SattaMismatchViewProps> = ({
  sattaFilterStatus,
  setSattaFilterStatus,
  sattaMismatchList,
  expandAllSaudas,
  collapseAllSaudas,
  filteredSattaGroups,
  filteredSattaList,
  searchQuery,
  setSearchQuery,
  loading,
  sattaCurrentPage,
  setSattaCurrentPage,
  sattaPageSize,
  setSattaPageSize,
  expandedSaudaKeys,
  toggleExpandSauda,
  canApproveMismatch,
  remarksMap,
  setRemarksMap,
  handleResolveSattaGroup,
  savingSattaId
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-300 p-3 rounded-lg shadow-xs space-y-3">
        {/* Top Row: Status Badges & Data Source Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSattaFilterStatus('dispute')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-extrabold uppercase border transition flex items-center gap-1.5",
                sattaFilterStatus === 'dispute' ? "bg-amber-700 text-white border-amber-800 shadow-xs" : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Price Disputes ({sattaMismatchList.filter(s => s.status === 'dispute').length})</span>
            </button>
            <button
              onClick={() => setSattaFilterStatus('resolved')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-extrabold uppercase border transition flex items-center gap-1.5",
                sattaFilterStatus === 'resolved' ? "bg-emerald-700 text-white border-emerald-800 shadow-xs" : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Approved ({sattaMismatchList.filter(s => s.status === 'resolved').length})</span>
            </button>
            <button
              onClick={() => setSattaFilterStatus('ok')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-extrabold uppercase border transition flex items-center gap-1.5",
                sattaFilterStatus === 'ok' ? "bg-blue-700 text-white border-blue-800 shadow-xs" : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
              )}
            >
              <Check className="h-3.5 w-3.5" />
              <span>Aligned Rate ({sattaMismatchList.filter(s => s.status === 'ok').length})</span>
            </button>
            <button
              onClick={() => setSattaFilterStatus('all')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-extrabold uppercase border transition",
                sattaFilterStatus === 'all' ? "bg-slate-900 text-white border-slate-900 shadow-xs" : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
              )}
            >
              All Status ({sattaMismatchList.length})
            </button>
          </div>

          {/* Quick info chip */}
          <div className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
            Validation: <span className="text-slate-900 font-bold">sauda_master Rate (₹/Qtl)</span> vs <span className="text-indigo-900 font-bold">Satta Limit Rate (Base + Area/Grade Diff)</span>
          </div>
        </div>

        {/* Second Row: Expand Controls & Search Box */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => expandAllSaudas(filteredSattaGroups.map(g => g.key))}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Expand all Sauda breakdown sub-tables"
            >
              <Maximize2 className="h-3.5 w-3.5 text-indigo-700" />
              <span>Expand All Views</span>
            </button>
            <button
              onClick={collapseAllSaudas}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Collapse all breakdown views"
            >
              <Minimize2 className="h-3.5 w-3.5 text-slate-600" />
              <span>Collapse All</span>
            </button>
            <span className="text-[11px] text-slate-500 font-medium ml-2">
              Showing <strong className="text-slate-800">{filteredSattaGroups.length}</strong> Sauda Contracts ({filteredSattaList.length} Grade Items)
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80 ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Sauda No, Supplier, Broker, Grade..."
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-600 text-slate-800 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-700 border-t-transparent mx-auto" />
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mt-3">Evaluating Sauda rates against Satta Chart parameters...</p>
          </div>
        ) : filteredSattaGroups.length === 0 ? (
          <div className="p-12 text-center bg-slate-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-sm font-extrabold text-slate-800 uppercase">No Satta Price Mismatches</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              No records match the selected status filter or search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10.5px]">
                  <th className="p-3 border-r border-slate-200">Sauda No. & Date</th>
                  <th className="p-3 border-r border-slate-200">Supplier & Broker</th>
                  <th className="p-3 border-r border-slate-200">Area & Grade</th>
                  <th className="p-3 border-r border-slate-200 bg-slate-50">Sauda Rate (₹/Qtl)</th>
                  <th className="p-3 border-r border-slate-200 bg-indigo-50/60 text-indigo-950 font-black">Satta Limit Rate (₹/Qtl)</th>
                  <th className="p-3 border-r border-slate-200">Variance / Excess (₹/Qtl)</th>
                  <th className="p-3 border-r border-slate-200">Status</th>
                  <th className="p-3 min-w-[220px]">Action & Approval Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSattaGroups.slice((sattaCurrentPage - 1) * sattaPageSize, sattaCurrentPage * sattaPageSize).map(group => {
                  const isExpanded = Boolean(expandedSaudaKeys[group.key]);
                  const isDispute = group.hasDispute;
                  const isResolved = group.isAllResolved || (group.resolvedCount > 0 && !group.hasDispute);

                  return (
                    <React.Fragment key={group.key}>
                      {/* Main Sauda / PO Group Row */}
                      <tr className={cn("hover:bg-slate-50 transition align-top", isExpanded && "bg-indigo-50/20")}>
                        {/* 1. Sauda No & Date + Expand View Button */}
                        <td className="p-3 border-r border-slate-200 font-mono">
                          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{group.poNo}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">Date: {group.poDate}</div>
                          {group.saudaNo && group.saudaNo !== 'N/A' && group.saudaNo !== group.poNo && (
                            <div className="text-[9.5px] text-indigo-700 font-bold mt-0.5">Ref: {group.saudaNo}</div>
                          )}
                          
                          {/* Expand / Collapse View Button */}
                          <button
                            type="button"
                            onClick={() => toggleExpandSauda(group.key)}
                            className={cn(
                              "mt-2 px-2 py-1 rounded text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer w-fit shadow-xs",
                              isExpanded 
                                ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700" 
                                : "bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100"
                            )}
                            title="Click to toggle expanded view of individual grade rates"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                <span>Collapse View</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5 text-indigo-700" />
                                <span>Expand View ({group.items.length} {group.items.length === 1 ? 'Grade' : 'Grades'})</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* 2. Supplier & Broker */}
                        <td className="p-3 border-r border-slate-200">
                          <div className="font-bold text-slate-800 uppercase">{group.supplierName}</div>
                          <div className="text-[10.5px] text-slate-500 font-medium">Broker: <span className="font-semibold text-slate-700">{group.brokerName}</span></div>
                        </td>

                        {/* 3. Area & Grades */}
                        <td className="p-3 border-r border-slate-200">
                          <div className="font-bold text-slate-800">{group.areaList.join(', ') || 'DAISEE'}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {group.gradeList.map((g, gIdx) => (
                              <span key={gIdx} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-extrabold rounded text-[10px]">
                                {g}
                              </span>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">
                            {group.items.length} {group.items.length === 1 ? 'Quality Item' : 'Quality Items'}
                          </div>
                        </td>

                        {/* 4. Sauda Rate (₹/Qtl) */}
                        <td className="p-3 border-r border-slate-200 bg-slate-50/50">
                          <div className="font-black text-slate-900 text-sm">
                            {group.minSaudaRateQtl === group.maxSaudaRateQtl ? (
                              <>₹ {group.minSaudaRateQtl.toLocaleString()} <span className="text-[10px] font-bold text-slate-500">/ Qtl</span></>
                            ) : (
                              <>₹ {group.minSaudaRateQtl.toLocaleString()} – {group.maxSaudaRateQtl.toLocaleString()} <span className="text-[10px] font-bold text-slate-500">/ Qtl</span></>
                            )}
                          </div>
                        </td>

                        {/* 5. Satta Limit Rate (₹/Qtl) */}
                        <td className="p-3 border-r border-slate-200 bg-indigo-50/30">
                          <div className="font-black text-indigo-950 text-sm">
                            {group.minSattaLimitQtl === group.maxSattaLimitQtl ? (
                              <>₹ {group.minSattaLimitQtl.toLocaleString()} <span className="text-[10px] font-bold text-indigo-700">/ Qtl</span></>
                            ) : (
                              <>₹ {group.minSattaLimitQtl.toLocaleString()} – {group.maxSattaLimitQtl.toLocaleString()} <span className="text-[10px] font-bold text-indigo-700">/ Qtl</span></>
                            )}
                          </div>
                          <div className="text-[10px] font-semibold text-indigo-800 mt-0.5">
                            Active Satta Chart Range
                          </div>
                        </td>

                        {/* 6. Variance / Excess (₹/Qtl) */}
                        <td className="p-3 border-r border-slate-200 font-black">
                          {isDispute ? (
                            <div className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded text-xs inline-block">
                              ⚠️ + ₹ {group.maxDifferenceQtl.toLocaleString()} / Qtl
                            </div>
                          ) : group.minDifferenceQtl < 0 ? (
                            <div className="text-emerald-700 text-xs font-bold">
                              - ₹ {Math.abs(group.minDifferenceQtl).toLocaleString()} / Qtl
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-extrabold">Aligned</span>
                          )}
                        </td>

                        {/* 7. Status */}
                        <td className="p-3 border-r border-slate-200 font-bold uppercase">
                          {isDispute ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                              Price Dispute ({group.disputeCount})
                            </span>
                          ) : isResolved ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                              Approved / Cleared
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide">
                              <Check className="h-3.5 w-3.5 text-blue-700" />
                              OK
                            </span>
                          )}
                        </td>

                        {/* 8. Action & Approval Remarks (Single Action for this Sauda/PO) */}
                        <td className="p-3 min-w-[220px]">
                          {isDispute ? (
                            canApproveMismatch() ? (
                              <div className="space-y-2">
                                <textarea
                                  rows={2}
                                  placeholder={`Enter dispute clearance remarks for ${group.poNo}...`}
                                  value={remarksMap[group.key] || remarksMap[group.poNo] || remarksMap[group.saudaNo] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setRemarksMap(prev => ({
                                      ...prev,
                                      [group.key]: val,
                                      [group.poNo]: val,
                                      [group.saudaNo]: val
                                    }));
                                  }}
                                  className="w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                                />
                                <button
                                  onClick={() => handleResolveSattaGroup(group)}
                                  disabled={savingSattaId === group.key}
                                  className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black uppercase px-3 py-1.5 rounded text-[10.5px] tracking-wider transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                  title={`Save remarks & approve dispute for ${group.poNo}`}
                                >
                                  {savingSattaId === group.key ? (
                                    <>
                                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                      <span>Saving...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4" />
                                      <span>Save & Approve Dispute{group.items.length > 1 ? ` (${group.items.length})` : ''}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="bg-slate-100 border border-slate-200 text-slate-600 p-2 rounded text-[10px] font-bold text-center">
                                🔒 L3 / L5 Level User Approval Required
                              </div>
                            )
                          ) : isResolved ? (
                            <div className="bg-emerald-50 border border-emerald-200 p-2 rounded text-[10px] text-slate-800 space-y-1">
                              <div className="font-extrabold text-emerald-950 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                                <span>Approval Record</span>
                              </div>
                              <div><span className="font-bold">Approved By:</span> {group.latestResolvedBy || 'L3/L5 User'}</div>
                              <div><span className="font-bold">Approval Level:</span> <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-950 font-black rounded text-[9.5px]">{group.latestApprovalLevel || 'L3/L5'}</span></div>
                              <div><span className="font-bold">Date:</span> {group.latestResolvedAt || 'N/A'}</div>
                              <div><span className="font-bold">Remarks:</span> "{group.latestResolutionNotes || 'Approved'}"</div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 font-medium italic">
                              Rate within acceptable limits. No action required.
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Breakdown View for this Sauda */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-y-2 border-indigo-200">
                          <td colSpan={8} className="p-3 bg-gradient-to-r from-indigo-50/40 via-white to-indigo-50/40">
                            <div className="rounded-lg border border-indigo-200 bg-white p-3 shadow-xs space-y-2.5">
                              <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                                <div className="flex items-center gap-2 font-black text-indigo-950 text-xs uppercase tracking-wide">
                                  <Layers className="h-4 w-4 text-indigo-700" />
                                  <span>Detailed Grade & Rate Breakdown — Sauda {group.poNo}</span>
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                    {group.items.length} {group.items.length === 1 ? 'Grade' : 'Grades'}
                                  </span>
                                </div>
                                <div className="text-[11px] font-bold text-slate-500">
                                  Supplier: <strong className="text-slate-800">{group.supplierName}</strong> • Broker: <strong className="text-slate-800">{group.brokerName}</strong>
                                </div>
                              </div>

                              {/* Breakdown Sub-Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                                      <th className="py-2 px-2.5 border-r border-slate-200">#</th>
                                      <th className="py-2 px-2.5 border-r border-slate-200">Area & Grade</th>
                                      <th className="py-2 px-2.5 border-r border-slate-200 bg-slate-50">Sauda Rate (₹/Qtl)</th>
                                      <th className="py-2 px-2.5 border-r border-slate-200 bg-indigo-50/40">Satta Base Rate</th>
                                      <th className="py-2 px-2.5 border-r border-slate-200 bg-indigo-50/40">Differential</th>
                                      <th className="py-2 px-2.5 border-r border-slate-200 bg-indigo-50/70 text-indigo-950 font-black">Satta Limit Rate (₹/Qtl)</th>
                                      <th className="py-2 px-2.5 border-r border-slate-200">Variance / Excess</th>
                                      <th className="py-2 px-2.5">Item Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 text-[11px]">
                                    {group.items.map((subItem, sIdx) => {
                                      const subDispute = subItem.status === 'dispute';
                                      const subResolved = subItem.status === 'resolved';

                                      return (
                                        <tr key={subItem.id} className="hover:bg-slate-50 transition">
                                          <td className="py-2 px-2.5 border-r border-slate-200 font-bold text-slate-400">{sIdx + 1}</td>
                                          <td className="py-2 px-2.5 border-r border-slate-200 font-bold text-slate-800">
                                            {subItem.area} – <span className="text-indigo-900 font-extrabold">{subItem.grade}</span>
                                          </td>
                                          <td className="py-2 px-2.5 border-r border-slate-200 font-black text-slate-900">
                                            ₹ {subItem.poRateQtl.toLocaleString()} <span className="text-[9.5px] font-bold text-slate-500">/ Qtl</span>
                                          </td>
                                          <td className="py-2 px-2.5 border-r border-slate-200 font-semibold text-slate-700">
                                            ₹ {subItem.sattaBaseRateQtl.toLocaleString()}
                                          </td>
                                          <td className="py-2 px-2.5 border-r border-slate-200 font-semibold text-slate-700">
                                            {subItem.differentialQtl >= 0 ? `+ ₹${subItem.differentialQtl.toLocaleString()}` : `- ₹${Math.abs(subItem.differentialQtl).toLocaleString()}`}
                                          </td>
                                          <td className="py-2 px-2.5 border-r border-slate-200 font-black text-indigo-950 bg-indigo-50/20">
                                            ₹ {subItem.sattaFinalRateQtl.toLocaleString()} <span className="text-[9.5px] font-bold text-indigo-700">/ Qtl</span>
                                          </td>
                                          <td className="py-2 px-2.5 border-r border-slate-200 font-black">
                                            {subItem.differenceQtl > 0 ? (
                                              <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10.5px]">
                                                ⚠️ + ₹ {subItem.differenceQtl.toLocaleString()} / Qtl
                                              </span>
                                            ) : subItem.differenceQtl < 0 ? (
                                              <span className="text-emerald-700 font-bold">
                                                - ₹ {Math.abs(subItem.differenceQtl).toLocaleString()} / Qtl
                                              </span>
                                            ) : (
                                              <span className="text-emerald-700 font-bold">Aligned</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-2.5 font-bold uppercase">
                                            {subDispute ? (
                                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[9.5px] font-black">
                                                <AlertTriangle className="h-3 w-3 text-amber-700" />
                                                Price Dispute
                                              </span>
                                            ) : subResolved ? (
                                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full text-[9.5px] font-black">
                                                <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                                                Approved
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-full text-[9.5px] font-black">
                                                <Check className="h-3 w-3 text-blue-700" />
                                                OK
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2">
          <PaginationControls
            currentPage={sattaCurrentPage}
            totalItems={filteredSattaGroups.length}
            pageSize={sattaPageSize}
            onPageChange={setSattaCurrentPage}
            onPageSizeChange={setSattaPageSize}
          />
        </div>
      </div>
    </div>
  );
};
