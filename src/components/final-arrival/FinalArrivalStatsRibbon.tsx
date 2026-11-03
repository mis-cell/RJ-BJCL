import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  Package, 
  Scale, 
  RefreshCcw, 
  AlertTriangle, 
  X,
  RefreshCw
} from 'lucide-react';
import { FinalArrivalStats, DetectedConflict } from './finalArrivalTypes';

interface FinalArrivalStatsRibbonProps {
  stats: FinalArrivalStats;
  filteredLoadsCount: number;
  totalBales: number;
  totalWeightMt: number;
  autoSyncEnabled: boolean;
  lastSyncTime: string | null;
  backgroundSyncing: boolean;
  syncStatusMessage: string;
  detectedConflicts: DetectedConflict[];
  showConflictsAlert: boolean;
  setShowConflictsAlert: (show: boolean) => void;
  runReconcileFix: () => void;
}

export function FinalArrivalStatsRibbon({
  stats,
  filteredLoadsCount,
  totalBales,
  totalWeightMt,
  autoSyncEnabled,
  lastSyncTime,
  backgroundSyncing,
  syncStatusMessage,
  detectedConflicts,
  showConflictsAlert,
  setShowConflictsAlert,
  runReconcileFix
}: FinalArrivalStatsRibbonProps) {
  return (
    <div className="space-y-3.5">
      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total M.R. */}
        <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs hover:border-[#F7AFA8]/40 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Total Final M.R.</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#D94B5A] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-slate-900">{filteredLoadsCount} <span className="text-xs font-sans font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">M.R</span></p>
          <p className="text-[10px] font-medium text-emerald-700 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {stats.totalVehicles > 0 ? `${stats.totalVehicles} Vehicles / Lorries` : 'All Active Final M.R Records'}
          </p>
        </div>

        {/* KPI 2: Total Bales */}
        <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs hover:border-[#F7AFA8]/40 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Total Packets</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#8C6D33] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-blue-900">{totalBales.toLocaleString()} <span className="text-xs font-sans font-semibold text-slate-600">Bales</span></p>
          <p className="text-[10px] font-medium text-slate-500 mt-1">Finalized Packets</p>
        </div>

        {/* KPI 3: Total Weight */}
        <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs hover:border-[#F7AFA8]/40 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Total Weight</span>
            <div className="w-8 h-8 rounded-lg bg-[#FDE7E6] text-[#D94B5A] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-rose-700">{totalWeightMt.toFixed(3)} <span className="text-xs font-sans font-semibold text-slate-600">MT</span></p>
          <p className="text-[10px] font-medium text-slate-500 mt-1">Net Metric Tons</p>
        </div>

        {/* KPI 4: Sync Daemon */}
        <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs hover:border-[#F7AFA8]/40 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Sync Daemon</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              {backgroundSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              ) : (
                <RefreshCcw className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
          <p className="text-base font-bold font-mono text-slate-800">{autoSyncEnabled ? 'ACTIVE' : 'IDLE'}</p>
          <p className="text-[10px] font-medium text-slate-500 mt-1 truncate">{lastSyncTime || 'Auto Sync Ready'}</p>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span>{syncStatusMessage}</span>
        </div>
      )}

      {/* Live Mismatch / Audit Conflict Alert Notification Panel */}
      <AnimatePresence>
        {showConflictsAlert && detectedConflicts.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50/90 border-2 border-amber-500 rounded-lg p-3.5 shadow-md flex flex-col gap-3 font-sans"
          >
            <div className="flex items-start justify-between gap-3 border-b border-amber-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 px-2 rounded-md bg-amber-600 text-white font-serif font-black animate-pulse flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-900 tracking-wide">
                    ⚠️ Quality Audit System Reconciliation Conflicts
                  </h4>
                  <p className="text-[10px] font-semibold text-amber-700 leading-tight">
                    Manual force-refresh has detected {detectedConflicts.length} active conflict(s) between raw Jute Goods Arrival Tracking records and certified Laboratory Quality Inspections.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowConflictsAlert(false)}
                className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-md transition-all cursor-pointer text-xs uppercase font-black"
                title="Dismiss alert panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Detail list of mismatches */}
            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-amber-300">
              {detectedConflicts.map((conf, index) => (
                <div key={index} className="bg-white border border-amber-200 rounded-md p-2.5 shadow-xs flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-slate-100 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-amber-600 text-white font-mono font-black text-[9px] px-1.5 py-0.5 rounded shadow-xs">
                        FA #: {conf.arrivalNo}
                      </span>
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[9px] px-1.5 py-0.5 rounded font-black">
                        LORRY: {conf.lorryNo}
                      </span>
                      <span className="text-slate-400 font-bold text-[10px]">•</span>
                      <span className="text-slate-700 font-semibold text-[10px] truncate max-w-xs">
                        Supplier: <strong>{conf.supplier}</strong>
                      </span>
                    </div>
                    <div className="bg-amber-100/60 text-amber-950 border border-amber-300 text-[9px] font-mono font-black px-2 py-0.5 rounded">
                      Linked M.R. NO: {conf.mrNo}
                    </div>
                  </div>

                  <table className="w-full text-left text-[10.5px] font-sans border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-black uppercase text-[8.5px] border-b border-slate-200">
                        <th className="py-1 px-2 w-[40%]">Metric Field Comparison</th>
                        <th className="py-1 px-2 text-rose-700 w-[30%]">Arrival tracking Value</th>
                        <th className="py-1 px-2 text-emerald-700 w-[30%]">Quality Audit master Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {conf.conflicts.map((item, i) => (
                        <tr key={i} className="hover:bg-amber-50/20 font-mono">
                          <td className="py-1 px-2 text-slate-600 font-sans">{item.label}</td>
                          <td className="py-1 px-2 text-rose-600 font-black">{item.arrivalVal || 'N/A'}</td>
                          <td className="py-1 px-2 text-emerald-600 font-black">{item.qualityVal || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-amber-200 pt-2 gap-2">
              <span className="text-[9px] text-amber-800 font-medium italic">
                Note: Values in the Quality Audit Ledger are authorized and certified directly by the Mill Lab premises.
              </span>
              <button
                onClick={() => {
                  if (confirm("Would you like to force update the arrival registers using lab-certified values to eradicate all mismatched differences?")) {
                    runReconcileFix();
                  }
                }}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-wider shadow-xs hover:shadow-sm cursor-pointer transition-all duration-100 text-[9px]"
              >
                ⚡ Bulk Reconcile with Quality Values
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
