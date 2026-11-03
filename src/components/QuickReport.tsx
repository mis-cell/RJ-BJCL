import React from 'react';
import { motion } from 'motion/react';
import { 
  Archive, 
  FileCheck, 
  RefreshCw, 
  Database, 
  Clock, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface QuickReportProps {
  totalArrivals: number;
  pendingMrSettlements: number;
  totalPackets: number;
  totalWeightQtl: number;
  loading: boolean;
  onRefresh: () => void;
  onNavigate: (page: string) => void;
}

export default function QuickReport({
  totalArrivals,
  pendingMrSettlements,
  totalPackets,
  totalWeightQtl,
  loading,
  onRefresh,
  onNavigate
}: QuickReportProps) {
  return (
    <div className="bg-[#FFF9F8] border border-[#FBCFCB] p-4.5 rounded-xl shadow-xs space-y-4 font-sans">
      <div className="flex justify-between items-center border-b border-[#FBCFCB] pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Database className="h-4.5 w-4.5 text-[#D94B5A]" />
            <h3 className="text-[12px] font-black uppercase tracking-wider text-[#29252B]">
              Quick Report Summary
            </h3>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="bg-white hover:bg-[#FDE7E6] border border-[#FBCFCB] hover:border-[#F7AFA8] px-2.5 py-1 text-[9.5px] font-black uppercase text-[#D94B5A] flex items-center gap-1.5 cursor-pointer shadow-xs active:translate-y-px transition-all rounded"
          id="quick-report-refresh-btn"
        >
          <RefreshCw className={cn("h-3 w-3 text-[#D94B5A]", loading && "animate-spin")} />
          <span>{loading ? "Syncing" : "Refresh"}</span>
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Total Arrivals (from amad_register) */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-[#FBCFCB] hover:border-[#F06D6C] p-4 rounded-xl shadow-xs relative overflow-hidden flex flex-col justify-between transition-all"
          id="card-total-arrivals"
        >
          <div className="absolute top-2 right-2 text-[#FDE7E6]/80 pointer-events-none">
            <Archive className="h-14 w-14" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-[#D94B5A] bg-[#FDE7E6] border border-[#FBCFCB] px-1.5 py-0.5 tracking-wider rounded">
              Source: amad_register (Live)
            </span>
            <h4 className="text-[11px] font-black text-[#667085] uppercase tracking-wide mt-3 mb-1">
              Total Safe Jute Arrivals
            </h4>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-mono font-black text-[#29252B]">
                {loading ? "..." : totalArrivals}
              </span>
              <span className="text-[9.5px] font-bold text-[#667085] font-mono uppercase">
                Lorries Arrived
              </span>
            </div>
          </div>
          
          <div className="border-t border-[#FDE7E6] mt-4 pt-3 space-y-1.5">
            <div className="flex justify-between items-center text-[9px] text-[#475467] font-mono">
              <span className="font-bold">TOTAL VOLUME QUANTITY:</span>
              <span className="font-black text-[#29252B]">{totalPackets.toLocaleString()} Bales</span>
            </div>
            <div className="flex justify-between items-center text-[9px] text-[#475467] font-mono">
              <span className="font-bold">ESTIMATED LAID-DOWN WEIGHT:</span>
              <span className="font-black text-[#216E45] font-bold">
                {(totalWeightQtl / 10).toFixed(2)} MT
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('amad')}
            className="mt-3.5 w-full bg-[#FFF9F8] hover:bg-[#FDE7E6] text-[#D94B5A] font-extrabold uppercase text-[9px] tracking-wider py-1.5 border border-[#FBCFCB] hover:border-[#F7AFA8] shadow-xs flex items-center justify-center gap-1 cursor-pointer group rounded transition-colors"
            id="btn-goto-amad-reg"
          >
            <span>Amad Arrival Registry</span>
            <ArrowRight className="h-3 w-3 text-[#D94B5A] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </motion.div>

        {/* Card 2: Pending M.R. Settlements (from material_inspection) */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-[#FBCFCB] hover:border-[#F06D6C] p-4 rounded-xl shadow-xs relative overflow-hidden flex flex-col justify-between transition-all"
          id="card-pending-settlements"
        >
          <div className="absolute top-2 right-2 text-[#FDE7E6]/80 pointer-events-none">
            <FileCheck className="h-14 w-14" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-[#D94B5A] bg-[#FDE7E6] border border-[#FBCFCB] px-1.5 py-0.5 tracking-wider rounded">
              Source: material_inspection
            </span>
            <h4 className="text-[11px] font-black text-[#667085] uppercase tracking-wide mt-3 mb-1">
              Pending M.R. Settlements
            </h4>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={cn(
                "text-2xl font-mono font-black",
                pendingMrSettlements > 0 ? "text-[#B42318]" : "text-[#216E45]"
              )}>
                {loading ? "..." : pendingMrSettlements}
              </span>
              <span className="text-[9.5px] font-bold text-[#667085] font-mono uppercase">
                Awaiting clearance
              </span>
            </div>
          </div>

          <div className="border-t border-[#FDE7E6] mt-4 pt-3">
            {pendingMrSettlements > 0 ? (
              <div className="flex items-center gap-1.5 text-[9px] text-[#925C13] bg-[#FDE7E6] border border-[#FBCFCB] p-2 rounded">
                <AlertCircle className="h-3.5 w-3.5 text-[#925C13] shrink-0" />
                <span className="font-bold uppercase tracking-tight">
                  {pendingMrSettlements} inspection logs require physical weighbridge comparisons & claims clearance!
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[9px] text-[#216E45] bg-[#FDE7E6] border border-[#FBCFCB] p-2 rounded">
                <FileCheck className="h-3.5 w-3.5 text-[#216E45] shrink-0" />
                <span className="font-bold uppercase tracking-tight">
                  Operational clean state: All quality inspections have been cleanly settled.
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('mr_settlement')}
            className="mt-3.5 w-full bg-[#FFF9F8] hover:bg-[#FDE7E6] text-[#D94B5A] font-extrabold uppercase text-[9px] tracking-wider py-1.5 border border-[#FBCFCB] hover:border-[#F7AFA8] shadow-xs flex items-center justify-center gap-1 cursor-pointer group rounded transition-colors"
            id="btn-goto-mr-desk"
          >
            <span>Weighbridge Settlement Desk</span>
            <ArrowRight className="h-3 w-3 text-[#D94B5A] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
