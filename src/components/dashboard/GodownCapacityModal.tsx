import React, { useState } from 'react';
import { Container, Scale } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GodownUtil } from './types';

export interface GodownCapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
  godownUtils: GodownUtil[];
  globalUtilization?: string;
}

export default function GodownCapacityModal({
  isOpen,
  onClose,
  godownUtils,
  globalUtilization = '0'
}: GodownCapacityModalProps) {
  const [selectedGodownIndex, setSelectedGodownIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const totalRegisteredCap = godownUtils.reduce((acc, g) => acc + g.capacity, 0);
  const totalPhysicalStockLive = godownUtils.reduce((acc, g) => acc + g.stockMt, 0);

  const handleClose = () => {
    setSelectedGodownIndex(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-[#FBCFCB] shadow-2xl w-full max-w-4xl flex flex-col rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 h-[85vh]">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#D94B5A] via-[#E85A5A] to-[#D94B5A] text-white px-3 py-2 flex justify-between items-center shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-xs font-sans tracking-wide">
            <Container className="h-4 w-4 text-[#FDE7E6]" />
            <span className="font-black uppercase">Godown Capacity Utilization Summary Register</span>
          </div>
          <button 
            onClick={handleClose}
            className="bg-[#E85A5A] hover:bg-[#F06D6C] text-white px-2 py-0.5 rounded border border-[#F48F8B] transition-colors flex items-center justify-center cursor-pointer font-extrabold text-[10px]"
          >
            ✕
          </button>
        </div>

        {/* Upper Control Bar */}
        <div className="bg-[#FFF9F8] p-3 border-b border-[#FBCFCB] flex justify-between items-center gap-2 flex-wrap">
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white px-3 py-1.5 border border-[#FBCFCB] rounded-lg shadow-xs min-w-[110px]">
              <span className="text-[8.5px] font-bold text-[#667085] uppercase block leading-none mb-0.5">Total Owned Nodes</span>
              <span className="text-[12px] font-black text-[#29252B] tracking-tight">{godownUtils.length} Godowns</span>
            </div>
            <div className="bg-white px-3 py-1.5 border border-[#FBCFCB] rounded-lg shadow-xs min-w-[120px]">
              <span className="text-[8.5px] font-bold text-[#667085] uppercase block leading-none mb-0.5">Total Registered Cap</span>
              <span className="text-[12px] font-black text-[#D94B5A] font-mono tracking-tight">
                {totalRegisteredCap.toLocaleString()} MT
              </span>
            </div>
            <div className="bg-white px-3 py-1.5 border border-[#FBCFCB] rounded-lg shadow-xs min-w-[130px]">
              <span className="text-[8.5px] font-bold text-[#667085] uppercase block leading-none mb-0.5">Physical Stock Live</span>
              <span className="text-[12px] font-black text-[#216E45] font-mono tracking-tight">
                {totalPhysicalStockLive.toFixed(1)} MT
              </span>
            </div>
            <div className="bg-white px-3 py-1.5 border border-[#FBCFCB] rounded-lg shadow-xs min-w-[120px]">
              <span className="text-[8.5px] font-bold text-[#667085] uppercase block leading-none mb-0.5">Global Utility Rate</span>
              <span className="text-[12px] font-black text-[#925C13] font-mono tracking-tight">
                {globalUtilization || '0'}%
              </span>
            </div>
          </div>
          <div className="hidden md:block text-[9px] font-mono font-black text-[#D94B5A] pr-2 uppercase">Capacity Controls Center</div>
        </div>

        {/* Main Split Content Body */}
        <div className="flex-1 overflow-hidden flex bg-white divide-x divide-slate-300">
          
          {/* Left Side: Godown List */}
          <div className="w-1/2 overflow-y-auto p-2.5 space-y-2">
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-wide mb-2.5">Select a Warehouse Row to audit:</p>
            
            <div className="space-y-1.5">
              {godownUtils.map((g, idx) => {
                const isSelected = selectedGodownIndex === idx;
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedGodownIndex(idx)}
                    className={cn(
                      "p-2 py-2.5 border rounded-lg transition-all cursor-pointer relative group",
                      isSelected 
                        ? "bg-[#FDE7E6] border-[#D94B5A] shadow-xs" 
                        : "border-[#FBCFCB] hover:border-[#F7AFA8] hover:bg-[#FFF5F4]"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <span className="text-[8px] font-black text-[#D94B5A] bg-[#FDE7E6] border border-[#FBCFCB] px-1 py-0.5 rounded mr-1.5 font-mono uppercase tracking-wider">
                          {g.code}
                        </span>
                        <strong className="text-xs uppercase font-extrabold text-[#29252B]">{g.name}</strong>
                      </div>
                      <span className={cn(
                        "text-[10px] font-black font-mono",
                        g.utilization > 80 ? "text-[#B42318]" :
                        g.utilization > 50 ? "text-[#925C13]" : "text-[#216E45]"
                      )}>
                        {g.utilization}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#FBCFCB]/50 rounded-sm h-1.5 mb-2 overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-sm transition-all duration-300",
                          g.utilization > 80 ? "bg-[#B42318]" :
                          g.utilization > 50 ? "bg-[#925C13]" : "bg-[#216E45]"
                        )}
                        style={{ width: `${Math.min(100, g.utilization)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[8px] font-bold text-[#667085] font-mono">
                      <span>CAPACITY: {g.capacity} MT</span>
                      <span>STOCK: {g.stockMt.toFixed(1)} MT ({g.bales.toLocaleString()} Bales)</span>
                    </div>

                    <span className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-[7px] font-black uppercase text-[#D94B5A] tracking-wider transition-opacity">
                      Inspect details →
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Detailed stock breakdown of selected Godown */}
          <div className="w-1/2 overflow-y-auto p-4 bg-[#FFF9F8]/50 flex flex-col">
            {selectedGodownIndex !== null ? (
              (() => {
                const selG = godownUtils[selectedGodownIndex];
                return (
                  <div className="space-y-4">
                    <div className="border-b border-[#FBCFCB] pb-3">
                      <h4 className="text-xs font-black uppercase text-[#29252B] tracking-tight flex items-center gap-1.5">
                        <Scale className="h-4 w-4 text-[#D94B5A] shrink-0" />
                        RE-INSPECTION LEDGERS FOR GODOWN {selG.name}
                      </h4>
                      <p className="text-[10px] text-[#667085] font-medium font-mono">Code Reference: <strong className="font-extrabold text-[#29252B]">GDN-{selG.code}</strong></p>
                    </div>

                    {/* Snapshot stats */}
                    <div className="grid grid-cols-2 gap-3 h-fit">
                      <div className="bg-white p-2.5 border border-[#FBCFCB] rounded-lg shadow-xs">
                        <span className="text-[8px] font-black text-[#667085] block uppercase leading-none mb-1">RATED CAPACITY</span>
                        <strong className="text-[#29252B] text-[11px] font-mono leading-none">{selG.capacity} MT</strong>
                      </div>
                      <div className="bg-white p-2.5 border border-[#FBCFCB] rounded-lg shadow-xs">
                        <span className="text-[8px] font-black text-[#667085] block uppercase leading-none mb-1">LOADED STOCK</span>
                        <strong className="text-[#29252B] text-[11px] font-mono leading-none">{selG.stockMt.toFixed(2)} MT</strong>
                      </div>
                    </div>

                    <div className="border border-[#FBCFCB] rounded-lg bg-white overflow-x-auto shadow-xs">
                      <table className="w-full text-left text-[9px] border-collapse min-w-[450px]">
                        <thead className="bg-[#FFF1F0] border-b border-[#FBCFCB] uppercase text-[#29252B] font-bold font-mono">
                          <tr className="h-7 text-[9px]">
                            <th className="px-3 border-r border-[#FBCFCB] uppercase">Grade Component</th>
                            <th className="px-3 text-right border-r border-[#FBCFCB] uppercase">Bales Qty</th>
                            <th className="px-3 text-right border-r border-[#FBCFCB] uppercase">Weight (KG)</th>
                            <th className="px-3 text-right uppercase">Weight (MT)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#FDE7E6] font-bold text-[#475467] font-mono">
                          {selG.stocks && selG.stocks.length > 0 ? (
                            selG.stocks.map((st: any, idx: number) => (
                              <tr key={idx} className="h-7 hover:bg-[#FFF5F4] text-[9px] transition-colors">
                                <td className="px-3 border-r border-[#FDE7E6] font-bold">
                                  <span className="bg-[#FDE7E6] border border-[#FBCFCB] text-[#D94B5A] px-1 py-0.5 rounded text-[8px] font-black">
                                    {st.grade}
                                  </span>
                                </td>
                                <td className="px-3 text-right border-r border-[#FDE7E6] font-bold text-[#29252B]">{Number(st.quantity || 0).toLocaleString()}</td>
                                <td className="px-3 text-right border-r border-[#FDE7E6] font-bold text-[#216E45]">{(Number(st.weight || 0) * 100).toLocaleString(undefined, {maximumFractionDigits: 0})} kg</td>
                                <td className="px-3 text-right font-bold text-[#D94B5A]">{(Number(st.weight || 0) / 10).toFixed(2)} MT</td>
                              </tr>
                            ))
                          ) : (
                            <tr className="h-20 bg-white">
                              <td colSpan={4} className="text-center text-[#98A2B3] italic">
                                No direct physical stock records found in opening_stock tables for this godown.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg p-2.5 shadow-xs font-sans">
                      <h5 className="text-[10px] font-black uppercase text-[#925C13] mb-0.5">Capacity Auditing Notice</h5>
                      <p className="text-[9px] text-[#29252B] leading-relaxed font-semibold">
                        These stock metrics represent active inventory allocated securely inside this specific node directory. Always match against monthly physical floor counts before authorizing issues.
                      </p>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-[#98A2B3]">
                <Container className="h-10 w-10 text-[#FBCFCB] stroke-[1.25] mb-2" />
                <h4 className="text-xs font-black text-[#29252B] uppercase mb-1 font-sans">No Godown Selected</h4>
                <p className="text-[10px] max-w-xs text-[#667085] leading-snug font-sans font-medium">Click any godown row on the left panel catalog list to print or view active stock allocations and live weight metrics directly from the database.</p>
              </div>
            )}

          </div>

        </div>

        {/* Popup Footer */}
        <div className="bg-[#FFF9F8] p-2.5 border-t border-[#FBCFCB] flex justify-end gap-2">
          <button 
            onClick={handleClose}
            className="bg-[#D94B5A] hover:bg-[#A52D40] text-white font-bold text-xs px-5 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            Close Summary Dialog
          </button>
        </div>

      </div>
    </div>
  );
}
