import React, { useState, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AmadReportViewProps {
  amadData: any[];
  onRefresh: () => void;
  loading: boolean;
}

export const AmadReportView: React.FC<AmadReportViewProps> = ({
  amadData,
  onRefresh,
  loading
}) => {
  const [amadStart, setAmadStart] = useState('');
  const [amadEnd, setAmadEnd] = useState('');
  const [amadSearch, setAmadSearch] = useState('');

  const filteredAmads = useMemo(() => {
    return amadData.filter(item => {
      // Date range filter
      if (amadStart) {
        const itemDate = new Date(item.date);
        const filterStart = new Date(amadStart);
        if (itemDate < filterStart) return false;
      }
      if (amadEnd) {
        const itemDate = new Date(item.date);
        const filterEnd = new Date(amadEnd);
        filterEnd.setHours(23, 59, 59, 999);
        if (itemDate > filterEnd) return false;
      }
      // Search Box filter
      if (amadSearch.trim()) {
        const query = amadSearch.toLowerCase();
        const matMatch = String(item.temporary_arrival_no || item.amad_no || item.arrival_no || item.mr_no || '').toLowerCase().includes(query) || false;
        const poMatch = item.po_no?.toLowerCase().includes(query) || false;
        const suppMatch = item.supplier?.toLowerCase().includes(query) || false;
        const brokMatch = item.broker?.toLowerCase().includes(query) || false;
        const lorryMatch = String(item?.lorry_number || item?.lorry_no || item?.vehicle_no || '').toLowerCase().includes(query) || false;
        const areaMatch = item.arrival_area_name?.toLowerCase().includes(query) || false;
        const markaMatch = item.remarks?.toLowerCase().includes(query) || false;
        return matMatch || poMatch || suppMatch || brokMatch || lorryMatch || areaMatch || markaMatch;
      }
      return true;
    });
  }, [amadData, amadStart, amadEnd, amadSearch]);

  const amadAggregates = useMemo(() => {
    let pkts = 0;
    let wtQtl = 0;
    filteredAmads.forEach(a => {
      pkts += Number(a.total_packets || a.packets || 0);
      wtQtl += Number(a.weight_qtl || a.weight || 0);
    });
    return { pkts, wtQtl };
  }, [filteredAmads]);

  return (
    <div className="bg-[#FBCFCB] border-2 border-white shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] p-4 space-y-4" id="report-amad-container">
      {/* Filter block */}
      <div className="flex flex-wrap gap-3 items-end bg-[#FBCFCB] p-3 border border-black/10 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)] rounded-sm">
        <div className="space-y-1">
          <label htmlFor="period_start_1716" className="text-[10px] font-bold text-gray-700 uppercase italic block ml-1">Period Start</label>
          <div className="flex bg-white border border-gray-400 p-px">
            <input 
              id="period_start_1716" 
              name="period_start" 
              aria-label="Period Start"
              type="date" 
              value={amadStart}
              onChange={(e) => setAmadStart(e.target.value)}
              className="p-1 text-[11px] font-black outline-none w-32" 
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="period_end_1727" className="text-[10px] font-bold text-gray-700 uppercase italic block ml-1">Period End</label>
          <div className="flex bg-white border border-gray-400 p-px">
            <input 
              id="period_end_1727" 
              name="period_end" 
              aria-label="Period End"
              type="date" 
              value={amadEnd}
              onChange={(e) => setAmadEnd(e.target.value)}
              className="p-1 text-[11px] font-black outline-none w-32" 
            />
          </div>
        </div>
        
        <div className="flex-1 space-y-1 min-w-[180px]">
          <label htmlFor="live_search_scanner_1739" className="text-[10px] font-bold text-gray-700 uppercase italic block ml-1">Live Search Scanner</label>
          <div className="flex bg-white border border-gray-400 p-px mb-0.5">
            <input 
              id="live_search_scanner_1739" 
              name="live_search_scanner" 
              aria-label="Live Search Scanner"
              className="flex-1 p-1 text-[11px] font-black outline-none placeholder:text-slate-400" 
              placeholder="Scan Arrival No, Supplier, Lorry, Location..." 
              value={amadSearch}
              onChange={(e) => setAmadSearch(e.target.value)}
            />
            <button className="bg-[#FBCFCB] px-2 border-l border-gray-400">
              <Search className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0">
          <button 
            onClick={onRefresh}
            className="bg-[#FBCFCB] p-1.5 border border-white hover:bg-white active:shadow-inner text-[10px] font-bold uppercase flex items-center gap-1 shadow-[1px_1px_0_0_black]"
          >
            <RefreshCw className={cn("h-3 w-3 text-slate-700", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Records Output Grid */}
      <div className="bg-white border border-gray-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)] overflow-x-auto">
        <table className="w-full border-collapse text-[10px] min-w-[700px]">
          <thead className="bg-[#FBCFCB] font-bold text-center border-b border-gray-400 ">
            <tr className="h-8">
              <th className="px-3 text-left border-r border-gray-300">DATE</th>
              <th className="px-3 border-r border-gray-300">AMAD NO</th>
              <th className="px-3 border-r border-gray-300">P.O. CONTRACT</th>
              <th className="px-5 text-left border-r border-gray-300">SUPPLIER (KISAN)</th>
              <th className="px-3 border-r border-gray-300 text-left">BROKER / AGENT</th>
              <th className="px-3 border-r border-gray-300">LORRY NUMBER</th>
              <th className="px-3 border-r border-gray-300">LOCATION AREA</th>
              <th className="px-3 border-r border-gray-300 text-right">PACKETS</th>
              <th className="px-4 text-right">NET WEIGHT (Q)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-bold">
            {filteredAmads.map((amad, idx) => {
              const packetsNum = Number(amad.total_packets || amad.packets || 0);
              const qtlNum = Number(amad.weight_qtl || amad.weight || 0);
              return (
                <tr key={amad.amad_id || idx} className="h-10 hover:bg-[#ffffd0]/30 transition-colors group cursor-default border-b border-gray-50">
                  <td className="px-3 text-gray-500 font-mono italic">
                    {amad.date ? new Date(amad.date).toLocaleDateString('en-GB') : '--'}
                  </td>
                  <td className="px-3 text-center bg-blue-50/10 text-blue-900 border-r border-gray-100 font-mono">
                    #{amad.temporary_arrival_no || amad.amad_no || amad.arrival_no || amad.mr_no || '--'}
                  </td>
                  <td className="px-3 text-center text-indigo-900 font-mono text-[9px]">
                    {amad.po_no || '--'}
                  </td>
                  <td className="px-5 text-slate-900 truncate max-w-[170px]" title={amad.supplier}>
                    {amad.supplier || 'N/A'}
                  </td>
                  <td className="px-3 text-left text-slate-600 font-medium truncate max-w-[140px]" title={amad.broker}>
                    {amad.broker || 'DIRECT'}
                  </td>
                  <td className="px-3 text-center font-mono opacity-80">{amad?.lorry_number || (amad as any)?.lorry_no || (amad as any)?.vehicle_no || '--'}</td>
                  <td className="px-3 text-center text-gray-500 uppercase italic text-[9px]">{amad.arrival_area_name || 'MAIN ZONE'}</td>
                  <td className="px-3 text-right tabular-nums text-slate-800">{packetsNum.toLocaleString()}</td>
                  <td className="px-4 text-right tabular-nums text-indigo-950 font-black italic">{qtlNum.toFixed(2)} Q</td>
                </tr>
              );
            })}
            {filteredAmads.length === 0 && (
              <tr className="h-20">
                <td colSpan={9} className="text-center text-gray-400 italic">No live arrival entries found matching current filter context.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Aggregations HUD */}
      <div className="bg-[#808080] p-1 flex justify-between gap-px border border-black/10">
        <div className="flex gap-1.5">
          <div className="bg-white px-4 py-1.5 border border-gray-400 min-w-[150px]">
            <span className="text-[7.5px] font-black text-slate-400 uppercase leading-none block">Aggregate Packets</span>
            <span className="text-sm font-black italic text-slate-900 tracking-tight tabular-nums underline decoration-blue-800 decoration-2 underline-offset-1">
              {amadAggregates.pkts.toLocaleString()} BALES
            </span>
          </div>
          <div className="bg-white px-4 py-1.5 border border-gray-400 min-w-[150px]">
            <span className="text-[7.5px] font-black text-slate-400 uppercase leading-none block">Aggregate Net Weight</span>
            <span className="text-sm font-black italic text-indigo-900 tracking-tight tabular-nums">
              {amadAggregates.wtQtl.toLocaleString(undefined, { minimumFractionDigits: 2 })} QUINTALS
            </span>
          </div>
          <div className="bg-white px-4 py-1.5 border border-gray-400 min-w-[150px] hidden sm:block">
            <span className="text-[7.5px] font-black text-slate-400 uppercase leading-none block">Total Records Loaded</span>
            <span className="text-sm font-black italic text-emerald-800 tracking-tight">
              {filteredAmads.length} Vouchers
            </span>
          </div>
        </div>

        <div className="flex items-center text-[9px] text-white font-bold font-mono uppercase bg-slate-800 border border-slate-700 px-3 tracking-widest block ">
          Live DB Inbound Feed
        </div>
      </div>
    </div>
  );
};
