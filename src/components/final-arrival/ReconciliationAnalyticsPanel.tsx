import React, { useState, useMemo } from "react";
import {
  BarChart,
  Eye,
  EyeOff,
  Flame,
  Grid
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart as RechartsLineChart,
  Line
} from "recharts";
import { cn } from "../../lib/utils";
import { ReconciliationRecord } from "../../types/reconciliation.types";

interface ReconciliationAnalyticsPanelProps {
  reconciledItems: ReconciliationRecord[];
  varianceThreshold: number;
}

export const ReconciliationAnalyticsPanel: React.FC<ReconciliationAnalyticsPanelProps> = ({
  reconciledItems,
  varianceThreshold
}) => {
  // Local states for the Recharts visualization panel
  const [showChart, setShowChart] = useState(true);
  const [chartMetric, setChartMetric] = useState<'quantity' | 'weight'>('quantity');
  
  // Historical trend states
  const [showTrendChart, setShowTrendChart] = useState(true);
  const [selectedTrendSupplier, setSelectedTrendSupplier] = useState<string>('ALL');

  // 12-Month Heatmap states
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapMetric, setHeatmapMetric] = useState<'quantity' | 'weight' | 'combined'>('combined');
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{
    vendor: string;
    monthLabel: string;
    value: number;
    deliveriesCount: number;
    loads: any[];
  } | null>(null);

  // Prepare dynamic chart data comparing expected vs actual quantities/weights
  const chartData = reconciledItems
    .filter(item => {
      // Keep records that have non-zero comparative values
      const hasQty = (item.expected_qty || 0) > 0 || (item.actual_qty || 0) > 0;
      const hasWeight = (item.expected_weight || 0) > 0 || (item.actual_weight || 0) > 0;
      return hasQty || hasWeight;
    })
    .slice(0, 15) // Limit to top 15 records for crisp horizontal readability
    .map(item => {
      const identifier = item.final_arrival_no || item.mr_no || 'N/A';
      const shortLabel = identifier.length > 12 ? `...${identifier.slice(-8)}` : identifier;
      return {
        name: shortLabel,
        fullName: identifier,
        expected: chartMetric === 'quantity' ? (item.expected_qty || 0) : (item.expected_weight || 0),
        actual: chartMetric === 'quantity' ? (item.actual_qty || 0) : (item.actual_weight || 0),
        expectedQty: item.expected_qty || 0,
        actualQty: item.actual_qty || 0,
        expectedWeight: item.expected_weight || 0,
        actualWeight: item.actual_weight || 0,
        supplier: item.arrival_supplier || item.inspection_supplier || 'Unknown Supplier',
        status: item.status,
        lorry: item.lorry_number || 'N/A'
      };
    });

  // Dynamic bar colors highlighting variances
  const getBarColorForEntry = (entry: any) => {
    if (entry.status === 'pending_inspection') return '#93c5fd'; // Light Blue
    if (entry.status === 'orphan_inspection') return '#fda4af';  // Rose/Pink (orphan)

    const diff = entry.actual - entry.expected;
    if (Math.abs(diff) < 0.1) return '#10b981'; // Emerald Green (Matched)
    return diff < 0 ? '#f59e0b' : '#6366f1';    // Amber (Deficit warning) / Indigo (Surplus)
  };

  // Custom interactive tooltip for Recharts
  const renderChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isQty = chartMetric === 'quantity';
      const exp = isQty ? data.expectedQty : data.expectedWeight;
      const act = isQty ? data.actualQty : data.actualWeight;
      const diff = act - exp;
      const unit = isQty ? ' Bales/Packets' : ' MT/Qtls';

      let varianceText = '';
      let varianceClass = 'text-slate-400';
      if (Math.abs(diff) < 0.1) {
        varianceText = 'Perfect Match (±0.0)';
        varianceClass = 'text-emerald-400 font-bold';
      } else if (diff < 0) {
        varianceText = `${diff.toFixed(2)}${unit} Deficit (Shortage)`;
        varianceClass = 'text-amber-400 font-bold';
      } else {
        varianceText = `+${diff.toFixed(2)}${unit} Surplus (Over-receipt)`;
        varianceClass = 'text-indigo-300 font-bold';
      }

      return (
        <div className="bg-slate-900 border-2 border-slate-700 text-white p-3 shadow-xl rounded-md text-[10px] leading-relaxed max-w-xs font-sans">
          <p className="font-extrabold text-[11px] text-yellow-400 border-b border-slate-700 pb-1 mb-2 uppercase tracking-wide font-sans">
            Load No: {data.fullName}
          </p>
          <div className="space-y-1 font-medium font-sans">
            <p className="text-slate-300">Supplier: <span className="text-white font-bold">{data.supplier}</span></p>
            {data.lorry && data.lorry !== 'N/A' && (
              <p className="text-slate-300">Lorry Number: <span className="text-white font-mono">{data.lorry}</span></p>
            )}
            <div className="pt-1.5 border-t border-slate-800 mt-1.5 grid grid-cols-2 gap-2 font-mono">
              <div>
                <span className="text-slate-400 block text-[8px] uppercase">Expected (Lab)</span>
                <span className="text-white font-extrabold text-[10px]">{exp.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[8px] uppercase">Actual (Arrival)</span>
                <span className="text-white font-extrabold text-[10px]">{act.toFixed(1)}</span>
              </div>
            </div>
            <div className="pt-1.5 border-t border-slate-800 mt-1">
              <span className="text-slate-400 block text-[8px] uppercase">Audit Variance</span>
              <span className={varianceClass}>{varianceText}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Extract all unique suppliers for trend filtering
  const uniqueTrendSuppliers = React.useMemo(() => {
    const suppliers = new Set<string>();
    reconciledItems.forEach(item => {
      const name = item.arrival_supplier || item.inspection_supplier;
      if (name) suppliers.add(name);
    });
    return Array.from(suppliers).sort();
  }, [reconciledItems]);

  // Compute 6-month historical trend data for average arrival variances
  const trendData = React.useMemo(() => {
    const monthsList = [];
    // Anchor to June 2026 as the current month
    const currentYear = 2026;
    const currentMonth = 5; // June is index 5
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const yearSuffix = d.getFullYear().toString().slice(-2);
      monthsList.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${monthName} '${yearSuffix}`,
        rawMonth: d.getMonth(),
        rawYear: d.getFullYear(),
        totalQtyVariance: 0,
        qtyVarianceCount: 0,
        totalWtVariance: 0,
        wtVarianceCount: 0,
      });
    }

    reconciledItems.forEach(item => {
      const dateStr = item.arrival_date || item.inspection_date;
      if (!dateStr) return;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const y = date.getFullYear();
      const m = date.getMonth();
      
      const slot = monthsList.find(s => s.rawYear === y && s.rawMonth === m);
      if (!slot) return;

      // Filter by supplier if selected
      if (selectedTrendSupplier && selectedTrendSupplier !== 'ALL') {
        const itemSupplier = item.arrival_supplier || item.inspection_supplier || '';
        if (itemSupplier !== selectedTrendSupplier) return;
      }

      // Quantity Variance %
      const expQty = item.expected_qty || 0;
      const actQty = item.actual_qty || 0;
      if (expQty > 0) {
        const varPct = (Math.abs(actQty - expQty) / expQty) * 100;
        slot.totalQtyVariance += varPct;
        slot.qtyVarianceCount++;
      }

      // Weight Variance %
      const expWt = item.expected_weight || 0;
      const actWt = item.actual_weight || 0;
      if (expWt > 0) {
        const varPct = (Math.abs(actWt - expWt) / expWt) * 100;
        slot.totalWtVariance += varPct;
        slot.wtVarianceCount++;
      }
    });

    return monthsList.map(slot => {
      const avgQtyVar = slot.qtyVarianceCount > 0 ? Number((slot.totalQtyVariance / slot.qtyVarianceCount).toFixed(2)) : 0;
      const avgWtVar = slot.wtVarianceCount > 0 ? Number((slot.totalWtVariance / slot.wtVarianceCount).toFixed(2)) : 0;
      return {
        monthLabel: slot.label,
        "Quantity Variance (%)": avgQtyVar,
        "Weight Variance (%)": avgWtVar,
        qtyCount: slot.qtyVarianceCount,
        wtCount: slot.wtVarianceCount,
      };
    });
  }, [reconciledItems, selectedTrendSupplier]);

  // Supplier discrepancy statistics to highlight persistent deviations
  const supplierDiscrepancyRank = React.useMemo(() => {
    const stats: Record<string, { totalVar: number; count: number; mismatchCount: number }> = {};
    
    reconciledItems.forEach(item => {
      const name = item.arrival_supplier || item.inspection_supplier;
      if (!name) return;

      const expQty = item.expected_qty || 0;
      const actQty = item.actual_qty || 0;
      const expWt = item.expected_weight || 0;
      const actWt = item.actual_weight || 0;

      let totalRecordVar = 0;
      let recordVarCount = 0;

      if (expQty > 0) {
        totalRecordVar += (Math.abs(actQty - expQty) / expQty) * 100;
        recordVarCount++;
      }
      if (expWt > 0) {
        totalRecordVar += (Math.abs(actWt - expWt) / expWt) * 100;
        recordVarCount++;
      }

      if (recordVarCount > 0) {
        const avg = totalRecordVar / recordVarCount;
        if (!stats[name]) {
          stats[name] = { totalVar: 0, count: 0, mismatchCount: 0 };
        }
        stats[name].totalVar += avg;
        stats[name].count += 1;
        if (item.status === 'mismatch') {
          stats[name].mismatchCount += 1;
        }
      }
    });

    return Object.entries(stats)
      .map(([name, val]) => ({
        name,
        avgVariance: val.count > 0 ? Number((val.totalVar / val.count).toFixed(2)) : 0,
        mismatchCount: val.mismatchCount,
        deliveryCount: val.count
      }))
      .sort((a, b) => b.avgVariance - a.avgVariance);
  }, [reconciledItems]);

  // Compute 12-Month Vendor Variance Heatmap Data
  const heatmapData = React.useMemo(() => {
    const months: { label: string; year: number; month: number }[] = [];
    const anchorYear = 2026;
    const anchorMonth = 5; // June is index 5
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(anchorYear, anchorMonth - i, 1);
      months.push({
        label: d.toLocaleString('default', { month: 'short' }) + " '" + d.getFullYear().toString().slice(-2),
        year: d.getFullYear(),
        month: d.getMonth()
      });
    }

    const vendorSet = new Set<string>();
    reconciledItems.forEach(item => {
      const name = item.arrival_supplier || item.inspection_supplier;
      if (name) vendorSet.add(name);
    });
    const vendors = Array.from(vendorSet).sort();

    const grid = vendors.map(vendor => {
      const monthlyStats = months.map(m => {
        const records = reconciledItems.filter(item => {
          const itemVendor = item.arrival_supplier || item.inspection_supplier;
          if (itemVendor !== vendor) return false;

          const dateStr = item.arrival_date || item.inspection_date;
          if (!dateStr) return false;

          const date = new Date(dateStr);
          return date.getFullYear() === m.year && date.getMonth() === m.month;
        });

        let totalQtyVar = 0;
        let qtyCount = 0;
        let totalWtVar = 0;
        let wtCount = 0;

        records.forEach(r => {
          const expQty = r.expected_qty || 0;
          const actQty = r.actual_qty || 0;
          if (expQty > 0) {
            totalQtyVar += (Math.abs(actQty - expQty) / expQty) * 100;
            qtyCount++;
          }

          const expWt = r.expected_weight || 0;
          const actWt = r.actual_weight || 0;
          if (expWt > 0) {
            totalWtVar += (Math.abs(actWt - expWt) / expWt) * 100;
            wtCount++;
          }
        });

        const avgQtyVar = qtyCount > 0 ? Number((totalQtyVar / qtyCount).toFixed(2)) : 0;
        const avgWtVar = wtCount > 0 ? Number((totalWtVar / wtCount).toFixed(2)) : 0;
        const combinedVar = (qtyCount > 0 || wtCount > 0)
          ? Number(((totalQtyVar + totalWtVar) / (qtyCount + wtCount)).toFixed(2))
          : 0;

        return {
          monthLabel: m.label,
          year: m.year,
          month: m.month,
          qtyVar: avgQtyVar,
          wtVar: avgWtVar,
          combinedVar,
          deliveriesCount: records.length,
          loads: records
        };
      });

      const totalDeliveries = monthlyStats.reduce((acc, curr) => acc + curr.deliveriesCount, 0);
      const overallAvgVar = monthlyStats.reduce((acc, curr) => acc + curr.combinedVar, 0) / (monthlyStats.filter(s => s.deliveriesCount > 0).length || 1);

      return {
        vendor,
        monthlyStats,
        totalDeliveries,
        overallAvgVar: Number(overallAvgVar.toFixed(2))
      };
    });

    return { months, grid };
  }, [reconciledItems]);

  return (
    <div className="space-y-4">
      {/* Dynamic Quantity & Weight Reconciliation Visualizer */}
      <div className="bg-white border border-slate-300 rounded shadow-xs p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-2 mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-700">
              <BarChart className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">
                Expected vs. Actual Quantity & Weight Balance Visualizer
              </h3>
              <p className="text-[9px] text-slate-500 font-semibold leading-none mt-1">
                Audit analytics: compares Expected (Lab Inspection Master/Details) against Actual physical receipts.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            {/* Metric Selector */}
            <div className="flex bg-slate-100 border border-slate-300 rounded p-0.5">
              <button
                type="button"
                onClick={() => setChartMetric('quantity')}
                className={cn(
                  "px-2 py-1 text-[8px] font-black uppercase rounded transition-all cursor-pointer",
                  chartMetric === 'quantity' ? "bg-slate-800 text-white shadow-inner" : "text-slate-600 hover:bg-slate-200"
                )}
              >
                Packets / Bales
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('weight')}
                className={cn(
                  "px-2 py-1 text-[8px] font-black uppercase rounded transition-all cursor-pointer",
                  chartMetric === 'weight' ? "bg-slate-800 text-white shadow-inner" : "text-slate-600 hover:bg-slate-200"
                )}
              >
                Tons / Qtls Weight
              </button>
            </div>

            {/* Minimize/Maximize Toggle */}
            <button
              onClick={() => setShowChart(!showChart)}
              className="p-1 hover:bg-slate-150 border border-slate-300 bg-slate-50 rounded text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
              title={showChart ? "Collapse analytics view" : "Expand analytics view"}
            >
              {showChart ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {showChart ? (
          chartData.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold text-slate-400 bg-slate-50 border border-dashed border-slate-300 rounded">
              No matching quantity/weight data available to render the audit chart. Register or match some arrivals first.
            </div>
          ) : (
            <div className="space-y-2 animate-fade-in">
              <div className="h-64 md:h-72 w-full pr-2">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <RechartsBarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#475569" 
                      fontSize={9} 
                      fontWeight="bold"
                      tickLine={false} 
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={9} 
                      fontWeight="bold"
                      tickLine={false} 
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip content={renderChartTooltip} cursor={{ fill: 'rgba(241,245,249,0.5)' }} />
                    <Legend 
                      verticalAlign="top" 
                      height={24}
                      content={() => (
                        <div className="flex flex-wrap justify-center gap-4 text-[8px] font-black uppercase tracking-wider text-slate-600 mb-2">
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 bg-slate-400 rounded-xs" />
                            Expected (Lab Details)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 bg-indigo-600 rounded-xs" />
                            Actual Received (Dynamic Color Highlights)
                          </span>
                        </div>
                      )}
                    />
                    <Bar 
                      dataKey="expected" 
                      fill="#94a3b8" 
                      radius={[3, 3, 0, 0]} 
                      barSize={16}
                    />
                    <Bar 
                      dataKey="actual" 
                      radius={[3, 3, 0, 0]} 
                      barSize={16}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColorForEntry(entry)} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend & Color-Key Explanation */}
              <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[9px] font-semibold text-slate-500 leading-normal flex flex-col md:flex-row gap-2 items-start md:items-center justify-between">
                <span className="font-bold text-slate-600 uppercase tracking-wide shrink-0">💡 Color Variance Indicator:</span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Balanced Match (±0)
                  </span>
                  <span className="flex items-center gap-1 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Deficit Warning (Receipt Shortage)
                  </span>
                  <span className="flex items-center gap-1 text-indigo-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" /> Surplus Over-receipt
                  </span>
                  <span className="flex items-center gap-1 text-blue-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#93c5fd]" /> Pending Inspection (Expected = 0)
                  </span>
                  <span className="flex items-center gap-1 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fda4af]" /> Orphan Audit (Actual = 0)
                  </span>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="py-2.5 text-center text-[9px] text-slate-600 font-bold uppercase bg-slate-50 border border-dashed border-slate-300 rounded cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setShowChart(true)}>
            📊 Visualization minimized. Click to expand comparative metrics chart.
          </div>
        )}
      </div>

      {/* 6-Month Historical Discrepancy Trend */}
      <div className="bg-white border border-slate-300 rounded shadow-xs p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-2 mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-700">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">
                6-Month Historical Discrepancy & Variance Trend
              </h3>
              <p className="text-[9px] text-slate-500 font-semibold leading-none mt-1">
                Monitors average monthly deviations (%) in material quantity and weight to identify vendor inconsistency.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            {/* Vendor / Supplier Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5">
              <span className="text-[8px] font-black uppercase text-slate-500 font-mono">Filter Vendor:</span>
              <select
 id="selectedtrendsupplier_1315" name="selectedtrendsupplier" aria-label="selectedtrendsupplier"                value={selectedTrendSupplier}
                onChange={(e) => setSelectedTrendSupplier(e.target.value)}
                className="bg-white border border-slate-200 rounded text-[9.5px] font-extrabold py-0.5 px-1 outline-none cursor-pointer text-slate-800"
              >
                <option value="ALL">All Vendors / Suppliers</option>
                {uniqueTrendSuppliers.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>

            {/* Minimize/Maximize Toggle */}
            <button
              onClick={() => setShowTrendChart(!showTrendChart)}
              className="p-1 hover:bg-slate-150 border border-slate-300 bg-slate-50 rounded text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
              title={showTrendChart ? "Collapse trend analytics" : "Expand trend analytics"}
            >
              {showTrendChart ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {showTrendChart ? (
          <div className="space-y-3 animate-fade-in">
            <div className="h-64 md:h-72 w-full pr-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                <RechartsLineChart
                  data={trendData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="#475569" 
                    fontSize={9} 
                    fontWeight="bold"
                    tickLine={false} 
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={9} 
                    fontWeight="bold"
                    tickLine={false} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 border-2 border-slate-700 text-white p-2.5 shadow-xl rounded-md text-[10px] font-sans">
                            <p className="font-extrabold text-[11px] text-yellow-400 border-b border-slate-700 pb-1 mb-2 uppercase tracking-wide">
                              {label} Trend
                            </p>
                            <div className="space-y-1 font-mono">
                              {payload.map((pld: any) => (
                                <p key={pld.name} style={{ color: pld.color }}>
                                  <span className="font-bold">{pld.name}:</span> {pld.value}% 
                                  <span className="text-slate-400 text-[8px] ml-1">
                                    ({pld.name.includes("Quantity") ? `${pld.payload.qtyCount} loads` : `${pld.payload.wtCount} loads`})
                                  </span>
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={24}
                    iconType="circle"
                    iconSize={8}
                    content={() => (
                      <div className="flex flex-wrap justify-center gap-4 text-[8px] font-black uppercase tracking-wider text-slate-600 mb-2">
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-2.5 h-0.5 bg-indigo-600 border-t-2 border-indigo-600" />
                          Average Quantity Variance (%)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-2.5 h-0.5 bg-amber-500 border-t-2 border-amber-500" />
                          Average Weight Variance (%)
                        </span>
                      </div>
                    )}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Quantity Variance (%)" 
                    stroke="#4f46e5" 
                    strokeWidth={2.5}
                    activeDot={{ r: 6 }} 
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Weight Variance (%)" 
                    stroke="#f59e0b" 
                    strokeWidth={2.5}
                    activeDot={{ r: 6 }} 
                    dot={{ r: 4 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>

            {/* Vendor compliance ranking summary and insights */}
            {supplierDiscrepancyRank.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1.5">
                <span className="text-[9px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1">
                  🔍 Vendor Compliance Desk: Recurring Deviation Insights
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                  <div className="text-[9.5px] font-semibold text-slate-600 leading-relaxed space-y-1">
                    <p>
                      Top recurring variance records over the last 6 months (minimum 1 delivery):
                    </p>
                    <div className="space-y-1">
                      {supplierDiscrepancyRank.slice(0, 3).map((sup, idx) => (
                        <div key={sup.name} className="flex items-center justify-between text-[9px] bg-white border border-slate-150 rounded px-1.5 py-0.5">
                          <span className="font-bold text-slate-700 truncate max-w-[150px]">
                            {idx + 1}. {sup.name}
                          </span>
                          <span className="font-mono font-black text-rose-600 flex items-center gap-1">
                            {sup.avgVariance}% Avg Dev
                            <span className="text-[8px] text-slate-400 font-normal">({sup.deliveryCount} loads, {sup.mismatchCount} mis)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50 border border-indigo-200 rounded p-2 text-[9px] font-medium leading-normal flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-indigo-900 block uppercase tracking-wide mb-1">🚨 Persistence Alert Flag</span>
                      {supplierDiscrepancyRank[0] && supplierDiscrepancyRank[0].avgVariance > 2 ? (
                        <p className="text-indigo-950">
                          Supplier <strong className="text-rose-700">{supplierDiscrepancyRank[0].name}</strong> exhibits the highest average arrival variance of <strong>{supplierDiscrepancyRank[0].avgVariance}%</strong> across {supplierDiscrepancyRank[0].deliveryCount} audited loads, generating <strong>{supplierDiscrepancyRank[0].mismatchCount}</strong> critical mismatches. Consider auditing weighbridge calibrations.
                        </p>
                      ) : (
                        <p className="text-slate-600">
                          All suppliers remain within normal safe compliance thresholds. No systemic weight or bale mismatches detected over the current 6-month period.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 text-center text-[9px] text-slate-600 font-bold uppercase bg-slate-50 border border-dashed border-slate-300 rounded cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setShowTrendChart(true)}>
            📈 Trend analysis minimized. Click to expand 6-month variance timeline.
          </div>
        )}
      </div>

      {/* 12-Month Vendor Discrepancy Heatmap */}
      <div className="bg-white border border-slate-300 rounded shadow-xs p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-2 mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-50 border border-rose-200 rounded text-rose-700 animate-pulse">
              <Flame className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
                12-Month Vendor Arrival Variance Heatmap
                <span className="text-[8px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">Live Audit</span>
              </h3>
              <p className="text-[9px] text-slate-500 font-semibold leading-none mt-1">
                Visualizes recurring weight & quantity deviations per supplier. Click any colored tile to inspect individual shipment loads.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {/* Metric Selector Button Group */}
            <div className="flex items-center border border-slate-300 rounded overflow-hidden p-0.5 bg-slate-50">
              <button
                onClick={() => {
                  setHeatmapMetric('combined');
                  setSelectedHeatmapCell(null);
                }}
                className={cn(
                  "px-2 py-0.5 text-[8.5px] font-black uppercase rounded-xs transition-colors cursor-pointer",
                  heatmapMetric === 'combined' ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
                )}
              >
                Combined
              </button>
              <button
                onClick={() => {
                  setHeatmapMetric('quantity');
                  setSelectedHeatmapCell(null);
                }}
                className={cn(
                  "px-2 py-0.5 text-[8.5px] font-black uppercase rounded-xs transition-colors cursor-pointer",
                  heatmapMetric === 'quantity' ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
                )}
              >
                Quantity
              </button>
              <button
                onClick={() => {
                  setHeatmapMetric('weight');
                  setSelectedHeatmapCell(null);
                }}
                className={cn(
                  "px-2 py-0.5 text-[8.5px] font-black uppercase rounded-xs transition-colors cursor-pointer",
                  heatmapMetric === 'weight' ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
                )}
              >
                Weight
              </button>
            </div>

            {/* Minimize/Maximize Toggle */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="p-1 hover:bg-slate-150 border border-slate-300 bg-slate-50 rounded text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
              title={showHeatmap ? "Collapse heatmap panel" : "Expand heatmap panel"}
            >
              {showHeatmap ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {showHeatmap ? (
          <div className="space-y-3 animate-fade-in">
            {/* Heatmap Grid Wrapper */}
            <div className="overflow-x-auto border border-slate-200 rounded">
              <div className="min-w-[840px] bg-slate-50/50 p-2">
                
                {/* Header Months row */}
                <div 
                  className="gap-1 items-center mb-1.5 text-center font-mono"
                  style={{ display: 'grid', gridTemplateColumns: '170px repeat(12, minmax(0, 1fr)) 80px', gap: '4px' }}
                >
                  <div className="text-left pl-1 text-[8.5px] font-black uppercase text-slate-500 tracking-wider">
                    Vendor / Supplier
                  </div>
                  {heatmapData.months.map(m => (
                    <div key={m.label} className="text-[8px] font-black uppercase text-slate-500 py-1 bg-slate-100 rounded border border-slate-200">
                      {m.label}
                    </div>
                  ))}
                  <div className="text-[8px] font-black uppercase text-slate-600 bg-slate-200 rounded border border-slate-300 py-1">
                    Overall
                  </div>
                </div>

                {/* Heatmap Rows per Vendor */}
                {heatmapData.grid.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-slate-400 font-extrabold uppercase font-mono">
                    No supplier transaction data available to render heatmap.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {heatmapData.grid.map(row => {
                      return (
                        <div 
                          key={row.vendor} 
                          className="gap-1 items-center text-center"
                          style={{ display: 'grid', gridTemplateColumns: '170px repeat(12, minmax(0, 1fr)) 80px', gap: '4px' }}
                        >
                          {/* Vendor Name Column */}
                          <div className="text-left pl-1 truncate text-[9.5px] font-extrabold text-slate-700 tracking-tight" title={row.vendor}>
                            {row.vendor}
                          </div>

                          {/* 12 Monthly cells */}
                          {row.monthlyStats.map((stat, idx) => {
                            const val = heatmapMetric === 'quantity' ? stat.qtyVar : (heatmapMetric === 'weight' ? stat.wtVar : stat.combinedVar);
                            const count = stat.deliveriesCount;

                            // Dynamic cell styling based on variance thresholds
                            let cellBg = 'bg-slate-100/70 border border-slate-200 text-slate-300'; // No deliveries
                            let titleText = `${row.vendor} - ${stat.monthLabel}: No shipments`;
                            
                            if (count > 0) {
                              if (val <= 1.5) {
                                cellBg = 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 cursor-pointer';
                              } else if (val <= 4.0) {
                                cellBg = 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 cursor-pointer';
                              } else if (val <= 8.0) {
                                cellBg = 'bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300 cursor-pointer';
                              } else if (val <= 15.0) {
                                cellBg = 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 cursor-pointer';
                              } else {
                                cellBg = 'bg-rose-200 hover:bg-rose-300 text-rose-900 border border-rose-400 font-black cursor-pointer animate-pulse';
                              }
                              titleText = `${row.vendor} (${stat.monthLabel}): ${val}% Avg Variance (${count} load${count > 1 ? 's' : ''})`;
                            }

                            const isSelected = selectedHeatmapCell?.vendor === row.vendor && selectedHeatmapCell?.monthLabel === stat.monthLabel;

                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (count > 0) {
                                    setSelectedHeatmapCell({
                                      vendor: row.vendor,
                                      monthLabel: stat.monthLabel,
                                      value: val,
                                      deliveriesCount: count,
                                      loads: stat.loads
                                    });
                                  }
                                }}
                                className={cn(
                                  "text-[8.5px] font-mono font-bold py-1.5 rounded-xs  transition-all",
                                  cellBg,
                                  isSelected ? "ring-2 ring-indigo-600 ring-offset-1 scale-102 font-black border-indigo-500" : "hover:scale-103"
                                )}
                                title={titleText}
                              >
                                {count > 0 ? `${val}%` : '-'}
                              </div>
                            );
                          })}

                          {/* Overall Average Column */}
                          <div className={cn(
                            "text-[8.5px] font-mono font-black py-1.5 rounded border",
                            row.overallAvgVar <= 1.5 ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                            row.overallAvgVar <= 4.0 ? "bg-yellow-50 text-yellow-800 border-yellow-200" :
                            row.overallAvgVar <= 8.0 ? "bg-orange-50 text-orange-800 border-orange-200" :
                            "bg-rose-50 text-rose-800 border-rose-200"
                          )}>
                            {row.overallAvgVar}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[8.5px] font-black uppercase text-slate-500 font-mono tracking-wider">
              <span className="flex items-center gap-1.5">
                📊 Color Scale (Avg Variance %):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3.5 h-3.5 bg-slate-100 border border-slate-200 rounded-xs" />
                  No Data
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3.5 h-3.5 bg-emerald-100 border border-emerald-300 rounded-xs" />
                  ≤ 1.5% (Safe)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3.5 h-3.5 bg-yellow-100 border border-yellow-300 rounded-xs" />
                  1.5% - 4%
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3.5 h-3.5 bg-orange-100 border border-orange-300 rounded-xs" />
                  4% - 8%
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3.5 h-3.5 bg-red-100 border border-red-300 rounded-xs" />
                  8% - 15%
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3.5 h-3.5 bg-rose-200 border border-rose-400 rounded-xs animate-pulse" />
                  &gt; 15% (Critical)
                </span>
              </div>
            </div>

            {/* Detail Inspector Panel for selected Heatmap cell */}
            {selectedHeatmapCell && (
              <div className="bg-slate-900 border border-slate-700 rounded-md p-3 text-white space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 bg-rose-950 text-rose-400 border border-rose-900 rounded">
                      <Grid className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-wide text-slate-100">
                      Heatmap Audit Inspector: <strong className="text-yellow-400">{selectedHeatmapCell.vendor}</strong> in <strong className="text-yellow-400">{selectedHeatmapCell.monthLabel}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedHeatmapCell(null)}
                    className="text-slate-400 hover:text-white font-black text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    × Close Inspector
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[9px] font-mono text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
                  <div>
                    <span className="text-slate-500 block uppercase font-extrabold text-[8px]">Reconciled Loads:</span>
                    <strong className="text-white text-[11px]">{selectedHeatmapCell.deliveriesCount} shipment(s)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-extrabold text-[8px]">Average Variance ({heatmapMetric}):</span>
                    <strong className="text-rose-400 text-[11px]">{selectedHeatmapCell.value}% Avg Deviation</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-extrabold text-[8px]">Safety Status:</span>
                    <strong className={cn(
                      "text-[11px] uppercase",
                      selectedHeatmapCell.value <= varianceThreshold ? "text-emerald-400" : "text-rose-400 animate-pulse"
                    )}>
                      {selectedHeatmapCell.value <= varianceThreshold ? "🛡️ Compliant" : "🚨 Safety Violation"}
                    </strong>
                  </div>
                </div>

                {/* Table of individual transaction loads in the selected cell */}
                <div className="overflow-x-auto max-h-40 border border-slate-800 rounded">
                  <table className="w-full text-left font-mono text-[8.5px] text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-bold sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-1.5 pl-2">Voucher / ID</th>
                        <th className="p-1.5">Date</th>
                        <th className="p-1.5 text-right">Expected Qty/Wt</th>
                        <th className="p-1.5 text-right">Actual Qty/Wt</th>
                        <th className="p-1.5 text-right">Variance</th>
                        <th className="p-1.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedHeatmapCell.loads.map((load, idx) => {
                        const qtyDiff = load.expected_qty ? (Math.abs((load.actual_qty || 0) - load.expected_qty) / load.expected_qty) * 100 : 0;
                        const wtDiff = load.expected_weight ? (Math.abs((load.actual_weight || 0) - load.expected_weight) / load.expected_weight) * 100 : 0;
                        const variance = heatmapMetric === 'quantity' ? qtyDiff : (heatmapMetric === 'weight' ? wtDiff : (qtyDiff + wtDiff) / 2);

                        return (
                          <tr key={load.id || idx} className="hover:bg-slate-850">
                            <td className="p-1.5 pl-2 font-bold text-yellow-500">
                              #{load.final_arrival_no || load.id.slice(0, 8)}
                            </td>
                            <td className="p-1.5">{load.arrival_date || load.inspection_date || 'N/A'}</td>
                            <td className="p-1.5 text-right">
                              {load.expected_qty?.toFixed(0) || '0'} B / {load.expected_weight?.toFixed(2) || '0'} MT
                            </td>
                            <td className="p-1.5 text-right text-white">
                              {load.actual_qty?.toFixed(0) || '0'} B / {load.actual_weight?.toFixed(2) || '0'} MT
                            </td>
                            <td className="p-1.5 text-right font-bold text-rose-400">
                              {variance.toFixed(1)}%
                            </td>
                            <td className="p-1.5 text-center">
                              <span className={cn(
                                "px-1 py-0.5 rounded text-[7px] font-black uppercase",
                                load.status === 'fully_matched' ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-rose-950 text-rose-400 border border-rose-900"
                              )}>
                                {load.status?.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 text-center text-[9px] text-slate-600 font-bold uppercase bg-slate-50 border border-dashed border-slate-300 rounded cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setShowHeatmap(true)}>
            🔥 Vendor Variance Heatmap minimized. Click to expand 12-month analytics.
          </div>
        )}
      </div>
    </div>
  );
};
