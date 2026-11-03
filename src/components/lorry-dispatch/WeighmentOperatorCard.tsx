import React, { useState } from "react";
import { Scale } from "lucide-react";
import { LorryRecord, UserRole, SystemSettings } from "../../types/lorryDispatch.types";

interface WeighmentOperatorCardProps {
  lorry: LorryRecord;
  currentUserRole: UserRole;
  settings: SystemSettings;
  onSaveWeighment: (
    lorryId: string,
    station: "MILL" | "ELECTRIC",
    type: "GROSS" | "TARE",
    weightKg: number
  ) => void;
}

export const WeighmentOperatorCard: React.FC<WeighmentOperatorCardProps> = ({
  lorry,
  currentUserRole,
  settings,
  onSaveWeighment,
}) => {
  const isElectric = currentUserRole === "ELECTRIC_WEIGHTMENT";
  const station = isElectric ? "ELECTRIC" : "MILL";
  const isTareStep =
    lorry.status === "MILL_TARE_PENDING" || lorry.status === "ELECTRIC_TARE_PENDING";
  const type = isTareStep ? "TARE" : "GROSS";

  const zeroOffset = isElectric ? settings.electricZeroOffsetKg : settings.millZeroOffsetKg;

  const [simulatedWeight, setSimulatedWeight] = useState<number>(
    isTareStep ? 14200 : 38500
  );

  const displayWeight = simulatedWeight + zeroOffset;

  return (
    <div className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-2xl p-4 space-y-4 hover:border-[#F7AFA8] transition-all text-[#D94B5A] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-2.5">
        <div>
          <span className="text-sm font-black text-[#D94B5A] font-mono">{lorry.lorryNo}</span>
          <p className="text-[10px] text-[#D94B5A] font-mono">{lorry.gatePassNo} • {lorry.broker}</p>
        </div>
        <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-mono font-bold rounded-full uppercase">
          {type} WEIGHMENT PENDING
        </span>
      </div>

      {/* Large Industrial LED Digital Weight Display */}
      <div className="bg-[#F7AFA8] p-4 rounded-xl border border-[#FBCFCB] text-center space-y-1 shadow-inner">
        <span className="text-[10px] font-mono font-bold uppercase text-[#FBCFCB] tracking-wider">
          LIVE SCALE SIMULATED WEIGHT (KG)
        </span>
        <div className="text-3xl font-black font-mono text-[#FDE7E6] tracking-widest">
          {displayWeight.toLocaleString()} <span className="text-sm font-bold text-amber-400">KG</span>
        </div>
      </div>

      {/* Quick Weight Adjuster Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSimulatedWeight((prev) => Math.max(0, prev - 100))}
          className="flex-1 py-1 bg-[#FBCFCB] hover:bg-[#FBCFCB] border border-[#FBCFCB] rounded text-[#D94B5A] text-xs font-mono font-bold cursor-pointer transition-colors"
        >
          -100 KG
        </button>
        <button
          onClick={() => setSimulatedWeight((prev) => prev + 100)}
          className="flex-1 py-1 bg-[#FBCFCB] hover:bg-[#FBCFCB] border border-[#FBCFCB] rounded text-[#D94B5A] text-xs font-mono font-bold cursor-pointer transition-colors"
        >
          +100 KG
        </button>
      </div>

      <button
        onClick={() => onSaveWeighment(lorry.id, station, type, displayWeight)}
        className="w-full py-2.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <Scale className="w-4 h-4" />
        <span>Save & Confirm {station} {type} ({displayWeight.toLocaleString()} KG)</span>
      </button>
    </div>
  );
};
