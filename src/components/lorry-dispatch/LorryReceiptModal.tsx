import React from "react";
import { X, FileDown } from "lucide-react";
import { LorryRecord } from "../../types/lorryDispatch.types";

interface LorryReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  lorry: LorryRecord | null;
  onGeneratePdf: (lorry: LorryRecord) => void;
}

export const LorryReceiptModal: React.FC<LorryReceiptModalProps> = ({
  isOpen,
  onClose,
  lorry,
  onGeneratePdf
}) => {
  if (!isOpen || !lorry) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FDE7E6] border border-[#FBCFCB] w-full max-w-sm p-5 rounded-2xl shadow-2xl space-y-4 text-[#D94B5A]">
        <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3">
          <h3 className="text-xs font-black text-[#D94B5A] uppercase tracking-wider font-mono">
            3-Inch Thermal Receipt Preview
          </h3>
          <button onClick={onClose} className="text-[#D94B5A] hover:text-[#D94B5A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printed Ticket Card */}
        <div className="bg-[#FDE7E6] text-[#D94B5A] p-4 rounded-xl text-xs font-mono space-y-2 border border-[#FBCFCB] shadow-xs">
          <div className="text-center border-b border-[#FBCFCB] pb-2">
            <p className="font-black text-sm uppercase">BALLY JUTE COMPANY LIMITED</p>
            <p className="text-[9px] text-[#D94B5A]">Lorry Weighment & Dispatch Slip</p>
          </div>

          <div className="space-y-1 text-[11px]">
            <p><strong>GATE PASS:</strong> {lorry.gatePassNo}</p>
            <p><strong>LORRY NO:</strong> {lorry.lorryNo}</p>
            <p><strong>Date/In-Time:</strong> {lorry.entryDate || ""} {lorry.inTime || "N/A"}</p>
            <p><strong>Date/Out-Time:</strong> {lorry.outDate || ""} {lorry.outTime || "Active"}</p>
            <p><strong>Driver Phone:</strong> {lorry.driverPhone || "N/A"}</p>
            <p><strong>Department:</strong> {lorry.department}</p>
            <p><strong>Broker:</strong> {lorry.broker || "N/A"}</p>
            <p><strong>Quality:</strong> {lorry.quality || lorry.description || "N/A"}</p>
            <p><strong>Mokam:</strong> {lorry.mokam || "N/A"} | <strong>Marka:</strong> {lorry.marka || "N/A"}</p>
          </div>

          <div className="border-t border-[#FBCFCB] pt-2 space-y-1 text-[11px]">
            {lorry.millGrossWeight && <p>Mill Gross: {lorry.millGrossWeight.toLocaleString()} kg</p>}
            {lorry.millTareWeight && <p>Mill Tare: {lorry.millTareWeight.toLocaleString()} kg</p>}
            {lorry.electricGrossWeight && <p>Elec Gross: {lorry.electricGrossWeight.toLocaleString()} kg</p>}
            {lorry.electricTareWeight && <p>Elec Tare: {lorry.electricTareWeight.toLocaleString()} kg</p>}
            <p className="font-bold text-sm text-[#D94B5A] pt-1 border-t border-[#FBCFCB]">
              FINAL NET: {(lorry.finalNetWeight || 0).toLocaleString()} KG
            </p>
          </div>
        </div>

        <button
          onClick={() => onGeneratePdf(lorry)}
          className="w-full py-2.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <FileDown className="w-4 h-4" />
          <span>Download / Print 3-Inch Slip PDF</span>
        </button>
      </div>
    </div>
  );
};
