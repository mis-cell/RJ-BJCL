import React from 'react';
import { 
  Search, 
  Download, 
  FileText, 
  Clock 
} from 'lucide-react';
import { PaginationControls } from '../PaginationControls';
import { StockSparkline, StockItemRow } from './StockSummaryMetrics';
import { LiveStockItem } from './types';

export interface LiveInventoryGridProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedGradeFilter: string;
  setSelectedGradeFilter: (val: string) => void;
  selectedAreaFilter: string;
  setSelectedAreaFilter: (val: string) => void;
  selectedGodownFilter: string;
  setSelectedGodownFilter: (val: string) => void;
  mergedGrades: any[];
  areas: any[];
  godowns: any[];
  openingStocks: any[];
  calculateLiveStocks: () => LiveStockItem[];
  expandedLiveGrades: Record<string, boolean>;
  setExpandedLiveGrades: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  liveCurrentPage: number;
  setLiveCurrentPage: (p: number) => void;
  livePageSize: number;
  setLivePageSize: (s: number) => void;
  currentClosingStockWeight: number;
  onExportCSV: () => void;
  onOpenPdfModal: () => void;
  onTransfer: (record: any) => void;
  onUpdateGodown: (record: any) => void;
}

export const LiveInventoryGrid: React.FC<LiveInventoryGridProps> = ({
  searchQuery,
  setSearchQuery,
  selectedGradeFilter,
  setSelectedGradeFilter,
  selectedAreaFilter,
  setSelectedAreaFilter,
  selectedGodownFilter,
  setSelectedGodownFilter,
  mergedGrades,
  areas,
  godowns,
  openingStocks,
  calculateLiveStocks,
  expandedLiveGrades,
  setExpandedLiveGrades,
  liveCurrentPage,
  setLiveCurrentPage,
  livePageSize,
  setLivePageSize,
  currentClosingStockWeight,
  onExportCSV,
  onOpenPdfModal,
  onTransfer,
  onUpdateGodown
}) => {
  const liveStocks = calculateLiveStocks();
  const filteredLive = liveStocks.filter(item => {
    if (selectedGradeFilter !== 'ALL' && item.grade.toUpperCase() !== selectedGradeFilter.toUpperCase()) {
      return false;
    }
    const gradeRecs = openingStocks.filter(r => String(r.grade || '').trim().toUpperCase() === item.grade.toUpperCase());
    if (selectedAreaFilter !== 'ALL') {
      const hasArea = gradeRecs.some(r => String(r.area || '').trim().toUpperCase() === selectedAreaFilter.toUpperCase());
      if (!hasArea) return false;
    }
    if (selectedGodownFilter !== 'ALL') {
      const hasGodown = gradeRecs.some(r => String(r.godown || '').trim().toUpperCase() === selectedGodownFilter.toUpperCase());
      if (!hasGodown) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return item.grade.toLowerCase().includes(q) || gradeRecs.some(r => String(r.godown || '').toLowerCase().includes(q) || String(r.area || '').toLowerCase().includes(q));
  });

  return (
    <div className="space-y-2">
      {/* Multi-Filter Dropdowns and Search */}
      <div className="bg-[#FBCFCB] p-2 border border-gray-400 flex flex-wrap gap-2 items-center text-xs font-bold">
        <div className="flex items-center gap-1 bg-white border border-gray-400 px-2 py-1 flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-gray-500" />
          <input 
            className="flex-1 bg-transparent outline-none font-bold text-xs" 
            placeholder="Search stock by grade or godown..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="text-red-700 text-[9px] uppercase font-black cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Grade Filter */}
        <div className="flex items-center gap-1 bg-white border border-gray-400 px-2 py-1">
          <span className="text-[9px] text-gray-600 uppercase font-black">Grade:</span>
          <select 
            value={selectedGradeFilter} 
            onChange={(e) => setSelectedGradeFilter(e.target.value)}
            className="bg-transparent text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Grades</option>
            {mergedGrades.map((g: any, gi: number) => {
              const gName = g.grade_name || g.name || g.code || '';
              return <option key={gi} value={gName}>{gName}</option>;
            })}
          </select>
        </div>

        {/* Area Filter */}
        <div className="flex items-center gap-1 bg-white border border-gray-400 px-2 py-1">
          <span className="text-[9px] text-gray-600 uppercase font-black">Area:</span>
          <select 
            value={selectedAreaFilter} 
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="bg-transparent text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Areas</option>
            {areas.map((a: any, ai: number) => {
              const aName = a.area_name || a.name || '';
              return <option key={ai} value={aName}>{aName}</option>;
            })}
          </select>
        </div>

        {/* Godown Filter */}
        <div className="flex items-center gap-1 bg-white border border-gray-400 px-2 py-1">
          <span className="text-[9px] text-gray-600 uppercase font-black">Godown:</span>
          <select 
            value={selectedGodownFilter} 
            onChange={(e) => setSelectedGodownFilter(e.target.value)}
            className="bg-transparent text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Godowns</option>
            {godowns.map((g: any, gi: number) => {
              const gName = g.gdn_name || g.name || g.gdn_code || '';
              return <option key={gi} value={gName}>{gName}</option>;
            })}
          </select>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={onExportCSV}
            className="h-7 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-black uppercase flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={onOpenPdfModal}
            className="h-7 px-3 bg-red-700 hover:bg-red-800 text-white rounded text-[10px] font-black uppercase flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            Export to PDF
          </button>
        </div>
      </div>

      {/* Main Stock Grid */}
      <div className="border border-gray-400 bg-white shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)] overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead className="bg-[#FBCFCB] font-black italic text-slate-800">
            <tr className="border-b border-gray-400 h-8 uppercase text-left">
              <th className="px-6 border-r border-[#808080]/30 min-w-[200px]">Commodity Quality & Grade</th>
              <th className="px-4 text-center border-r border-[#808080]/30 bg-green-50/30">Opening Stock (Bales)</th>
              <th className="px-4 text-center border-r border-[#808080]/30 bg-indigo-50/30">Issue to Godown (+) (Bales)</th>
              <th className="px-4 text-center border-r border-[#808080]/30 bg-red-50/30">Godown to Factory (-) (Bales)</th>
              <th className="px-4 text-center border-r border-[#808080]/30 bg-blue-50/20 flex items-center justify-center gap-1">
                <span>Current Stock Balance (Bales)</span>
                <StockSparkline />
              </th>
              <th className="px-6 text-right">Net Wt. Balance (MT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-bold text-slate-750">
            {filteredLive.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 italic">
                  No matching dynamic stock balances found with current filters.
                </td>
              </tr>
            ) : (
              filteredLive
                .slice((liveCurrentPage - 1) * livePageSize, liveCurrentPage * livePageSize)
                .map((item, idx) => (
                  <StockItemRow
                    key={idx}
                    name={item.grade}
                    opening={item.openingQty.toLocaleString()}
                    incoming={item.incomingQty.toLocaleString()}
                    outgoing={item.outgoingQty.toLocaleString()}
                    balance={item.balanceQty.toLocaleString()}
                    weight={(item.balanceWt / 10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    isExpanded={expandedLiveGrades[item.grade]}
                    onToggle={() => setExpandedLiveGrades(p => ({ ...p, [item.grade]: !p[item.grade] }))}
                    openingStocks={openingStocks}
                    onTransfer={onTransfer}
                    onUpdateGodown={onUpdateGodown}
                  />
                ))
            )}
            {/* Empty grid lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="h-8 border-b border-gray-50 opacity-10"><td colSpan={6}></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 mb-2">
        <PaginationControls
          currentPage={liveCurrentPage}
          totalItems={filteredLive.length}
          pageSize={livePageSize}
          onPageChange={setLiveCurrentPage}
          onPageSizeChange={setLivePageSize}
        />
      </div>

      {/* Summary Footer */}
      <div className="bg-[#808080] p-1 flex justify-between gap-1 items-center border border-black/10">
        <div className="flex gap-1 h-full">
          <div className="bg-white px-3 py-1 border border-gray-400 min-w-[120px]">
            <span className="text-[8px] font-bold text-gray-500 uppercase leading-none block">
              Inventory Book Value (Est. @ ₹65,000/MT)
            </span>
            <span className="text-sm font-black italic text-blue-900 tracking-tighter">
              ₹ {Math.max(0, currentClosingStockWeight * 6500).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="bg-[#FBCFCB] px-4 py-1 border border-white shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] flex items-center gap-2">
          <Clock className="h-3 w-3 text-gray-600" />
          <span className="text-[9px] font-bold uppercase italic text-gray-600 tracking-widest">
            Last valuation: Just Now
          </span>
        </div>
      </div>
    </div>
  );
};
