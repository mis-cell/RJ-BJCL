import React from "react";
import { Truck, CheckCircle2, RefreshCw, Layers } from "lucide-react";
import { cn } from "../../lib/utils";
import { getPoContractLorryCount, getUniquePoLorryGroups } from "../../services/settlementService";

export interface SettlementMetricsRibbonProps {
  poStats: {
    contractQty: number;
    receivedQty: number;
    settledQty: number;
    pendingQty: number;
    customReceivedQty: number;
    pendingReceivedQty: number;
    dbPendingReceived: number;
  } | null;
  selectedPoNo: string;
  selectedPoData?: any;
  lastSyncTime: string;
  inspections: any[];
  customSettlementRecords: any[];
}

export const SettlementMetricsRibbon: React.FC<SettlementMetricsRibbonProps> = ({
  poStats,
  selectedPoNo,
  selectedPoData,
  lastSyncTime,
  inspections,
  customSettlementRecords,
}) => {
  if (!poStats && !selectedPoNo) return null;

  const totalDelivered = (poStats?.customReceivedQty || 0) + (poStats?.receivedQty || 0);
  const contractQty = poStats?.contractQty || 0;
  const pendingQty = poStats?.pendingReceivedQty ?? 0;
  const uniqueLorryGroups = getUniquePoLorryGroups(selectedPoNo, inspections || []);
  const linkedCount = uniqueLorryGroups.length;
  const contractLorries = getPoContractLorryCount(selectedPoData);

  const fulfillmentPercent = contractQty > 0
    ? Math.min(100, Math.max(0, (totalDelivered / contractQty) * 100))
    : 0;

  return (
    <div className="space-y-2 font-sans border border-slate-700 bg-slate-950 rounded-lg p-3 text-white shadow-md">
      {/* 1-to-N Fulfillment Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
          <span className="text-indigo-300 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-cyan-400 inline shrink-0" />
            <span>1-to-N P.O Consignment Fulfillment Progress {selectedPoNo ? `(PO #${selectedPoNo})` : ""}</span>
          </span>
          <span className="text-emerald-400 font-mono text-xs font-black">
            {fulfillmentPercent.toFixed(1)}% Fulfilled
          </span>
        </div>

        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/80">
          <div
            className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 h-full transition-all duration-500"
            style={{ width: `${fulfillmentPercent}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-300 font-mono pt-0.5">
          <span>
            Contract: <strong className="text-white font-bold">{contractQty.toFixed(3)} MT</strong>
          </span>
          <span>
            Delivered (Inspection):{" "}
            <strong className="text-emerald-400 font-bold">
              {totalDelivered.toFixed(3)} MT
            </strong>
          </span>
          <span>
            Pending Balance:{" "}
            <strong className="text-amber-300 font-bold">{pendingQty.toFixed(3)} MT</strong>
          </span>
          <span className="text-cyan-300 font-bold">
            Linked Consignments: {linkedCount}{contractLorries > 0 ? ` / ${contractLorries}` : ""} Lorr{linkedCount === 1 && contractLorries <= 1 ? 'y' : 'ies'}
          </span>
        </div>
      </div>

      {/* Grid of Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-900/90 border border-slate-800 rounded-md p-2.5 text-white">
        <div className="border-r border-slate-800 pr-2">
          <p className="text-[8.5px] font-extrabold uppercase text-indigo-300 tracking-wider">Total PO Contract</p>
          <p className="text-xs font-mono font-black text-white mt-0.5">{contractQty.toFixed(3)} MT</p>
        </div>
        <div className="border-r border-slate-800 px-2">
          <p className="text-[8.5px] font-extrabold uppercase text-emerald-300 tracking-wider">Inspected Received</p>
          <p className="text-xs font-mono font-black text-emerald-400 mt-0.5">{(poStats?.receivedQty || 0).toFixed(3)} MT</p>
        </div>
        <div className="border-r border-slate-800 px-2">
          <p className="text-[8.5px] font-extrabold uppercase text-amber-300 tracking-wider">Settles Sum (Classic)</p>
          <p className="text-xs font-mono font-black text-amber-400 mt-0.5">{(poStats?.settledQty || 0).toFixed(3)} MT</p>
        </div>
        <div className="border-r border-slate-800 px-2 bg-slate-950/40 rounded p-1">
          <p className="text-[8.5px] font-extrabold uppercase text-cyan-300 tracking-wider">M.R. Settlements Sum</p>
          <p className="text-xs font-mono font-black text-cyan-400 mt-0.5">{(poStats?.customReceivedQty || 0).toFixed(3)} MT</p>
        </div>
        <div className="pl-2 bg-indigo-950/40 rounded p-1">
          <p className="text-[8.5px] font-extrabold uppercase text-pink-300 tracking-wider">Pending Received</p>
          <p className="text-xs font-mono font-black text-pink-400 animate-pulse mt-0.5">{pendingQty.toFixed(3)} MT</p>
        </div>
      </div>

      {/* DB Sync Verification Footer */}
      <div className="flex flex-wrap items-center justify-between text-[9.5px] bg-slate-900 border border-slate-800/80 px-2.5 py-1.5 text-slate-300 font-mono rounded">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-extrabold flex items-center gap-1",
              Math.abs((poStats?.dbPendingReceived || 0) - pendingQty) < 0.001
                ? "text-emerald-400"
                : "text-amber-400"
            )}
          >
            ● DB-SYNC:{" "}
            {Math.abs((poStats?.dbPendingReceived || 0) - pendingQty) < 0.001
              ? `VERIFIED (purchase_master.pending_received = ${(poStats?.dbPendingReceived || 0).toFixed(3)} MT)`
              : `ACTIVE (Pending sync)`}
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Last DB Sync: <strong className="text-white font-sans">{lastSyncTime || "Real-time"}</strong>
          </span>
        </div>
        <div>
          <span>
            Cumulative Received Weight:{" "}
            <strong className="text-cyan-400 font-sans font-bold">
              {totalDelivered.toFixed(3)} MT
            </strong>
          </span>
        </div>
      </div>

      {/* Active P.O Settlements Log if present */}
      {customSettlementRecords && customSettlementRecords.length > 0 && (
        <div className="bg-slate-900/90 p-2 border border-slate-800 text-[9.5px] rounded space-y-1">
          <div className="flex items-center gap-1 text-slate-300 font-bold uppercase text-[9px]">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Active P.O Settlements Log ({customSettlementRecords.length} Records in m_r_settlement Table):</span>
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[9px] divide-y divide-slate-800">
            {customSettlementRecords.map((r, i) => (
              <div key={r.id || i} className="flex items-center justify-between pt-1">
                <span>
                  Settle Date: {r.settlement_date ? r.settlement_date.split("T")[0] : "N/A"} — Qty:{" "}
                  <strong className="text-cyan-400">{Number(r.quantity || 0).toFixed(3)} MT</strong>
                </span>
                <span className="text-slate-400 text-[8.5px]">
                  Scale Net: {Number(r.electronic_scale_net || 0).toFixed(3)} MT | Status:{" "}
                  <span className="uppercase font-bold text-emerald-400">{r.payment_status || "Settled"}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementMetricsRibbon;
