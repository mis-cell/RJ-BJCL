import React from 'react';
import { 
  Box, 
  TrendingUp, 
  Archive 
} from 'lucide-react';
import { AreaChart, Area } from 'recharts';
import { cn } from '../../lib/utils';

export function Scale({ className }: any) {
  return (
    <div className={cn("border border-white/50 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-black leading-none", className)}>
      ⚖
    </div>
  );
}

export function StockMetric({ 
  label, 
  bales, 
  weight, 
  type,
  subText 
}: { 
  label: string; 
  bales: number; 
  weight: number; 
  type: 'bales' | 'sold' | 'weight' | 'stock';
  subText?: string;
}) {
  const theme = 
    type === 'bales' ? {
      headerBg: 'bg-gradient-to-r from-blue-800 to-indigo-800 border-b border-indigo-900',
      iconBg: 'bg-indigo-950/40 text-blue-100',
      cardBg: 'bg-gradient-to-br from-[#f0f4ff] to-[#e6edff] border-blue-300',
      textMain: 'text-blue-900',
      textSec: 'text-indigo-800/80',
      badgeBg: 'bg-blue-100 text-blue-800',
      shadow: 'shadow-[3px_3px_0_0_#D94B5A]'
    } :
    type === 'sold' ? {
      headerBg: 'bg-gradient-to-r from-emerald-800 to-teal-800 border-b border-emerald-900',
      iconBg: 'bg-emerald-950/40 text-emerald-100',
      cardBg: 'bg-gradient-to-br from-[#edfcf2] to-[#e1f9eb] border-emerald-300',
      textMain: 'text-emerald-950',
      textSec: 'text-teal-800/80',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      shadow: 'shadow-[3px_3px_0_0_#0f5132]'
    } :
    type === 'weight' ? {
      headerBg: 'bg-gradient-to-r from-rose-800 to-amber-800 border-b border-rose-900',
      iconBg: 'bg-rose-950/40 text-rose-100',
      cardBg: 'bg-gradient-to-br from-[#fff1f2] to-[#ffe4e6] border-rose-300',
      textMain: 'text-rose-950',
      textSec: 'text-amber-800/80',
      badgeBg: 'bg-rose-100 text-rose-800',
      shadow: 'shadow-[3px_3px_0_0_#842029]'
    } : {
      headerBg: 'bg-gradient-to-r from-purple-800 to-violet-800 border-b border-purple-900',
      iconBg: 'bg-purple-950/40 text-purple-100',
      cardBg: 'bg-gradient-to-br from-[#faf5ff] to-[#f3e8ff] border-purple-300',
      textMain: 'text-purple-950',
      textSec: 'text-violet-800/80',
      badgeBg: 'bg-purple-100 text-purple-800',
      shadow: 'shadow-[3px_3px_0_0_#581c87]'
    };

  return (
    <div className={cn("border-2 p-0.5 rounded transition-transform hover:-translate-y-0.5 duration-200 bg-[#FBCFCB]", theme.cardBg, theme.shadow)}>
      {/* Card header with icon and name */}
      <div className={cn("h-7 flex items-center px-2 gap-2 text-white font-mono rounded-t-sm", theme.headerBg)}>
        <div className={cn("p-0.5 rounded flex items-center justify-center", theme.iconBg)}>
          {type === 'bales' && <Box className="h-3.5 w-3.5" />}
          {type === 'weight' && <Scale className="h-3.5 w-3.5" />}
          {type === 'sold' && <TrendingUp className="h-3.5 w-3.5" />}
          {type === 'stock' && <Archive className="h-3.5 w-3.5" />}
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
      </div>
      
      {/* Card contents - Dual Metrics Grid Layout */}
      <div className="p-3.5 flex flex-col gap-2 border-t border-slate-300">
        <div className="grid grid-cols-2 gap-2 items-center divide-x divide-slate-300/60">
          {/* Metric 1: Bales */}
          <div className="pr-2">
            <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Quantity</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={cn("text-2xl font-extrabold tabular-nums tracking-tighter leading-none", theme.textMain)}>
                {bales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider italic">Bales</span>
            </div>
          </div>
          
          {/* Metric 2: Quintals */}
          <div className="pl-3">
            <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Weight</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={cn("text-lg font-black tabular-nums tracking-tight leading-none", theme.textSec)}>
                {(weight / 10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider italic">MT</span>
            </div>
          </div>
        </div>
        
        {/* Progress bar or dynamic badge context */}
        <div className="flex flex-col gap-1 border-t border-slate-200/50 pt-1.5 mt-0.5">
          <div className="flex items-center justify-between text-[8px] font-bold text-slate-500">
            <span>SYSTEM LEDGER VALUE</span>
            <span className={cn("px-1.5 py-px rounded font-black text-[7px] uppercase tracking-wider", theme.badgeBg)}>
              {type === 'bales' ? 'Baseline Opening' : 
               type === 'sold' ? 'Mill Raw Jute In' : 
               type === 'weight' ? 'Material Out' : 'Net Active Stock'}
            </span>
          </div>
          {subText && (
            <span className="text-[8px] font-mono font-bold tracking-tight text-slate-500 text-left block bg-slate-200/50 px-1 py-0.5 rounded-xs border border-slate-300/40">
              ⚡ {subText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function StockSparkline() {
  const data = Array.from({ length: 30 }).map((_, i) => ({
    day: `Day ${i + 1}`,
    bales: Math.floor(4200 + Math.sin(i / 2.5) * 500 + i * 35)
  }));
  return (
    <div className="w-28 h-6 inline-flex items-center align-middle mx-2 bg-emerald-50/50 px-1 py-0.5 rounded border border-emerald-200/60" title="30-Day Inventory Trend Sparkline">
      <span className="text-[8px] font-black text-emerald-800 mr-1">30D:</span>
      <div className="w-16 h-4 min-w-[64px] min-h-[16px]">
        <AreaChart width={64} height={16} data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Area type="monotone" dataKey="bales" stroke="#F7AFA8" fill="#F7AFA8" fillOpacity={0.25} strokeWidth={1.5} />
        </AreaChart>
      </div>
    </div>
  );
}

export function StockItemRow({ 
  name, 
  opening, 
  incoming, 
  outgoing, 
  balance, 
  weight, 
  isExpanded, 
  onToggle, 
  openingStocks = [],
  onTransfer,
  onUpdateGodown
}: any) {
  const gradeRecords = openingStocks.filter((r: any) => String(r.grade || '').trim().toUpperCase() === String(name).trim().toUpperCase());
  const areaMap: Record<string, any[]> = {};
  gradeRecords.forEach((r: any) => {
    const area = String(r.area || 'UNASSIGNED AREA').trim().toUpperCase();
    if (!areaMap[area]) areaMap[area] = [];
    areaMap[area].push(r);
  });

  return (
    <React.Fragment>
      <tr 
        onClick={onToggle}
        className={cn(
          "h-9 border-b border-gray-200 cursor-pointer transition-colors font-bold",
          isExpanded ? "bg-emerald-50/70" : "hover:bg-[#ffffd0]/50 bg-white"
        )}
        title="Click to expand/collapse grade breakdown (Grade → Area → Godown)"
      >
        <td className="px-6 text-indigo-950 uppercase tracking-tight font-black flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-[#D94B5A] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
            {isExpanded ? '-' : '+'}
          </span>
          <span className="truncate">🏷️ Grade: {name}</span>
          <span className="text-[8px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded ml-1">
            {gradeRecords.length} Godown Records
          </span>
        </td>
        <td className="px-4 text-center tabular-nums text-green-700 bg-green-50/15 font-mono font-bold">{opening}</td>
        <td className="px-4 text-center tabular-nums text-indigo-700 bg-indigo-50/15 font-mono font-bold">{incoming}</td>
        <td className="px-4 text-center tabular-nums text-red-700 bg-red-50/10 font-mono font-bold">{outgoing}</td>
        <td className="px-4 text-center tabular-nums font-black text-blue-900 bg-blue-50/10 font-mono">{balance}</td>
        <td className="px-6 text-right tabular-nums italic text-slate-800 font-mono font-black">{weight}</td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-3 bg-slate-50 border-b border-slate-200">
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-indigo-900 text-white flex items-center justify-center text-[10px] font-black">🏷️</span>
                  <span className="text-xs font-black uppercase text-indigo-950">
                    Specific Data Breakdown: Grade <span className="text-emerald-700">{name}</span> → Area → Godown
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-500">
                  Total Grade Opening Qty: {gradeRecords.reduce((s: number, r: any) => s + (Number(r.quantity) || 0), 0).toLocaleString()} Bales
                </span>
              </div>

              {Object.keys(areaMap).length === 0 ? (
                <div className="py-6 text-center text-slate-400 italic text-[10px] uppercase">
                  No specific godown breakdown records registered for grade {name}.
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(areaMap).map(([areaName, records]) => {
                    const areaQty = records.reduce((s: number, r: any) => s + (Number(r.quantity) || 0), 0);
                    const areaWt = records.reduce((s: number, r: any) => s + (Number(r.weight) || 0), 0);

                    return (
                      <div key={areaName} className="border border-indigo-100 rounded-md overflow-hidden bg-slate-50/50">
                        {/* Area Sub-header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/80 border-b border-indigo-100 font-black text-[11px] text-indigo-950">
                          <div className="flex items-center gap-2">
                            <span>📍 Area:</span>
                            <span className="text-emerald-800 uppercase">{areaName}</span>
                            <span className="text-[8px] font-bold bg-white text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                              {records.length} Godowns
                            </span>
                          </div>
                          <div className="flex items-center gap-4 font-mono">
                            <span>Qty: {areaQty.toLocaleString()} Bales</span>
                            <span>Wt: {(areaWt * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} KG</span>
                          </div>
                        </div>

                        {/* Godowns Table under Area */}
                        <div className="p-2 space-y-1 bg-white">
                          <div className="text-[9px] font-black uppercase text-slate-400 px-2 pb-1 border-b border-slate-100 grid grid-cols-12 gap-2">
                            <span className="col-span-3">🏛️ Godown / Warehouse</span>
                            <span className="col-span-2">Date Registered</span>
                            <span className="col-span-2 text-center">JCI Govt</span>
                            <span className="col-span-5 text-right">Quantity, Weight & Actions</span>
                          </div>
                          {records.map((r: any, ri: number) => (
                            <div key={r.id || ri} className="grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded text-[10px] hover:bg-slate-50 border-b border-slate-50 last:border-b-0 font-bold">
                              <span className="col-span-3 font-black uppercase text-slate-800 flex items-center gap-1.5 truncate">
                                <span>📦</span> {r.godown || '-'}
                              </span>
                              <span className="col-span-2 font-mono text-slate-500">
                                {r.opening_date || '-'}
                              </span>
                              <span className="col-span-2 text-center">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                                  (r.jci || '').toUpperCase() === 'YES' ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                                )}>
                                  {r.jci || 'No'}
                                </span>
                              </span>
                              <span className="col-span-5 text-right font-mono font-black text-indigo-950 flex items-center justify-end gap-2">
                                <span>{r.quantity || 0} Bales <span className="text-teal-700 font-normal">({(Number(r.weight || 0) * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} KG)</span></span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onTransfer && onTransfer(r); }}
                                    className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[8px] font-black uppercase flex items-center gap-0.5 shadow-xs cursor-pointer"
                                    title="Transfer Stock to another Godown"
                                  >
                                    <span>🚚 Transfer</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onUpdateGodown && onUpdateGodown(r); }}
                                    className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-black uppercase flex items-center gap-0.5 shadow-xs cursor-pointer"
                                    title="Update Godown / Location"
                                  >
                                    <span>📍 Godown</span>
                                  </button>
                                </div>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
